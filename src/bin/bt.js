#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const BTDeployer = require('../bt_deployer');
const { version } = require('../../package.json');

program
  .version(version)
  .name('bt')
  .description('An executable to deploy an EIP20 token.');


program.command('setupBrandedToken <config> <symbol> <name> <decimals>'
  + ' <conversionRate> <conversionDecimal>')
  .action(
    async (config, symbol, name, decimal, conversionRate, conversionDecimal) => {
      const chainConfig = new ChainConfig(config);
      const btDeployer = new BTDeployer(chainConfig);
      await btDeployer.deployBrandedToken(
        symbol,
        name,
        decimal,
        parseInt(conversionRate, 10),
        parseInt(conversionDecimal, 10),
      );
      chainConfig.write(config);
    },
  );

program.command('setupUtilityBrandedToken <config>')
  .action(
    async (config) => {
      const chainConfig = new ChainConfig(config);
      const btDeployer = new BTDeployer(chainConfig);
      await btDeployer.deployUtilityBrandedToken();
      chainConfig.write(config);
    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('setupBrandedToken Arguments:');
    console.log('  config       Path to a config file');
    console.log('  symbol       The symbol of the token');
    console.log('  name         The name of the token');
    console.log('  totalSupply  The total supply of the token');
    console.log('  decimals     The number of decimals of the token');
    console.log('');
    console.log('setupUtilityBrandedToken Arguments:');
    console.log('  config       Path to a config file');
    console.log('');
    console.log('Examples:');
    console.log('  Setup JLP branded token with a total supply of 10 mio.:');
    console.log('  $ bt.js setupBrandedToken config.json JLP "Jean-Luc'
      + ' Picard Token" 18 100000'
      + ' 5');
    console.log('');
    console.log('  Setup Utility branded token for JLP');
    console.log('  $ bt.js setupUtilityBrandedToken config.json');
  },
);

program.parse(process.argv);
