#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const OpenST = require('@openstfoundation/openst.js');

const connected = require('../connected');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('RegisterRule')
  .arguments('<config> <ruleName> <ruleAddress> <ruleAbi>')
  .description('An executable to register rules in tokenrules.')
  .action(
    async (config, ruleName, ruleAddress, ruleAbi) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          const registerRuleTxOptions = {
            from: connection.auxiliaryAccount.address, // MasterKey is Worker address
            gasPrice: chainConfig.auxiliaryGasPrice,
          };
          const web3 = connection.auxiliaryWeb3;
          const tokenRules = new OpenST.ContractInteract.TokenRules(
            web3,
            chainConfig.openst.tokenRules,
          );
          await tokenRules.registerRule(ruleName, ruleAddress, ruleAbi, registerRuleTxOptions);
          logger.info(`Rule ${ruleName} registered!`);
          logger.info('Validating registered rule...');
          const rule = await tokenRules.getRuleByName(ruleName);
          if (!rule || (rule.ruleAddress !== web3.utils.toChecksumAddress(ruleAddress))) {
            logger.info(`Failure in registration of rule: ${ruleName}.`);
            Promise.reject(new Error(`Failure in registration of rule: ${ruleName}.`));
          } else {
            logger.info(`Rule: ${ruleName} successfully registered.`);
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
      console.log('  config       path to a config file');
      console.log('  ruleName     Rule name to be registered');
      console.log('  ruleAddress  Rule address to be registered');
      console.log('  ruleAbi      Abi of the rule');
      console.log('');
      console.log('Examples:');
      console.log('  Register rule in TokenRules:');
      console.log('  $ registerRule.js config.json ruleName 0xa4aa50fbd4767085705db09e020a781e58e2fbf2 ruleAbi');
    },
  )
  .parse(process.argv);
