/**
 * worker.js: extension service worker and decision engine.
 *
 * When the content script (content.js) reports a page load, the worker runs
 * the detection pipeline for that tab:
 *
 *   1. Ask the classification server which brand the page resembles and how
 *      confident the model is.
 *   2. Stop when the page resembles no protected brand, or the confidence is
 *      below SIMILARITY_THRESHOLD.
 *   3. Otherwise compare the page's infrastructure with the brand's
 *      legitimate records: resolved IP addresses (DNS over HTTPS) and the TLS
 *      certificate (server /certificate route).
 *   4. Flag the page as phishing when either the IP addresses or the
 *      certificate do not match.
 *
 * The verdict is returned to the content script, stored per tab in
 * chrome.storage.session for the popup, and shown on the toolbar badge.
 */

importScripts("config.js");

/** Storage key prefix; the full key is "verdict:<tabId>". */
const VERDICT_KEY_PREFIX = "verdict:";

/** Toolbar badge per verdict status; statuses not listed clear the badge. */
const BADGES = {
    checking: { text: "...", color: "#2563EB" },
    phishing: { text: "!", color: "#B91C1C" },
    error: { text: "?", color: "#6B7280" },
};

/**
 * Most recent check started for each tab. A verdict is only saved when it
 * belongs to the latest check, so a slow result for a page the user has
 * already left cannot overwrite the verdict for the current page.
 */
const latestCheckByTab = new Map();

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

/**
 * Posts JSON to the classification server and returns the parsed reply.
 *
 * @param {string} url Endpoint address.
 * @param {Object} body Request payload.
 * @returns {Promise<Object>} Parsed JSON response.
 * @throws {Error} When the server is unreachable or answers with an error.
 */
async function postJson(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || `${url} returned HTTP ${response.status}`);
    }
    return payload;
}

/**
 * Checks whether a hostname is a literal IP address rather than a name.
 *
 * @param {string} hostname Hostname from a parsed URL.
 * @returns {boolean} True for IPv4 literals and bracketed IPv6 literals.
 */
function isIpLiteral(hostname) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith("[");
}

/**
 * Resolves the IPv4 addresses (A records) of a hostname through DNS over
 * HTTPS. CNAME records in the answer are followed by the resolver and
 * skipped here.
 *
 * @param {string} hostname Name to resolve.
 * @returns {Promise<string[]>} Resolved addresses, possibly empty.
 * @throws {Error} When the resolver is unreachable or reports a DNS error.
 */
async function resolveAddresses(hostname) {
    if (isIpLiteral(hostname)) {
        return [hostname];
    }
    const query = `${DNS_RESOLVER_URL}?name=${encodeURIComponent(hostname)}&type=A`;
    const response = await fetch(query);
    if (!response.ok) {
        throw new Error(`DNS lookup for ${hostname} returned HTTP ${response.status}`);
    }
    const result = await response.json();
    // Status 0 is NOERROR; anything else (for example 3, NXDOMAIN) is a failure.
    if (result.Status !== 0) {
        throw new Error(`DNS lookup for ${hostname} failed with status ${result.Status}`);
    }
    return (result.Answer || [])
        .filter((record) => record.type === 1)
        .map((record) => record.data);
}

/**
 * Resolves the legitimate IP addresses for a brand domain: the union of the
 * bare domain and its "www" host.
 *
 * @param {string} domain Brand domain, for example "bankofamerica.com".
 * @returns {Promise<string[]>} Unique reference addresses.
 * @throws {Error} When neither name yields an address.
 */
async function resolveReferenceAddresses(domain) {
    const lookups = await Promise.allSettled([
        resolveAddresses(domain),
        resolveAddresses(`www.${domain}`),
    ]);
    const addresses = lookups
        .filter((lookup) => lookup.status === "fulfilled")
        .flatMap((lookup) => lookup.value);
    if (addresses.length === 0) {
        throw new Error(`No reference IP addresses found for ${domain}`);
    }
    return [...new Set(addresses)];
}

/**
 * Compares the page's TLS certificate with the brand domain's certificate
 * through the classification server.
 *
 * @param {URL} pageUrl Parsed address of the visited page.
 * @param {string} domain Brand domain.
 * @returns {Promise<{match: boolean, reason: string}>} Comparison result.
 */
