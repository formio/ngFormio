'use strict';

require('dotenv').load({silent: true});
var config = require('./config')();
var express = require('express');
var _ = require('lodash');
var app = express();

// Host the dynamic app configuration.
//app.get('/config.js', function(req, res) {
//  res.set('Content-Type', 'text/javascript');
//  res.render('js/config.js', {
//    forceSSL: config.https ? 'true' : 'false',
//    domain: config.domain,
//    appHost: config.host,
//    apiHost: config.apiHost,
//    formioHost: config.formioHost
//  });
//});

// TODO: Can we get rid of this?
// Mount bower_components as assets.
//app.use('/bower_components', express.static(__dirname + '/bower_components'));

// Add the formio Project.
app.use('/', express.static(__dirname + '/dist'));

console.log(' > Listening on port ' + config.port);
app.listen(config.port);
