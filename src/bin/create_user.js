#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const OpenST = require('@openstfoundation/openst.js');

const ChainConfig = require('../config/chain_config');
const logger = require('../logger');
const { version } = require('../../package.json');

const { GnosisSafe } = OpenST.ContractInteract;

program
  .version(version)
  .name('Create Wallet User')
  .arguments('<config> <utilityBrandedTokenAddress> <owners> <threshold> <sessionKeys> <sessionKeySpendingLimits> <sessionKeyExpirationHeights>')
  .description('An executable to register rules in tokenrules.')
  .action(
    async (
      config,
      utilityBrandedTokenAddress,
      owners,
      threshold,
      sessionKeys,
      sessionKeySpendingLimits,
      sessionKeyExpirationHeights
    ) => {
      const chainConfig = new ChainConfig(config);
      const createUserTxOptions = {
        from: chainConfig.auxiliaryMasterKey,
        gasPrice: chainConfig.auxiliaryGasPrice,
      };
      const auxiliaryWeb3 = new Web3(chainConfig.auxiliaryWeb3Provider);
      const userHelper = new OpenST.Helpers.User(
        chainConfig.openst.tokenHolderMasterCopy,
        chainConfig.openst.gnosisSafeMasterCopy,
        chainConfig.openst.recoveryMasterCopy,
        chainConfig.openst.createAndAddModules,
        utilityBrandedTokenAddress,
        chainConfig.openst.tokenRules,
        chainConfig.openst.userWalletFactory,
        chainConfig.openst.proxyFactory,
        auxiliaryWeb3,
      );
      const ownersArray = owners.split(',').map(item => item.trim());
      const sessionKeysArray = sessionKeys.split(',').map(item => item.trim());
      const sessionKeySpendingLimitsArray = sessionKeySpendingLimits.split(',').map(item => item.trim());
      const sessionKeyExpirationHeightsArray = sessionKeyExpirationHeights.split(',').map(item => item.trim());
      const response = await userHelper.createUserWallet(
        ownersArray,
        threshold,
        chainConfig.openst.recoveryOwnerAddress,
        chainConfig.openst.recoveryControllerAddress,
        chainConfig.openst.recoveryBlockDelay,
        sessionKeysArray,
        sessionKeySpendingLimitsArray,
        sessionKeyExpirationHeightsArray,
        createUserTxOptions,
      );
      const { returnValues } = response.events.UserWalletCreated;
      const gnosisSafeProxy = returnValues._gnosisSafeProxy;
      const tokenHolderProxy = returnValues._tokenHolderProxy;
      logger.info('User created!');
      const gnosisSafe = new GnosisSafe(auxiliaryWeb3, gnosisSafeProxy);
      const modules = await gnosisSafe.getModules();
      logger.info(`gnosisSafeProxy: ${gnosisSafeProxy}\n tokenHolderProxy: ${tokenHolderProxy}\n recoveryProxy: ${modules[0]}`);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config                       path to a config file.');
      console.log('  utilityBrandedTokenAddress   UtilityBrandedToken address of an economy.');
      console.log('  owners                       comma separated owners.');
      console.log('  threshold                    gnosis requirement.');
      console.log('  sessionKeys                  comma separated ephemeral keys.');
      console.log('  sessionKeySpendingLimits    comma separated session keys spending limits.');
      console.log('  sessionKeyExpirationHeights  comma separated session keys expiration heights.');
      console.log('');
      console.log('Examples:');
      console.log('  Creating user:');
      console.log('  $ create_user.js config.json utilityBrandedTokenAddress owners threshold sessionKeys sessionKeySpendingLimits sessionKeyExpirationHeights');
    },
  )
  .parse(process.argv);
