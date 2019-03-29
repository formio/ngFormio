"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es7.symbol.async-iterator");

require("core-js/modules/es6.symbol");

require("core-js/modules/es6.regexp.to-string");

require("core-js/modules/es6.object.to-string");

require("core-js/modules/es6.array.find");

require("core-js/modules/es6.function.name");

var _formiojs = require("formiojs");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var app = angular.module('formio');

var _default = app.factory('FormioScope', function () {
  return {
    onError: function onError($scope, $element) {
      return function (error) {
        if (error.name === 'ValidationError' && $element) {
          var element = $element.find('#form-group-' + error.details[0].path);
          element.addClass('has-error');
          var message = 'ValidationError: ' + error.details[0].message;
          $scope.showAlerts({
            type: 'danger',
            message: message
          });
          $scope.$on('formSubmit', function () {
            element.removeClass('has-error');
          });
        } else {
          if (error instanceof Error) {
            error = error.toString();
          } else if (_typeof(error) === 'object') {
            error = JSON.stringify(error);
          }

          $scope.showAlerts({
            type: 'danger',
            message: error
          });
        }

        $scope.$emit('formError', error);
      };
    }
  };
});

exports.default = _default;