const { Setup } = require('@openstfoundation/brandedtoken.js');

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
      workers: [],
      workerExpirationHeight: '0',
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
      address: utilityBrandedToken.address,
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
