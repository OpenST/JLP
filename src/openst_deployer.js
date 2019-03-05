const Web3 = require('web3');
const OpenST = require('@openstfoundation/openst.js');

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
        gas: chainConfig.auxiliaryGasPrice,
      },
    };
  }

  async deployTokenRules(auxiliaryOrganization, auxiliaryEIP20Token) {
    logger.info('Deploying TokenRules');
    const tokenRulesSetup = new OpenST.Setup.TokenRules(this.auxiliary.web3);
    const response = await tokenRulesSetup.deploy(
      auxiliaryOrganization,
      auxiliaryEIP20Token,
      this.auxiliary.txOptions,
    );
    logger.info(`Deployed TokenRules address: ${response.receipt.contractAddress}`);
    return response.receipt.contractAddress;
  }

  async setupOpenst() {
    logger.info('Starting Setup of OpenST');
    const openstSetup = new OpenST.Setup(this.auxiliary.web3);
    const {
      tokenHolderMasterCopy,
      gnosisMasterCopy,
      recoveryMasterCopy,
      createAndAddModule,
      proxyFactory,
      userWalletFactory,
    } = await openstSetup.deploy(this.auxiliary.txOptions);

    this.chainConfig.openst.push({
      tokenHolderMasterCopy,
      gnosisMasterCopy,
      recoveryMasterCopy,
      createAndAddModule,
      proxyFactory,
      userWalletFactory,
    });
    logger.info('Completed Setup of OpenST');
  }

}

module.exports = OpenSTDeployer;
