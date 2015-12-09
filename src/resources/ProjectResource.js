'use strict';

var Resource = require('resourcejs');
var config = require('../../config');
var _ = require('lodash');
var debug = require('debug')('formio:resources:projects');

module.exports = function(router, formioServer) {
  var formio = formioServer.formio;
  var removeProjectSettings = function(req, res, next) {
    if (req.token && req.projectOwner && (req.token.user._id === req.projectOwner)) {
      debug('Showing project settings to Owner');
      return next();
    }
    else if (req.projectId && req.user) {
      var cache = require('../cache/cache')(formio);
      cache.loadProject(req, req.projectId, function(err, project) {
        if(!err) {
          var access = _.map(_.pluck(_.filter(project.access, {type: 'team_admin'}), 'roles'), formio.util.idToString);
          var roles = _.map(req.user.roles, formio.util.idToString);

          if( _.intersection(access, req.user.roles).length !== 0) {
            debug('Showing project settings to team_admin user');
            return next();
          }
        }
        else {
          debug(err);
        }

        debug('Skipping project settings!');
        debug(res.resource.item);
        formio.middleware.filterResourcejsResponse(['settings']).call(this, req, res, next);
      });
    }
    else {
      debug('Skipping project settings!');
      debug(res.resource.item);
      formio.middleware.filterResourcejsResponse(['settings']).call(this, req, res, next);
    }
  };

  // Load the project plan filter for use.
  formio.middleware.projectPlanFilter = require('../middleware/projectPlanFilter')(formio);

  // Load the project analytics middleware.
  formio.middleware.projectAnalytics = require('../middleware/projectAnalytics')(formioServer);

  // Load the team owner filter for use.
  formio.middleware.projectAccessFilter = require('../middleware/projectAccessFilter')(formio);

  var hiddenFields = ['deleted', '__v', 'machineName', 'primary'];
  var resource = Resource(
    router,
    '',
    'project',
    formio.mongoose.model('project', formio.schemas.project)
  ).rest({
    beforeGet: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true})
    ],
    afterGet: [
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings,
      formio.middleware.projectAnalytics
    ],
    beforePost: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      function(req, res, next) {
        if (req.body && req.body.template) {
          req.template = req.body.template;
          req.templateMode = 'create';
          delete req.body.template;
        }
        next();
      },
      formio.middleware.bootstrapEntityOwner(false),
      formio.middleware.condensePermissionTypes,
      formio.middleware.projectPlanFilter
    ],
    afterPost: [
      require('../middleware/projectTemplate')(formio),
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings,
      formio.middleware.projectAnalytics,
      function(req, res, next) {
        // move on as we don't need to wait on results.
        next();

        if (process.env.hasOwnProperty('HUBSPOT_PROJECT_FIELD')) {
          formio.resources.project.model.findOne({
            name: 'formio',
            primary: true
          }).exec(function(err, project) {
            var modReq = _.clone(req);
            modReq.projectId = project._id;
            var projectFieldName = process.env.HUBSPOT_PROJECT_FIELD;
            var options = {settings: {}};
            options.settings[projectFieldName + '_action'] = 'increment';
            options.settings[projectFieldName + '_value'] = '1';
            options.settings['lifecyclestage_action'] = 'value';
            options.settings['lifecyclestage_value'] = 'opportunity';

            var ActionClass = formio.actions.actions['hubspotContact'];
            var action = new ActionClass(options, modReq, res);
            action.resolve('after', 'create', modReq, res, function() {});
          });
        }
      }
    ],
    beforeIndex: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      formio.middleware.ownerFilter
    ],
    afterIndex: [
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings,
      formio.middleware.projectAnalytics
    ],
    beforePut: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      function(req, res, next) {
        if (req.body && req.body.template) {
          req.template = req.body.template;
          req.templateMode = 'update';
          delete req.body.template;
        }
        next();
      },
      formio.middleware.condensePermissionTypes,
      formio.middleware.projectAccessFilter,
      formio.middleware.projectPlanFilter
    ],
    afterPut: [
      require('../middleware/projectTemplate')(formio),
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings,
      formio.middleware.projectAnalytics
    ],
    beforeDelete: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      require('../middleware/deleteProjectHandler')(formio)
    ],
    afterDelete: [
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings
    ]
  });

  router.post('/project/available', function(req, res, next) {
    if(!req.body || !req.body.name) {
      return res.status(400).send('"name" parameter is required');
    }
    if(config.reservedSubdomains && _.contains(config.reservedSubdomains, req.body.name)) {
      return res.status(200).send({available: false});
    }

    resource.model.findOne({name: req.body.name, deleted: {$eq: null}}, function(err, project) {
      if (err) {
        debug(err);
        return next(err);
      }

      debug('Project is available: ' + !project);
      return res.status(200).json({available: !project});
    });
  });

  return resource;
};
