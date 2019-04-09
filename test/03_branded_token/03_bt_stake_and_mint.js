// 'use strict';

const Web3 = require('web3');
const { assert } = require('chai');
const { ContractInteract } = require('@openst/mosaic.js');
const { ContractInteract: BTContractInteract } = require('@openst/brandedtoken.js');

const shared = require('../shared');
const OpenST = require('../../src/openst');
const BTDeployer = require('../../src/bt_deployer.js');
const BTStakeMint = require('../../src/bt_stake_mint.js');
const StateRootAnchorService = require('../../src/state_root_anchor_service');
const Facilitator = require('../../src/facilitator');
const logger = require('./../../src/logger');

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

  const gasPrice = '2';
  const gasLimit = '2';

  it('Deploy Gateway Composer', async () => {
    const { chainConfig, connection } = shared;
    const btDeployer = new BTDeployer(chainConfig, connection);
    // Below line will throw an exception if anything fails, which will
    // result in test failure. Hence no need of explicit assertion.
    await btDeployer.deployGatewayComposer();
  });

  it('Creates user wallet', async () => {
    const { chainConfig, connection } = shared;
    const openst = new OpenST(chainConfig, connection);
    const owner = connection.auxiliaryAccount.address;

    const utilityBrandedTokenConfigs = chainConfig.utilityBrandedTokens;
    // Take the latest deployed UBT config
    utilityBrandedTokenConfig = utilityBrandedTokenConfigs[utilityBrandedTokenConfigs.length - 1];

    // Openst Setup has already been done in openst setup smoke test.
    // Master copies will be read from chainConfig.
    // For createUserWallet config should have recoveryOwnerAddress, recoveryControllerAddress
    // and recoveryBlockDelay
    await chainConfig.update({
      openst: {
        ...chainConfig.openst,
        recoveryOwnerAddress: chainConfig.recoveryOwnerAddress,
        recoveryControllerAddress: connection.auxiliaryAccount.address,
        recoveryBlockDelay: '100000000000',
      },
    });

    // Using worker as the session key for reusability. Worker account is created
    // and private key is logged to config.json. We will need private key during EIP712 signing.
    const sessionKey = chainConfig.workerAddress;
    const {
      tokenHolderProxy,
      gnosisSafeProxy,
      recoveryProxy,
    } = await openst.createUserWallet(
      utilityBrandedTokenConfig.address,
      owner,
      1,
      sessionKey, // Comma separated session keys.
      '100000000000',
      '100000000000',
    );

    beneficiary = tokenHolderProxy;
    assert.isNotNull(tokenHolderProxy, 'TokenHolder proxy address should not be null.');
    assert.isNotNull(gnosisSafeProxy, 'Gnosis proxy address should not be null.');
    assert.isNotNull(recoveryProxy, 'Recovery proxy address should not be null.');
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

    // Below line will throw an exception if anything fails, which will
    // result in test failure. Hence no need of explicit assertion.
    // Also request stake performs two transactions, approval of stake
    // amount and request stake on gateway composer.
    stakeRequestHash = await btStakeAndMint.requestStake(
      originGatewayAddress,
      stakeVT.toString(10),
      beneficiary,
      gasPrice,
      gasLimit,
    );
  });

  it('Accept Stake Request', async () => {
    // Below line will throw an exception if anything fails, which will
    // result in test failure. Hence no need of explicit assertion.
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
    // Below line will throw an exception if anything fails, which will
    // result in test failure. Hence no need of explicit assertion.
    await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);
  });

  it('Progress Stake', async () => {
    const { chainConfig, connection } = shared;
    const tokenBalanceAfterStake = new BN(await valueToken.balanceOf(
      connection.originAccount.address,
    ));

    const ubtContractInstance = new BTContractInteract.UtilityBrandedToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    const facilitator = connection.auxiliaryAccount.address;
    const registerInternalActorTxOptions = {
      gasPrice: chainConfig.auxiliaryGasPrice,
      from: facilitator,
    };

    const isAlreadyRegistered = await ubtContractInstance.contract.methods.isInternalActor(
      facilitator,
    ).call();

    if (isAlreadyRegistered) {
      logger.info(`Faciliator ${facilitator} is already registered as Internal actor`);
    } else {
      await ubtContractInstance.registerInternalActors(
        [facilitator],
        registerInternalActorTxOptions,
      );
      logger.info(`Facilitator ${facilitator} address registered as Internal actor`);
    }

    const utilityBrandedToken = new ContractInteract.UtilityToken(
      connection.auxiliaryWeb3,
      utilityBrandedTokenConfig.address,
    );
    const initialMintedBalance = new BN(await utilityBrandedToken.balanceOf(
      beneficiary,
    ));

    const mosaic = chainConfig.toMosaicFromMessageHash(connection, messageHash);
    const facilitatorInstance = new Facilitator(chainConfig, connection, mosaic);

    // Below line will throw an exception if anything fails, which will
    // result in test failure. Hence no need of explicit assertion.
    await facilitatorInstance.progressStake(messageHash);

    const finalMintedBalance = new BN(await utilityBrandedToken.balanceOf(
      beneficiary,
    ));

    const reward = (new BN(gasPrice)).mul(new BN(gasLimit));
    const totalMintedBalance = finalMintedBalance.sub(initialMintedBalance);
    // Conversion rate is setup such that 1 OST = 2 BT.
    const expectedMintBalance = stakeVT.muln(2).sub(reward);
    assert.strictEqual(
      totalMintedBalance.eq(expectedMintBalance),
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
