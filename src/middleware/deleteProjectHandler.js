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
    debug(!(req.method !== 'DELETE' || !req.projectId));
    if (req.method !== 'DELETE' || !req.projectId) {
      return next();
    }

    var prune = require('../util/delete')(formio);
    prune.project(req.projectId, function(err) {
      if (err) {
        debug(err);
        return next(err);
      }

      return res.sendStatus(204);
    });
  };
};
