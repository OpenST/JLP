'use strict';

const ChainConfig = require('./config/chain_config');
const Connection = require('./connection');
const logger = require('./logger');

/**
 * Runs a function that requires a connection to nodes.
 * A {@link ChainConfig} is passed into the given function as first argument.
 * A {@link Connection} is passed into the given function as second argument.
 *
 * @param {string} configPath Path to a JLP configuration file.
 * @param {function} execution Function that will be executed by `run`.
 */
const run = async (configPath, execution) => {
  const chainConfig = new ChainConfig(configPath);
  const connection = await Connection.open(chainConfig);

  let exitCode = 0;
  try {
    await execution(chainConfig, connection);
  } catch (error) {
    logger.error(error);
    exitCode = 1;
  } finally {
    connection.close();
    process.exit(exitCode);
  }
};

module.exports = {
  run,
};
