class ChainConfig {
  static get originWeb3Provider() {
    return process.env.ORIGIN_WEB3_PROVIDER || 'http://localhost:8545';
  }

  static get auxiliaryWeb3Provider() {
    return process.env.AUXILIARY_WEB3_PROVIDER || 'http://localhost:8547';
  }

  static get originChainId() {
    return process.env.ORIGIN_CHAIN_ID || 3;
  }

  static get auxiliaryChainId() {
    return process.env.ORIGIN_CHAIN_ID || 200;
  }

  static get simpleTokenAddress() {
    return process.env.SIMPLE_TOKEN_ADDRESS || '0xca954C91BE676cBC4D5Ab5F624b37402E5f0d957';
  }

  static get originMasterKey() {
    return process.env.ORIGIN_MASTER_KEY || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
  }

  static get auxiliaryMasterKey() {
    return process.env.AUXILIARY_MASTER_KEY || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
  }

  static get originBurnerAddress() {
    return process.env.ORIGIN_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
  }

  static get auxiliaryBurnerAddress() {
    return process.env.AUXILIARY_BURNER_ADDRESS || '0x0000000000000000000000000000000000000000';
  }

  static get originDeployerAddress() {
    return process.env.ORIGIN_DEPLOYER_ADDRESS || '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116';
  }

  static get auxiliaryDeployerAddress() {
    return process.env.ORIGIN_DEPLOYER_ADDRESS || '0xe84e1244e8c74b5b2df317d3ecf2f8ffd1f134d8';
  }

  static get originGasPrice() {
    return process.env.ORIGIN_GAS_PRICE || '13000000000';
  }

  static get auxiliaryGasPrice() {
    return process.env.ORIGIN_GAS_PRICE || '1000000000';
  }
}

module.exports = ChainConfig;
