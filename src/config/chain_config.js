const fs = require('fs');
const Mosaic = require('@openst/mosaic.js');

class ChainConfig {
  /**
   * Config file > ENV > default.
   * @param {string} [filePath] An optional config file to overwrite any defaults or env variables.
   */
  constructor(filePath) {
    this.originWeb3Provider = process.env.ORIGIN_WEB3_PROVIDER || 'ws://localhost:8547';
    this.auxiliaryWeb3Provider = process.env.AUXILIARY_WEB3_PROVIDER || 'ws://localhost:8548';
    this.originChainId = process.env.ORIGIN_CHAIN_ID || 3;
    this.auxiliaryChainId = process.env.AUXILIARY_CHAIN_ID || 200;
    this.simpleTokenAddress = process.env.SIMPLE_TOKEN_ADDRESS || '0xca954C91BE676cBC4D5Ab5F624b37402E5f0d957';
    this.originMasterKey = process.env.ORIGIN_MASTER_KEY || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
    this.auxiliaryMasterKey = process.env.AUXILIARY_MASTER_KEY || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
    this.originBurnerAddress = process.env.ORIGIN_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
    this.auxiliaryBurnerAddress = process.env.AUXILIARY_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
    this.originDeployerAddress = process.env.ORIGIN_DEPLOYER_ADDRESS || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
    this.auxiliaryDeployerAddress = process.env.AUXILIARY_DEPLOYER_ADDRESS || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
    this.originGasPrice = process.env.ORIGIN_GAS_PRICE || '13000000000';
    this.auxiliaryGasPrice = process.env.AUXILIARY_GAS_PRICE || '1000000000';
    this.workerAddress = process.env.WORKER_ADDRESS || '0x7F6A99881cC1ebcBc7209a636B4692133F8f9F36';
    this.workerPrivateKey = process.env.WORKER_PRIVATE_KEY || '0x5E882CADCDDBFDBB0E8058C08CB26CA5E303A57BBF6C316ACA88E3445CD82C43';
    this.password = process.env.PASSWORD || 'hunter2';
    this.stakes = {};
    this.stakeRequests = {};
    this.redeems = {};
    this.utilityBrandedTokens = [];
    this.openst = {};
    this.users = [];

    // If a file path is given, config from the file will overwrite config from ENV or default.
    this.parseFile(filePath);
  }

  parseFile(filePath) {
    if (fs.existsSync(filePath)) {
      const configFromFile = JSON.parse(fs.readFileSync(filePath));
      Object.assign(this, configFromFile);
    }
  }

  update(values) {
    return Object.assign(this, values);
  }

  write(filePath) {
    fs.writeFileSync(filePath, JSON.stringify(this, null, '  '));
  }

  toMosaic(connection) {
    const {
      originWeb3,
      auxiliaryWeb3,
    } = connection;

    const originChain = new Mosaic.Chain(
      originWeb3,
      {
        Organization: this.originOrganizationAddress,
        EIP20Gateway: this.originGatewayAddress,
        Anchor: this.originAnchorAddress,
        EIP20Token: this.eip20TokenAddress,
      },
    );
    const auxiliaryChain = new Mosaic.Chain(
      auxiliaryWeb3,
      {
        Organization: this.auxiliaryOrganizationAddress,
        EIP20CoGateway: this.auxiliaryCoGatewayAddress,
        Anchor: this.auxiliaryAnchorAddress,
        UtilityToken: this.auxiliaryUtilityTokenAddress,
        OSTPrime: this.auxiliaryOSTPrimeAddress || '0x05cd5fcd2aeca6aea1a554fae9fac76ce52dc5d6',
      },
    );

    return new Mosaic(originChain, auxiliaryChain);
  }

  toMosaicFromMessageHash(connection, messageHash) {
    const {
      originWeb3,
      auxiliaryWeb3,
    } = connection;

    const stake = this.stakes[messageHash];

    if (!stake) {
      throw new Error(`Stake request doesn't exist for message Hash ${messageHash}`);
    }

    const originChain = new Mosaic.Chain(
      originWeb3,
      {
        Organization: stake.originOrganizationAddress,
        EIP20Gateway: stake.originGatewayAddress,
        Anchor: this.originAnchorAddress,
        EIP20Token: this.eip20TokenAddress,
      },
    );
    const auxiliaryChain = new Mosaic.Chain(
      auxiliaryWeb3,
      {
        Organization: stake.auxiliaryOrganizationAddress,
        EIP20CoGateway: stake.auxiliaryCoGatewayAddress,
        Anchor: this.auxiliaryAnchorAddress,
        UtilityToken: stake.auxiliaryUtilityTokenAddress,
        OSTPrime: this.auxiliaryOSTPrimeAddress || '0x05cd5fcd2aeca6aea1a554fae9fac76ce52dc5d6',
      },
    );

    return new Mosaic(originChain, auxiliaryChain);
  }
}

module.exports = ChainConfig;
