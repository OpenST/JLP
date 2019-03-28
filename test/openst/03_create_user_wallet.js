// 'use strict';

const { assert } = require('chai');
const BrandedToken = require('@openst/brandedtoken.js');

const shared = require('../shared');
const OpenST = require('../../src/openst');

describe('CreateUserWallet', async () => {
  it('Creates user wallet', async () => {
    const openst = new OpenST(shared.chainConfig, shared.connection);
    const owner = shared.connection.auxiliaryAccount.address;

    // const auxiliaryUtilityToken = shared.chainConfig.utilitybrandedtokens[0].address;

    // TODO Enable above line once BT Stake and Mint PR is merged
    const auxiliaryUtilityToken = '0x0000000000000000000000000000000000000001';

    // Openst Setup has already been done in openst setup smoke test.
    // Master copies will be read from shared.chainConfig.
    // For createUserWallet config should have recoveryOwnerAddress, recoveryControllerAddress
    // and recoveryBlockDelay
    shared.chainConfig.openst.write({
      recoveryOwnerAddress: shared.connection.auxiliaryAccount.address,
      recoveryControllerAddress: shared.connection.auxiliaryAccount.address,
      recoveryBlockDelay: '100000000000',
    });
    const {
      tokenHolderProxy,
      gnosisSafeProxy,
      recoveryProxy,
    } = await openst.createUserWallet(
      auxiliaryUtilityToken,
      owner,
      1,
      shared.connection.auxiliaryAccount.address, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );

    // Register tokenHolder as internal actor.
    const utilityBrandedToken = BrandedToken.ContractInteract.UtilityBrandedToken(
      shared.connection.auxiliaryWeb3,
      auxiliaryUtilityToken,
    );
    const txOptions = {
      gasPrice: shared.chainConfig.auxiliaryGasPrice,
      from: shared.connection.auxiliaryAccount.address,
    };
    await utilityBrandedToken.registerInternalActors(
      [tokenHolderProxy],
      txOptions,
    );

    assert.isNotNull(tokenHolderProxy, 'TokenHolder proxy address should not be null.');
    assert.isNotNull(gnosisSafeProxy, 'Gnosis proxy address should not be null.');
    assert.isNotNull(recoveryProxy, 'Recovery proxy address should not be null.');
  });
});
