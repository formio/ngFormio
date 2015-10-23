'use strict';

require('dotenv').load({silent: true});
var config = require('../config');
var Q = require('q');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var nunjucks = require('nunjucks');
var express = require('express');
var app = express();
var debug = require('debug')('formio:server');
var analytics = require('../src/analytics/index')(config);

// Build the paths for bootstrapping the formio test suite.
var _formio = path.dirname(require.resolve('formio'));
var _test = path.join(_formio, 'test');
var _bootstrap = path.join(_test, 'bootstrap');

module.exports = function() {
  var bootstrap = Q.defer();

  // Hook each request and add analytics support.
  app.use(analytics.hook);

  // Add Middleware necessary for REST API's
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(methodOverride('X-HTTP-Method-Override'));

  // Error handler for malformed JSON
  app.use(function(err, req, res, next) {
    if (err instanceof SyntaxError) {
      res.status(400).send(err.message);
    }
    else {
      next();
    }
  });

  // Bootstrap the formio test environment.
  var _server = require('formio')(config.formio);

  // Attach the analytics to the formio server.
  _server.analytics = analytics;
  // Try the connection on server start.
  _server.analytics.connect();

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
      forceSSL: config.formio.https ? 'true' : 'false',
      domain: config.formio.domain,
      appHost: config.formio.host,
      apiHost: config.formio.apiHost,
      formioHost: config.formio.formioHost
    });
  });

  // Mount getting started presentation.
  app.use('/start', express.static(__dirname + '/server/start'));

  // Include the swagger ui.
  app.use('/swagger', express.static(require('swagger-ui/index').dist));

  // Get the specs for each form.
  app.get('/project/:projectId/spec.html', function(req, res) {
    res.render('docs.html', {
      url: '/project/' + req.params.projectId + '/spec.json'
    });
  });

  // Get the specs for each form.
  app.get('/project/:projectId/form/:formId/spec.html', function(req, res) {
    res.render('docs.html', {
      url: '/project/' + req.params.projectId + '/form/' + req.params.formId + '/spec.json'
    });
  });

  // Establish our url alias middleware.
  app.use(require('../src/middleware/alias')(_server.formio));

  // Hook the app and bootstrap the formio hooks.
  var _settings = require('../src/hooks/settings')(app, _server);

  // Start the api server.
  require(_bootstrap)(app, _server, _settings, '/project/:projectId', config.formio)
    .then(function(state) {
      bootstrap.resolve({
        app: state.app,
        template: state.template
      });
    });

  return bootstrap.promise;
};
