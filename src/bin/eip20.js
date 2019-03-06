#!/usr/bin/env node

'use strict';

const program = require('commander');

const connected = require('../connected');
const EIP20Token = require('../../contracts/EIP20Token');
const logger = require('../logger');

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
          const {
            originWeb3,
            originAccount,
          } = connection;
          const txOptions = {
            gasPrice: chainConfig.originGasPrice,
            from: originAccount.address,
          };
          const contract = new originWeb3.eth.Contract(EIP20Token.abi, undefined, txOptions);

          await contract
            .deploy(
              {
                data: EIP20Token.bin,
                arguments: [
                  symbol,
                  name,
                  totalSupply,
                  decimals,
                ],
              },
              txOptions,
            )
            .send(txOptions)
            .on('receipt', (receipt) => {
              logger.info(`Deployed EIP20 token "${symbol}" to ${receipt.contractAddress}`);

              chainConfig.update({
                eip20TokenAddress: receipt.contractAddress,
              });
              chainConfig.write(config);
            })
            .on('error', (error) => {
              logger.error(`Could not deploy EIP20Token: ${error}`);
              process.exit(1);
            });
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
