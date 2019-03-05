#!/usr/bin/env node

'use strict';

const program = require('commander');

const { ContractInteract: { OSTPrime } } = require('@openstfoundation/mosaic.js');

const ChainConfig = require('../config/chain_config');
const Connection = require('../connection');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('ost')
  .description('An executable to wrap and unwrap ost.');

program.command('wrap <config> <address> <amount>')
  .action(
    async (configPath, address, amount) => {
      const chainConfig = new ChainConfig(configPath);
      const connection = await Connection.open(chainConfig);

      try {
        const ostPrime = new OSTPrime(
          connection.auxiliaryWeb3,
          chainConfig.auxiliaryOSTPrimeAddress,
        );

        const txOptions = {
          from: address,
          value: amount,
        };

        await ostPrime
          .wrap(txOptions)
          .then(
            receipt => logger.info(`Wrapped ${amount} wei for ${address}, txHash: ${receipt.transactionHash}`),
          );
      } catch (error) {
        logger.error(error);
      } finally {
        connection.close();
      }
    },
  );

program.command('unwrap <config> <address> <amount>')
  .action(
    async (configPath, address, amount) => {
      const chainConfig = new ChainConfig(configPath);
      const connection = await Connection.open(chainConfig);

      try {
        const ostPrime = new OSTPrime(
          connection.auxiliaryWeb3,
          chainConfig.auxiliaryOSTPrimeAddress,
        );


        const txOptions = {
          from: address,
        };

        await ostPrime
          .unwrap(amount, txOptions)
          .then(
            receipt => logger.info(`Unwrapped ${amount} wei for ${address}, txHash: ${receipt.transactionHash}`),
          );
      } catch (error) {
        logger.error(error);
      } finally {
        connection.close();
      }
    },
  );

program.on(
  '--help',
  () => {
    console.log('');
    console.log('Arguments:');
    console.log('  direction    wrap or unwrap');
    console.log('  config       path to a config file');
    console.log('  address      address of OST holder');
    console.log('  amount       amount of OST in wei');
  },
);

program.parse(process.argv);
