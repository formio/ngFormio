"use strict";

require("core-js/modules/es.symbol.js");
require("core-js/modules/es.symbol.description.js");
require("core-js/modules/es.symbol.iterator.js");
require("core-js/modules/es.array.iterator.js");
require("core-js/modules/es.string.iterator.js");
require("core-js/modules/web.dom-collections.iterator.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
require("core-js/modules/es.function.name.js");
require("core-js/modules/es.array.find.js");
require("core-js/modules/es.object.to-string.js");
require("core-js/modules/es.regexp.to-string.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var app = angular.module('formio');
var _default = exports.default = app.factory('FormioScope', function () {
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