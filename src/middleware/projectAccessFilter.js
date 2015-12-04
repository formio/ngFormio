'use strict';

var _ = require('lodash');
var debug = require('debug')('formio:middleware:projectAccessFilter');

module.exports = function(formio) {
  var cache = require('../cache/cache')(formio);

  /**
   * Formio Middleware to ensure that the roles in the project access payload are valid.
   *
   * This middleware will filter all roles that are not part of the project or are not teams that the project owner, owns.
   */
  return function(req, res, next) {
    debug(req.method);
    if (req.method !== 'PUT') {
      debug('Skipping');
      return next();
    }
    if (!req.projectId) {
      debug('No project id found with the request.');
      return res.sendStatus(400);
    }

    debug(req.body);
    req.body = req.body || {};

    // Skip the role check if no access was defined.
    if (!req.body.access || req.body.access && req.body.access.length === 0) {
      debug('Skipping, not access in payload.');
      return next();
    }

    // All of the valid access ids for this project.
    var accessIds = [];

    // Get the owner of the Project
    cache.loadProject(req, req.projectId, function(err, project) {
      if (err) {
        debug(err);
        return res.sendStatus(400);
      }
      if (!project.owner) {
        debug('No project owner found... ' + JSON.stringify(project));
        return res.sendStatus(500);
      }

      // Search for all roles associated with a project.
      formio.resources.role.model.find({deleted: {$eq: null}, project: project._id.toString()}, function(err, roles) {
        if (err) {
          debug(err);
          return res.sendStatus(400);
        }

        // Update the accessIds with the project roles.
        roles = roles || [];
        roles = _.map(_.pluck(roles, '_id'), formio.util.idToString);
        accessIds = accessIds.concat(roles);

        /**
         * Filter the access obj in the current request based on the calculated accessIds.
         */
        var filterAccess = function() {
          // Check the accessIds in the original request.
          debug('Allowed Roles: ' + JSON.stringify(accessIds));
          debug('Given access: ' + JSON.stringify(req.body.access));

          // Filter each set of roles to only include roles in the accessIds list.
          req.body.access = _.filter(req.body.access, function(permission) {
            debug('Roles before filter: ' + JSON.stringify(permission.roles));
            permission.roles = permission.roles || [];
            permission.roles = _.intersection(permission.roles, accessIds);
            debug('Roles after filter: ' + JSON.stringify(permission.roles));
            return permission;
          });

          debug('New Access: ' + JSON.stringify(req.body.access));
        };

        // Only proceed with teams access check if the project plan supports teams.
        project.plan = project.plan || '';
        if (!_.startsWith(project.plan, 'team')) {
          debug('Skipping team access check, plan: ' + project.plan);
          filterAccess();
          return next();
        }

        // Find all the Teams owned by the project owner.
        formio.teams.getTeams(project.owner, false, true)
          .then(function(teams) {
            teams = teams || [];
            teams = _.map(_.pluck(teams, '_id'), formio.util.idToString);

            accessIds = accessIds.concat(teams);
            accessIds = _.uniq(_.filter(accessIds));

            filterAccess();
            next();
          })
          .catch(function(err) {
            debug(err);

            filterAccess();
            next();
          });
      });
    });
  }
};
