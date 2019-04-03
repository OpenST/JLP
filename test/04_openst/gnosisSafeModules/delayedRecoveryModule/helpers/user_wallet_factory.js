'use strict';

const { ContractInteract, Helpers } = require('@openst/openst.js');

const UserWallet = require('./user_wallet');
// const OpenST = require('../../../../../src/openst');

/** Factory class for creating user wallets. */
class UserWalletFactory {
  /**
   * Creates an instance of UserWalletFactory on the auxiliary chain.
   *
   * @param {Object} chainConfig Shared chain configuration object of JLP.
   * @param {Object} connection  Shared connection object of JLP.
   *
   * @memberof UserWalletFactory
   */
  constructor(
    chainConfig,
    connection,
    openst,
  ) {
    this.chainConfig = chainConfig;
    this.connection = connection;
    this.openst = openst;

    this.web3 = this.connection.auxiliaryWeb3;
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
    // @todo Assert that gnosisSafeOwnerKey.address is in gnosisSafeArgs.owners list.

    // Retrieving the economy token's address from token rules.
    // const tokenRulesContract = new this.web3.eth.Contract(
    //   AbiBinProvider.getABI('TokenRules'),
    //   this.chainConfig.openst.tokenRules,
    // );
    // const economyTokenAddress = await tokenRulesContract.methods.call.token(
    //   this.openst.auxiliary.txOptions,
    // );
    const economyTokenAddress = '0x0000000000000000000000000000000000000001';

    const userHelper = new Helpers.User(
      this.chainConfig.openst.tokenHolderMasterCopy,
      this.chainConfig.openst.gnosisSafeMasterCopy,
      this.chainConfig.openst.recoveryMasterCopy,
      this.chainConfig.openst.createAndAddModules,
      economyTokenAddress,
      this.chainConfig.openst.tokenRules,
      this.chainConfig.openst.userWalletFactory,
      this.chainConfig.openst.proxyFactory,
      this.web3,
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
      this.web3, gnosisSafeProxy,
    );

    const modules = await gnosisSafeContractInteract.getModules();
    const recoveryProxy = modules[0];
    const recoveryModuleContractInteract = new ContractInteract.Recovery(
      this.web3, recoveryProxy,
    );

    const tokenHolderProxy = returnValues._tokenHolderProxy;
    const tokenHolderContractInteract = new ContractInteract.TokenHolder(
      this.web3, tokenHolderProxy,
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
