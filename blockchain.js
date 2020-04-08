const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const BigNumber = require('bignumber.js');
const EthereumTx = require('ethereumjs-tx').Transaction;
const sleep = require('sleep');

const knex = require('./utils/db');
const Loger = require('./utils/log');
const logger = new Loger('users').logger();

const eth = new EthRPC(new HttpProvider('http://192.168.6.160:31320'));

function signTx(txData, privateKey) {
    const tx = new EthereumTx(txData);
    tx.sign(Buffer.from(privateKey, 'hex'));
    const serializedTx = tx.serialize();

    // console.log(serializedTx.toString('hex'));
    return serializedTx.toString('hex');
}

function getNonce(address) {
    return new Promise(async function (resolve, reject) {
        eth.sendAsync({
            method: 'tps_getTransactionCount',
            params: [address, 'latest'],
        }, (err, resp) => {
            if (err) {
                reject(err);
            }
            resolve(resp);
        });
    });
}

function sendRawTransaction(raw) {
    return new Promise(async function (resolve, reject) {
        eth.sendAsync({
            method: 'tps_sendRawTransaction',
            params: [raw],
        }, (err, resp) => {
            if (err) {
                reject(err);
            }
            resolve(resp);
        });
    });
}

function getBalance(address) {
    return new Promise(async function (resolve, reject) {
        eth.sendAsync({
            method: 'tps_getBalance',
            params: [address, 'latest'],
        }, (err, resp) => {
            if (err) {
                reject(err);
            }
            resolve(resp);
        });
    });
}

function getBlockByNumber(number) {
    return new Promise(async function (resolve, reject) {
        eth.sendAsync({
            method: 'tps_getBlockByNumber',
            params: [number, true],
        }, (err, resp) => {
            if (err) {
                reject(err);
            }
            resolve(resp);
        });
    });
}

function getTransactionByHash(hash) {
    return new Promise(async function (resolve, reject) {
        eth.sendAsync({
            method: 'tps_getTransactionByHash',
            params: [hash],
        }, (err, resp) => {
            if (err) {
                reject(err);
            }
            resolve(resp);
        });
    });
}

function toHex(s) {
    return '0x' + s.toString();
}

function procPrefix(s) {
    return s.substr(0, 3) === 'TPS' ? '0x' + s.substr(3) : s;
}

async function transfer(from, to, value, privateKey) {
    try {
        let valueTmp = new BigNumber(value);
        valueTmp = valueTmp.times(1e18).toString(16);

        let nonce = await getNonce(from);

        let txData = {
            from: from,
            to: to,
            value: toHex(valueTmp),
            nonce: nonce,
            gasPrice: "0x3b9aca00",
            gasLimit: "0x5208"
        };
        // console.log(JSON.stringify(txData));

        let raw = signTx(txData, privateKey);
        let txHash = await sendRawTransaction(raw);

        return {hash: txHash, nonce: nonce};
    } catch (e) {
        logger.error('transfer err : ', e.toString());
    }
}

async function alignTransfer(fromList, toList) {
    let from = "";
    let to = "";
    let value = 0;
    let privateKey = "";

    let count = fromList.length < toList.length ? fromList.length : toList.length;

    try {
        for (let i = 0; i < count; i++) {
            from = procPrefix(fromList[i].from.toString());
            value = fromList[i].value;
            privateKey = fromList[i].privateKey;
            to = procPrefix(toList[i].toString());

            let resp = await transfer(from, to, value, privateKey);
            logger.info('txHash: ', resp.hash);
        }
    } catch (e) {
        logger.error('alignTransfer transfer err : ', e.toString());
    }
}

async function getFrom(fromList) {
    let now = Date.now() / 1000;
    for (let i = 0; i < fromList.length; i++) {
        if (now - fromList[i].prevTimestamp < 5) {
            continue;
        }

        let from = procPrefix(fromList[i].address.toString());
        let currentNonce = await getNonce(from);
        // console.log(from, i, currentNonce, fromList[i].prevNonce);
        if (currentNonce > fromList[i].prevNonce) {
            fromList[i].prevNonce = currentNonce;
            fromList[i].prevTimestamp = now;
            return i;
        }
    }

    // fromList.forEach(async function (item, index) {
    //     console.log(index);
    //     let from = procPrefix(item.address.toString());
    //     console.log(from);
    //     let currentNonce = await getNonce(from);
    //     console.log(from, index, currentNonce, item.prevNonce);
    //     if (currentNonce > item.prevNonce) {
    //         item.prevNonce = currentNonce;
    //         return index;
    //     }
    // });

    return -1;
}

async function moreToMore(fromList, toList, count) {
    let from = "";
    let to = "";
    let value = 0;
    let privateKey = "";

    for (let i = 0; i < toList.length; i++) {
        try {
            let index = await getFrom(fromList);
            if (index !== -1) {
                from = procPrefix(fromList[index].address.toString());
                value = fromList[index].value;
                privateKey = fromList[index].privateKey;
                to = procPrefix(toList[i].toString());

                let resp = await transfer(from, to, value, privateKey);

                count[0].count++;
                logger.info('txHash: ', resp.hash, ' count: ', count[0].count);
            } else {
                logger.info('not found from address, wait ... ');
                sleep.sleep(1);
            }
        } catch (e) {
            logger.error('moreToMore transfer err : ', e.toString());
        }
    }
}

