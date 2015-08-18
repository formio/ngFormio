'use strict'

var cors = require('cors');

module.exports = function(formio) {
  var whitelist = ['http://example1.com', 'http://example2.com'];
  var corsOptions = {
    origin: function(origin, callback){
      var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
      callback(null, originIsWhitelisted);
    }
  };

  return function(req, res, next) {
    var corsFunction = cors(corsOptions);

    corsFunction(req, res, next);
  }

};
