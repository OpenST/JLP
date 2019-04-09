#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');
const Mosaic = require('@openst/mosaic.js');

const { ContractInteract } = Mosaic;
const { BN } = Web3.utils;
const connected = require('../connected');
const BTDeployer = require('../bt_deployer');
const BTStakeMint = require('../bt_stake_mint');
const { version } = require('../../package.json');
const Facilitator = require('../facilitator');
const logger = require('../logger');
const StateRootAnchorService = require('../../src/state_root_anchor_service');
const utils = require('../utils.js');


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
            console.error(e);
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
            await btStakeMint.requestStakeWithGatewayComposer(
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
            await btStakeMint.acceptStakeWithGatewayComposer(stakeRequestHash);
            chainConfig.write(config);
          } catch (e) {
            console.error(e);
          }
        });
    },
  );

program.command('continuousStake <config> <originGatewayAddress> '
  + '<totalStakeAmount> <staker> <beneficiary> <gasPrice> <gasLimit> '
  + '<minStakeAmount> <maxStakeAmount>')
  .action(
    async (
      config,
      originGatewayAddress,
      totalStakeAmount,
      staker,
      beneficiary,
      gasPrice,
      gasLimit,
      minStakeAmount,
      maxStakeAmount,
    ) => {
      const totalAmount = new BN(totalStakeAmount);
      if (totalAmount.eqn(0)) {
        logger.error('`totalStakeAmount` must not be zero');
        return;
      }

      const minAmount = new BN(minStakeAmount);
      if (minAmount.isZero()) {
        logger.error('`minStakeAmount` must not be zero');
        return;
      }

      let maxAmount = new BN(maxStakeAmount);
      if (maxAmount.isZero()) {
        maxAmount = minAmount;
      }

      if (maxAmount.gt(totalAmount)) {
        maxAmount = totalAmount;
      }

      if (minAmount.gt(maxAmount)) {
        logger.error('`minStakeAmount` must be less than `maxStakeAmount`');
        return;
      }

      await connected.run(config,
        async (chainConfig, connection) => {
          try {
            const btStakeMint = new BTStakeMint(chainConfig, connection);

            const gateway = new ContractInteract.EIP20Gateway(
              connection.originWeb3,
              originGatewayAddress,
            );

            const bountyAmount = new BN(await gateway.getBounty());
            const baseTokenAddress = await gateway.getBaseToken();
            const valueTokenAddress = await gateway.getValueToken();

            const eip20Token = new ContractInteract.EIP20Token(
              connection.originWeb3,
              chainConfig.eip20TokenAddress,
            );

            const eip20BaseToken = new ContractInteract.EIP20Token(
              connection.originWeb3,
              baseTokenAddress,
            );

            let stakedAmount = new BN(0);

            do {
              let stakeVT = utils.randomNumberBetweenRange(minAmount, maxAmount);

              const eip20TokenBalance = new BN(await eip20Token.balanceOf(staker));
              logger.info(`EIP20 Token balance: ${eip20TokenBalance.toString(10)}`);

              if (eip20TokenBalance.lt(stakeVT)) {
                stakeVT = eip20TokenBalance;
              }

              if (totalAmount.lt(stakedAmount.add(stakeVT))) {
                stakeVT = totalAmount.sub(stakedAmount);
              }

              if (eip20TokenBalance.eqn(0)) {
                logger.info('EIP20 Token balance is zero');
                break;
              }

              if (totalAmount.lte(stakedAmount)) {
                logger.info(`Stake & Mint complete, staked ${totalAmount} tokens.`);
                break;
              }

              logger.info(`Staking: ${stakeVT.toString(10)}`);

              await eip20Token.approve(
                valueTokenAddress,
                stakeVT.toString(10),
                { from: staker },
              );

              const stakeRequestHash = await btStakeMint.requestStake(
                originGatewayAddress,
                stakeVT.toString(10),
                staker,
                beneficiary,
                gasPrice.toString(10),
                gasLimit.toString(10),
              );

              chainConfig.write(config);

              await btStakeMint.acceptStake(stakeRequestHash);
              chainConfig.write(config);

              const baseTokenBalance = new BN(await eip20BaseToken.balanceOf(staker));

              if (baseTokenBalance.lt(bountyAmount)) {
                logger.info(`Base token balance ${baseTokenBalance.toString(10)} is less than the required bounty amount ${bountyAmount.toString(10)}`);
                break;
              }

              await gateway.approveStakeAmount(stakeVT.toString(10), { from: staker });
              await gateway.approveBountyAmount({ from: staker });

              const mosaic = chainConfig.toMosaicFromEIP20Gateway(
                connection,
                originGatewayAddress,
              );

              const facilitator = new Facilitator(
                chainConfig,
                connection,
                mosaic,
              );

              const { messageHash } = await facilitator.stake(
                staker,
                stakeVT.toString(10),
                beneficiary,
              );

              chainConfig.write(config);

              const targetTxOptions = {
                from: connection.auxiliaryAccount.address,
                gasPrice: chainConfig.auxiliaryGasPrice,
              };

              const timeout = 1000;
              const delay = 5;
              const stateRootAnchorService = new StateRootAnchorService(
                Number.parseInt(delay, 10),
                connection.originWeb3,
                connection.auxiliaryWeb3,
                chainConfig.auxiliaryAnchorAddress,
                targetTxOptions,
                timeout,
              );

              const anchorInfo = await stateRootAnchorService.getSourceInfo('latest');
              await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);

              await facilitator.progressStake(messageHash);
              chainConfig.write(config);

              stakedAmount = stakedAmount.add(stakeVT);
            }
            while (true);
          } catch (e) {
            logger.error(e);
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
    console.log('continuousStake Arguments:');
    console.log('  config                Path to a config file');
    console.log('  originGatewayAddress  Origin chain gateway address');
    console.log('  totalStakeAmount      Total tokens to be staked');
    console.log('  staker                Staker address');
    console.log('  beneficiary           Beneficiary address which will receive minted tokens');
    console.log('  gasPrice              Gas price for the request');
    console.log('  gasLimit              Gas limit for the request');
    console.log('  minStakeAmount        Minimum stake amount');
    console.log('  maxStakeAmount        Maximum stake amount');
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
    console.log('');
    console.log('  Request stake');
    console.log('  $ bt.js requestStake config.json 0x542478e47a576Dd359178Dc760E51A2b50da4761 10000 0x595dd34b760b0462bb2043cbe98ded01234d9f85 0 0');
    console.log('');
    console.log('  Accept stake');
    console.log('  $ bt.js acceptStake config.json 0x8c8a68c8dc43c9378e5bb7d997d3e7bd425921c536706be14db4347f0815ddfc');
    console.log('');
    console.log('  Continuous stake');
    console.log('  $ bt.js continuousStake config.json 0x8c8a68c8dc43c9378e5bb7d997d3e7bd425921c536706be14db4347f0815ddfc 1000 0x542478e47a576Dd359178Dc760E51A2b50da4761 0x595dd34b760b0462bb2043cbe98ded01234d9f85 0 0 10 50');
  },
);

program.parse(process.argv);
