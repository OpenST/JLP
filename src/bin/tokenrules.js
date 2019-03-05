#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const OpenSTDeployer = require('../openst_deployer.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('TokenRules')
  .arguments('<config> <organization> <eip20Token>')
  .description('An executable to deploy TokenRules.')
  .action(
    async (config, organization, eip20Token) => {
      const chainConfig = new ChainConfig(config);
      const openstDeployer = new OpenSTDeployer(chainConfig);
      const tokenRulesAddress = await openstDeployer.deployTokenRules(organization, eip20Token);
      chainConfig.update({
        tokenRulesAddress,
      });
      chainConfig.write(config);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config        path to a config file');
      console.log('  organization  Auxiliary chain organization address');
      console.log('  eip20Token    eip20token contract address');
      console.log('');
      console.log('Examples:');
      console.log('  Deploys JLP TokenRules:');
      console.log('  $ tokenrules.js config.json organization eip20token');
    },
  )
  .parse(process.argv);
