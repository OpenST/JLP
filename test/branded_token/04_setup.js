// 'use strict';

const shared = require('../shared');
const BTDeployer = require('../../src/bt_deployer.js');
const EIP20 = require('../../src/eip20.js');

describe('Setup Branded token', async () => {
  let btDeployer;

  // fixMe remove deployment of eip20token after ostprime stake and mint
  // tests are merged.
  it('deploy eip20 token', async () => {
    const { chainConfig } = shared;
    const symbol = 'JLP';
    const name = 'JLP';
    const decimal = 18;
    const totalSupply = '10000000000000000000000000000000000000';
    const eip20 = new EIP20(chainConfig, symbol, name, totalSupply, decimal);
    const eip20TokenAddress = await eip20.deployEIP20(shared.connection);
    chainConfig.update({
      eip20TokenAddress,
    });
  });
  it('setup branded token', async () => {
    const { chainConfig, connection } = shared;
    btDeployer = new BTDeployer(chainConfig, connection);

    const symbol = 'JLP';
    const name = 'JLP';
    const decimal = 18;
    // As per below conversion rate: 1 OST = 2 BT
    const conversionRate = 200000;
    const conversionDecimal = 5;

    const { originOrganization, brandedToken } = await btDeployer.deployBrandedToken(
      symbol,
      name,
      decimal,
      conversionRate,
      conversionDecimal,
    );

    chainConfig.originOrganizationAddress = originOrganization.address;
    chainConfig.brandedToken = {
      address: brandedToken.address,
      symbol,
      name,
      decimal,
      conversionRate,
      conversionDecimal,
      originOrganization: originOrganization.address,
      valueToken: chainConfig.eip20TokenAddress,
    };
  });

  it('setup utility branded token', async () => {
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    await btDeployer.deployUtilityBrandedToken();
  });
});
