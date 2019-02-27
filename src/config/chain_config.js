const fs = require('fs');
const Web3 = require('web3');
const Mosaic = require('@openstfoundation/mosaic.js');

class ChainConfig {
  /**
   * Config file > ENV > default.
   * @param {string} [filePath] An optional config file to overwrite any defaults or env variables.
   */
  constructor(filePath) {
    this.originWeb3Provider = process.env.ORIGIN_WEB3_PROVIDER || 'http://localhost:8545';
    this.auxiliaryWeb3Provider = process.env.AUXILIARY_WEB3_PROVIDER || 'http://localhost:8547';
    this.originChainId = process.env.ORIGIN_CHAIN_ID || 3;
    this.auxiliaryChainId = process.env.ORIGIN_CHAIN_ID || 200;
    this.simpleTokenAddress = process.env.SIMPLE_TOKEN_ADDRESS || '0xca954C91BE676cBC4D5Ab5F624b37402E5f0d957';
    this.originMasterKey = process.env.ORIGIN_MASTER_KEY || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
    this.auxiliaryMasterKey = process.env.AUXILIARY_MASTER_KEY || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
    this.originBurnerAddress = process.env.ORIGIN_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
    this.auxiliaryBurnerAddress = process.env.AUXILIARY_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
    this.originDeployerAddress = process.env.ORIGIN_DEPLOYER_ADDRESS || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
    this.auxiliaryDeployerAddress = process.env.AUXILIARY_DEPLOYER_ADDRESS || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
    this.originGasPrice = process.env.ORIGIN_GAS_PRICE || '13000000000';
    this.auxiliaryGasPrice = process.env.AUXILIARY_GAS_PRICE || '1000000000';
    this.password = process.env.PASSWORD || 'hunter2';
    this.stakes = {};

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

  toMosaic() {
    const originChain = new Mosaic.Chain(
      new Web3(this.originWeb3Provider),
      {
        Organization: this.originOrganizationAddress,
        EIP20Gateway: this.originGatewayAddress,
        Anchor: this.originAnchorAddress,
        EIP20Token: this.eip20TokenAddress,
      },
    );
    const auxiliaryChain = new Mosaic.Chain(
      new Web3(this.auxiliaryWeb3Provider),
      {
        Organization: this.auxiliaryOrganizationAddress,
        EIP20CoGateway: this.auxiliaryCoGatewayAddress,
        Anchor: this.auxiliaryAnchorAddress,
        UtilityToken: this.auxiliaryUtilityTokenAddress,
        OSTPrime: this.auxiliaryOSTPrimeAddress,
      },
    );

    return new Mosaic(originChain, auxiliaryChain);
  }
}

module.exports = ChainConfig;
