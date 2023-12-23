//worker.js

//###########################################---- Functions Start Here  ----#########################################\\


function isProperResponse(jsonRes) {
    if (jsonRes['Status'] == 0) {
        return true
    }
    return false
}


//##########################################---- Functions End Here  ----#############################################\\



chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("In 'worker.js' !!!")

        if (request.utility == 'getURL') {
            let returning = new URL(sender.tab.url)
            if (returning.protocol != "https:") {
                console.log("got error message");
                sendResponse({error: "not HTTPS"});
            }
            else {
                console.log("passed error message");
                console.log('url is --> ' + returning.protocol + "//" + returning.hostname)
                sendResponse({url: returning.protocol + "//" + returning.hostname});
            }
        }

        if (request.utility == 'getClassification') {


            //defining base variables
            let url = request.url;
            console.log(typeof url);
            console.log(url);
            let apiLink = "https://api.mathandscienceteam.com/image";

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

            fetch(apiLink, requestOptions)
            .then(response => response.json())
            .then(result => {
                console.log("Result is --> " + result);
            
                let returning = result;
                console.log(returning)
                sendResponse({"class": returning})
                return true
            
            })
            .catch(error => console.log('error: ', error));

            
            return true;

        }
        if (request.utility == "getIP") {
            console.log("Getting and returning an array of all IP addresses for the website that the user is on")

            //setting starting variables
            let url = new URL(sender.tab.url)
            let apiBase = "https://dns.google.com/resolve?name="

            //getting full url
            let passingUrl = url.hostname
            const firstP = passingUrl.indexOf(".")
            passingUrl = passingUrl.substring(firstP+1, passingUrl.length)
//            console.log("Passing URL is --> " + passingUrl)

            //fetching
            console.log("about to fetch")

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
              };

              fetch("https://dns.google/resolve?name=" + passingUrl, requestOptions)
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
            console.log("Getting and returning an array of all IP addresses for bank of america")

            //setting starting variables
            let url = new URL("https://www.bankofamerica.com/random/path")
            let apiBase = "https://dns.google.com/resolve?name="

            //getting full url
            let passingUrl = url.hostname
            const firstP = passingUrl.indexOf(".")
            passingUrl = passingUrl.substring(firstP+1, passingUrl.length)
//            console.log("Passing URL is --> " + passingUrl)

            //fetching
            console.log("about to fetch")

            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
              };

              fetch("https://dns.google/resolve?name=" + passingUrl, requestOptions)
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



