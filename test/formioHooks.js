'use strict';
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var hooks = require('./hooks');

// Creates hooks to be used when running formio
// tests under the formio-server environment
module.exports = function(formioTestPath) {
  // Copy regular formio-server test hooks so we don't have
  // to duplicate hooks
  var formioHooks = _.clone(hooks);

  // Override settings hook and return the settings from the
  // formio test config.json. This essentially runs all formio
  // tests under a single assumed project.
  formioHooks.settings = function(settings, req, cb) {
    fs.readFile(path.join(formioTestPath, 'config.json'), function(err, config){
      if(err) {
        return cb(err);
      }
      config = JSON.parse(config.toString());
      cb(null, config.settings);
    });
  };

  return formioHooks;
};
