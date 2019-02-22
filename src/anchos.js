#!/usr/bin/env node

'use strict';

const program = require('commander');
const fs = require('fs');
const Utils = require('./utils.js');

const StateRootAnchorService = require('./state_root_anchor_service.js');

const { version } = require('../package.json');

program
  .version(version, '-v, --version')
  .option('-d --direction <origin | auxiliary>', 'The source chain to anchor a state root '
  + 'to the target chain.', /^(origin|auxiliary)$/i)
  .option('-d, --delay <block number>', 'The delay to wait in blocks on the source '
  + 'chain before anchoring.', /^\d+$/i)
  .option('-c, --config <config-file-path>', 'The config file path to read chains '
  + 'access info and contract addresses from.')
  .parse(process.argv);

// Create a state root anchoring service.
const stateRootAnchorService = new StateRootAnchorService(
  program.direction,
  program.delay,
  Utils.createMosaic(JSON.parse(fs.readFileSync(program.config, 'utf8'))),
);

stateRootAnchorService.start();
