// 'use strict';

const { assert } = require('chai');
const BN = require('bn.js');
const { ContractInteract } = require('@openst/mosaic.js');
const BrandedToken = require('@openst/brandedtoken.js');

const { chainConfig, connection } = require('../shared');
const OpenST = require('../../src/openst');

describe('Direct Transfer', async () => {
  it('Transfers tokens from sender to receiver', async () => {
    const auxiliaryUtilityToken = chainConfig.utilitybrandedtokens[0].address;

    const openst = new OpenST(chainConfig, connection);
    const {
      beneficiary,
    } = await openst.createUserWallet(
      auxiliaryUtilityToken,
      connection.auxiliaryAccount.address,
      1,
      connection.auxiliaryAccount.address, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );

    // Register beneficiary as internal actor
    const utilityBrandedToken = BrandedToken.ContractInteract.UtilityBrandedToken(
      connection.auxiliaryWeb3,
      auxiliaryUtilityToken,
    );
    const txOptions = {
      gasPrice: chainConfig.auxiliaryGasPrice,
      from: connection.auxiliaryAccount.address,
    };
    await utilityBrandedToken.registerInternalActors(
      [beneficiary],
      txOptions,
    );

    const eip20Instance = new ContractInteract.EIP20Token(
      connection.auxiliaryWeb3,
      auxiliaryUtilityToken,
    );
    const beneficiaryBalanceBefore = await eip20Instance.balanceOf(beneficiary);

    // Performs Direct Transfer.
    const sessionKey = connection.auxiliaryAccount.address;
    const transferAmount = new BN('1000');
    const sender = chainConfig.openst.users[0].tokenHolderProxy;
    await openst.directTransfer(
      sessionKey,
      sender,
      [beneficiary],
      [transferAmount],
    );
    const beneficiaryBalanceAfter = await eip20Instance.balanceOf(beneficiary);
    assert.strictEqual(
      beneficiaryBalanceBefore.add(transferAmount),
      beneficiaryBalanceAfter,
    );
  });
});
