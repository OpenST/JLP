const mosaic = require('@openst/mosaic.js');

const { EIP20Token } = mosaic.ContractInteract;
const assert = require('assert');
const BN = require('bn.js');
const Facilitator = require('../../src/facilitator');
const shared = require('../shared');

const StateRootAnchorService = require('../../src/state_root_anchor_service');

describe('stake and mint', () => {
  let messageHash;
  let facilitator;
  let beneficiary;
  let stakedAmount;

  it('should stake successfully', async () => {
    const { chainConfig, connection } = shared;
    const { originWeb3 } = connection;

    const { eip20TokenAddress } = chainConfig;

    facilitator = new Facilitator(
      chainConfig,
      connection,
      chainConfig.toMosaic(connection),
    );
    stakedAmount = '10000';

    const eip20Token = new EIP20Token(originWeb3, eip20TokenAddress);

    const staker = connection.originAccount.address;
    const initialStakerBalance = new BN(await eip20Token.balanceOf(staker));

    beneficiary = connection.auxiliaryAccount.address;
    [{ messageHash }] = [await facilitator.stake(
      staker,
      stakedAmount,
      beneficiary,
    )];

    const stakerBalanceAfterStake = new BN(await eip20Token.balanceOf(staker));

    assert.strictEqual(
      initialStakerBalance.sub(new BN(stakedAmount)).eq(stakerBalanceAfterStake),
      true,
      'Incorrect staker balance',
    );
  });

  it('should anchor successfully', async () => {
    const { chainConfig, connection } = shared;
    const { originWeb3, auxiliaryWeb3 } = connection;
    const delay = 5;
    const timeout = 1000;

    const targetTxOptions = {
      from: connection.auxiliaryAccount.address,
      gasPrice: chainConfig.auxiliaryGasPrice,
    };

    const stateRootAnchorService = new StateRootAnchorService(
      Number.parseInt(delay, 10),
      originWeb3,
      auxiliaryWeb3,
      chainConfig.auxiliaryAnchorAddress,
      targetTxOptions,
      timeout,
    );

    const anchorInfo = await stateRootAnchorService.getSourceInfo('latest');
    await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);
  });

  it('should mint tokens successfully', async () => {
    const { connection, chainConfig } = shared;
    const { auxiliaryWeb3 } = connection;
    await facilitator.progressStake(messageHash);

    const ubtTokenInstance = new EIP20Token(
      auxiliaryWeb3,
      chainConfig.auxiliaryUtilityTokenAddress,
    );
    const beneficiaryBalance = new BN(await ubtTokenInstance.balanceOf(beneficiary));

    assert.strictEqual(beneficiaryBalance.eq(new BN(stakedAmount)), true, 'Minted tokens are not as per expected number');
  });
});
