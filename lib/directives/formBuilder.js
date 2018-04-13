'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _formio = require('formiojs/lib/formio.builder');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = angular.module('formio');
exports.default = app.directive('formBuilder', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      src: '=',
      url: '=?',
      type: '=',
      onSave: '=',
      onCancel: '=',
      options: '<'
    },
    link: function link(scope, element) {
      scope.initBuilder(element[0]);
    },
    controller: ['$scope', function ($scope) {
      var builderReady = null;
      var builderElement = null;
      $scope.onSave = $scope.onSave || _lodash2.default.noop;

      var createBuilder = function createBuilder(type) {
        if (type && $scope.form) {
          $scope.form.type = type;
        }
        builderElement.innerHTML = '';
        builderReady = _formio.Formio.builder(builderElement, $scope.form).then(function (builder) {
          builder.on('saveComponent', function () {
            return $scope.onSave(builder.schema);
          });
          builder.on('deleteComponent', function () {
            return $scope.onSave(builder.schema);
          });
          builder.on('cancelComponent', function () {
            return $scope.onSave(builder.schema);
          });
          return builder;
        });
      };

      var setBuilderProperty = function setBuilderProperty(prop, value) {
        if (builderReady) {
          builderReady.then(function (builder) {
            builder[prop] = value;
          });
        }
      };

      $scope.initBuilder = function (element) {
        builderElement = element;
        createBuilder();
      };

      $scope.$watch('src', function (src) {
        return setBuilderProperty('setSrc', src);
      });
      $scope.$watch('url', function (url) {
        return setBuilderProperty('setUrl', url);
      });
    }],
    template: '<div />'
  };
});