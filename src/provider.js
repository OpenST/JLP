'use strict';

const ProviderEngine = require('web3-provider-engine');
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
const WebsocketSubprovider = require('web3-provider-engine/subproviders/websocket.js');

const logger = require('./logger');

class Provider {
  /**
   * Creates a new engine to pass to Web3.
   *
   * @param {string} chain 'origin' or 'auxiliary'.
   * @param {Object} account An unlocked Web3 account.
   * @param {ChainConfig} chainConfig Configuration of the mosaic chains.
   */
  static create(chain, account, chainConfig) {
    const engine = Provider._initEngine(chain, account, chainConfig);

    // Network connectivity error.
    engine.on('error', (err) => {
      logger.error(`Provider: ${err.stack}`);
    });

    engine.start();

    return engine;
  }

  /**
   * Creates a new engine and adds the required providers.
   *
   * @param {string} chain 'origin' or 'auxiliary'.
   * @param {Object} account An unlocked Web3 account.
   */
  static _initEngine(chain, account, chainConfig) {
    const webSocket = Provider._readWebSocket(chain, chainConfig);

    const engine = new ProviderEngine();

    engine.addProvider(
      new HookedWalletSubprovider({
        getAccounts: cb => cb(null, [account.address]),
        signTransaction: (tx, cb) => {
          const myCb = (err, res) => {
            cb(err, res.rawTransaction);
          };
          account.signTransaction(tx, myCb);
        },
      }),
    );
    engine.addProvider(
      new WebsocketSubprovider({
        rpcUrl: webSocket,
      }),
    );

    return engine;
  }

  /**
   * Reads the websocket from the configuration.
   * @private
   * @param {string} chain 'origin' or 'auxiliary'.
   */
  static _readWebSocket(chain, chainConfig) {
    const websocket = chainConfig[`${chain}Web3Provider`];
    if (websocket.substring(0, 5) !== 'ws://') {
      throw new Error(`${chain}Web3Provider in config is not a websocket. Must start with 'ws://'.`);
    }

    return websocket;
  }
}

module.exports = Provider;
