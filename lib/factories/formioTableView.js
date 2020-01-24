"use strict";

require("core-js/modules/es.array.for-each");

require("core-js/modules/web.dom-collections.for-each");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _formiojs = require("formiojs");

var app = angular.module('formio');

var _default = app.factory('formioTableView', [function () {
  return function (value, component) {
    if (!value && value !== 0 && value !== false) {
      return '';
    }

    if (!component || !component.input || !component.type) {
      return value;
    }

    var componentObject = _formiojs.Components.create(component, {
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