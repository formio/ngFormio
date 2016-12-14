var _filter = require('lodash.filter');
var _get = require('lodash.get');

module.exports = function() {
  return {
    filter: _filter,
    'get': _get
  };
};
