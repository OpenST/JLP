#!/usr/bin/env node

'use strict';

const program = require('commander');
const Web3 = require('web3');

const ChainConfig = require('../config/chain_config');
const logger = require('../logger');
const StateRootAnchorService = require('../state_root_anchor_service.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('anchor')
  .arguments('<config> <direction> <delay>')
  .description('An executable to anchor state roots across chains.')
  .action(
    (config, direction, delay) => {
      const chainConfig = new ChainConfig(config);
      let sourceWeb3;
      let targetWeb3;
      let anchorAddress;
      let targetTxOptions;

      if (direction === 'origin') {
        sourceWeb3 = new Web3(chainConfig.auxiliaryWeb3Provider);
        targetWeb3 = new Web3(chainConfig.originWeb3Provider);
        anchorAddress = chainConfig.originAnchorAddress;
        targetTxOptions = {
          from: chainConfig.originMasterKey,
          gasPrice: chainConfig.originGasPrice,
        };
      } else if (direction === 'auxiliary') {
        sourceWeb3 = new Web3(chainConfig.originWeb3Provider);
        targetWeb3 = new Web3(chainConfig.auxiliaryWeb3Provider);
        anchorAddress = chainConfig.auxiliaryAnchorAddress;
        targetTxOptions = {
          from: chainConfig.auxiliaryMasterKey,
          gasPrice: chainConfig.auxiliaryGasPrice,
        };
      } else {
        logger.error('`direction` argument must be one of: "origin", "auxiliary"');
        process.exit(1);
      }

      const stateRootAnchorService = new StateRootAnchorService(
        Number.parseInt(delay, 10),
        sourceWeb3,
        targetWeb3,
        anchorAddress,
        targetTxOptions,
      );

      stateRootAnchorService.start();
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config     path to a config file');
      console.log('  direction  which direction to anchor (target chain; origin or auxiliary)');
      console.log('  delay      number of blocks to wait before anchoring a state root');
    },
  )
  .parse(process.argv);
