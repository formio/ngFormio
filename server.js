'use strict';

require('dotenv').load({silent: true});
var config = require('./config');
var jslogger = require('jslogger')({key: config.jslogger});
var express = require('express');
var nunjucks = require('nunjucks');
var o365Util = require('./src/actions/office365/util');
var debug = require('debug')('formio:permissions');
var _ = require('lodash');
var cors = require('cors');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var app = express();
app.use(cors());

// Add Middleware necessary for REST API's
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

// Create the formio server.
var formioServer = require('formio')(config.formio);

// Configure nunjucks.
nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: false
});

// Redirect www to the right server.
app.use(function(req, res, next) {
  if (req.get('Host').split('.')[0] !== 'www') {
    return next();
  }
  var parts = req.get('Host').split('.');
  parts.shift(); // Remove www
  res.redirect('http://' + parts.join('.') + req.url);
});

// Make sure to redirect all http requests to https.
app.use(function(req, res, next) {
  if (!config.https || req.secure || (req.get('X-Forwarded-Proto') === 'https') || req.url === '/health') {
    return next();
  }

  res.redirect('https://' + req.get('Host') + req.url);
});

// CORS Support
app.use(require('cors')());

// Host the dynamic app configuration.
app.get('/config.js', function(req, res) {
  res.set('Content-Type', 'text/javascript');
  res.render('js/config.js', {
    forceSSL: config.https ? 'true' : 'false',
    domain: config.domain,
    appHost: config.host,
    apiHost: config.apiHost,
    formioHost: config.formioHost
  });
});

// Mount getting started presentation.
app.use('/start', express.static(__dirname + '/server/start'));

// Include the swagger ui.
app.use('/swagger', express.static(require('swagger-ui').dist));

// Get the specs for each form.
app.get('/project/:projectId/spec.html', function(req, res) {
  res.render('docs.html', {
    url: '/project/' + req.params.projectId + '/spec.json'
  });
});

// Get the specs for each form.
app.get('/project/:projectId/form/:formId/spec.html', function(req, res) {
  res.render('docs.html', {
    url: '/project/' + req.projectId + '/form/' + req.formId + '/spec.json'
  });
});

// Establish our url alias middleware.
app.use(require('./src/middleware/alias')(formioServer.formio));

// Include the request cache.
var cache = require('./src/cache/cache')(formioServer.formio);

