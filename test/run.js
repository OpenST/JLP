#!/usr/bin/env node

'use strict';

const fs = require('fs');
const Mocha = require('mocha');
const path = require('path');
const program = require('commander');

const ChainConfig = require('../src/config/chain_config');
const shared = require('./shared');

const { version } = require('../package.json');

const EXIT_CODE_OK = 0;
const EXIT_CODE_FAILED_TESTS = 1;
const EXIT_CODE_UNCAUGHT_EXCEPTION = 2;

const {
  CONFIG_FILE_PATH,
  CONFIG_INIT_FILE_PATH,
} = require('./constants');

/**
 * Runs before the test suite.
 */
const setup = async () => {
  // Check for an existing config-init file. If it doesn't exist, copy it from the distributed
  // version.
  try {
    fs.accessSync(CONFIG_INIT_FILE_PATH, fs.constants.F_OK);
  } catch (error) {
    console.info(`Could not find ${CONFIG_INIT_FILE_PATH}. Copying './test/config_init.json.dist' with default values.`);
    fs.copyFileSync(
      `${CONFIG_INIT_FILE_PATH}.dist`,
      CONFIG_INIT_FILE_PATH,
    );
  }

  // Before every test suite, the config file is copied from the init version that only contains
  // initial keys to start the tests.
  fs.copyFileSync(
    CONFIG_INIT_FILE_PATH,
    CONFIG_FILE_PATH,
  );
};

/**
 * Deletes the temporary config file of this test run and closes the connection to the ethereum
 * nodes.
 */
const teardown = () => {
  fs.unlinkSync(CONFIG_FILE_PATH);

  if (shared.connection instanceof ChainConfig) {
    console.log('yellow');
    shared.connection.close();
  }
};

/**
 * Creates a new Mocha instance and adds the test files.
 */
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
      file => file !== path.join(__dirname, 'constants.js'),
    )
    .filter(
      // Skipping the file that manages shared state across tests.
      file => file !== path.join(__dirname, 'shared.js'),
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
    async () => {
      try {
        const mocha = loadMocha();
        await setup();

        mocha.run((failures) => {
          teardown();

          if (failures > 0) {
            process.exit(EXIT_CODE_FAILED_TESTS);
          }

          process.exit(EXIT_CODE_OK);
        });
      } catch (error) {
        teardown();

        console.error(`Uncaught error during tests: ${error.toString()}`);
        process.exit(EXIT_CODE_UNCAUGHT_EXCEPTION);
      }
    },
  )
  .parse(process.argv);
