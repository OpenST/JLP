#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Deployer = require('../deployer.js');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('bt')
  .description('An executable to deploy and interact with a branded token.')
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Available subcommands:');
      console.log('  deploy    deploy the JLP branded token');
    },
  );

program
  .command('deploy <config> <symbol> <name> <decimals> <conversion-rate> <conversion-rate-decimals>')
  .action(async (configPath, symbol, name, decimals, conversionRate, conversionRateDecimals) => {
    const chainConfig = new ChainConfig(configPath);
    const deployer = new Deployer(chainConfig);

    const {
      organization,
      brandedToken,
    } = await deployer.deployBrandedToken(
      symbol,
      name,
      decimals,
      conversionRate,
      conversionRateDecimals,
    );

    logger.info(`Deployed Branded Token "${symbol}" - ${name} to ${brandedToken.address}`);
    chainConfig.update({
      originBrandedTokenOrganizationAddress: organization.address,
      originBrandedTokenAddress: brandedToken.address,
    });
    chainConfig.write(configPath);
  })
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config                      path to a config file');
      console.log('  symbol                      the token symbol; e.g. JLP');
      console.log('  name                        the token name; e.g. Jean-Luc Picard Token');
      console.log('  decimals                    the token decimals');
      console.log('  conversion-rate             the conversion rate between Branded Token and OST');
      console.log('  conversion-rate-decimals    the decimals of the conversion rate');
    },
  );

program.parse(process.argv);
