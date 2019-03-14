#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const BTDeployer = require('../bt_deployer');
const BTStakeMint = require('../bt_stake_mint');
const { version } = require('../../package.json');

program
  .version(version)
  .name('bt')
  .description('An executable to deploy an EIP20 token.');

program.command('setupBrandedToken <config> <symbol> <name> <decimals>'
  + ' <conversionRate> <conversionDecimal>')
  .action(
    async (config, symbol, name, decimal, conversionRate, conversionDecimal) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          const btDeployer = new BTDeployer(chainConfig, connection);
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
    },
  );

program.command('setupUtilityBrandedToken <config>')
  .action(
    async (config) => {
      await connected.run(
        config,
        async (chainConfig, connection) => {
          try {
            const btDeployer = new BTDeployer(chainConfig, connection);
            await btDeployer.deployUtilityBrandedToken();
            chainConfig.write(config);
          } catch (e) {
            console.log(e);
          }
        },
      );
    },
  );

program.command('gatewayComposer <config> ')
  .action(
    async (config) => {
      await connected.run(config,
        async (chainConfig, connection) => {
          try {
            const btDeployer = new BTDeployer(chainConfig, connection);
            await btDeployer.deployGatewayComposer();
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
        });
    },
  );

program.command('requestStake <config> <originGatewayAddress> <stakeVT> <beneficiary> <gasPrice> <gasLimit>')
  .action(
    async (config, originGatewayAddress, stakeVT, beneficiary, gasPrice, gasLimit) => {
      await connected.run(config,
        async (chainConfig, connection) => {
          try {
            const btStakeMint = new BTStakeMint(chainConfig, connection);
            await btStakeMint.requestStake(
              originGatewayAddress,
              stakeVT,
              beneficiary,
              gasPrice,
              gasLimit,
            );
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
        });
    },
  );

program.command('acceptStake <config> <stakeRequestHash> ')
  .action(
    async (config, stakeRequestHash) => {
      await connected.run(config,
        async (chainConfig, connection) => {
          try {
            const btStakeMint = new BTStakeMint(chainConfig, connection);
            await btStakeMint.acceptStake(stakeRequestHash);
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
        });
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
    console.log('gatewayComposer Arguments:');
    console.log('  config                Path to a config file');
    console.log('');
    console.log('requestStake Arguments:');
    console.log('  config       Path to a config file');
    console.log('  originGatewayAddress  Origin chain gateway address');
    console.log('  stakeVT               Value tokens to be staked');
    console.log('  beneficiary           Beneficiary address which will receive minted tokens');
    console.log('  gasPrice              Gas price for the request');
    console.log('  gasLimit              Gas limit for the request');
    console.log('');
    console.log('acceptStake Arguments:');
    console.log('  config            Path to a config file');
    console.log('  stakeRequestHash  Hash received from requestStake process');
    console.log('');
    console.log('Examples:');
    console.log('  Setup JLP branded token with a total supply of 10 mio.:');
    console.log('  $ bt.js setupBrandedToken config.json JLP "Jean-Luc'
      + ' Picard Token" 18 100000'
      + ' 5');
    console.log('');
    console.log('  Setup Utility branded token for JLP');
    console.log('  $ bt.js setupUtilityBrandedToken config.json');
    console.log('');
    console.log('  Deploy gateway composer');
    console.log('  $ bt.js setupUtilityBrandedToken config.json');
    console.log('  Request stake');
    console.log('  $ bt.js requestStake config.json 0x542478e47a576Dd359178Dc760E51A2b50da4761 10000 0x595dd34b760b0462bb2043cbe98ded01234d9f85 0 0');
    console.log('  Accept stake');
    console.log('  $ bt.js acceptStake config.json 0x8c8a68c8dc43c9378e5bb7d997d3e7bd425921c536706be14db4347f0815ddfc');
  },
);

program.parse(process.argv);
