'use strict';

var debug = require('debug')('formio:middleware:userProject');

/**
 * The userProject middleware.
 *
 * This middleware is used for adding the user project to the request object.
 *
 * @param cache
 * @returns {Function}
 */
module.exports = function(cache) {
  return function(req, res, next) {
    if (req.token) {
      cache.loadProject(req, req.token.form.project, function (err, project) {
        if (err) {
          return next(err);
        }
        req.userProject = project;
        next();
      });
    }
    else {
      return next();
    }
  };
};
