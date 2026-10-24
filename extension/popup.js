/**
 * popup.js: script for the toolbar popup (popup.html).
 *
 * Reads the verdict that the service worker (worker.js) stored for the
 * active tab, types out the headline one character at a time, and lists the
 * evidence behind it. The popup re-renders if the verdict changes while it
 * is open, for example when a check finishes. Also wires the "Close Tab" and
 * "Dismiss" buttons.
 */

/** Headline per verdict status. */
const HEADLINES = {
    safe: "You are safe.",
    phishing: "You are being phished.",
    checking: "Checking this page.",
    skipped: "This page is not checked.",
    error: "Could not verify this page.",
};

/** Incremented on every render so an older typing animation stops early. */
let renderToken = 0;

/**
 * Resolves after the given delay.
 *
 * @param {number} ms Delay in milliseconds.
 * @returns {Promise<void>}
 */
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds the evidence lines shown under the headline.
 *
 * @param {Object} verdict Verdict stored by worker.js.
 * @returns {string[]} Lines of text, possibly empty.
 */
function evidenceLines(verdict) {
    const lines = [];
    const { classification, brand, checks } = verdict;
    if (classification) {
        const percent = (classification.confidence * 100).toFixed(1);
        lines.push(`Visual match: ${brand ? brand.name : classification.class} (${percent}% confidence)`);
    }
    if (checks && brand) {
        lines.push(checks.ip.match
            ? `IP addresses: match ${brand.domain}`
            : `IP addresses: do not match ${brand.domain}`);
        lines.push(checks.certificate.match
            ? `Certificate: matches ${brand.domain}`
            : `Certificate: ${checks.certificate.reason}`);
    }
    return lines;
}

/**
 * Renders a verdict into the popup.
 *
 * @param {Object|undefined} verdict Verdict for the active tab, if any.
 */
async function render(verdict) {
    const token = ++renderToken;
    const status = verdict ? verdict.status : "checking";

    document.body.dataset.status = status;
    document.querySelector(".message").textContent = verdict ? verdict.message : "";
    const evidence = document.querySelector(".evidence");
    evidence.replaceChildren(...evidenceLines(verdict || {}).map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
    }));

    const headline = document.querySelector(".chars");
    headline.replaceChildren();
    for (const character of HEADLINES[status] || HEADLINES.error) {
        if (token !== renderToken) {
            return;
        }
        const span = document.createElement("span");
        span.className = "text";
        span.textContent = character === " " ? " " : character;
        headline.appendChild(span);
        await wait(50);
    }
}

/** Loads the active tab's verdict and keeps the popup in sync with it. */
async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        return;
    }
    const key = `verdict:${tab.id}`;

    const stored = await chrome.storage.session.get(key);
    render(stored[key]);

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "session" && changes[key]) {
            render(changes[key].newValue);
        }
    });

    // Close the active tab.
    document.getElementById("close").addEventListener("click", () => {
        chrome.tabs.remove(tab.id);
        window.close();
    });
}

// Close the popup.
document.getElementById("dismiss").addEventListener("click", () => window.close());

init().catch((error) => console.error("Phishing Prevention: popup failed:", error));
