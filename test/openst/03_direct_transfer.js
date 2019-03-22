// 'use strict';

const { assert } = require('chai');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('Direct Transfer', async () => {
  it('Transfers tokens from sender to receiver', async () => {
    const testAddresses = {
      organization: '0x0000000000000000000000000000000000000001',
      utilityToken: '0x0000000000000000000000000000000000000002',
      owner: '0x0000000000000000000000000000000000000003',
      sessionKey: '0x0000000000000000000000000000000000000004',
      beneficiary: '0x0000000000000000000000000000000000000005',
    };
    const openst = new OpenST(chainConfig, connection);
    //  setupOpenst updates chainConfig with OpenST master copies and factory contracts.
    await openst.setupOpenst(testAddresses.organization, testAddresses.utilityToken);

    const {
      tokenHolderProxy,
    } = await openst.createUserWallet(
      testAddresses.utilityToken,
      testAddresses.owner,
      1,
      [testAddresses.sessionKey],
      [1000000000],
      [10000000000],
    );

    // TODO Fund tokenHolderProxy
    await openst.directTransfer(
      testAddresses.sessionKey,
      tokenHolderProxy,
      [testAddresses.beneficiary],
      [1000],
    );
  });
});
