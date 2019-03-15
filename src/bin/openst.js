#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const OpenST = require('../openst');
const { version } = require('../../package.json');

program
  .version(version)
  .name('openst')
  .description('An executable to setup OpenST.');

program.command('openst <config> <eip20Token> ')
  .description('An executable to setup OpenST.')
  .action(
    async (config, eip20Token) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          try {
            const openst = new OpenST(chainConfig, connection);
            await openst.setupOpenst(eip20Token);
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
        },
      );
    },
  );

program.command('pricerRule <config> <eip20Token> <baseCurrencyCode> <conversionRate> <conversionRateDecimals> <requiredPriceOracleDecimals>')
  .description('An executable to deploy pricer rule.')
  .action(
    async (
      config,
      eip20Token,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
    ) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          try {
            const openst = new OpenST(chainConfig, connection);
            await openst.deployPricerRule(
              eip20Token,
              baseCurrencyCode,
              conversionRate,
              conversionRateDecimals,
              requiredPriceOracleDecimals,
            );
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
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
    console.log('  eip20Token    EIP20Token contract address');
    console.log('');
    console.log('pricerRule Arguments:');
    console.log('  config                      Path to a config file');
    console.log('  eip20Token                  EIP20Token contract address');
    console.log('  baseCurrencyCode            Economy\'s base currency code');
    console.log('  conversionRate              Conversion rate from the economy base currency to the token.');
    console.log('  conversionRateDecimals      Conversion rate\'s decimals from the economy base currency to the token');
    console.log('  requiredPriceOracleDecimals Required decimals for price oracles');
    console.log('');
    console.log('Examples:');
    console.log('  Deployment of openst contracts:');
    console.log('  $ openst.js config.json eip20Token');
    console.log('');
    console.log('  openst setup for JLP');
    console.log('  $ openst.js openst config.json eip20Token');
    console.log('  Deployment of PricerRule contract:');
    console.log('  $ openst.js pricerRule config.json eip20Token USD 3 3 3');
  },
);

program.parse(process.argv);
