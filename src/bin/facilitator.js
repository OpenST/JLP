#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Facilitator = require('../facilitator.js');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('facilitator')
  .description('An executable to facilitate stake and mint.')
  .arguments('<config> <direction> <staker> <amount> <beneficiary>')
  .action(
    async (configPath, direction, staker, amount, beneficiary) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);

      if (direction === 'stake') {
        const {
          messageHash,
          unlockSecret,
        } = await facilitator.stake(staker, amount, beneficiary);

        logger.info(`  messageHash ${messageHash}`);
        logger.info(`  unlockSecret ${unlockSecret}`);
      } else {
        logger.error('Type option is incorrectly passed, currently only stake is allowed');
      }
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config        Path to a config file');
      console.log('  direction     It can be stake or redeem ');
      console.log('  staker        Address of staker ');
      console.log('  amount        Amount in wei for stake or redeem ');
      console.log('  beneficiary   Address which will receive tokens after'
        + ' successful stake or redeem ');
    },
  )
  .parse(process.argv);
