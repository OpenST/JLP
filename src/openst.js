const Package = require('@openstfoundation/openst.js');

const logger = require('./logger');

const { TokenRules, TokenHolder } = Package.ContractInteract;


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

  async directTransfer(sessionKey, sender, beneficiaryArray, amountArray) {
    const tokenRules = new TokenRules(this.chainConfig.openst.tokenRules, this.auxiliary.web3);
    const tokenHolder = new TokenHolder(sender, this.auxiliary.web3);
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

    const vrs = sessionKey.signEIP1077Transaction(transaction);
    await sender.executeRule(
      this.chainConfig.openst.tokenRules,
      directTransferExecutable,
      sessionKeyNonce,
      vrs.r,
      vrs.s,
      vrs.v,
      this.auxiliary.txOptions,
    );
  }
}

module.exports = OpenST;
