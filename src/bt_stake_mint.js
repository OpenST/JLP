const { ContractInteract, Helpers } = require('@openstfoundation/brandedtoken.js');
const { Utils, ContractInteract: MosaicContractInteract } = require('@openstfoundation/mosaic.js');
const Account = require('eth-lib/lib/account');
const logger = require('./logger');

class BTStakeMint {
  constructor(chainConfig, connection) {
    this.chainConfig = chainConfig;
    this.origin = {
      web3: connection.originWeb3,
      chainId: chainConfig.originChainId,
      deployer: connection.originAccount.address,
      txOptions: {
        gasPrice: chainConfig.originGasPrice,
        from: connection.originAccount.address,
      },
      token: chainConfig.eip20TokenAddress,
      baseToken: chainConfig.simpleTokenAddress,
      burner: chainConfig.originBurnerAddress,
      masterKey: connection.originAccount.address,
    };

    this.auxiliary = {
      web3: connection.auxiliaryWeb3,
      chainId: chainConfig.auxiliaryChainId,
      deployer: connection.auxiliaryAccount.address,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
        from: connection.auxiliaryAccount.address,
      },
      burner: chainConfig.auxiliaryBurnerAddress,
      masterKey: connection.auxiliaryAccount.address,
    };
  }

  async requestStake(originGatewayAddress, stakeVT, beneficiary, gasPrice, gasLimit) {
    logger.info('Started requestStake');
    const { txOptions } = this.origin;

    const brandedToken = new ContractInteract.BrandedToken(
      this.origin.web3,
      this.chainConfig.brandedToken.address,
    );
    const mintBT = await brandedToken.convertToBrandedTokens(stakeVT);

    const stakerNonce = await new MosaicContractInteract.EIP20Gateway(
      this.origin.web3,
      originGatewayAddress,
    ).getNonce(this.chainConfig.gatewayComposerAddress);

    let stakeRequest = {
      staker: this.chainConfig.gatewayComposerAddress,
      originGateway: originGatewayAddress,
      beneficiary,
      stakeVT,
      mintBT,
      stakerNonce,
      gasPrice,
      gasLimit,
    };

    const staker = new Helpers.Staker(
      this.origin.web3,
      this.origin.token,
      this.chainConfig.brandedToken.address,
      this.chainConfig.gatewayComposerAddress,
    );

    // Fixme https://github.com/OpenSTFoundation/brandedtoken.js/issues/122
    await staker.requestStake(
      stakeVT,
      mintBT,
      originGatewayAddress,
      gasPrice,
      gasLimit,
      beneficiary,
      stakerNonce,
      txOptions,
    );

    const stakeRequestHash = await brandedToken.contract.methods.stakeRequestHashes(
      this.chainConfig.gatewayComposerAddress,
    ).call();

    const { stakeRequests } = this.chainConfig;

    stakeRequest = {
      stakeRequestHash,
      ...stakeRequest,
    };
    stakeRequests[stakeRequestHash] = stakeRequest;

    logger.info(`requestStake completed, your request hash is: ${stakeRequestHash}`);
  }

  async acceptStake(stakeRequestHash) {
    let stakeRequest = this.chainConfig.stakeRequests[stakeRequestHash];

    const { originGateway } = stakeRequest;

    const utilityBrandedTokenConfig = this.getUtilityBrandedTokenConfig(originGateway);
    const eip20Gateway = new MosaicContractInteract.EIP20Gateway(this.origin.web3, originGateway);
    const bounty = await eip20Gateway.getBounty();

    const ubtContractInstance = new ContractInteract.UtilityBrandedToken(
      this.auxiliary.web3,
      utilityBrandedTokenConfig.address,
    );

    const registerInternalActorTxOptions = {
      from: this.auxiliary.masterKey,
      gasPrice: this.auxiliary.txOptions.gasPrice,
    };

    const isAlreadyRegistered = await ubtContractInstance.contract.methods.isInternalActor(
      stakeRequest.beneficiary,
    ).call();

    if (isAlreadyRegistered) {
      logger.info(`Beneficiary address ${stakeRequest.beneficiary} already registered as Internal actor`);
    } else {
      await ubtContractInstance.registerInternalActor(
        [stakeRequest.beneficiary],
        registerInternalActorTxOptions,
      );
      logger.info(`${stakeRequest.beneficiary} address registered as Internal actor`);
    }


    const staker = this.chainConfig.gatewayComposerAddress;

    const brandedToken = new ContractInteract.BrandedToken(
      this.origin.web3,
      this.chainConfig.brandedToken.address,
    );

    logger.info('acceptStake started');

    const facilitator = new Helpers.Facilitator(
      this.origin.web3,
      this.origin.token,
      this.chainConfig.brandedToken.address,
      staker,
    );
    const { hashLock, unlockSecret } = Utils.createSecretHashLock();
    stakeRequest = {
      hashLock,
      unlockSecret,
      ...stakeRequest,
    };

    const btNonce = await brandedToken.contract.methods.nonce().call();

    const requestHashToBeSigned = new Helpers.StakeHelper().getStakeRequestTypedData(
      stakeRequest.stakeVT,
      parseInt((btNonce) - 1, 10),
      staker,
      this.chainConfig.brandedToken.address,
    ).getEIP712SignHash();

    signature = signData(requestHashToBeSigned, this.chainConfig.workerPrivateKey);

    await facilitator.acceptStakeRequest(
      stakeRequest.stakeRequestHash,
      signature,
      bounty,
      hashLock,
      this.origin.txOptions,
    );

    const gatewayInstance = new MosaicContractInteract.EIP20Gateway(
      this.origin.web3,
      originGateway,
    );

    logger.info('Getting message hash from the gateway');
    const activeProcess = await gatewayInstance.contract.methods.getOutboxActiveProcess(
      staker,
    ).call();

    // FixMe https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const nextNonce = await gatewayInstance.contract.methods.getNonce(
      staker,
    ).call();
    const currentNonce = parseInt(nextNonce, 10) - 1;

    // FixMe In mosaic.js facilitator.stake should return messageHash. https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const messageHash = activeProcess.messageHash_;

    const gatewayStakeRequest = {
      messageHash,
      nonce: currentNonce.toString(),
      staker,
      beneficiary: stakeRequest.beneficiary,
      amount: stakeRequest.mintBT,
      gasPrice: stakeRequest.gasPrice,
      gasLimit: stakeRequest.gasLimit,
      hashLock,
      unlockSecret,
      auxiliaryUtilityTokenAddress: utilityBrandedTokenConfig.address,
      auxiliaryOrganizationAddress: utilityBrandedTokenConfig.organizationAddress,
      originGatewayAddress: utilityBrandedTokenConfig.originGatewayAddress,
      auxiliaryCoGatewayAddress: utilityBrandedTokenConfig.auxiliaryCoGatewayAddress,
      originBrandedTokenAddress: this.chainConfig.brandedToken.address,
      originOrganizationAddress: this.chainConfig.brandedToken.originOrganization,
    };
    const { stakes, stakeRequests } = this.chainConfig;

    stakes[messageHash] = gatewayStakeRequest;
    delete stakeRequests[stakeRequestHash];

    logger.info('Stake successful');
    logger.info(`Please use faciliator agent to progressStake and use this message hash : ${messageHash}`);
  }

  getUtilityBrandedTokenConfig(originGateway) {
    return this.chainConfig.utilityBrandedTokens.find(
      ut => ut.originGatewayAddress === originGateway,
    );
  }
}

function signData(hash, privateKey) {
  const signature = Account.sign(hash, privateKey);
  const vrs = Account.decodeSignature(signature);
  return {
    messageHash: hash,
    r: vrs[1],
    s: vrs[2],
    v: vrs[0],
    signature,
  };
}

module.exports = BTStakeMint;
