// 'use strict';

const shared = require('../shared');
const BTDeployer = require('../../src/bt_deployer.js');

describe('Setup Branded token', async () => {
  let btDeployer;

  it('set branded token', async () => {
    const { chainConfig, connection } = shared;

    btDeployer = new BTDeployer(chainConfig, connection);

    const symbol = 'JLP';
    const name = 'JLP';
    const decimal = 18;
    // As per below conversion rate: 1 OST = 2 BT
    const conversionRate = 200000;
    const conversionDecimal = 5;

    const { originOrganization, brandedToken } = btDeployer.deployBrandedToken(
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
      valueToken: this.origin.token,
    };
  });

  it('setup utility branded token', async () => {
    // This will throw if anything fails, which will result in test failure.
    // Hence no need of explicit assertion.
    await btDeployer.deployUtilityBrandedToken();
  });
});
