const { Setup, ContractInteract } = require('@openstfoundation/mosaic.js');
const Web3 = require('web3');

class Deployer {
  constructor(ChainConfig) {
    this.origin = {
      web3: new Web3(ChainConfig.originWeb3Provider),
      chainId: ChainConfig.originChainId,
      deployer: ChainConfig.originDeployerAddress,
      txOptions: {
        gasPrice: ChainConfig.originGasPrice,
      },
      token: ChainConfig.simpleTokenAddress,
      baseToken: ChainConfig.simpleTokenAddress,
      burner: ChainConfig.originBurnerAddress,
      masterKey: ChainConfig.originMasterKey,
    };

    this.auxiliary = {
      web3: new Web3(ChainConfig.auxiliaryWeb3Provider),
      chainId: ChainConfig.auxiliaryChainId,
      deployer: ChainConfig.auxiliaryDeployerAddress,
      txOptions: {
        gasPrice: ChainConfig.auxiliaryGasPrice,
      },
      burner: ChainConfig.auxiliaryBurnerAddress,
      masterKey: ChainConfig.auxiliaryMasterKey,
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

  _deployAnchors(originOrganization, auxiliaryOrganization) {
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
    console.log('deploying organization  ');

    const [originOrganization, auxiliaryOrganization] = await this._deployOrganization();
    console.log('organization deployed origin  ', originOrganization.address);
    console.log('organization deployed auxiliary  ', auxiliaryOrganization.address);

    const [originAnchor, auxiliaryAnchor] = await this._deployAnchors(
      originOrganization,
      auxiliaryOrganization,
    );

    console.log('originAnchor deployed origin  ', originAnchor.address);
    console.log('auxiliaryAnchor deployed auxiliary  ', auxiliaryAnchor.address);

    const auxiliaryUtilityToken = await this._deployUtilityToken(auxiliaryOrganization);

    console.log('auxiliary utilityToken', auxiliaryUtilityToken.address);

    const [originGateway, auxiliaryCoGateway] = await this._deployGateways(
      originAnchor,
      auxiliaryAnchor,
      originOrganization,
      auxiliaryOrganization,
      auxiliaryUtilityToken,
    );

    // Fix me https://github.com/OpenSTFoundation/mosaic.js/issues/129
    await auxiliaryUtilityToken.setCoGateway(
      auxiliaryCoGateway.address,
      this.auxiliary.txOptions,
    );

    console.log('originGateway deployed origin  ', originGateway.address);
    console.log('auxiliaryCoGateway deployed auxiliary  ', auxiliaryCoGateway.address);

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
