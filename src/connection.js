'use strict';

const Web3 = require('web3');

const Account = require('./account');
const Provider = require('./provider');

class Connection {
  static async init(chainConfig) {
    const originWeb3 = new Web3();
    const auxiliaryWeb3 = new Web3();
    const originAccount = await Account.unlock('origin', originWeb3);
    const auxiliaryAccount = await Account.unlock('auxiliary', auxiliaryWeb3);
    const originProvider = Provider.create('origin', originAccount, chainConfig);
    const auxiliaryProvider = Provider.create('auxiliary', auxiliaryAccount, chainConfig);
    originWeb3.setProvider(originProvider);
    auxiliaryWeb3.setProvider(auxiliaryProvider);

    return {
      originWeb3,
      auxiliaryWeb3,
      originAccount,
      auxiliaryAccount,
    };
  }
}

module.exports = Connection;
