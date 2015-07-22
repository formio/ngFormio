/* global before, afterEach, after, featureFile, scenarios, steps */
"use strict";

var Yadda = require('yadda');
Yadda.plugins.mocha.StepLevelPlugin.init();

var library = require('./lib/formio-library');
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
        Yadda.createInstance(library, { driver: driver }).run(step, done);
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
