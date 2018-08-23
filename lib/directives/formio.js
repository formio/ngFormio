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
      noSubmit: '=?',
      options: '<?'
    },
    link: function link(scope, element) {
      scope.element = element[0];
      scope.formioReady = false;
      scope.initialized = false;
      scope.options = scope.options || {};
      scope.noSubmit = !!scope.noSubmit;
    },
    controller: ['$scope', '$q', function ($scope, $q) {
      $scope.onLoad = $q.defer();
      $scope.onFormio = $scope.onLoad.promise;
      $scope.initializeForm = function () {
        if (!$scope.element) {
          return;
        }

        // Set read only if using legacy option.
        if (!$scope.options.hasOwnProperty('readOnly') && $scope.readOnly !== undefined) {
          $scope.options.readOnly = $scope.readOnly;
        }

        if ($scope.src || $scope.form) {
          $scope.initialized = true;
          _formiojs.Formio.createForm($scope.element, $scope.src || $scope.form, $scope.options).then(function (formio) {
            formio.nosubmit = $scope.noSubmit;
            $scope.$emit('formLoad', formio.wizard ? formio.wizard : formio.form);
            $scope.formio = formio;
            $scope.setupForm();
          });
        }
      };

      $scope.setupForm = function () {
        if ($scope.submission) {
          $scope.formio.submission = $scope.submission;
        }
        if ($scope.url) {
          $scope.formio.url = $scope.url;
          $scope.formio.nosubmit = $scope.noSubmit || false;
        }
        $scope.formio.events.onAny(function () {
          // Keep backwards compatibility by firing old events as well.
          var args = Array.prototype.slice.call(arguments);

          var eventParts = args[0].split('.');

          var shouldFire = true;

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
              var submission = args[1];
              args[0] = submission.saved ? 'formSubmission' : 'formSubmit';
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
              //prevent customEvent from firing when it's emitted by button with event action (as it is emitted twice)
              if (args[1].component && args[1].component.type === 'button' && args[1].component.action === 'event') {
                shouldFire = false;
              }
              break;
          }

          if (shouldFire) {
            $scope.$emit.apply($scope, args);
          }
        });

        $scope.formioReady = true;
        $scope.onLoad.resolve($scope.formio);
        return $scope.formio;
      };

      $scope.$watch('src', function (src) {
        if (!src) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.src = src;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            return $scope.formio.src = src;
          });
        }
      });

      $scope.$watch('url', function (url) {
        if (!url) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.url = url;
          $scope.formio.nosubmit = $scope.noSubmit || false;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            $scope.formio.url = url;
            $scope.formio.nosubmit = $scope.noSubmit || false;
          });
        }
      });

      $scope.$watch('form', function (form) {
        if (!form || !form.components) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.form = form;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            return $scope.formio.form = form;
          });
        }
      });

      $scope.$watch('submission', function (submission) {
        if (!submission) {
          return;
        }
        $scope.onFormio.then(function () {
          return $scope.formio.submission = submission;
        });
      }, true);

      $scope.$on('componentChange', function () {
        $scope.$apply();
      });

      // Clean up the Form from DOM.
      $scope.$on('$destroy', function () {
        if ($scope.formio) {
          $scope.formio.destroy(true);
        }
      });

      // Initialize the form.
      $scope.initializeForm();
    }],
    template: '<div />'
  };
});