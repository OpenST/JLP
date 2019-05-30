'use strict';

const assert = require('assert');

/**
 * The user wallet composes a gnosis safe, a delayed recovery module and
 * a token holder and gives facade interface for a user wallet operations, like
 * authorizeSession, logout, etc.
 *
 * @class UserWallet
 */
class UserWallet {
  /**
   * Creates an instance of UserWallet.
   *
   * @param {Object} gnosisSafe
   * @param {Object} delayedRecoveryModule
   * @param {Object} tokenHolder
   * @param {Object} openst
   *
   * @memberof UserWallet
   */
  constructor(
    gnosisSafe,
    delayedRecoveryModule,
    tokenHolder,
    openst,
  ) {
    assert(gnosisSafe && typeof gnosisSafe === 'object');
    this.gnosisSafe = gnosisSafe;

    assert(delayedRecoveryModule && typeof delayedRecoveryModule === 'object');
    this.delayedRecoveryModule = delayedRecoveryModule;

    assert(tokenHolder && typeof tokenHolder === 'object');
    this.tokenHolder = tokenHolder;

    assert(openst && typeof openst === 'object');
    this.openst = openst;
  }

  /**
   * Authorizes session.
   *
   * @param {string} sessionKeyAddress Session key's address.
   * @param {number} sessionKeySpendingLimit Session key's spending limit.
   * @param {number} sessionKeyExpirationHeight Session key's expiration height.
   * @param {Object} signatures Session authorization intent's signature.
   *
   * @memberof UserWallet
   */
  async authorizeSession(
    sessionKeyAddress,
    sessionKeySpendingLimit,
    sessionKeyExpirationHeight,
    signatures,
  ) {
    await this._execTransaction(
      this.tokenHolder.address,
      this.tokenHolder.getAuthorizeSessionExecutableData(
        sessionKeyAddress,
        sessionKeySpendingLimit,
        sessionKeyExpirationHeight,
      ),
      signatures,
    );
  }

  /**
   * Log outs from all active sessions.
   *
   * @memberof UserWallet
   */
  async logout(signatures) {
    await this._execTransaction(
      this.tokenHolder.address,
      this.tokenHolder.getLogoutExecutableData(),
      signatures,
    );
  }

  /**
   * Retrieves the previous owner of the specified owner in owners list.
   *
   * @param {string} ownerAddress Owner's address to find its previous owner.
   * @returns {string} Previous owner address.
   *
   * @todo Assert that the specified owner address exists in list.
   *
   * @memberof UserWallet
   */
  async retrievePreviousOwner(ownerAddress) {
    assert(typeof ownerAddress === 'string' || ownerAddress instanceof String);

    const SENTINEL_OWNER = '0x0000000000000000000000000000000000000001';

    const owners = await this.gnosisSafe.getOwners();
    let prevOwnerAddress = SENTINEL_OWNER;
    for (let i = 0; i < owners.length; i += 1) {
      if (owners[i] === ownerAddress) {
        break;
      }
      prevOwnerAddress = owners[i];
    }

    return prevOwnerAddress;
  }

  static _constructSignatureBytes(signatures) {
    let signatureBytes = '0x';
    for (let i = 0; i < signatures.length; i += 1) {
      const sig = signatures[i];
      signatureBytes += (
        sig.r.toString('hex').substr(2)
        + sig.s.toString('hex').substr(2)
        + sig.v.toString('hex').substr(2)
      );
    }

    return signatureBytes;
  }

  async _execTransaction(to, data, signatures) {
    const signatureBytes = UserWallet._constructSignatureBytes(signatures);

    await this.gnosisSafe.execTransaction(
      to,
      0, // value
      data,
      0, // operation
      0, // safeTxGas
      0, // dataGas
      0, // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      signatureBytes,
      this.openst.auxiliary.txOptions,
    );
  }
}

module.exports = UserWallet;
