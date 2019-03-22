// 'use strict';

const { assert } = require('chai');
const BN = require('bn.js');
const { ContractInteract } = require('@openst/mosaic.js');
const BrandedToken = require('@openst/brandedtoken.js');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('Direct Transfer', async () => {
  it('Transfers tokens from sender to receiver', async () => {
    const testAddresses = {
      organization: '0x0000000000000000000000000000000000000001',
      utilityToken: '0x0000000000000000000000000000000000000002',
      beneficiary: '0x0000000000000000000000000000000000000005',
    };
    const sessionKey = connection.auxiliaryAccount.address;
    const openst = new OpenST(chainConfig, connection);
    //  setupOpenst updates chainConfig with OpenST master copies and factory contracts.
    await openst.setupOpenst(testAddresses.organization, testAddresses.utilityToken);

    const {
      tokenHolderProxy,
    } = await openst.createUserWallet(
      testAddresses.utilityToken,
      connection.auxiliaryAccount.address,
      1, // gnosis multisig requirement
      [sessionKey],
      [10000000000],
      [10000000000],
    );

    const utilityBrandedToken = BrandedToken.ContractInteract.UtilityBrandedToken(
      connection.auxiliaryWeb3,
      testAddresses.utilityToken,
    );
    const txOptions = {
      gasPrice: chainConfig.auxiliaryGasPrice,
      from: connection.auxiliaryAccount.address,
    };
    await utilityBrandedToken.registerInternalActors(
      [tokenHolderProxy, testAddresses.beneficiary],
      txOptions,
    );
    const eip20Instance = new ContractInteract.EIP20Token(
      connection.auxiliaryWeb3,
      testAddresses.utilityToken,
    );
    const beneficiaryBalanceBefore = await eip20Instance.balanceOf(testAddresses.beneficiary);
    const transferAmount = new BN('1000');
    await openst.directTransfer(
      sessionKey,
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
