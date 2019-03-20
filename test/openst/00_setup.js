// 'use strict';

const { assert } = require('chai');

const shared = require('../shared');
const OpenST = require('./../../src/openst');

describe('openst setup', async () => {
  it('Successfully performs setup of master copies and factory contracts', async () => {
    const { chainConfig } = shared;
    const { connection } = shared;

    const auxiliaryOrganizationAddress = '0x0000000000000000000000000000000000000001';
    const auxiliaryUtilityToken = '0x0000000000000000000000000000000000000002';

    // Setup OpenST
    const openst = new OpenST(chainConfig, connection);
    const setupData = await openst.setupOpenst(auxiliaryOrganizationAddress, auxiliaryUtilityToken);
    assert.isNotNull(setupData.tokenHolderMasterCopy, 'TokenHolder contract address should not be null.');
    assert.isNotNull(setupData.gnosisSafeMasterCopy, 'GnosisSafe contract address should not be null.');
    assert.isNotNull(setupData.recoveryMasterCopy, 'Recovery contract address should not be null.');
    assert.isNotNull(setupData.userWalletFactory, 'UserWalletFactory contract address should not be null.');
    assert.isNotNull(setupData.proxyFactory, 'ProxyFactory contract address should not be null.');
    assert.isNotNull(setupData.createAndAddModules, 'CreateAndAddModules contract address should not be null.');
    assert.isNotNull(setupData.tokenRules, 'TokenRules contract address should not be null.');
  });
});
