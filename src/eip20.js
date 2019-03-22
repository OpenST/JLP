const fs = require('fs');
const EIP20Token = require('../contracts/EIP20Token');
const logger = require('./logger');

class EIP20 {
  constructor(chainConfig, symbol, name, totalSupply, decimals) {
    this.chainConfig = chainConfig;
    this.symbol = symbol;
    this.name = name;
    this.totalSupply = totalSupply;
    this.decimals = decimals;
  }

  parseFile(filePath) {
    if (fs.existsSync(filePath)) {
      const configFromFile = JSON.parse(fs.readFileSync(filePath));
      Object.assign(this, configFromFile);
    }
  }

  async deployEIP20(connection) {
    const {
      originWeb3,
      originAccount,
    } = connection;
    const txOptions = {
      gasPrice: this.chainConfig.originGasPrice,
      from: originAccount.address,
    };
    const contract = new originWeb3.eth.Contract(EIP20Token.abi, undefined, txOptions);
    let eip20TokenAddress;
    await contract
      .deploy(
        {
          data: EIP20Token.bin,
          arguments: [
            this.symbol,
            this.name,
            this.totalSupply,
            this.decimals,
          ],
        },
        txOptions,
      )
      .send(txOptions)
      .on('receipt', (receipt) => {
        logger.info(`Deployed EIP20 token "${this.symbol}" to ${receipt.contractAddress}`);
        eip20TokenAddress = receipt.contractAddress;
        this.chainConfig.update({
          eip20TokenAddress,
        });
      })
      .on('error', (error) => {
        logger.error(`Could not deploy EIP20Token: ${error}`);
        process.exit(1);
      });

    return eip20TokenAddress;
  }
}

module.exports = EIP20;
