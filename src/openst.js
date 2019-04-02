const Package = require('@openst/openst.js');

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

  async setupOpenst(auxiliaryOrganization, auxiliaryEIP20Token) {
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
    return { tokenHolderProxy, gnosisSafeProxy, recoveryProxy };
  }
}

module.exports = OpenST;
