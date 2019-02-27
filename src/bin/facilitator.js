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
  .description('An executable to facilitate stake and mint.');


program.command('stake <config> <staker> <amount> <beneficiary>')
  .action(
    async (configPath, staker, amount, beneficiary) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);
      const {
        messageHash,
        unlockSecret,
      } = await facilitator.stake(staker, amount, beneficiary);

      logger.info(`  messageHash ${messageHash}`);
      logger.info(`  unlockSecret ${unlockSecret}`);
      chainConfig.write(configPath);
    },
  );

program.command('progressStake <config> <messageHash>')
  .action(
    async (configPath, messageHash) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);

      await facilitator.progressStake(messageHash);
      chainConfig.write(configPath);
    },
  );

program.command('redeem <config> <redeemer> <amount> <beneficiary>')
  .action(
    async (configPath, redeemer, amount, beneficiary) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);
     await facilitator.redeem(redeemer, amount, beneficiary);

    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('facilitator stake Arguments:');
    console.log('  config        Path to a config file');
    console.log('  direction     It can be stake or redeem ');
    console.log('  staker        Address of staker ');
    console.log('  amount        Amount in wei for stake or redeem ');
    console.log('  beneficiary   Address which will receive tokens after'
        + ' successful stake or redeem ');
    console.log('');
    console.log('facilitator progressStake Arguments:');
    console.log('  config        Path to a config file');
    console.log('  messageHash   Hash to identify stake process');
  },
);

program.parse(process.argv);
