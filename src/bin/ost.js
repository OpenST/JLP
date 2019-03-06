#!/usr/bin/env node

'use strict';

const program = require('commander');

const { ContractInteract: { OSTPrime } } = require('@openstfoundation/mosaic.js');

const connected = require('../connected');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('ost')
  .description('An executable to wrap and unwrap ost.');

program.command('wrap <config> <address> <amount>')
  .action(
    async (configPath, address, amount) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
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
        },
      );
    },
  );

program.command('unwrap <config> <address> <amount>')
  .action(
    async (configPath, address, amount) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
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
        },
      );
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
