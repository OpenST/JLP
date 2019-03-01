#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');

const Account = require('../account');
const ChainConfig = require('../config/chain_config');
const logger = require('../logger');
const Provider = require('../provider');

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
        const account = await Account.unlock(chain);
        const provider = Provider.create(chain, account, chainConfig);

        return new Web3(provider);
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
