'use strict';

const Web3 = require('web3');

const Account = require('../account');
const Provider = require('./provider');

/**
 * A Connection handles the connections to ethereum nodes.
 */
class Connection {
  /**
   * Construct a connection with existing Web3 and account objects.
   * Use {@link Connection#open} to open a new connection with new Web3 instances.
   *
   * @param {Web3} originWeb3 A web3 instance that points to origin.
   * @param {Web3} auxiliaryWeb3 A web3 instance that points to auxiliary.
   * @param {Account} originAccount The account to use on origin.
   * @param {Account} auxiliaryAccount The account to use on auxiliary.
   * @param {ChainConfig} chainConfig A chain configuration object.
   */
  constructor(
    originWeb3,
    auxiliaryWeb3,
    originAccount,
    auxiliaryAccount,
    chainConfig,
  ) {
    this.originWeb3 = originWeb3;
    this.auxiliaryWeb3 = auxiliaryWeb3;
    this.originAccount = originAccount;
    this.auxiliaryAccount = auxiliaryAccount;
    this.chainConfig = chainConfig;
  }

  /**
   * Opens a new connection with new Web3 instances.
   *
   * @param {ChainConfig} chainConfig JLP chain configuration.
   */
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
      chainConfig,
    );
  }

  /**
   * Closes an open connection.
   */
  close() {
    this.originWeb3.currentProvider.stop();
    this.auxiliaryWeb3.currentProvider.stop();
  }
}

module.exports = Connection;
