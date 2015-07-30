'use strict';

var _ = require('lodash');
var debug = {
  config: require('debug')('config')
};

module.exports = function() {
  var config = {
    'formio': {}
  };

  var protocol = process.env.PROTOCOL || 'https';
  var domain = process.env.DOMAIN || 'form.io';
  var port = process.env.PORT || 80;
  var project = process.env.PROJECT || 'formio';
  var host = protocol + '://' + domain;
  var formioHost = protocol + '://' + project + '.' + domain;

  if (port !== 80) {
    host += ':' + port;
    formioHost += ':' + port;
  }

  config.https = (protocol === 'https');
  config.host = host;
  config.port = port;
  config.formioHost = formioHost;
  config.debug = process.env.DEBUG || false;
  config.formio.domain = domain;
  config.formio.schema = '1.0.0';

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
  sanitized = _.pick(sanitized, ['port', 'host', 'formioHost', 'formio']);
  sanitized.formio = _.pick(sanitized.formio, ['domain', 'schema', 'mongo']);

  // Only output sanitized data.
  debug.config(sanitized);

  return config;
};
