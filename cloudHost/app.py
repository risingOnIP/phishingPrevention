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


#list of classes
classes = ["adobe", "alibaba", "amazon", "apple", "boa", "chase", "dhl", "dropbox", "facebook", "linkedin", "microsoft", "other", "paypal", "wellsfargo", "yahoo"]

#loading model

model = tfjs.converters.load_keras_model("models/js/model.json")
dims = (50,50)



def getImage(url):
    chrome_options = webdriver.ChromeOptions()

    chrome_options.binary_location = "/usr/bin/google-chrome"
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    driver.get(url)
    #driver.implicitly_wait(10)
    time.sleep(3)
    driver.get_screenshot_as_file("python.png")
    driver.quit()
    return "python.png"

def predict_class(image_path):
    img = Image.open(image_path).resize(dims).convert("RGB")
    img_array=np.array(img)/255.0
    img_array = np.expand_dims(img_array, axis=0)
    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions)
    class_name = classes[predicted_class]
    return class_name


@app.route('/')
def hello_world():
        return 'Hello!'

@app.route('/predict', methods=['POST'])
def index():
    file = request.files['image']
    class_name = predict_class(file)
    response = {"class" : class_name}
    return jsonify(response)


@app.route('/image', methods=['POST'])
def image():
    data = request.get_json()
    sending = data['url']
    recv = getImage(sending)
    prediction = predict_class(recv)
    os.remove("python.png")
    return jsonify(prediction)

if __name__ == "__main__":
    app.run()
