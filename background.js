//import * as htmlToImage from './node_modules/html-to-image'
// const x = require("html-to-image")

import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';



// chrome.webNavigation.onCompleted.addListener((tabId, url) => {
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
// })


function getDOM() {
  //   return Array.from(
  //    // document.getElementsByTagName('div'),
  //     el => el.innerHTML
  //   );
      
    return document.cloneNode(true)

  }
  



chrome.tabs.onActivated.addListener(async (tab) =>
{

  let domRes = await chrome.scripting.executeScript({
      target: {tabId: tab.tabId},
      func: getDOM,
    }).catch(console.error);
    if (!domRes) return;
  
    let dom = domRes;
    
//copy

    // htmlToImage.toPng(dom)
    //   .then(function (dataUrl) {
    //     var img = new Image();
    //     img.src = dataUrl;
    //     _inNewTab(img.src);
    //     //document.body.appendChild(img);
    //   })
    //   .catch(function (error) {
    //     console.error('oops, something went wrong!', error);
    //   });



//copy end

    console.log(dom);  
})


