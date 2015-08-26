'use strict';

require('dotenv').load({silent: true});
var config = require('./config')();
var express = require('express');
var nunjucks = require('nunjucks');
var vhost = require('vhost');
var _ = require('lodash');
var app = express();

// Configure nunjucks.
nunjucks.configure('server/views', {
  autoescape: true,
  express: app
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
app.use('/swagger', express.static(require('swagger-ui').dist));

// Show the docs page for the API.
app.get('/spec.html', function(req, res, next) {
  res.render('docs.html', {
    url: '/spec.json'
  });
});

// Get the specs for each form.
app.get('/project/:projectId/form/:formId/spec.html', function(req, res, next) {
  res.render('docs.html', {
    url: '/project/' + req.params.projectId + '/form/' + req.params.formId + '/spec.json'
  });
});

// Mount the api server.
require('formio')(config.formio, function(formio) {

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

  // Route all subdomain requests to the API server.
  app.use(vhost('*.' + config.domain, formio));

  console.log(' > Listening to ' + config.protocol + '://*.' + config.domain + ':' + config.port);
  app.listen(config.port);
});
