#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Deployer = require('../deployer.js');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('TokenRules')
  .arguments('<config> <organization> <eip20Token>')
  .description('An executable to deploy TokenRules.')
  .action(
    async (config, organization, eip20Token) => {
      const chainConfig = new ChainConfig(config);
      const deployer = new Deployer(chainConfig);
      const tokenRulesAddress = await deployer.deployTokenRules(organization, eip20Token);
      logger.info(`Deployed TokenRules address: ${tokenRulesAddress}`);
      chainConfig.update({
        tokenRulesAddress: tokenRulesAddress,
      });
      chainConfig.write(config);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config       path to a config file');
      console.log('  organization Auxiliary chain organization address');
      console.log('  eip20Token   EIP20Token contract address');
      console.log('');
      console.log('Examples:');
      console.log('  Deploys JLP TokenRules:');
      console.log('  $ tokenrules.js config.json 0xa5aa50fbd4767085705db09e020a781e58e2fbf3 0xa4aa50fbd4767085705db09e020a781e58e2fbf2');
    },
  )
  .parse(process.argv);