async function compareCertificates(pageUrl, domain) {
    if (pageUrl.protocol !== "https:") {
        return { match: false, reason: "page is not served over HTTPS" };
    }
    const port = pageUrl.port ? Number(pageUrl.port) : 443;
    const result = await postJson(CERTIFICATE_API_URL, {
        hostname: pageUrl.hostname,
        domain,
        port,
    });
    return { match: result.match === true, reason: result.reason };
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

/**
 * Checks whether a hostname belongs to a brand's own domain.
 *
 * @param {string} hostname Visited hostname.
 * @param {string} domain Brand domain.
 * @returns {boolean} True for the domain itself and any subdomain of it.
 */
function isBrandHost(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Runs the full detection pipeline for one page.
 *
 * @param {string} rawUrl Full address of the visited page.
 * @returns {Promise<Object>} Verdict with `status` "safe", "phishing", or
 *     "skipped", a readable `message`, and the evidence behind it.
 * @throws {Error} When any lookup fails; the caller records an error verdict.
 */
async function evaluatePage(rawUrl) {
    const pageUrl = new URL(rawUrl);
    const verdict = {
        url: rawUrl,
        hostname: pageUrl.hostname,
        classification: null,
        brand: null,
        checks: null,
    };

    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
        return { ...verdict, status: "skipped", message: "Only web pages are checked." };
    }

    // Step 1: visual similarity. The full URL is sent so the server renders
    // exactly the page the user is looking at.
    const classification = await postJson(CLASSIFIER_API_URL, { url: rawUrl });
    if (typeof classification.class !== "string" || typeof classification.confidence !== "number") {
        throw new Error("Classifier returned an unexpected response");
    }
    verdict.classification = classification;

    // Step 2: only a confident match to a protected brand continues.
    const brand = PROTECTED_BRANDS[classification.class];
    if (!brand || classification.confidence < SIMILARITY_THRESHOLD) {
        return {
            ...verdict,
            status: "safe",
            message: "This page does not imitate a protected brand.",
        };
    }
    verdict.brand = { key: classification.class, ...brand };

    if (isBrandHost(pageUrl.hostname, brand.domain)) {
        return {
            ...verdict,
            status: "safe",
            message: `This page is served from ${brand.domain}, the legitimate ${brand.name} domain.`,
        };
    }

    // Step 3: infrastructure comparison. The three lookups run in parallel
    // and all must finish before the verdict is decided.
    const [suspectAddresses, referenceAddresses, certificate] = await Promise.all([
        resolveAddresses(pageUrl.hostname),
        resolveReferenceAddresses(brand.domain),
        compareCertificates(pageUrl, brand.domain),
    ]);
    const ipMatch = suspectAddresses.some((address) => referenceAddresses.includes(address));
    verdict.checks = {
        ip: { match: ipMatch, suspect: suspectAddresses, reference: referenceAddresses },
        certificate,
    };

    // Step 4: the page is genuine only when both signals match.
    if (ipMatch && certificate.match) {
        return {
            ...verdict,
            status: "safe",
            message: `This page is hosted on ${brand.name} infrastructure.`,
        };
    }
    return {
        ...verdict,
        status: "phishing",
        message: `This page looks like ${brand.name} but is not hosted by ${brand.domain}.`,
    };
}

// ---------------------------------------------------------------------------
// Verdict storage and display
// ---------------------------------------------------------------------------

/**
 * Stores a verdict for the popup and updates the toolbar badge.
 *
 * @param {number} tabId Tab the verdict belongs to.
 * @param {Object} verdict Verdict to store.
 */
async function publishVerdict(tabId, verdict) {
    await chrome.storage.session.set({ [VERDICT_KEY_PREFIX + tabId]: verdict });
    const badge = BADGES[verdict.status];
    await chrome.action.setBadgeText({ tabId, text: badge ? badge.text : "" });
    if (badge) {
        await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
    }
}

/**
 * Checks the page loaded in a tab and publishes the final verdict.
 *
 * @param {chrome.tabs.Tab} tab Tab whose content script sent the request.
 * @returns {Promise<Object>} The final verdict.
 */
async function checkTab(tab) {
    const checkId = crypto.randomUUID();
    latestCheckByTab.set(tab.id, checkId);
    await publishVerdict(tab.id, { url: tab.url, status: "checking", message: "Checking this page." });

    let verdict;
    try {
        verdict = await evaluatePage(tab.url);
    } catch (error) {
        console.error("Phishing Prevention: check failed for", tab.url, error);
        verdict = {
            url: tab.url,
            status: "error",
            message: `This page could not be verified: ${error.message}`,
        };
    }
    verdict.checkedAt = new Date().toISOString();

    if (latestCheckByTab.get(tab.id) === checkId) {
        await publishVerdict(tab.id, verdict);
    }
    return verdict;
}

/**
 * Message router. The content script sends {type: "checkPage"} once per page
 * load and receives the final verdict. The handler returns true so Chrome
 * keeps the message channel open until the asynchronous check completes.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "checkPage" || !sender.tab) {
        return false;
    }
    checkTab(sender.tab).then(sendResponse, (error) => {
        console.error("Phishing Prevention: could not publish verdict", error);
        sendResponse({ status: "error", message: error.message });
    });
    return true;
});

// Discard a tab's verdict when the tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
    latestCheckByTab.delete(tabId);
    chrome.storage.session.remove(VERDICT_KEY_PREFIX + tabId);
});
