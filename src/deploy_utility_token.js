const Web3 = require('web3');
const config = require('../config');
const UtilityToken = require('../contracts/UtilityToken');

const web3 = new Web3(config.origin.rpc);

const txOptions = {
  from: config.origin.from,
  gasPrice: config.origin.gasPrice,
  gasLimit: config.origin.gasLimit,
};

const contract = new web3.eth.Contract(UtilityToken.abi, undefined, txOptions);

const deploy = async () => {
  await contract
    .deploy(
      {
        data: UtilityToken.bin,
        arguments: [
          'JLP',
          'Jean-Luc Picard Token',
          '10000000000000000000000000', // 10 mio.
          '18',
        ],
      },
      txOptions,
    )
    .send(txOptions, (error, transactionHash) => {
      console.log('error:', error, 'transaction hash:', transactionHash);
    })
    .on('error', (error) => {
      console.error(`Could not deploy UtilityToken: ${error}`);
    })
    .on('receipt', (receipt) => {
      console.log(
        'EIP20Token Contract Address:',
        receipt.contractAddress,
      );
    });
};

deploy();
