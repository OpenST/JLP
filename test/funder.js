const axios = require('axios');
const Account = require('../src/account');
const { MOSAIC_FAUCET_URL, ROPSTEN_FAUCET_URL } = require('./constants');
const shared = require('./shared');

const DEFAULT_PASSWORD = 'JLP_PASSWORD';
const ORIGIN_CHAIN_ID = 3;
const AUXILIARY_CHAIN_ID = 200;

async function addOriginAccount(name, web3) {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.origin[name] = {
    name,
    chainId: ORIGIN_CHAIN_ID,
    address: accountAddress,
  };
}

async function addAuxiliaryAccount(name, web3) {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.auxiliary[name] = {
    name,
    chainId: AUXILIARY_CHAIN_ID,
    address: accountAddress,
  };
}

/**
 * This funds an account from faucet.
 * @param {string} address Beneficiary address where funds will be added;
 * @param {string} chainId Chain Id of chain where beneficiary will get fund.
 * @return {Promise<string>} Transaction hash returned by faucet.
 */
function fundAccountFromMosaicFaucet(address, chainId) {
  return new Promise((resolve, reject) => axios.post(MOSAIC_FAUCET_URL, {
    beneficiary: `${address}@${chainId}`,
  })
    .then(response => resolve(response.data))
    .catch(error => reject(error)));
}

function fundAccountFromRopstenFaucet(address) {
  return new Promise((resolve, reject) => axios.post(ROPSTEN_FAUCET_URL, {
    toWhom: address,
  })
    .then(response => resolve(response.data))
    .catch(error => reject(error)));
}


async function waitForFunding(
  originMosaicFaucetFundRequests,
  auxiliaryMosaicFaucetFundRequests,
  ropstenFaucetFundRequest,
  originWeb3,
  auxiliaryWeb3,
) {
  return Promise.all([
    originMosaicFaucetFundRequests,
    auxiliaryMosaicFaucetFundRequests,
    ropstenFaucetFundRequest,
  ]).then((faucetResponse) => {
    const originTransactionHashes = faucetResponse[0].map(response => response.txHash);
    const auxiliaryTransactionHashes = faucetResponse[1].map(response => response.txHash);
    const ropstenTransactionHashes = faucetResponse[2].map(response => response.txHash);

    return Promise.all([
      originWeb3.eth.getTransactionReceiptMined(originTransactionHashes),
      auxiliaryWeb3.eth.getTransactionReceiptMined(auxiliaryTransactionHashes),
      originWeb3.eth.getTransactionReceiptMined(ropstenTransactionHashes),
    ]);
  });
}

function getTransactionReceiptMined(txHash, interval) {
  const self = this;
  const transactionReceiptAsync = (resolve, reject) => {
    self.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval || 500,
        );
      } else {
        resolve(receipt);
      }
    });
  };

  if (Array.isArray(txHash) && txHash.length > 0) {
    return Promise.all(txHash.map(
      oneTxHash => self.getTransactionReceiptMined(oneTxHash, interval),
    ));
  }
  if (typeof txHash === 'string') {
    return new Promise(transactionReceiptAsync);
  }
  throw new Error(`Invalid Type: ${txHash}`);
}

module.exports = {
  getTransactionReceiptMined,
  waitForFunding,
  fundAccountFromMosaicFaucet,
  fundAccountFromRopstenFaucet,
  addAuxiliaryAccount,
  addOriginAccount,
  DEFAULT_PASSWORD,
};
