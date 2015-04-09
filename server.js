var config = require('config');
var formio = require('formio')(config.formio);
var express = require('express');
var nunjucks = require('nunjucks');
var basicAuth = require('basic-auth-connect');
var app = express();

// Configure nunjucks.
nunjucks.configure('server/views', {
  autoescape: true,
  express   : app
});

// Mount the brochure.
app.use('/', require('./brochure')(config.brochure));

// Use swagger docs and assets.
app.use('/app', basicAuth(config.brochure.admin.user, config.brochure.admin.pass));
app.use('/app', express.static(__dirname + '/dist'));
app.use('/app/assets', express.static(__dirname + '/bower_components'));
app.use('/app/swagger', express.static(require('swagger-ui').dist));

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
