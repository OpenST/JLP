// 'use strict';

const { assert } = require('chai');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('CreateUserWallet', async () => {
  it('Creates user wallet', async () => {
    const testAddresses = {
      organization: '0x0000000000000000000000000000000000000001',
      utilityToken: '0x0000000000000000000000000000000000000002',
    };
    const owner = connection.auxiliaryAccount.address;
    const sessionKeys = [connection.auxiliaryAccount.address];
    const openst = new OpenST(chainConfig, connection);
    //  setupOpenst updates chainConfig with OpenST master copies and factory contracts.
    await openst.setupOpenst(testAddresses.organization, testAddresses.utilityToken);

    const {
      tokenHolderProxy,
      gnosisSafeProxy,
      recoveryProxy,
    } = await openst.createUserWallet(
      testAddresses.utilityToken,
      owner,
      1,
      sessionKeys,
      [1000000000],
      [10000000000],
    );

    assert.isNotNull(tokenHolderProxy, 'TokenHolder proxy address should not be null.');
    assert.isNotNull(gnosisSafeProxy, 'Gnosis proxy address should not be null.');
    assert.isNotNull(recoveryProxy, 'Recovery proxy address should not be null.');
  });
});
