'use strict';

require('dotenv').load({silent: true});
var config = require('./config')();
var express = require('express');
var _ = require('lodash');
var app = express();

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

// Mount bower_components as assets.
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// Mount getting started presentation.
app.use('/start', express.static(__dirname + '/server/start'));

// Mount the brochure.
app.use('/', express.static(__dirname + '/src/brochure'));

// Mount all of our apps.
var apps = require('./apps/index');
_.each(apps, function(path, name) {
  app.use('/apps/' + name, express.static(path));
});

// Add the formio Project.
app.use('/app', express.static(__dirname + '/dist'));

console.log(' > Listening on port ' + config.port);
app.listen(config.port);
