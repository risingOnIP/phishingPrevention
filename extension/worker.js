/**
 * worker.js: extension service worker.
 *
 * Answers messages from the content script (content.js). It reports the page
 * origin, requests a brand classification from the cloud host
 * (cloudHost/app.py), and resolves IP addresses through Google DNS-over-HTTPS
 * for both the visited site and the protected reference site.
 */

// Brand classifier endpoint (cloudHost/app.py, POST /image).
const CLASSIFIER_API_URL = "https://api.mathandscienceteam.com/image";

// Google DNS-over-HTTPS resolver; the hostname is appended to this prefix.
const DNS_RESOLVER_URL = "https://dns.google/resolve?name=";

/**
 * Checks whether a DNS-over-HTTPS JSON response reports success.
 *
 * @param {Object} jsonRes Parsed response from the resolver.
 * @returns {boolean} True when the DNS status code is 0 (NOERROR).
 */
function isProperResponse(jsonRes) {
    if (jsonRes['Status'] == 0) {
        return true;
    }
    return false;
}

/**
 * Message router for the content script.
 *
 * Supported `request.utility` values and their responses:
 * - "getURL": `{url: "https://<hostname>"}`, or `{error: "not HTTPS"}`.
 * - "getClassification" (with `request.url`): `{class: <brand class>}`.
 * - "getIP": `{ip: ["proper", [<addresses>]]}` for the sender tab's site,
 *   with the first hostname label removed before the lookup.
 * - "getValidationIP": the same shape, for bankofamerica.com.
 * - anything else: `{message: "secretMessage"}`.
 *
 * Handlers that answer asynchronously return true so Chrome keeps the
 * message channel open until sendResponse is called.
 *
 * @param {Object} request Message sent by the content script.
 * @param {chrome.runtime.MessageSender} sender Sender details, including the tab.
 * @param {Function} sendResponse Callback that delivers the response.
 * @returns {boolean|undefined} True for asynchronous handlers.
 */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        // getURL answers synchronously and falls through; Chrome ignores the
        // later catch-all response because only the first one is delivered.
        if (request.utility == 'getURL') {
            let returning = new URL(sender.tab.url);
            if (returning.protocol != "https:") {
                sendResponse({error: "not HTTPS"});
            }
            else {
                sendResponse({url: returning.protocol + "//" + returning.hostname});
            }
        }

        if (request.utility == 'getClassification') {
            let url = request.url;

            var myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");

            var raw = JSON.stringify({"url": url});

            var requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };

            fetch(CLASSIFIER_API_URL, requestOptions)
                .then(response => response.json())
                .then(result => {
                    let returning = result;
                    sendResponse({"class": returning});
                    return true;
                })
                .catch(error => console.log('error: ', error));

            return true;
        }

        if (request.utility == "getIP") {
            let url = new URL(sender.tab.url);

            // Drop the first hostname label (for example "www.").
            let passingUrl = url.hostname;
            const firstP = passingUrl.indexOf(".");
            passingUrl = passingUrl.substring(firstP + 1, passingUrl.length);

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };

            fetch(DNS_RESOLVER_URL + passingUrl, requestOptions)
                .then(response => response.json())
                .then(result => {
                    if (!isProperResponse(result)) {
                        sendResponse({ip: ["improper", "trying to find the website IP address"]});
                    }

                    let traversal = result['Answer'];
                    let returning = [];

                    for (let i = 0; i < traversal.length; i++) {
                        returning.push(traversal[i]['data']);
                    }

                    sendResponse({ip: ['proper', returning]});
                })
                .catch(error => console.log('error', error));

            // Keep the message channel open for the asynchronous response.
            return true;
        }

        if (request.utility == "getValidationIP") {
            // Reference site for the protected brand.
            let url = new URL("https://www.bankofamerica.com/random/path");

            // Drop the first hostname label (for example "www.").
            let passingUrl = url.hostname;
            const firstP = passingUrl.indexOf(".");
            passingUrl = passingUrl.substring(firstP + 1, passingUrl.length);

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };

            fetch(DNS_RESOLVER_URL + passingUrl, requestOptions)
                .then(response => response.json())
                .then(result => {
                    if (!isProperResponse(result)) {
                        sendResponse({ip: ["improper", "trying to find the website IP address"]});
                    }

                    let traversal = result['Answer'];
                    let returning = [];

                    for (let i = 0; i < traversal.length; i++) {
                        returning.push(traversal[i]['data']);
                    }

                    sendResponse({ip: ['proper', returning]});
                })
                .catch(error => console.log('error', error));

            // Keep the message channel open for the asynchronous response.
            return true;
        }

        // Catch-all response for unrecognized messages.
        sendResponse({message: "secretMessage"});
    }
);
