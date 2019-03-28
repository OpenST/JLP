// 'use strict';

const { assert } = require('chai');

const shared = require('../shared');
const OpenST = require('../../src/openst');

describe('openst setup', async () => {
  it('Setup of master copies and factory contracts', async () => {
    const { chainConfig, connection } = shared;
    const auxiliaryOrganizationAddress = chainConfig.utilityBrandedTokens[0].organizationAddress;
    const auxiliaryUtilityToken = chainConfig.utilityBrandedTokens[0].address;

    // Setup OpenST
    const openst = new OpenST(chainConfig, connection);
    await openst.setupOpenst(auxiliaryOrganizationAddress, auxiliaryUtilityToken);
    assert.isNotNull(chainConfig.openst.tokenHolderMasterCopy, 'TokenHolder contract address should not be null.');
    assert.isNotNull(chainConfig.openst.gnosisSafeMasterCopy, 'GnosisSafe contract address should not be null.');
    assert.isNotNull(chainConfig.openst.recoveryMasterCopy, 'Recovery contract address should not be null.');
    assert.isNotNull(chainConfig.openst.userWalletFactory, 'UserWalletFactory contract address should not be null.');
    assert.isNotNull(chainConfig.openst.proxyFactory, 'ProxyFactory contract address should not be null.');
    assert.isNotNull(chainConfig.openst.createAndAddModules, 'CreateAndAddModules contract address should not be null.');
    assert.isNotNull(chainConfig.openst.tokenRules, 'TokenRules contract address should not be null.');
  });
});
