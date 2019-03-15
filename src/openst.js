const Package = require('@openstfoundation/openst.js');

const logger = require('./logger');

class OpenST {
  constructor(chainConfig, connection) {
    this.chainConfig = chainConfig;
    this.auxiliary = {
      web3: connection.auxiliaryWeb3,
      chainId: chainConfig.auxiliaryChainId,
      deployer: connection.auxiliaryAccount.address,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
        from: connection.auxiliaryAccount.address,
      },
    };
  }

  async deployTokenRules(auxiliaryOrganization, auxiliaryEIP20Token) {
    const { TokenRules } = Package.ContractInteract;
    const tokenRulesTxOptions = this.auxiliary.txOptions;
    const tokenRules = await TokenRules.deploy(
      this.auxiliary.web3,
      auxiliaryOrganization,
      auxiliaryEIP20Token,
      tokenRulesTxOptions,
    );
    return tokenRules.address;
  }

  async setupOpenst(auxiliaryEIP20Token) {
    const ubtConfig = this.getUtilityBrandedTokenConfig(auxiliaryEIP20Token);

    logger.info('Starting Setup of OpenST');
    const tokenHolderTxOptions = this.auxiliary.txOptions;
    const gnosisTxOptions = this.auxiliary.txOptions;
    const recoveryTxOptions = this.auxiliary.txOptions;
    const userWalletFactoryTxOptions = this.auxiliary.txOptions;
    const proxyFactoryTxOptions = this.auxiliary.txOptions;
    const createAndAddModulesTxOptions = this.auxiliary.txOptions;

    const {
      tokenHolder,
      gnosisSafe,
      recovery,
      userWalletFactory,
      proxyFactory,
      createAndAddModules,
    } = await Package.SetupOpenst(
      this.auxiliary.web3,
      tokenHolderTxOptions,
      gnosisTxOptions,
      recoveryTxOptions,
      userWalletFactoryTxOptions,
      proxyFactoryTxOptions,
      createAndAddModulesTxOptions,
    );

    const tokenRulesAddress = await this.deployTokenRules(
      ubtConfig.ubt.organizationAddress,
      ubtConfig.ubt.address,
    );

    const setupData = {
      tokenHolderMasterCopy: tokenHolder.address,
      gnosisSafeMasterCopy: gnosisSafe.address,
      recoveryMasterCopy: recovery.address,
      userWalletFactory: userWalletFactory.address,
      proxyFactory: proxyFactory.address,
      createAndAddModules: createAndAddModules.address,
      tokenRules: tokenRulesAddress,
    };

    Object.assign(this.chainConfig.openst, setupData);

    this.chainConfig.utilityBrandedTokens[ubtConfig.index].openst = setupData;

    logger.info('Completed Setup of OpenST');
  }

  getUtilityBrandedTokenConfig(auxiliaryEIP20Token) {
    for (let i = 0; i < this.chainConfig.utilityBrandedTokens.length; i++) {
      const ut = this.chainConfig.utilityBrandedTokens[i];
      if (ut.address === auxiliaryEIP20Token) {
        return { ubt: ut, index: i };
      }
    }
    return 0;
  }

  async deployPricerRule(
    auxiliaryEIP20Token,
    baseCurrencyCode,
    conversionRate,
    conversionRateDecimals,
    requiredPriceOracleDecimals,
  ) {
    logger.info('Deployment of PricerRule');
    const ubtConfig = this.getUtilityBrandedTokenConfig(auxiliaryEIP20Token);

    const { PricerRule } = Package.ContractInteract;

    const PricerRuleTxOptions = this.auxiliary.txOptions;
    const pricerRule = await PricerRule.deploy(
      this.auxiliary.web3,
      ubtConfig.ubt.organizationAddress,
      ubtConfig.ubt.address,
      ubtConfig.ubt.openst.tokenRules,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
      PricerRuleTxOptions,
    );

    const pricerOracleData = {
      address: pricerRule.address,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
    };

    this.chainConfig.utilityBrandedTokens[ubtConfig.index].openst.pricerOracle = pricerOracleData;
    logger.info('PricerRule deployed');
  }
}

module.exports = OpenST;
