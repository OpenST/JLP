'use strict';

const ChainConfig = require('./config/chain_config');
const Connection = require('./connection');
const logger = require('./logger');

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
