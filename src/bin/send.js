#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const logger = require('../logger');
const { version } = require('../../package.json');

program
  .version(version)
  .name('send')
  .arguments('<config> <chain> <beneficiary> <value>')
  .description('An executable to send base tokens.')
  .action(
    async (config, chain, beneficiary, value) => {
      if (chain !== 'origin' && chain !== 'auxiliary') {
        logger.error(`chain argument must be 'origin' or 'auxiliary', not '${chain}'`);
        process.exit(1);
      }

      await connected.run(
        config,
        async (chainConfig, connection) => {
          if (chain === 'origin') {
            await connection.originWeb3.eth.sendTransaction({
              from: connection.originAccount.address,
              to: beneficiary,
              value,
              gasPrice: chainConfig.originGasPrice,
            }).on('transactionHash', hash => logger.info(`Transaction hash: ${hash}`));
          } else if (chain === 'auxiliary') {
            await connection.auxiliaryWeb3.eth.sendTransaction({
              from: connection.auxiliaryAccount.address,
              to: beneficiary,
              value,
              gasPrice: chainConfig.auxiliaryGasPrice,
            }).on('transactionHash', hash => logger.info(`Transaction hash: ${hash}`));
          }
        },
      );
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config       path to a JLP configuration file');
      console.log('  chain        \'origin\' or \'auxiliary\'');
      console.log('  beneficiary  the address of the recipient of the token transfer');
      console.log('  value        the amount of base tokens to send');
    },
  )
  .parse(process.argv);
