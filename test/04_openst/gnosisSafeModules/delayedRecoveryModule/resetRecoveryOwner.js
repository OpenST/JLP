// 'use strict';

const assert = require('assert');

const { ContractInteract } = require('@openst/openst.js');
const shared = require('../../../shared');

describe('DelayedRecoveryModule', async () => {
  it('resets recovery owner', async () => {
    const { chainConfig, connection } = shared;
    const web3 = connection.auxiliaryWeb3;

    const delayedRecoveryModule = new ContractInteract.Recovery(
      web3,
      chainConfig.users[0].recoveryProxy,
    );

    // Calculate recovery data
    const resetRecoveryOwnerData = delayedRecoveryModule.resetRecoveryOwnerData(
      chainConfig.users[0].recoveryOwnerAddress,
      connection.originAccount.address,
    );

    const recoveryOwnerAccount = connection.auxiliaryWeb3.eth.accounts.privateKeyToAccount(
      chainConfig.recoveryOwnerPrivateKey,
    );

    // Sign recovery data
    // openst.js extends Account to include signEIP712TypedData (via mosaic.js)
    const signedRecoveryData = recoveryOwnerAccount.signEIP712TypedData(resetRecoveryOwnerData);

    // Reset recoveryOwner
    const resetRecoveryOwnerTxOptions = {
      from: chainConfig.users[0].recoveryControllerAddress,
      gasPrice: chainConfig.auxiliaryGasPrice,
    };

    await delayedRecoveryModule.resetRecoveryOwner(
      connection.originAccount.address,
      signedRecoveryData.r,
      signedRecoveryData.s,
      signedRecoveryData.v,
      resetRecoveryOwnerTxOptions,
    );

    // Confirm recoveryOwner is newRecoveryOwner
    assert.strictEqual(
      connection.originAccount.address,
      await delayedRecoveryModule.recoveryOwner(),
    );
  });
});
