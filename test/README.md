# 🛰 JLP Tests

To run the tests, run `npm run test` from the project root.

If you don't have a `./test/config_init.json` file, it will be copied with the default values.
If you need a different config, you should update the file before running the tests again.

* `run.js` is the entry point to the tests. It sets up mocha and runs it.
* `constants.js` stores constants that are used across tests.
* `shared.js` is a module to share objects across tests which may be generated inside a previous test.
* `hooks.js` contains "global" mocha hooks like `before` or `afterEach`.
* Directories contain the tests.

A new config file is generated for every test run. It is copied from `./config_init.json` and is deleted after the test run.
A global `afterEach` hook ensures that any updates to the chain config object are stored on the disk after every test case.
