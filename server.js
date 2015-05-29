var config = require('config');
var formio = require('formio')(config.formio);
var express = require('express');
var nunjucks = require('nunjucks');
var basicAuth = require('basic-auth-connect');
var MongoClient = require('mongodb').MongoClient;
var _ = require('lodash');
var app = express();

// Configure nunjucks.
nunjucks.configure('server/views', {
  autoescape: true,
  express   : app
});

// The database connection.
var database = null;
var connection = (typeof config.formio.mongo === 'string') ? config.formio.mongo : config.formio.mongo.join(',');
MongoClient.connect(connection, function(err, db) {
  if (err) { return console.log('Error connecting to database.'); }
  console.log('Connected to database!');
  database = db;
});

// The healthcheck.
app.get('/health', function(req, res) {
  if (!database) { return res.status(500); }
  database.collection('applications').find({name: 'formio'}).toArray(function(err, result) {
    if (err) { return res.status(500); }
    if (!result || !result.length) { return res.status(500); }
    res.send('OK');
  });
});

// Make sure to redirect all http requests to https.
app.use(function(req, res, next) {
  if (config.debug || req.secure || (req.get('X-Forwarded-Proto') === 'https')) { return next(); }
  res.redirect('https://' + req.get('Host') + req.url);
});

// CORS Support
app.use(require('cors')());

// Host the dynamic app configuration.
app.get('/config.js', function(req, res) {
  res.set('Content-Type', 'text/javascript');
  res.render('js/config.js', {
    forceSSL: config.debug ? 'false' : 'true',
    host: config.host,
    formioHost: config.formioHost
  });
});

// Mount bower_components as assets.
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// Mount getting started presentation.
app.use('/start', express.static(__dirname + '/server/start'));

// Mount the brochure.
app.use('/', express.static(__dirname + '/src/brochure'));

// Include the swagger ui.
app.use('/swagger', express.static(require('swagger-ui').dist));

// Mount all of our apps.
var apps = require('./apps/index');
_.each(apps, function(path, name) {
  app.use('/apps/' + name, express.static(path));
});

// Add the formio application.
app.use('/app', express.static(__dirname + '/dist'));

// Show the docs page for the API.
app.get('/app/spec.html', function (req, res, next) {
  res.render('docs.html', {
    url: req.protocol + '://' + req.get('host') + '/api/spec.json'
  });
});

// Get the specs for each form.
app.get('/app/form/:formId/spec.html', function (req, res, next) {
  res.render('docs.html', {
    url: '/app/api/form/' + req.params.formId + '/spec.json'
  });
});

app.use('/app/api', formio);
console.log('Listening to port ' + config.port);
app.listen(config.port);
