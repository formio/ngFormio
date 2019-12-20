"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _formiojs = require("formiojs");

var app = angular.module('formio');

var _default = app.provider('formioComponents', function () {
  var components = _formiojs.Components.components;
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