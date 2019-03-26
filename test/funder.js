/**
 * @typedef {Object} FundingReceipts
 *
 * @property {Array<Object>} originERC20FaucetReceipts Array of receipts for
 *                                                origin chain addresses funded
 *                                                from mosaic faucet.
 * @property {Array<Object>} auxiliaryFaucetReceipts Array of receipts for
 *                                                   auxiliary chain addresses
 *                                                   funded from mosaic faucet.
 * @property {Array<Object>} originBaseCoinFaucetReceipts Array of receipts for
 *                                                 origin chain addresses funded
 *                                                 from origin faucet
 */

/**
 * @typedef {Object} FundingTransactionHashes
 *
 * @property {Array<string>} originERC20FaucetTXHashes Array of transaction
 *                                                hashes for origin chain
 *                                                addresses funded from
 *                                                mosaic faucet.
 * @property {Array<string>} auxiliaryFaucetTXHashes Array of transaction
 *                                                   hashes for auxiliary
 *                                                   chain addresses funded
 *                                                   from mosaic faucet.
 * @property {Array<string>} originBaseCoinFaucetTXHashes Array of transaction hashes
 *                                                 for auxiliary for origin
 *                                                 chain addresses funded
 *                                                 from origin faucet
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
 * @property {ERC20RefundTransaction} originERC20Transactions Return to faucet
 *                                                        transaction detail for
 *                                                        origin chain.
 * @property {BaseCoinRefundTransaction} auxiliaryTransactions Return to faucet
 *                                                        transaction detail for
 *                                                        auxiliary chain.
 * @property {BaseCoinRefundTransaction} originBaseCoinTransactions Return to faucet
 *                                                        transaction detail for
 *                                                        the origin.
 */

const axios = require('axios');
const Web3 = require('web3');
const Mosaic = require('@openst/mosaic.js');

const Account = require('../src/account');
const logger = require('../src/logger');
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
const fundAccountFromMosaicFaucet = async (address, chainId) => {
  const response = await axios.post(MOSAIC_FAUCET_URL, {
    beneficiary: `${address}@${chainId}`,
  });
  logger.info(`Transaction hash for chain ${chainId} faucet: ${response.data.txHash}`);
  return response.data.txHash;
};

/**
 * This funds an account from ropsten faucet.
 * @param {string} address Beneficiary address where funds will be added;
 * @return {Promise<string>} Transaction hash returned by faucet.
 */
const fundAccountFromRopstenFaucet = async (address) => {
  const response = await axios.post(ROPSTEN_FAUCET_URL, {
    toWhom: address,
  });
  logger.info(`Transaction hash for ropsten faucet: ${response.data.txHash}`);
  return response.data.txHash;
};

/**
 * This methods takes various faucet fund request as a promise and waits
 * until all the promises are not resolved.
 * @param {Promise} originERC20FundRequests
 * @param {Promise} auxiliaryMosaicFaucetFundRequests
 * @param {Promise} originBaseCoinFundRequests
 * @param {Web3} originWeb3
 * @param {Web3} auxiliaryWeb3
 * @return {Promise<FundingDetails>}
 */
