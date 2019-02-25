#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Deployer = require('../deployer.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('facilitator')
  .description('An executable to facilitate stake and mint.')
  .arguments('<config><type><amount><beneficiary>')
  .action(
    async (configPath, type, amount, beneficiary) => {
      const chainConfig = new ChainConfig(configPath);
      // const facilitator = new Facilitator(chainConfig);
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config        Path to a config file');
      console.log('  type          It can be stake or redeem ');
      console.log('  amount        Amount in wei for stake or redeem ');
      console.log('  beneficiary   Address which will receive tokens after'
        + ' successful stake or redeem ');
    },
  )
  .parse(process.argv);
