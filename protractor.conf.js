'use strict';

// An example configuration file.
exports.config = {
  // The address of a running selenium server.
  // seleniumAddress: 'http://travist:1c32baf7-f790-4a41-ae31-49c0972e13e7@ondemand.saucelabs.com:80/wd/hub',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  // seleniumServerJar: deprecated, this should be set on node_modules/protractor/config.json

  // Capabilities to be passed to the webdriver instance.

  maxSessions: 2,
  multiCapabilities: [
    {
      browserName: 'chrome',
      maxDuration: 10800,
      platform : 'Windows 10',
      screenResolution : '1920x1080',
      shardTestFiles: false,
      maxInstances: 1,
      maxSessions: 1,
      count: 1,
      specs: [ 'test/test.js']
    }, {
      shardTestFiles: false,
      browserName: 'chrome',
      maxDuration: 10800,
      platform : 'Windows 10',
      screenResolution : '1920x1080',
      maxInstances: 1,
      maxSessions: 1,
      count: 1,
      specs: ['test/test1.js']
    }],


  // capabilities: {
  //   'browserName': 'chrome',
  //   "maxDuration": 10800,
  //   "platform" : 'Windows 10',
  //   "screenResolution" : '1920x1080'
  // },
  // multiCapabilities: [{
  //   'browserName': 'firefox'
  // }, {
  //   'browserName': 'chrome'
  // }],
  // allScriptSTimeout : 120000,
  // getPageTimeout: 120000,
  // Spec patterns are relative to the current working directory when
  // protractor is called.
  // specs: [paths.e2e + '/**/*.js'],
  // specs: ['test/test.js','test/test1.js'],
  framework : 'mocha',
  // Options to be passed to Jasmine-node.
  //jasmineNodeOpts: {
  //  showColors: true,
  //  defaultTimeoutInterval: 30000
  //}
  mochaOpts: {
    reporter: "spec",
    slow: 1000,
    timeout: 60000
  }
};
