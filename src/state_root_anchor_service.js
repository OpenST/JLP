'use strict';

const assert = require('assert');
const interval = require('interval-promise');
const { ContractInteract } = require('@openstfoundation/mosaic.js');

const logger = require('./logger');

class StateRootAnchorService {
  /**
   * @param {number} anchorBlockDelay The number of block to wait before anchoring.
   * @param {ChainConfig} config A configuration instance.
   */
  constructor(
    anchorBlockDelay,
    sourceWeb3,
    targetWeb3,
    anchorAddress,
    targetTxOptions,
  ) {
    assert(Number.isInteger(anchorBlockDelay));
    assert(anchorBlockDelay >= 0);
    this.anchorBlockDelay = anchorBlockDelay;

    assert(targetWeb3.utils.isAddress(anchorAddress));
    this.anchorContract = new ContractInteract.Anchor(
      targetWeb3, anchorAddress,
    );

    this.source = sourceWeb3;
    this.target = targetWeb3;
    this.targetTxOptions = targetTxOptions;

    this.INTERVAL_TIMEOUT = 1000;
    this.run = false;
  }

  async getSourceInfo(blockIdentifier) {
    const block = await this.source.eth.getBlock(blockIdentifier);

    return {
      blockNumber: block.number,
      stateRoot: block.stateRoot,
    };
  }

  async anchor(anchorInfo, txOptions) {
    logger.info('anchoring state root', anchorInfo);
    try {
      await this.anchorContract.anchorStateRoot(
        anchorInfo.blockNumber.toString(),
        anchorInfo.stateRoot,
        txOptions,
      );
      logger.info('anchored state root', anchorInfo);
    } catch (error) {
      logger.error('could not anchor state root', { error: error.toString() });
    }
  }

  async getLatestAnchoredBlockNumber() {
    const blockNumber = await this.anchorContract
      .contract
      .methods
      .getLatestStateRootBlockHeight()
      .call();
    return Number.parseInt(
      blockNumber,
      10,
    );
  }

  async commit() {
    const latestSourceInfo = await this.getSourceInfo('latest');
    const latestAnchoredBlockNumber = await this.getLatestAnchoredBlockNumber();

    if (latestSourceInfo.blockNumber > latestAnchoredBlockNumber + this.anchorBlockDelay) {
      const delayedSourceBlockNumber = latestSourceInfo.blockNumber - this.anchorBlockDelay;
      const delayedSourceInfo = await this.getSourceInfo(delayedSourceBlockNumber.toString());

      await this.anchor(delayedSourceInfo, this.targetTxOptions);
    }
  }

  async start() {
    this.run = true;

    process
      .on('SIGTERM', this.stop)
      .on('SIGINT', this.stop)
      .on('SIGQUIT', this.stop);

    interval(async (_, stop) => {
      if (this.run === false) {
        stop();
        logger.info('Stopped.');
      }
      await this.commit();
    }, this.INTERVAL_TIMEOUT, { stopOnError: true });
  }

  stop() {
    this.run = false;

    process.removeListener('SIGTERM', this.stop);
    process.removeListener('SIGINT', this.stop);
    process.removeListener('SIGQUIT', this.stop);
  }
}

module.exports = StateRootAnchorService;
