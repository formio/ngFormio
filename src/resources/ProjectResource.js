'use strict';

var Resource = require('resourcejs');
var config = require('../../config');
var _ = require('lodash');
var debug = require('debug')('formio:resources:projects');

module.exports = function(router, formio) {
  var removeProjectSettings = function(req, res, next) {
    if (req.token && req.projectOwner && (req.token.user._id === req.projectOwner)) {
      debug('Showing project settings!');
      return next();
    }

    debug('Skipping project settings!');
    debug(res.resource.item);
    formio.middleware.filterResourcejsResponse(['settings']).call(this, req, res, next);
  };

  // Load the project plan filter for use.
  formio.middleware.projectPlanFilter = require('../middleware/projectPlanFilter')(formio);
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
      removeProjectSettings
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
      removeProjectSettings
    ],
    beforeIndex: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      formio.middleware.ownerFilter
    ],
    afterIndex: [
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings
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
      formio.middleware.projectPlanFilter
    ],
    afterPut: [
      require('../middleware/projectTemplate')(formio),
      formio.middleware.filterResourcejsResponse(hiddenFields),
      removeProjectSettings
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
