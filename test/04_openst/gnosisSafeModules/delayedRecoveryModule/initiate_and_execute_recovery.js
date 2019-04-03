'use strict';

const assert = require('assert');

const shared = require('../../../shared');
const OpenST = require('../../../../src/openst');

const UserWalletFactory = require('./helpers/user_wallet_factory');
const UserWalletOwner = require('./helpers/user_wallet_owner');
const RecoveryOwner = require('./helpers/recovery_owner');
const RecoveryController = require('./helpers/recovery_controller');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitBlockNumber(web3, blockNumber) {
  let currentBlockNumber = await web3.eth.getBlockNumber();

  while (currentBlockNumber < blockNumber) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(200);
    // eslint-disable-next-line no-await-in-loop
    currentBlockNumber = await web3.eth.getBlockNumber();
  }
}

describe('Recover an access', async () => {
  let chainConfig = {};
  let connection = {};
  let openst = {};

  // @todo Who/where should deploy organization and economy token contracts.
  const mockAddresses = {
    organization: '0x0000000000000000000000000000000000000001',
    utilityToken: '0x0000000000000000000000000000000000000001',
  };

  it('Initialize chain config and connection objects.', async () => {
    chainConfig = shared.chainConfig;
    connection = shared.connection;

    assert.notEqual(chainConfig, undefined);
    assert.notEqual(connection, undefined);

    openst = new OpenST(chainConfig, connection);

    await openst.setupOpenst(
      mockAddresses.organization,
      mockAddresses.utilityToken,
    );
  });

  let userWallet = {};
  let userWalletOwner = {};

  let recoveryControllerAddress = '';
  let recoveryController = {};

  const recoveryBlockDelay = 20;
  let recoveryOwner = {};

  it('Setup a user wallet with one owner/device.', async () => {
    const web3 = connection.auxiliaryWeb3;

    recoveryControllerAddress = connection.auxiliaryAccount.address;

    const ownerKey = await web3.eth.accounts.create();
    const recoveryOwnerKey = await web3.eth.accounts.create();

    await web3.eth.accounts.create();

    const userWalletFactory = new UserWalletFactory(
      chainConfig, connection, openst,
    );

    userWallet = await userWalletFactory.create(
      {
        owners: [ownerKey.address],
        threshold: 1,
      },
      {
        recoveryOwnerAddress: recoveryOwnerKey.address,
        recoveryControllerAddress,
        recoveryBlockDelay,
      },
      {
        sessionKeys: [],
        sessionKeySpendingLimits: [],
        sessionKeyExpirationHeights: [],
      },
    );

    userWalletOwner = new UserWalletOwner(ownerKey, userWallet);

    recoveryOwner = new RecoveryOwner(recoveryOwnerKey, userWallet);

    recoveryController = new RecoveryController(recoveryControllerAddress, userWallet);
  });

  it('Authorize a session.', async () => {
    const web3 = connection.auxiliaryWeb3;

    const sessionKey = await web3.eth.accounts.create();
    const sessionKeySpendingLimit = 10;
    const sessionKeyExpirationHeight = (await web3.eth.getBlockNumber()) + 100;

    const signature = await userWalletOwner.signAuthorizeSession(
      sessionKey.address,
      sessionKeySpendingLimit,
      sessionKeyExpirationHeight,
    );

    await userWallet.authorizeSession(
      sessionKey.address,
      sessionKeySpendingLimit,
      sessionKeyExpirationHeight,
      [signature],
    );
  });

  let newOwnerKey = '';

  let recoveryInitiationBlockNumber = -1;

  it('Initiate a recovery process to replace the lost device.', async () => {
    const web3 = connection.auxiliaryWeb3;

    newOwnerKey = await web3.eth.accounts.create();

    const signature = await recoveryOwner.signInitiateRecovery(
      userWalletOwner.ownerKey.address,
      newOwnerKey.address,
    );

    recoveryInitiationBlockNumber = await recoveryController.initiateRecovery(
      userWalletOwner.ownerKey.address,
      newOwnerKey.address,
      signature,
    );

    console.log('recoveryInitiationBlockNumber = ', recoveryInitiationBlockNumber);
  });

  let userWalletNewOwner = {};

  it('Execute recovery process to replace the lost device.', async () => {
    const web3 = connection.auxiliaryWeb3;

    await waitBlockNumber(web3, recoveryInitiationBlockNumber + recoveryBlockDelay);

    await recoveryController.executeRecovery(
      userWalletOwner.ownerKey.address,
      newOwnerKey.address,
    );

    userWalletNewOwner = new UserWalletOwner(newOwnerKey, userWallet);
  });


  it('Logout all previously authorized session keys.', async () => {
    const signature = await userWalletNewOwner.signLogout();
    await userWallet.logout([signature]);
  });

  it('Register a new session key.', async () => {
    const web3 = connection.auxiliaryWeb3;

    const sessionKey = await web3.eth.accounts.create();
    const sessionKeySpendingLimit = 10;
    const sessionKeyExpirationHeight = (await web3.eth.getBlockNumber()) + 100;

    const signature = await userWalletNewOwner.signAuthorizeSession(
      sessionKey.address,
      sessionKeySpendingLimit,
      sessionKeyExpirationHeight,
    );

    await userWallet.authorizeSession(
      sessionKey.address,
      sessionKeySpendingLimit,
      sessionKeyExpirationHeight,
      [signature],
    );
  });
});
