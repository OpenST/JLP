const fs = require('fs');
const ChainConfig = require('../config/chain_config');
const Deployer = require('./deployer');

const deployer = new Deployer(ChainConfig);
const fileName = 'contracts.json';

const numberOfDeployment = 2;

deployContracts = async () => {
  const allDeployedContracts = [];

  for (let deployCount = 1; deployCount <= numberOfDeployment; deployCount += 1) {
    const contractInstances = await deployer.deployUtilityToken();
    const contracts = {
      originOrganization: contractInstances.originOrganization.address,
      auxiliaryOrganization: contractInstances.auxiliaryOrganization.address,
      originAnchor: contractInstances.originAnchor.address,
      auxiliaryAnchor: contractInstances.originAnchor.address,
      originGateway: contractInstances.originAnchor.address,
      auxiliaryCoGateway: contractInstances.auxiliaryCoGateway.address,
      auxiliaryUtilityToken: contractInstances.auxiliaryUtilityToken.address,
    };

    allDeployedContracts.push(contracts);
  }

  return allDeployedContracts;
};

deployContracts().then((contracts) => {
  fs.writeFile(fileName, JSON.stringify(contracts), (err, data) => {
    if (err) console.log('error  ', err);
    else console.log('written successfully');
  });
});
