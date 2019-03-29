// 'use strict';

const assert = require('assert');

const { ContractInteract, Helpers } = require('@openst/openst.js');
const shared = require('../../../shared');
const Deployer = require('../../../../src/deployer');
const OpenST = require('../../../../src/openst');

describe('DelayedRecoveryModule', async () => {
  it('resets recovery owner', async () => {
    const { chainConfig } = shared;
    const { connection } = shared;
    const web3 = connection.auxiliaryWeb3;

    // Required but not validated arguments
    const mockAddresses = {
      organization: '0x0000000000000000000000000000000000000001',
      utilityToken: '0x0000000000000000000000000000000000000001',
      owner: '0x0000000000000000000000000000000000000002', // 0x1 reserved for sentinels by Gnosis Safe
      newRecoveryOwner: '0x0000000000000000000000000000000000000001',
    };

    chainConfig.update({
      utilityBrandedTokens: [{
        address: mockAddresses.utilityToken,
        organizationAddress: mockAddresses.organization,
      }],
    });

    // Setup OpenST
    //  deploys master contracts
    const openst = new OpenST(chainConfig, connection);
    //  setupOpenst updates chainConfig with OpenST master copy and other addresses
    await openst.setupOpenst(
      mockAddresses.organization,
      mockAddresses.utilityToken,
    );

    const userWallet = {
      owners: [mockAddresses.owner],
      threshold: 1, // number of required confirmations
      recoveryOwner: await web3.eth.accounts.create(), // account that signs resetRecoveryOwner request
      recoveryController: connection.auxiliaryAccount, // account that relays signed request
      recoveryBlockDelay: 1, // not relevant to this test, must be greater than 0
      sessionKeys: [], // not required
      sessionKeySpendingLimits: [], // not required
      sessionKeyExpirationHeights: [], // not required
    };

    // Setup user helper
    //  adapted from ../../../../src/bin/create_user.js
    const userHelper = new Helpers.User(
      chainConfig.openst.tokenHolderMasterCopy,
      chainConfig.openst.gnosisSafeMasterCopy,
      chainConfig.openst.recoveryMasterCopy,
      chainConfig.openst.createAndAddModules,
      mockAddresses.utilityToken,
      chainConfig.openst.tokenRules,
      chainConfig.openst.userWalletFactory,
      chainConfig.openst.proxyFactory,
      web3,
    );

    // Create user wallet
    //  deploys proxy contracts
    //  adapted from ../../../../src/bin/create_user.js
    const response = await userHelper.createUserWallet(
      userWallet.owners,
      userWallet.threshold,
      userWallet.recoveryOwner.address,
      userWallet.recoveryController.address,
      userWallet.recoveryBlockDelay,
      userWallet.sessionKeys,
      userWallet.sessionKeySpendingLimits,
      userWallet.sessionKeyExpirationHeights,
      openst.auxiliary.txOptions,
    );

    // Instantiate DelayedRecoveryModule
    const { returnValues } = response.events.UserWalletCreated;
    const gnosisSafeProxy = returnValues._gnosisSafeProxy;
    const gnosisSafe = new ContractInteract.GnosisSafe(web3, gnosisSafeProxy);
    const modules = await gnosisSafe.getModules();
    const recoveryProxy = modules[0];
    const delayedRecoveryModule = new ContractInteract.Recovery(web3, recoveryProxy);

    // Confirm recoveryOwner is as expected
    assert.strictEqual(
      userWallet.recoveryOwner.address,
      await delayedRecoveryModule.recoveryOwner(),
    );

    // Calculate recovery data
    const resetRecoveryOwnerData = delayedRecoveryModule.resetRecoveryOwnerData(
      userWallet.recoveryOwner.address,
      mockAddresses.newRecoveryOwner,
    );

    // Sign recovery data
    //  openst.js extends Account to include signEIP712TypedData (via mosaic.js)
    const signedRecoveryData = await userWallet
      .recoveryOwner
      .signEIP712TypedData(resetRecoveryOwnerData);

    // Reset recoveryOwner
    const resetRecoveryOwnerTxOptions = {
      from: userWallet.recoveryController.address,
      gasPrice: openst.auxiliary.txOptions.gasPrice,
    };

    await delayedRecoveryModule.resetRecoveryOwner(
      mockAddresses.newRecoveryOwner,
      signedRecoveryData.r,
      signedRecoveryData.s,
      signedRecoveryData.v,
      resetRecoveryOwnerTxOptions,
    );

    // Confirm recoveryOwner is newRecoveryOwner
    assert.strictEqual(
      mockAddresses.newRecoveryOwner,
      await delayedRecoveryModule.recoveryOwner(),
    );
  });
});
