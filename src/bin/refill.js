#!/usr/bin/env node

'use strict';

const program = require('commander');

const ChainConfig = require('../config/chain_config');
const Connection = require('../connection');
const logger = require('../logger');

const { version } = require('../../package.json');

program
  .version(version)
  .name('refill')
  .description('An executable to create funded addresses and refill funding of existing addresses.')
  .arguments('<config>')
  .action(
    async (configPath) => {
      const chainConfig = new ChainConfig(configPath);

      const chainWeb3 = async (chain) => {
        const {
          originWeb3,
          auxiliaryWeb3,
        } = await Connection.init(chainConfig);

        if (chain === 'origin') {
          return originWeb3;
        }

        return auxiliaryWeb3;
      };

      const ensureAccount = async (accountName, chain) => {
        if (!chainConfig[accountName]) {
          const web3 = await chainWeb3(chain);

          const address = await web3.eth.personal.newAccount(chainConfig.password);
          chainConfig[accountName] = address;
          logger.info(`Added ${accountName} address to RPC on ${chain}: ${address}`);
        }
      };

      const ensureFunding = async (chain, sourceAddress, targetAddress) => {
        const maxBalance = '1000000000000000000';

        const web3 = await chainWeb3(chain);
        const currentBalance = await web3.eth.getBalance(targetAddress);
        if (currentBalance < maxBalance) {
          const transferBalance = maxBalance - currentBalance;
          const txHash = await web3.eth.sendTransaction({
            from: sourceAddress,
            to: targetAddress,
            value: transferBalance,
          });
          logger.info(`Sending ${transferBalance} to ${targetAddress}. TxHash: ${txHash.transactionHash}`);
        }
      };

      await ensureAccount('originDeployerAddress', 'origin');
      await ensureFunding('origin', chainConfig.originMasterKey, chainConfig.originDeployerAddress);

      await ensureAccount('auxiliaryDeployerAddress', 'auxiliary');
      await ensureFunding('auxiliary', chainConfig.auxiliaryMasterKey, chainConfig.auxiliaryDeployerAddress);

      chainConfig.write(configPath);
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
