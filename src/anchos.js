#!/usr/bin/env node

const Web3 = require('web3');
const Mosaic = require('@openstfoundation/mosaic.js');
const program = require('commander');
const fs = require('fs');

const StateRootAnchorService = require('./state_root_anchor_service.js');

program
  .version('0.1.0', '-v, --version')
  .option('-d --direction <origin | auxiliary>', 'The source chain to anchor a state root '
  + 'to the target chain.', /^(origin|auxiliary)$/i)
  .option('-d, --delay <block number>', 'The delay to wait in blocks on the source '
  + 'chain before anchoring.', /^\d+$/i)
  .option('-c, --config <config-file-path>', 'The config file path to read chains '
  + 'access info and contract addresses from.')
  .parse(process.argv);

// Read chains access info and contract addresses from configuration file.
const config = JSON.parse(fs.readFileSync(program.config, 'utf8'));

// Create web3 providers for origin and auxiliary chains.
const originWeb3 = new Web3(config.origin.rpcProvider);
const auxiliaryWeb3 = new Web3(config.auxiliary.rpcProvider);

// Create chain objects for origin and auxiliary chains.
const originChain = new Mosaic.Chain(
  originWeb3,
  config.origin.contractAddresses,
);
const auxiliaryChain = new Mosaic.Chain(
  auxiliaryWeb3,
  config.origin.auxiliaryAddresses,
);

// Create mosaic object.
const mosaic = new Mosaic(originChain, auxiliaryChain);

// Create a state root anchoring service.
const stateRootAnchorService = new StateRootAnchorService(
  program.direction,
  program.delay,
  mosaic,
);

process
  .on('SIGTERM', () => {
    console.log('\nStopping anchoring service ...');
    stateRootAnchorService.stop();
  })
  .on('SIGINT', () => {
    console.log('\nStopping anchoring service ...');
    stateRootAnchorService.stop();
  })
  .on('SIGQUIT', () => {
    console.log('\nStopping anchoring service ...');
    stateRootAnchorService.stop();
  });

stateRootAnchorService.start();
