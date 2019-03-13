'use strict';

const { assert } = require('chai');

const ChainConfig = require('../src/config/chain_config');
const Connection = require('../src/connection');

const { CONFIG_FILE_PATH } = require('./constants');

/**
 * Run a function with a connection to nodes.
 *
 * Should be used in tests to access connection and configuration.
 *
 * Example:
 * describe('Anchor', async () => {
 *   it('deploys anchors', async () => {
 *     await connected.run(
 *       async (connection) => {
 *         const deployer = new Deployer(connection.chainConfig, connection);
 *         const [originAnchor, auxiliaryAnchor] = await deployer.deployAnchors();
 *
 *         connection.chainConfig.update({
 *           originAnchorAddress: originAnchor.address,
 *           auxiliaryAnchorAddress: auxiliaryAnchor.address,
 *         });
 *       },
 *     );
 *   });
 * });
 *
 * @param {function} execute The callback that will be executed once the connection is established.
 */
const run = async (execute) => {
  let connection = null;

  try {
    const chainConfig = new ChainConfig(CONFIG_FILE_PATH);
    connection = await Connection.open(chainConfig);

    await execute(connection);

    chainConfig.write(CONFIG_FILE_PATH);
  } catch (error) {
    assert(false, error.toString());
  } finally {
    if (connection !== undefined) {
      connection.close();
    }
  }
};

module.exports = {
  run,
};
