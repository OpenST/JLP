'use strict';

const assert = require('assert');

const utils = require('../../../../utils');

const UserWallet = require('./user_wallet');

/**
 * The recovery controller initiates/executes/aborts recovery processes.
 * In addition, it allows to reset a recovery owner address.
 *
 * @class RecoveryController
 */
class RecoveryController {
  /**
   * Creates an instance of DelayedRecoveryController.
   *
   * @param {string} recoveryControllerAddress The address to initiate recovery
   *                                           processes.
   * @param {UserWallet} userWallet Controlling user wallet instance.
   *
   * @memberof RecoveryController
   */
  constructor(
    recoveryControllerAddress,
    userWallet,
  ) {
    assert(typeof recoveryControllerAddress === 'string'
           || recoveryControllerAddress instanceof String);

    this.recoveryControllerAddress = recoveryControllerAddress;

    assert(userWallet instanceof UserWallet);
    this.userWallet = userWallet;
  }

  /**
   * Initiates a recovery process.
   * Retrieves the previous owner by traversing owners list of gnosis safe.
   *
   * @param {string} oldOwnerAddress An old owner address to recover from.
   * @param {string} newOwnerAddress New owner address to recover to.
   * @param {Object} signature  Signature of a user wallet's recovery owner to
   *                            initiate a recovery process.
   *
   * @returns {number} The block number that initiation of the recovery happens.
   *
   * @memberof RecoveryController
   */
  async initiateRecovery(
    oldOwnerAddress,
    newOwnerAddress,
    signature,
  ) {
    const prevOwnerAddress = await this.userWallet.retrievePreviousOwner(
      oldOwnerAddress,
    );

    const txReceipt = await this.userWallet.delayedRecoveryModule.initiateRecovery(
      prevOwnerAddress, oldOwnerAddress, newOwnerAddress,
      signature.r, signature.s, signature.v,
      { from: this.recoveryControllerAddress },
    );

    return txReceipt.blockNumber;
  }

  /**
   * Executes a recovery process.
   * Retrieves the previous owner by traversing owners list of gnosis safe.
   *
   * @param {string} oldOwnerAddress An old owner address to recover from.
   * @param {string} newOwnerAddress New owner address to recover to.
   *
   * @memberof RecoveryController
   */
  async executeRecovery(
    oldOwnerAddress,
    newOwnerAddress,
  ) {
    const prevOwnerAddress = await this.userWallet.retrievePreviousOwner(
      oldOwnerAddress,
    );

    const { web3 } = this.userWallet.openst.auxiliary;

    const recoveryModule = this.userWallet.delayedRecoveryModule;
    const { executionBlockHeight } = await recoveryModule.activeRecoveryInfo();

    await utils.waitBlockNumber(web3, executionBlockHeight);

    await this.userWallet.delayedRecoveryModule.executeRecovery(
      prevOwnerAddress, oldOwnerAddress, newOwnerAddress,
      { from: this.recoveryControllerAddress },
    );
  }
}

module.exports = RecoveryController;
