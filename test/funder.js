const axios = require('axios');
const Web3 = require('web3');
const Mosaic = require('@openstfoundation/mosaic.js');

const Account = require('../src/account');
const { MOSAIC_FAUCET_URL, ROPSTEN_FAUCET_URL, ROPSTEN_REFUND_ADDRESS } = require('./constants');
const shared = require('./shared');

const DEFAULT_PASSWORD = 'JLP_PASSWORD';
const ORIGIN_CHAIN_ID = 3;
const AUXILIARY_CHAIN_ID = 200;

const { BN } = Web3.utils;
const addOriginAccount = async (name, web3) => {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.origin[name] = {
    name,
    chainId: ORIGIN_CHAIN_ID,
    address: accountAddress,
  };
};

const addAuxiliaryAccount = async (name, web3) => {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.auxiliary[name] = {
    name,
    chainId: AUXILIARY_CHAIN_ID,
    address: accountAddress,
  };
};

/**
 * This funds an account from faucet.
 * @param {string} address Beneficiary address where funds will be added;
 * @param {string} chainId Chain Id of chain where beneficiary will get fund.
 * @return {Promise<string>} Transaction hash returned by faucet.
 */
const fundAccountFromMosaicFaucet = (address, chainId) => new Promise(
  (resolve, reject) => axios.post(MOSAIC_FAUCET_URL, {
    beneficiary: `${address}@${chainId}`,
  })
    .then(response => resolve(response.data))
    .catch(error => reject(error)),
);

const fundAccountFromRopstenFaucet = address => new Promise(
  (resolve, reject) => axios.post(ROPSTEN_FAUCET_URL, {
    toWhom: address,
  })
    .then(response => resolve(response.data))
    .catch(error => reject(error)),
);

const waitForFunding = async (
  originMosaicFaucetFundRequests,
  auxiliaryMosaicFaucetFundRequests,
  ropstenFaucetFundRequest,
  originWeb3,
  auxiliaryWeb3,
) => Promise.all([
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
  ]).then(receipts => ({
    receipts: {
      originFaucetReceipts: receipts[0],
      auxiliaryFaucetReceipts: receipts[1],
      ropstenFaucetReceipts: receipts[2],
    },
    txHashes: {
      originFaucetTXHashes: originTransactionHashes,
      auxiliaryFaucetTXHashes: auxiliaryTransactionHashes,
      ropstenFaucetTXHashes: ropstenTransactionHashes,
    },
  }));
});

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

const faucetTransactionDetails = async (
  originFaucetTXHashes,
  auxiliaryFaucetTXHashes,
  ropstenFaucetTXHashes,
  originWeb3,
  auxiliaryWeb3,
) => {
  // Get faucet address from one transaction.
  const originTransaction = originWeb3.eth.getTransaction(originFaucetTXHashes[0]);
  const auxiliaryTransaction = auxiliaryWeb3.eth.getTransaction(auxiliaryFaucetTXHashes[0]);
  const ropstenTransaction = originWeb3.eth.getTransaction(ropstenFaucetTXHashes[0]);

  return Promise.all(
    [
      originTransaction,
      auxiliaryTransaction,
      ropstenTransaction,
    ],
  ).then(transactions => ({
    originTransactions: {
      type: 'ERC20',
      faucetAddress: transactions[0].from,
      tokenAddress: transactions[0].to,

    },
    auxiliaryTransactions: {
      type: 'BaseToken',
      faucetAddress: transactions[1].from,
    },
    ropstenTransactions: {
      type: 'BaseToken',
      faucetAddress: ROPSTEN_REFUND_ADDRESS,
    },
  }));
};

const refundBaseTokenToFaucet = async (web3, from, faucetAddress) => {
  const balance = new BN(await web3.eth.getBalance(from));
  const gasPrice = new BN(await web3.eth.getGasPrice());
  const transactionFee = gasPrice.muln(21000);
  const refundAmount = balance.sub(transactionFee);
  if (refundAmount.gt(0)) {
    await web3.eth.sendTransaction(
      {
        to: faucetAddress,
        from,
        value: refundAmount,
        gas: 21000,

      },
    );
  }
};

const refundERC20TokenToFaucet = async (web3, from, faucetTransaction) => {
  const gasPrice = new BN(await web3.eth.getGasPrice());
  const token = new Mosaic.ContractInteract.EIP20Token(
    web3, faucetTransaction.tokenAddress,
  );
  const balance = await token.balanceOf(from);

  await token.contract.methods.transfer(
    faucetTransaction.faucetAddress,
    balance,
  ).send({
    from,
    gasPrice,
    gas: '100000',
  });
};

module.exports = {
  getTransactionReceiptMined,
  waitForFunding,
  fundAccountFromMosaicFaucet,
  fundAccountFromRopstenFaucet,
  addAuxiliaryAccount,
  addOriginAccount,
  faucetTransactionDetails,
  refundBaseTokenToFaucet,
  refundERC20TokenToFaucet,
  DEFAULT_PASSWORD,
};
