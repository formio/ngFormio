'use strict';

/**
 * Middleware to filter the request, using the project projectId.
 *
 * @returns {Function}
 */
module.exports = function(req, res, next) {
  var projectId = req.projectId || req.params.projectId;

  // Bad request if projectSupport is enabled and no projectId is present.
  if (!Boolean(projectId)) {
    return res.sendStatus(404);
  }

  req.modelQuery = req.modelQuery || this.model;
  req.modelQuery = req.modelQuery.find({project: projectId});
  next();
};
