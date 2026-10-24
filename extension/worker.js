//worker.js

// Brand classifier endpoint (cloudHost/app.py, POST /image).
const CLASSIFIER_API_URL = "https://api.mathandscienceteam.com/image";

// Google DNS-over-HTTPS resolver; the hostname is appended to this prefix.
const DNS_RESOLVER_URL = "https://dns.google/resolve?name=";


function isProperResponse(jsonRes) {
    if (jsonRes['Status'] == 0) {
        return true
    }
    return false
}




chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        if (request.utility == 'getURL') {
            let returning = new URL(sender.tab.url)
            if (returning.protocol != "https:") {
                sendResponse({error: "not HTTPS"});
            }
            else {
                sendResponse({url: returning.protocol + "//" + returning.hostname});
            }
        }

        if (request.utility == 'getClassification') {


            //defining base variables
            let url = request.url;

            //sending API request
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
                sendResponse({"class": returning})
                return true
            
            })
            .catch(error => console.log('error: ', error));

            
            return true;

        }
        if (request.utility == "getIP") {

            //setting starting variables
            let url = new URL(sender.tab.url)

            //getting full url
            let passingUrl = url.hostname
            const firstP = passingUrl.indexOf(".")
            passingUrl = passingUrl.substring(firstP+1, passingUrl.length)

            //fetching

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
              };

              fetch(DNS_RESOLVER_URL + passingUrl, requestOptions)
                .then(response => response.json())
                .then(result => {

                    if (!isProperResponse(result)) {
                        sendResponse({ip: ["improper", "trying to find the website IP address"]})
                    }

                    let traversal = result['Answer']
                    let returning = []

                    for (let i = 0; i < traversal.length; i++) {
                        returning.push(traversal[i]['data'])
                    }

                   
                    sendResponse({ip: ['proper', returning]})
                })
                .catch(error => console.log('error', error));


                //return true underneath is very important
                return true;            

        }
        if (request.utility == "getValidationIP") {

            //setting starting variables
            let url = new URL("https://www.bankofamerica.com/random/path")

            //getting full url
            let passingUrl = url.hostname
            const firstP = passingUrl.indexOf(".")
            passingUrl = passingUrl.substring(firstP+1, passingUrl.length)

            //fetching

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
              };

              fetch(DNS_RESOLVER_URL + passingUrl, requestOptions)
                .then(response => response.json())
                .then(result => {

                    if (!isProperResponse(result)) {
                        sendResponse({ip: ["improper", "trying to find the website IP address"]})
                    }

                    let traversal = result['Answer']
                    let returning = []

                    for (let i = 0; i < traversal.length; i++) {
                        returning.push(traversal[i]['data'])
                    }

                   
                    sendResponse({ip: ['proper', returning]})
                })
                .catch(error => console.log('error', error));


                //return true underneath is very important
                return true;            

        }



        

        //catch all 
        sendResponse({message: "secretMessage"})

    }
)



