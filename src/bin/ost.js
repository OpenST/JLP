#!/usr/bin/env node

'use strict';

const program = require('commander');

const { ContractInteract: { OSTPrime } } = require('@openstfoundation/mosaic.js');

const ChainConfig = require('../config/chain_config');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('ost')
  .description('An executable to wrap and unwrap ost.');

program.command('wrap <config> <address> <amount>')
  .action(
    async(configPath, address, amount) => {
      const chainConfig = new ChainConfig(configPath);
      const mosaic = chainConfig.toMosaic();
      const ostPrime = new OSTPrime(mosaic.auxiliary.web3, mosaic.auxiliary.contractAddresses.UtilityToken);

      const txOptions = {
        from: address,
        value: amount,
      };

    ostPrime
      .wrap(txOptions)
      .then(receipt => {
        logger.info(`Wrapped ${amount} of OSTPrime`, receipt.transactionHash);
        }
      )
    }
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config       path to a config file');
      console.log('  address      address of OST holder');
      console.log('  amount       the amount of OST');
    },
  ).parse(process.argv);