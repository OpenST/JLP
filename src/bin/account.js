#!/usr/bin/env node

'use strict';

const program = require('commander');

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

      await Account.create(chain);
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
