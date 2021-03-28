"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es.object.assign.js");

require("core-js/modules/es.string.split.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.string.replace.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.regexp.to-string.js");

var _formiojs = require("formiojs");

var app = angular.module('formio');

var _default = app.factory('FormioUtils', function () {
  return Object.assign({
    hideFields: function hideFields(form, components) {
      this.eachComponent(form.components, function (component) {
        for (var i in components) {
          if (component.key === components[i]) {
            component.type = 'hidden';
          }
        }
      });
    },
    uniqueName: function uniqueName(name) {
      var parts = name.toLowerCase().replace(/[^0-9a-z\.]/g, '').split('.');
      var fileName = parts[0];
      var ext = '';

      if (parts.length > 1) {
        ext = '.' + parts[parts.length - 1];
      }

      return fileName.substr(0, 10) + '-' + this.guid() + ext;
    },
    guid: function guid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : r & 0x3 | 0x8;
        return v.toString(16);
      });
    },
    fieldWrap: function fieldWrap(field) {
      return field;
    }
  }, _formiojs.Utils);
});

exports.default = _default;