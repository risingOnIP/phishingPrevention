/**
 * animate.js: script for the toolbar popup (popup.html).
 *
 * Reads the verdict that content.js stored in chrome.storage.local and types
 * it out one character at a time. Also wires the "Close Tab" and "Dismiss"
 * buttons.
 */

/**
 * Resolves after the given delay.
 *
 * @param {number} ms Delay in milliseconds.
 * @returns {Promise<void>}
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Types out "You are safe." or "You are being phished." based on the stored
 * isSafe flag.
 */
async function display() {
    chrome.storage.local.get(["isSafe"])
        .then(async (result) => {
            const div = document.querySelector('.chars');
            let str = "";
            if (result.isSafe) {
                str = "You are safe.";
            }
            else {
                str = "You are being phished.";
            }
            for (let i = 0; i < str.length; i++) {
                const span = document.createElement('span');
                if (str[i] == ' ')
                    span.innerHTML = '&nbsp;';
                else
                    span.innerHTML = str[i];
                span.setAttribute('class', 'text');
                div.appendChild(span);
                await wait(50);
            }
        });
}

// Close the active tab.
document.getElementById("close").addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.remove(tabs[0].id);
    });
});

// Close the popup.
document.getElementById('dismiss').addEventListener('click', function() {
    window.close();
});

display();
