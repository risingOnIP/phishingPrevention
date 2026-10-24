/**
 * config.js: settings for the Phishing Prevention extension.
 *
 * Loaded by the service worker (worker.js) through importScripts(). Edit
 * this file, then reload the extension on chrome://extensions to apply the
 * change.
 */

/**
 * Base address of the classification server (server/app.py). The service
 * worker calls its /image and /certificate routes.
 */
const SERVER_URL = "http://localhost:5000";

/** Brand classifier endpoint: POST {"url"} returns {"class", "confidence"}. */
const CLASSIFIER_API_URL = `${SERVER_URL}/image`;

/** Certificate comparison endpoint: POST {"hostname", "domain", "port"}. */
const CERTIFICATE_API_URL = `${SERVER_URL}/certificate`;

/** DNS-over-HTTPS resolver (JSON API) used for IP address lookups. */
const DNS_RESOLVER_URL = "https://dns.google/resolve";

/**
 * Minimum softmax confidence for a page to count as imitating a brand.
 * Below this value the page is treated as not resembling any protected
 * brand and no infrastructure check runs. The patent describes thresholds
 * from 85% to 99.9%.
 */
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Protected brands, keyed by classifier class name. Each entry names the
 * brand and the legitimate domain whose IP addresses and TLS certificate
 * serve as the reference records. The "other" class is not protected.
 */
const PROTECTED_BRANDS = {
    adobe:      { name: "Adobe",           domain: "adobe.com" },
    alibaba:    { name: "Alibaba",         domain: "alibaba.com" },
    amazon:     { name: "Amazon",          domain: "amazon.com" },
    apple:      { name: "Apple",           domain: "apple.com" },
    boa:        { name: "Bank of America", domain: "bankofamerica.com" },
    chase:      { name: "Chase",           domain: "chase.com" },
    dhl:        { name: "DHL",             domain: "dhl.com" },
    dropbox:    { name: "Dropbox",         domain: "dropbox.com" },
    facebook:   { name: "Facebook",        domain: "facebook.com" },
    linkedin:   { name: "LinkedIn",        domain: "linkedin.com" },
    microsoft:  { name: "Microsoft",       domain: "microsoft.com" },
    paypal:     { name: "PayPal",          domain: "paypal.com" },
    wellsfargo: { name: "Wells Fargo",     domain: "wellsfargo.com" },
    yahoo:      { name: "Yahoo",           domain: "yahoo.com" },
};
