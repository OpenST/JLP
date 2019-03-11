const { Setup, ContractInteract, Helpers } = require('@openstfoundation/brandedtoken.js');
const { Utils, ContractInteract: MosaicContractInteract } = require('@openstfoundation/mosaic.js');
const EthUtils = require('ethereumjs-util');
const Account = require('eth-lib/lib/account');
const logger = require('./logger');

class BTDeployer {
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

  async _deployOriginOrganization() {
    console.log('deployer :- ', this.origin.deployer);
    console.log('masterkey :- ', this.origin.masterKey);
    console.log('reached here');
    const response = await Setup.organization(
      this.origin.web3,
      {
        deployer: this.origin.deployer,
        owner: this.origin.masterKey,
        admin: this.origin.masterKey,
        workers: [
          this.origin.web3.utils.toChecksumAddress(this.chainConfig.workerAddress),
          this.origin.web3.utils.toChecksumAddress(this.origin.masterKey),
        ],
        workerExpirationHeight: '20000000',
      },
      this.origin.txOptions,
    );
    console.log('origin org deployed');
    return response;
    // console.log("reached yahan bhi ");
  }

  _deployBrandedToken(symbol, name, decimal, conversionRate, conversionRateDecimals, organization) {
    const originBTConfig = {
      valueToken: this.origin.token,
      symbol,
      name,
      decimal,
      conversionRate,
      conversionRateDecimals,
      organization,
    };

    return Setup.brandedtoken(
      this.origin.web3,
      originBTConfig,
      this.origin.txOptions,
    );
  }

  async deployBrandedToken(
    symbol,
    name,
    decimal,
    conversionRate,
    conversionDecimal,
  ) {
    logger.info('Deploying organization on origin');

    const originOrganization = await this._deployOriginOrganization();
    logger.info(`origin organization address ${originOrganization.address}`);

    logger.info('Deploying branded token  ');
    const brandedToken = await this._deployBrandedToken(
      symbol,
      name,
      decimal,
      conversionRate,
      conversionDecimal,
      originOrganization.address,
    );

    logger.info(`Origin branded token addresss ${brandedToken.address}`);
    logger.info('Deployed branded token');

    this.chainConfig.originOrganizationAddress = originOrganization.address;
    this.chainConfig.brandedToken = {
      address: brandedToken.address,
      symbol,
      name,
      decimal,
      conversionRate,
      conversionDecimal,
      originOrganization: originOrganization.address,
      valueToken: this.origin.token,
    };
    return { originOrganization, brandedToken };
  }

