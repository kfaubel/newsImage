// lib/app.ts
import fs = require('fs');
import stream = require('stream');
import util = require('util');



// tslint:disable: no-var-requires
// tslint:disable: no-console
const logger = require("../src//logger");
logger.setLevel("verbose");

const NewsData = require('../src/newsData');
const NewsImage = require('../src/newsImage');

// Create a new express application instance
async function run() {
    logger.info("googleTopTen - app.ts");

    const ten: number = 10;
    const newsData = new NewsData(logger);
    const newsImage = new NewsImage(logger);

    const data:any = await newsData.getData("msnbc", "12345");

    const imageList: any[] = [];

    for(let i: number = 0; i < data.length; i++) {
        const item: any = await newsImage.getImage(data[i]);
        imageList[i] = item;
    }

    logger.info("Data gathered.");

    for(let i: number = 0; i < ten; i++) {
        fs.writeFileSync(__dirname +'/../msnbc-' + i + "." + imageList[i].imageType, imageList[i].imageData.data); 
    } 
}

run();