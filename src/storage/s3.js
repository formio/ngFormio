var CryptoJS = require('crypto-js');
var AWS = require('aws-sdk');
var debug = require('debug')('formio:storage:s3');

module.exports = function(router) {
  var cache = require('../cache/cache')(router.formio.formio);

  router.get('/project/:projectId/form/:formId/storage/s3',
    router.formio.formio.middleware.tokenHandler,
    function(req, res, next) {
      debug('Setting project and form ids for get');
      if(!req.projectId && req.params.projectId) {
        req.projectId = req.params.projectId;
      }
      if (!req.formId && req.params.formId) {
        req.formId = req.params.formId;
      }
      next();
    },
    router.formio.formio.middleware.permissionHandler,
    function(req, res) {
      debug('Signing GET request');
      cache.loadProject(req, req.projectId, function(err, project) {
        debug('Project Loaded: ' + req.projectId);
        if (!project.settings.storage || !project.settings.storage.s3) {
          return res.status(400).send('Storage settings not set.');
        }
        var file = {
          bucket: req.query.bucket,
          key: req.query.key
        };
        var s3 = new AWS.S3({
          accessKeyId: project.settings.storage.s3.AWSAccessKeyId,
          secretAccessKey: project.settings.storage.s3.AWSSecretKey
        });
        s3.getSignedUrl('getObject', {
          Bucket: file.bucket,
          Key: file.key
        }, function(err, url) {
          if (err) {
            return res.status(400).send(err);
          }
          debug(url);
          res.send({
            url: url
          });
        });
      });
    }
  );

  router.post('/project/:projectId/form/:formId/storage/s3',
    router.formio.formio.middleware.tokenHandler,
    function(req, res, next) {
      debug('Setting project and form ids for post');
      if(!req.projectId && req.params.projectId) {
        req.projectId = req.params.projectId;
      }
      if (!req.formId && req.params.formId) {
        req.formId = req.params.formId;
      }
      next();
    },
    router.formio.formio.middleware.permissionHandler,
    function(req, res) {
      debug('Signing POST request');
      cache.loadProject(req, req.projectId, function(err, project) {
        debug('Project Loaded: ' + req.projectId);
        if (!project.settings.storage || !project.settings.storage.s3) {
          return res.status(400).send('Storage settings not set.');
        }
        var file = req.body;
        var dir = project.settings.storage.s3.startsWith || "";
        var expiration_seconds = project.settings.storage.s3.expiration || (15 * 60);
        var expiration = new Date(Date.now() + (expiration_seconds * 1000));
        var policy = {
          expiration: expiration.toISOString(),
          conditions: [
            {"bucket": project.settings.storage.s3.bucket},
            ["starts-with", "$key", dir],
            {"acl": project.settings.storage.s3.acl || "private"},
            ["starts-with", "$Content-Type", ""],
            ["starts-with", "$filename", ""],
            ["content-length-range", 0, project.settings.storage.s3.maxSize || (100 * 1024 * 1024)]
          ]
        }

        var response = {
          url: project.settings.storage.s3.bucketUrl || 'https://' + project.settings.storage.s3.bucket + '.s3.amazonaws.com/',
          bucket: project.settings.storage.s3.bucket,
          data: {
            key: dir,
            AWSAccessKeyId: project.settings.storage.s3.AWSAccessKeyId,
            acl: project.settings.storage.s3.acl || "private",
            policy: new Buffer(JSON.stringify(policy)).toString('base64'),
            'Content-Type': file.type,
            filename: file.name
          }
        };
        response.data.signature = CryptoJS.HmacSHA1(response.data.policy, project.settings.storage.s3.AWSSecretKey).toString(CryptoJS.enc.Base64);
        debug(response);
        return res.send(response);
      });
    }
  );
}
