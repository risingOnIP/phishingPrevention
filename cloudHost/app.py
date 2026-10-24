"""Flask inference service for the Phishing Prevention extension.

Loads a CNN brand classifier (Keras model stored in TensorFlow.js format) and
exposes it over HTTP. The extension's service worker posts a page URL to
``/image``; the service opens that URL in headless Chrome, takes a screenshot,
and returns the predicted brand class.

Environment variables:
    CHROME_BINARY: path to the Chrome executable used by Selenium
        (default ``/usr/bin/google-chrome``).
"""

from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import json
import tensorflowjs as tfjs
import numpy as np
from PIL import Image
import time
import os

app = Flask(__name__)


# Output labels of the classifier, in model output order. "boa" is Bank of
# America; "other" covers pages that match none of the 14 brands.
classes = ["adobe", "alibaba", "amazon", "apple", "boa", "chase", "dhl", "dropbox", "facebook", "linkedin", "microsoft", "other", "paypal", "wellsfargo", "yahoo"]

# Model topology from models/js/model.json; the weight shards it references
# must be present next to it. The path is relative to the working directory.
model = tfjs.converters.load_keras_model("models/js/model.json")

# Input size expected by the first convolution layer (width, height).
dims = (50,50)



def getImage(url):
    """Open ``url`` in headless Chrome and save a screenshot.

    Waits 3 seconds for the page to render, then writes ``python.png`` in the
    working directory.

    Args:
        url: Page address to load.

    Returns:
        The screenshot file name, ``"python.png"``.
    """
    chrome_options = webdriver.ChromeOptions()

    chrome_options.binary_location = os.environ.get("CHROME_BINARY", "/usr/bin/google-chrome")
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    driver.get(url)
    time.sleep(3)
    driver.get_screenshot_as_file("python.png")
    driver.quit()
    return "python.png"

def predict_class(image_path):
    """Classify a page screenshot by brand.

    The image is resized to 50 x 50 pixels, converted to RGB, and scaled to
    the range 0 to 1 before inference.

    Args:
        image_path: File path or file-like object containing the image.

    Returns:
        The predicted class name from ``classes``.
    """
    img = Image.open(image_path).resize(dims).convert("RGB")
    img_array=np.array(img)/255.0
    img_array = np.expand_dims(img_array, axis=0)
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions)
    class_name = classes[predicted_class]
    return class_name


@app.route('/')
def health():
    """Health check. Returns the text ``Hello!``."""
    return 'Hello!'

@app.route('/predict', methods=['POST'])
def predict():
    """Classify an uploaded image (multipart field ``image``).

    Returns:
        JSON object ``{"class": <class name>}``.
    """
    file = request.files['image']
    class_name = predict_class(file)
    response = {"class" : class_name}
    return jsonify(response)


@app.route('/image', methods=['POST'])
def image():
    """Screenshot and classify a page given as JSON ``{"url": <address>}``.

    Returns:
        The predicted class name as a JSON string.
    """
    data = request.get_json()
    sending = data['url']
    recv = getImage(sending)
    prediction = predict_class(recv)
    os.remove("python.png")
    return jsonify(prediction)

if __name__ == "__main__":
    app.run()
