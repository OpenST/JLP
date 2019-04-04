// 'use strict';

const assert = require('assert');
const BN = require('bn.js');
const { ContractInteract } = require('@openst/openst.js');

const shared = require('../shared');
const OpenST = require('../../src/openst');

describe('PricerRule', async () => {
  it('deploys pricer rule', async () => {
    const { chainConfig, connection } = shared;

    const auxiliaryEIP20Token = chainConfig.utilityBrandedTokens[chainConfig.utilityBrandedTokens.length - 1].address;
    const baseCurrencyCode = 'USD';
    const conversionRate = 3;
    const conversionRateDecimals = 3;
    const requiredPriceOracleDecimals = 3;
    const openST = new OpenST(chainConfig, connection);
    const { pricerRuleData } = await openST.deployPricerRule(
      auxiliaryEIP20Token,
      baseCurrencyCode,
      conversionRate,
      conversionRateDecimals,
      requiredPriceOracleDecimals,
    );

    const { auxiliaryWeb3 } = connection;
    const pricerRule = await new ContractInteract.PricerRule(
      auxiliaryWeb3,
      pricerRuleData[baseCurrencyCode].address,
    );

    const contractConversionRate = new BN(
      await pricerRule.contract.methods.conversionRateFromBaseCurrencyToToken().call(),
    );
    assert.strictEqual(contractConversionRate.eq(new BN(conversionRate)), true);

    const contractConversionRateDecimals = new BN(
      await pricerRule.contract.methods.conversionRateDecimalsFromBaseCurrencyToToken().call(),
    );
    assert.strictEqual(contractConversionRateDecimals.eq(new BN(conversionRateDecimals)), true);

    const contractRequiredPriceOracleDecimals = new BN(
      await pricerRule.contract.methods.requiredPriceOracleDecimals().call(),
    );
    assert.strictEqual(
      contractRequiredPriceOracleDecimals.eq(
        new BN(requiredPriceOracleDecimals),
      ),
      true,
    );

    const contractBaseCurrencyCode = await pricerRule.contract.methods.baseCurrencyCode().call();
    assert.strictEqual(contractBaseCurrencyCode, auxiliaryWeb3.utils.toHex(baseCurrencyCode));
  });
});
