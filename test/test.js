'use strict';

// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var config = require('../config');
var Yadda = require('yadda');
var webdriver = require('webdriverjs-angular');
var driver = null;
var formio = null;
var library = null;
var protocol = process.env.APPPROTOCOL || 'http';
var domain = process.env.APPDOMAIN || 'localhost';
var port = process.env.APPPORT || 80;
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

Yadda.plugins.mocha.StepLevelPlugin.init();
new Yadda.FeatureFileSearch('./test/features').each(function(file) {
  before(function(done) {
    loadApiServer(done);
  });

  featureFile(file, function(feature) {
    before(function(done) {
      driver = webdriver
        .remote(options)
        .init()
        .url(options.baseUrl, done);
    });

    scenarios(feature.scenarios, function(scenario) {
      steps(scenario.steps, function(step, done) {
        loadApiServer(function() {
          Yadda.createInstance(library, { driver: driver }).run(step, done);
        });
      });
    });

    afterEach(function() {
      takeScreenshotOnFailure(this.currentTest);
    });

    after(function() {
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

function loadApiServer(done) {
  if (formio) {
    return done();
  }

  var formioServer = require('formio')(config.formio);
  var app = require('express')();
  var settings = require('../src/hooks/settings')(app, formioServer);
  // Start the api server.
  formioServer.init(settings).then(function(server) {
    formio = server;
    formio.config.appHost = options.baseUrl;
    library = require('./lib/formio-library')(formio);
    done();
  });
}
