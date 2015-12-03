var CryptoJS = require('crypto-js');
var AWS = require('aws-sdk');

module.exports = function(router) {
  var cache = require('../cache/cache')(router.formio.formio);

  router.post('/project/:projectId/form/:formId/storage/s3', function(req, res) {
    if (req.body && !req.body.type) {
      return res.status(400).send('Type parameter required.');
    }
    cache.loadProject(req, req.projectId, function(err, project) {
      if (!project.settings.storage || !project.settings.storage.s3) {
        return res.status(400).send('Storage settings not set.');
      }
      switch (req.body.type.toLowerCase()) {
        case 'put':
          if (!req.body.file) {
            return res.status(400).send('File parameter with name, size and type are requred.');
          }
          var file = req.body.file;
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
          return res.send(response);
        break;

        case 'get':
          if (!req.body.file) {
            return res.status(400).send('File parameter is required.');
          }
          var file = req.body.file;
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
            res.send(url);
          });
          break;
      }
    });
  });
}
