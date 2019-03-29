// 'use strict';

const { assert } = require('chai');

const shared = require('../shared');
const OpenST = require('../../src/openst');

describe('Openst Setup', async () => {
  it('Setup of master copies and factory contracts', async () => {
    const { chainConfig, connection } = shared;
    const utilityBrandedTokenConfigs = chainConfig.utilityBrandedTokens;
    const utilityBrandedTokenConfig = utilityBrandedTokenConfigs[utilityBrandedTokenConfigs.length - 1];
    const { organizationAddress, address } = utilityBrandedTokenConfig;

    // Setup OpenST
    const openst = new OpenST(chainConfig, connection);
    await openst.setupOpenst(organizationAddress, address);
    assert.isNotNull(chainConfig.openst.tokenHolderMasterCopy, 'TokenHolder contract address should not be null.');
    assert.isNotNull(chainConfig.openst.gnosisSafeMasterCopy, 'GnosisSafe contract address should not be null.');
    assert.isNotNull(chainConfig.openst.recoveryMasterCopy, 'Recovery contract address should not be null.');
    assert.isNotNull(chainConfig.openst.userWalletFactory, 'UserWalletFactory contract address should not be null.');
    assert.isNotNull(chainConfig.openst.proxyFactory, 'ProxyFactory contract address should not be null.');
    assert.isNotNull(chainConfig.openst.createAndAddModules, 'CreateAndAddModules contract address should not be null.');
    assert.isNotNull(chainConfig.openst.tokenRules, 'TokenRules contract address should not be null.');
  });
});
