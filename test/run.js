#!/usr/bin/env node

'use strict';

const fs = require('fs');
const Mocha = require('mocha');
const path = require('path');
const program = require('commander');

const { version } = require('../package.json');

const EXIT_CODE_OK = 0;
const EXIT_CODE_FAILED_TESTS = 1;
const EXIT_CODE_NO_CONFIG = 2;

const {
  CONFIG_FILE_PATH,
  CONFIG_INIT_FILE_PATH,
} = require('./const');

const setup = () => {
  try {
    fs.accessSync(CONFIG_INIT_FILE_PATH, fs.constants.F_OK);
  } catch (error) {
    console.error(`Could not find ${CONFIG_INIT_FILE_PATH}. Please make sure you have copied './test/config_init.json.dist' to './test/config_init.jsen' and set your parameters (${error}).`);
    process.exit(EXIT_CODE_NO_CONFIG);
  }

  fs.copyFileSync(
    CONFIG_INIT_FILE_PATH,
    CONFIG_FILE_PATH,
  );
};

const teardown = () => {
  fs.unlinkSync(CONFIG_FILE_PATH);
};

const loadMocha = () => {
  const mocha = new Mocha({
    timeout: false,
  });

  Mocha.utils.lookupFiles(__dirname, ['js'], true)
    .filter(
      // Skipping this file itself.
      file => file !== __filename,
    )
    .filter(
      // Skipping the file that stores the constants.
      file => file !== path.join(__dirname, 'const.js'),
    )
    .filter(
      // Skipping the file that manages the node connections for the tests.
      file => file !== path.join(__dirname, 'connected.js'),
    )
    .forEach((file) => {
      mocha.addFile(file);
    });

  return mocha;
};

program
  .version(version)
  .name('JLP Tests')
  .description('Running the JLP tests expects a connection to nodes.')
  .action(
    () => {
      setup();

      const mocha = loadMocha();
      mocha.run((failures) => {
        teardown();

        if (failures > 0) {
          process.exit(EXIT_CODE_FAILED_TESTS);
        }

        process.exit(EXIT_CODE_OK);
      });
    },
  )
  .parse(process.argv);
