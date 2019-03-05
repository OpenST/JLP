#!/usr/bin/env node

'use strict';

const program = require('commander');

const Connection = require('../connection');
const ChainConfig = require('../config/chain_config');
const logger = require('../logger');
const StateRootAnchorService = require('../state_root_anchor_service.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('anchor')
  .arguments('<config> <direction> <delay>')
  .option('-t, --timeout <t>', 'Wait time between checking for new state root in seconds', parseInt)
  .description('An executable to anchor state roots across chains.')
  .action(
    async (config, direction, delay, options) => {
      const chainConfig = new ChainConfig(config);
      const connection = await Connection.open(chainConfig);

      const {
        originWeb3,
        auxiliaryWeb3,
        originAccount,
        auxiliaryAccount,
      } = connection;

      try {
        let sourceWeb3;
        let targetWeb3;
        let anchorAddress;
        let targetTxOptions;

        if (direction === 'origin') {
          sourceWeb3 = auxiliaryWeb3;
          targetWeb3 = originWeb3;
          anchorAddress = chainConfig.originAnchorAddress;
          targetTxOptions = {
            from: originAccount.address,
            gasPrice: chainConfig.originGasPrice,
          };
        } else if (direction === 'auxiliary') {
          sourceWeb3 = originWeb3;
          targetWeb3 = auxiliaryWeb3;
          anchorAddress = chainConfig.auxiliaryAnchorAddress;
          targetTxOptions = {
            from: auxiliaryAccount.address,
            gasPrice: chainConfig.auxiliaryGasPrice,
          };
        } else {
          logger.error('`direction` argument must be one of: "origin", "auxiliary"');
          process.exit(1);
        }

        let timeout;
        if (options.timeout) {
          timeout = options.timeout * 1000;
        } else {
          timeout = 1000;
        }

        const stateRootAnchorService = new StateRootAnchorService(
          Number.parseInt(delay, 10),
          sourceWeb3,
          targetWeb3,
          anchorAddress,
          targetTxOptions,
          timeout,
        );

        await stateRootAnchorService.start();
      } catch (error) {
        logger.error(error);
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
      console.log('  direction  which direction to anchor (target chain; origin or auxiliary)');
      console.log('  delay      number of blocks to wait before anchoring a state root');
    },
  )
  .parse(process.argv);
