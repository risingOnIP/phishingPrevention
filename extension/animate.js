
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




    
async function display() {
    
    chrome.storage.local.get(["isSafe"])
.then(async (result) => {
        const div = document.querySelector('.chars');
        let str = "";
       if (result.isSafe) {
        str = "You are safe."
    }
    else {
        str = "You are being phished."        
    }
    for (let i = 0; i < str.length; i++) {
        const span = document.createElement('span');
        if (str[i] == ' ')
            span.innerHTML = '&nbsp;';
        else
            span.innerHTML = str[i];
        span.setAttribute('class', 'text')
        div.appendChild(span)
        await wait(50)
    }

})

}



document.getElementById("close").addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.remove(tabs[0].id);
    });
})

document.getElementById('dismiss').addEventListener('click', function() {
    window.close()
})

display()