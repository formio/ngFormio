'use strict';

var _ = require('lodash');
var Q = require('q');
var debug = {
  loadTeams: require('debug')('formio:teams:loadTeams'),
  getTeams: require('debug')('formio:teams:getTeams')
};

module.exports = function(formioServer) {
  // The formio teams resource id.
  var _teamResource = null;

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
