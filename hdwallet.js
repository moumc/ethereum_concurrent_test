const bip39 = require('bip39');
const HDWallet = require('ethereum-hdwallet');

function generateMnemonic() {
    return bip39.generateMnemonic();
}

function getNode(mnemonic, path) {
    let hdwallet = HDWallet.fromMnemonic(mnemonic);
    let node = hdwallet.derive(path);
    return node;
}

module.exports = {
    generateMnemonic,
    getNode
};
