'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _full = require('formiojs/full');

var app = angular.module('formio');
exports.default = app.directive('formio', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      url: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      options: '=?'
    },
    link: function link(scope, element) {
      scope.element = element[0];

      scope.initializeForm().then(function (formio) {
        scope.setupForm(formio);
      }).catch(function (err) {
        console.warn(err);
      });
    },
    controller: ['$scope', function ($scope) {
      $scope.initializeForm = function () {
        $scope.options = $scope.options || {};

        // Set read only if using legacy option.
        if (!$scope.options.hasOwnProperty('readOnly') && $scope.readOnly !== undefined) {
          $scope.options.readOnly = $scope.readOnly;
        }

        return new Promise(function (resolve, reject) {
          if ($scope.src) {
            resolve(_full.Formio.createForm($scope.element, $scope.src, $scope.options).then(function (formio) {
              $scope.formio = formio;
              return formio;
            }));
          } else if ($scope.form) {
            resolve(_full.Formio.createForm($scope.element, $scope.form, $scope.options).then(function (formio) {
              $scope.formio = formio;
              return formio;
            }));
          } else {
            // If we get to here there is no src or form
            reject('Must set src or form attribute');
          }
        });
      };

      $scope.setupForm = function () {
        if ($scope.submission) {
          $scope.formio.submission = $scope.submission;
        }
        if ($scope.url) {
          $scope.formio.url = $scope.url;
        }
        $scope.formio.events.onAny(function () {
          // Keep backwards compatibility by firing old events as well.
          var args = Array.prototype.slice.call(arguments);

          var eventParts = args[0].split('.');

          // Only handle formio events.
          if (eventParts[0] !== 'formio' || eventParts.length !== 2) {
            return;
          }

          // Remove formio. from event.
          args[0] = eventParts[1];

          $scope.$emit.apply($scope, args);

          switch (eventParts[1]) {
            case 'error':
              args[0] = 'formError';
              $scope.$emit.apply($scope, args);
              break;
            case 'submit':
              args[0] = 'formSubmit';
              $scope.$emit.apply($scope, args);
              break;
            case 'submitDone':
              args[0] = 'formSubmission';
              $scope.$emit.apply($scope, args);
              break;
            case 'prevPage':
              args[0] = 'wizardPrev';
              $scope.$emit.apply($scope, args);
              break;
            case 'nextPage':
              args[0] = 'wizardNext';
              $scope.$emit.apply($scope, args);
              break;
            case 'customEvent':
              args[0] = args[1].type;
              $scope.$emit.apply($scope, args);
              break;
          }
        });
      };

      $scope.$watch('src', function (src) {
        if ($scope.formio) {
          $scope.formio.src = src;
        }
      });

      $scope.$watch('url', function (url) {
        if ($scope.formio) {
          $scope.formio.url = url;
        }
      });

      $scope.$watch('form', function (form) {
        if ($scope.formio) {
          $scope.formio.form = form;
        }
      });

      $scope.$watch('submission', function (submission) {
        if ($scope.formio) {
          $scope.formio.submission = submission;
        }
      });

      // Clean up the Form from DOM.
      $scope.$on('$destroy', function () {
        if ($scope.formio) {
          $scope.formio.destroy(true);
        }
      });
    }],
    template: '<div />'
  };
});