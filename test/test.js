'use strict';

// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var Yadda = require('yadda');
var webdriver = require('webdriverjs-angular');
var driver = null;
var formio = null;
var library = null;
var protocol = process.env.APPPROTOCOL || 'http';
var domain = process.env.APPDOMAIN || 'localhost';
var port = process.env.APPPORT || 80;
var serverHost = process.env.SERVERHOST || 'localhost:3000';
var serverProtocol = process.env.SERVERPROTOCOL || 'http';
var url = (port === 80)
  ? protocol + '://' + domain
  : protocol + '://' + domain + ':' + port;
var options = {
  baseUrl: url,
  desiredCapabilities: {
    browserName: 'chrome'
  },
  ngRoot: 'body'
};
var config = {
  protocol: protocol,
  baseUrl: url,
  serverProtocol: serverProtocol,
  serverHost: serverHost
};

Yadda.plugins.mocha.StepLevelPlugin.init();
new Yadda.FeatureFileSearch('./test/features').each(function(file) {

    before(function (done) {
      library = require('./lib/formio-library')(config);
      done();
    });

    featureFile(file, function (feature) {
      before(function (done) {
        driver = webdriver
          .remote(options)
          .init()
          .setViewportSize({width: 1280, height: 720})
          .url(options.baseUrl, done);
      });

      scenarios(feature.scenarios, function (scenario) {
        steps(scenario.steps, function (step, done) {
          Yadda.createInstance(library, {driver: driver}).run(step, done);
        });
      });

      afterEach(function () {
        takeScreenshotOnFailure(this.currentTest);
      });

      after(function () {
        driver.end();
      });
    });

});

function takeScreenshotOnFailure(test) {
  if (test.state != 'passed') {
    var path = './test/screenshots/' + test.title.replace(/\W+/g, '_').toLowerCase() + '.png';
    driver.saveScreenshot(path);
  }
}
