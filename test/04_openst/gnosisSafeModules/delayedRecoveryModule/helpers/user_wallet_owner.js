'use strict';

const assert = require('assert');

const UserWallet = require('./user_wallet');

/**
 * The user wallet owner signs an intent of different operations of the wallet.
 *
 * @class UserWalletOwner
 */
class UserWalletOwner {
  /**
   * Creates an instance of UserWalletOwner.
   *
   * @param {Object} ownerKey User wallet owner key.
   * @param {UserWallet} userWallet A user wallet to control.
   *
   * @memberof UserWalletOwner
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
   * Signs a session authorization intent.
   *
   * @param {string} sessionKeyAddress Session key's address.
   * @param {number} sessionKeySpendingLimit Session key's spending limit.
   * @param {number} sessionKeyExpirationHeight Session key's expiration height.
   *
   * @returns {Object} A session authorization intent's signature.
   *
   * @memberof UserWalletOwner
   */
  async signAuthorizeSession(
    sessionKeyAddress,
    sessionKeySpendingLimit,
    sessionKeyExpirationHeight,
  ) {
    assert(typeof sessionKeyAddress === 'string' || sessionKeyAddress instanceof String);
    assert(typeof sessionKeySpendingLimit === 'number');
    assert(typeof sessionKeyExpirationHeight === 'number');

    const authorizeSessionData = this.userWallet.tokenHolder.getAuthorizeSessionExecutableData(
      sessionKeyAddress,
      sessionKeySpendingLimit,
      sessionKeyExpirationHeight,
    );

    const signature = await this._sign(
      this.userWallet.tokenHolder.address, authorizeSessionData,
    );

    return signature;
  }

  /**
   * Signs a logout intent.
   *
   * @returns {Object} A session logout intent's signature.
   *
   * @memberof UserWalletOwner
   */
  async signLogout() {
    const logoutData = this.userWallet.tokenHolder.getLogoutExecutableData();

    const signature = await this._sign(
      this.userWallet.tokenHolder.address, logoutData,
    );

    return signature;
  }

  async _sign(to, data) {
    const nonce = await this.userWallet.gnosisSafe.getNonce();

    const safeTxData = this.userWallet.gnosisSafe.getSafeTxData(
      to,
      0, // value
      data,
      0, // operation
      0, // safeTxGas
      0, // dataGas
      0, // gasPrice
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      nonce,
    );

    const signature = await this.ownerKey.signEIP712TypedData(
      safeTxData,
    );

    return signature;
  }
}

module.exports = UserWalletOwner;
