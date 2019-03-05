#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Connection = require('../connection');
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
      const connection = await Connection.open(chainConfig);

      try {
        const facilitator = new Facilitator(chainConfig, connection);
        const {
          messageHash,
          unlockSecret,
        } = await facilitator.stake(staker, amount, beneficiary);

        logger.info(`  messageHash ${messageHash}`);
        logger.info(`  unlockSecret ${unlockSecret}`);
        chainConfig.write(configPath);
      } catch (error) {
        logger.error(error);
      } finally {
        connection.close();
      }
    },
  );

program.command('progressStake <config> <messageHash>')
  .action(
    async (configPath, messageHash) => {
      const chainConfig = new ChainConfig(configPath);
      const connection = await Connection.open(chainConfig);

      try {
        const facilitator = new Facilitator(chainConfig, connection);

        await facilitator.progressStake(messageHash);
        chainConfig.write(configPath);
      } catch (error) {
        logger.error(error);
      } finally {
        connection.close();
      }
    },
  );

program.command('redeem <config> <redeemer> <amount> <beneficiary>')
  .action(
    async (configPath, redeemer, amount, beneficiary) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);

      const {
        messageHash,
        unlockSecret,
      } = await facilitator.redeem(redeemer, amount, beneficiary);

      logger.info(`  messageHash ${messageHash}`);
      logger.info(`  unlockSecret ${unlockSecret}`);
      chainConfig.write(configPath);
    },
  );

program.command('progressRedeem <config> <messageHash>')
  .action(
    async (configPath, messageHash) => {
      const chainConfig = new ChainConfig(configPath);
      const facilitator = new Facilitator(chainConfig);

      await facilitator.progressRedeem(messageHash);
    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('facilitator stake Arguments:');
    console.log('  config       path to a config file');
    console.log('  staker       address of staker ');
    console.log('  amount       amount in wei for stake ');
    console.log('  beneficiary  address which will receive tokens after successful stake');
    console.log('');
    console.log('facilitator progressStake Arguments:');
    console.log('  config       path to a config file');
    console.log('  messageHash  hash to identify stake process');

    console.log('');
    console.log('facilitator redeem Arguments:');
    console.log('  config       path to a config file');
    console.log('  redeem       address of redeem ');
    console.log('  amount       amount in wei for redeem ');
    console.log('  beneficiary  address which will receive tokens after successful redeem');
    console.log('');
    console.log('facilitator progressRedeem Arguments:');
    console.log('  config       path to a config file');
    console.log('  messageHash  hash to identify redeem process');
  },
);

program.parse(process.argv);
