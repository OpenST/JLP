'use strict';

const assert = require('assert');
const interval = require('interval-promise');
const { ContractInteract } = require('@openstfoundation/mosaic.js');

const logger = require('./logger');

class StateRootAnchorService {
  /**
   * @param {number} anchorBlockDelay The number of block to wait before anchoring the state root.
   * @param {Web3} sourceWeb3 Web3 instance pointing to the source chain.
   * @param {Web3} targetWeb3 Web3 instance pointing to the target chain.
   * @param {string} anchorAddress Address of the anchor on target.
   * @param {Object} targetTxOptions Transaction options for anchoring.
   * @param {number} timeout Timeout to wait between checks for a new state root in milliseconds.
   */
  constructor(
    anchorBlockDelay,
    sourceWeb3,
    targetWeb3,
    anchorAddress,
    targetTxOptions,
    timeout,
  ) {
    assert(Number.isInteger(anchorBlockDelay));
    assert(anchorBlockDelay >= 0);
    this.anchorBlockDelay = anchorBlockDelay;

    assert(targetWeb3.utils.isAddress(anchorAddress));
    this.anchorContract = new ContractInteract.Anchor(
      targetWeb3,
      anchorAddress,
    );

    this.source = sourceWeb3;
    this.target = targetWeb3;
    this.targetTxOptions = targetTxOptions;

    this.timeout = timeout;
    this.run = false;
  }

  async getSourceInfo(blockIdentifier) {
    const block = await this.source.eth.getBlock(blockIdentifier);

    return {
      blockNumber: block.number,
      stateRoot: block.stateRoot,
      anchorAddress: this.anchorContract.address,
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
      .on('SIGINT', this.stop.bind(this));

    await interval(async (_, stop) => {
      if (this.run === false) {
        logger.info('Stopped.');
        stop();
      } else {
        await this.commit();
      }
    }, this.timeout);
  }

  stop() {
    if (this.run === false) {
      logger.info('Forcefully shutting down after repeated SIGINT.');
      process.exit(137);
    }

    logger.info('Received SIGINT, shutting down after current anchoring is done. (Repeat to abort immediately.)');
    this.run = false;
  }
}

module.exports = StateRootAnchorService;
