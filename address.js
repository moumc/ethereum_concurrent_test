const knex = require('./utils/db');
const Loger = require('./utils/log');
const logger = new Loger('users').logger();
const HDWallet = require("./hdwallet");
const blockchain = require("./blockchain");
const BigNumber = require('bignumber.js');
const sleep = require('sleep');


const prefix = 'TPS';

function insertAccount(HDKey, path) {
    knex('accounts')
        .insert({
            path: path,
            address: prefix + HDKey.getAddress().toString('hex'),
            publicKey: HDKey.getPublicKey().toString('hex'),
            privateKey: HDKey.getPrivateKey().toString('hex')
        })
        .then(function (resp) {
            logger.info('create an account successfully, resp: ', resp);
        })
        .catch(function (err) {
            logger.error('create account fail, err: ', err.toString());
        });
}

function genAddress(mnemonic, index, count) {
    mnemonic = mnemonic ? mnemonic : HDWallet.generateMnemonic();
    //console.log("mnemonic: ", mnemonic);

    for (let i = index; i < count; i++) {
        let path = "m/44'/60'/0'/0/" + i.toString();
        let HDKey = HDWallet.getNode(mnemonic, path);

        // console.log("address: ", HDKey.getAddress().toString('hex'));
        // console.log("publicKey: ", HDKey.getPublicKey().toString('hex'));
        // console.log("privateKey: ", HDKey.getPrivateKey().toString('hex'));

        insertAccount(HDKey, path);
    }
}

async function getAccountCount() {
    try {
        let id = await knex('accounts').max('id as a');
        return id[0].a;
    } catch (error) {
        throw error;
    }
}

async function getAccount(accountList, start, end) {
    try {
        let accounts = await knex('accounts')
            .select('address')
            .where('id', '>=', start)
            .andWhere('id', '<', end)
            .andWhere('balance', '=', 0);
        accounts.forEach(function (item, index) {
            accountList.push(item.address);
        });
    } catch (error) {
        throw error;
    }
}

async function getRichAccount(accountList) {
    try {
        let accounts = await knex('accounts')
            .select()
            .andWhere('balance', '>=', 50);
        accounts.forEach(function (item, index) {
            let tmp = {};
            tmp.id = item.id;
            tmp.address = item.address;
            tmp.privateKey = item.privateKey;
            tmp.prevNonce = -1;
            tmp.value = 1;
            tmp.prevTimestamp = 0;

            accountList.push(tmp);
        });
    } catch (error) {
        throw error;
    }
}

async function getAccountInfo(accountList, start, end) {
    try {
        let accounts = await knex('accounts').select().where('id', '>=', start).andWhere('id', '<', end);
        accounts.forEach(function (item, index) {
            let tmp = {};
            tmp.id = item.id;
            tmp.address = item.address;
            tmp.privateKey = item.privateKey;
            tmp.value = 0;
            accountList.push(tmp);
        });
    } catch (error) {
        throw error;
    }
}

async function update(id, balance) {
    await knex('accounts').update({balance : balance}).where('id', '=', id)
        .then(function (resp) {
            logger.info('update an account balance, resp: ', resp);
        })
        .catch(function (err) {
            logger.error('update account balance fail, err: ', err.toString());
        });
}

async function updateBalance() {
    let maxId = await getAccountCount();
    logger.info('max id : ', maxId);

    let start = 0;
    let step = 500;
    while (1) {
        let accountList = [];
        await getAccountInfo(accountList, start, start + step);
        logger.info('start : ', start , ' accountList len:  ', accountList.length);

        for (let i = 0; i < accountList.length; i++) {
            let balance = await blockchain.getBalance(accountList[i].address);
            let valueTmp = new BigNumber(balance.substr(2), 16);
            valueTmp = valueTmp.dividedBy(1e18).toFixed(8);
            await update(accountList[i].id, valueTmp);
        }

        start += step;
        if (start > maxId) {
            logger.info('update account balance finish');
            break;
        }
    }
}


module.exports = {
    genAddress: genAddress,
    getAccountCount,
    getAccount,
    getAccountInfo,
    updateBalance,
    getRichAccount
};



