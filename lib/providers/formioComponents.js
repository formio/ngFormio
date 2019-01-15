"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var app = angular.module('formio');

var Components = require('formiojs/components').default;

var _default = app.provider('formioComponents', function () {
  var components = Components;
  var groups = {
    __component: {
      title: 'Basic Components'
    },
    advanced: {
      title: 'Special Components'
    },
    layout: {
      title: 'Layout Components'
    }
  };
  return {
    addGroup: function addGroup(name, group) {
      console.warn('formioComponents is deprecated');
    },
    register: function register(type, component, group) {
      console.warn('formioComponents is deprecated');
    },
    $get: function $get() {
      return {
        components: components,
        groups: groups
      };
    }
  };
});

exports.default = _default;