const { Setup, ContractInteract } = require('@openst/mosaic.js');
const OpenST = require('@openst/openst.js');

const logger = require('./logger');

class Deployer {
  constructor(chainConfig, connection) {
    this.origin = {
      web3: connection.originWeb3,
      chainId: chainConfig.originChainId,
      deployer: connection.originAccount.address,
      txOptions: {
        gasPrice: chainConfig.originGasPrice,
      },
      token: chainConfig.eip20TokenAddress,
      baseToken: chainConfig.eip20TokenAddress,
      anchor: chainConfig.originAnchorAddress,
      burner: chainConfig.originBurnerAddress,
      masterKey: connection.originAccount.address,
    };

    this.auxiliary = {
      web3: connection.auxiliaryWeb3,
      chainId: chainConfig.auxiliaryChainId,
      deployer: connection.auxiliaryAccount.address,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
      },
      anchor: chainConfig.auxiliaryAnchorAddress,
      burner: chainConfig.auxiliaryBurnerAddress,
      masterKey: connection.auxiliaryAccount.address,
    };
  }

  /**
   * Deploys two anchors, one each on origin and auxiliary.
   *
   * @returns {Anchor[]} An array, where the first item is the origin anchor and the second item is
   *                     the auxiliary anchor.
   */
  async deployAnchors() {
    const [originOrganization, auxiliaryOrganization] = await this._deployOrganization();

    return Setup.anchors(
      this.origin.web3,
      this.auxiliary.web3,
      {
        remoteChainId: this.auxiliary.chainId,
        // Anchors use ring buffers to limit the number of state roots they store:
        maxStateRoots: '10',
        organization: originOrganization.address,
        organizationOwner: this.origin.masterKey,
        deployer: this.origin.deployer,
      },
      {
        // The chain id of the chain that is tracked by this anchor:
        remoteChainId: this.origin.chainId,
        // Anchors use ring buffers to limit the number of state roots they store:
        maxStateRoots: '10',
        organization: auxiliaryOrganization.address,
        organizationOwner: this.auxiliary.masterKey,
        deployer: this.auxiliary.deployer,
      },
      this.origin.txOptions,
      this.auxiliary.txOptions,
    );
  }

  /**
   * Deploys organizations on both chains, a utility token on auxiliary, and gateways on both
   * chains. Also sets the co-gateway in the utility token.
   *
   * @returns {Object} originOrganization, auxiliaryOrganization, originGateway, auxiliaryCoGateway,
   *                   and auxiliaryUtilityToken.
   */
  async deployUtilityToken() {
    logger.info('Deploying organization ');
    const [originOrganization, auxiliaryOrganization] = await this._deployOrganization();

    logger.info(`origin organization address: ${originOrganization.address}`);
    logger.info(`auxiliary organization address:  ${auxiliaryOrganization.address}`);

    logger.info('Deploying utility token ');
    const auxiliaryUtilityToken = await this._deployUtilityToken(auxiliaryOrganization);

    logger.info(`auxiliary utilityToken address ${auxiliaryUtilityToken.address}`);

    logger.info('Deploying gateways');
    const [originGateway, auxiliaryCoGateway] = await this._deployGateways(
      originOrganization,
      auxiliaryOrganization,
      auxiliaryUtilityToken,
    );

    logger.info(`origin gateway address ${originGateway.address}`);
    logger.info(`auxiliary coGateway address ${auxiliaryCoGateway.address}`);

    logger.info('Setting cogateway in utility token');
    // Fix me https://github.com/openst/mosaic.js/issues/129
    await auxiliaryUtilityToken.setCoGateway(
      auxiliaryCoGateway.address,
      this.auxiliary.txOptions,
    );

    logger.info('Deployment successful!!!');

    return {
      originOrganization,
      auxiliaryOrganization,
      originGateway,
      auxiliaryCoGateway,
      auxiliaryUtilityToken,
    };
  }

  async deployTokenRules(auxiliaryEIP20Token, auxiliaryOrganization) {
    logger.info('Deploying TokenRules');
    const tokenRulesSetup = new OpenST.Setup.TokenRules(this.auxiliary.web3);
    const response = await tokenRulesSetup.deploy(
      auxiliaryOrganization,
      auxiliaryEIP20Token,
      this.auxiliary.txOptions,
    );
    return response.receipt.contractAddress;
  }

  _deployOrganization() {
    return Setup.organizations(
      this.origin.web3,
      this.auxiliary.web3,
      {
        deployer: this.origin.deployer,
        owner: this.origin.masterKey,
        admin: this.origin.masterKey,
        workers: [],
        workerExpirationHeight: '0',
      },
      {
        deployer: this.auxiliary.deployer,
        owner: this.auxiliary.masterKey,
        admin: this.auxiliary.masterKey,
        workers: [],
        workerExpirationHeight: '0',
      },
      this.origin.txOptions,
      this.auxiliary.txOptions,
    );
  }

  async _deployGateways(
    originOrganization,
    auxiliaryOrganization,
    auxiliaryUtilityToken,
  ) {
    return Setup.gateways(
      this.origin.web3,
      this.auxiliary.web3,
      {
        token: this.origin.token,
        baseToken: this.origin.baseToken,
        stateRootProvider: this.origin.anchor,
        bounty: '0',
        organization: originOrganization.address,
        burner: this.origin.burner,
        deployer: this.origin.deployer,
        organizationOwner: this.origin.masterKey,
      },
      {
        utilityToken: auxiliaryUtilityToken.address,
        stateRootProvider: this.auxiliary.anchor,
        bounty: '0',
        organization: auxiliaryOrganization.address,
        burner: this.auxiliary.burner,
        deployer: this.auxiliary.deployer,
        organizationOwner: this.auxiliary.masterKey,
      },
      this.origin.txOptions,
      this.auxiliary.txOptions,
    );
  }

  async _deployUtilityToken(auxiliaryOrganization) {
    return ContractInteract.UtilityToken.deploy(
      this.auxiliary.web3,
      this.origin.token,
      'JLP',
      'JLP',
      '10',
      auxiliaryOrganization.address,
      this.auxiliary.txOptions,
    );
  }
}

module.exports = Deployer;
