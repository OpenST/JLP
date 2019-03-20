// 'use strict';

const assert = require('assert');

const { ContractInteract } = require('@openst/openst.js');
const shared = require('../shared');
const OpenST = require('../../src/openst');

describe('PricerRule', async () => {
  it('deploys pricer rule', async () => {
    const { chainConfig } = shared;
    const { connection } = shared;

    // Add utilityBrandedTokens to config.
    chainConfig.update({
      utilityBrandedTokens: [{
        address: '0x0000000000000000000000000000000000000001',
      }],
    });

    const auxiliaryEIP20Token = '0x0000000000000000000000000000000000000001';
    const baseCurrencyCode = 'USD';
    const conversionRate = 3;
    const conversionRateDecimals = 3;
    const requiredPriceOracleDecimals = 3;
    const openST = new OpenST(chainConfig, shared.connection);
    const pricerRuleAddress = await openST.deployPricerRule(
      auxiliaryEIP20Token,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
    );

    const pricerRule = new ContractInteract.PricerRule(connection.auxiliaryWeb3, pricerRuleAddress);

    const contractConversionRate = await pricerRule.conversionRateFromBaseCurrencyToToken().call();

    assert.strictEqual(contractConversionRate.eq(conversionRate), true);

    const contractConversionRateDecimals = await pricerRule.conversionRateDecimalsFromBaseCurrencyToToken().call();

    assert.strictEqual(contractConversionRateDecimals.eq(conversionRateDecimals), true);

    const contractRequiredPriceOracleDecimals = await pricerRule.requiredPriceOracleDecimals().call();

    assert.strictEqual(contractRequiredPriceOracleDecimals.eq(requiredPriceOracleDecimals), true);

    const contractBaseCurrencyCode = await pricerRule.baseCurrencyCode().call();

    assert.strictEqual(contractBaseCurrencyCode.eq(baseCurrencyCode), true);
  });
});
