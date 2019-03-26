#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const inquirer = require('inquirer');

const Account = require('../account');
const logger = require('../logger');
const { version } = require('../../package.json');

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

      await Account.create(chain, new Web3(), password);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Will backup any existing file. Always stores to accounts.json.');
      console.log('');
      console.log('Arguments:');
      console.log('  chain  \'origin\' or \'auxiliary\'');
    },
  )
  .parse(process.argv);
