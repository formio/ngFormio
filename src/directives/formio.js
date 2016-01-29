module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=',
      formAction: '=',
      form: '=',
      submission: '=',
      readOnly: '=',
      formioOptions: '='
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
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        // Add the live form parameter to the url.
        $scope._src = $scope.src;
        if ($scope._src && ($scope._src.indexOf('live=') === -1)) {
          $scope._src += ($scope._src.indexOf('?') === -1) ? '?' : '&';
          $scope._src += 'live=1';
        }

        // Create the formio object.
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submission: true
        });

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {
          if (!$scope.formioForm.$valid || form.submitting) return;
          form.submitting = true;

          // Create a sanitized submission object.
          var submissionData = {data: {}};
          if ($scope._submission._id) {
            submissionData._id = $scope._submission._id;
          }
          if ($scope._submission.data._id) {
            submissionData._id = $scope._submission.data._id;
          }

          var components = FormioUtils.flattenComponents($scope._form.components);
          angular.forEach(components, function(component) {
            if ($scope._submission.data.hasOwnProperty(component.key)) {
              submissionData.data[component.key] = $scope._submission.data[component.key];
            }
          });
          angular.forEach($scope._submission.data, function(value, key) {
            if (value && !value.hasOwnProperty('_id')) {
              submissionData.data[key] = value;
            }
          });

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

          // Search the form for resource submission access defaults and build a permissions map.
          var defaultPermissions = {};
          angular.forEach(components, function(component) {
            if (component.type === 'resource' && component.key && component.defaultPermission) {
              defaultPermissions[component.key] = component.defaultPermission;
            }
          });

          angular.forEach($scope._submission.data, function(data, key) {
            var perm = defaultPermissions[key];
            if (perm) {
              submissionData.access = submissionData.access || [];

              // Coerce data into an array for plucking.
              if (!(data instanceof Array)) {
                data = [data];
              }

              // Try to find and update an existing permission.
              var found = false;
              submissionData.access.forEach(function(permission) {
                if (permission.type === perm) {
                  found = true;
                  permission.resources = permission.resources || [];
                  permission.resources.concat(grabIds(data));
                }
              });

              // Add a permission, because one was not found.
              if (!found) {
                submissionData.access.push({
                  type: perm,
                  resources: grabIds(data)
                });
              }
            }
          });

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            $scope.showAlerts({
              type: 'success',
              message: 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.'
            });
            form.submitting = false;
            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          var submitEvent = $scope.$emit('formSubmit', submissionData);
          if (submitEvent.defaultPrevented) {
            // Listener wants to cancel the form submission
            return;
          }

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function (submission) {
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
            $scope.formio.saveSubmission(angular.copy(submissionData), $scope.formioOptions)
              .then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope, $element))
              .finally(function() {
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
