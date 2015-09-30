'use strict';

var debug = require('debug')('formio:plans');

module.exports = function(formioServer, cache) {
  var limits = {
    basic: 10000,
    team1: 250000,
    team2: 500000,
    team3: 2000000
  };

  var checkRequest = function(req, res) {
    return function(cb) {
      // Ignore project plans, if not interacting with a project.
      if (!req.projectId) {
        debug('No project given');
        return cb(null);
      }

      cache.loadProject(req, req.projectId, function(err, project) {
        if (err || !project) {
          debug(err || 'Project not found.');
          return cb(err || 'Project not found.');
        }

        // Determine access based off the current month and project plan.
        var month = (new Date()).getMonth();
        if (project.name && project.name === 'formio') {
          // Ignore limits for the formio project.
          return cb();
        }

        // Determine the current plan.
        var _plan = (project.plan && limits.hasOwnProperty(project.plan))
          ? limits[project.plan]
          : limits['basic'];

        // Check the calls made this month.
        formioServer.analytics.getCalls(month, project._id, function(err, calls) {
          if (err) {
            debug(err);
            return cb(err);
          }

          debug('API Calls for month: ' + month + ' and project: ' + project._id + ': ' + calls);
          if (calls >= _plan) {
            debug('Monthly limit exceeded..');
            return res.sendStatus(402);
          }
          else {
            return cb();
          }
        });
      });
    }
  };

  return {
    limits: limits,
    checkRequest: checkRequest
  };
};
