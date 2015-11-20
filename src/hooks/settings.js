'use strict';

var _ = require('lodash');
var nunjucks = require('nunjucks');
nunjucks.configure([], {
  watch: false
});
var debug = require('debug')('formio:settings');
var o365Util = require('../actions/office365/util');
var nodeUrl = require('url');
var async = require('async');

module.exports = function(app, formioServer) {
  // Include the request cache.
  var cache = require('../cache/cache')(formioServer.formio);

  // Attach the project plans to the formioServer
  formioServer.formio.plans = require('../plans/index')(formioServer, cache);

  // Attach the teams to formioServer.
  formioServer.formio.teams = require('../teams/index')(app, formioServer);

  return {
    settings: function (settings, req, cb) {
      if (!req.projectId) {
        return cb('No project ID provided.');
      }

      // Load the project settings.
      cache.loadProject(req, req.projectId, function (err, project) {
        if (err) {
          return cb(err);
        }
        if (!project) {
          return cb('Could not find project');
        }

        // Call the callback with the project settings.
        cb(null, project.settings);
      });
    },
    on: {
      init: function (type, formio) {
        switch (type) {
          case 'alias':
            // Dynamically set the baseUrl.
            formio.middleware.alias.baseUrl = function (req) {
              return '/project/' + req.projectId;
            };

            // Add the alias handler.
            app.use(formio.middleware.alias);
            return true;
          case 'params':
            app.use(formio.middleware.params);
            return true;
          case 'token':
            app.use(formio.middleware.tokenHandler);
            app.use(require('../middleware/userProject')(cache));
            return true;
          case 'logout':
            app.get('/logout', formio.auth.logout);
            return false;
          case 'current':
            app.get('/current', formio.auth.currentUser);
            return false;
          case 'perms':
            app.use(formio.middleware.permissionHandler);
            return true;
        }

        return false;
      },
      formRequest: function (req, res) {
        // Make sure to always include the projectId in POST and PUT calls.
        if (req.method === 'PUT' || req.method === 'POST') {
          req.body.project = req.projectId || req.params.projectId;
        }
      },
      email: function (transport, settings, projectSettings, req, res) {
        if ((transport === 'outlook') && projectSettings.office365.email) {
          o365Util.request(formioServer, req, res, 'sendmail', 'Office365Mail', {
            Message: {
              Subject: nunjucks.renderString(settings.subject, req.body),
              Body: o365Util.getBody(settings.message, req.body),
              ToRecipients: o365Util.getRecipients(settings.emails, req.body),
              From: o365Util.getRecipient(projectSettings.office365.email)
            }
          });
        }
      }
    },
    alter: {
      resources: function (resources) {
        return _.assign(resources, require('../resources/resources')(app, formioServer.formio));
      },
      models: function (models) {
        // Add the project to the form schema.
        models.form.schema.add({
          project: {
            type: formioServer.formio.mongoose.Schema.Types.ObjectId,
            ref: 'project',
            index: true,
            required: true
          }
        });

        // Add additional models.
        return _.assign(models, require('../models/models')(formioServer));
      },
      actions: function (actions) {
        actions.office365contact = require('../actions/office365/Office365Contact')(formioServer);
        actions.office365calendar = require('../actions/office365/Office365Calendar')(formioServer);
        actions.hubspotContact = require('../actions/hubspot/hubspotContact')(formioServer);
        actions.oauth = require('../actions/oauth/OAuthAction')(formioServer);
        return actions;
      },
      emailTransports: function (transports, settings) {
        settings = settings || {};
        var office365 = settings.office365 || {};
        if (office365.tenant && office365.clientId && office365.email && office365.cert && office365.thumbprint) {
          transports.push(
            {
              transport: 'outlook',
              title: 'Outlook'
            }
          );
        }
        return transports;
      },
      url: function (url, req) {
        return '/project/' + req.projectId + url;
      },
      fieldUrl: function (url, form, field) {
        return '/project/' + form.project + url;
      },
      host: function(host, req) {
        // Load the project settings.
        var project = cache.currentProject(req);
        return project.name + '.' + host;
      },

      /**
       * Modify the given token.
       *
       * @param token {Object}
       *   The initial formio user token.
       * @param form {Object}
       *   The initial formio user resource form.
       *
       * @returns {Object}
       *   The modified token.
       */
      token: function(token, form) {
        token.form.project = form.project;
        return token;
      },

      isAdmin: function (isAdmin, req) {
        var _debug = require('debug')('formio:settings:isAdmin');

        // If no user is found, then return false.
        if (!req.token || !req.token.user) {
          _debug('Skipping - No user given');
          return false;
        }

        // Ensure we have a projectOwner
        if (!req.projectOwner) {
          _debug('Skipping - No project owner');
          return false;
        }

        // Project owners are default admins.
        isAdmin = (req.token.user._id === req.projectOwner);
        _debug(isAdmin);
        return isAdmin;
      },

      /**
       * Modify the access handlers.
       *
       * @param handlers {Array}
       *   The array of handlers for the access endpoints.
       * @param req {Object}
       *   The Express request Object.
       * @param res {Object}
       *   The Express request Object.
       * @param access {Object}
       *   The formio access object.
       *
       * @returns {Array}
       *   The modified access handlers.
       */
      getAccess: function (handlers, req, res, access) {
        /**
         * Calculate the project access.
         *
         * @param callback {Function}
         *   The callback function to invoke after completion.
         */
        var getProjectAccess = function(callback) {
          var _debug = require('debug')('formio:settings:getAccess#getProjectAccess');

          // Build the access object for this project.
          access.project = {};

          // Skip project access if no projectId was given.
          if (!req.projectId) {
            _debug('Skipping, no req.projectId');
            return callback(null);
          }

          // Load the project.
          cache.loadProject(req, req.projectId, function(err, project) {
            if (err) {
              _debug(err);
              return callback(err);
            }
            if (!project) {
              _debug('No project found with projectId: ' + req.projectId);
              return callback('No project found with projectId: ' + req.projectId);
            }

            // Store the Project Owners UserId, because they will have all permissions.
            if (project.owner) {
              access.project.owner = project.owner.toString();

              // Add the UserId of the Project Owner for the ownerFilter middleware.
              req.projectOwner = access.project.owner;
            }

            // Add the other defined access types.
            if (project.access) {
              project.access.forEach(function (permission) {
                access.project[permission.type] = access.project[permission.type] || [];

                // Convert the roles from BSON to comparable strings.
                permission.roles.forEach(function (id) {
                  access.project[permission.type].push(id.toString());
                });
              });
            }

            // Pass the access of this project to the next function.
            _debug(JSON.stringify(access));
            return callback(null);
          });
        };

        /**
         * Calculate the team access.
         *
         * @param callback {Function}
         *   The callback function to invoke after completion.
         */
        var getTeamAccess = function(callback) {
          var _debug = require('debug')('formio:settings:getAccess#getTeamAccess');

          // Modify the project access with teams functionality.
          access.project = access.project || {};

          // Skip teams access if no projectId was given.
          if (!req.projectId) {
            _debug('Skipping, no req.projectId');
            return callback(null);
          }

          // Load the project.
          cache.loadProject(req, req.projectId, function(err, project) {
            if (err) {
              _debug(err);
              return callback(err);
            }
            if (!project) {
              _debug('No project found with projectId: ' + req.projectId);
              return callback('No project found with projectId: ' + req.projectId);
            }

            // Skip teams processing, if this projects plan does not support teams.
            _debug(project);
            if (!project.plan || project.plan === 'community' || project.plan === 'basic') {
              return callback(null);
            }

            // Iterate the project access permissions, and search for teams functionality.
            if (project.access) {
              var teamAccess = _.filter(project.access, function(permission) {
                return _.startsWith(permission.type, 'team_');
              });
              _debug('Team Permissions: ' + JSON.stringify(teamAccess));

              teamAccess.forEach(function(permission) {
                _debug(permission);

                /**
                 * For the team_read permission, the following need to be added:
                 *   - read_all permissions on the project
                 *   - read_all permissions on all forms
                 *   - read_all permissions on all submissions
                 */
                if (permission.type === 'team_read') {
                  // Modify the project access.
                  access.project = access.project || {};
                  access.project.read_all = access.project.read_all || [];

                  // Modify the form access.
                  access.form = access.form || {};
                  access.form.read_all = access.form.read_all || [];

                  // Modify the submission access.
                  access.submission = access.submission || {};
                  access.submission.read_all = access.submission.read_all || [];

                  // Iterate each team in the team_read roles, and add their permissions.
                  permission.roles = permission.roles || [];
                  permission.roles.forEach(function(id) {
                    access.project.read_all.push(id.toString());
                    access.form.read_all.push(id.toString());
                    access.submission.read_all.push(id.toString());
                  });
                }

                /**
                 * For the team_write permission, the following need to be added:
                 *   - create_all permissions on the project
                 *   - create_all permissions on all forms
                 *   - read_all permissions on the project
                 *   - read_all permissions on all forms
                 *   - update_all permissions on the project
                 *   - update_all permissions on all forms
                 *   - delete_all permissions on all forms
                 */
                else if (permission.type === 'team_write') {
                  // Modify the project access.
                  access.project = access.project || {};
                  access.project.create_all = access.project.create_all || [];
                  access.project.read_all = access.project.read_all || [];
                  access.project.update_all = access.project.update_all || [];
                  access.project.delete_all = access.project.delete_all || [];

                  // Modify the form access.
                  access.form = access.form || {};
                  access.form.create_all = access.form.create_all || [];
                  access.form.read_all = access.form.read_all || [];
                  access.form.update_all = access.form.update_all || [];
                  access.form.delete_all = access.form.delete_all || [];

                  // Iterate each team in the team_write roles, and add their permissions.
                  permission.roles = permission.roles || [];
                  permission.roles.forEach(function(id) {
                    access.project.create_all.push(id.toString());
                    access.project.read_all.push(id.toString());
                    access.project.update_all.push(id.toString());
                    access.project.delete_all.push(id.toString());

                    access.form.create_all.push(id.toString());
                    access.form.read_all.push(id.toString());
                    access.form.update_all.push(id.toString());
                    access.form.delete_all.push(id.toString());
                  });
                }

                /**
                 * For the team_admin permission, the following need to be added:
                 *   - create_all permissions on the project
                 *   - create_all permissions on all forms
                 *   - create_all permissions on all submissions
                 *   - read_all permissions on the project
                 *   - read_all permissions on all forms
                 *   - read_all permissions on all submissions
                 *   - update_all permissions on the project
                 *   - update_all permissions on all forms
                 *   - update_all permissions on all submissions
                 *   - delete_all permissions on all forms
                 *   - delete_all permissions on all submissions
                 */
                else if (permission.type === 'team_admin') {
                  // Modify the project access.
                  access.project = access.project || {};
                  access.project.create_all = access.project.create_all || [];
                  access.project.read_all = access.project.read_all || [];
                  access.project.update_all = access.project.update_all || [];

                  // Modify the form access.
                  access.form = access.form || {};
                  access.form.create_all = access.form.create_all || [];
                  access.form.read_all = access.form.read_all || [];
                  access.form.update_all = access.form.update_all || [];
                  access.form.delete_all = access.form.delete_all || [];

                  // Modify the submission access.
                  access.submission = access.submission || {};
                  access.submission.create_all = access.submission.create_all || [];
                  access.submission.read_all = access.submission.read_all || [];
                  access.submission.update_all = access.submission.update_all || [];
                  access.submission.delete_all = access.submission.delete_all || [];

                  // Iterate each team in the team_admin roles, and add their permissions.
                  permission.roles = permission.roles || [];
                  permission.roles.forEach(function(id) {
                    access.project.create_all.push(id.toString());
                    access.project.read_all.push(id.toString());
                    access.project.update_all.push(id.toString());

                    access.form.create_all.push(id.toString());
                    access.form.read_all.push(id.toString());
                    access.form.update_all.push(id.toString());
                    access.form.delete_all.push(id.toString());

                    access.submission.create_all.push(id.toString());
                    access.submission.read_all.push(id.toString());
                    access.submission.update_all.push(id.toString());
                    access.submission.delete_all.push(id.toString());
                  });
                }
              });
            }

            // Pass the access of this Team to the next function.
            _debug(JSON.stringify(access));
            return callback(null);
          });
        };

        // Get the permissions for an Project with the given ObjectId.
        handlers.unshift(
          formioServer.formio.plans.checkRequest(req, res),
          getProjectAccess,
          getTeamAccess
        );
        return handlers;
      },

      /**
       * Hook they access entity and perform additional logic.
       *
       * @param entity {Object}
       *   The access entity object.
       * @param req {Object}
       *   The Express request Object.
       *
       * @returns {Object}
       *   The updated access entity object.
       */
      accessEntity: function (entity, req) {
        if(!entity && req.projectId) {
          // If the entity does not exist, and a projectId is present, then this is a project related access check.
          entity = {
            type: 'project',
            id: req.projectId
          }
        }
        else if(entity && entity.type == 'form') {
          // If this is a create form or index form, use the project as the access entity.
          var createForm = ((req.method === 'POST') && (Boolean(req.formId) === false));
          var indexForm = ((req.method === 'GET') && (Boolean(req.formId) === false));
          if (createForm || indexForm) {
            entity = {
              type: 'project',
              id: req.projectId
            };
          }
        }

        return entity;
      },

      /**
       * A secondary access check if router.formio.access.hasAccess fails.
       *
       * @param _hasAccess {Boolean}
       *   If the request has access to perform the given action
       * @param req {Object}
       *   The Express request Object.
       * @param access {Object}
       *   The calculated access object.
       * @param entity {Object}
       *   The access entity object.
       *
       * @returns {Boolean}
       *   If the user has access based on the request.
       */
      hasAccess: function(_hasAccess, req, access, entity) {
        var _debug = require('debug')('formio:settings:hasAccess');
        var _url = nodeUrl.parse(req.url).pathname;

        // Check requests not pointed at specific projects.
        if(!entity && !Boolean(req.projectId)) {
          // No project but authenticated.
          if (req.token) {
            if (req.method === 'POST' && _url === '/project') {
              _debug(req.userProject.primary);
              return req.userProject.primary;
            }

            // @TODO: Should this be restricted to only primary projects as well?
            if (_url === '/project') {
              _debug('true');
              return true;
            }

            if (_url === '/project/available') {
              _debug(req.userProject.primary);
              return req.userProject.primary;
            }

            _debug('Checking for Formio Access.');
            _debug('Formio URL: ' + _url);
            if (_url === '/current' || _url === '/logout') {
              _debug('true');
              return true;
            }

            // This req is unauthorized.
            _debug('false');
            return false;
          }
          // No project but anonymous.
          else {
            if (_url === '/spec.json' || _url === '/spec.html') {
              _debug('true');
              return true;
            }

            // This req is unauthorized.
            _debug('false');
            return false;
          }
        }

        // This request was made against a project and access was denied, check if the user is the owner.
        else if(req.token && access.project && access.project.owner) {
          if (req.token.user._id === access.project.owner) {
            if (
              (req.method === 'POST' || req.method === 'PUT') &&
              req.body.hasOwnProperty('owner') &&
              req.body.owner) {
              req.assignOwner = true;
            }

            // Allow the project owner to have access to everything.
            return true;
          }
        }

        // Access was not explicitly granted, therefore it was denied.
        return false;
      },

      /**
       * Hook the available permission types in the PermissionSchema.
       *
       * @param available {Array}
       *   The available permission types.
       *
       * @return {Array}
       *   The updated permission types.
       */
      permissionSchema: function(available) {
        available.push('team_read', 'team_write', 'team_admin');
        return available;
      },

      exportOptions: function (options, req, res) {
        var currentProject = cache.currentProject(req);
        options.title = currentProject.title;
        options.name = currentProject.name;
        options.description = currentProject.description;
        options.plan = currentProject.plan;
        options.projectId = req.projectId || req.params.projectId || 0;
        return options;
      },
      requestParams: function (req, params) {
        var projectId = params.project;
        if (projectId && projectId === 'available') {
          projectId = null;
        }
        req.projectId = projectId;
        return params;
      },
      cors: function () {
        return require('../middleware/corsOptions')(formioServer);
      },

      /**
       * Hook the user object and modify the roles to include the users team id's.
       *
       * @param user {Object}
       *   The current user object to modify.
       * @param next {Function}
       *   The callback function to invoke with the modified user object.
       */
      user: function(user, next) {
        var _debug = require('debug')('formio:settings:user');
        var util = formioServer.formio.util;
        _debug(user);

        // Force the user reference to be an object rather than a mongoose document.
        try {
          user = user.toObject();
        } catch(e) {}

        user.roles = user.roles || [];

        // Convert all the roles to strings
        user.roles = _.map(_.filter(user.roles), util.idToString);

        return formioServer.formio.teams.getTeams(user, true, true)
          .then(function(teams) {
            // Filter the teams to only contain the team ids.
            _debug(teams);
            teams = _.map(_.filter(_.pluck(teams, '_id')), util.idToString);

            // Add the users team ids, to their roles.
            user.roles = _.uniq(user.roles.concat(teams));
            _debug(user.roles);

            return next(null, user);
          }, function(err) {
            _debug(err);
            return next(null, user);
          })
          .denodeify(next);
      },

      /**
       * Hook a form query and add the requested projects information.
       *
       * @param query {Object}
       *   The Mongoose query to be performed.
       * @param req {Object}
       *   The Express request.
       * @param formio {Boolean}
       *   Whether or not the query is being used against the formio project.
       *
       * @returns {Object}
       *   The modified mongoose request object.
       */
      formQuery: function(query, req, formio) {
        var _debug = require('debug')('formio:settings:formQuery');

        // Determine which project to use, one in the request, or formio.
        _debug('formio: ' + formio);
        if (formio && formio === true) {
          cache.loadProjectByName(req, 'formio', function(err, _id) {
            if (err || !_id) {
              _debug(err || 'The formio project was not found..');
              return query;
            }

            query.project = formioServer.formio.mongoose.Types.ObjectId(_id);
            _debug(query);
            return query;
          });
        }
        else {
          req.projectId = req.projectId || req.params.projectId || 0;
          query.project = formioServer.formio.mongoose.Types.ObjectId(req.projectId);
          _debug(query);
          return query;
        }
      },
      formSearch: function (search, model, value) {
        search.project = model.project;
        return search;
      },
      cacheInit: function (cache) {
        cache.projects = {};
        return cache;
      },
      submissionRequest: function(actualPayload, requestedPayload) {
        // Whitelist the requested payload data that is processed by formio
        if(requestedPayload.oauth && (typeof requestedPayload.oauth === 'object')) {
          actualPayload.oauth = requestedPayload.oauth;
        }
        return actualPayload;
      },
      submissionRequestQuery: function (query, req) {
        query.projectId = req.projectId;
        return query;
      },
      submissionRequestTokenQuery: function (query, token) {
        query.projectId = token.form.project;
        return query;
      },
      submissionRoutes: function (routes) {
        var filterExternalTokens = formioServer.formio.middleware.filterResourcejsResponse(['externalTokens']);
        _(['afterGet', 'afterIndex', 'afterPost', 'afterPut', 'afterDelete'])
        .each(function(handler) {
          routes[handler].push(filterExternalTokens);
        });

        return routes;
      },
      submissionSchema: function (schema) {
        // Defines what each external Token should be.
        var ExternalTokenSchema = formioServer.formio.mongoose.Schema({
          type: String,
          token: String,
          exp: Date
        });
        schema.externalTokens = [ExternalTokenSchema];
        return schema;
      },
      newRoleAccess: function (handlers, req) {
        var projectId = req.projectId;

        /**
         * Async function to add the new role to the read_all access of the project.
         *
         * @param done
         */
        var updateProject = function(_role, done) {
          var _debug = require('debug')('formio:settings:updateProject');

          formioServer.formio.resources.project.model.findOne({
            _id: formioServer.formio.mongoose.Types.ObjectId(projectId)
          }, function (err, project) {
            if (err) {
              _debug(err);
              return done(err);
            }
            if (!project) {
              _debug('No Project found with projectId: ' + projectId);
              return done();
            }

            // Add the new roleId to the access list for read_all (project).
            _debug('Loaded project: ' + JSON.stringify(project));
            project.access = project.access || [];
            var found = false;
            for (var a = 0; a < project.access.length; a++) {
              if (project.access[a].type === 'read_all') {
                project.access[a].roles = project.access[a].roles || [];
                project.access[a].roles.push(_role);
                project.access[a].roles = _.uniq(project.access[a].roles);
                found = true;
              }
            }

            // The read_all permission type was not previously added.
            if (!found) {
              project.access.push({
                type: 'read_all',
                roles: [_role]
              });
            }

            // Save the updated permissions.
            project.save(function(err) {
              if (err) {
                _debug(err);
                return done(err);
              }

              _debug('Updated Project: ' + JSON.stringify(project.toObject()));
              done();
            });
          });
        };

        // Update the project when new roles are added.
        handlers.unshift(updateProject);
        return handlers;
      },
      roleQuery: function (query, req) {
        var projectId = req.projectId || req.params.projectId;
        query.project = formioServer.formio.mongoose.Types.ObjectId(projectId);
        return query;
      },
      roleRoutes: function (routes) {
        routes.before.unshift(require('../middleware/bootstrapEntityProject'), require('../middleware/projectFilter'));
        return routes;
      },
      roleSearch: function (search, model, value) {
        search.project = model.project;
        return search;
      },
      roleSchema: function (schema) {
        schema.add({
          project: {
            type: formioServer.formio.mongoose.Schema.Types.ObjectId,
            ref: 'project',
            index: true,
            required: true
          }
        });
        return schema;
      },
      formMachineName: function(machineName, document, done) {
        formioServer.formio.resources.project.model.findOne({_id: document.project}).exec(function (err, project) {
          if (err) { return done(err); }
          done(null, project.machineName + ':' + machineName);
        });
      },
      roleMachineName: function(machineName, document, done) {
        formioServer.formio.resources.project.model.findOne({_id: document.project}).exec(function (err, project) {
          if (err) { return done(err); }
          done(null, project.machineName + ':' + machineName);
        });
      },
      actionMachineName: function(machineName, document, done) {
        formioServer.formio.resources.form.model.findOne({_id: document.form}).exec(function (err, form) {
          if (err) { return done(err); }
          done(null, form.machineName + ':' + machineName);
        });
      },
      machineNameExport: function(machineName) {
        return machineName.split(':').slice(-1)[0];
      }
    }
  }
};
