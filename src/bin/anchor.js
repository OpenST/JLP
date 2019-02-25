#!/usr/bin/env node

'use strict';

const program = require('commander');
const fs = require('fs');
const utils = require('../utils.js');

const StateRootAnchorService = require('../state_root_anchor_service.js');

const { version } = require('../../package.json');

program
  .version(version)
  .name('anchor')
  .arguments('<config> <direction> <delay>')
  .description('An executable to anchor state roots across chains.')
  .action(
    (config, direction, delay) => {
      const stateRootAnchorService = new StateRootAnchorService(
        direction,
        delay,
        utils.createMosaic(JSON.parse(fs.readFileSync(config, 'utf8'))),
      );

      stateRootAnchorService.start();
    },
  )
  .on(
    '--help',
    () => {
      console.log('');
      console.log('Arguments:');
      console.log('  config     path to a config file');
      console.log('  direction  which direction to anchor (target chain)');
      console.log('  delay      number of blocks to wait before anchoring a state root');
    },
  )
  .parse(process.argv);
