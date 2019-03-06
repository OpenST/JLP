const Web3 = require('web3');
const Package = require('@openstfoundation/openst.js');

const logger = require('./logger');

class OpenSTDeployer {
  constructor(chainConfig) {
    this.chainConfig = chainConfig;
    this.auxiliary = {
      web3: new Web3(chainConfig.auxiliaryWeb3Provider),
      chainId: chainConfig.auxiliaryChainId,
      deployer: chainConfig.auxiliaryDeployerAddress,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
        from: chainConfig.auxiliaryDeployerAddress,
      },
    };
  }

  async deployTokenRules(auxiliaryOrganization, auxiliaryEIP20Token) {
    logger.info('Deploying TokenRules');
    const tokenRulesSetup = new Package.Setup.TokenRules(this.auxiliary.web3);
    const { txOptions } = this.auxiliary;
    // TODO Remove below hardcoding after tokenrules deploy does gas estimation.
    txOptions.gas = 10000000;
    const response = await tokenRulesSetup.deploy(
      auxiliaryOrganization,
      auxiliaryEIP20Token,
      txOptions,
    );
    Object.assign(
      this.chainConfig.openst,
      { tokenRulesAddress: response.receipt.contractAddress },
    );
    logger.info(`Deployed TokenRules address: ${response.receipt.contractAddress}`);
  }

  async setupOpenst() {
    logger.info('Starting Setup of OpenST');
    const openst = new Package.Setup.OpenST(this.auxiliary.web3);
    const { txOptions } = this.auxiliary;
    // TODO Remove below hardcoding after estimateGas issue is fixed.
    txOptions.gas = 60000000;
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
    } = await openst.setup(
      tokenHolderTxOptions,
      gnosisTxOptions,
      recoveryTxOptions,
      userWalletFactoryTxOptions,
      proxyFactoryTxOptions,
      createAndAddModulesTxOptions,
    );

    const setupData = {
      tokenHolderMasterCopy: tokenHolder.address,
      gnosisSafeMasterCopy: gnosisSafe.address,
      recoveryMasterCopy: recovery.address,
      userWalletFactory: userWalletFactory.address,
      proxyFactory: proxyFactory.address,
      createAndAddModules: createAndAddModules.address,
    };
    Object.assign(this.chainConfig.openst, setupData);
    logger.info('Completed Setup of OpenST');
  }
}

module.exports = OpenSTDeployer;
