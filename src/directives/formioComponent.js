var _get = require('lodash/get');

module.exports = [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      replace: true,
      restrict: 'E',
      require: '?^formio',
      scope: {
        component: '=',
        data: '=',
        submission: '=',
        hideComponents: '=',
        formio: '=',
        formioForm: '=',
        readOnly: '=',
        gridRow: '=',
        gridCol: '=',
        builder: '=?',
        options: '=?'
      },
      templateUrl: 'formio/component.html',
      link: function(scope, el, attrs, formioCtrl) {
        if (formioCtrl) {
          scope.showAlerts = formioCtrl.showAlerts.bind(formioCtrl);
        }
        else {
          scope.showAlerts = function() {
            throw new Error('Cannot call $scope.showAlerts unless this component is inside a formio directive.');
          };
        }
      },
      controller: [
        '$scope',
        '$http',
        '$controller',
        'FormioUtils',
        '$timeout',
        function(
          $scope,
          $http,
          $controller,
          FormioUtils,
          $timeout
        ) {
          $scope.builder = $scope.builder || false;
          // Options to match jquery.maskedinput masks
          $scope.uiMaskOptions = {
            maskDefinitions: {
              '9': /\d/,
              'a': /[a-zA-Z]/,
              '*': /[a-zA-Z0-9]/
            },
            clearOnBlur: false,
            eventsToHandle: ['input', 'keyup', 'click', 'focus'],
            silentEvents: ['click', 'focus']
          };

          // See if this component is visible or not.
          $scope.isVisible = function(component, row) {
            if ($scope.builder) return true;
            return FormioUtils.isVisible(
              component,
              row,
              $scope.submission ? $scope.submission.data : null,
              $scope.hideComponents
            );
          };

          // FOR-245 - Fix reset buttons.
          $scope.resetForm = function() {
            // Manually remove each key so we don't lose a reference to original
            // data in child scopes.
            for (var key in $scope.data) {
              delete $scope.data[key];
            }

            // Set the form to pristine again.
            for (var compKey in $scope.formioForm) {
              if ($scope.formioForm[compKey].hasOwnProperty('$setPristine')) {
                $scope.formioForm[compKey].$setPristine();
                $scope.formioForm[compKey].$setUntouched();
              }
            }
          };

          $scope.isDisabled = function(component) {
            return $scope.readOnly || (typeof $scope.$parent.isDisabled === 'function' && $scope.$parent.isDisabled(component));
          };

          $scope.isRequired = function(component) {
            return FormioUtils.isRequired(component);
          };

          // Survey components haves questions.
          // We want to make the survey component label marked with error if any
          // of the questions is in invalid state.
          // So, first check if conponent has questions, then iterate over them.
          // Break in the first invalid question. Is enough to set the has-error
          // class to the survey component.
          // Note: Chek that this method is used in the template.
          $scope.invalidQuestions = function(formioForm) {
            var errorInQuestions = false;
            if (!$scope.component.questions) {
              errorInQuestions = false;
            }
            else {
              var i;
              for (i = 0; i < $scope.component.questions.length; i++) {
                var question = $scope.component.questions[i];
                var questionInputName = [$scope.component.key, question.value].join('-');
                var formInput = formioForm[questionInputName];
                if (formInput && !formInput.$pristine && formInput.$invalid) {
                  errorInQuestions = true;
                  break;
                }
              }
            }
            return errorInQuestions;
          };

          // Pass through checkConditional since this is an isolate scope.
          $scope.checkConditional = $scope.$parent.checkConditional;

          // FOR-71 - Dont watch in the builder view.
          // Calculate value when data changes.
          if (!$scope.builder && ($scope.component.calculateValue || _get($scope.component, 'validate.json'))) {
            $scope.$watch('data', function() {
              FormioUtils.checkCalculated($scope.component, $scope.submission, $scope.data);

              // Process jsonLogic stuff if present.
              if (_get($scope.component, 'validate.json')) {
                var input;

                // Only json parse once.
                if (typeof $scope.component.validate.json === 'string') {
                  try {
                    input = JSON.parse($scope.component.validate.json);
                    $scope.component.validate.json = input;
                  }
                  catch (e) {
                    /* eslint-disable no-console */
                    console.warn('Invalid JSON validator given for ' + $scope.component.key);
                    console.warn($scope.component.validate.json);
                    /* eslint-enable no-console */
                    delete $scope.component.validate.json;
                    return;
                  }
                }
                else {
                  input = $scope.component.validate.json;
                }

                var valid;
                try {
                  valid = FormioUtils.jsonLogic.apply(input, {
                    data: $scope.submission ? $scope.submission.data : $scope.data,
                    row: $scope.data
                  });
                }
                catch (err) {
                  valid = err.message;
                }

                $timeout(function() {
                  try {
                    if (valid !== true) {
                      $scope.component.customError = valid;
                      $scope.formioForm[$scope.component.key].$setValidity('custom', false);
                      return;
                    }

                    $scope.formioForm[$scope.component.key].$setValidity('custom', true);
                  }
                  catch (e) {
                    // Ignore any issues while editing the components.
                  }
                });
              }
            }, true);
          }

          // Get the settings.
          var component = formioComponents.components[$scope.component.type] || formioComponents.components['custom'];

          // Set the component with the defaults from the component settings.
          // Dont add the default key, so that components without keys will remain visible by default.
          angular.forEach(component.settings, function(value, key) {
            if (!$scope.component.hasOwnProperty(key) && key !== 'key') {
              $scope.component[key] = angular.copy(value);
            }
          });

          // Add a new field value.
          $scope.addFieldValue = function() {
            var defaultData = {};
            FormioUtils.checkDefaultValue($scope.component, $scope.submission, defaultData, $scope, function() {
              $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
              $scope.data[$scope.component.key].push(defaultData[$scope.component.key]);
            });
          };

          // Remove a field value.
          $scope.removeFieldValue = function(index) {
            if (!Array.isArray($scope.data[$scope.component.key])) {
              $scope.data[$scope.component.key] = [];
            }
            $scope.data[$scope.component.key].splice(index, 1);
          };

          // Set the template for the component.
          if (typeof component.template === 'function') {
            $scope.template = component.template($scope);
          }
          else {
            $scope.template = component.template;
          }

          // Allow component keys to look like "settings[username]"
          if ($scope.component.key && $scope.component.key.indexOf('[') !== -1) {
            var matches = $scope.component.key.match(/([^\[]+)\[([^]+)\]/);
            if ((matches.length === 3) && $scope.data.hasOwnProperty(matches[1])) {
              $scope.data = $scope.data[matches[1]];
              $scope.component.key = matches[2];
            }
          }

          // If the component has a controller.
          if (component.controller) {
            // Maintain reverse compatibility by executing the old method style.
            if (typeof component.controller === 'function') {
              component.controller($scope.component, $scope, $http, Formio);
            }
            else {
              $controller(component.controller, {$scope: $scope, $timeout: $timeout});
            }
          }

          // FOR-71 - Dont watch in the builder view.
          if (!$scope.builder) {
            $scope.$watch('component.multiple', function() {
              $scope.data = $scope.data || {};
              FormioUtils.checkDefaultValue($scope.component, $scope.submission, $scope.data, $scope);
              return;
            });
          }

          // Set the component name.
          $scope.componentId = $scope.component.key;
          if ($scope.gridRow !== undefined) {
            $scope.componentId += ('-' + $scope.gridRow);
          }
          if ($scope.gridCol !== undefined) {
            $scope.componentId += ('-' + $scope.gridCol);
          }
        }
      ]
    };
  }
];
