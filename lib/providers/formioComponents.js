"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _embed = require("@formio/js/embed");
var app = angular.module('formio');
var _default = exports.default = app.provider('formioComponents', function () {
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
      var _Formio$Components;
      return {
        components: ((_Formio$Components = _embed.Formio.Components) === null || _Formio$Components === void 0 ? void 0 : _Formio$Components.components) || {},
        groups: groups
      };
    }
  };
});