const waitForFunding = (
  originERC20FundRequests,
  auxiliaryMosaicFaucetFundRequests,
  originBaseCoinFundRequests,
  originWeb3,
  auxiliaryWeb3,
) => Promise.all([
  originERC20FundRequests,
  auxiliaryMosaicFaucetFundRequests,
  originBaseCoinFundRequests,
]).then((faucetResponse) => {
  logger.info('Received funding transaction hashed, waiting for the receipts');
  const originERC20TransactionHashes = faucetResponse[0];
  const auxiliaryTransactionHashes = faucetResponse[1];
  const originBaseCoinTransactionHashes = faucetResponse[2];

  return Promise.all([
    originWeb3.eth.getTransactionReceiptMined(originERC20TransactionHashes),
    auxiliaryWeb3.eth.getTransactionReceiptMined(auxiliaryTransactionHashes),
    originWeb3.eth.getTransactionReceiptMined(originBaseCoinTransactionHashes),
  ]).then(receipts => ({
    receipts: {
      originERC20FaucetReceipts: receipts[0],
      auxiliaryFaucetReceipts: receipts[1],
      originBaseCoinFaucetReceipts: receipts[2],
    },
    txHashes: {
      originERC20FaucetTXHashes: originERC20TransactionHashes,
      auxiliaryFaucetTXHashes: auxiliaryTransactionHashes,
      originBaseCoinFaucetTXHashes: originBaseCoinTransactionHashes,
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
  logger.info(`Waiting for the receipt for txhash ${txHash}`);
  const self = this;
  const transactionReceiptAsync = (resolve, reject) => {
    self.getTransactionReceipt(txHash, (error, receipt) => {
      logger.info(`Waiting for the receipt for txhash ${txHash}`);
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval || 500,
        );
      } else {
        logger.info(`Received receipt for txHash ${txHash}`);
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
 * @param {Array<string>} originERC20FaucetTXHashes Transaction hashes of funding
 *                                             transaction by mosaic faucet
 *                                             on the origin chain.
 * @param {Array<string>} auxiliaryFaucetTXHashes Transaction hashes of funding
 *                                                transaction by mosaic faucet
 *                                                on the auxiliary chain.
 * @param {Array<string>} originBaseCoinFaucetTXHashes Transaction hashes of funding
 *                                              transaction by base coin faucet
 *                                              on the origin chain.
 * @param {Web3} originWeb3 Web3 instance pointing to the origin chain.
 * @param auxiliaryWeb3 Web3 instance pointing to the auxiliary chain.
 * @return {Promise<RefundTransactionDetails>} Details of refund transaction
 *                                            to mosaic and base coin faucet.
 */
const faucetTransactionDetails = async (
  originERC20FaucetTXHashes,
  auxiliaryFaucetTXHashes,
  originBaseCoinFaucetTXHashes,
  originWeb3,
  auxiliaryWeb3,
) => {
  // Get faucet address from one transaction.
  const originERC20Transaction = originWeb3.eth.getTransaction(originERC20FaucetTXHashes[0]);
  const auxiliaryTransaction = auxiliaryWeb3.eth.getTransaction(auxiliaryFaucetTXHashes[0]);
  const originBaseCoinTransaction = originWeb3.eth.getTransaction(originBaseCoinFaucetTXHashes[0]);

  return Promise.all(
    [
      originERC20Transaction,
      auxiliaryTransaction,
      originBaseCoinTransaction,
    ],
  ).then(transactions => ({
    originERC20Transactions: {
      type: 'ERC20',
      faucetAddress: transactions[0].from,
      tokenAddress: transactions[0].to,

    },
    auxiliaryTransactions: {
      type: 'BaseCoin',
      faucetAddress: transactions[1].from,
    },
    originBaseCoinTransactions: {
      type: 'BaseCoin',
      faucetAddress: ROPSTEN_REFUND_ADDRESS,
    },
  }));
};

/**
 * This method returns all the base token balance to faucet address from a
 * given address.
 * @param {Web3} web3 Instance of web3.
 * @param {string} from Address from which fund will be transferred.
 * @param {string} faucetAddress Address of the faucet.
 */
const refundBaseCoinToFaucet = async (web3, from, faucetAddress) => {
  logger.info('Refunding base coin to faucet');
  const balance = new BN(await web3.eth.getBalance(from));
  const gasPrice = new BN(await web3.eth.getGasPrice());
  const transactionFee = gasPrice.muln(21000);
  const refundAmount = balance.sub(transactionFee);
  logger.info(`Refund amount is ${refundAmount}`);
  if (refundAmount.gt(0)) {
    await web3.eth.sendTransaction(
      {
        to: faucetAddress,
        from,
        value: refundAmount,
        gas: 21000,
        gasPrice,
      },
    );
  }
  logger.info('Refund of base coin is done');
};

/**
 * This method returns all the ERC20 token balance to faucet address from
 * a given address;
 * @param {Web3} web3 Instance of web3.
 * @param {string} from Address from which fund will be transferred.
 * @param {ERC20RefundTransaction} faucetTransaction Return transaction
 * details for ERC20.
 */
const refundERC20TokenToFaucet = async (web3, from, faucetTransaction) => {
  logger.info('Refunding ERC20 fund to faucet');
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
  logger.info('Refund of ERC20 fund is done');
};

module.exports = {
  getTransactionReceiptMined,
  waitForFunding,
  fundAccountFromMosaicFaucet,
  fundAccountFromRopstenFaucet,
  addAuxiliaryAccount,
  addOriginAccount,
  faucetTransactionDetails,
  refundBaseCoinToFaucet,
  refundERC20TokenToFaucet,
  DEFAULT_PASSWORD,
};
