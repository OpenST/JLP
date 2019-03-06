'use strict';

const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');

const logger = require('./logger');

const accountsFile = path.join(__dirname, '../accounts.json');

// Caching unlocked accounts so we do not need to read from disk and ask for password multiple
// times.
const unlockedAccounts = {};

/**
 * Manages encrypted Web3 accounts.
 */
class Account {
  /**
   * Creates a new account for the given chain and stores it in the accounts.json file.
   * Backs up any existing accounts.json file.
   *
   * @param {string} chain Chain identifier to read and write the accounts file.
   */
  static async create(chain, web3) {
    const accounts = Account._readAccountsFromDisk();
    const account = Account._newWeb3Account(web3);
    const encryptedAccount = await Account._encrypt(account, web3);

    accounts[chain] = encryptedAccount;

    Account._writeAccountsToDisk(accounts);
    logger.info(`Created account ${account.address}`);
  }

  /**
   * Returns an unlocked account object. May ask the user for a password on CLI.
   *
   * @param {string} chain 'origin' or 'auxiliary'.
   */
  static async unlock(chain, web3) {
    if (unlockedAccounts[chain]) {
      return unlockedAccounts[chain];
    }

    const accounts = Account._readAccountsFromDisk();
    const account = accounts[chain];

    if (typeof account.address !== 'string') {
      logger.error(`Could not load account for chain ${chain}. Not found in accounts file.`);
      return {};
    }

    const decrypted = await Account._decrypt(account, chain, web3);
    logger.info(`Decrypted account ${decrypted.address}`);

    unlockedAccounts[chain] = decrypted;

    return decrypted;
  }

  /**
   * Reads the accounts form the accounts json and returns them.
   * Returns an empty object if the file does not exist.
   * @private
   * @returns {Object} The current accounts.
   */
  static _readAccountsFromDisk() {
    let accounts;

    if (fs.existsSync(accountsFile)) {
      accounts = JSON.parse(
        fs.readFileSync(accountsFile),
      );
    } else {
      accounts = {};
    }

    return accounts;
  }

  /**
   * Writes the accounts to the accounts json file.
   * @private
   * @param {Object} accounts The object that holds the accounts.
   */
  static _writeAccountsToDisk(accounts) {
    const newFilename = `accounts-backup-${Date.now()}.json`;
    logger.info(`Backing up accounts to ${newFilename}`);
    fs.copyFileSync(accountsFile, path.join(__dirname, `../${newFilename}`));

    logger.info(`Writing encrypted accounts to ${accountsFile}`);
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '  '));
  }

  /**
   * Creates a new account using Web3.
   * @private
   * @returns {Object} A Web3 account object.
   */
  static _newWeb3Account(web3) {
    const account = web3.eth.accounts.create();

    return account;
  }

  /**
   * Encrypts the given account with a password inquired from the command line.
   * @private
   * @param {Object} account A Web3 account object.
   *
   * @returns {Object} A Web3 keyStore object.
   */
  static async _encrypt(account, web3) {
    const { password } = await inquirer.prompt({
      type: 'password',
      name: 'password',
      message: 'Select a password to encrypt the account:',
    });
    await inquirer.prompt({
      type: 'password',
      name: 'password',
      message: 'Repeat the password:',
      validate: input => new Promise(
        (resolve, reject) => {
          if (input === password) {
            resolve(true);
          } else {
            reject(new Error('Passwords don\'t match, please try again. (^C to abort)'));
          }
        },
      ),
    });

    const encrypted = web3.eth.accounts.encrypt(account.privateKey, password);

    return encrypted;
  }

  static async _decrypt(account, name, web3) {
    const { password } = await inquirer.prompt({
      type: 'password',
      name: 'password',
      message: `Input your account password to unlock ${name}:`,
    });

    const decrypted = web3.eth.accounts.decrypt(account, password);

    return decrypted;
  }
}

module.exports = Account;
