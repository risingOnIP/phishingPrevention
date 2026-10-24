"""Classification server for the Phishing Prevention extension.

The server provides the two signals the extension cannot compute inside the
browser:

* Visual brand similarity. A page URL is rendered in headless Chrome, the
  screenshot is classified by a CNN trained on 15 brand classes, and the
  predicted class is returned with its softmax confidence.
* Certificate identity. The TLS certificate presented by a suspect host is
  compared with the certificate presented by the legitimate brand domain.

Routes:
    GET  /             Health check.
    POST /image        {"url": ...} -> {"class": ..., "confidence": ...}
    POST /predict      multipart "image" -> {"class": ..., "confidence": ...}
    POST /certificate  {"hostname": ..., "domain": ...} -> comparison result

Environment variables:
    CHROME_BINARY: Chrome executable used by Selenium
        (default ``/usr/bin/google-chrome``).
    MODEL_PATH: TensorFlow.js model manifest
        (default ``models/js/model.json`` next to this file).
    HOST, PORT: address the development server binds to
        (default ``127.0.0.1`` and ``5000``).
"""

import os
import socket
import ssl
import tempfile
import time
from urllib.parse import urlparse

import numpy as np
import tensorflowjs as tfjs
from flask import Flask, jsonify, request
from PIL import Image
from selenium import webdriver

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Output labels of the classifier, in model output order. "boa" is Bank of
# America; "other" covers pages that resemble none of the 14 brands.
CLASSES = [
    "adobe", "alibaba", "amazon", "apple", "boa", "chase", "dhl", "dropbox",
    "facebook", "linkedin", "microsoft", "other", "paypal", "wellsfargo",
    "yahoo",
]

# Input size expected by the first convolution layer (width, height).
INPUT_SIZE = (50, 50)

# Seconds to let a page render before the screenshot is taken.
RENDER_DELAY_SECONDS = 3

# Upper bound for loading a page in headless Chrome.
PAGE_LOAD_TIMEOUT_SECONDS = 30

# Upper bound for opening a TLS connection to fetch a certificate.
TLS_TIMEOUT_SECONDS = 10

# The manifest references two weight shards that must sit next to it.
MODEL_PATH = os.environ.get(
    "MODEL_PATH", os.path.join(BASE_DIR, "models", "js", "model.json")
)
model = tfjs.converters.load_keras_model(MODEL_PATH)


# ---------------------------------------------------------------------------
# Visual similarity
# ---------------------------------------------------------------------------

def capture_screenshot(url, output_path):
    """Render ``url`` in headless Chrome and save a PNG screenshot.

    Args:
        url: Page address to load.
        output_path: File the screenshot is written to.
    """
    options = webdriver.ChromeOptions()
    options.binary_location = os.environ.get("CHROME_BINARY", "/usr/bin/google-chrome")
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    try:
        driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT_SECONDS)
        driver.get(url)
        time.sleep(RENDER_DELAY_SECONDS)
        driver.save_screenshot(output_path)
    finally:
        driver.quit()


def predict_class(image_source):
    """Classify a page screenshot by brand.

    The image is resized to 50 x 50 pixels, converted to RGB, and scaled to
    the range 0 to 1 before inference.

    Args:
        image_source: File path or file-like object containing the image.

    Returns:
        A ``(class_name, confidence)`` tuple, where ``confidence`` is the
        softmax probability of the predicted class.
    """
    with Image.open(image_source) as img:
        pixels = np.array(img.resize(INPUT_SIZE).convert("RGB")) / 255.0
    probabilities = model.predict(np.expand_dims(pixels, axis=0))[0]
    index = int(np.argmax(probabilities))
    return CLASSES[index], float(probabilities[index])


def classification_response(class_name, confidence):
    """Build the JSON body shared by ``/image`` and ``/predict``."""
    return jsonify({"class": class_name, "confidence": round(confidence, 6)})


# ---------------------------------------------------------------------------
# Certificate identity
# ---------------------------------------------------------------------------

def fetch_certificate(hostname, port=443):
    """Open a verified TLS connection and return the peer certificate.

    The default context checks the chain against the system trust store and
    matches the hostname, so a self-signed, expired, or mismatched
    certificate raises ``ssl.SSLCertVerificationError``.

    Args:
        hostname: Host to connect to.
        port: TLS port.

    Returns:
        The certificate as decoded by ``ssl.SSLSocket.getpeercert()``.
    """
    context = ssl.create_default_context()
    with socket.create_connection((hostname, port), timeout=TLS_TIMEOUT_SECONDS) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as tls:
            return tls.getpeercert()


