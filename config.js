'use strict';

var _ = require('lodash');
var debug = {
  config: require('debug')('formio:config')
};

var config = {formio: {}};
var protocol = process.env.PROTOCOL || 'https';
var project = process.env.PROJECT || 'formio';

config.reservedSubdomains = ['test', 'www', 'api', 'help', 'support', 'portal'];
config.formio.reservedForms = ['submission', 'export', 'role', 'current', 'logout', 'import', 'form'];

// Set the App settings.
var domain = process.env.DOMAIN || 'form.io';
var port = process.env.PORT || 80;
var host = protocol + '://' + domain;
var apiHost = protocol + '://api.' + domain;
var formioHost = protocol + '://' + project + '.' + domain;

if (port !== 80) {
  host += ':' + port;
  apiHost += ':' + port;
  formioHost += ':' + port;
}

// Configure app server settings.
config.debug = process.env.DEBUG || false;
config.https = (protocol === 'https');
config.protocol = protocol;
config.domain = domain;
config.formio.domain = domain;
config.formio.protocol = protocol;
config.formio.baseUrl = domain + (port !== 80 ? ':' + port : '');
config.port = port;
config.host = host;

config.project = project;
config.apiHost = apiHost;
config.formio.apiHost = apiHost;
config.formioHost = formioHost;

if (process.env.MONGO1) {
  config.formio.mongo = [];
  config.formio.mongo.push(process.env.MONGO1);
  if (process.env.MONGO2) {
    config.formio.mongo.push(process.env.MONGO2);
  }
  if (process.env.MONGO3) {
    config.formio.mongo.push(process.env.MONGO3);
  }
}
else {
  // This is compatible with docker linking.
  var mongoAddr = process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost';
  var mongoPort = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
  var mongoCollection = process.env.MONGO_COLLECTION || 'formio';
  config.formio.mongo = 'mongodb://' + mongoAddr + ':' + mongoPort + '/' + mongoCollection;
}

// This secret is used to encrypt certain DB fields at rest in the mongo database
config.formio.mongoSecret = process.env.DB_SECRET || 'abc123';
config.formio.mongoSecretOld = process.env.DB_SECRET_OLD || false;

// TODO: Need a better way of setting the formio specific configurations.
if (process.env.SENDGRID_USERNAME) {
  config.formio.email = {};
  config.formio.email.type = 'sendgrid';
  config.formio.email.username = process.env.SENDGRID_USERNAME;
  config.formio.email.password = process.env.SENDGRID_PASSWORD;
}

// Add the JWT data.
config.formio.jwt = {};
config.formio.jwt.secret = process.env.JWT_SECRET || 'abc123';
config.formio.jwt.expireTime = process.env.JWT_EXPIRE_TIME || 240;
config.jslogger = process.env.JS_LOGGER || 123;

// Allow the config to be displayed when debugged.
var sanitized = _.clone(config, true);
sanitized = _.pick(sanitized, [
  'https', 'domain', 'port', 'host', 'project', 'formioHost', 'apiHost', 'debug'
]);
sanitized.formio = _.pick(_.clone(config.formio), ['domain', 'schema', 'mongo']);

// Only output sanitized data.
debug.config(sanitized);
module.exports = config;
