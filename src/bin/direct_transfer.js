#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const OpenST = require('@openstfoundation/openst.js');

const connected = require('../connected');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('RegisterRule')
  .arguments('<config> <sessionKey> <sender> <beneficiaries> <amounts>')
  .description('An executable to direct transfer from sender to beneficiaries.')
  .action(
    async (config, sessionKey, sender, beneficiaries, amounts) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          const beneficiaryArray = beneficiaries.split(',').map(item => item.trim());
          const amountArray = amounts.split(',').map(item => item.trim());
          const openst = new OpenST(chainConfig, connection);
          await openst.directTransfer(sessionKey, sender, beneficiaryArray, amountArray);
        },
      );
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config         path to a config file.');
      console.log('  sessionKey     Authorized session key.');
      console.log('  sender         Sender address.');
      console.log('  beneficiaries  Array of beneficiaries.');
      console.log('  amounts        Array of amounts.');
      console.log('');
      console.log('Examples:');
      console.log('  direct_transfer.js from sender to receivers');
      console.log('  $ direct_transfer.js config.json sessionKey sender beneficiaries amounts');
    },
  )
  .parse(process.argv);
