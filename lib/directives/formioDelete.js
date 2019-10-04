"use strict";

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.slice");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _formiojs = require("formiojs");

var app = angular.module('formio');

var _default = app.directive('formioDelete', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      submission: '=?',
      src: '=?',
      formAction: '=?',
      resourceName: '=?',
      message: '=?',
      options: '=?'
    },
    template: "<form role=\"form\">\n        <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n          {{ alert.message | formioTranslate:null:options.building }}\n        </div>\n        <h3>{{ deleteMessage | formioTranslate:null:options.building }}</h3>\n        <div class=\"btn-toolbar\">\n          <button ng-click=\"onDelete()\" class=\"btn btn-danger\">{{ 'Yes' | formioTranslate:null:options.building }}</button>\n          <button ng-click=\"onCancel()\" class=\"btn btn-default\">{{ 'No' | formioTranslate:null:options.building }}</button>\n        </div>\n      </form>",
    controller: ['$scope', '$element', '$http', 'FormioScope', function ($scope, $element, $http, FormioScope) {
      $scope.options = $scope.options || {};
      $scope.formioAlerts = [];

      $scope.showAlerts = function (alerts) {
        $scope.formioAlerts = [].concat(alerts);
      };

      var resourceName = '';
      var methodName = '';
      $scope.$watch('src', function (src) {
        if (!src) {
          return;
        }

        $scope.formio = new _formiojs.Formio(src);
        resourceName = $scope.formio.submissionId ? 'submission' : 'form';
        var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
        methodName = 'delete' + resourceTitle;
        $scope.deleteMessage = $scope.message || 'Are you sure you wish to delete the ' + resourceName + '?';
      });
      $scope.$watch('resourceName', function (name) {
        if (!name) {
          return;
        }

        resourceName = name;
      });
      $scope.$watch('formAction', function (action) {
        if (!action) {
          return;
        }

        $scope.action = action;
        $scope.deleteMessage = $scope.message || 'Are you sure you wish to delete the ' + resourceName + '?';
      }); // Create delete capability.

      $scope.onDelete = function () {
        resourceName = resourceName || 'resource'; // Rebuild resourceTitle, $scope.resourceName could have changed

        var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1); // Called when the delete is done.

        var onDeleteDone = function onDeleteDone(data) {
          $scope.showAlerts({
            type: 'success',
            message: resourceTitle + ' was deleted.'
          });

          _formiojs.Formio.clearCache();

          $scope.$emit('delete', data);
        };

        if ($scope.action) {
          $http.delete($scope.action).then(onDeleteDone, FormioScope.onError($scope, $element));
        } else if ($scope.formio) {
          if (!methodName) return;
          if (typeof $scope.formio[methodName] !== 'function') return;
          $scope.formio[methodName]().then(onDeleteDone, FormioScope.onError($scope, $element));
        }
      };

      $scope.onCancel = function () {
        $scope.$emit('cancel');
      };
    }]
  };
});

exports.default = _default;