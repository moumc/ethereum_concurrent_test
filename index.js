const address = require("./address");
const blockchain = require("./blockchain");
const Loger = require('./utils/log');
const logger = new Loger('users').logger();

let mnemonic = "bar view sting refuse month concert online mosquito close start heart aerobic";
// let mnemonic ;

function genAddressList() {
    address.genAddress(mnemonic, 2000, 10000);
}

async function transfer() {
    // let fromList = [{address: "TPS5496f39eebfde3191490d5bbe32b2dbb296ffe1d", value: 100, privateKey: "eba22c35bb692a347cf44d8dda95e6b764b899c1839548d8da34bc85469f54ab", prevNonce: -1}];

    let maxId = await address.getAccountCount();
    logger.info('max id : ', maxId);

    let fromList = [];
    await address.getRichAccount(fromList);
    logger.info( ' fromList len:  ', fromList.length);

    let start = 0;
    let step = 500;
    let count = [{count: 0}];
    while (1) {
        let toList = [];
        await address.getAccount(toList, start, start + step);
        logger.info('start : ', start , ' toList len:  ', toList.length);

        if (fromList.length > 0 && toList.length > 0) {
            await blockchain.moreToMore(fromList, toList, count);
        }

        start += step;
        if (start > maxId) {
            logger.info('transfer account finish');
            break;
        }
    }
}

async function transferSelf() {
    let maxId = await address.getAccountCount();
    logger.info('max id : ', maxId);

    // maxId = 5000;
    // let fromList = [];
    // await address.getRichAccount(fromList);
    // logger.info( ' fromList len:  ', fromList.length);

    let start = 0;
    let step = 500;
    let count = [{count: 0}];
    while (1) {
        let fromList = [];
        await address.getAccountInfo(fromList, start, start + step);
        logger.info('start : ', start , ' toList len:  ', fromList.length);

        if (fromList.length > 0) {
            await blockchain.transferSelf(fromList, count);
        }

        start += step;
        if (start > maxId) {
            logger.info('transferSelf transfer account finish');
            break;
        }
    }
}

async function updateBalance() {
    await address.updateBalance();
}

async function getBlocks() {
    await blockchain.getBlocks(0x7b47, 0x7bb5);
}

async function updateTxs() {

    let maxId = await blockchain.getSheetCount('txs');
    logger.info('max id : ', maxId);

    let start = 0;
    let step = 500;
    while (1) {
        let txList = [];
        await blockchain.getTxInfo(txList, start, start + step);
        logger.info('start : ', start , ' toList len:  ', txList.length);

        if (txList.length > 0) {
            await blockchain.updateTxs(txList);
        }

        start += step;
        if (start > maxId) {
            logger.info('update txs finish');
            break;
        }
    }
}

function start() {
    // genAddressList();
    // transfer();
    // updateBalance();
    // transferSelf();
    getBlocks();
    // updateTxs();

}

start();


