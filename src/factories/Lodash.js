var _filter = require('lodash.filter');
var _get = require('lodash.get');
var _set = require('lodash.set');
var _isEqual = require('lodash.isequal');

module.exports = function() {
  return {
    filter: _filter,
    'get': _get,
    'set': _set,
    'isEqual': _isEqual
  };
};
