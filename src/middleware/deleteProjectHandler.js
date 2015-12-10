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
    if (req.method !== 'DELETE' || !req.projectId || !req.user._id) {
      debug('Skipping');
      return next();
    }

    var cache = require('../cache/cache')(formio);
    cache.loadProject(req, req.projectId, function(err, project) {
      if(err) {
        debug(err);
        return next();
      }

      var owner = (formio.util.idToString(req.user._id) === formio.util.idToString(project.owner));
      debug('Owner: ' + owner);
      if(owner) {
        var prune = require('../util/delete')(formio);
        debug('Prune project w/ projectId: ' + req.projectId);
        prune.project(req.projectId, function(err) {
          if (err) {
            debug(err);
            return next(err);
          }

          debug('Complete');
          return res.sendStatus(200);
        });
      }
      else {
        debug('Deletion attempt from non-owner.');
        return res.sendStatus(401);
      }
    });
  };
};
