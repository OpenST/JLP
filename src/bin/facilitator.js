#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const Mosaic = require('@openst/mosaic.js');

const { ContractInteract } = Mosaic;

const connected = require('../connected');
const Facilitator = require('../facilitator.js');
const StateRootAnchorService = require('../state_root_anchor_service.js');
const logger = require('../logger');

const { version } = require('../../package.json');

const { BN } = Web3.utils;

program
  .version(version)
  .name('facilitator')
  .description('An executable to facilitate stake and mint.');


program.command('stake <config> <staker> <amount> <beneficiary>')
  .action(
    async (configPath, staker, amount, beneficiary) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
          try {
            const mosaic = chainConfig.toMosaic(connection);
            const facilitator = new Facilitator(chainConfig, connection, mosaic);
            const {
              messageHash,
              unlockSecret,
            } = await facilitator.stake(staker, amount, beneficiary);

            logger.info(`  messageHash ${messageHash}`);
            logger.info(`  unlockSecret ${unlockSecret}`);
            chainConfig.write(configPath);
          } catch (e) {
            console.error('Error in stake ', e);
          }
        },
      );
    },
  );

program.command('progressStake <config> <messageHash>')
  .action(
    async (configPath, messageHash) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
          try {
            const mosaic = chainConfig.toMosaicFromMessageHash(connection, messageHash);
            const facilitator = new Facilitator(chainConfig, connection, mosaic);

            await facilitator.progressStake(messageHash);
            chainConfig.write(configPath);
          } catch (e) {
            console.error('Error in progress stake ', e);
          }
        },
      );
    },
  );

program.command('redeem <config> <redeemer> <amount> <beneficiary>')
  .action(
    async (configPath, redeemer, amount, beneficiary) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
          try {
            const mosaic = chainConfig.toMosaic(connection);
            const facilitator = new Facilitator(chainConfig, connection, mosaic);
            const {
              messageHash,
              unlockSecret,
            } = await facilitator.redeem(redeemer, amount, beneficiary);

            logger.info(`  messageHash ${messageHash}`);
            logger.info(`  unlockSecret ${unlockSecret}`);
            chainConfig.write(configPath);
          } catch (e) {
            console.log('exception in redeem  ', e);
          }
        },
      );
    },
  );

program.command('progressRedeem <config> <messageHash>')
  .action(
    async (configPath, messageHash) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
          try {
            const mosaic = chainConfig.toMosaic(connection);
            const facilitator = new Facilitator(chainConfig, connection, mosaic);

            await facilitator.progressRedeem(messageHash);
          } catch (e) {
            console.log('error in progress redeem ', e);
          }
        },
      );
    },
  );

program.command('continuousRedeem <config>'
  + ' <utilityTokenAddress> <totalRedeemAmount> <redeemer> <beneficiary>'
  + ' <gasPrice> <gasLimit> <minRedeemAmount> <maxRedeemAmount>')
  .action(
    async (
      configPath,
      utilityTokenAddress,
      totalRedeemAmount,
      redeemer,
      beneficiary,
      gasPrice,
      gasLimit,
      minRedeemAmount,
      maxRedeemAmount,
    ) => {
      await connected.run(
        configPath,
        async (chainConfig, connection) => {
          try {
            const utilityToken = new ContractInteract.EIP20Token(
              connection.auxiliaryWeb3,
              utilityTokenAddress,
            );
            const mosaic = mosaicInstance(connection, chainConfig, utilityTokenAddress);
            const facilitator = new Facilitator(chainConfig, connection, mosaic);
            let currentBalance = new BN((await utilityToken.balanceOf(redeemer)));

            if (currentBalance.gt(new BN(totalRedeemAmount))) {
              let amount = randomNumberBetweenRange(
                parseInt(minRedeemAmount, 10),
                parseInt(maxRedeemAmount, 10),
              );
              let amountRedeemed = amount;
              while (amountRedeemed.lten(totalRedeemAmount)) {
                const { messageHash } = await facilitator.redeem(
                  redeemer,
                  amount.toString(10),
                  beneficiary,
                );
                chainConfig.write(configPath);
                console.log('message hash  ', messageHash);

                await anchorAuxiliaryStateRoot(connection, chainConfig);
                await facilitator.progressRedeem(messageHash);
                chainConfig.write(configPath);
                currentBalance = currentBalance.sub(amount);
                amount = randomNumberBetweenRange(
                  parseInt(minRedeemAmount, 10),
                  parseInt(maxRedeemAmount, 10),
                );
                amountRedeemed = amountRedeemed.add(amount);

              }
            }
          } catch (e) {
            console.log('Exception in continuous redeem ', e);
          }
        },
      );
    },
  );
program.on(
  '--help',
  () => {
    console.log('');
    console.log('facilitator stake Arguments:');
    console.log('  config       path to a config file');
    console.log('  staker       address of staker ');
    console.log('  amount       amount in wei for stake ');
    console.log('  beneficiary  address which will receive tokens after successful stake');
    console.log('');
    console.log('facilitator progressStake Arguments:');
    console.log('  config       path to a config file');
    console.log('  messageHash  hash to identify stake process');

    console.log('');
    console.log('facilitator redeem Arguments:');
    console.log('  config       path to a config file');
    console.log('  redeem       address of redeem ');
    console.log('  amount       amount in wei for redeem ');
    console.log('  beneficiary  address which will receive tokens after successful redeem');
    console.log('');
    console.log('facilitator progressRedeem Arguments:');
    console.log('  config       path to a config file');
    console.log('  messageHash  hash to identify redeem process');
  },
);

program.parse(process.argv);

function randomNumberBetweenRange(maxRedeemAmount, minRedeemAmount) {
  const range = maxRedeemAmount - minRedeemAmount;
  return new BN(Math.floor(Math.random() * range) + minRedeemAmount);
}

function mosaicInstance(connection, chainConfig, utilityTokenAddress) {
  const utilityTokenConfig = chainConfig.utilityBrandedTokens.find(
    ut => ut.address === utilityTokenAddress,
  );

  const originChain = new Mosaic.Chain(
    connection.originWeb3,
    {
      Organization: chainConfig.brandedToken.originOrganization,
      EIP20Gateway: utilityTokenConfig.originGatewayAddress,
      Anchor: chainConfig.originAnchorAddress,
      EIP20Token: chainConfig.eip20TokenAddress,
    },
  );
  const auxiliaryChain = new Mosaic.Chain(
    connection.auxiliaryWeb3,
    {
      Organization: utilityTokenConfig.organizationAddress,
      EIP20CoGateway: utilityTokenConfig.auxiliaryCoGatewayAddress,
      Anchor: chainConfig.auxiliaryAnchorAddress,
      UtilityToken: utilityTokenAddress,
    },
  );

  return new Mosaic(originChain, auxiliaryChain);
}

async function anchorAuxiliaryStateRoot(connection, chainConfig) {
  const targetTxOptions = {
    from: connection.originAccount.address,
    gasPrice: chainConfig.originGasPrice,
  };

  const timeout = 1000;
  const delay = 0;
  const stateRootAnchorService = new StateRootAnchorService(
    Number.parseInt(delay, 10),
    connection.auxiliaryWeb3,
    connection.originWeb3,
    chainConfig.originAnchorAddress,
    targetTxOptions,
    timeout,
  );

  const anchorInfo = await stateRootAnchorService.getSourceInfo('latest');
  await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);
}
