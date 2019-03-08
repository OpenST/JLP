#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const OpenST = require('@openstfoundation/openst.js');

const ChainConfig = require('../config/chain_config');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('RegisterRule')
  .arguments('<config> <owners> <threshold> <sessionKeys> <sessionKeysSpendingLimits> <sessionKeyExpirationHeights>')
  .description('An executable to register rules in tokenrules.')
  .action(
    async (config, owners, threshold, sessionKeys, sessionKeysSpendingLimits, sessionKeyExpirationHeights) => {
      const chainConfig = new ChainConfig(config);
      const createUserTxOptions = {
        from: chainConfig.auxiliaryMasterKey,
        gasPrice: chainConfig.auxiliaryGasPrice,
      };
      const auxiliaryWeb3 = new Web3(chainConfig.auxiliaryWeb3Provider);
      const userWalletFactory = new OpenST.ContractInteract.UserWalletFactory(
        auxiliaryWeb3,
        chainConfig.openst.userWalletFactory,
      );
      await userWalletFactory.createUserWallet(
        owners,
        threshold,
        sessionKeys,
        sessionKeysSpendingLimits,
        sessionKeyExpirationHeights,
        createUserTxOptions,
      );
      logger.info("User created!");
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config                       path to a config file.');
      console.log('  owners                       comma separated owners.');
      console.log('  threshold                    gnosis requirement.');
      console.log('  sessionKeys                  comma separated ephemeral keys.');
      console.log('  sessionKeysSpendingLimits    comma separated session keys spending limits.');
      console.log('  sessionKeyExpirationHeights  comma separated session keys expiration heights.');
      console.log('');
      console.log('Examples:');
      console.log('  Creating user:');
      console.log('  $ create_user.js config.json owners threshold sessionKeys sessionKeysSpendingLimits sessionKeyExpirationHeights');
    },
  )
  .parse(process.argv);
