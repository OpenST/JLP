// 'use strict';

const shared = require('../shared');
const Deployer = require('../../src/deployer');

describe('Anchor', async () => {
  it('deploys anchors', async () => {
    const deployer = new Deployer(shared.chainConfig, shared.connection);
    const [originAnchor, auxiliaryAnchor] = await deployer.deployAnchors();

    shared.chainConfig.update({
      originAnchorAddress: originAnchor.address,
      auxiliaryAnchorAddress: auxiliaryAnchor.address,
    });
  });
});