def name_fields(name):
    """Flatten a certificate subject or issuer into a ``{field: value}`` dict."""
    return {key: value for rdn in name for key, value in rdn}


def summarize_certificate(cert):
    """Reduce a certificate to the fields used for comparison."""
    subject = name_fields(cert.get("subject", ()))
    issuer = name_fields(cert.get("issuer", ()))
    return {
        "organization": subject.get("organizationName"),
        "commonName": subject.get("commonName"),
        "issuer": issuer.get("organizationName") or issuer.get("commonName"),
    }


def reference_certificate(domain):
    """Fetch the legitimate certificate for a brand domain.

    Tries ``www.<domain>`` first, where most brand sign-in pages live, then
    the bare domain.

    Returns:
        A certificate summary, or ``None`` when neither host answers.
    """
    for host in (f"www.{domain}", domain):
        try:
            return summarize_certificate(fetch_certificate(host))
        except (OSError, ssl.SSLError):
            continue
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def health():
    """Health check. Returns the text ``OK``."""
    return "OK"


@app.route("/predict", methods=["POST"])
def predict():
    """Classify an uploaded image (multipart field ``image``)."""
    upload = request.files.get("image")
    if upload is None:
        return jsonify({"error": "multipart field 'image' is required"}), 400
    return classification_response(*predict_class(upload))


@app.route("/image", methods=["POST"])
def image():
    """Screenshot and classify the page given as JSON ``{"url": <address>}``.

    Each request writes its screenshot to its own temporary file, so
    concurrent requests never overwrite each other.
    """
    data = request.get_json(silent=True) or {}
    url = data.get("url")
    if not isinstance(url, str) or urlparse(url).scheme not in ("http", "https"):
        return jsonify({"error": "'url' must be an http or https address"}), 400

    handle, screenshot_path = tempfile.mkstemp(prefix="page-", suffix=".png")
    os.close(handle)
    try:
        capture_screenshot(url, screenshot_path)
        class_name, confidence = predict_class(screenshot_path)
    except Exception as error:  # Selenium raises many unrelated types.
        app.logger.warning("Could not classify %s: %s", url, error)
        return jsonify({"error": f"could not classify the page: {error}"}), 502
    finally:
        os.remove(screenshot_path)

    return classification_response(class_name, confidence)


@app.route("/certificate", methods=["POST"])
def certificate():
    """Compare a suspect host's certificate with the brand domain's.

    Request JSON: ``{"hostname": <suspect host>, "domain": <brand domain>,
    "port": <optional TLS port>}``.

    The certificates match when the subject organization and the issuing
    organization are identical. A suspect host that presents no certificate,
    or one that fails verification, does not match.

    Response JSON: ``{"match": bool, "reason": str, "suspect": {...} or
    null, "reference": {...}}``. Returns 502 when the reference certificate
    cannot be retrieved, because no comparison is possible.
    """
    data = request.get_json(silent=True) or {}
    hostname = data.get("hostname")
    domain = data.get("domain")
    port = data.get("port") or 443
    if not isinstance(hostname, str) or not isinstance(domain, str):
        return jsonify({"error": "'hostname' and 'domain' are required"}), 400
    if not isinstance(port, int) or not 0 < port < 65536:
        return jsonify({"error": "'port' must be a TCP port number"}), 400

    reference = reference_certificate(domain)
    if reference is None:
        return jsonify({"error": f"no certificate retrieved for {domain}"}), 502

    try:
        suspect = summarize_certificate(fetch_certificate(hostname, port))
    except ssl.SSLCertVerificationError as error:
        return jsonify({
            "match": False,
            "reason": f"certificate failed verification: {error.verify_message}",
            "suspect": None,
            "reference": reference,
        })
    except (OSError, ssl.SSLError) as error:
        return jsonify({
            "match": False,
            "reason": f"no certificate retrieved: {error}",
            "suspect": None,
            "reference": reference,
        })

    same_organization = suspect["organization"] == reference["organization"]
    same_issuer = suspect["issuer"] == reference["issuer"]
    if same_organization and same_issuer:
        reason = "subject organization and issuer match"
    elif not same_organization:
        reason = "subject organization differs"
    else:
        reason = "issuer differs"

    return jsonify({
        "match": same_organization and same_issuer,
        "reason": reason,
        "suspect": suspect,
        "reference": reference,
    })


if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
    )