  async deployUtilityBrandedToken() {
    logger.info('Deploying utility branded token');

    const auxiliaryOrganizationConfig = {
      deployer: this.auxiliary.deployer,
      owner: this.auxiliary.masterKey,
      admin: this.auxiliary.masterKey,
      workers: [
        this.origin.web3.utils.toChecksumAddress(this.chainConfig.workerAddress),
        this.origin.web3.utils.toChecksumAddress(this.auxiliary.masterKey),
      ],
      workerExpirationHeight: '200000000',
    };

    const auxiliaryUBTConfig = {
      valueToken: this.chainConfig.brandedToken.address,
      symbol: this.chainConfig.brandedToken.symbol,
      name: this.chainConfig.brandedToken.name,
      decimal: this.chainConfig.brandedToken.decimal,
    };

    const auxiliaryTxUBTOptions = this.auxiliary.txOptions;

    const originGatewayConfig = {
      token: this.chainConfig.brandedToken.address,
      baseToken: this.origin.baseToken,
      stateRootProvider: this.chainConfig.originAnchorAddress,
      bounty: '0',
      organization: this.chainConfig.originOrganizationAddress,
      burner: this.origin.burner,
      deployer: this.origin.deployer,
      organizationOwner: this.origin.masterKey,
    };

    const auxiliaryGatewayConfig = {
      stateRootProvider: this.chainConfig.auxiliaryAnchorAddress,
      bounty: '0',
      burner: this.auxiliary.burner,
      deployer: this.auxiliary.deployer,
      organizationOwner: this.auxiliary.masterKey,
    };

    const originGatewayTxOptions = this.origin.txOptions;
    const auxiliaryCoGatewayTxOptions = this.auxiliary.txOptions;

    const auxiliaryUBTSetCoGatewayTxOptions = {
      gasPrice: this.auxiliary.txOptions.gasPrice,
      from: this.auxiliary.masterKey,
    };
    console.log('deploying UBT things');
    const {
      auxiliaryOrganization,
      utilityBrandedToken,
      originGateway,
      auxiliaryCoGateway,
    } = await Setup.utilitybrandedtoken(
      this.origin.web3,
      this.auxiliary.web3,
      auxiliaryOrganizationConfig,
      this.auxiliary.txOptions,
      auxiliaryUBTConfig,
      auxiliaryTxUBTOptions,
      originGatewayConfig,
      auxiliaryGatewayConfig,
      originGatewayTxOptions,
      auxiliaryCoGatewayTxOptions,
      auxiliaryUBTSetCoGatewayTxOptions,
    );

    logger.info(`auxiliaryOrganization address ${auxiliaryOrganization.address}`);
    logger.info(`utilityBrandedToken address ${utilityBrandedToken.address}`);
    logger.info(`originGateway address ${originGateway.address}`);
    logger.info(`auxiliaryCoGateway address ${auxiliaryCoGateway.address}`);


    const brandedToken = new ContractInteract.BrandedToken(
      this.origin.web3,
      this.chainConfig.brandedToken.address,
    );

    const liftRestrictionTxOptions = {
      gasPrice: this.origin.txOptions.gasPrice,
      from: this.origin.masterKey,
    };
    const stakeVaultAddress = await originGateway.getStakeVault();
    console.log('lift restriction  for ', [originGateway.address, stakeVaultAddress]);

    await brandedToken.liftRestriction(
      [originGateway.address, stakeVaultAddress],
      liftRestrictionTxOptions,
    );

    console.log('lift restriction  done');
    this.chainConfig.utilityBrandedTokens.push({
      address: auxiliaryOrganization.address,
      organizationAddress: auxiliaryOrganization.address,
      originGatewayAddress: originGateway.address,
      auxiliaryCoGatewayAddress: auxiliaryCoGateway.address,
    });


    return {
      auxiliaryOrganization,
      utilityBrandedToken,
      originGateway,
      auxiliaryCoGateway,
    };
  }

  async deployGatewayComposer() {
    const txOptions = {};
    txOptions.from = this.origin.deployer;
    txOptions.gasPrice = this.chainConfig.originGasPrice;
    console.log('this.origin.masterKey :- ', this.origin.masterKey);
    const gatewayComposer = await ContractInteract.GatewayComposer.deploy(
      this.origin.web3,
      this.origin.masterKey,
      this.chainConfig.eip20TokenAddress,
      this.chainConfig.brandedToken.address,
      txOptions,
    );

    logger.info('Gateway composer deployed');

    this.chainConfig.gatewayComposerAddress = gatewayComposer.address;
  }

  async requestStake(stakeVT, beneficiary, gasPrice, gasLimit, nonce) {
    logger.info('Started requestStake');
    const { txOptions } = this.origin;

    const brandedToken = new ContractInteract.BrandedToken(
      this.origin.web3,
      this.chainConfig.brandedToken.address,
    );
    const mintBT = await brandedToken.convertToBrandedTokens(stakeVT);

    // todo get nonce for the contract
    let stakeRequest = {
      staker: this.chainConfig.gatewayComposerAddress,
      beneficiary,
      stakeVT,
      mintBT,
      nonce,
      gasPrice,
      gasLimit,
    };

    const staker = new Helpers.Staker(
      this.origin.web3,
      this.origin.token,
      this.chainConfig.brandedToken.address,
      this.chainConfig.gatewayComposerAddress,
    );
    console.log('calling request stake');
    // Fixme https://github.com/OpenSTFoundation/brandedtoken.js/issues/122
    const response = await staker.requestStake(
      stakeVT,
      mintBT,
      this.chainConfig.utilityBrandedTokens[0].originGatewayAddress, // take as parameter
      gasPrice,
      gasLimit,
      beneficiary,
      nonce,
      txOptions,
    );

    // console.log('response  ', response);

    const stakeRequestHash = await brandedToken.contract.methods.stakeRequestHashes(
      this.chainConfig.gatewayComposerAddress,
    ).call();

    console.log('stakeRequestHash  ', stakeRequestHash);
    const { stakeRequests } = this.chainConfig;

    stakeRequest = {
      stakeRequestHash,
      ...stakeRequest,
    };
    stakeRequests[stakeRequestHash] = stakeRequest;
    console.log(JSON.parse(JSON.stringify(response.requestStakeReceipt)));
    logger.info(`requestStake completed, your request hash is: ${stakeRequestHash}`);
  }

