'use strict';

var Resource = require('resourcejs');
var config = require('../../config');
var _ = require('lodash');
var debug = require('debug')('formio:resources:projects');

module.exports = function(router, formio) {
  var resource = Resource(
    router,
    '',
    'project',
    formio.mongoose.model('project', formio.schemas.project)
  ).rest({
    beforePost: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      function(req, res, next) {
        if (req.body && req.body.template) {
          req.template = req.body.template;
          delete req.body.template;
        }
        next();
      },
      formio.middleware.bootstrapEntityOwner,
      formio.middleware.condensePermissionTypes
    ],
    afterPost: [
      require('../middleware/projectTemplate')(formio),
      formio.middleware.filterResourcejsResponse(['deleted', '__v'])
    ],
    beforeIndex: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      formio.middleware.ownerFilter
    ],
    beforePut: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      formio.middleware.condensePermissionTypes
    ],
    beforeDelete: [
      formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      require('../middleware/deleteProjectHandler')(formio)
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
