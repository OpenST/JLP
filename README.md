# Jean-Luc Picards Star Fleet training academy

## getting started (on testnet)

You'll need RPC access to a full node for Ropsten and a full node running the test sidechain.
If you need to set up your nodes, you can use the scripts in [chains](./chains) docker to run these nodes.  To install docker visit [https://docs.docker.com/install/](https://docs.docker.com/install/).

## Configuration

Copy the `config.json.dist` example to `config.json`.

⚠️ Other commands will overwrite your config, for example when they deploy contracts.
You may want to store different config files for different tests.

## EIP20 Token

If you do not have an EIP20 token, you must deploy one on origin.
Use the ei20 executable for that:

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

Prerequisite: `originGatewayAddress`  and `eip20TokenAddress` in config file.

```bash

node src/bin/facilitator.js src/bin/config.json stake stakerAddress stakeAmount beneficiaryAddress

```

 *  Replace `stakeAddress` with an address holding `eip20TokenAddress` balance.
 * Replace `stakeAmount` with number representing stake amount in wei.
 * Replace `beneficiaryAddress` with an address on auxiliary chain where token will be minted. 