  async acceptStake(stakeRequestHash) {
    const utilityBrandedTokenConfig = this.chainConfig.utilityBrandedTokens[0];
    const originGateway = utilityBrandedTokenConfig.originGatewayAddress; // take as parameter

    const eip20Gateway = new MosaicContractInteract.EIP20Gateway(this.origin.web3, originGateway);
    const bounty = await eip20Gateway.getBounty();

    const staker = this.chainConfig.gatewayComposerAddress;
    const gcInstance = new ContractInteract.GatewayComposer(
      this.origin.web3,
      staker,
    );

    const brandedToken = new ContractInteract.BrandedToken(
      this.origin.web3,
      this.chainConfig.brandedToken.address,
    );

    const btData = await brandedToken.contract.methods.stakeRequests(stakeRequestHash).call();

    console.log('btData  ', btData);
    const data = await gcInstance.contract.methods.stakeRequests(stakeRequestHash).call();
    console.log('data  ', data);
    console.log('bounty  ', bounty);
    let stakeRequest = this.chainConfig.stakeRequests[stakeRequestHash];

    logger.info('acceptStake started');
    // originWeb3, valueToken, brandedToken, gatewayComposer
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

    console.log('stake request  ', stakeRequest);
    console.log('this.chainConfig.gatewayComposerAddress', staker);
    console.log('this.chainConfig.brandedToken.address', this.chainConfig.brandedToken.address);
    const requestHashToBeSigned = new Helpers.StakeHelper().getStakeRequestTypedData(
      stakeRequest.stakeVT,
      '0', // todo This is BT nonce
      staker,
      this.chainConfig.brandedToken.address,
    ).getEIP712SignHash();

    let signature = EthUtils.ecsign(
      EthUtils.toBuffer(requestHashToBeSigned),
      EthUtils.toBuffer(this.chainConfig.workerPrivateKey),
    );
    console.log('hash to be sign :- ', requestHashToBeSigned);

    const formatedSignature = {
      r: EthUtils.bufferToHex(signature.r),
      s: EthUtils.bufferToHex(signature.s),
      v: EthUtils.bufferToHex(signature.v),
    };
    console.log('signature ', formatedSignature);
    //
    // const r =
    // const s =
    // const v =

    console.log('private key  ', this.chainConfig.workerPrivateKey);
    signature = signData(requestHashToBeSigned, this.chainConfig.workerPrivateKey);

    console.log('signature 2 ', signature);
    // this.origin.txOptions.gas = '5000000';
    // this.origin.web3.
    // await facilitator.acceptStakeRequest(
    //   stakeRequest.stakeRequestHash,
    //   signature,
    //   '0', // bounty
    //   hashLock,
    //   this.origin.txOptions,
    // );


    const gatewayInstance = new MosaicContractInteract.EIP20Gateway(
      this.origin.web3,
      originGateway,
    );

    logger.info('Getting message hash from the gateway');
    const activeProcess = await gatewayInstance.contract.methods.getOutboxActiveProcess(
      staker,
    ).call();

    console.log('active process ', activeProcess);
    // FixMe https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const nextNonce = await gatewayInstance.contract.methods.getNonce(
      staker,
    ).call();
    console.log('nonce ', nextNonce);
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
      originBrandedTokenAddress: this.chainConfig.brandedToken,
      originOrganizationAddress: this.chainConfig.brandedToken,
    };

    const { stakes, stakeRequests } = this.chainConfig;

    stakes[messageHash] = gatewayStakeRequest;
    delete stakeRequests[stakeRequestHash];

    logger.info('Stake successful');
    logger.info(`Please use faciliator agent to progressStake and use this message hash : ${messageHash}`);
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

module.exports = BTDeployer;
