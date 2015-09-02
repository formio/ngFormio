'use strict';

var _ = require('lodash');
var debug = {
  config: require('debug')('formio:config')
};

module.exports = function() {
  var config = {};

  var protocol = process.env.PROTOCOL || 'https';
  var domain = process.env.DOMAIN || 'form.io';
  var port = process.env.PORT || 80;
  var host = protocol + '://' + domain;

  if (port !== 80) {
    host += ':' + port;
  }

  // Configure app server settings.
  config.debug = process.env.DEBUG || false;
  config.protocol = protocol;
  config.domain = domain;
  config.port = port;
  config.host = host;

  // Only output sanitized data.
  debug.config(config);
  return config;
};
