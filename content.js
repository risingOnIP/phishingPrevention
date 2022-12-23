// var jsdom = require("jsdom");
// global.$ = require('jquery/dist/jquery')(jsdom.createWindow());

//import * as htmlToImage from './node_modules/html-to-image'
const morph = require("html-to-image")
const Canvas = require('canvas');

const tfjs = require('@tensorflow/tfjs')
//import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';



////////////////////////////////////////////////////////FUNCTIONS START HERE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

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
  img.addEventListener("click", function() {
    this.style.maxWidth = this.style.maxWidth === "100%" ? "" : "100%";
  });
  body.appendChild(img);
}



function getDOM() {
    // return Array.from(
    //   document.getElementsByTagName('div'),
    //   el => el.innerHTML
    // );
//  return document.getElementById("#div")
      
    // return document.querySelector("Body");
    //return document.cloneNode(true)

    return document.querySelector("#div")

  }

  
   async function loadModel(){
     let json = chrome.runtime.getURL('model.json')
  //  // chrome.storage.local.set({'model': json})
      const model = await tfjs.loadLayersModel(json)
      .then(model => { return model})
      // model.predict(question)
      
  }

  function getImageData(img) {


    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0,0);
    return ctx.getImageData(0,0,img.width,img.height);
    
  }
  
    


/////////////////////////////////////////////////////////FUNCTION END\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


////////////////////////////////////////////////////////EVENT LISTENER START\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//actual code


console.log("Content script starting now \n")
const dom = getDOM()


console.log("image starting")

morph.toPng(document.body)
.then(function (dataUrl) {
  let img = document.createElement('img'); //new Image() may also work
  img.src = dataUrl
  img.style.maxWidth = "100%";
  //image created in img

  // let width  = img.clientWidth
  // let height  = img.clientHeight





      //
  img.onload = function(){
    let pixelArr = getImageData(img).data
    let normalizedPixelArr = []

    console.log(pixelArr)
    let completedModel = loadModel()
    console.log(img.width)
    console.log(img.width)
    for (let row = 0;  row < img.height; row++) {
      for (let col = 0; col < img.width; col++) {
        index = ((img.width * col) + row) * 4
        normalizedPixelArr.push(pixelArr[index]/255)
        console.log(normalizedPixelArr[index])
        
        normalizedPixelArr.push(pixelArr[index+1] /255) 
        normalizedPixelArr.push(pixelArr[index+2] / 255)
        normalizedPixelArr.push(pixelArr[index+3] / 255)
      }
    } 
    console.log(normalizedPixelArr);
    console.log(pixelArr[0])
    console.log(pixelArr[0]/255)



  }













     //in New Tab function works where image of tab is put in new tab 
    //  _inNewTab(dataUrl)
    })
    .catch(function(error) {
        console.log("oops: ", error)
    });
