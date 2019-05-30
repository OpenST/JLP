'use strict';

const assert = require('assert');
const UserWallet = require('./user_wallet');

/**
 * The recovery owner signs intention for recovery initiate/abort/reset owner.
 *
 * @class RecoveryOwner
 */
class RecoveryOwner {
  /**
   * Creates an instance of RecoveryOwner.
   *
   * @param {Object} ownerKey Recovery owner key.
   * @param {UserWallet} userWallet User wallet to recovery an owner from.
   *
   * @memberof RecoveryOwner
   */
  constructor(
    ownerKey,
    userWallet,
  ) {
    assert(ownerKey && typeof ownerKey === 'object');
    assert(typeof ownerKey.address === 'string' || ownerKey.address instanceof String);
    this.ownerKey = ownerKey;

    assert(userWallet instanceof UserWallet);
    this.userWallet = userWallet;
  }

  /**
   * Signs an intent to initiate recovery process.
   *
   * @param {string} oldOwnerAddress Old owner address to recover from.
   * @param {string} newOwnerAddress New owner address to recover to.
   *
   * @returns {Object} A signature to initiate a recovery process.
   * @memberof RecoveryOwner
   */
  async signInitiateRecovery(
    oldOwnerAddress,
    newOwnerAddress,
  ) {
    assert(typeof oldOwnerAddress === 'string' || oldOwnerAddress instanceof String);
    assert(typeof newOwnerAddress === 'string' || newOwnerAddress instanceof String);

    const prevOwnerAddress = await this.userWallet.retrievePreviousOwner(
      oldOwnerAddress,
    );

    assert(typeof prevOwnerAddress === 'string' || prevOwnerAddress instanceof String);

    const recoveryModule = this.userWallet.delayedRecoveryModule;
    const initiateRecoveryData = recoveryModule.getInitiateRecoveryData(
      prevOwnerAddress,
      oldOwnerAddress,
      newOwnerAddress,
    );

    const signature = await this.ownerKey.signEIP712TypedData(
      initiateRecoveryData,
    );

    return signature;
  }
}

module.exports = RecoveryOwner;
