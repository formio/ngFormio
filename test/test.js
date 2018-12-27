'use strict';
// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var tags = require('mocha-tags');
// tags.filter = new tags.Filter("not:smoke");
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
  expect: expect,
};
var custom = require('./lib/formio-library');
var actions = new custom(config);
before(function (next) {
  browser.waitForAngularEnabled(false);
  browser.driver.manage().window().maximize();
  browser.get(url).then(next).catch(next);
});
describe("Formio Tests", function () {
  this.retries(3);
  require('./features/loginFunctionality.spec')(actions,tags);
  require('./features/register.spec')(actions,tags);
  require('./features/documentationLinks.spec')(actions,tags);
  require('./features/feedbackrequest.spec')(actions,tags);
  require('./features/userPortalandWelcome.spec')(actions,tags);
  require('./features/creatingProjectTemplates.spec')(actions,tags);
  require('./features/profileFunctionality.spec')(actions,tags);
  require('./features/creditCard.spec')(actions,tags);
  require('./features/project.spec')(actions,tags);
  require('./features/createResource2.spec')(actions,tags);
  require('./features/createForm.spec')(actions,tags);
  require('./features/nestedResource.spec')(actions,tags);
  require('./features/apiTab.spec')(actions,tags);
  require('./features/dataTab.spec')(actions,tags);
  require('./features/accessPage.spec')(actions,tags);
  require('./features/settingsBasic.spec')(actions,tags);
  require('./features/settingsIndependent.spec')(actions,tags);
  require('./features/settingsTeamPro.spec')(actions,tags);
  require('./features/settingsEnterprise.spec')(actions,tags);
  require('./features/environmentWorkflow.spec')(actions,tags);
  //require('./features/versioning.spec')(actions,tags);
  require('./features/formRevisions.spec')(actions,tags);
  // require('./features/teams.spec')(actions,tags);
  require('./features/projectUpgradePayment.spec')(actions,tags);
  require('./features/welcomePage.spec')(actions,tags);
  require('./features/overview.spec')(actions,tags);
  require('./features/onPremise.spec')(actions,tags);
});
afterEach(function () {
    if (this.currentTest.state !== 'passed') {
      var path = './test/screenshots/' + this.currentTest.title.replace(/\W+/g, '_').toLowerCase();
      browser.manage().logs().get('browser')
        .then(function(logs) {
          if (logs.length) {
            fs.writeFile(path + '.txt', JSON.stringify(logs), error => {if (error) {console.log(error)}});
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
      // browser.manage().logs().get('browser');
    }
});
