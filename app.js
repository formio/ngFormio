'use strict';

require('dotenv').load({silent: true});
var config = require('./config')();
var express = require('express');
var _ = require('lodash');
var app = express();

// Host the dynamic app configuration.
app.get('/config.js', function(req, res) {
  var serverHost = process.env.SERVERHOST || 'localhost:3000';
  require('fs').readFile(__dirname + '/dist/config.js', 'utf8', function(err, data) {
    if (err) {
      res.send(404);
    }
    else {
      res.set('Content-Type', 'text/javascript');
      res.send(data.replace("serverHost = 'localhost:3000';", 'serverHost = \'' + serverHost + '\';'));
    }
  });
});

// Add the formio Project.
app.use('/', express.static(__dirname + '/dist'));

console.log(' > Listening on port ' + config.port);
app.listen(config.port);
