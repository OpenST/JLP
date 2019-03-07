const Web3 = require('web3');
const { Setup } = require('@openstfoundation/brandedtoken.js');

const logger = require('./logger');

class BTDeployer {
  constructor(chainConfig) {
    this.chainConfig = chainConfig;
    this.origin = {
      web3: new Web3(chainConfig.originWeb3Provider),
      chainId: chainConfig.originChainId,
      deployer: chainConfig.originDeployerAddress,
      txOptions: {
        gasPrice: chainConfig.originGasPrice,
        from: chainConfig.originDeployerAddress,
      },
      token: chainConfig.eip20TokenAddress,
      baseToken: chainConfig.simpleTokenAddress,
      burner: chainConfig.originBurnerAddress,
      masterKey: chainConfig.originMasterKey,
    };

    this.auxiliary = {
      web3: new Web3(chainConfig.auxiliaryWeb3Provider),
      chainId: chainConfig.auxiliaryChainId,
      deployer: chainConfig.auxiliaryDeployerAddress,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
        from: chainConfig.auxiliaryDeployerAddress,
      },
      burner: chainConfig.auxiliaryBurnerAddress,
      masterKey: chainConfig.auxiliaryMasterKey,
    };
  }

  _deployOriginOrganization() {
    return Setup.organization(
      this.origin.web3,
      {
        deployer: this.origin.deployer,
        owner: this.origin.masterKey,
        admin: this.origin.masterKey,
        workers: [],
        workerExpirationHeight: '0',
      },
      this.origin.txOptions,
    );
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
    };
    return { originOrganization, brandedToken };
  }

  async deployUtilityBrandedToken() {
    logger.info('Deploying utility branded token');

    const auxiliaryOrganizationConfig = {
      deployer: this.auxiliary.deployer,
      owner: this.auxiliary.masterKey,
      admin: this.auxiliary.masterKey,
      workers: [this.auxiliary.masterKey],
      workerExpirationHeight: '10000000000000',
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
}

module.exports = BTDeployer;
