'use strict';

const logger = require('../logger');
const ZeroClientProvider = require('./zero_client_provider');

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

    return engine;
  }

  /**
   * Creates a new engine and adds the required providers.
   *
   * @param {string} chain 'origin' or 'auxiliary'.
   * @param {Object} account An unlocked Web3 account.
   *
   * @returns {ProviderEngine} A running engine.
   */
  static _initEngine(chain, account, chainConfig) {
    const webSocket = Provider._readWebSocket(chain, chainConfig);
    const engine = ZeroClientProvider({
      rpcUrl: webSocket,
      getAccounts: callback => callback(null, [account.address]),
      signTransaction: (tx, cb) => {
        const extractRawTx = (error, response) => {
          cb(error, response.rawTransaction);
        };
        account.signTransaction(tx, extractRawTx);
      },
    });

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
