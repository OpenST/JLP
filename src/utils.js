const Web3 = require('web3');

const { BN } = Web3.utils;

class Utils {
  randomNumberBetweenRange(maxRedeemAmount, minRedeemAmount) {

    // BN's max safe integer is 67108863 i.e (2 ** 26) - 1;
    const maxNumber = (2 ** 26) - 1;

    // Generate a random number between maxRedeemAmount and minRedeemAmount.
    // If range is greater than JS Max safe integer, range is set to
    // MAX_SAFE_INTEGER.
    const range = maxRedeemAmount.sub(minRedeemAmount).lten(maxNumber)
      ? maxRedeemAmount.sub(minRedeemAmount).toNumber()
      : maxNumber;

    const randomNumber = new BN(Math.floor(Math.random() * range));

    return minRedeemAmount.add(randomNumber);
  }
}

module.exports = new Utils();
