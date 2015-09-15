'use strict';
var config = require('../../config');
var tld = require('tldjs');
var debug = {
  alias: require('debug')('formio:alias')
};

/**
 * Provides URL alias capabilities.
 *
 * Middleware to resolve a form alias into its components.
 */
module.exports = function(formio) {

  var cache = require('../cache/cache')(formio);

  // Skip the alias handler.
  var skip = function(req, res, next) {
    var params = formio.util.getUrlParams(req.url);
    if (params.project) {
      req.projectId = params.project;
    }
    return next();
  };

  // Handle the request.
  return function(req, res, next) {

    // Determing if this is a local domain or not.
    var local = false;

    // Ignore the subdomain if they provide the config.
    if (config.noalias) {
      return skip(req, res, next);
    }

    // Get the hostname.
    var hostname = req.headers.host.split(':')[0];

    // Determine if localhost and cleanup hostname.
    if ((hostname.indexOf('127.0.0.1') !== -1) || (hostname.indexOf('localhost') !== -1)) {
      local = true;
      hostname = hostname.replace('127.0.0.1', 'localhost');
    }

    // Determine if there is a subdomain, and break it down to the Project name.
    var subdomain = tld.getSubdomain(hostname);
    var projectName = null;

    // Handle edge-cases for local connections.
    if (local) {
      // Skip middleware if there really is no subdomain with the localhost url.
      if (hostname.split('.').length === 1) {
        return skip(req, res, next);
      }

      // Trim the subdomain to the left-most portion for the Project name.
      projectName = hostname.split('.')[0];
    }
    // Use the given address to trim the Project name from the subdomain.
    else {
      if (subdomain === null || subdomain === '') {
        // No subdomain was found, skip middleware.
        return skip(req, res, next);
      }
      else {
        // Trim the subdomain to the left-most portion for the Project name.
        projectName = subdomain.split('.').length > 1
          ? projectName = subdomain.split('.')[0]
          : subdomain;
      }
    }

    // Quick confirmation that we have an projectName.
    if (!projectName || projectName === 'api') {
      return skip(req, res, next);
    }

    // Look up the subdomain.
    cache.loadProjectByName(req, projectName, function(err, project) {
      debug.alias('Loading project: ' + projectName);

      if (err || !project) {
        return next('Invalid subdomain');
      }

      // Set the Project Id in the request.
      req.projectId = project._id.toString();
      req.url = '/project/' + project._id + req.url;
      next();
    });
  };
};
