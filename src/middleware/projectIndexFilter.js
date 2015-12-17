'use strict';

var _ = require('lodash');

/**
 * Middleware to filter the project index request by owner and team access.
 *
 * @param formioServer
 * @returns {Function}
 */
module.exports = function(formioServer) {
  var debug = require('debug')('formio:middleware:projectIndexFilter');
  return function projectIndexFilter(req, res, next) {
    if (!req.user || !req.user._id || !req.user.roles) {
      debug(req.user);
      return res.sendStatus(401);
    }

    var roles = _.flattenDeep(_.map(req.user.roles, function(role) {
      return [formioServer.formio.util.idToString(role), formioServer.formio.util.idToBson(role)];
    }));

    debug('Roles: ' + JSON.stringify(roles));
    var query = {
      $or: [
        {owner: req.token.user._id},
        {
          $and: [
            {$or: [{'access.type': 'team_read'}, {'access.type': 'team_write'}, {'access.type': 'team_admin'}]},
            {'access.roles': {$in: roles}}
          ]
        }
      ]
    };

    debug('Query: ' + JSON.stringify(query));
    req.modelQuery = req.modelQuery || this.model;
    req.modelQuery = req.modelQuery.find(query);
    next();
  };
};
