#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const OpenSTDeployer = require('../openst_deployer');
const { version } = require('../../package.json');

program
  .version(version)
  .name('bt')
  .arguments('openst <config>')
  .description('An executable to setup OpenST.')
  .action(
    async (config) => {
      const chainConfig = new ChainConfig(config);
      const openstDeployer = new OpenSTDeployer(chainConfig);
      await openstDeployer.setupOpenst();
      chainConfig.write(config);
    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('openst Arguments:');
    console.log('  config  Path to a config file');
    console.log('');
    console.log('Examples:');
    console.log('  Deployment of openst contracts:');
    console.log('  $ openst.js config.json');
    console.log('');
    console.log('  openst setup for JLP');
    console.log('  $ openst.js openst config.json');
  },
);

program.parse(process.argv);
