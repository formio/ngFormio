'use strict';

// Boot up the formio server so we can access the resources.
require('dotenv').load({silent: true});
var formio = null;
var library = null;
var protocol = process.env.APPPROTOCOL || 'http';
var domain = process.env.APPDOMAIN || 'localhost';
var port = process.env.APPPORT || 80;
var serverHost = process.env.SERVERHOST || 'localhost:3000';
var serverProtocol = process.env.SERVERPROTOCOL || 'http';
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
  var width = 1280;
  var height = 720;
  browser.driver.manage().window().setSize(width, height);
  browser.get(url).then(next).catch(next);
});

describe("", function () {
  require('./features/register.spec')(actions);
  require('./features/loginFunctionality.spec')(actions);
  require('./features/userPortalandWelcome.spec')(actions);
  require('./features/feedbackrequest.spec')(actions);
  require('./features/documentationLinks.spec')(actions);
  require('./features/profileFunctionality.spec')(actions);
  require('./features/project.spec')(actions);
  //require('./features/projectSettings.spec')(actions);
});

