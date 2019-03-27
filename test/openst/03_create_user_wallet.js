// 'use strict';

const { assert } = require('chai');
const BrandedToken = require('@openst/brandedtoken.js');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('CreateUserWallet', async () => {
  it('Creates user wallet', async () => {

    const openst = new OpenST(chainConfig, connection);
    const owner = connection.auxiliaryAccount.address;

    // const auxiliaryUtilityToken = chainConfig.utilitybrandedtokens[0].address;

    // TODO Enable above line once BT Stake and Mint PR is merged
    const auxiliaryUtilityToken = '0x0000000000000000000000000000000000000001';

    // Openst Setup has already been done in openst setup smoke test.
    // Master copies will be read from chainConfig.
    // For createUserWallet config should have recoveryOwnerAddress, recoveryControllerAddress
    // and recoveryBlockDelay
    chainConfig.openst.update({
      recoveryOwnerAddress: connection.auxiliaryAccount.address,
      recoveryControllerAddress: connection.auxiliaryAccount.address,
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
      connection.auxiliaryAccount.address, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );

    // Register tokenHolder as internal actor.
    const utilityBrandedToken = BrandedToken.ContractInteract.UtilityBrandedToken(
      connection.auxiliaryWeb3,
      auxiliaryUtilityToken,
    );
    const txOptions = {
      gasPrice: chainConfig.auxiliaryGasPrice,
      from: connection.auxiliaryAccount.address,
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
