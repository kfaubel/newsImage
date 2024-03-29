// lib/app.ts
import fs = require('fs');
import stream = require('stream');
import util = require('util');
import meow = require('meow');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;


// tslint:disable: no-var-requires
// tslint:disable: no-console

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

let logger: any = {};

const cli = meow(`
Usage:
    $ newsImage --source source-name --count count-number --debug  target-dir

Options:
    --source, -s     - newsource (e.g.: msnbc)
    --key, -k        - newsapi.com key
    --count, -c      - count (default 10)
    --debug, -d      - enables debug output

Examples:
  node app.js --debug C:/Users/user1/images/newsImage
`, {
  flags: {
    count: {
      type: 'number',
      default: 10,       // TODO: figure out why the default is not used
      alias: 'c'         // TODO: figure out why -c does nto work
    },
    source: {
      type: 'string',
      alias: 's',
      isRequired: true
    },
    key: {
      type: 'string',
      alias: 'k',
      isRequired: true
    },
    debug: {
      alias: 'd',
      default: false
    },
  },
});

import { NewsData } from './NewsData';
import { NewsImage } from './NewsImage';

// Create a new express application instance
async function update(imageDir: string, source: string, key: string, count: number) {
    logger.info(`NewsImage:update source=${source} count=${count}`);

    const newsData = new NewsData(logger);
    const newsImage = new NewsImage(logger);

    const data:any = await newsData.getData(source, key);

    const imageList: any[] = [];

    for(let i: number = 0; i < data.length; i++) {
        const item: any = await newsImage.getImage(data[i]);
        imageList[i] = item;
    }

    try {
        logger.verbose(`Creating directory: ${imageDir}`);
        fs.mkdirSync(imageDir, { recursive: true })
    } catch (e) {
        logger.error(`Failure to create directory ${imageDir} - ${e}`)
    }

    for(let i: number = 0; i < count; i++) {
        let filename = `${imageDir}/${source}-${i}.${imageList[i].imageType}`;
        logger.verbose(`Creating: ${filename}`);
        fs.writeFileSync(filename, imageList[i].imageData.data); 
    } 
}


async function main() {
    logger = createLogger({
        format: combine(
            label({ label: 'newsImage' }),
            format.colorize(),
            format.simple(),
            format.timestamp(),
            logFormat
        ),
        transports: [
            new transports.Console({timestamp: true}),
        ]
    });
    
    logger.exitOnError = false;

    let imageDir = ".";
    if (cli.input[0] !== undefined) {
        imageDir = cli.input[0];
    }

    let repeatInterval = 0;   
    
    if (cli.flags.debug)  {
        logger.level = "verbose";
    } else {
        logger.level = "info";
    }

    logger.verbose("CLI: " + JSON.stringify(cli, undefined, 2));    
    
    logger.verbose(`Working Directory: ${imageDir}`);
    logger.verbose('====================================');
    logger.verbose(`Source: ${cli.flags.source}`);
    logger.verbose(`Key: ${cli.flags.key}`);
    logger.verbose(`Count: ${cli.flags.count}`);
    logger.verbose(`Target: ${cli.input[0]}`);

    if (repeatInterval === 0) {   
        logger.verbose(`main: Running once.`);  
        await update(imageDir, cli.flags.source, cli.flags.key, cli.flags.count);
    } else {
        logger.verbose(`main: Starting update every ${repeatInterval} seconds.`);
        update(imageDir, cli.flags.source, cli.flags.key, cli.flags.count); // Do it once now.
        const updater = setInterval(update, repeatInterval * 1000);
    }
    logger.verbose("Done.");
}

main();