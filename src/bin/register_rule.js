#!/usr/bin/env node

'use strict';

const fs = require('fs');
const program = require('commander');
const OpenST = require('@openstfoundation/openst.js');

const connected = require('../connected');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('RegisterRule')
  .arguments('<config> <ruleName> <ruleAddress> <ruleAbiFilePath>')
  .description('An executable to register rules in tokenrules.')
  .action(
    async (config, ruleName, ruleAddress, ruleAbiFilePath) => {
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
          let ruleAbi;
          if (fs.existsSync(ruleAbiFilePath)) {
            ruleAbi = fs.readFileSync(ruleAbiFilePath).toString();
          }
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
      console.log('  config           path to a config file');
      console.log('  ruleName         rule name to be registered');
      console.log('  ruleAddress      rule address to be registered');
      console.log('  ruleAbiFilePath  file path containing abi of the rule');
      console.log('');
      console.log('Examples:');
      console.log('  Register rule in TokenRules:');
      console.log('  $ register_rule.js config.json PricerRule 0xa4aa50fbd4767085705db09e020a781e58e2fbf2 path_to_pricer_rule.abi');
    },
  )
  .parse(process.argv);
