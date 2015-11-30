var CryptoJS = require('crypto-js');

module.exports = function(router) {
  var cache = require('../cache/cache')(router.formio.formio);

  var validate = function(file, settings) {
    return true;
  }

  router.post('/project/:projectId/storage/s3', function(req, res) {
    cache.loadProject(req, req.projectId, function(err, project) {
      if (!project.settings.storage || !project.settings.storage.s3) {
        return res.send(400);
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
        url: project.settings.storage.s3.url || 'https://' + project.settings.storage.s3.bucket + '.s3.amazonaws.com/',
        method: 'POST',
        data: {
          key: dir + file.name,
          AWSAccessKeyId: project.settings.storage.s3.AWSAccessKeyId,
          acl: project.settings.storage.s3.acl || "private",
          policy: new Buffer(JSON.stringify(policy)).toString('base64'),
          'Content-Type': file.type,
          filename: file.name
        }
      };
      response.data.signature = CryptoJS.HmacSHA1(response.data.policy, project.settings.storage.s3.AWSSecretKey).toString(CryptoJS.enc.Base64);
      return res.send(response);
    })
  });
}
