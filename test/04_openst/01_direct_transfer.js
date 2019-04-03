// 'use strict';

const { assert } = require('chai');
const BN = require('bn.js');
const { ContractInteract } = require('@openst/mosaic.js');
const { ContractInteract: BTContractInteract } = require('@openst/brandedtoken.js');

const OpenST = require('../../src/openst');
const shared = require('../shared');

describe('Direct Transfer', async () => {
  let utilityBrandedTokenConfig;
  let receiver;
  let sessionKey;

  it('Creates receiver and register it as internal actor', async () => {
    const { chainConfig, connection } = shared;
    const utilityBrandedTokenConfigs = chainConfig.utilityBrandedTokens;
    // Take the latest deployed UBT config
    utilityBrandedTokenConfig = utilityBrandedTokenConfigs[utilityBrandedTokenConfigs.length - 1];

    // Using worker as the session key for reusability. Worker account is created
    // and private key is logged to config.json. We will need private key during EIP712 signing.
    sessionKey = chainConfig.workerAddress;
    const openst = new OpenST(chainConfig, connection);
    const {
      tokenHolderProxy,
    } = await openst.createUserWallet(
      utilityBrandedTokenConfig.address,
      connection.auxiliaryAccount.address,
      1,
      sessionKey, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );
    receiver = tokenHolderProxy;
  });

  it('Register receiver as internal actor', async () => {
    const { chainConfig, connection } = shared;
    // Register beneficiary as internal actor
    const utilityBrandedToken = new BTContractInteract.UtilityBrandedToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    const txOptions = {
      gasPrice: chainConfig.auxiliaryGasPrice,
      from: connection.auxiliaryAccount.address,
    };
    await utilityBrandedToken.registerInternalActors(
      [receiver],
      txOptions,
    );
  });

  it('Transfers tokens from sender to receiver', async () => {
    const { chainConfig, connection } = shared;
    const utilityBrandedToken = new ContractInteract.UtilityToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    // Performs Direct Transfer.
    const transferAmount = '100';
    // 1st tokenHolder is beneficiary during BT stake and mint flow.
    // It holds all the minted tokens.
    const sender = chainConfig.users[0].tokenHolderProxy;
    const receiverBalanceBefore = new BN(await utilityBrandedToken.balanceOf(
      receiver,
    ));
    const senderBalanceBefore = new BN(await utilityBrandedToken.balanceOf(
      sender,
    ));
    const openst = new OpenST(chainConfig, connection);
    await openst.directTransfer(
      sessionKey,
      sender,
      [receiver],
      [transferAmount],
    );
    const senderBalanceAfter = new BN(await utilityBrandedToken.balanceOf(
      sender,
    ));
    const receiverBalanceAfter = new BN(await utilityBrandedToken.balanceOf(
      receiver,
    ));
    assert.strictEqual(
      (receiverBalanceBefore.add(new BN(transferAmount))).eq(receiverBalanceAfter),
      true,
      'Receiver before and after balance should match after transfer.',
    );
    assert.strictEqual(
      (senderBalanceBefore.sub(new BN(transferAmount))).eq(senderBalanceAfter),
      true,
      'Sender before and after balance should match after transfer.',
    );
  });
});
