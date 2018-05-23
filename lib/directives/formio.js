'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _formiojs = require('formiojs');

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
      scope.formioReady = false;
      scope.initializing = false;
      scope.onFormio = scope.initializeForm().then(function (formio) {
        return scope.setupForm(formio);
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
          if ($scope.src || $scope.form) {
            $scope.initializing = true;
            resolve(_formiojs.Formio.createForm($scope.element, $scope.src || $scope.form, $scope.options).then(function (formio) {
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
          $scope.formio.nosubmit = false;
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
          switch (eventParts[1]) {
            case 'error':
              args[0] = 'formError';
              break;
            case 'submit':
              args[0] = 'formSubmit';
              break;
            case 'submitDone':
              args[0] = 'formSubmission';
              break;
            case 'prevPage':
              args[0] = 'wizardPrev';
              break;
            case 'nextPage':
              args[0] = 'wizardNext';
              break;
            case 'customEvent':
              args[0] = args[1].type;
              break;
          }

          $scope.$emit.apply($scope, args);
        });

        $scope.formioReady = true;
        return $scope.formio;
      };

      $scope.$watch('src', function (src) {
        if (!src) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.src = src;
        } else if (!$scope.initializing) {
          $scope.initializeForm();
        }
      });

      $scope.$watch('url', function (url) {
        if (!url) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.url = url;
          $scope.formio.nosubmit = false;
        } else if (!$scope.initializing) {
          $scope.initializeForm();
        }
      });

      $scope.$watch('form', function (form) {
        if (!form || !form.components) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.form = form;
        } else if (!$scope.initializing) {
          $scope.initializeForm();
        }
      });

      $scope.$watch('submission', function (submission) {
        if (!submission) {
          return;
        }
        if ($scope.formioReady) {
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