/* global before, afterEach, after, featureFile, scenarios, steps */
"use strict";

// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var config = require('../config')();
var formioClass = require('formio');

var Yadda = require('yadda');
Yadda.plugins.mocha.StepLevelPlugin.init();

var libraryClass = require('./lib/formio-library');
var webdriver = require('webdriverio');

var protocol = process.env.PROTOCOL || 'http';
var domain = process.env.DOMAIN || 'localhost';
var port = process.env.PORT || 3000;
var url = protocol + '://' + domain;
if (port != 80) {
  url += ':' + port;
}
console.log("Testing " + url);
var options = {
  baseUrl: url,
  desiredCapabilities: {
    browserName: 'chrome'
  }
};
var fs = require('fs');
var driver;
var formio;
var library;

new Yadda.FeatureFileSearch('./test/features').each(function(file) {
  featureFile(file, function(feature) {

    before(function(done) {
      driver = webdriver
        .remote(options)
        .init(function () {
          done();
        });
    });

    scenarios(feature.scenarios, function(scenario) {
      steps(scenario.steps, function(step, done) {
        if (!formio) {
          formioClass(config.formio, function(res) {
            formio = res;
            library = libraryClass(formio);
            Yadda.createInstance(library, { driver: driver }).run(step, done);
          });
        }
        else {
          Yadda.createInstance(library, { driver: driver }).run(step, done);
        }
      });
    });

    afterEach(function() {
      takeScreenshotOnFailure(this.currentTest);
    });

    after(function(done) {
      driver.end().then(function() {
        done();
      });
    });
  });
});

function takeScreenshotOnFailure(test) {
  if (test.state != 'passed') {
    var path = './test/screenshots/' + test.title.replace(/\W+/g, '_').toLowerCase() + '.png';
    driver.saveScreenshot(path);
  }
}
