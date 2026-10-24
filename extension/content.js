//functions

const danger_popup  = function () {
    const injectElement = document.createElement("div");
    injectElement.className = 'inject-element';
    injectElement.innerHTML =  "<b><h1>The website below is potentially a phishing website</h1></b>";
    
    injectElement.innerHTML = injectElement.innerText + "<br>" + "Be careful!" +"</br>"
    
    injectElement.style.textAlign = 'center'
    injectElement.style.height = "300px"
    injectElement.style.width = "500 px"
    injectElement.style.font = "Georgia"

    injectElement.style.color = "black";
    injectElement.style.backgroundColor = "red"
    injectElement.style.fontSize = 'x-large'
    injectElement.style.border = "5px"
    injectElement.style.lineHeight = "100px"
    injectElement.style.fontWeight = 'bold'
    
   document.body.insertBefore(injectElement, document.body.firstChild)
}

console.log("Content Script Starting Now");

let udw = 'boa'; //user defined website
let popRequired = false;

//async function start
(async () => {
    //do something with response inside but not outside

    const response = await chrome.runtime.sendMessage({utility: "getURL"});
    if (Object.keys(response).includes('error')) {
        console.log("Oh there's an error --> " + response.error);
    }
    else {
        var link = response['url']
        console.log("Link is: " + link);
    }

    //url is stored in 'link'
    chrome.runtime.sendMessage({utility: "getClassification", url: link})
    .then(output => {
        
       let pred = output.class;
        const t = true;
        console.log("Predicted class is --> " + pred)

         if (pred == udw || t) {
             chrome.runtime.sendMessage({utility: "getIP"})
             .then(ip => {
                 let printing = "";
                 if (ip.ip[0] == 'improper') {
                     console.log("Oops, looks like something went wrong with ---> " + ip.ip[1])
                }
                else {
                    for (let i = 0; i < ip.ip[1].length; i++) {
                        printing += ip.ip[1][i] + ", "
                    }

                    if (ip.ip[1].length > 1) {
                        printing = ("IP addresses are: " + printing).slice(0, -2);
                    }
                    else {
                        printing = ("IP addresses is: " + printing).slice(0, -2)
                    }
                    console.log(printing);
                    
                 }


    //             //ip addresses are stored in ip.ip[1]
    //             //string of ip addresses is stored in printing
    //             //classification is stored in pred
                 console.log("about to set values")
                 let sameUdw = false;
                chrome.runtime.sendMessage({utility: "getValidationIP"})
                .then((v_IP) =>{
                    if (ip == v_IP) {
                        sameUdw = true;
                    }
                }
                )
                let safe = true;
                if (!sameUdw && pred == udw) {
                    safe = false;
                    popRequired = true;
                }
                if (pred != udw || sameUdw) {
                    safe = true;
                    popRequired = false;
                }

                chrome.storage.local.set({url: link, ipString: printing, ipArr : ip.ip[1], classification: pred, isSafe: safe})
                .then(() =>
                {
                    console.log("values set")
                })



            })
        }


    })
    
})()

if (popRequired) {
    danger_popup()
    alert("This is a potential phishing website!!!")
}
