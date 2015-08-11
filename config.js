'use strict';

var _ = require('lodash');
var debug = {
  config: require('debug')('formio:config')
};

module.exports = function() {
  var config = {
    'formio': {}
  };

  var protocol = process.env.PROTOCOL || 'https';

  // Set the App settings.
  var appDomain = process.env.APP_DOMAIN || 'form.io';
  var appPort = process.env.APP_PORT || 80;
  var appHost = protocol + '://' + appDomain;

  if (appPort !== 80) {
    appHost += ':' + appPort;
  }

  // Set the API settings.
  var apiDomain = process.env.API_DOMAIN || 'form.io';
  var apiPort = process.env.API_PORT || 80;
  var apiHost = protocol + '://api.' + apiDomain;
  var project = process.env.PROJECT || 'formio';
  var formioHost = protocol + '://' + project + '.' + apiDomain;

  if (apiHost !== 80) {
    apiHost += ':' + apiPort;
    formioHost += ':' + apiPort;
  }

  // Configure app server settings.
  config.debug = process.env.DEBUG || false;
  config.https = (protocol === 'https');
  config.appDomain = appDomain;
  config.appPort = appPort;
  config.appHost = appHost;

  config.apiDomain = apiDomain;
  config.apiPort = apiPort;
  config.apiHost = apiHost;

  config.project = project;
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
  config.formio.projectSupport = process.env.PROJECT_SUPPORT || true;
  config.formio.reservedSubdomains = ['test', 'www', 'api', 'help', 'support'];
  config.formio.reservedForms = ['submission', 'export'];

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

  // Allow the config to be displayed when debugged.
  var sanitized = _.clone(config);
  sanitized = _.pick(sanitized, [
    'https', 'appDomain', 'appPort', 'appHost', 'apiDomain', 'apiPort', 'apiHost', 'project', 'formioHost', 'debug'
  ]);
  sanitized.formio = _.pick(sanitized.formio, ['domain', 'schema', 'mongo']);

  // Only output sanitized data.
  debug.config(sanitized);
  return config;
};
