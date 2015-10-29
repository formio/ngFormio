'use strict';

var _ = require('lodash');
var debug = require('debug')('formio:middleware:projectPlanFilter');

module.exports = function(formio) {
  var domain = function() {
    var chars = 'abcdefghijklmnopqrstuvwxyz';
    var rand = '';
    for (var i = 0; i < 15; i++) {
      var randNum = Math.floor(Math.random() * chars.length);
      rand += chars[randNum];
    }

    return rand;
  };

  /**
   * Helper function to filter name changes and force name assignment on creation.
   *
   * Note: For community plans.
   *
   * @param req
   */
  var filterNameChanges = function(req) {
    req.body = _.omit(req.body, 'name');

    var isPost = req.method === 'POST';
    if (isPost) {
      req.body.name = domain();
    }
  };

  /**
   * Helper function to filter cors changes and force cors settings on creation.
   *
   * Note: For community plans.
   *
   * @param req
   */
  var filterCorsChanges = function(req) {
    req.body.settings = req.body.settings || {};
    req.body.settings.cors = '*';
  };

  return function(req, res, next) {
    var isPost = req.method === 'POST';
    var isPut = req.method === 'PUT';
    if (!isPost && !isPut) return next();

    formio.plans.getPlan(req, function(err, plan) {
      if (err || !plan) {
        debug(err || 'Project plan not found.');
        return next(err || 'Project plan not found.');
      }

      debug(plan);
      switch (plan.toString()) {
        case 'commercial':
        case 'team3':
        case 'team2':
        case 'team1':
        case 'basic':
          return next();
          break;
        case 'community':
        default:
          debug(req.body);

          filterNameChanges(req);
          filterCorsChanges(req);

          debug(req.body);
          return next();
          break;
      }
    });
  };
};
