const { Facilitator: MosaicFacilitator, Utils, ContractInteract } = require('@openstfoundation/mosaic.js');

const logger = require('./logger');

class Facilitator {
  constructor(chainConfig) {
    this.chainConfig = chainConfig;
    this.mosaic = chainConfig.toMosaic();
    this.mosaicFacilitator = new MosaicFacilitator(this.mosaic);
  }

  async stake(staker, amount, beneficiary) {
    logger.info('Performing stake');
    const { hashLock, unlockSecret } = Utils.createSecretHashLock();

    logger.info('Hashlock, unlockSecret generated');

    const txOptions = {
      gasPrice: this.chainConfig.originGasPrice,
      from: staker,
    };

    const stakeRequest = {
      staker,
      beneficiary,
      amount,
      gasPrice: '0',
      gasLimit: '0',
      hashLock,
      txOptions,
      unlockSecret,
    };

    await this.mosaicFacilitator.stake(
      stakeRequest.staker,
      stakeRequest.amount,
      stakeRequest.beneficiary,
      stakeRequest.gasPrice,
      stakeRequest.gasLimit,
      stakeRequest.hashLock,
      stakeRequest.txOptions,
    );

    const gatewayInstance = new ContractInteract.EIP20Gateway(
      this.mosaic.origin.web3,
      this.mosaic.origin.contractAddresses.EIP20Gateway,
    );

    logger.info('Getting message hash from the gateway');
    const activeProcess = await gatewayInstance.contract.methods.getOutboxActiveProcess(
      staker,
    ).call();

    const messageHash = activeProcess.messageHash_;
    // FixMe In mosaic.js facilitator.stake should return messageHash. https://github.com/OpenSTFoundation/mosaic.js/issues/136

    logger.info('Stake successful');
    return { messageHash, unlockSecret };
  }
}

module.exports = Facilitator;
