const Web3 = require('web3');
const Mosaic = require('@openstfoundation/mosaic.js');
const config = require('../config');

const originWeb3 = new Web3(config.origin.rpc);
const auxiliaryWeb3 = new Web3(config.auxiliary.rpc);

const originTxOptions = {
  from: config.origin.from,
  gasPrice: config.origin.gasPrice,
  gasLimit: config.origin.gasLimit,
};
const auxiliaryTxOptions = {
  from: config.origin.from,
  gasPrice: config.origin.gasPrice,
  gasLimit: config.origin.gasLimit,
};

const deployOrigin = async () => {
  const originOrganization = await Mosaic.ContractInteract.Organization.setup(
    originWeb3,
    {
      deployer: config.origin.from,
      owner: config.origin.from,
      admin: config.origin.from,
      workers: [],
      workerExpirationHeight: '0',
    },
    originTxOptions,
  );

  console.log('Origin Organization:', originOrganization.address);
};

const deployAuxiliary = async () => {
  const auxiliaryOrganization = await Mosaic.ContractInteract.Organization.setup(
    auxiliaryWeb3,
    {
      deployer: config.auxiliary.from,
      owner: config.auxiliary.from,
      admin: config.auxiliary.from,
      workers: [],
      workerExpirationHeight: '0',
    },
    auxiliaryTxOptions,
  );

  console.log('Auxiliary Organization:', auxiliaryOrganization.address);
};

deployOrigin();
deployAuxiliary();
