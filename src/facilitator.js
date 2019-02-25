const { Facilitator: MosaicFacilitator, createSecretHashLock, AbiBinProvider } = require('@openstfoundation/mosaic.js');
const Web3 = require('web3');

const logger = require('./logger');
const EventDecoder = require('./event_decoder');

class Facilitator {
  constructor(chainConfig) {
    this.chainConfig = chainConfig;
    this.mosaic = chainConfig.toMosaic();
    this.mosaicFacilitator = new MosaicFacilitator(this.mosaic);
  }


  stake(staker, amount, beneficiary) {
    const { hashLock, unlockSecret } = createSecretHashLock();

    const txOptions = {
      gasPrice: this.chainConfig.originGasPrice,
      from: staker,
    };

    const stakeRequest = {
      staker,
      beneficiary,
      gasPrice: '0',
      gasLimit: '0',
      hashLock,
      txOptions,
      unlockSecret,
    };

    const receipt = this.mosaicFacilitator.stake(
      stakeRequest.staker,
      stakeRequest.beneficiary,
      stakeRequest.gasPrice,
      stakeRequest.gasLimit,
      stakeRequest.hashLock,
      stakeRequest.txOptions,
    );

    // FixMe In mosaic.js facilitator.stake should return messageHash. https://github.com/OpenSTFoundation/mosaic.js/issues/136
    const gatewayABI = new AbiBinProvider().getABI('EIP20Gateway');

    const decodedEvents = EventDecoder.perform(
      receipt,
      this.chainConfig.originGatewayAddress,
      gatewayABI,
    );

    const messageHash = decodedEvents.StakeIntentDeclared._messageHash;

    return {
      messageHash,
      unlockSecret,
    };
  }
}
