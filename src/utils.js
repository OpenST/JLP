const Web3 = require('web3');

const { BN } = Web3.utils;

class Utils {
  randomNumberBetweenRange(minRedeemAmount, maxRedeemAmount) {
    // Generate a random number between maxRedeemAmount and minRedeemAmount.
    // If range is greater than JS Max safe integer, range is set to
    // MAX_SAFE_INTEGER.
    const range = maxRedeemAmount.sub(minRedeemAmount).lte(new BN(Number.MAX_SAFE_INTEGER))
      ? maxRedeemAmount.sub(minRedeemAmount).toNumber()
      : Number.MAX_SAFE_INTEGER;

    const randomNumber = new BN(Math.floor(Math.random() * range));

    return minRedeemAmount.add(randomNumber);
  }
}

module.exports = new Utils();
