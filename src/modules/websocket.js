var _ = require('lodash');
module.exports = function(app, config) {
  var ProjectSocket = require('./websocket/ProjectSocket')(app.formio.formio);

  // Create a project socket.
  var socket = new ProjectSocket(app.server, config);

  // Register all traffic coming through submissions.
  app.use('/project/:projectId/form/:formId/submission', function(req, res, next) {

    // Create the socket request.
    var request = _.pick(req, [
      'method',
      'body',
      'url',
      'params',
      'query'
    ]);

    // Send the request to the socket.
    socket.send(request).then(function(data) {
      if (data && data.response) {
        if (data.response.status && (data.response.status !== 200)) {
          res.status(data.response.status).json(data.response.message);
          return;
        }
        if (data.response.body) {
          _.assign(req.body, data.response.body);
        }
      }
      next();
    }).catch(next);
  });
};