// Start the api server.
formioServer.init({
  settings: function(settings, req, cb) {
    if (!req.projectId) {
      return cb('No project ID provided.');
    }

    // Load the project settings.
    cache.loadProject(req, req.projectId, function(err, project) {
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
    init: function(type, formio) {
      switch (type) {
        case 'alias':

          // Dyanmically set the baseUrl.
          formio.middleware.alias.baseUrl = function(req) {
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
          return true;
        case 'current':
          app.get('/current', formio.auth.currentUser);
          return true;
        case 'perms':
          app.use(formio.middleware.permissionHandler);
          return true;
      }

      return false;
    },
    formRequest: function(req, res) {
      // Make sure to always include the projectId in POST and PUT calls.
      if (req.method === 'PUT' || req.method === 'POST') {
        req.body.project = req.projectId || req.params.projectId;
      }
    },
    email: function(transport, settings, projectSettings, req, res) {
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
    resources: function(resources) {
      return _.assign(resources, require('./src/resources/resources')(app, formioServer.formio));
    },
    models: function(models) {

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
      return _.assign(models, require('./src/models/models')(formioServer));
    },
    actions: function(actions) {
      actions.office365contact = require('./src/actions/office365/Office365Contact')(formioServer);
      actions.office365calendar = require('./src/actions/office365/Office365Calendar')(formioServer);
      return actions;
    },
    emailTransports: function(transports, settings) {
      var office365 = settings.office365 || {};
      if(office365.tenant && office365.clientId && office365.email && office365.cert && office365.thumbprint) {
        transports.push(
          {
            transport: 'outlook',
            title: 'Outlook'
          }
        );
      }
      return transports;
    },
    url: function(url, req) {
      return '/project/' + req.projectId + url;
    },
    fieldUrl: function(url, form, field) {
      return '/project/' + form.project + url;
    },
    token: function(token, user, form) {
      token.form.project = form.project;
      return token;
    },
    isAdmin: function(isAdmin, req) {

      // If no user is found, then return false.
      if (!req.token || !req.token.user) {
        return false;
      }

      // Ensure we have a projectOwner
      if (!req.projectOwner) {
        return false;
      }

      // Project owners are default admins.
      return req.token.user._id === req.projectOwner;
    },
    getAccess: function(handlers, req, res, access) {
      // Get the permissions for an Project with the given ObjectId.
      handlers.unshift(function getProjectAccess(callback) {
        // Build the access object for this project.
        access.project = {};

        // Skip project access if no projectId was given.
        if (!req.projectId) {
          return callback(null, access);
        }

        // Load the project.
        cache.loadProject(req, req.projectId, function(err, project) {
          if (err) {
            return callback(400);
          }
          if (!project) {
            return callback(404);
          }

          // Store the Project Owners UserId, because they will have all permissions.
          if (project.owner) {
            access.project.owner = project.owner.toString();

            // Add the UserId of the Project Owner for the ownerFilter middleware.
            req.projectOwner = access.project.owner;
          }

          // Add the other defined access types.
          if (project.access) {
            project.access.forEach(function(permission) {
              access.project[permission.type] = access.project[permission.type] || [];

              // Convert the roles from BSON to comparable strings.
              permission.roles.forEach(function(id) {
                access.project[permission.type].push(id.toString());
              });
            });
          }

          // Pass the access of this project to the next function.
          return callback(null);
        });
      });
      return handlers;
    },
    accessEntity: function(entity, req) {
      if (entity.type == 'form') {

        // If this is a create form or index form, use project as the access entity.
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
    access: function(hasAccess, req, access) {

      // Determine if the current request has access to the given Project.
      if (!Boolean(req.projectId)) {
        if (req.method === 'POST' && req.url === '/project') {
          if (req.token) {
            // User is authenticated.
            return true;
          }

          // User is not authenticated and therefore cannot make a new project.
          return false;
        }

        debug('Checking for Formio Access.');
        debug('Formio URL: ' + req.url);
        if (req.url === '/current') {
          if (req.token) {
            return true;
          }
        }

        if (req.url === '/project') {
          if (req.token) {
            return true;
          }
        }

        if (req.url === '/project/available') {
          return true;
        }

        if (req.url === '/spec.json' || req.url === '/spec.html') {
          return true;
        }

        // This req is unauthorized.
        return false;
      }
      else {
        return formioServer.formio.access.hasAccess(req, access, {
          type: 'project',
          id: req.projectId
        });
      }
    },
    hasAccess: function(_hasAccess, req, access) {
      if (req.token && access.project && access.project.owner) {
        if (req.token.user._id === access.project.owner) {
          if (
            (req.method === 'POST' || req.method === 'PUT') &&
            req.body.hasOwnProperty('owner') &&
            req.body.owner)
          {
            req.assignOwner = true;
          }

          // Allow the project owner to have access to everything.
          _hasAccess = true;
        }
      }
      return _hasAccess;
    },
    requestParams: function(req, params) {
      var projectId = params.project;
      if (projectId && projectId === 'available') {
        projectId = null;
      }
      req.projectId = projectId;
      return params;
    },
    cors: function() {
      return require('./src/middleware/corsOptions')(formioServer)
    },
    formQuery: function(query, req) {
      req.projectId = req.projectId || req.params.projectId || 0;
      query.project = formioServer.formio.mongoose.Types.ObjectId(req.projectId);
      return query;
    },
    formSearch: function(search, model, value) {
      search.project = model.project;
      return search;
    },
    cacheInit: function(cache) {
      cache.projects = {};
      return cache;
    },
    submissionRequestQuery: function(query, req) {
      query.projectId = req.projectId
      return query;
    },
    submissionRequestTokenQuery: function(query, token) {
      query.projectId = token.form.project;
      return query;
    },
    newRoleAccess: function(handlers, req) {
      var projectId = req.projectId;

      /**
       * Async function to add the new role to the read_all access of the project.
       *
       * @param done
       */
      var updateProject = function(done) {
        formioServer.formio.resources.project.model.findOne({
          query: {
            _id: formioServer.formio.mongoose.Types.ObjectId(projectId)
          },
          $snapshot: true
        }, function(err, project) {
          if (err) {
            debug(err);
            return done(err);
          }
          if (!project) {
            debug('No Project found with projectId: ' + projectId);
            return done();
          }

          // Add the new roleId to the access list for read_all (project).
          debug('Loaded project: ' + JSON.stringify(project));
          project.access = project.access || [];
          var found = false;
          for (var a = 0; a < project.access.length; a++) {
            if (project.access[a].type === 'read_all') {
              project.access[a].roles = project.access[a].roles || [];
              project.access[a].roles.push(roleId);
              project.access[a].roles = _.uniq(project.access[a].roles);
              found = true;
            }
          }

          // The read_all permission type was not previously added.
          if (!found) {
            project.access.push({
              type: 'read_all',
              roles: [roleId]
            });
          }

          // Save the updated permissions.
          formioServer.formio.resources.project.model.update(
            {_id: formioServer.formio.mongoose.Types.ObjectId(projectId)},
            {$set: {access: project.access}},
            {new: true},
            function(err, doc) {
              if (err) {
                debug(err);
                return done(err);
              }

              debug(project.access);
              done();
            }
          );
        });
      };

      // Update the project when new roles are added.
      handlers.shift(updateProject);
      return handlers;
    },
    roleQuery: function(query, req) {
      query.project = req.projectId ? req.projectId : req.params.projectId;
      return query;
    },
    roleRoutes: function(routes) {
      routes.before.unshift(require('./src/middleware/projectFilter'));
      return routes;
    },
    roleSearch: function(search, model, value) {
      search.project = model.project;
      return search;
    },
    roleSchema: function(schema) {
      schema.add({
        project: {
          type: formioServer.formio.mongoose.Schema.Types.ObjectId,
          ref: 'project',
          index: true,
          required: true
        }
      });
      return schema;
    }
  }
}).then(function(formio) {

  // The formio app sanity endpoint.
  app.get('/health', function(req, res, next) {
    if (!formio.resources) {
      return res.status(500).send('No Resources');
    }
    if (!formio.resources.project.model) {
      return res.status(500).send('No Project model');
    }

    formio.resources.project.model.findOne({name: 'formio'}, function(err, result) {
      if (err) {
        return res.status(500).send(err);
      }
      if (!result) {
        return res.status(500).send('Formio Project not found');
      }

      // Proceed with db schema sanity check middleware.
      next();
    });
  }, formio.update.sanityCheck);

  // Mount formio at /project/:projectId.
  app.use('/project/:projectId', formioServer);
  console.log(' > Listening to ' + config.protocol + '://' + config.domain + ':' + config.port);
  app.listen(config.port);
});

process.on('uncaughtException', function(err) {
  console.log('Uncaught exception: ' + err.stack);
  jslogger.log(err.stack);
  process.exit(1);
});
