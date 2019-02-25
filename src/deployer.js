const { Setup, ContractInteract } = require('@openstfoundation/mosaic.js');
const Web3 = require('web3');

const logger = require('./logger');

class Deployer {
  constructor(chainConfig) {
    this.origin = {
      web3: new Web3(chainConfig.originWeb3Provider),
      chainId: chainConfig.originChainId,
      deployer: chainConfig.originDeployerAddress,
      txOptions: {
        gasPrice: chainConfig.originGasPrice,
      },
      token: chainConfig.eip20TokenAddress,
      baseToken: chainConfig.simpleTokenAddress,
      burner: chainConfig.originBurnerAddress,
      masterKey: chainConfig.originMasterKey,
    };

    this.auxiliary = {
      web3: new Web3(chainConfig.auxiliaryWeb3Provider),
      chainId: chainConfig.auxiliaryChainId,
      deployer: chainConfig.auxiliaryDeployerAddress,
      txOptions: {
        gasPrice: chainConfig.auxiliaryGasPrice,
      },
      burner: chainConfig.auxiliaryBurnerAddress,
      masterKey: chainConfig.auxiliaryMasterKey,
    };
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

  _deployAnchors(originOrganizationAddress, auxiliaryOrganizationAddress) {
    return Setup.anchors(
      this.origin.web3,
      this.auxiliary.web3,
      {
        remoteChainId: this.auxiliary.chainId,
        // Anchors use ring buffers to limit the number of state roots they store:
        maxStateRoots: '10',
        organization: originOrganizationAddress,
        organizationOwner: this.origin.masterKey,
        deployer: this.origin.deployer,
      },
      {
        // The chain id of the chain that is tracked by this anchor:
        remoteChainId: this.origin.chainId,
        // Anchors use ring buffers to limit the number of state roots they store:
        maxStateRoots: '10',
        organization: auxiliaryOrganizationAddress,
        organizationOwner: this.auxiliary.masterKey,
        deployer: this.auxiliary.deployer,
      },
      this.origin.txOptions,
      this.auxiliary.txOptions,
    );
  }

  async _deployGateways(
    originAnchor,
    auxiliaryAnchor,
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
        stateRootProvider: originAnchor.address,
        bounty: '0',
        organization: originOrganization.address,
        burner: this.origin.burner,
        deployer: this.origin.deployer,
        organizationOwner: this.origin.masterKey,
      },
      {
        utilityToken: auxiliaryUtilityToken.address,
        stateRootProvider: auxiliaryAnchor.address,
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

  async deployUtilityToken() {
    logger.info('Deploying organization ');

    const [originOrganization, auxiliaryOrganization] = await this._deployOrganization();

    logger.info(`origin organization address: ${originOrganization.address}`);
    logger.info(`auxiliary organization address:  ${auxiliaryOrganization.address}`);

    logger.info('Deploying anchor');
    const [originAnchor, auxiliaryAnchor] = await this._deployAnchors(
      originOrganization.address,
      auxiliaryOrganization.address,
    );

    logger.info(`origin anchor address ${originAnchor.address}`);
    logger.info(`auxiliary anchor address${auxiliaryAnchor.address}`);

    logger.info('Deploying utility token ');

    const auxiliaryUtilityToken = await this._deployUtilityToken(auxiliaryOrganization);

    logger.info(`auxiliary utilityToken address ${auxiliaryUtilityToken.address}`);

    logger.info('Deploying gateways');

    const [originGateway, auxiliaryCoGateway] = await this._deployGateways(
      originAnchor,
      auxiliaryAnchor,
      originOrganization,
      auxiliaryOrganization,
      auxiliaryUtilityToken,
    );

    logger.info(`origin gateway address ${originGateway.address}`);
    logger.info(`auxiliary coGateway address ${auxiliaryCoGateway.address}`);

    logger.info('Setting cogateway in utility token');
    // Fix me https://github.com/OpenSTFoundation/mosaic.js/issues/129
    await auxiliaryUtilityToken.setCoGateway(
      auxiliaryCoGateway.address,
      this.auxiliary.txOptions,
    );

    logger.info('Deployment successful!!!');

    return {
      originOrganization,
      auxiliaryOrganization,
      originAnchor,
      auxiliaryAnchor,
      originGateway,
      auxiliaryCoGateway,
      auxiliaryUtilityToken,
    };
  }
}

module.exports = Deployer;
