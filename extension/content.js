/**
 * content.js: content script injected into the top frame of every page.
 *
 * On page load it asks the service worker (worker.js) to check the page and
 * waits for the final verdict. When the page is flagged as phishing, it
 * inserts a warning banner at the top of the page. The same verdict is shown
 * in the toolbar popup (popup.html and popup.js).
 */

/** Element id of the banner, so it is inserted at most once. */
const BANNER_ID = "phishing-prevention-warning";

/**
 * Inserts a fixed warning banner at the top of the current page.
 *
 * @param {string} message Explanation from the verdict, for example
 *     "This page looks like PayPal but is not hosted by paypal.com."
 */
function showWarningBanner(message) {
    if (document.getElementById(BANNER_ID)) {
        return;
    }

    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "alert");
    Object.assign(banner.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        zIndex: "2147483647",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 24px",
        background: "#B91C1C",
        color: "#FFFFFF",
        font: "16px/1.4 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
    });

    const text = document.createElement("div");
    text.style.flex = "1";
    const title = document.createElement("strong");
    title.textContent = "Warning: this is likely a phishing website.";
    title.style.display = "block";
    title.style.fontSize = "20px";
    const detail = document.createElement("span");
    detail.textContent = `${message} Do not enter passwords or payment details.`;
    text.append(title, detail);

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    Object.assign(dismiss.style, {
        padding: "8px 16px",
        border: "1px solid #FFFFFF",
        borderRadius: "6px",
        background: "transparent",
        color: "#FFFFFF",
        font: "inherit",
        cursor: "pointer",
    });
    dismiss.addEventListener("click", () => banner.remove());

    banner.append(text, dismiss);
    (document.body || document.documentElement).prepend(banner);
}

(async () => {
    let verdict;
    try {
        verdict = await chrome.runtime.sendMessage({ type: "checkPage" });
    } catch (error) {
        console.error("Phishing Prevention: page check failed:", error);
        return;
    }

    if (verdict?.status === "phishing") {
        showWarningBanner(verdict.message);
    }
})();
