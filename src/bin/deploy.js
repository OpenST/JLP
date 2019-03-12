#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const Deployer = require('../deployer.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('deploy')
  .description('An executable to deploy a utility token.')
  .arguments('<config>')
  .action(
    async (configPath) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
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
          } catch (e) {
            console.error('Error while deploying ', e);
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
      console.log('  config     path to a config file');
    },
  )
  .parse(process.argv);
