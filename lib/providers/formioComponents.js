'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var app = angular.module('formio');
exports.default = app.provider('formioComponents', function () {
  var components = {};
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
      console.warn('formioComponents is deprecated');
      return {
        components: components,
        groups: groups
      };
    }
  };
});