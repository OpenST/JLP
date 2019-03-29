// 'use strict';

const Web3 = require('web3');
const { assert } = require('chai');
const { ContractInteract } = require('@openst/mosaic.js');

const shared = require('../shared');
const OpenST = require('../../src/openst');
const BTDeployer = require('../../src/bt_deployer.js');
const BTStakeMint = require('../../src/bt_stake_mint.js');
const StateRootAnchorService = require('../../src/state_root_anchor_service');
const Facilitator = require('../../src/facilitator');

const { BN } = Web3.utils;
describe('BT stake and mint', async () => {
  let btStakeAndMint;
  let stakeRequestHash;
  let messageHash;
  let utilityBrandedTokenConfig;
  let beneficiary;

  const stakeVT = new BN(100);
  let tokenBalanceBeforeStake;
  let valueToken;

  it('Deploy Gateway Composer', async () => {
    const { chainConfig, connection } = shared;
    const btDeployer = new BTDeployer(chainConfig, connection);
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    await btDeployer.deployGatewayComposer();
  });

  it('Creates user wallet', async () => {
    const { chainConfig, connection } = shared;
    const openst = new OpenST(chainConfig, connection);
    const owner = connection.auxiliaryAccount.address;

    const utilityBrandedTokenConfigs = chainConfig.utilityBrandedTokens;
    // Take the latest deployed UBT config
    const utilityBrandedTokenConfig = utilityBrandedTokenConfigs[utilityBrandedTokenConfigs.length - 1];

    // Openst Setup has already been done in openst setup smoke test.
    // Master copies will be read from chainConfig.
    // For createUserWallet config should have recoveryOwnerAddress, recoveryControllerAddress
    // and recoveryBlockDelay
    await chainConfig.update({
      openst: {
        ...chainConfig.openst,
        recoveryOwnerAddress: connection.auxiliaryAccount.address,
        recoveryControllerAddress: connection.auxiliaryAccount.address,
        recoveryBlockDelay: '100000000000',
      },
    });

    const {
      tokenHolderProxy,
      gnosisSafeProxy,
      recoveryProxy,
    } = await openst.createUserWallet(
      utilityBrandedTokenConfig.address,
      owner,
      1,
      connection.auxiliaryAccount.address, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );


    assert.isNotNull(tokenHolderProxy, 'TokenHolder proxy address should not be null.');
    assert.isNotNull(gnosisSafeProxy, 'Gnosis proxy address should not be null.');
    assert.isNotNull(recoveryProxy, 'Recovery proxy address should not be null.');
    // beneficiary = connection.auxiliaryWeb3.utils.toChecksumAddress(tokenHolderProxy);
    beneficiary = tokenHolderProxy;
    console.log(`beneficiary:${beneficiary}, connection.auxiliaryAccount.address: ${connection.auxiliaryAccount.address}`);
  });

  it('Request Stake', async () => {
    const { chainConfig, connection } = shared;
    valueToken = new ContractInteract.EIP20Token(
      connection.originWeb3,
      chainConfig.eip20TokenAddress,
    );

    tokenBalanceBeforeStake = new BN(await valueToken.balanceOf(
      connection.originAccount.address,
    ));

    btStakeAndMint = new BTStakeMint(chainConfig, connection);
    // Take the latest deployed UBT config
    const { originGatewayAddress } = utilityBrandedTokenConfig;

    const gasPrice = '2';
    const gasLimit = '2';

    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    stakeRequestHash = await btStakeAndMint.requestStake(
      originGatewayAddress,
      stakeVT.toString(10),
      beneficiary,
      gasPrice,
      gasLimit,
    );
  });

  it('Accept Stake Request', async () => {
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    messageHash = await btStakeAndMint.acceptStake(stakeRequestHash);
  });

  it('Anchor StateRoot', async () => {
    const { chainConfig, connection } = shared;
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

  it('Progress Stake', async () => {
    const { chainConfig, connection } = shared;
    const tokenBalanceAfterStake = new BN(await valueToken.balanceOf(
      connection.originAccount.address,
    ));

    const utilityBrandedToken = new ContractInteract.UtilityToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    const initialMintedBalance = new BN(await utilityBrandedToken.balanceOf(
      connection.auxiliaryAccount.address,
    ));

    const mosaic = chainConfig.toMosaicFromMessageHash(connection, messageHash);
    const facilitator = new Facilitator(chainConfig, connection, mosaic);
    await facilitator.progressStake(messageHash);


    const finalMintedBalance = new BN(await utilityBrandedToken.balanceOf(
      connection.auxiliaryAccount.address,
    ));

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
