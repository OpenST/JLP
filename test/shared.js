 'use strict';

/**
 * @file `shared` exists so that tests can share data across each other.
 *
 * Due to node's caching behavior when loading modules, it always returns the
 * same object for repeated calls to `require()`.
 *
 * It is important that every `require` is written exactly `shared`,
 * case-sensitive!
 */

module.exports = {
  chainConfig: undefined,
  connection: undefined,
  accounts: {
    origin: {},
    auxiliary: {},
  },
};
