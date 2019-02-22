const Web3 = require('web3');
const BN = require('bn.js');
const Mosaic = require('@openstfoundation/mosaic.js');

const EIP20Token = require('../contracts/EIP20Token');
const UtilityToken = require('../contracts/UtilityToken');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const GAS_PRICE_GWEI = new BN(13);
const GWEI_FACTOR = new BN(1e9);
const GAS_PRICE = GAS_PRICE_GWEI.mul(GWEI_FACTOR);

const config = {
  token: {
    symbol: 'JLP',
    name: 'Jean-Luc Picard Token',
    totalSupply: '10000000000000000000000000', // 10 mio.
    decimals: '18',
  },
  origin: {
    rpc: 'http://localhost:8545',
    txOptions: {
      from: '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116',
      gasPrice: GAS_PRICE,
      gas: '7000000',
    },
    from: '0x6d4e5f5ca54b88fdb68a5d0e6ea5aa3869f88116',
    gasPrice: '0x5B9ACA00',
    gasLimit: '7000000',
    chainId: '3',
    contractAddresses: {
      OST: '0xca954C91BE676cBC4D5Ab5F624b37402E5f0d957',
    },
  },
  auxiliary: {
    rpc: 'http://localhost:8546',
    txOptions: {
      from: '0x48dbe0b823ba5e4a3114925242b75c5ae2041f62',
      gasPrice: '0x5B9ACA00',
      gas: '7000000',
    },
    from: '0x48dbe0b823ba5e4a3114925242b75c5ae2041f62',
    gasPrice: '0x5B9ACA00',
    gasLimit: '7000000',
    chainId: '1409',
    contractAddresses: {
      OSTPrime: '0x10f7af624395843eF6d5c1ca2272B648C35b5B94',
    },
  },
};

const originWeb3 = new Web3(config.origin.rpc);
const auxiliaryWeb3 = new Web3(config.auxiliary.rpc);

const deployToken = () => {
  const contract = new originWeb3.eth.Contract(EIP20Token.abi, undefined, config.origin.txOptions);

  return contract
    .deploy(
      {
        data: EIP20Token.bin,
        arguments: [
          config.token.symbol,
          config.token.name,
          config.token.totalSupply,
          config.token.decimals,
        ],
      },
      config.origin.txOptions,
    )
    .send(config.origin.txOptions)
    .on('error', (error) => {
      console.error(`Could not deploy EIP20Token: ${error}`);
    });
};

const deployUtilityToken = (tokenAddress, organizationAddress) => {
  const contract = new auxiliaryWeb3.eth.Contract(
    UtilityToken.abi, undefined, config.auxiliary.txOptions,
  );

  return contract
    .deploy(
      {
        data: UtilityToken.bin,
        arguments: [
          tokenAddress,
          config.token.symbol,
          config.token.name,
          config.token.decimals,
          organizationAddress,
        ],
      },
      config.auxiliary.txOptions,
    )
    .send(config.auxiliary.txOptions)
    .on('error', (error) => {
      console.error(`Could not deploy UtilityToken: ${error}`);
    });
};

const deployOrganization = (web3, from, txOptions) => Mosaic.ContractInteract.Organization.setup(
  web3,
  {
    deployer: from,
    owner: from,
    admin: from,
    workers: [],
    workerExpirationHeight: '0',
  },
  txOptions,
);

const deployOriginAnchor = organizationAddress => Mosaic.ContractInteract.Anchor.setup(
  originWeb3,
  auxiliaryWeb3,
  {
    remoteChainId: config.auxiliary.chainId,
    maxStateRoots: '20',
    organization: organizationAddress,
    deployer: config.origin.from,
    organizationOwner: config.origin.from,
  },
  config.origin.txOptions,
);

const deployAuxiliaryAnchor = (
  coAnchorAddress, organizationAddress,
) => Mosaic.ContractInteract.Anchor.setup(
  auxiliaryWeb3,
  originWeb3,
  {
    remoteChainId: config.origin.chainId,
    maxStateRoots: '200',
    organization: organizationAddress,
    coAnchorAddress,
    deployer: config.auxiliary.from,
    organizationOwner: config.auxiliary.from,
  },
  config.auxiliary.txOptions,
);

