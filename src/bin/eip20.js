#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const logger = require('../logger');
const EIP20 = require('./../eip20');

const { version } = require('../../package.json');

program
  .version(version)
  .name('eip20')
  .arguments('<config> <symbol> <name> <totalSupply> <decimals>')
  .description('An executable to deploy an EIP20 token.')
  .action(
    async (config, symbol, name, totalSupply, decimals) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          try {
            const eip20 = new EIP20(chainConfig, symbol, name, totalSupply, decimals);
            await eip20.deployEIP20(connection);
            chainConfig.write(config);
          } catch (e) {
            logger.error(e.message);
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
      console.log('  symbol       the symbol of the token');
      console.log('  name         the name of the token');
      console.log('  totalSupply  the total supply of the token');
      console.log('  decimals     the number of decimals of the token');
      console.log('');
      console.log('Examples:');
      console.log('  Deploys JLP token with a total supply of 10 mio.:');
      console.log('  $ eip20.js config.json JLP "Jean-Luc Picard Token" 10000000000000000000000000 18');
    },
  )
  .parse(process.argv);
