const mosaic = require('@openst/mosaic.js');

const { EIP20Token } = mosaic.ContractInteract;
const Facilitator = require('../../src/facilitator');
const EIP20 = require('../../src/eip20');
const shared = require('../shared');
const Deployer = require('../../src/deployer');
const StateRootAnchorService = require('../../src/state_root_anchor_service');

describe('stake and mint', () => {
  it('should stake and mint', async () => {
    const symbol = 'OST';
    const name = 'OST';
    const totalSupply = 10000000000;
    const decimals = 3;

    const { chainConfig } = shared;
    const eip20 = new EIP20(chainConfig, symbol, name, totalSupply, decimals);
    const eip20TokenAddress = await eip20.deployEIP20(shared.connection);

    const deployer = new Deployer(chainConfig, shared.connection);

    const contractInstances = await deployer.deployUtilityToken();
    const { originWeb3, auxiliaryWeb3 } = shared.connection;
    const utilityBrandedTokenAddress = contractInstances.auxiliaryUtilityToken.address;
    chainConfig.update({
      originOrganizationAddress: contractInstances.originOrganization.address,
      auxiliaryOrganizationAddress: contractInstances.auxiliaryOrganization.address,
      // originAnchorAddress: contractInstances.originAnchor.address,
      // auxiliaryAnchorAddress: contractInstances.auxiliaryAnchor.address,
      originGatewayAddress: contractInstances.originGateway.address,
      auxiliaryCoGatewayAddress: contractInstances.auxiliaryCoGateway.address,
      auxiliaryUtilityTokenAddress: utilityBrandedTokenAddress,
    });
    chainConfig.write();

    const facilitator = new Facilitator(
      chainConfig,
      shared.connection,
      chainConfig.toMosaic(shared.connection),
    );
    const stakedAmount = 10000;

    const eip20Token = new EIP20Token(originWeb3, eip20TokenAddress);
    const staker = shared.accounts.origin.originDeployer.address;
    const initialStakerBalance = await eip20Token.balanceOf(staker);

    const beneficiary = shared.accounts.auxiliary.auxiliaryMasterKey.address;
    const { messageHash } = await facilitator.stake(
      staker,
      stakedAmount,
      beneficiary,
    );

    const stakerBalanceAfterStake = await eip20Token.balanceOf(staker);

    assert.strictEqual(
      initialStakerBalance - stakedAmount,
      stakerBalanceAfterStake,
      'Incorrect staker balance',
    );

    const delay = 5;
    const timeout = 1000;

    const targetTxOptions = {
      from: shared.accounts.origin.originDeployer.address,
      gasPrice: chainConfig.originGasPrice,
    };

    const stateRootAnchorService = new StateRootAnchorService(
      Number.parseInt(delay, 10),
      originWeb3,
      auxiliaryWeb3,
      chainConfig.originAnchorAddress,
      targetTxOptions,
      timeout,
    );

    const anchorInfo = await stateRootAnchorService.getSourceInfo('latest');
    await stateRootAnchorService.anchor(anchorInfo, targetTxOptions);

    await facilitator.progressStake(messageHash);

    const ubtTokenInstance = new EIP20Token(originWeb3, utilityBrandedTokenAddress);
    const beneficiaryBalance = await ubtTokenInstance.balanceOf(beneficiary);
    const mintedToken = initialStakerBalance - stakedAmount;
    assert.strictEqual(beneficiaryBalance, mintedToken, 'Minted tokens are not as per expected number');
  });
});
