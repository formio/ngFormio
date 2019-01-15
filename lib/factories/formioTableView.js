"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/web.dom.iterable");

var _Components = _interopRequireDefault(require("formiojs/components/Components"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = angular.module('formio');

var _default = app.factory('formioTableView', [function () {
  return function (value, component) {
    if (!value && value !== 0 && value !== false) {
      return '';
    }

    if (!component || !component.input || !component.type) {
      return value;
    }

    var componentObject = _Components.default.create(component, {
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

exports.default = _default;