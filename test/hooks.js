'use strict';

/**
 * @file contains hooks that are executed across the entire test suite.
 * The `before` hook is executed at the beginning of a test run. The `afterEach` hook is executed
 * after every test case.
 *
 * This means that the configuration file is automatically updated on disk after every test case. A
 * test only needs to update the configuration object with the updated values.
 */

const Web3 = require('web3');
const { CONFIG_FILE_PATH } = require('./constants');
const ChainConfig = require('../src/config/chain_config');
const Connection = require('../src/connection');
const shared = require('./shared');
const funder = require('./funder');

/**
 * Sets up the connection to the ethereum nodes to be used by the tests.
 * It adds the connection and chain configuration to the `shared` module where the test cases can
 * access them.
 */
before(async () => {
  const chainConfig = new ChainConfig(CONFIG_FILE_PATH);
  shared.chainConfig = chainConfig;

  try {
    const web3 = new Web3();
    await funder.addOriginAccount('originDeployer', web3);
    await funder.addOriginAccount('originMasterKey', web3);
    await funder.addOriginAccount('originWorker', web3);

    await funder.addAuxiliaryAccount('auxiliaryDeployer', web3);
    await funder.addAuxiliaryAccount('auxiliaryMasterKey', web3);
    await funder.addAuxiliaryAccount('auxiliaryWorker', web3);

    const connection = await Connection.openAndUnlockAccounts(
      chainConfig,
      shared.accounts.origin.originDeployer,
      shared.accounts.auxiliary.auxiliaryDeployer,
      funder.DEFAULT_PASSWORD,
    );
    shared.connection = connection;

    connection.originWeb3.eth.getTransactionReceiptMined = funder.getTransactionReceiptMined;
    connection.auxiliaryWeb3.eth.getTransactionReceiptMined = funder.getTransactionReceiptMined;

    const originFundRequests = Promise.all([
      funder.fundAccountFromMosaicFaucet(
        shared.accounts.origin.originDeployer.address,
        shared.accounts.origin.originDeployer.chainId,
      ),
    ]);

    const auxiliaryFundRequests = Promise.all([
      funder.fundAccountFromMosaicFaucet(
        shared.accounts.auxiliary.auxiliaryDeployer.address,
        shared.accounts.auxiliary.auxiliaryDeployer.chainId,
      ),
    ]);

    const ropstenFaucetFundRequest = Promise.all([
      funder.fundAccountFromRopstenFaucet(
        shared.accounts.origin.originDeployer.address,
      ),
    ]);
    const receipts = await funder.waitForFunding(
      originFundRequests,
      auxiliaryFundRequests,
      ropstenFaucetFundRequest,
      connection.originWeb3,
      connection.auxiliaryWeb3,
    );

    console.log('Keys funded with faucet  ', receipts.length);
  } catch (error) {
    console.log(error);
    console.error(`Failed in before each hook ${error}`);
  }
});

/**
 * Writes the current chain config object to disk, overwriting the previous chain configuration
 * file.e
 */
afterEach(() => {
  shared.chainConfig.write(CONFIG_FILE_PATH);
});
