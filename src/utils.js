'use strict';

const Web3 = require('web3');
const Mosaic = require('@openstfoundation/mosaic.js');

class Utils {
  static createMosaic(config) {
    // Create web3 providers for origin and auxiliary chains.
    const originWeb3 = new Web3(config.origin.rpcProvider);
    const auxiliaryWeb3 = new Web3(config.auxiliary.rpcProvider);

    // Create chain objects for origin and auxiliary chains.
    const originChain = new Mosaic.Chain(
      originWeb3,
      config.origin.contractAddresses,
    );
    const auxiliaryChain = new Mosaic.Chain(
      auxiliaryWeb3,
      config.origin.auxiliaryAddresses,
    );

    // Create mosaic object.
    return new Mosaic(originChain, auxiliaryChain);
  }
}

module.exports = Utils;
