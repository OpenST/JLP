#!/usr/bin/env node

'use strict';

const program = require('commander');

const OpenST = require('../openst');

const connected = require('../connected');
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
          const openst = new OpenST(chainConfig, connection);
          const {
            tokenHolderProxy,
            gnosisSafeProxy,
            recoveryProxy,
          } = await openst.createUserWallet(
            eip20Token,
            owners,
            threshold,
            sessionKeys,
            sessionKeySpendingLimits,
            sessionKeyExpirationHeights,
          );
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
