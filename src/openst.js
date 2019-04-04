const Package = require('@openst/openst.js');
const logger = require('./logger');

const { PricerRule, TokenRules, TokenHolder } = Package.ContractInteract;


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
    const tokenRulesTxOptions = this.auxiliary.txOptions;
    const tokenRules = await TokenRules.deploy(
      this.auxiliary.web3,
      auxiliaryOrganization,
      auxiliaryEIP20Token,
      tokenRulesTxOptions,
    );
    return tokenRules.address;
  }

  async setupOpenst(auxiliaryOrganization, auxiliaryEIP20Token) {
    logger.info('Starting Setup of OpenST');
    const { ubt, index } = this.getUtilityBrandedTokenConfig(auxiliaryEIP20Token);
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
      auxiliaryOrganization,
      auxiliaryEIP20Token,
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

    this.chainConfig.utilityBrandedTokens[index].openst = setupData;

    logger.info('Completed Setup of OpenST');
  }

  async createUserWallet(
    eip20Token,
    owners,
    threshold,
    sessionKeys,
    sessionKeySpendingLimits,
    sessionKeyExpirationHeights,
  ) {
    const { Helpers, ContractInteract } = Package;

    const userHelper = new Helpers.User(
      this.chainConfig.openst.tokenHolderMasterCopy,
      this.chainConfig.openst.gnosisSafeMasterCopy,
      this.chainConfig.openst.recoveryMasterCopy,
      this.chainConfig.openst.createAndAddModules,
      eip20Token,
      this.chainConfig.openst.tokenRules,
      this.chainConfig.openst.userWalletFactory,
      this.chainConfig.openst.proxyFactory,
      this.auxiliary.web3,
    );
    const ownersArray = owners.split(',').map(item => item.trim());
    const sessionKeysArray = sessionKeys.split(',').map(item => item.trim());
    const sessionKeySpendingLimitsArray = sessionKeySpendingLimits.split(',').map(item => item.trim());
    const sessionKeyExpirationHeightsArray = sessionKeyExpirationHeights.split(',').map(item => item.trim());
    const response = await userHelper.createUserWallet(
      ownersArray,
      threshold,
      this.chainConfig.openst.recoveryOwnerAddress,
      this.chainConfig.openst.recoveryControllerAddress,
      this.chainConfig.openst.recoveryBlockDelay,
      sessionKeysArray,
      sessionKeySpendingLimitsArray,
      sessionKeyExpirationHeightsArray,
      this.auxiliary.txOptions,
    );
    const { returnValues } = response.events.UserWalletCreated;
    const gnosisSafeProxy = returnValues._gnosisSafeProxy;
    const tokenHolderProxy = returnValues._tokenHolderProxy;
    logger.info('User created!');
    const gnosisSafe = new ContractInteract.GnosisSafe(this.auxiliary.web3, gnosisSafeProxy);
    const modules = await gnosisSafe.getModules();
    const recoveryProxy = modules[0];
    logger.info(`gnosisSafeProxy: ${gnosisSafeProxy}\n tokenHolderProxy: ${tokenHolderProxy}\n recoveryProxy: ${recoveryProxy}`);
    const user = {
      gnosisSafeProxy,
      tokenHolderProxy,
      recoveryProxy,
    };
    this.chainConfig.users.push(user);
    return { tokenHolderProxy, gnosisSafeProxy, recoveryProxy };
  }

  async directTransfer(sessionKey, sender, beneficiaryArray, amountArray) {
    const tokenRules = new TokenRules(this.auxiliary.web3, this.chainConfig.openst.tokenRules);
    const tokenHolder = new TokenHolder(this.auxiliary.web3, sender);
    const directTransferExecutable = tokenRules.getDirectTransferExecutableData(
      beneficiaryArray,
      amountArray,
    );
    const sessionKeyData = await tokenHolder.getSessionKeyData(sessionKey);
    const sessionKeyNonce = sessionKeyData.nonce;
    const transaction = {
      from: sender,
      to: this.chainConfig.openst.tokenRules,
      data: directTransferExecutable,
      nonce: sessionKeyNonce,
      callPrefix: await tokenHolder.getTokenHolderExecuteRuleCallPrefix(),
      value: 0,
      gasPrice: 0,
      gas: 0,
    };
    // Reuse of worker as session key as private key is logged to
    // config.json on Organiation deployment.
    const sessionKeyAccountInstance = this.auxiliary.web3.eth.accounts.privateKeyToAccount(
      this.chainConfig.workerPrivateKey,
    );
    const vrs = sessionKeyAccountInstance.signEIP1077Transaction(transaction);
    await tokenHolder.executeRule(
      this.chainConfig.openst.tokenRules,
      directTransferExecutable,
      sessionKeyNonce,
      vrs.r,
      vrs.s,
      vrs.v,
      this.auxiliary.txOptions,
    );
  }

  getUtilityBrandedTokenConfig(auxiliaryEIP20Token) {
    for (let i = 0; i < this.chainConfig.utilityBrandedTokens.length; i += 1) {
      const ut = this.chainConfig.utilityBrandedTokens[i];
      if (ut.address === auxiliaryEIP20Token) {
        return { ubt: ut, index: i };
      }
    }
    return { ubt: undefined, index: -1 };
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

    const pricerRule = await PricerRule.deploy(
      this.auxiliary.web3,
      ubtConfig.ubt.organizationAddress,
      ubtConfig.ubt.address,
      ubtConfig.ubt.openst.tokenRules,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
      this.auxiliary.txOptions,
    );

    const pricerRuleData = {
      [baseCurrencyCode]: {
        address: pricerRule.address,
      },
    };

    this.chainConfig.utilityBrandedTokens[ubtConfig.index].pricerRules = pricerRuleData;
    logger.info('PricerRule deployed');

    return { pricerRuleData };
  }
}

module.exports = OpenST;
