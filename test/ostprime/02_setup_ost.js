const EIP20 = require('../../src/eip20');
const shared = require('../shared');
const Deployer = require('../../src/deployer');

describe('complete setup', () => {
  it('deploy and setup', async () => {
    // If this fails then all stake and mint would fail.

    const { chainConfig, connection } = shared;
    const symbol = 'OST';
    const name = 'OST';
    const totalSupply = 10000000000;
    const decimals = 3;
    const eip20 = new EIP20(chainConfig, symbol, name, totalSupply, decimals);
    const eip20TokenAddress = await eip20.deployEIP20(connection);
    chainConfig.update({
      eip20TokenAddress,
    });

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