async function oneTransferMany(fromInfo, toList) {
    let from = "";
    let to = "";
    let value = 0;
    let privateKey = "";

    let prevNonce = 0;
    let currentNonce = 0;

    for (let i = 0; i < toList.length; i++) {
        from = procPrefix(fromInfo.from.toString());
        value = fromInfo.value;
        privateKey = fromInfo.privateKey;
        to = procPrefix(toList[i].toString());

        try {
            currentNonce = await getNonce(from);
            if (currentNonce > prevNonce) {
                let resp = await transfer(from, to, value, privateKey);
                prevNonce = resp.nonce;
                logger.info('txHash: ', resp.hash, ' nonce: ', prevNonce);
            }
        } catch (e) {
            logger.error('oneTransferMany transfer err : ', e.toString());
        }

        sleep.sleep(10);
    }
}

function insertTxs(fromInfo, hash) {
    knex('txs')
        .insert({
            hash: hash,
            from: fromInfo.address,
            to: fromInfo.address,
            value: fromInfo.value
        })
        .then(function (resp) {
            // logger.info('insert an tx successfully, resp: ', resp);
        })
        .catch(function (err) {
            logger.error('insert tx fail, err: ', err.toString());
        });
}

async function transferSelf(fromInfo, count) {
    let from = "";
    let to = "";
    let value = 0;
    let privateKey = "";

    for (let i = 0; i < fromInfo.length; i++) {
        from = procPrefix(fromInfo[i].address.toString());
        value = fromInfo[i].value;
        privateKey = fromInfo[i].privateKey;
        to = procPrefix(fromInfo[i].address.toString());

        try {
            let resp = await transfer(from, to, value, privateKey);
            count[0].count++
            logger.info('txHash: ', resp.hash, ' count: ', count[0].count);

            await insertTxs(fromInfo[i], resp.hash);
        } catch (e) {
            logger.error('oneTransferMany transfer err : ', e.toString());
        }
    }
}

function insertBlocks(block) {
    knex('blocks')
        .insert({
            height: parseInt(block.number, 16),
            timestamp: parseInt(block.timestamp, 16),
            difficulty: block.difficulty,
            hash: block.hash,
            size: block.size,
            tx_count: block.transactions.length,
            gas_limit: block.gasLimit
        })
        .then(function (resp) {
            logger.info('insert an block successfully, resp: ', resp);
        })
        .catch(function (err) {
            logger.error('insert block fail, err: ', err.toString());
        });
}

async function getBlocks(start, end) {
    for (let i = start ; i < end; i++) {
        let height = '0x' + i.toString(16);
        // let height = i;

        // console.log(height);
        let block = await getBlockByNumber(height);
        await insertBlocks(block);
    }
}

async function getSheetCount(sheet) {
    try {
        let id = await knex(sheet).max('id as a');
        return id[0].a;
    } catch (error) {
        throw error;
    }
}

async function getTxInfo(txList, start, end) {
    try {
        let accounts = await knex('txs')
            .select('id', 'hash')
            .where('id', '>=', start)
            .andWhere('id', '<', end)
            .whereNull('height');
        accounts.forEach(function (item, index) {
            let tmp = {};
            tmp.id = item.id;
            tmp.hash = item.hash;

            txList.push(tmp);
        });
    } catch (error) {
        throw error;
    }
}

async function updateTx(id, height) {
    await knex('txs').update({height : height}).where('id', '=', id)
        .then(function (resp) {
            logger.info('update an tx , resp: ', resp);
        })
        .catch(function (err) {
            logger.error('update tx fail, err: ', err.toString());
        });
}


async function updateTxs(txList) {
    for (let i = 0; i < txList.length; i++) {
        try {
            let block = await getTransactionByHash(txList[i].hash);
            if (block) {
                await updateTx(txList[i].id, parseInt(block.blockNumber, 16));
            }
        } catch (e) {
            logger.error('updateTxs err : ', e.toString());
        }
    }
}

module.exports = {
    alignTransfer,
    oneTransferMany,
    getBalance,
    moreToMore,
    transferSelf,
    getBlocks,
    updateTxs,
    getSheetCount,
    getTxInfo
};


function test() {
    let fromList = [
        {
            from: "TPS5496f39eebfde3191490d5bbe32b2dbb296ffe1d",
            value: 0.0001,
            privateKey: "eba22c35bb692a347cf44d8dda95e6b764b899c1839548d8da34bc85469f54ab",
            prevNonce: 0,
            prevTimestamp: 0
        }
    ];
    let toList = ["TPS7cc390a527599b496d80c9aa5e5c9bc63b414102", "TPS9f1ae91766b29279a58b5416d579773cae5c8c14"];

    moreToMore(fromList, toList)
}

// test();