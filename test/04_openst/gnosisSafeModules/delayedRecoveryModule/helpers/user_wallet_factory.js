'use strict';

const { ContractInteract, Helpers } = require('@openst/openst.js');

const UserWallet = require('./user_wallet');

/** Factory class for creating user wallets. */
class UserWalletFactory {
  /**
   * Creates an instance of UserWalletFactory on the auxiliary chain.
   *
   * @param {Object} openst
   *
   * @memberof UserWalletFactory
   */
  constructor(
    openst,
  ) {
    this.openst = openst;
  }

  /**
   * Creates an instance of UserWallet.
   *
   * @static
   *
   * @param {Object}   gnosisSafeArgs Gnosis safe's arguments.
   * @param {string[]} gnosisSafeArgs.owners Initial list of owners of a gnosis safe.
   * @param {number}   gnosisSafeArgs.threshold Required confirmations number to execute safe txs.
   * @param {Object}   gnosisSafeOwnerKey Gnosis safe current owner key.
   * @param {Object}   recoveryModuleArgs Delayed recovery module's arguments.
   * @param {Object}   recoveryModuleArgs.recoveryOwnerAddress Recovery owner's key.
   * @param {string}   recoveryModuleArgs.recoveryControllerAddress Recovery controller's address.
   * @param {number}   recoveryModuleArgs.recoveryBlockDelay Blocks to wait to execute recovery.
   * @param {Object}   tokenHolderArgs Token holder's arguments.
   * @param {string[]} tokenHolderArgs.sessionKeys Session keys' addresses to authorize.
   * @param {number[]} tokenHolderArgs.sessionKeySpendingLimits Session keys' spending limits.
   * @param {number[]} tokenHolderArgs.sessionKeyExpirationHeights Session keys' expiration heights.
   *
   * @returns {Object} Returns newly created UserWallet object.
   *
   * @memberof UserWalletFactory
   */
  async create(
    gnosisSafeArgs,
    delayedRecoveryModuleArgs,
    tokenHolderArgs,
  ) {
    // Retrieving the utility token's address from token rules.
    const tokenRulesContractInteract = new ContractInteract.TokenRules(
      this.openst.auxiliary.web3,
      this.openst.chainConfig.openst.tokenRules,
    );
    const utilityTokenAddress = await tokenRulesContractInteract.contract.methods.token(
    ).call(this.openst.auxiliary.txOptions);

    const userHelper = new Helpers.User(
      this.openst.chainConfig.openst.tokenHolderMasterCopy,
      this.openst.chainConfig.openst.gnosisSafeMasterCopy,
      this.openst.chainConfig.openst.recoveryMasterCopy,
      this.openst.chainConfig.openst.createAndAddModules,
      utilityTokenAddress,
      this.openst.chainConfig.openst.tokenRules,
      this.openst.chainConfig.openst.userWalletFactory,
      this.openst.chainConfig.openst.proxyFactory,
      this.openst.auxiliary.web3,
    );

    const response = await userHelper.createUserWallet(
      gnosisSafeArgs.owners,
      gnosisSafeArgs.threshold,
      delayedRecoveryModuleArgs.recoveryOwnerAddress,
      delayedRecoveryModuleArgs.recoveryControllerAddress,
      delayedRecoveryModuleArgs.recoveryBlockDelay,
      tokenHolderArgs.sessionKeys,
      tokenHolderArgs.sessionKeySpendingLimits,
      tokenHolderArgs.sessionKeyExpirationHeights,
      this.openst.auxiliary.txOptions,
    );

    const { returnValues } = response.events.UserWalletCreated;

    const gnosisSafeProxy = returnValues._gnosisSafeProxy;
    const gnosisSafeContractInteract = new ContractInteract.GnosisSafe(
      this.openst.auxiliary.web3, gnosisSafeProxy,
    );

    const modules = await gnosisSafeContractInteract.getModules();
    const recoveryProxy = modules[0];
    const recoveryModuleContractInteract = new ContractInteract.Recovery(
      this.openst.auxiliary.web3, recoveryProxy,
    );

    const tokenHolderProxy = returnValues._tokenHolderProxy;
    const tokenHolderContractInteract = new ContractInteract.TokenHolder(
      this.openst.auxiliary.web3, tokenHolderProxy,
    );

    return new UserWallet(
      gnosisSafeContractInteract,
      recoveryModuleContractInteract,
      tokenHolderContractInteract,
      this.openst,
    );
  }
}

module.exports = UserWalletFactory;
