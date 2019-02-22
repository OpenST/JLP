'use strict';

const assert = require('assert');
const interval = require('interval-promise');
const Mosaic = require('@openstfoundation/mosaic.js');

/** @todo Move into utils. */
function isObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

class StateRootAnchorService {
  constructor(
    direction,
    anchorBlockDelay,
    mosaic,
  ) {
    if (direction === 'origin') {
      this.source = 'origin';
      this.target = 'auxiliary';
    } else if (direction === 'auxiliary') {
      this.source = 'auxiliary';
      this.target = 'origin';
    } else {
      throw new Error(`Unexpected value (${direction}) for direction. `
        + 'Expected values are: origin, auxiliary.');
    }

    assert(Number.isInteger(anchorBlockDelay));
    assert(anchorBlockDelay > 0);
    this.anchorBlockDelay = anchorBlockDelay;

    assert(isObject(mosaic));
    this.mosaic = mosaic;

    const anchorContractAddress = this.mosaic[this.target].contractAddresses.Anchor;
    assert(this.mosaic[this.target].web3.utils.isAddress(anchorContractAddress));
    this.anchorContractInteract = new Mosaic.ContractInteract.Anchor(
      this.mosaic[this.target].web3, anchorContractAddress,
    );

    this.INTERVAL_TIMEOUT = 1000;

    this.run = false;
  }

  async getAnchorInfo(blockHashOrBlockNumber) {
    const block = await this.mosaic[this.source].web3.eth.getBlock(
      blockHashOrBlockNumber,
    );

    return {
      blockNumber: block.number,
      stateRoot: block.StateRoot,
    };
  }

  async anchor(anchorInfo, txOptions) {
    await this.anchorContractInteract.anchorStateRoot(
      anchorInfo.blockNumber,
      anchorInfo.stateRoot,
      txOptions,
    );
  }

  async getLatestStateRootBlockNumber() {
    return this.anchorContractInteract.getLatestStateRootBlockHeight();
  }

  async commit() {
    const anchorInfo = await this.getAnchorInfo('latest');
    const latestStateRootBlockNumber = await this.getLatestStateRootBlockNumber();

    if (anchorInfo.blockNumber > latestStateRootBlockNumber + this.anchorBlockDelay) {
      await this.anchor(anchorInfo);
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
        console.log('Stopped.');
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

export default StateRootAnchorService;
