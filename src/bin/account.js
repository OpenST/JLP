#!/usr/bin/env node

'use strict';

const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const program = require('commander');
const Web3 = require('web3');

const logger = require('../logger');

const { version } = require('../../package.json');

const accountsFile = path.join(__dirname, '../../accounts.json');

/**
 * Reads the accounts form the accounts json and returns them.
 * Returns an empty object if the file does not exist.
 *
 * @returns {Object} The current accounts.
 */
const readAccounts = () => {
  let accounts;

  if (fs.existsSync(accountsFile)) {
    accounts = JSON.parse(
      fs.readFileSync(accountsFile),
    );

    const newFilename = `accounts-backup-${Date.now()}.json`;
    logger.info(`Backing up accounts to ${newFilename}`);
    fs.copyFileSync(accountsFile, path.join(__dirname, newFilename));
  } else {
    accounts = {};
  }

  return accounts;
};

/**
 * Creates a new account using Web3.
 *
 * @returns {Object} A Web3 account object.
 */
const newAccount = () => {
  const web3 = new Web3();
  const account = web3.eth.accounts.create();

  return account;
};

/**
 * Encrypts the given account with a password inquired from the command line.
 *
 * @param {Object} account A Web3 account object.
 *
 * @returns {Object} A Web3 keyStore object.
 */
const encryptAccount = async (account) => {
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

  const web3 = new Web3();
  const encrypted = web3.eth.accounts.encrypt(account.privateKey, password);

  return encrypted;
};

/**
 * Writes the accounts to the accounts json file.
 *
 * @param {Object} accounts The object that holds the accounts.
 */
const writeAccounts = (accounts) => {
  logger.info(`Writing encrypted accounts to ${accountsFile}`);
  fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, '  '));
};

program
  .version(version)
  .name('account')
  .arguments('<chain>')
  .description('An executable to create new accounts.')
  .action(
    async (chain) => {
      if (chain !== 'origin' && chain !== 'auxiliary') {
        logger.error(`chain argument must be 'origin' or 'auxiliary', not '${chain}'`);
        process.exit(1);
      }

      const accounts = readAccounts();
      const account = newAccount();
      const encryptedAccount = await encryptAccount(account);

      accounts[chain] = encryptedAccount;

      writeAccounts(accounts);
      logger.info(`Created account ${account.address}`);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Will backup any existing file. Always stores to accounts.json.');
      console.log('');
      console.log('Arguments:');
      console.log('  chain     \'origin\' or \'auxiliary\'');
    },
  )
  .parse(process.argv);