const deployMerklePatriciaProof = (
  web3, txOptions,
) => Mosaic.ContractInteract.MerklePatriciaProof.deploy(
  web3,
  txOptions,
);

const deployGatewayLib = (
  web3, merklePatriciaProofContract, txOptions,
) => Mosaic.ContractInteract.GatewayLib.deploy(
  web3,
  merklePatriciaProofContract.address,
  txOptions,
);

const deployMessageBus = (
  web3, merklePatriciaProofContract, txOptions,
) => Mosaic.ContractInteract.MessageBus.deploy(
  web3,
  merklePatriciaProofContract.address,
  txOptions,
);

const deployGateways = (
  originMessageBus,
  originGatewayLib,
  auxiliaryMessageBus,
  auxiliaryGatewayLib,
  tokenAddress,
  originAnchorAddress,
  originOrganizationAddress,
  utilityTokenAddress,
  auxiliaryAnchorAddress,
  auxiliaryOrganizationAddress,
) => Mosaic.ContractInteract.EIP20Gateway.setupPair(
  originWeb3,
  auxiliaryWeb3,
  {
    token: tokenAddress,
    baseToken: config.origin.contractAddresses.OST,
    stateRootProvider: originAnchorAddress,
    bounty: '0',
    organization: originOrganizationAddress,
    burner: ZERO_ADDRESS,
    messageBus: originMessageBus.address,
    gatewayLib: originGatewayLib.address,
    deployer: config.origin.from,
    organizationOwner: config.origin.from,
  },
  {
    valueToken: tokenAddress,
    utilityToken: utilityTokenAddress,
    stateRootProvider: auxiliaryAnchorAddress,
    bounty: '0',
    organization: auxiliaryOrganizationAddress,
    burner: ZERO_ADDRESS,
    messageBus: auxiliaryMessageBus.address,
    gatewayLib: auxiliaryGatewayLib.address,
    deployer: config.auxiliary.from,
  },
  config.origin.txOptions,
  config.auxiliary.txOptions,
);

const deployOrganizations = () => {
  const originOrganization = deployOrganization(
    originWeb3,
    config.origin.from,
    config.origin.txOptions,
  );
  const auxiliaryOrganization = deployOrganization(
    auxiliaryWeb3,
    config.auxiliary.from,
    config.auxiliary.txOptions,
  );

  return [
    originOrganization,
    auxiliaryOrganization,
  ];
};

const deployAnchors = (
  originOrganizationAddress, auxiliaryOrganizationAddress,
) => deployOriginAnchor(originOrganizationAddress)
  .then(originAnchor => Promise.all([
    deployAuxiliaryAnchor(originAnchor.address, auxiliaryOrganizationAddress),
    originAnchor,
  ]))
  .then(([auxiliaryAnchor, originAnchor]) => Promise.all([
    originAnchor.setCoAnchorAddress(
      auxiliaryAnchor.address,
      config.origin.txOptions,
    ),
    originAnchor,
    auxiliaryAnchor,
  ]))
  .then(([_, originAnchor, auxiliaryAnchor]) => [originAnchor, auxiliaryAnchor]);

