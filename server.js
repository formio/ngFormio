'use strict';

require('dotenv').load({silent: true});
var config = require('./config');
var jslogger = require('jslogger')({key: config.jslogger});
var express = require('express');
var nunjucks = require('nunjucks');
var debug = require('debug')('formio:permissions');
var _ = require('lodash');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var app = express();
var favicon = require('serve-favicon');

// Redirect all root traffic to www
app.use(function(req, res, next) {
  var hostname = req.get('Host');
  var names = hostname.split('.');
  if ((names.length === 2) && (names[1] !== 'localhost')) {
    res.redirect('http://www.' + hostname + req.url);
    res.end();
  }
  else {
    next();
  }
});

app.use(favicon(__dirname + '/favicon.ico'));

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
app.use(require('./src/middleware/alias')(formioServer.formio));

var settings = require('./src/hooks/settings')(app, formioServer);
// Start the api server.
formioServer.init(settings).then(function(formio) {

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
  jslogger.log({
    message: err.message,
    stacktrace: err.stack
  });
  // Give jslogger time to log before exiting.
  setTimeout(function() {
    process.exit(1);
  }, 1500);
});
