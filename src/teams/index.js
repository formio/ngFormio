'use strict';

var _ = require('lodash');
var Q = require('q');
var debug = {
  teamAll: require('debug')('formio:teams:teamAll'),
  teamOwn: require('debug')('formio:teams:teamOwn'),
  leaveTeams: require('debug')('formio:teams:leaveTeams'),
  loadTeams: require('debug')('formio:teams:loadTeams'),
  getTeams: require('debug')('formio:teams:getTeams'),
  getProjectTeams: require('debug')('formio:teams:getProjectTeams'),
  getDisplayableTeams: require('debug')('formio:teams:getDisplayableTeams'),
  filterTeamsForDisplay: require('debug')('formio:teams:filterTeamsForDisplay')
};

module.exports = function(app, formioServer) {
  // The formio teams resource id.
  var _teamResource = null;

  /**
   * Allow a user with permissions to get all the teams associated with the given project.
   */
  app.get(
    '/team/project/:projectId',
    formioServer.formio.middleware.tokenHandler,
    function(req, res, next) {
      if(!req.projectId && req.params.projectId) {
        req.projectId = req.params.projectId;
      }

      next();
    },
    formioServer.formio.middleware.permissionHandler,
    function(req, res, next) {
      if(!req.projectId) {
        return res.sendStatus(401);
      }

      getProjectTeams(req, req.projectId, function(err, teams) {
        if(err) {
          return res.sendStatus(400);
        }
        if(!teams) {
          return res.status(200).json([]);
        }

        getDisplayableTeams(teams)
          .then(function(teams) {
            return filterTeamsForDisplay(teams);
          }, function(err) {
            return res.sendStatus(400);
          })
          .then(function(teams) {
            return res.status(200).json(teams);
          }, function(err) {
            return res.sendStatus(400);
          });
      });
    }
  );

  /**
   * Expose the functionality to find all of a users teams.
   */
  app.get('/team/all', formioServer.formio.middleware.tokenHandler, function(req, res, next) {
    if (!req.token || !req.token.user._id) {
      return res.sendStatus(401);
    }

    getTeams(req.token.user, true, true)
      .then(function(teams) {
        teams = teams || [];
        teams = filterTeamsForDisplay(teams);

        debug.teamAll(teams);
        return res.status(200).json(teams);
      }, function(err) {
        debug.teamAll(err);
        return res.sendStatus(400);
      });
  });

  /**
   * Expose the functionality to find all the teams a user owns.
   */
  app.get('/team/own', formioServer.formio.middleware.tokenHandler, function(req, res, next) {
    debug.teamOwn(!req.token || !req.token.user._id);

    if (!req.token || !req.token.user._id) {
      return res.sendStatus(401);
    }

    getTeams(req.token.user, false, true)
      .then(function(teams) {
        teams = teams || [];
        teams = filterTeamsForDisplay(teams);

        debug.teamOwn(teams);
        return res.status(200).json(teams);
      }, function(err) {
        debug.teamOwn(err);
        return res.sendStatus(400);
      });
  });

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
   * @param user {Object|String}
   *   The user Submission object or user _id.
   * @param member {Boolean}
   *   Determines if the query should include teams the given user is a member of.
   * @param owner {Boolean}
   *   Determines if the query should include teams owned buy the given user.
   *
   * @returns {Promise}
   */
  var getTeams = function(user, member, owner) {
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

      // Force the user ref to be the _id.
      user = user._id || user;

      // Build the search query for teams.
      var query = {
        form: teamResource,
        deleted: {$eq: null}
      };

      // Modify the search query based on the given criteria, search for BSON and string versions of ids.
      debug.getTeams('User: ' + util.idToString(user) + ', Member: ' + member + ', Owner: ' + owner);
      if(member && owner) {
        query['$or'] = [
          {'data.members': {$elemMatch: {_id: {$in: [util.idToBson(user), util.idToString(user)]}}}},
          {owner: {$in: [util.idToBson(user), util.idToString(user)]}}
        ];
      }
      else if(member && !owner) {
        query['data.members'] = {$elemMatch: {_id: {$in: [util.idToBson(user), util.idToString(user)]}}};
      }
      else if(!member && owner) {
        query['owner'] = {$in: [util.idToBson(user), util.idToString(user)]};
      }
      else {
        // Fail safely for incorrect usage of getTeams.
        debug.getTeams('Could not build team query because given parameters were incorrect.');
        return q.resolve([]);
      }

      debug.getTeams(JSON.stringify(query));
      formioServer.formio.resources.submission.model.find(query, function(err, documents) {
        if (err) {
          debug.getTeams(err);
          return q.reject(err);
        }

        // Coerce results into an array and return the teams as objects.
        debug.getTeams(documents);
        documents = documents || [];
        documents = _.map(documents, function(team) {
          return team.toObject();
        });

        return q.resolve(documents);
      });
    });

    return q.promise;
  };

  /**
   * Get all the teams associated with the given project.
   *
   * @param req {Object}
   *   The express request object.
   * @param project {String|Object}
   *   The project object or _id to search for the associated teams.
   * @param next {Function}
   *   The callback function to invoke after getting the project teams.
   */
  var getProjectTeams = function(req, project, next) {
    var cache = require('../cache/cache')(formioServer.formio);

    if(!project || project.hasOwnProperty('_id') && !project._id) {
      debug.getProjectTeams('No project given to find its teams.');
      return next('No project given.');
    }

    project = project._id || project;
    cache.loadProject(req, project, function(err, project) {
      if(err) {
        debug.getProjectTeams(err);
        return next(err);
      }

      var teams = _.flatten(_.pluck(_.filter(project.access, function(permission) {
        if(_.startsWith(permission.type, 'team_')) {
          return true;
        }

        return false;
      }), 'roles')) || [];
      debug.getProjectTeams(teams);

      next(null, teams);
    });
  };

  /**
   * Converts team _ids into visible team information.
   *
   * @param teams {Object|Array}
   *   A team _id or array of team _ids to be converted into displayable information.
   *
   * @returns {Promise}
   */
  var getDisplayableTeams = function(teams) {
    var util = formioServer.formio.util;
    var q = Q.defer();

    loadTeams(function(teamResource) {
      // Skip the teams functionality if no user or resource is found.
      if(!teamResource) {
        return q.reject('No team resource found.')
      }
      if(!teams || teams.hasOwnProperty('_id') && !teams._id) {
        debug.getDisplayableTeams(teams);
        return q.reject('No project given.');
      }

      // Force the teams ref to be an array of team ids.
      debug.getDisplayableTeams(teams);
      if(teams instanceof Array) {
        teams = _.map(teams, function(team) {
          var _id = team._id || team;
          return util.idToString(_id);
        });
      }
      else {
        teams = [teams._id] || [teams];
      }

      // Flatten the list of teams, and build the query to include string and BSON ids.
      teams = _.filter(teams);
      teams = _.flattenDeep(_.map(teams, function(team) {
        return [util.idToString(team), util.idToBson(team)];
      }));
      debug.getDisplayableTeams(teams);

      // Build the search query for teams.
      var query = {
        form: util.idToBson(teamResource),
        deleted: {$eq: null},
        _id: {$in: teams}
      };

      debug.getDisplayableTeams('Query: ' + JSON.stringify(query));
      formioServer.formio.resources.submission.model.find(query, function(err, documents) {
        if(err) {
          debug.getDisplayableTeams(err);
          return q.reject(err);
        }

        // Coerce results into an array and return the teams as objects.
        debug.getDisplayableTeams(documents);
        return q.resolve(documents);
      });
    });

    return q.promise;
  };

  /**
   * Filter submission results for a team.
   *
   * @param teams {Object|Array}
   *   The results of a single (or multiple) team that should be filtered for end user consumption.
   *
   * @return {Object|Array}
   *   The filtered results.
   */
  var filterTeamsForDisplay = function(teams) {
    var singleTeam = false;

    if(!teams) {
      debug.filterTeamsForDisplay('No teams given');
      return [];
    }
    if(!(teams instanceof Array)) {
      debug.filterTeamsForDisplay('One team given: ' + JSON.stringify(teams));
      singleTeam = true;
      teams = [teams];
    }

    teams = teams || [];
    teams = _.map(teams, function(team) {
      try {
        team = team.toObject();
      } catch(e) {}

      team = team || {};
      team.data = team.data || {};
      team.data.name = team.data.name || '';
      team.data.members = team.data.members || [];

      // The sanitized version of the team.
      debug.filterTeamsForDisplay('Team: ' + JSON.stringify(team));
      return {
        _id: team._id || '',
        owner: team.owner || '',
        data: {
          name: team.data.name || '',
          members: _.map(team.data.members, function(member) {
            return {
              _id: member._id,
              name: member.name
            }
          })
        }
      };
    });

    // Unwrap the single team, if flagged before filtering.
    if(singleTeam) {
      teams = teams[0];
    }

    debug.filterTeamsForDisplay(teams);
    return teams;
  };

  return {
    getTeams: getTeams,
    getProjectTeams: getProjectTeams,
    getDisplayableTeams: getDisplayableTeams,
    filterTeamsForDisplay: filterTeamsForDisplay
  };
};
