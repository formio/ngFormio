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
        $scope.show = {};
        var boolean = {
          'true': true,
          'false': false
        };

        var updateComponents = function() {
          $scope.form.components = $scope.form.components || [];
          FormioUtils.eachComponent($scope.form.components, function(component) {
            // Display every component by default
            $scope.show[component.key] = ($scope.show[component.key] === undefined)
              ? true
              : $scope.show[component.key];

            // Only change display options if all required conditional properties are present.
            if (
              component.conditional
              && (component.conditional.show !== null && component.conditional.show !== '')
              && (component.conditional.when !== null && component.conditional.when !== '')
            ) {
              // Default the conditional values.
              component.conditional.show = boolean[component.conditional.show];
              component.conditional.eq = component.conditional.eq || '';

              // Get the conditional component.
              var cond = FormioUtils.getComponent($scope.form.components, component.conditional.when.toString());
              if (!cond) {
                return;
              }
              var value = $scope.submission.data[cond.key];

              if (value && typeof value !== 'object') {
                // Check if the conditional value is equal to the trigger value
                $scope.show[component.key] = value.toString() === component.conditional.eq.toString()
                  ? boolean[component.conditional.show]
                  : !boolean[component.conditional.show];
              }
              // Special check for check boxes component.
              else if (value && typeof value === 'object') {
                // Check if the conditional trigger value is true.
                $scope.show[component.key] = boolean[value[component.conditional.eq].toString()];
              }
              // Check against the components default value, if present and the components hasnt been interacted with.
              else if (!value && cond.defaultValue) {
                $scope.show[component.key] = cond.defaultValue.toString() === component.conditional.eq.toString()
                  ? boolean[component.conditional.show]
                  : !boolean[component.conditional.show];
              }
              // If there is no value, we still need to process as not equal.
              else {
                $scope.show[component.key] = !boolean[component.conditional.show];
              }

              // Update the visibility, if its possible a change occurred.
              component.hide = !$scope.show[component.key];
            }

            // Set hidden if specified
            if ($scope.hideComponents) {
              component.hidden = $scope.hideComponents.indexOf(component.key) !== -1;
            }

            // Set required if specified
            if ($scope.requireComponents && component.hasOwnProperty('validate')) {
              component.validate.required = $scope.requireComponents.indexOf(component.key) !== -1;
            }

            // Set disabled if specified
            if ($scope.disableComponents) {
              component.disabled = $scope.disableComponents.indexOf(component.key) !== -1;
            }
          }, true);
        };

        // Update the components on the initial form render and all subsequent submission data changes.
        $scope.$on('formRender', updateComponents);
        $scope.$watchCollection('submission.data', updateComponents);

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
            if ($scope.submission.data.hasOwnProperty(component.key) && $scope.show[component.key]) {
              var value = $scope.submission.data[component.key];
              if (component.type === 'number') {
                submissionData.data[component.key] = value ? parseFloat(value) : 0;
              }
              else {
                submissionData.data[component.key] = value;
              }
            }
          });

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
