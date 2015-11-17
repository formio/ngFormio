'use strict';

var _ = require('lodash');
var Q = require('q');
var debug = {
  leaveTeams: require('debug')('formio:teams:leaveTeams'),
  loadTeams: require('debug')('formio:teams:loadTeams'),
  getTeams: require('debug')('formio:teams:getTeams')
};

module.exports = function(app, formioServer) {
  // The formio teams resource id.
  var _teamResource = null;

  /**
   * Expose the functionality to allow a user leave a team.
   */
  app.post('/team/:teamId/leave', formioServer.formio.middleware.tokenHandler, function(req, res, next) {
    var util = formioServer.formio.util;

    if (!req.token || !req.token.user._id || !req.params.teamId) {
      return res.sendStatus(401);
    }

    loadTeams(function(team) {
      if (!team) {
        return res.sendStatus(400);
      }

      // Search for the given team, and check if the current user is a member, but not the owner.
      var query = {
        form: team,
        'data.members': {$elemMatch: {_id: {$in: [util.idToBson(req.token.user._id), util.idToString(req.token.user._id)]}}},
        deleted: {$eq: null}
      };
      debug.leaveTeams(JSON.stringify(query));

      formioServer.formio.resources.submission.model.findOne(query, function(err, document) {
        if (err || !document) {
          debug.leaveTeams(err);
          return res.sendStatus(400);
        }

        // Omit the given user from the members list.
        debug.leaveTeams(document);
        document.data = document.data || {};
        document.data.members = document.data.members || [];

        // Convert each _id to strings for comparison.
        document.data.members = _.map(document.data.members, function(element) {
          if (element._id) {
            element._id = util.idToString(element._id);
          }

          return element;
        });

        // Filter the _ids.
        document.data.members = _.uniq(_.reject(document.data.members, {_id: util.idToString(req.token.user._id)}));

        // Convert each _id to strings for comparison.
        document.data.members = _.map(document.data.members, function(element) {
          if (element._id) {
            element._id = util.idToBson(element._id);
          }

          return element;
        });

        // Save the updated team.
        document.markModified('data.members');
        document.save(function(err, update) {
          if (err) {
            debug.leaveTeams(err);
            return res.sendStatus(400);
          }

          debug.leaveTeams(update);
          return res.sendStatus(200);
        });
      });
    });
  });

  /**
   * Utility function to load the formio team resource.
   *
   * @param next {Function}
   *   The callback to invoke once the teams resource is loaded.
   */
  var loadTeams = function(next) {
    if (_teamResource) {
      return next(_teamResource);
    }

    formioServer.formio.resources.project.model.findOne({name: 'formio'}, function(err, formio) {
      if (err) {
        debug.loadTeams(err);
        return next(null);
      }

      debug.loadTeams('formio project: ' + formio._id);
      formioServer.formio.resources.form.model.findOne({name: 'team', project: formio._id}, function(err, teamResource) {
        if (err) {
          debug.loadTeams(err);
          return next(null);
        }

        debug.loadTeams('team resource: ' + teamResource._id);
        _teamResource = teamResource._id;
        return next(_teamResource);
      });
    });
  };

  /**
   * Get the teams that the given user is associated with.
   *
   * @param user {Object}
   *   The user Submission object.
   *
   * @returns {Promise}
   */
  var getTeams = function(user) {
    var util = formioServer.formio.util;
    var q = Q.defer();

    loadTeams(function(teamResource) {
      // Skip the teams functionality if no user or resource is found.
      if (!teamResource) {
        return q.reject('No team resource found.')
      }
      if (!user || user.hasOwnProperty('_id') && !user._id) {
        debug.getTeams(user);
        return q.reject('No user given.');
      }

      // Search for teams with id's stored as both BSON and strings.
      var query = {
        form: teamResource,
        'data.members': {$elemMatch: {_id: {$in: [util.idToBson(user._id), util.idToString(user._id)]}}},
        deleted: {$eq: null}
      };
      debug.getTeams(JSON.stringify(query));

      formioServer.formio.resources.submission.model.find(query, function(err, documents) {
        if (err) {
          debug.getTeams(err);
          return q.reject(err);
        }

        // Coerce results into an array and return the teams as objects.
        documents = documents || [];
        documents = _.map(documents, function(team) {
          return team.toObject();
        });

        return q.resolve(documents);
      });
    });

    return q.promise;
  };

  return {
    getTeams: getTeams
  };
};
