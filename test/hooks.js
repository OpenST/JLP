'use strict';

/**
 * @file contains hooks that are executed across the entire test suite.
 * The `before` hook is executed at the beginning of a test run. The `afterEach` hook is executed
 * after every test case.
 *
 * This means that the configuration file is automatically updated on disk after every test case. A
 * test only needs to update the configuration object with the updated values.
 */

const { CONFIG_FILE_PATH } = require('./constants');
const ChainConfig = require('../src/config/chain_config');
const Connection = require('../src/connection');
const shared = require('./shared');

/**
 * Sets up the connection to the ethereum nodes to be used by the tests.
 * It adds the connection and chain configuration to the `shared` module where the test cases can
 * access them.
 */
before(async () => {
  const chainConfig = new ChainConfig(CONFIG_FILE_PATH);
  shared.chainConfig = chainConfig;

  try {
    const connection = await Connection.open(chainConfig);
    shared.connection = connection;
  } catch (error) {
    console.error(`Could not connect to blockchain nodes ${error}`);
  }
});

/**
 * Writes the current chain config object to disk, overwriting the previous chain configuration
 * file.e
 */
afterEach(() => {
  shared.chainConfig.write(CONFIG_FILE_PATH);
});
