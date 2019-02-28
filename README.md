# Jean-Luc Picards Star Fleet training academy

## getting started (on testnet)

You'll need RPC access to a full node for Ropsten and a full node running the test sidechain.
If you need to set up your nodes, you can use the scripts in [chains](./chains) docker to run these nodes.  To install docker visit [https://docs.docker.com/install/](https://docs.docker.com/install/).

## Configuration

Copy the `config.json.dist` example to `config.json`.

⚠️ You have to put in your `{origin,auxiliary}masterKey`!
You also may want to change other parameters.
If you don't put in the `{origin/auxiliary}deployerAddress`, you need to run the `refill` command to generate and fund them (see below).

⚠️ Other commands will overwrite your config, for example when they deploy contracts.
You may want to store different config files for different tests.

## Funding of Addresses

Prerequisite: `originMasterKey` and `auxiliaryMasterKey` in your config file have funds.

To ensure that all the addresses in your config file are funded, you can use the
`refill` executable. It will transfer funds from the `{origin,auxiliary}MasterKey` addresses
to the addresses in your config file to refill them to a balance of 1 (currency of the chain).

```bash
# Help:
./src/bin/refill -h

# Refill addresses
./src/bin/refill.js config.json
```

## EIP20 Token

If you do not have an EIP20 token, you must deploy one on origin.
Use the eip20 executable for that:

```bash
# Help:
./src/bin/eip20 -h

# Deploy JLP token:
./src/bin/eip20.js config.json JLP "Jean-Luc Picard Token" 10000000000000000000000000 18
```

It will write `eip20TokenAddress` to your config file.

## Mosaic Deployment

Prerequisite: `eip20TokenAddress` in your config file.

If you want to deploy gateways, use the `deploy` executable:

```bash
# Help:
./src/bin/deploy.js -h

# Deployment:
./src/bin/deploy.js config.json
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

It will keep on running and anchoring until you kill it.

## Stake Facilitator 

Prerequisite: `originGatewayAddress`  and `eip20TokenAddress` in your config file.

```bash

node src/bin/facilitator.js stake path_to_config.json stakerAddress stakeAmount beneficiaryAddress

```

 *  Replace `path_to_config.json` with a file location where config must be stored. 
 *  Replace `stakeAddress` with an address holding `eip20TokenAddress` balance.
 * Replace `stakeAmount` with number representing stake amount in wei.
 * Replace `beneficiaryAddress` with an address on auxiliary chain where token will be minted. 
 
 It will write stake request details in the config file, which will be needed for progress stake.
 
 

## Progress Stake Facilitator 

Prerequisite:
 1. `originGatewayAddress` , `eip20TokenAddress` and `stakeRequest` generated in previous step in the config file.
 2. Run anchor state root after stake facilitator step.

```bash

node src/bin/facilitator.js progressStake path_to_config.json messageHash

```

 *  Replace `messageHash` with a hash generated in stake facilitator step. 
. 
 
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
