'use strict';

const assert = require('assert');

const shared = require('../../../shared');
const OpenST = require('../../../../src/openst');

const UserWalletFactory = require('./helpers/user_wallet_factory');
const UserWalletOwner = require('./helpers/user_wallet_owner');
const RecoveryOwner = require('./helpers/recovery_owner');
const RecoveryController = require('./helpers/recovery_controller');


describe('Recover an access', async () => {
  let openst = {};

  it('Initialize chain config and shared.connection objects.', async () => {
    const utilityBrandedTokenConfigs = shared.chainConfig.utilityBrandedTokens;
    const utilityBrandedTokenConfig = utilityBrandedTokenConfigs[
      utilityBrandedTokenConfigs.length - 1
    ];
    const { organizationAddress, address } = utilityBrandedTokenConfig;

    openst = new OpenST(
      shared.chainConfig,
      shared.connection,
    );

    await openst.setupOpenst(organizationAddress, address);
  });

  let userWallet = {};
  let userWalletOwner = {};

  let recoveryControllerAddress = '';
  let recoveryController = {};

  const recoveryBlockDelay = 20;
  let recoveryOwner = {};

  it('Setup a user wallet with one owner/device.', async () => {
    const { web3 } = openst.auxiliary;

    recoveryControllerAddress = openst.auxiliary.deployer;

    const ownerKey = await web3.eth.accounts.create();
    const recoveryOwnerKey = await web3.eth.accounts.create();

    await web3.eth.accounts.create();

    const userWalletFactory = new UserWalletFactory(
      openst,
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
    const { web3 } = openst.auxiliary;

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

  it('Initiate a recovery process to replace the lost device.', async () => {
    const { web3 } = openst.auxiliary;

    newOwnerKey = await web3.eth.accounts.create();

    const signature = await recoveryOwner.signInitiateRecovery(
      userWalletOwner.ownerKey.address,
      newOwnerKey.address,
    );

    await recoveryController.initiateRecovery(
      userWalletOwner.ownerKey.address,
      newOwnerKey.address,
      signature,
    );
  });

  let userWalletNewOwner = {};

  it('Execute recovery process to replace the lost device.', async () => {
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
    const { web3 } = openst.auxiliary;

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
