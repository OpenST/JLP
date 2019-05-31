const EIP20 = require('../../src/eip20');
const shared = require('../shared');
const Deployer = require('../../src/deployer');
const config = require('../config');

describe('OST Prime setup', () => {
  it('deploy eip20 token', async () => {
    const { chainConfig } = shared;
    const symbol = 'OST';
    const name = 'OST';
    const decimal = config.decimals;
    const totalSupply = '10000000000000000000000000000000000000';
    const eip20 = new EIP20(chainConfig, symbol, name, totalSupply, decimal);
    const eip20TokenAddress = await eip20.deployEIP20(shared.connection);
    chainConfig.update({
      eip20TokenAddress,
    });
  });
  it('deploy', async () => {
    // If this fails then all stake and mint would fail.
    const { chainConfig } = shared;

    const deployer = new Deployer(chainConfig, shared.connection);

    const contractInstances = await deployer.deployUtilityToken();

    const utilityBrandedTokenAddress = contractInstances.auxiliaryUtilityToken.address;
    chainConfig.update({
      originOrganizationAddress: contractInstances.originOrganization.address,
      auxiliaryOrganizationAddress: contractInstances.auxiliaryOrganization.address,
      originGatewayAddress: contractInstances.originGateway.address,
      auxiliaryCoGatewayAddress: contractInstances.auxiliaryCoGateway.address,
      auxiliaryUtilityTokenAddress: utilityBrandedTokenAddress,
    });
    chainConfig.write();
  });
});
