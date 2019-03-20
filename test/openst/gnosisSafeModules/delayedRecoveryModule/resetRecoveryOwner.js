// 'use strict';

const assert = require('assert');

const { ContractInteract, Helpers } = require('@openst/openst.js');
const shared = require('../../../shared');
const Deployer = require('../../../../src/deployer');
const OpenST = require('../../../../src/openst');

describe('DelayedRecoveryModule', async () => {
  it('resets recovery owner', async () => {
    const chainConfig = shared.chainConfig;
    const connection = shared.connection;
    const web3 = connection.auxiliaryWeb3;

    // Set auxiliaryOrganization address
    const auxiliaryOrganization = {
      address: connection.auxiliaryAccount.address,
    };

    // Add eip20TokenAddress to config for utility token deployment
    chainConfig.update({
      eip20TokenAddress: "0x0000000000000000000000000000000000000001",
    });

    // Deploy utility token
    const deployer = new Deployer(chainConfig, connection);
    const txOptions = deployer.auxiliary.txOptions;
    txOptions.from = connection.auxiliaryAccount.address;
    const auxiliaryUtilityToken = await deployer._deployUtilityToken(auxiliaryOrganization);

    // Setup OpenST
    //  deploys master contracts
    const openst = new OpenST(chainConfig, connection);
    await openst.setupOpenst(auxiliaryOrganization, auxiliaryUtilityToken) // setupOpenst updates chainConfig

    const userWallet = {
      owners: ["0x0000000000000000000000000000000000000002"], // cannot be 0x1
      threshold: 1, // number of required confirmations
      recoveryOwner: connection.auxiliaryAccount, // account that signs resetRecoveryOwner request
      recoveryController: connection.auxiliaryAccount, // account that relays signed request
      recoveryBlockDelay: 1, // not relevant to this test, must be greater than 0
      sessionKeys: [], // not required
      sessionKeySpendingLimits: [], // not required
      sessionKeyExpirationHeights: [], // not required
    }

    // Setup user helper
    //  adapted from ../../../../src/bin/create_user.js
    const userHelper = new Helpers.User(
      chainConfig.openst.tokenHolderMasterCopy,
      chainConfig.openst.gnosisSafeMasterCopy,
      chainConfig.openst.recoveryMasterCopy,
      chainConfig.openst.createAndAddModules,
      auxiliaryUtilityToken.address,
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
      txOptions,
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
    )

    // Calculate recovery data
    const newRecoveryOwner = "0x0000000000000000000000000000000000000003";
    const resetRecoveryOwnerData = delayedRecoveryModule.resetRecoveryOwnerData(
      userWallet.recoveryOwner.address,
      newRecoveryOwner,
    );

    // Sign recovery data
    //  openst.js extends Account to include signEIP712TypedData (via mosaic.js)
    const signedRecoveryData = await userWallet
      .recoveryOwner
      .signEIP712TypedData(resetRecoveryOwnerData);

    // Reset recoveryOwner
    await delayedRecoveryModule.resetRecoveryOwner(
      newRecoveryOwner,
      signedRecoveryData.r,
      signedRecoveryData.s,
      signedRecoveryData.v,
      txOptions,
    );

    // Confirm recoveryOwner is newRecoveryOwner
    assert.strictEqual(
      newRecoveryOwner,
      await delayedRecoveryModule.recoveryOwner(),
    )
  });
});
