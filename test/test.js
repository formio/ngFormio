'use strict';

// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var protocol = process.env.APPPROTOCOL || 'http';
var domain = process.env.APPDOMAIN || 'localhost';
var port = process.env.APPPORT || 80;
var serverHost = process.env.SERVERHOST || 'localhost:3000';
var serverProtocol = process.env.SERVERPROTOCOL || 'http';
var fs = require('fs');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var url = (port === 80)
  ? protocol + '://' + domain
  : protocol + '://' + domain + ':' + port;
var config = {
  protocol: protocol,
  baseUrl: url,
  serverProtocol: serverProtocol,
  serverHost: serverHost,
  expect: expect
};

var custom = require('./lib/formio-library');
var actions = new custom(config);

before(function (next) {
  var width = 1920;
  var height = 1080;
  browser.driver.manage().window().setSize(width, height);
  browser.get(url).then(next).catch(next);
});

describe("Formio Tests", function () {
  this.retries(3);
  require('./features/register.spec')(actions);
  require('./features/loginFunctionality.spec')(actions);
  require('./features/userPortalandWelcome.spec')(actions);
  require('./features/feedbackrequest.spec')(actions);
  // require('./features/documentationLinks.spec')(actions);
  require('./features/profileFunctionality.spec')(actions);
  // require('./features/project.spec')(actions);
  // require('./features/projectSettings.spec')(actions);
  require('./features/form.spec')(actions);
  //require('./features/environments.spec')(actions);
  //require('./features/createResource2.spec')(actions);
  //require('./features/createForm.spec')(actions);
  //require('./features/settingsBasic.spec')(actions);
  //require('./features/settingsIndependent.spec')(actions);
  //require('./features/settingsTeamPro.spec')(actions);
  //require('./features/settingsEnterprise.spec')(actions);
  // require('./features/teams.spec')(actions);
  // require('./features/versioning.spec')(actions);
  require('./features/environmentWorkflow.spec')(actions);

});

afterEach(function () {
  if (this.currentTest.state !== 'passed') {
    var path = './test/screenshots/' + this.currentTest.title.replace(/\W+/g, '_').toLowerCase();
    browser.manage().logs().get('browser')
      .then(function(logs) {
        if (logs.length) {
          fs.writeFile(path + '.txt', JSON.stringify(logs));
        }
      });
    browser.takeScreenshot().then(function (png) {
      var stream = fs.createWriteStream(path + '.png');
      stream.write(new Buffer(png, 'base64'));
      stream.end();
      console.log(path + ' file saved.');
    });
  }
  else {
    // Clears the logs for the next run.
    //browser.manage().logs().get('browser');
  }
});
