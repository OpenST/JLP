const { Facilitator: MosaicFacilitator, Utils, ContractInteract } = require('@openstfoundation/mosaic.js');

const logger = require('./logger');

class Facilitator {
  constructor(chainConfig, connection) {
    this.connection = connection;
    this.chainConfig = chainConfig;
    this.mosaic = chainConfig.toMosaic(connection);
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

    // FixMe https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const nextNonce = await gatewayInstance.contract.methods.getNonce(staker).call();
    const currentNonce = parseInt(nextNonce, 10) - 1;

    // FixMe In mosaic.js facilitator.stake should return messageHash. https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const messageHash = activeProcess.messageHash_;
    stakeRequest.messageHash = messageHash;
    stakeRequest.nonce = currentNonce.toString();

    const { stakes } = this.chainConfig;

    stakes[messageHash] = stakeRequest;

    logger.info('Stake successful');
    return { messageHash, unlockSecret, nonce: currentNonce };
  }

  async progressStake(messageHash) {
    logger.info('Stake progress started');
    const stakeRequest = this.chainConfig.stakes[messageHash];

    if (!stakeRequest) {
      console.log("stupid stupid");
      logger.error('No stake request found');
      return Promise.reject(new Error('No stake request found.'));
    }

    const txOptionAuxiliary = {
      gasPrice: this.chainConfig.auxiliaryGasPrice,
      from: this.connection.auxiliaryAccount.address,
    };

    const txOptionOrigin = {
      gasPrice: this.chainConfig.originGasPrice,
      from: this.connection.originAccount.address,
    };
    console.log("progress stake called");
    await this.mosaicFacilitator.progressStake(
      stakeRequest.staker,
      stakeRequest.amount,
      stakeRequest.beneficiary,
      stakeRequest.gasPrice,
      stakeRequest.gasLimit,
      stakeRequest.nonce.toString(),
      stakeRequest.hashLock,
      stakeRequest.unlockSecret,
      txOptionOrigin,
      txOptionAuxiliary,
    );

    const { stakes } = this.chainConfig;
    delete stakes[messageHash];

    logger.info('Stake progress success');
    return Promise.resolve(true);
  }

  async redeem(redeemer, amount, beneficiary) {
    const { hashLock, unlockSecret } = Utils.createSecretHashLock();

    logger.info('Hashlock, unlockSecret generated');
    const coGatewayInstance = new ContractInteract.EIP20CoGateway(
      this.mosaic.auxiliary.web3,
      this.mosaic.auxiliary.contractAddresses.EIP20CoGateway,
    );

    const txOptions = {
      gasPrice: this.chainConfig.auxiliaryGasPrice,
      from: redeemer,
    };

    const redeemRequest = {
      redeemer,
      beneficiary,
      amount,
      gasPrice: '0',
      gasLimit: '0',
      hashLock,
      txOptions,
      unlockSecret,
    };

    await this.mosaicFacilitator.redeem(
      redeemer,
      amount,
      beneficiary,
      redeemRequest.gasPrice,
      redeemRequest.gasLimit,
      hashLock,
      txOptions,
    );
    const nextNonce = await coGatewayInstance.contract.methods.getNonce(redeemer).call();
    const currentNonce = parseInt(nextNonce, 10) - 1;

    const activeProcess = await coGatewayInstance.contract.methods.getOutboxActiveProcess(
      redeemer,
    ).call();

    const messageHash = activeProcess.messageHash_;
    redeemRequest.messageHash = messageHash;
    redeemRequest.nonce = currentNonce.toString();

    const { redeems } = this.chainConfig;

    redeems[messageHash] = redeemRequest;

    logger.info('Redeem initiated');
    return { messageHash, hashLock };
  }

  async progressRedeem(messageHash) {
    logger.info('Redeem progress started');
    const redeemRequest = this.chainConfig.redeems[messageHash];

    // logger.info('redeemrequest :- ', redeemRequest);
    if (!redeemRequest) {
      logger.error('No stake request found');
      return Promise.reject(new Error('No stake request found.'));
    }

    const txOptionAuxiliary = {
      gasPrice: this.chainConfig.auxiliaryGasPrice,
      from: this.chainConfig.auxiliaryDeployerAddress,
    };

    const txOptionOrigin = {
      gasPrice: this.chainConfig.originGasPrice,
      from: this.chainConfig.originDeployerAddress,
    };

    await this.mosaicFacilitator.progressRedeem(
      redeemRequest.redeemer,
      redeemRequest.nonce.toString(),
      redeemRequest.beneficiary,
      redeemRequest.amount,
      redeemRequest.gasPrice,
      redeemRequest.gasLimit,
      redeemRequest.hashLock,
      redeemRequest.unlockSecret,
      txOptionAuxiliary, // FixMe https://github.com/OpenSTFoundation/mosaic.js/issues/141
      txOptionOrigin,
    );

    const { redeems } = this.chainConfig;
    delete redeems[messageHash];

    logger.info('Redeem progress success');

    return Promise.resolve(true);
  }
}

module.exports = Facilitator;
