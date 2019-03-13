'use strict';

const path = require('path');

const CONFIG_FILE_NAME = 'config.json';
const CONFIG_FILE_PATH = path.join(__dirname, CONFIG_FILE_NAME);
const CONFIG_INIT_FILE_NAME = 'config_init.json';
const CONFIG_INIT_FILE_PATH = path.join(__dirname, CONFIG_INIT_FILE_NAME);

module.exports = {
  CONFIG_FILE_NAME,
  CONFIG_FILE_PATH,
  CONFIG_INIT_FILE_NAME,
  CONFIG_INIT_FILE_PATH,
};
