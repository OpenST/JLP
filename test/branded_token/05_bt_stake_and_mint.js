// 'use strict';

const Web3 = require('web3');
const { ContractInteract } = require('@openst/mosaic.js');
const shared = require('../shared');
const BTDeployer = require('../../src/bt_deployer.js');
const BTStakeMint = require('../../src/bt_stake_mint.js');
const StateRootAnchorService = require('../../src/state_root_anchor_service');
const Facilitator = require('../../src/facilitator');

const { BN } = Web3.utils;
describe('Stake and mint', async () => {
  let btStakeAndMint;
  let stakeRequestHash;
  let messageHash;
  let utilityBrandedTokenConfig;
  const { chainConfig, connection } = shared;
  const stakeVT = new BN(100);
  let tokenBalanceBeforeStake;
  let valueToken;

  it('Deploy Gateway Composer', async () => {
    const btDeployer = new BTDeployer(chainConfig, connection);
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    await btDeployer.deployGatewayComposer();
  });

  it('request Stake', async () => {
    valueToken = new ContractInteract.EIP20Token(
      connection.originWeb3,
      chainConfig.eip20TokenAddress,
    );

    tokenBalanceBeforeStake = await valueToken.balanceOf(
      connection.originAccount.address,
    );

    btStakeAndMint = new BTStakeMint(chainConfig, connection);
    utilityBrandedTokenConfig = chainConfig.utilityBrandedTokens[0];
    const { originGatewayAddress } = utilityBrandedTokenConfig;
    const beneficiary = connection.auxiliaryAccount;
    const gasPrice = 20;
    const gasLimit = 20;

    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    stakeRequestHash = await btStakeAndMint.requestStake(
      originGatewayAddress,
      stakeVT,
      beneficiary,
      gasPrice,
      gasLimit,
    );
  });

  it('accept stake request', async () => {
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    messageHash = await btStakeAndMint.acceptStake(stakeRequestHash);
  });

  it('anchor stateRoot', async () => {
    const {
      originWeb3,
      auxiliaryWeb3,
      auxiliaryAccount,
    } = connection;

    const targetTxOptions = {
      from: auxiliaryAccount.address,
      gasPrice: chainConfig.auxiliaryGasPrice,
    };

    const timeout = 1000;
    const delay = 5;
    const stateRootAnchorService = new StateRootAnchorService(
      Number.parseInt(delay, 10),
      originWeb3,
      auxiliaryWeb3,
      chainConfig.auxiliaryAnchorAddress,
      targetTxOptions,
      timeout,
    );

    const anchorInfo = await stateRootAnchorService.getSourceInfo('latest');
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);
  });

  it('progress stake', async () => {
    const tokenBalanceAfterStake = await valueToken.balanceOf(
      connection.originAccount.address,
    );

    const utilityBrandedToken = new ContractInteract.UtilityToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    const initialMintedBalance = await utilityBrandedToken.balanceOf(
      connection.auxiliaryAccount.address,
    );

    const mosaic = chainConfig.toMosaicFromMessageHash(connection, messageHash);
    const facilitator = new Facilitator(chainConfig, connection, mosaic);
    await facilitator.progressStake(messageHash);


    const finalMintedBalance = await utilityBrandedToken.balanceOf(
      connection.auxiliaryAccount.address,
    );

    const totalMintedBalance = finalMintedBalance.sub(initialMintedBalance);
    // Conversion rate is setup such that 1 OST = 2 BT
    assert.strictEqual(
      totalMintedBalance.eq(stakeVT.muln(2)),
      true,
      `Total minted amount ${totalMintedBalance} should be double of stake amount ${stakeVT}`,
    );

    const expectedStakerTokenBalance = tokenBalanceBeforeStake.sub(stakeVT);
    assert.strictEqual(
      tokenBalanceAfterStake.eq(expectedStakerTokenBalance),
      true,
      'Staker balance must be reduced by stake amount.'
      + ` Expected balance ${expectedStakerTokenBalance} but actual balance ${tokenBalanceAfterStake}`,
    );
  });
});
