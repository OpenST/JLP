/**
 * @typedef {Object} FundingReceipts
 *
 * @property {Array<Object>} originFaucetReceipts Array of receipts for
 *                                                origin chain addresses funded
 *                                                from mosaic faucet.
 * @property {Array<Object>} auxiliaryFaucetReceipts Array of receipts for
 *                                                   auxiliary chain addresses
 *                                                   funded from mosaic faucet.
 * @property {Array<Object>} ropstenFaucetReceipts Array of receipts for
 *                                                 origin chain addresses funded
 *                                                 from ropsten faucet
 */

/**
 * @typedef {Object} FundingTransactionHashes
 *
 * @property {Array<string>} originFaucetTXHashes Array of transaction
 *                                                hashes for origin chain
 *                                                addresses funded from
 *                                                mosaic faucet.
 * @property {Array<string>} auxiliaryFaucetTXHashes Array of transaction
 *                                                   hashes for auxiliary
 *                                                   chain addresses funded
 *                                                   from mosaic faucet.
 * @property {Array<string>} ropstenFaucetTXHashes Array of transaction hashes
 *                                                 for auxiliary for origin
 *                                                 chain addresses funded
 *                                                 from ropsten faucet
 */


/**
 * @typedef {Object} FundingDetails
 *
 * @property {FundingReceipts} Receipts of all the faucet.
 * @property {FundingTransactionHashes} transactionHashes of all the faucet.
 */

/**
 * @typedef {Object} ERC20RefundTransaction
 * @property {string}  type Type of fund, either ERC20 or base coin.
 * @property {string} faucetAddress Address of faucet.
 * @property {string} tokenAddress Address of ERC20 contract.
 */

/**
 * @typedef {Object} BaseCoinRefundTransaction
 * @property {string}  type Type of fund.
 * @property {string} faucetAddress Address of faucet.
 */

/**
 *
 * @typedef {Object} RefundTransactionDetails
 * @property {ERC20RefundTransaction} originTransactions Return to faucet
 *                                                        transaction detail for
 *                                                        origin chain.
 * @property {BaseCoinRefundTransaction} auxiliaryTransactions Return to faucet
 *                                                        transaction detail for
 *                                                        auxiliary chain.
 * @property {BaseCoinRefundTransaction} ropstenTransactions Return to faucet
 *                                                        transaction detail for
 *                                                        the ropsten.
 */

const axios = require('axios');
const Web3 = require('web3');
const Mosaic = require('@openst/mosaic.js');

const Account = require('../src/account');
const { MOSAIC_FAUCET_URL, ROPSTEN_FAUCET_URL, ROPSTEN_REFUND_ADDRESS } = require('./constants');
const shared = require('./shared');

const DEFAULT_PASSWORD = 'JLP_PASSWORD';
const ORIGIN_CHAIN_ID = 3;
const AUXILIARY_CHAIN_ID = 200;

const { BN } = Web3.utils;

/**
 * This creates an account for origin chain and save it in shared object.
 * @param {string} name Account identifier.
 * @param {We3} web3 origin Web3 instance.
 */
const addOriginAccount = async (name, web3) => {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.origin[name] = {
    name,
    chainId: ORIGIN_CHAIN_ID,
    address: accountAddress,
  };
};

/**
 * This creates an account for auxiliary chain and save it in shared object.
 * @param {string} name Account identifier.
 * @param {We3} web3 auxiliary Web3 instance.
 */
const addAuxiliaryAccount = async (name, web3) => {
  const accountAddress = await Account.create(name, web3, DEFAULT_PASSWORD);
  shared.accounts.auxiliary[name] = {
    name,
    chainId: AUXILIARY_CHAIN_ID,
    address: accountAddress,
  };
};

/**
 * This funds an account from mosaic faucet.
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

/**
 * This funds an account from ropsten faucet.
 * @param {string} address Beneficiary address where funds will be added;
 * @return {Promise<string>} Transaction hash returned by faucet.
 */
const fundAccountFromRopstenFaucet = address => new Promise(
  (resolve, reject) => axios.post(ROPSTEN_FAUCET_URL, {
    toWhom: address,
  })
    .then(response => resolve(response.data))
    .catch(error => reject(error)),
);

/**
 * This methods takes various faucet fund request as a promise and waits
 * until all the promises are not resolved.
 * @param {Array<Promise>} originMosaicFaucetFundRequests
 * @param {Array<Promise>} auxiliaryMosaicFaucetFundRequests
 * @param {Array<Promise>} ropstenFaucetFundRequest
 * @param {Web3} originWeb3
 * @param {Web3} auxiliaryWeb3
 * @return {Promise<FundingDetails>}
 */
const waitForFunding = (
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

/**
 * This method returns receipt for a given transaction hash. It waits till
 * transaction is mined.
 * @param {Array | string} txHash Single or many transaction hashes.
 * @param {Number=} interval Polling interval in milli second.
 */
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

/**
 * This method captures detail about funding transaction from fauce like faucet
 * address, eip20 token address etc. which is used to return remaining fund
 * to faucet.
 * @param {Array<string>} originFaucetTXHashes Transaction hashes of funding
 *                                             transaction by mosaic faucet
 *                                             on the origin chain.
 * @param {Array<string>} auxiliaryFaucetTXHashes Transaction hashes of funding
 *                                                transaction by mosaic faucet
 *                                                on the auxiliary chain.
 * @param {Array<string>} ropstenFaucetTXHashes Transaction hashes of funding
 *                                              transaction by ropsten faucet
 *                                              on the origin chain.
 * @param {Web3} originWeb3 Web3 instance pointing to the origin chain.
 * @param auxiliaryWeb3 Web3 instance pointing to the auxiliary chain.
 * @return {Promise<RefundTransactionDetails>} Details of refund transaction
 *                                            to mosaic and ropsten faucet.
 */
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

/**
 * This method returns all the base token balance to faucet address from the
 * `from` address.
 * @param {Web3} web3 Instance of web3.
 * @param {string} from Address from which fund will be transferred.
 * @param {string} faucetAddress Address of the faucet.
 */
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

/**
 * This method returns all the ERC20 token balance to faucet address from
 * the `from` address;
 * @param {Web3} web3 Instance of web3.
 * @param {string} from Address from which fund will be transferred.
 * @param {ERC20RefundTransaction} faucetTransaction Return transaction
 * details for ERC20.
 */
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
