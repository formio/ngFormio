
module.exports = function(router) {
  var cache = require('../cache/cache')(router.formio.formio);

  router.get('/project/:projectId/storage/s3', function(req, res) {
    console.log(req.projectId);
    cache.loadProject(req, req.projectId, function(err, project) {
      console.log(project);
      res.send('test');
    })
  });
}
