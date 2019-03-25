// 'use strict';

const { assert } = require('chai');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('CreateUserWallet', async () => {
  it('Creates user wallet', async () => {
    const auxiliaryOrganization = chainConfig.utilitybrandedtokens[0].organizationAddress;
    const auxiliaryUtilityToken = chainConfig.utilitybrandedtokens[0].address;

    const owner = connection.auxiliaryAccount.address;
    const openst = new OpenST(chainConfig, connection);
    //  setupOpenst updates chainConfig with OpenST master copies and factory contracts.
    await openst.setupOpenst(auxiliaryOrganization, auxiliaryUtilityToken);

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

    assert.isNotNull(tokenHolderProxy, 'TokenHolder proxy address should not be null.');
    assert.isNotNull(gnosisSafeProxy, 'Gnosis proxy address should not be null.');
    assert.isNotNull(recoveryProxy, 'Recovery proxy address should not be null.');
  });
});
