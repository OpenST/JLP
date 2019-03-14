# 🚀 Jean-Luc Picards Star Fleet training academy

## getting started (on testnet)

You'll need RPC access to a full node for Ropsten and a full node running the test sidechain.
If you need to set up your nodes, you can use [mosaic-chains](https://github.com/OpenST/mosaic-chains) to run these nodes.
You need docker. To install docker visit [https://docs.docker.com/install/](https://docs.docker.com/install/).

All transactions will be signed locally.
You must generate and fund addresses on origin and auxiliary in order to use JLP!
See [Accounts](#accounts) for details.

## Configuration

Copy the `config.json.dist` example to `config.json`.

⚠️ You may need to change the web3 provider ports.

⚠️ You have to put in your `{origin,auxiliary}masterKey`!
You also may want to change other parameters.
If you don't put in the `{origin/auxiliary}deployerAddress`, you need to run the `refill` command to generate and fund them (see below).

⚠️ Other commands will overwrite your config, for example when they deploy contracts.
You may want to store different config files for different tests.

## Accounts

JLP will use accounts that you locally keep to send signed transactions to ethereum nodes.
This means that you need to provide local accounts.
If you don't have a local account, you can use `account.js` to generate one.
`account.js` always writes to `./accounts.json` and JLP will always read the accounts from that location.
`account.js` will backup any existing file.

Accounts are stored as encrypted Web3 key-vaults.

```bash
# Help:
./src/bin/account.js -h

# Create a new origin account
./src/bin/account.js origin

# Create a new auxiliary account
./src/bin/account.js auxiliary
```

## EIP20 Token

If you do not have an EIP20 token, you must deploy one on origin.
Use the eip20 executable for that:

```bash
# Help:
./src/bin/eip20.js -h

# Deploy JLP token:
./src/bin/eip20.js config.json JLP "Jean-Luc Picard Token" 10000000000000000000000000 18
```

It will write `eip20TokenAddress` to your config file.

## Mosaic Deployment

Prerequisite: `eip20TokenAddress` in your config file.

If you want to deploy contracts to the chains, use the `deploy` executable:

```bash
# Help:
./src/bin/deploy.js -h

# Deployment of utility token with gateways (requires anchor addresses in your config):
./src/bin/deploy.js utilityToken config.json

# If you don't have anchor addresses, yet, you must deploy anchors first.
# Deployment of anchors:
./src/bin/deploy.js anchors config.json
```

It will write contract addresses to your config file.

## Anchoring

Prerequisite: `originAnchorAddress` and/or `auxiliaryAnchorAddress` in your config file.

If you want to anchor state roots, use the `anchor` executable:

```bash
# Help:
./src/bin/anchor.js -h

# Anchors origin state roots to auxiliary, with a 20 block delay:
./src/bin/anchor.js config.json auxiliary 20
```

It will keep on running and anchoring until you send `SIGINT` (`^C`).

## Stake Facilitator 

Prerequisite: `originGatewayAddress`  and `eip20TokenAddress` in your config file.

```bash

node src/bin/facilitator.js stake path_to_config.json stakerAddress stakeAmount beneficiaryAddress

```

 * Replace `path_to_config.json` with a file location where config must be stored. 
 * Replace `stakeAddress` with an address holding `eip20TokenAddress` balance.
 * Replace `stakeAmount` with number representing stake amount in wei.
 * Replace `beneficiaryAddress` with an address on auxiliary chain where token will be minted. 
 
 It will write stake request details in the config file, which will be needed for progress stake.
 
 

## Progress Stake Facilitator 

Prerequisite:
 1. `originGatewayAddress` , `eip20TokenAddress` and `stakes` generated in previous step in the config file.
 2. Run anchor state root after stake facilitator step.

```bash

node src/bin/facilitator.js progressStake path_to_config.json messageHash

```

* Replace `path_to_config.json` with a file location where config must be stored.
* Replace `messageHash` with a hash generated in stake facilitator step. 

 
 This step will mint tokens in auxiliary chain.

## Wrapping and Unwrapping OST

Prerequisite: `auxiliaryOSTPrimeAddress` in your config file.

In order to wrap OST in OSTPrime or to unwrap OST from OSTPrime, use the `ost` executable:

```bash
# Help:
./src/bin/deploy.js -h

# Wrap OST
node src/bin/ost.js wrap <config.json> <address> <amount>

# Unwrap OST
node src/bin/ost.js unwrap <config.json> <address> <amount>

```

* Replace `config.json` with the path to the configuration file.
* Replace `address` with an unlocked address with OST on the auxiliary chain to wrap or unwrap.
* Replace `amount` with an amount of OST to wrap or unwrap in wei.

In wrapping, it will transfer OST to the OSTPrime contract from `address`.

In unwrapping, it will transfer OST from the OSTPrime contract to `address`.


## Setup Branded Token

Prerequisite: `eip20TokenAddress`in config file. Optionally, you can run EIP20 Token setup step mentioned above. 

```bash
# Help: 
node src/bin/bt.js --help

node src/bin/bt.js setupBrandedToken <config.json> <symbol> <name> <decimal> <conversionRate> <conversionDecimal>

```

## Setup Utility Branded Token

Prerequisite: Branded token config in config file.

```bash
# Help: 
node src/bin/bt.js --help

node src/bin/bt.js setupUtilityBrandedToken <config.json>

```

## Setup GatewayComposer

Prerequisite: `eip20TokenAddress` and `brandedToken` address in the config file.

```bash
# Help: 
node src/bin/bt.js --help

node src/bin/bt.js gatewayComposer path_to_config.json

```

* Replace `path_to_config.json` with a file location where config is stored.

## Request Stake for BT

Prerequisite: `eip20TokenAddress` and `brandedToken` address in the config file.

```bash
# Help: 
node src/bin/bt.js --help

node src/bin/bt.js requestStake path_to_config.json originGatewayAddress stakeVT beneficiary gasPrice gasLimit

```

* Replace `path_to_config.json` with a file location where config is stored.
* Replace `originGatewayAddress` with the address of origin gateway contract address.
* Replace `stakeVT` with amount of value tokens to be staked.
* Replace `beneficiary` with the address for minting tokens.
* Replace `gasPrice` with the number representing the gas price for the request.
* Replace `gasLimit` with the number representing the gas limit for the request.

## Accept Stake for BT

Prerequisite: `stakeRequestHash` in `stakeRequests` in the config file. 

```bash
# Help: 
node src/bin/bt.js --help

node src/bin/bt.js acceptStake path_to_config.json stakeRequestHash

```

* Replace `path_to_config.json` with a file location where config is stored.
* Replace `stakeRequestHash` with the hash received from `requestStake` process.

## Redeem Facilitator

Prerequiste:
1. `auxiliaryGatewayAddress` and `eip20TokenAddress` generated in your config file.

```bash

node src/bin/facilitator.js redeem path_to_config.json redeemerAddress redeemAmount beneficiaryAddress

```

 * Replace `path_to_config.json` with a file location where config is stored. 
 * Replace `redeemerAddress` with an address holding `eip20TokenAddress` balance.
 * Replace `redeemAmount` with number representing redeem amount in wei.
 * Replace `beneficiaryAddress` with an address on auxiliary chain where token will be minted. 

It will write redeem request details in the config file, which will be needed for progress redeem(Next step).

## Progress Redeem Facilitator

1. `auxiliaryGatewayAddress` , `eip20TokenAddress` and `redeems` generated in previous step in the config file.
2. Run anchor state root after `redeem` facilitator step.

```bash

node src/bin/facilitator.js progressRedeem path_to_config.json messageHash

```

  * `messageHash` generated in redeem facilitator step.
  
 ## Deploy TokenRules
 
 Prerequisite: `eip20Token` and `organization` in your config file.
 These contracts  should be deployed on auxiliary chain.
 
 ```bash
 # Help:
 node ./src/bin/tokenrules.js --help
 
 # Deploy TokenRules token:
 node ./src/bin/tokenrules.js config.json eip20Token organization
 ```
 
 It will write `tokenRulesAddress` to your config file.
 
 * Replace `config.json` with the path to the configuration file.
 * Replace `eip20Token` with eip20Token address.
 * Replace `organization` with an organization contract address. 
 
 ## Register Rule to TokenRules
  
  Prerequisite: `tokenRules` and `worker` in your config file.
  
  ```bash
  # Help:
  node ./src/bin/registerRule.js --help
  
  # Register rule to TokenRules:
  node ./src/bin/registerRule.js config.json ruleName ruleAddress ruleAbi
  ```
  
* Replace `config.json` with the path to the configuration file.
* Replace `ruleName` with name of the rule.
* Replace `ruleAddress` with address of the rule. 
* Replace `ruleAbi` with abi of the rule. 

## Create User

Prerequisite: 
* `tokenHolderMasterCopy` master copy in your config file.
* `gnosisSafeMasterCopy` master copy in your config file.
* `recoveryMasterCopy` master copy in your config file.
* `ProxyFactory` contract address in your config file.
* `userWalletFactory` contract address in your config file.
* `proxyFactory` contract address in your config file.
* `createAndAddModules` contract address in your config file.
* `tokenRules` contract address in your config file.
* `recoveryOwnerAddress` recoveryOwner address in your config file.
* `recoveryControllerAddress` recoveryController address in your config file.
* `recoveryBlockDelay` recovery block delay in your config file.

```bash
# Help:
node ./src/bin/create_user.js --help
  
# Create User:
node ./src/bin/create_user.js <config.json> <eip20Token> <owners> <threshold> <sessionKeys> <sessionKeySpendingLimits> <sessionKeyExpirationHeights>
```

* Replace `config.json` with the path to the configuration file.
* Replace `eip20Token` with the UBT address of the economy.
* Replace `owners` with comma separated owner addresses.
* Replace `threshold` with gnosis requirement. 
* Replace `sessionKeys` comma separated session keys. 
* Replace `sessionKeySpendingLimits` comma separated spending limits corresponding to session keys. 
* Replace `sessionKeyExpirationHeights` comma separated expiration heights corresponding to session keys. 

## Tests

To run the tests run `npm run test`.

If you don't have a `./test/config_init.json` file, it will be copied with the default values.
If you need a different config, you should update the file before running the tests again.

For more details see [the test README](./test/README.md).

## Helpers

**Send**

Send base tokens from the local account to an address.

```bash
# Help:
node ./src/bin/send.js --help

# Send funds:
node ./src/bin/send.js config.json auxiliary 0xab3778bfa8edc02c290ccf192a5bbe3bba21e9a2 26346717769700000000
```

**Balance**

Get the base token balance of a local account.

```bash
# Help:
node ./src/bin/balance.js --help

# Check balance:
node ./src/bin/balance.js config.json auxiliary
```
  
