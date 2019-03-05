#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Connection = require('../connection');
const Deployer = require('../deployer.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('deploy')
  .description('An executable to deploy a utility token.')
  .arguments('<config>')
  .action(
    async (configPath) => {
      const chainConfig = new ChainConfig(configPath);
      const connection = await Connection.open(chainConfig);

      try {
        const deployer = new Deployer(chainConfig, connection);
        const contractInstances = await deployer.deployUtilityToken();
        chainConfig.update({
          originOrganizationAddress: contractInstances.originOrganization.address,
          auxiliaryOrganizationAddress: contractInstances.auxiliaryOrganization.address,
          originAnchorAddress: contractInstances.originAnchor.address,
          auxiliaryAnchorAddress: contractInstances.auxiliaryAnchor.address,
          originGatewayAddress: contractInstances.originGateway.address,
          auxiliaryCoGatewayAddress: contractInstances.auxiliaryCoGateway.address,
          auxiliaryUtilityTokenAddress: contractInstances.auxiliaryUtilityToken.address,
        });
        chainConfig.write(configPath);
      } catch (error) {
        console.log(error);
      } finally {
        connection.close();
      }
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config     path to a config file');
    },
  )
  .parse(process.argv);
