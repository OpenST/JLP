'use strict';

/**
 * @file contains hooks that are executed across the entire test suite.
 * The `before` hook is executed at the beginning of a test run.
 * The `afterEach` hook is executed after every test case.
 *
 * This means that the configuration file is automatically updated on disk
 * after every test case. A test only needs to update the configuration
 * object with the updated values.
 */

const Web3 = require('web3');
const assert = require('assert');

const { CONFIG_FILE_PATH, CONFIG_INIT_FILE_PATH } = require('./constants');
const ChainConfig = require('../src/config/chain_config');
const Connection = require('../src/connection');
const shared = require('./shared');
const docker = require('./docker');

/**
 * Sets up the connection to the ethereum nodes to be used by the tests.
 * It adds the connection and chain configuration to the `shared` module where
 * the test cases can access them.
 */
before(async () => {
  const chainConfig = new ChainConfig(CONFIG_INIT_FILE_PATH);
  shared.chainConfig = chainConfig;

  const originEndpoint = chainConfig.originWeb3Provider;
  const auxiliaryEndpoint = chainConfig.auxiliaryWeb3Provider;

  const originPortStr = originEndpoint.substr(originEndpoint.lastIndexOf(':') + 1);
  const auxiliaryPortStr = auxiliaryEndpoint.substr(auxiliaryEndpoint.lastIndexOf(':') + 1);

  const originPort = parseInt(originPortStr, 10);
  assert(!Number.isNaN(originPort));
  const auxiliaryPort = parseInt(auxiliaryPortStr, 10);
  assert(!Number.isNaN(auxiliaryPort));

  await docker(originPort, auxiliaryPort);

  const originWeb3 = new Web3(originEndpoint);
  const auxiliaryWeb3 = new Web3(auxiliaryEndpoint);

  const originPrefundedAccounts = await originWeb3.eth.getAccounts();
  const auxiliaryPrefundedAccounts = await auxiliaryWeb3.eth.getAccounts();

  const password = 'testpass';

  const originAccountAddress = await originWeb3.eth.personal.newAccount(password);
  const auxiliaryAccountAddress = await auxiliaryWeb3.eth.personal.newAccount(password);

  await originWeb3.eth.personal.unlockAccount(originAccountAddress, password, null);
  await auxiliaryWeb3.eth.personal.unlockAccount(auxiliaryAccountAddress, password, null);

  await originWeb3.eth.sendTransaction({
    from: originPrefundedAccounts[0],
    to: originAccountAddress,
    value: originWeb3.utils.toWei('1', 'ether'),
  });

  await auxiliaryWeb3.eth.sendTransaction({
    from: auxiliaryPrefundedAccounts[0],
    to: auxiliaryAccountAddress,
    value: auxiliaryWeb3.utils.toWei('1', 'ether'),
  });

  // const originProvider = Provider.create('origin', originAccount, chainConfig);
  // const auxiliaryProvider = Provider.create('auxiliary', auxiliaryAccount, chainConfig);

  // originWeb3.setProvider(originProvider);
  // auxiliaryWeb3.setProvider(auxiliaryProvider);

  shared.connection = new Connection(
    originWeb3,
    auxiliaryWeb3,
    { address: originAccountAddress },
    { address: auxiliaryAccountAddress },
  );
});

/**
 * Writes the current chain config object to disk, overwriting the
 * previous chain configuration file.
 */
afterEach(() => {
  shared.chainConfig.write(CONFIG_FILE_PATH);
});
