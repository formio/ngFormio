'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _formio = require('formiojs/lib/formio.builder');

exports.default = angular.module('formio').directive('formBuilder', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      options: '<'
    },
    link: function link(scope, element) {
      scope.initBuilder(element[0]);
    },
    controller: ['$scope', function ($scope) {
      var builder = null;
      var builderReady = null;
      var builderElement = null;
      $scope.options = $scope.options || {};

      // Initialize the builder.
      $scope.initBuilder = function (element) {
        builderElement = element;
        builderElement.innerHTML = '';
        builder = new _formio.Formio.Builder(builderElement, $scope.form, $scope.options);
        builderReady = builder.setDisplay($scope.form.display);
      };

      $scope.$on('buildSidebar', function () {
        if (builder && builder.instance) {
          builder.instance.buildSidebar();
        }
      });

      // Detect when the display changes.
      $scope.$watch('form.display', function (display) {
        if (builderReady && display) {
          builderReady.then(function () {
            return builder.setDisplay(display);
          });
        }
      });

      $scope.$on('$destroy', function () {
        if (builder && builder.instance) {
          builder.instance.destroy(true);
        }
      });
    }],
    template: '<div/>'
  };
});