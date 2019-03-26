'use strict';

const Web3 = require('web3');
const inquirer = require('inquirer');

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
   */
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

  /**
   * Opens a new connection with new Web3 instances.
   * @param {ChainConfig} chainConfig JLP chain configuration.
   * @param {string} [originAccountName=origin] Origin chain account identifier.
   * @param {string} [auxiliaryAccountName=auxiliary] Auxiliary chain account
   *                                                   identifier.
   * @param {string} [originPassword] Password to unlock origin account.
   * @param {string} [auxiliaryPassword] Password to unlock auxiliary account.
   * @return {Promise<Connection>} Promise that resolve to instance of
   *                               Connection.
   */
  static async open(
    chainConfig,
    originAccountName = 'origin',
    auxiliaryAccountName = 'auxiliary',
    originPassword,
    auxiliaryPassword,
  ) {
    const originWeb3 = new Web3();
    const auxiliaryWeb3 = new Web3();

    let name = originAccountName;
    if (!originPassword) {
      const { password } = await inquirer.prompt({
        type: 'password',
        name: 'password',
        message: `Input your account password to unlock ${name}:`,
      });
      originPassword = password;
    }
    const originAccount = await Account.unlock(name, originWeb3, originPassword);

    name = auxiliaryAccountName;
    if (!auxiliaryPassword) {
      const { password } = await inquirer.prompt({
        type: 'password',
        name: 'password',
        message: `Input your account password to unlock ${name}:`,
      });
      auxiliaryPassword = password;
    }
    const auxiliaryAccount = await Account.unlock(name, auxiliaryWeb3, auxiliaryPassword);
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

  /**
   * Closes an open connection.
   */
  close() {
    this.originWeb3.currentProvider.stop();
    this.auxiliaryWeb3.currentProvider.stop();
  }
}

module.exports = Connection;
