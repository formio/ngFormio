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
        builder: '=?'
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
        function(
          $scope,
          $http,
          $controller,
          FormioUtils
        ) {
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
          };

          $scope.isDisabled = $scope.$parent.isDisabled;

          // Pass through checkConditional since this is an isolate scope.
          $scope.checkConditional = $scope.$parent.checkConditional;

          // FOR-71 - Dont watch in the builder view.
          // Calculate value when data changes.
          if (!$scope.builder && $scope.component.calculateValue) {
            $scope.$watch('data', function() {
              try {
                $scope.data[$scope.component.key] = eval('(function(data) { var value = [];' + $scope.component.calculateValue.toString() + '; return value; })($scope.data)');
              }
              catch (e) {
                /* eslint-disable no-console */
                console.warn('An error occurred calculating a value for ' + $scope.component.key, e);
                /* eslint-enable no-console */
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
            var value = '';
            if ($scope.component.hasOwnProperty('customDefaultValue')) {
              try {
                /* eslint-disable no-unused-vars */
                var data = _.cloneDeep($scope.data);
                /* eslint-enable no-unused-vars */
                value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })(data)');
              }
              catch (e) {
                /* eslint-disable no-console */
                console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                /* eslint-enable no-console */
                value = '';
              }
            }
            else if ($scope.component.hasOwnProperty('defaultValue')) {
              value = $scope.component.defaultValue;
            }
            $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
            $scope.data[$scope.component.key].push(value);
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
              $controller(component.controller, {$scope: $scope});
            }
          }

          // FOR-71 - Dont watch in the builder view.
          if (!$scope.builder) {
            $scope.$watch('component.multiple', function() {
              var value = null;
              // Establish a default for data.
              $scope.data = $scope.data || {};
              if ($scope.component.multiple) {
                if ($scope.data.hasOwnProperty($scope.component.key)) {
                  // If a value is present, and its an array, assign it to the value.
                  if ($scope.data[$scope.component.key] instanceof Array) {
                    value = $scope.data[$scope.component.key];
                  }
                  // If a value is present and it is not an array, wrap the value.
                  else {
                    value = [$scope.data[$scope.component.key]];
                  }
                }
                else if ($scope.component.hasOwnProperty('customDefaultValue')) {
                  try {
                    value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })($scope.data)');
                  }
                  catch (e) {
                    /* eslint-disable no-console */
                    console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                    /* eslint-enable no-console */
                    value = '';
                  }
                }
                else if ($scope.component.hasOwnProperty('defaultValue')) {
                  // If there is a default value and it is an array, assign it to the value.
                  if ($scope.component.defaultValue instanceof Array) {
                    value = $scope.component.defaultValue;
                  }
                  // If there is a default value and it is not an array, wrap the value.
                  else {
                    value = [$scope.component.defaultValue];
                  }
                }
                else {
                  // Couldn't safely default, make it a simple array. Possibly add a single obj or string later.
                  value = [];
                }

                // Use the current data or default.
                $scope.data[$scope.component.key] = value;
                return;
              }

              // Use the current data or default.
              if ($scope.data.hasOwnProperty($scope.component.key)) {
                $scope.data[$scope.component.key] = $scope.data[$scope.component.key];
              }
              else if ($scope.component.hasOwnProperty('customDefaultValue')) {
                try {
                  value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })($scope.data)');
                }
                catch (e) {
                  /* eslint-disable no-console */
                  console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                  /* eslint-enable no-console */
                  value = '';
                }
                $scope.data[$scope.component.key] = value;
              }
              // FA-835 - The default values for select boxes are set in the component.
              else if ($scope.component.hasOwnProperty('defaultValue') && $scope.component.type !== 'selectboxes') {
                $scope.data[$scope.component.key] = $scope.component.defaultValue;

                // FOR-193 - Fix default value for the number component.
                if ($scope.component.type === 'number') {
                  $scope.data[$scope.component.key] = parseInt($scope.data[$scope.component.key]);
                }
              }
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