const deployGatewaysWithLibs = (
  tokenAddress,
  originAnchorAddress,
  originOrganizationAddress,
  utilityTokenAddress,
  auxiliaryAnchorAddress,
  auxiliaryOrganizationAddress,
) => Promise
  .all([
    deployMerklePatriciaProof(
      originWeb3,
      config.origin.txOptions,
    ),
    deployMerklePatriciaProof(
      auxiliaryWeb3,
      config.auxiliary.txOptions,
    ),
  ])
  .then(([originMerklePatriciaProof, auxiliaryMerklePatriciaProof]) => Promise.all([
    originMerklePatriciaProof,
    auxiliaryMerklePatriciaProof,
    deployGatewayLib(
      originWeb3,
      originMerklePatriciaProof,
      config.origin.txOptions,
    ),
    deployGatewayLib(
      auxiliaryWeb3,
      auxiliaryMerklePatriciaProof,
      config.auxiliary.txOptions,
    ),
    deployMessageBus(
      originWeb3,
      originMerklePatriciaProof,
      config.origin.txOptions,
    ),
    deployMessageBus(
      auxiliaryWeb3,
      auxiliaryMerklePatriciaProof,
      config.auxiliary.txOptions,
    ),
  ]))
  .then((
    [
      originMerklePatriciaProof,
      auxiliaryMerklePatriciaProof,
      originGatewayLib, auxiliaryGatewayLib,
      originMessageBus, auxiliaryMessageBus,
    ],
  ) => Promise.all([
    deployGateways(
      originMessageBus,
      originGatewayLib,
      auxiliaryMessageBus,
      auxiliaryGatewayLib,
      tokenAddress,
      originAnchorAddress,
      originOrganizationAddress,
      utilityTokenAddress,
      auxiliaryAnchorAddress,
      auxiliaryOrganizationAddress,
    ),
    originMerklePatriciaProof,
    auxiliaryMerklePatriciaProof,
    originGatewayLib,
    auxiliaryGatewayLib,
    originMessageBus,
    auxiliaryMessageBus,
  ]))
  .then(([
    gateway,
    coGateway,
    originMerklePatriciaProof,
    auxiliaryMerklePatriciaProof,
    originGatewayLib,
    auxiliaryGatewayLib,
    originMessageBus,
    auxiliaryMessageBus,
  ]) => [
    originMerklePatriciaProof,
    auxiliaryMerklePatriciaProof,
    originGatewayLib,
    auxiliaryGatewayLib,
    originMessageBus,
    auxiliaryMessageBus,
    gateway,
    coGateway,
  ]);

const deployAll = () => deployToken()
  .then((token) => {
    console.log('Token deployed');
    const tokenAddress = token._address;

    return Promise.all([
      tokenAddress,
      Promise.all(deployOrganizations()),
    ]);
  })
  .then(
    ([tokenAddress, [originOrganization, auxiliaryOrganization]]) => {
      console.log('Organizations deployed');
      return Promise.all([
        deployUtilityToken(tokenAddress, auxiliaryOrganization.address),
        deployAnchors(originOrganization.address, auxiliaryOrganization.address),
        tokenAddress,
        originOrganization,
        auxiliaryOrganization,
      ]);
    },
  )
  .then(
    ([
      utilityToken,
      [originAnchor, auxiliaryAnchor],
      tokenAddress,
      originOrganization,
      auxiliaryOrganization,
    ]) => {
      console.log('Utility Token and Anchors deployed');
      const utilityTokenAddress = utilityToken._address;

      return Promise.all([
        deployGatewaysWithLibs(
          tokenAddress,
          originAnchor.address,
          originOrganization.address,
          utilityTokenAddress,
          auxiliaryAnchor.address,
          auxiliaryOrganization.address,
        ),
        utilityToken,
        originAnchor,
        auxiliaryAnchor,
        tokenAddress,
        originOrganization,
        auxiliaryOrganization,
      ]);
    },
  )
  .then(
    ([
      [
        originMerklePatriciaProof,
        auxiliaryMerklePatriciaProof,
        originGatewayLib,
        auxiliaryGatewayLib,
        originMessageBus,
        auxiliaryMessageBus,
        gateway,
        coGateway,
      ],
      utilityToken,
      originAnchor,
      auxiliaryAnchor,
      tokenAddress,
      originOrganization,
      auxiliaryOrganization,
    ]) => {
      console.log('Gateways and Libs deployed');
      console.log(
        originMerklePatriciaProof,
        auxiliaryMerklePatriciaProof,
        originGatewayLib,
        auxiliaryGatewayLib,
        originMessageBus,
        auxiliaryMessageBus,
        gateway,
        coGateway,
        utilityToken,
        originAnchor,
        auxiliaryAnchor,
        tokenAddress,
        originOrganization,
        auxiliaryOrganization,
      );
    },
  );

(async () => {
  console.log('Deploying');
  await deployAll().catch(console.log);
  console.log('Done');
})();
