#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const logger = require('../logger');
const { version } = require('../../package.json');

program
  .version(version)
  .name('balance')
  .arguments('<config> <chain>')
  .description('An executable to get the balance of an account.')
  .action(
    async (config, chain) => {
      if (chain !== 'origin' && chain !== 'auxiliary') {
        logger.error(`chain argument must be 'origin' or 'auxiliary', not '${chain}'`);
        process.exit(1);
      }

      await connected.run(
        config,
        async (_, connection) => {
          if (chain === 'origin') {
            await connection.originWeb3.eth.getBalance(
              connection.originAccount.address,
              'latest',
            ).then(balance => logger.info(`Balance: ${balance}`));
          } else if (chain === 'auxiliary') {
            await connection.auxiliaryWeb3.eth.getBalance(
              connection.auxiliaryAccount.address,
              'latest',
            ).then(balance => logger.info(`Balance: ${balance}`));
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
      console.log('  config  path to a JLP configuration file');
      console.log('  chain   \'origin\' or \'auxiliary\'');
    },
  )
  .parse(process.argv);
