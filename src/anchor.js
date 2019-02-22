#!/usr/bin/env node

'use strict';

const program = require('commander');
const fs = require('fs');
const utils = require('./utils.js');

const StateRootAnchorService = require('./state_root_anchor_service.js');

const { version } = require('../package.json');

program
  .version(version, '-v, --version', 'Outputs the version number.')
  .option('-d, --direction <origin|auxiliary>', 'The source chain to anchor a state root '
  + 'to the target chain.', /^(origin|auxiliary)$/i)
  .option('-y, --delay <delay>', 'The delay to wait in blocks on the source '
  + 'chain before anchoring.', /^\d+$/i)
  .option('-c, --config <config>', 'The config file path to read chains '
  + 'access info and contract addresses from.')
  .parse(process.argv);

assert(program.direction !== undefined);
assert(program.delay !== undefined);
assert(program.config !== undefined);

// Create a state root anchoring service.
const stateRootAnchorService = new StateRootAnchorService(
  program.direction,
  program.delay,
  utils.createMosaic(JSON.parse(fs.readFileSync(program.config, 'utf8'))),
);

stateRootAnchorService.start();
