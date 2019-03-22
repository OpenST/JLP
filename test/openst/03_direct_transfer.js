// 'use strict';

const { assert } = require('chai');
const BN = require('bn.js');
const { ContractInteract } = require('@openst/mosaic.js');

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
      [10000000000],
      [10000000000],
    );

    // TODO Fund tokenHolderProxy
    const eip20Instance = new ContractInteract.EIP20Token(
      connection.auxiliaryWeb3,
      testAddresses.utilityToken,
    );
    const beneficiaryBalanceBefore = await eip20Instance.balanceOf(testAddresses.beneficiary);
    const transferAmount = new BN('1000');
    await openst.directTransfer(
      testAddresses.sessionKey,
      tokenHolderProxy,
      [testAddresses.beneficiary],
      [transferAmount],
    );
    const beneficiaryBalanceAfter = await eip20Instance.balanceOf(testAddresses.beneficiary);
    assert.strictEqual(
      beneficiaryBalanceBefore.add(transferAmount),
      beneficiaryBalanceAfter,
    );
  });
});
