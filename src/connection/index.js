'use strict';

const Web3 = require('web3');

const Account = require('../account');
const Provider = require('./provider');

class Connection {
  constructor(
    originWeb3,
    auxiliaryWeb3,
    originAccount,
    auxiliaryAccount,
  ) {
    this.originWeb3 = originWeb3;
    this.auxiliaryWeb3 = auxiliaryWeb3;
    this.originAccount = originAccount;
    this.auxiliaryAccount = auxiliaryAccount;
  }

  static async open(chainConfig) {
    const originWeb3 = new Web3();
    const auxiliaryWeb3 = new Web3();
    const originAccount = await Account.unlock('origin', originWeb3);
    const auxiliaryAccount = await Account.unlock('auxiliary', auxiliaryWeb3);
    const originProvider = Provider.create('origin', originAccount, chainConfig);
    const auxiliaryProvider = Provider.create('auxiliary', auxiliaryAccount, chainConfig);
    originWeb3.setProvider(originProvider);
    auxiliaryWeb3.setProvider(auxiliaryProvider);

    return new Connection(
      originWeb3,
      auxiliaryWeb3,
      originAccount,
      auxiliaryAccount,
    );
  }

  close() {
    this.originWeb3.currentProvider.stop();
    this.auxiliaryWeb3.currentProvider.stop();
  }
}

module.exports = Connection;
