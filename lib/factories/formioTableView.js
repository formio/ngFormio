'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Components = require('formiojs/components/Components');

var _Components2 = _interopRequireDefault(_Components);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = angular.module('formio');
exports.default = app.factory('formioTableView', [function () {
  return function (value, component) {
    if (!value && value !== 0 && value !== false) {
      return '';
    }
    if (!component || !component.input || !component.type) {
      return value;
    }
    var componentObject = _Components2.default.create(component, {
      readOnly: true,
      viewAsHtml: true
    });
    if (!componentObject.getView) {
      return value;
    }
    if (component.multiple && value.length > 0) {
      var values = [];
      angular.forEach(value, function (arrayValue) {
        values.push(componentObject.getView(arrayValue));
      });
      return values;
    }
    return componentObject.getView(value);
  };
}]);