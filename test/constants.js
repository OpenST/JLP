'use strict';

/**
 * @file constants to be used by the test framework and across the test suite.
 */

const path = require('path');

const CONFIG_FILE_NAME = 'config.json';
const CONFIG_FILE_PATH = path.join(__dirname, CONFIG_FILE_NAME);
const CONFIG_INIT_FILE_NAME = 'config_init.json';
const CONFIG_INIT_FILE_PATH = path.join(__dirname, CONFIG_INIT_FILE_NAME);
const MOSAIC_FAUCET_URL = 'http://157.230.99.224:60500';
const ROPSTEN_FAUCET_URL = 'https://ropsten.faucet.b9lab.com/tap';

module.exports = {
  CONFIG_FILE_NAME,
  CONFIG_FILE_PATH,
  CONFIG_INIT_FILE_NAME,
  CONFIG_INIT_FILE_PATH,
  MOSAIC_FAUCET_URL,
  ROPSTEN_FAUCET_URL,
};
