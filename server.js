var config = require('config');
var formio = require('formio')(config);
var express = require('express');
var nunjucks = require('nunjucks');
var app = express();

// Configure nunjucks.
nunjucks.configure('server/views', {
  express   : app
});

// Use swagger docs and assets.
app.use('/', express.static(__dirname + '/dist'));
app.use('/assets', express.static(__dirname + '/bower_components'));
app.use('/swagger', express.static(require('swagger-ui').dist));

// Show the docs page for the API.
app.get('/spec.html', function(req, res, next) {
  res.render('docs.html', {
    url: req.protocol + '://' + req.get('host') + '/api/spec.json'
  });
});

// Get the specs for each form.
app.get('/form/:formId/spec.html', function(req, res, next) {
  res.render('docs.html', {
    url: req.protocol + '://' + req.get('host') + '/api/form/:formId/spec.json'
  });
});

app.use('/api', formio);
console.log('Listening to port ' + config.port);
app.listen(config.port);
