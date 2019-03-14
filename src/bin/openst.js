#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const OpenST = require('../openst');
const { version } = require('../../package.json');

program
  .version(version)
  .name('bt')
  .arguments('openst <config> <organization> <eip20Token>')
  .description('An executable to setup OpenST.')
  .action(
    async (config, organization, eip20Token) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          const openst = new OpenST(chainConfig, connection);
          await openst.setupOpenst(organization, eip20Token);
          chainConfig.write(config);
        },
      );
    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('openst Arguments:');
    console.log('  config        Path to a config file');
    console.log('  organization  Organization contract address');
    console.log('  eip20Token    EIP20Token contract address');
    console.log('');
    console.log('Examples:');
    console.log('  Deployment of openst contracts:');
    console.log('  $ openst.js config.json organization eip20Token');
    console.log('');
    console.log('  openst setup for JLP');
    console.log('  $ openst.js openst config.json organization eip20Token');
  },
);

program.parse(process.argv);
