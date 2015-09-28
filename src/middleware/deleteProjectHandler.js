'use strict';

var debug = require('debug')('formio:middleware:deleteProjectHandler');

/**
 * The deleteProjectHandler middleware.
 *
 * This middleware is used for flagging Projects as deleted rather than actually deleting them.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(formio) {
  return function(req, res, next) {
    if (req.method !== 'DELETE' || !req.projectId) {
      debug('Skipping');
      return next();
    }

    var prune = require('../util/delete')(formio);
    debug('Prune project w/ projectId: ' + req.projectId);
    prune.project(req.projectId, function(err) {
      if (err) {
        debug(err);
        return next(err);
      }

      debug('Complete');
      return res.sendStatus(204);
    });
  };
};
