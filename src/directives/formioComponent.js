module.exports = [
  'Formio',
  'formioComponents',
  'Lodash',
  function(
    Formio,
    formioComponents,
    _
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
              // Fix for select components
              if ($scope.component.type === 'select') {
                try {
                  // Allow a key:value search
                  var parts = $scope.component.defaultValue.split(':');
                  // If only one part was specified, search by value
                  if (parts.length === 1) {
                    var results = _.filter($scope.selectItems, {value: parts[0]});

                    // Trim results based on multiple
                    if (!$scope.component.multiple) {
                      value = results.shift();
                    }
                    else {
                      value = results;
                    }
                  }
                  // If two parts were specified, allow for key and value customization.
                  else if (parts.length === 2) {
                    var search = {};
                    search[parts[0]] = parts[1];

                    var results = _.filter($scope.selectItems, search);

                    // Trim results based on multiple
                    if (!$scope.component.multiple) {
                      value = results.shift();
                    }
                    else {
                      value = results;
                    }
                  }
                }
                catch (e) {
                  console.log('An issue occurred with the select defaultValue for: ' + $scope.component.key);
                  console.log('Could not find defaultValue (' + $scope.defaultValue + ') in the selectItems');
                  console.log($scope.selectItems);
                }
              }
              else {
                value = $scope.component.defaultValue;
              }
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
            $scope.$watch('component.multiple', function(mult) {
              // Establish a default for data.
              $scope.data = $scope.data || {};
              var value = null;

              if (!mult) {
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
                return;
              }

              if ($scope.data.hasOwnProperty($scope.component.key)) {
                // If a value is present, and its an array, assign it to the value.
                if ($scope.data[$scope.component.key] instanceof Array) {
                  value = $scope.data[$scope.component.key];
                }
                // If a value is present and it is not an array, wrap the value.
                else {
                  value = $scope.data[$scope.component.key].split(',');
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
                  value = $scope.component.defaultValue.split(',');

                  // FOR-135 - Add default values for select components.
                  if ($scope.component.type === 'select') {
                    /**
                     * Using the list of default options, split them with the identifier, and use filter to get each item.
                     *
                     * @param defaultItems
                     * @param searchItems
                     * @returns {Array}
                     */
                    var pluckItems = function(defaultItems, searchItems) {
                      var temp = [];

                      defaultItems.forEach(function(item) {
                        var parts = item.split(':');
                        if (parts.length === 2) {
                          var result = _.filter(searchItems, function(potential) {
                            if (_.get(potential, parts[0]) === parts[1]) {
                              return true;
                            }
                          });

                          if (result) {
                            temp = temp.concat(result);
                          }
                        }
                      });

                      return temp;
                    };

                    // If using the values input, split the default values, and search the options for each value in the list.
                    if ($scope.component.dataSrc === 'values') {
                      var temp = [];

                      $scope.component.data.values.forEach(function(item) {
                        if (value.indexOf(item.value) !== -1) {
                          temp.push(item);
                        }
                      });

                      value = temp;
                    }
                    // If using json input, split the values and search each key path for the item
                    else if ($scope.component.dataSrc === 'json') {
                      if (typeof $scope.component.data.json === 'string') {
                        try {
                          $scope.component.data.json = JSON.parse($scope.component.data.json);
                        }
                        catch (e) {
                          console.log(e);
                          console.log('Could not parse the given JSON for the select component: ' + $scope.component.key);
                          console.log($scope.component.data.json);
                          $scope.component.data.json = [];
                        }
                      }

                      value = pluckItems(value, $scope.component.data.json);
                    }

                    else if ($scope.component.dataSrc === 'url' || $scope.component.dataSrc === 'resource') {
                      // Wait until loading is done.
                      var watching = $scope.$watch('selectLoading', function(loading) {
                        if (!loading) {
                          // Stop the watch and filter the default items.
                          watching();

                          // Update scope directly, since this is async.
                          $scope.data[$scope.component.key] = pluckItems(value, $scope.selectItems);
                        }
                      });
                    }
                  }
                }
              }
              else {
                // Couldn't safely default, make it a simple array. Possibly add a single obj or string later.
                value = [];
              }

              // Use the current data or default.
              $scope.data[$scope.component.key] = value;
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
