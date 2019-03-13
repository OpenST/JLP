'use strict';

const connected = require('../connected');
const Deployer = require('../../src/deployer');

describe('Anchor', async () => {
  it('deploys anchors', async () => {
    await connected.run(
      async (connection) => {
        const deployer = new Deployer(connection.chainConfig, connection);
        const [originAnchor, auxiliaryAnchor] = await deployer.deployAnchors();

        connection.chainConfig.update({
          originAnchorAddress: originAnchor.address,
          auxiliaryAnchorAddress: auxiliaryAnchor.address,
        });
      },
    );
  });
});
