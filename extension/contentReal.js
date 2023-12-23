(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
//requires
//const morph = require("html-to-image")
//const fetch = require("node-fetch")

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

function _inNewTab(dataURI) {
    var w = window.open("about:blank", "_blank");
    var html = w.document.documentElement;
    var body = w.document.body;

    html.style.margin = 0;
    html.style.padding = 0;
    body.style.margin = 0;
    body.style.padding = 0;

    var img = w.document.createElement("img");
    img.src = dataURI;
    img.style.maxWidth = "100%";
    img.alt = "captured image";
    img.addEventListener("click", function () {
        this.style.maxWidth = this.style.maxWidth === "100%" ? "" : "100%";
    });
    body.appendChild(img);
}

function _callAPI(usingImage) {

    // var myHeaders = new Headers();
    // myHeaders.append("X-API-Key", "c1e32a9d-8891-42b8-a89a-4ab2c1d61c2b");

    // var formdata = new FormData();
    // formdata.append("image", usingImage);

    // var requestOptions = {
    //     method: 'POST',
    //     headers: myHeaders,
    //     body: formdata,
    //     redirect: 'follow'
    // };

    // fetch("https://api.mathandscienceteam.com").then(response => response.text()).then(result => console.log(result)).catch(error => console.log('error', error));


    // var myHeaders = new Headers();
    // myHeaders.append("X-API-Key", "c1e32a9d-8891-42b8-a89a-4ab2c1d61c2b");
    
    // var formdata = new FormData();
    // formdata.append("image", usingImage);
    
    // var requestOptions = {
    //   method: 'POST',
    //   headers: myHeaders,
    //   body: formdata,
    //   redirect: 'follow'
    // };
    
    // fetch("https://api.mathandscienceteam.com/predict", requestOptions)
    //   .then(response => response.text())
    //   .then(result => console.log(result))
    //   .catch(error => console.log('error', error));

    chrome.runtime.sendMessage({utility: "getLink", image : usingImage})
    .then(params => {
        console.log(params.params)
    })



}

/*##########################################################function end/*##########################################################*/

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






// morph.toPng(document.body)
//     .then(function (dataUrl) {
//         let image = new Image()
//         image.src = dataUrl
//         image.style.maxwidth = "100%"
//         image.alt = "captured image";

// //        _inNewTab(image)

//         _callAPI(dataUrl)
//    //     _inNewTab(dataUrl)

    // })
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnRlbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vcmVxdWlyZXNcclxuLy9jb25zdCBtb3JwaCA9IHJlcXVpcmUoXCJodG1sLXRvLWltYWdlXCIpXHJcbi8vY29uc3QgZmV0Y2ggPSByZXF1aXJlKFwibm9kZS1mZXRjaFwiKVxyXG5cclxuLy9mdW5jdGlvbnNcclxuXHJcbmNvbnN0IGRhbmdlcl9wb3B1cCAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zdCBpbmplY3RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGluamVjdEVsZW1lbnQuY2xhc3NOYW1lID0gJ2luamVjdC1lbGVtZW50JztcclxuICAgIGluamVjdEVsZW1lbnQuaW5uZXJIVE1MID0gIFwiPGI+PGgxPlRoZSB3ZWJzaXRlIGJlbG93IGlzIHBvdGVudGlhbGx5IGEgcGhpc2hpbmcgd2Vic2l0ZTwvaDE+PC9iPlwiO1xyXG4gICAgXHJcbiAgICBpbmplY3RFbGVtZW50LmlubmVySFRNTCA9IGluamVjdEVsZW1lbnQuaW5uZXJUZXh0ICsgXCI8YnI+XCIgKyBcIkJlIGNhcmVmdWwhXCIgK1wiPC9icj5cIlxyXG4gICAgXHJcbiAgICBpbmplY3RFbGVtZW50LnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInXHJcbiAgICBpbmplY3RFbGVtZW50LnN0eWxlLmhlaWdodCA9IFwiMzAwcHhcIlxyXG4gICAgaW5qZWN0RWxlbWVudC5zdHlsZS53aWR0aCA9IFwiNTAwIHB4XCJcclxuICAgIGluamVjdEVsZW1lbnQuc3R5bGUuZm9udCA9IFwiR2VvcmdpYVwiXHJcblxyXG4gICAgaW5qZWN0RWxlbWVudC5zdHlsZS5jb2xvciA9IFwiYmxhY2tcIjtcclxuICAgIGluamVjdEVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCJyZWRcIlxyXG4gICAgaW5qZWN0RWxlbWVudC5zdHlsZS5mb250U2l6ZSA9ICd4LWxhcmdlJ1xyXG4gICAgaW5qZWN0RWxlbWVudC5zdHlsZS5ib3JkZXIgPSBcIjVweFwiXHJcbiAgICBpbmplY3RFbGVtZW50LnN0eWxlLmxpbmVIZWlnaHQgPSBcIjEwMHB4XCJcclxuICAgIGluamVjdEVsZW1lbnQuc3R5bGUuZm9udFdlaWdodCA9ICdib2xkJ1xyXG4gICAgXHJcbiAgIGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKGluamVjdEVsZW1lbnQsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZClcclxufVxyXG5cclxuZnVuY3Rpb24gX2luTmV3VGFiKGRhdGFVUkkpIHtcclxuICAgIHZhciB3ID0gd2luZG93Lm9wZW4oXCJhYm91dDpibGFua1wiLCBcIl9ibGFua1wiKTtcclxuICAgIHZhciBodG1sID0gdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XHJcbiAgICB2YXIgYm9keSA9IHcuZG9jdW1lbnQuYm9keTtcclxuXHJcbiAgICBodG1sLnN0eWxlLm1hcmdpbiA9IDA7XHJcbiAgICBodG1sLnN0eWxlLnBhZGRpbmcgPSAwO1xyXG4gICAgYm9keS5zdHlsZS5tYXJnaW4gPSAwO1xyXG4gICAgYm9keS5zdHlsZS5wYWRkaW5nID0gMDtcclxuXHJcbiAgICB2YXIgaW1nID0gdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgaW1nLnNyYyA9IGRhdGFVUkk7XHJcbiAgICBpbWcuc3R5bGUubWF4V2lkdGggPSBcIjEwMCVcIjtcclxuICAgIGltZy5hbHQgPSBcImNhcHR1cmVkIGltYWdlXCI7XHJcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnN0eWxlLm1heFdpZHRoID0gdGhpcy5zdHlsZS5tYXhXaWR0aCA9PT0gXCIxMDAlXCIgPyBcIlwiIDogXCIxMDAlXCI7XHJcbiAgICB9KTtcclxuICAgIGJvZHkuYXBwZW5kQ2hpbGQoaW1nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gX2NhbGxBUEkodXNpbmdJbWFnZSkge1xyXG5cclxuICAgIC8vIHZhciBteUhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xyXG4gICAgLy8gbXlIZWFkZXJzLmFwcGVuZChcIlgtQVBJLUtleVwiLCBcImMxZTMyYTlkLTg4OTEtNDJiOC1hODlhLTRhYjJjMWQ2MWMyYlwiKTtcclxuXHJcbiAgICAvLyB2YXIgZm9ybWRhdGEgPSBuZXcgRm9ybURhdGEoKTtcclxuICAgIC8vIGZvcm1kYXRhLmFwcGVuZChcImltYWdlXCIsIHVzaW5nSW1hZ2UpO1xyXG5cclxuICAgIC8vIHZhciByZXF1ZXN0T3B0aW9ucyA9IHtcclxuICAgIC8vICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgIC8vICAgICBoZWFkZXJzOiBteUhlYWRlcnMsXHJcbiAgICAvLyAgICAgYm9keTogZm9ybWRhdGEsXHJcbiAgICAvLyAgICAgcmVkaXJlY3Q6ICdmb2xsb3cnXHJcbiAgICAvLyB9O1xyXG5cclxuICAgIC8vIGZldGNoKFwiaHR0cHM6Ly9hcGkubWF0aGFuZHNjaWVuY2V0ZWFtLmNvbVwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLnRleHQoKSkudGhlbihyZXN1bHQgPT4gY29uc29sZS5sb2cocmVzdWx0KSkuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5sb2coJ2Vycm9yJywgZXJyb3IpKTtcclxuXHJcblxyXG4gICAgLy8gdmFyIG15SGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XHJcbiAgICAvLyBteUhlYWRlcnMuYXBwZW5kKFwiWC1BUEktS2V5XCIsIFwiYzFlMzJhOWQtODg5MS00MmI4LWE4OWEtNGFiMmMxZDYxYzJiXCIpO1xyXG4gICAgXHJcbiAgICAvLyB2YXIgZm9ybWRhdGEgPSBuZXcgRm9ybURhdGEoKTtcclxuICAgIC8vIGZvcm1kYXRhLmFwcGVuZChcImltYWdlXCIsIHVzaW5nSW1hZ2UpO1xyXG4gICAgXHJcbiAgICAvLyB2YXIgcmVxdWVzdE9wdGlvbnMgPSB7XHJcbiAgICAvLyAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgLy8gICBoZWFkZXJzOiBteUhlYWRlcnMsXHJcbiAgICAvLyAgIGJvZHk6IGZvcm1kYXRhLFxyXG4gICAgLy8gICByZWRpcmVjdDogJ2ZvbGxvdydcclxuICAgIC8vIH07XHJcbiAgICBcclxuICAgIC8vIGZldGNoKFwiaHR0cHM6Ly9hcGkubWF0aGFuZHNjaWVuY2V0ZWFtLmNvbS9wcmVkaWN0XCIsIHJlcXVlc3RPcHRpb25zKVxyXG4gICAgLy8gICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS50ZXh0KCkpXHJcbiAgICAvLyAgIC50aGVuKHJlc3VsdCA9PiBjb25zb2xlLmxvZyhyZXN1bHQpKVxyXG4gICAgLy8gICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5sb2coJ2Vycm9yJywgZXJyb3IpKTtcclxuXHJcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7dXRpbGl0eTogXCJnZXRMaW5rXCIsIGltYWdlIDogdXNpbmdJbWFnZX0pXHJcbiAgICAudGhlbihwYXJhbXMgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHBhcmFtcy5wYXJhbXMpXHJcbiAgICB9KVxyXG5cclxuXHJcblxyXG59XHJcblxyXG4vKiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNmdW5jdGlvbiBlbmQvKiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMqL1xyXG5cclxuY29uc29sZS5sb2coXCJDb250ZW50IFNjcmlwdCBTdGFydGluZyBOb3dcIik7XHJcblxyXG5sZXQgdWR3ID0gJ2JvYSc7IC8vdXNlciBkZWZpbmVkIHdlYnNpdGVcclxubGV0IHBvcFJlcXVpcmVkID0gZmFsc2U7XHJcblxyXG4vL2FzeW5jIGZ1bmN0aW9uIHN0YXJ0XHJcbihhc3luYyAoKSA9PiB7XHJcbiAgICAvL2RvIHNvbWV0aGluZyB3aXRoIHJlc3BvbnNlIGluc2lkZSBidXQgbm90IG91dHNpZGVcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt1dGlsaXR5OiBcImdldFVSTFwifSk7XHJcbiAgICBpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmluY2x1ZGVzKCdlcnJvcicpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJPaCB0aGVyZSdzIGFuIGVycm9yIC0tPiBcIiArIHJlc3BvbnNlLmVycm9yKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciBsaW5rID0gcmVzcG9uc2VbJ3VybCddXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJMaW5rIGlzOiBcIiArIGxpbmspO1xyXG4gICAgfVxyXG5cclxuICAgIC8vdXJsIGlzIHN0b3JlZCBpbiAnbGluaydcclxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt1dGlsaXR5OiBcImdldENsYXNzaWZpY2F0aW9uXCIsIHVybDogbGlua30pXHJcbiAgICAudGhlbihvdXRwdXQgPT4ge1xyXG4gICAgICAgIFxyXG4gICAgICAgbGV0IHByZWQgPSBvdXRwdXQuY2xhc3M7XHJcbiAgICAgICAgY29uc3QgdCA9IHRydWU7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJQcmVkaWN0ZWQgY2xhc3MgaXMgLS0+IFwiICsgcHJlZClcclxuXHJcbiAgICAgICAgIGlmIChwcmVkID09IHVkdyB8fCB0KSB7XHJcbiAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7dXRpbGl0eTogXCJnZXRJUFwifSlcclxuICAgICAgICAgICAgIC50aGVuKGlwID0+IHtcclxuICAgICAgICAgICAgICAgICBsZXQgcHJpbnRpbmcgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgIGlmIChpcC5pcFswXSA9PSAnaW1wcm9wZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT29wcywgbG9va3MgbGlrZSBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIC0tLT4gXCIgKyBpcC5pcFsxXSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXAuaXBbMV0ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRpbmcgKz0gaXAuaXBbMV1baV0gKyBcIiwgXCJcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpcC5pcFsxXS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50aW5nID0gKFwiSVAgYWRkcmVzc2VzIGFyZTogXCIgKyBwcmludGluZykuc2xpY2UoMCwgLTIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRpbmcgPSAoXCJJUCBhZGRyZXNzZXMgaXM6IFwiICsgcHJpbnRpbmcpLnNsaWNlKDAsIC0yKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwcmludGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvL2lwIGFkZHJlc3NlcyBhcmUgc3RvcmVkIGluIGlwLmlwWzFdXHJcbiAgICAvLyAgICAgICAgICAgICAvL3N0cmluZyBvZiBpcCBhZGRyZXNzZXMgaXMgc3RvcmVkIGluIHByaW50aW5nXHJcbiAgICAvLyAgICAgICAgICAgICAvL2NsYXNzaWZpY2F0aW9uIGlzIHN0b3JlZCBpbiBwcmVkXHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhYm91dCB0byBzZXQgdmFsdWVzXCIpXHJcbiAgICAgICAgICAgICAgICAgbGV0IHNhbWVVZHcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt1dGlsaXR5OiBcImdldFZhbGlkYXRpb25JUFwifSlcclxuICAgICAgICAgICAgICAgIC50aGVuKCh2X0lQKSA9PntcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXAgPT0gdl9JUCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYW1lVWR3ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICBsZXQgc2FmZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXNhbWVVZHcgJiYgcHJlZCA9PSB1ZHcpIHtcclxuICAgICAgICAgICAgICAgICAgICBzYWZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9wUmVxdWlyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHByZWQgIT0gdWR3IHx8IHNhbWVVZHcpIHtcclxuICAgICAgICAgICAgICAgICAgICBzYWZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBwb3BSZXF1aXJlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7dXJsOiBsaW5rLCBpcFN0cmluZzogcHJpbnRpbmcsIGlwQXJyIDogaXAuaXBbMV0sIGNsYXNzaWZpY2F0aW9uOiBwcmVkLCBpc1NhZmU6IHNhZmV9KVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oKCkgPT5cclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInZhbHVlcyBzZXRcIilcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9KVxyXG4gICAgXHJcbn0pKClcclxuXHJcbmlmIChwb3BSZXF1aXJlZCkge1xyXG4gICAgZGFuZ2VyX3BvcHVwKClcclxuICAgIGFsZXJ0KFwiVGhpcyBpcyBhIHBvdGVudGlhbCBwaGlzaGluZyB3ZWJzaXRlISEhXCIpXHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuLy8gbW9ycGgudG9QbmcoZG9jdW1lbnQuYm9keSlcclxuLy8gICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhVXJsKSB7XHJcbi8vICAgICAgICAgbGV0IGltYWdlID0gbmV3IEltYWdlKClcclxuLy8gICAgICAgICBpbWFnZS5zcmMgPSBkYXRhVXJsXHJcbi8vICAgICAgICAgaW1hZ2Uuc3R5bGUubWF4d2lkdGggPSBcIjEwMCVcIlxyXG4vLyAgICAgICAgIGltYWdlLmFsdCA9IFwiY2FwdHVyZWQgaW1hZ2VcIjtcclxuXHJcbi8vIC8vICAgICAgICBfaW5OZXdUYWIoaW1hZ2UpXHJcblxyXG4vLyAgICAgICAgIF9jYWxsQVBJKGRhdGFVcmwpXHJcbi8vICAgIC8vICAgICBfaW5OZXdUYWIoZGF0YVVybClcclxuXHJcbiAgICAvLyB9KSJdfQ==
