'use strict';

var debug = require('debug')('formio:middleware:bootstrapEntityProject');

/**
 * The Bootstrap Entity Project middleware.
 *
 * This middleware will set the project of the current request as the project in the request or url.
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    debug('Skipping');
    return next();
  }

  req.body.project = req.projectId || req.params.projectId;
  debug(req.body);
  next();
};
