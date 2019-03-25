// 'use strict';

const { assert } = require('chai');

const shared = require('../shared');
const OpenST = require('./../../src/openst');

describe('openst setup', async () => {
  it('Successfully performs setup of master copies and factory contracts', async () => {
    const { chainConfig } = shared;
    const { connection } = shared;

    const auxiliaryOrganizationAddress = chainConfig.utilitybrandedtokens[0].organizationAddress;
    const auxiliaryUtilityToken = chainConfig.utilitybrandedtokens[0].address;

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
