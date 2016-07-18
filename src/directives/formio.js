module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      requireComponents: '=?',
      disableComponents: '=?',
      formioOptions: '=?',
      options: '=?'
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils
      ) {
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        // Add the live form parameter to the url.
        if ($scope._src && ($scope._src.indexOf('live=') === -1)) {
          $scope._src += ($scope._src.indexOf('?') === -1) ? '?' : '&';
          $scope._src += 'live=1';
        }

        // Build the display map.
        $scope.show = {
          '': true,
          'undefined': true,
          'null': true
        };
        var boolean = {
          'true': true,
          'false': false
        };

        /**
         * Sweep the current submission, to identify and remove data that has been conditionally hidden.
         *
         * This will iterate over every key in the submission data obj, regardless of the structure.
         */
        var sweepSubmission = function() {
          var show = $scope.show || {
              '': true,
              'undefined': true,
              'null': true
            };
          var submission = $scope.submission.data || {};

          /**
           * Sweep the given component keys and remove any data for the given keys which are being conditionally hidden.
           *
           * @param {Object} components
           *   The list of components to sweep.
           * @param {Boolean} ret
           *   Whether or not you want to know if a modification needs to be made.
           */
          var sweep = function sweep(components, ret) {
            // Skip our unwanted types.
            if (components === null || typeof components === 'undefined') {
              if (ret) {
                return false;
              }
              return;
            }

            // If given a string, then we are looking at the api key of a component.
            if (typeof components === 'string') {
              if (show.hasOwnProperty(components) && show[components] === false) {
                if (ret) {
                  return true;
                }
                return;
              }
            }
            // If given an array, iterate over each element, assuming its not a string itself.
            // If each element is a string, then we aren't looking at a component, but data itself.
            else if (components instanceof Array) {
              var filtered = [];

              components.forEach(function(component) {
                if (typeof component === 'string') {
                  filtered.push(component);
                  return;
                }

                // Recurse into the components of this component.
                var modified = sweep(component, true);
                if (!modified) {
                  filtered.push(component);
                }
              });

              components = filtered;
              return;
            }
            // If given an object, iterate the properties as component keys.
            else if (typeof components === 'object') {
              Object.keys(components).forEach(function(key) {
                // If the key is deleted, delete the whole obj.
                var modifiedKey = sweep(key, true);
                if (modifiedKey) {
                  delete components[key];
                }
                else {
                  // If a child leaf is modified (non key) delete its whole subtree.
                  if (components[key] instanceof Array || typeof components[key] === 'object') {
                    // If the component can have sub-components, recurse.
                    sweep(components[key]);
                  }
                }
              });
              return;
            }

            return;
          };
          return sweep(submission);
        };

        // The list of all conditionals.
        var _conditionals = {};

        // The list of all custom conditionals, segregated because they must be run on every change to data.
        var _customConditionals = {};

        /** Sweep all the components and build the conditionals map.
         *
         * @private
         */
        var _sweepConditionals = function() {
          $scope.form = $scope.form || {};
          $scope.form.components = $scope.form.components || [];
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (!component.hasOwnProperty('key')) {
              return;
            }

            // Show everything by default.
            $scope.show[component.key] = true;

            // We only care about valid/complete conditional settings.
            if (
              component.conditional
              && (component.conditional.show !== null && component.conditional.show !== '')
              && (component.conditional.when !== null && component.conditional.when !== '')
            ) {
              // Default the conditional values.
              component.conditional.show = boolean.hasOwnProperty(component.conditional.show)
                ? boolean[component.conditional.show]
                : true;
              component.conditional.eq = component.conditional.eq || '';

              // Keys should be unique, so don't worry about clobbering an existing duplicate.
              _conditionals[component.key] = component.conditional;

              // Store the components default value for conditional logic, if present.
              if (component.hasOwnProperty('defaultValue')) {
                _conditionals[component.key].defaultValue = component.defaultValue;
              }
            }
            // Custom conditional logic.
            else if (component.customConditional) {
              // Add this customConditional to the conditionals list.
              _customConditionals[component.key] = component.customConditional;
            }

            // Set hidden if specified
            if ($scope.hideComponents) {
              component.hidden = $scope.hideComponents.indexOf(component.key) !== -1;
            }

            // Set required if specified
            if ($scope.requireComponents && component.hasOwnProperty('validate') && $scope.requireComponents.indexOf(component.key) !== -1) {
              component.validate.required = $scope.requireComponents.indexOf(component.key) !== -1;
            }

            // Set disabled if specified
            if ($scope.disableComponents) {
              component.disabled = $scope.disableComponents.indexOf(component.key) !== -1;
            }
          }, true);
        };

        /**
         * Using the conditionals map, invoke the conditionals for each component.
         *
         * @param {String} componentKey
         *   The component to toggle conditional logic for.
         *
         * @private
         */
        var _toggleConditional = function(componentKey) {
          if (_conditionals.hasOwnProperty(componentKey)) {
            var cond = _conditionals[componentKey];
            var value = FormioUtils.getValue($scope.submission, cond.when);

            if (typeof value !== 'undefined' && typeof value !== 'object') {
              // Check if the conditional value is equal to the trigger value
              $scope.show[componentKey] = value.toString() === cond.eq.toString()
                ? boolean[cond.show]
                : !boolean[cond.show];
            }
            // Special check for check boxes component.
            else if (typeof value !== 'undefined' && typeof value === 'object') {
              // Only update the visibility is present, otherwise hide, because it was deleted by the submission sweep.
              if (value.hasOwnProperty(cond.eq)) {
                $scope.show[componentKey] = boolean.hasOwnProperty(value[cond.eq])
                  ? boolean[value[cond.eq]]
                  : true;
              }
              else {
                $scope.show[componentKey] = false;
              }
            }
            // Check against the components default value, if present and the components hasn't been interacted with.
            else if (typeof value === 'undefined' && cond.hasOwnProperty('defaultValue')) {
              $scope.show[componentKey] = cond.defaultValue.toString() === cond.eq.toString()
                ? boolean[cond.show]
                : !boolean[cond.show];
            }
            // If there is no value, we still need to process as not equal.
            else {
              $scope.show[componentKey] = !boolean[cond.show];
            }
          }
        };

        /**
         * Using the custom conditionals map, invoke the conditionals for each component.
         *
         * @param {String} componentKey
         *   The component to toggle conditional logic for.
         *
         * @private
         */
        var _toggleCustomConditional = function(componentKey) {
          if (_customConditionals.hasOwnProperty(componentKey)) {
            var cond = _customConditionals[componentKey];

            try {
              // Create a child block, and expose the submission data.
              var data = $scope.submission.data; // eslint-disable-line no-unused-vars
              // Eval the custom conditional and update the show value.
              var show = eval('(function() { ' + cond.toString() + '; return show; })()');
              // Show by default, if an invalid type is given.
              $scope.show[componentKey] = boolean.hasOwnProperty(show.toString()) ? boolean[show] : true;
            }
            catch (e) {
              $scope.show[componentKey] = true;
            }
          }
        };

        // On every change to data, trigger the conditionals.
        $scope.$watch(function() {
          return $scope.submission && $scope.submission.data
            ? $scope.submission.data
            : {};
        }, function() {
          // Toggle every conditional.
          var allConditionals = Object.keys(_conditionals);
          (allConditionals || []).forEach(function(componentKey) {
            _toggleConditional(componentKey);
          });

          var allCustomConditionals = Object.keys(_customConditionals);
          (allCustomConditionals || []).forEach(function(componentKey) {
            _toggleCustomConditional(componentKey);
          });

          var allHidden = Object.keys($scope.show);
          (allHidden || []).forEach(function(componentKey) {
            // If a component is hidden, delete its value, so other conditionals are property chain reacted.
            if (!$scope.show[componentKey]) {
              return sweepSubmission();
            }
          });
        }, true);

        var cancelFormLoadEvent = $scope.$on('formLoad', function() {
          _sweepConditionals();
          cancelFormLoadEvent();
        });

        if ($scope.options && $scope.options.watchData) {
          $scope.$watch('submission.data', function() {
            _sweepConditionals();
          }, true);
        }

        if (!$scope._src) {
          $scope.$watch('src', function(src) {
            if (!src) {
              return;
            }
            $scope._src = src;
            $scope.formio = FormioScope.register($scope, $element, {
              form: true,
              submission: true
            });
          });
        }

        // Create the formio object.
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submission: true
        });

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {
          if (!form.$valid || form.submitting) return;
          form.submitting = true;

          sweepSubmission();

          // Create a sanitized submission object.
          var submissionData = {data: {}};
          if ($scope.submission._id) {
            submissionData._id = $scope.submission._id;
          }
          if ($scope.submission.data._id) {
            submissionData._id = $scope.submission.data._id;
          }

          var grabIds = function(input) {
            if (!input) {
              return [];
            }

            if (!(input instanceof Array)) {
              input = [input];
            }

            var final = [];
            input.forEach(function(element) {
              if (element && element._id) {
                final.push(element._id);
              }
            });

            return final;
          };

          var defaultPermissions = {};
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (component.type === 'resource' && component.key && component.defaultPermission) {
              defaultPermissions[component.key] = component.defaultPermission;
            }
            if ($scope.submission.data.hasOwnProperty(component.key) && $scope.show[component.key] === true) {
              var value = $scope.submission.data[component.key];
              if (component.type === 'number') {
                submissionData.data[component.key] = value ? parseFloat(value) : 0;
              }
              else {
                submissionData.data[component.key] = value;
              }
            }
          }, true);

          angular.forEach($scope.submission.data, function(value, key) {
            if (value && !value.hasOwnProperty('_id')) {
              submissionData.data[key] = value;
            }

            // Setup the submission access.
            var perm = defaultPermissions[key];
            if (perm) {
              submissionData.access = submissionData.access || [];

              // Coerce value into an array for plucking.
              if (!(value instanceof Array)) {
                value = [value];
              }

              // Try to find and update an existing permission.
              var found = false;
              submissionData.access.forEach(function(permission) {
                if (permission.type === perm) {
                  found = true;
                  permission.resources = permission.resources || [];
                  permission.resources.concat(grabIds(value));
                }
              });

              // Add a permission, because one was not found.
              if (!found) {
                submissionData.access.push({
                  type: perm,
                  resources: grabIds(value)
                });
              }
            }
          });

          // Show the submit message and say the form is no longer submitting.
          var onSubmit = function(submission, message) {
            $scope.showAlerts({
              type: 'success',
              message: message
            });
            form.submitting = false;
          };

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            var message = '';
            if ($scope.options && $scope.options.submitMessage) {
              message = $scope.options.submitMessage;
            }
            else {
              message = 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.';
            }
            onSubmit(submission, message);
            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          // Allow the form to be completed externally.
          $scope.$on('submitDone', function(event, submission, message) {
            onSubmit(submission, message);
          });

          // Allow an error to be thrown externally.
          $scope.$on('submitError', function(event, error) {
            FormioScope.onError($scope, $element)(error);
          });

          var submitEvent = $scope.$emit('formSubmit', submissionData);
          if (submitEvent.defaultPrevented) {
            // Listener wants to cancel the form submission
            form.submitting = false;
            return;
          }

          // Make sure to make a copy of the submission data to remove bad characters.
          submissionData = angular.copy(submissionData);

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function(submission) {
              Formio.clearCache();
              onSubmitDone(method, submission);
            }).error(FormioScope.onError($scope, $element))
              .finally(function() {
                form.submitting = false;
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio) {
            // copy to remove angular $$hashKey
            $scope.formio.saveSubmission(submissionData, $scope.formioOptions).then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope, $element)).finally(function() {
              form.submitting = false;
            });
          }
          else {
            $scope.$emit('formSubmission', submissionData);
          }
        };
      }
    ],
    templateUrl: 'formio.html'
  };
};
