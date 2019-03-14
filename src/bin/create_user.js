#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const { GnosisSafe, Helpers } = require('@openstfoundation/openst.js');

const connected = require('../connected');
const logger = require('../logger');
const { version } = require('../../package.json');

program
  .version(version)
  .name('Create Wallet User')
  .arguments('<config> <eip20Token> <owners> <threshold> <sessionKeys> <sessionKeySpendingLimits> <sessionKeyExpirationHeights>')
  .description('An executable to register rules in tokenrules.')
  .action(
    async (
      config,
      eip20Token,
      owners,
      threshold,
      sessionKeys,
      sessionKeySpendingLimits,
      sessionKeyExpirationHeights,
    ) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          const createUserTxOptions = {
            from: connection.auxiliaryAccount.address,
            gasPrice: chainConfig.auxiliaryGasPrice,
          };
          const web3 = connection.auxiliaryWeb3;
          const userHelper = new Helpers.User(
            chainConfig.openst.tokenHolderMasterCopy,
            chainConfig.openst.gnosisSafeMasterCopy,
            chainConfig.openst.recoveryMasterCopy,
            chainConfig.openst.createAndAddModules,
            eip20Token,
            chainConfig.openst.tokenRules,
            chainConfig.openst.userWalletFactory,
            chainConfig.openst.proxyFactory,
            web3,
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
          const gnosisSafe = new GnosisSafe(web3, gnosisSafeProxy);
          const modules = await gnosisSafe.getModules();
          const recoveryProxy = modules[0];
          logger.info(`gnosisSafeProxy: ${gnosisSafeProxy}\n tokenHolderProxy: ${tokenHolderProxy}\n recoveryProxy: ${recoveryProxy}`);
          const user = {
            gnosisSafeProxy,
            tokenHolderProxy,
            recoveryProxy,
          };
          chainConfig.users.push(user);
          chainConfig.write(config);
        },
      );
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config                       path to a config file.');
      console.log('  eip20Token                   EIP20Token address of an economy.');
      console.log('  owners                       comma separated owners.');
      console.log('  threshold                    gnosis requirement.');
      console.log('  sessionKeys                  comma separated session keys.');
      console.log('  sessionKeySpendingLimits     comma separated session keys spending limits.');
      console.log('  sessionKeyExpirationHeights  comma separated session keys expiration heights.');
      console.log('');
      console.log('Examples:');
      console.log('  Creating user:');
      console.log('  $ create_user.js config.json eip20Token owners threshold sessionKeys sessionKeySpendingLimits sessionKeyExpirationHeights');
    },
  )
  .parse(process.argv);
