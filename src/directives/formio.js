module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      url: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      requireComponents: '=?',
      disableComponents: '=?',
      formioOptions: '=?',
      options: '<',
      name: '=?'
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      '$q',
      '$timeout',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils,
        $q,
        $timeout
      ) {
        var iframeReady = $q.defer();
        $scope.options = $scope.options || {};
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        $scope.iframeReady = false;
        $scope.formName = $scope.name || 'formioForm';
        $scope.validationErrorPresent = false;
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          /* eslint-disable no-empty */
          try {
            alerts.message = (JSON.parse(alerts.message)).data;
          }
          catch (e) {}
          /* eslint-enable no-empty */

          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.getIframeSrc = function(pdf) {
          var iframeSrc = pdf.src + '.html';
          var params = [];
          if ($scope.options && $scope.options.building) {
            params.push('builder=1');
          }
          if ($scope.readOnly) {
            params.push('readonly=1');
          }
          if (params.length) {
            iframeSrc += '?' + params.join('&');
          }
          return iframeSrc;
        };

        $scope.downloadUrl = '';
        $scope.setDownloadUrl = function(form) {
          if (!$scope.formio || $scope.options.noDownload) {
            return;
          }
          $scope.formio.getDownloadUrl(form).then(function(url) {
            $scope.downloadUrl = url;
          });
        };

        // Add the live form parameter to the url.
        if ($scope._src && ($scope._src.indexOf('live=') === -1)) {
          $scope._src += ($scope._src.indexOf('?') === -1) ? '?' : '&';
          $scope._src += 'live=1';
        }

        var sendIframeMessage = function(message) {
          iframeReady.promise.then(function(iframe) {
            iframe.contentWindow.postMessage(JSON.stringify(message), '*');
          });
        };

        var sendIframeForm = function(form) {
          if ($scope.formio) {
            form.projectUrl = $scope.formio.projectUrl;
            form.url = $scope.formio.formUrl;
            form.base = $scope.formio.base;
            sendIframeMessage({name: 'token', data: Formio.getToken()});
          }
          sendIframeMessage({name: 'form', data: form});
        };

        $scope.$on('iframe-ready', function() {
          $scope.iframeReady = true;
          var iframe = $element.find('.formio-iframe')[0];
          if (iframe) {
            iframeReady.resolve(iframe);
            if ($scope.form) {
              sendIframeForm($scope.form);
            }
            if ($scope.submission) {
              $scope.submission.readOnly = $scope.readOnly;
              sendIframeMessage({name: 'submission', data: $scope.submission});
            }
          }
        });

        $scope.$on('iframeMessage', function(event, message) {
          sendIframeMessage(message);
        });

        $scope.pdfImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAD6CAMAAAC/MqoPAAAAA3NCSVQICAjb4U/gAAAC9FBMVEX///+HiYuGhomCg4aCgIF6eX12eHokJCQkICAgICAjHSOOj5KJi46DhYd1dnltb3EkICAgICAjHSOVl5qTlZeOj5KHiYt6eX0kICAjHSOZmp2Vl5qGhokkICDOz9G+vsCztbapq66cnqGbnZ6ZmZmTlZckICCbnZ6Zmp2Vl5qTlZeOj5KMioqGhomCg4aCgIGZmp2TlZeCgIGmqauho6aen6KcnqGmqaucnqGbnZ66u76cnqGZmp2Vl5rKISjS0dLR0NHOz9HMzMzHycrHxsfFxMXCwsPCw8W+vsCen6KbnZ7GISjCwsO+v8K+vsCpq66kpqmeoaObnZ7////7+/v5+vr39/j09fXz8/P88PHx8fL37+/u7+/r7O3r6+zp6uvn5+jj5+fz4+P44eLw4eHj5OXi4+Th4uPf4OLf3+Dc3t/b3N7a29z109TY2tvv1NXv0tPX2NrW19jU1tfS09XP0dLOz9Hrx8jxxMbnxsfMzMzkxMXHycrGx8nDxcfqubvCw8XCwsPkuLrutbe/wcO+v8Lftre+vsC7vb+6u763ubu1t7riqqzeqquztbbqpqmxs7bZqKmvsbOtr7Kqra+pq67bnJ7gm56mqavXnJ3nl5ulp6qkpqmjpaeho6aeoaPbj5Gen6KcnqHXjpGbnZ7jiYzfio7SjpDdiYyZmp3LjI6ZmZnahoqVl5rXgoaTlZeSk5bSgIOPkZPOf4Lgen6Oj5LLf4KLjY+Ji46HiYvVcnaGhonNcnWDhYfKcXSCg4bca3DFcXTBcHJ+gIJ9foHRZWl6fH7MZmbOZWnGZGd6eX12eHrBY2bZXGF1dnlydHa4YWNwcXTOV1vKVlvIVlrCVlnPUFW+VVnOTlS3VFe1VFbKS1HGSE3BR0y/R0y7R0zEREq2R0rSP0WzRkmtRUjBOkC4OT6zOD3OMDaqNzrBLTO2KzCzKzCuKi/KISiqKi6lKS2+ICa6HyW7Hya2HySuHiOyHiSrHiKnHSGiHCCeHB+aGx/MBOLyAAAA/HRSTlMAERERERERERERESIiIiIiIiIiMzMzMzMzM0RERERVVVVVVVVVVVVmZmZmZmZmZmZ3d3eIiIiImZmZqqqqqrvMzMzMzMzMzMzMzMzM3d3d3e7u7v////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8PeNL3AAAACXBIWXMAAC37AAAt+wH8h0rnAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAFydJREFUeJzt3Xl8FNd9AHD31K56LfSIaOumTY80aeK06R23TXq5xXV8ZIRhzWEkgkAHKICQZCwpQpZsSSsWRQdeR2hlCWEsXFkHyELmtMEkGBvnMKZ2iV1jW2COGAOSwPzT33tv5s2bY3fn+O2slg8//DFikeT97u94b2Zn5FtuuRk342bcjJtxM8zCl5nhaWRm+lJNJuHP8Psy/H6/z7uA/1oG/CvVfL+P/vJS7qP/uQx4wVOJh9f/93q6u6LRzs0dHZH29ra21taWluZwOBRqbGxsqK+vr6urra2trq6qqqqsrKyoqFhHo5TEWiFKtKE8TD6NfgF8ZUUlfJNq+G519Q2NoVA4/Lek2lJI931algO8HeCqvKGBwOsIvFqBV+jhJXHCFF+9Huj1hN7Scs/vQvZTJ/f9Ppe3mcjVlGsyrsv1mpI1mtDo6QtVyvHV1WBvDIWbW1pb2//G58tMjRwaLvAHXE7hIA9RuVzscsqNGedsHquFf6t+rqd2kndOb2ttn/2p1OQ9w58ZCHxWlbeYyUnKNXAh4cxqEuwFMLVXVpFmh3pvbYP/Zvu9n/Olot+h3AOBzwtyqHXtgNOmXN/ignuVJmQ/56s9D98J0v5YQ2O4pa090gH2jtt/LQV2WNUCgT8Tqp3KhT7n802bcrXSGXqlPrif4tfwzFM7tHsdo3ds7oR+75j9W97LM3wzA1lfUOXNOvn6anFJ0zY5r3UTucznuVfLXrbXQrO3tEU6o13RFrDf9zmv6Zl+fyCQ9cWIblGLKdc2uVLnDFoEUUj/YcH0K9XUq3hS8nUNlN7V0xMh9ujtHtMzCH3WbcqEExY1bbWLcqHS1XxTbKE2OF/Wi3aa9ua2SLS7t6+vmdpn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';

        var cancelFormLoadEvent = $scope.$on('formLoad', function(event, form) {
          cancelFormLoadEvent();
          $timeout(function() {
            $scope.setDownloadUrl(form);
            sendIframeForm(form);
          });
        });

        $scope.$on('submissionLoad', function(event, submission) {
          $timeout(function() {
            submission.readOnly = $scope.readOnly;
            sendIframeMessage({name: 'submission', data: submission});
          });
        });

        // Submit the form from the iframe.
        $scope.$on('iframe-submission', function(event, submission) {
          $scope.submitForm(submission);
        });

        $scope.$on('iframe-errors', function(event, errors) {
          if (errors.length) {
            $scope.formioAlerts = [{
              type: 'danger',
              message: 'Please fix the following errors before submitting.'
            }];
            $scope.validationErrorPresent = true;
            $scope.$apply();
          } else {
            sendIframeMessage({name: 'getSubmission'});
          }
        });

        $scope.$on('iframe-getIframePositions', function() {
          var iframeBoundingClientRect = $element.find('.formio-iframe')[0].getBoundingClientRect();
          sendIframeMessage({
            name: 'iframePositions',
            data: {
              iframeBoundingClientRect: iframeBoundingClientRect,
              scrollY: window.scrollY
            }
          });
        });

        // Called from the submit on iframe.
        $scope.submitIFrameForm = function() {
          sendIframeMessage({name: 'getErrors'});
        };

        $scope.zoomIn = function() {
          sendIframeMessage({name: 'zoomIn'});
        };

        $scope.zoomOut = function() {
          sendIframeMessage({name: 'zoomOut'});
        };

        // FOR-71
        if (!$scope._src && !$scope.options.building) {
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

        function validateForm(form) {
          if (form.submitting) {
            return true;
          }
          form.$setDirty(true);
          for (var key in form) {
            if (form[key] && form[key].hasOwnProperty('$pristine')) {
              form[key].$setDirty(true);
              if (form[key].hasOwnProperty('$$controls') && key !== '$$parentForm') {
                validateForm(form[key]);
              }
            }
            if (form[key] && form[key].$validate) {
              form[key].$validate();
            }
          }
        }

        $scope.checkErrors = function(form) {
          validateForm(form);
          return !form.$valid;
        };

        $scope.isVisible = function(component, row) {
          return FormioUtils.isVisible(
            component,
            row,
            $scope.submission ? $scope.submission.data : null,
            $scope.hideComponents
          );
        };

        // Show the submit message and say the form is no longer submitting.
        var onSubmit = function(submission, message, form) {
          if (message) {
            $scope.showAlerts({
              type: 'success',
              message: message
            });
          }
          if (form) {
            form.submitting = false;
          }
        };

        // Called when a submission has been made.
        var onSubmitDone = function(method, submission, form) {
          var message = '';
          if ($scope.options && $scope.options.submitMessage) {
            message = $scope.options.submitMessage;
          }
          else if ($scope.form && $scope.form.settings && $scope.form.settings.submitMessage) {
            message = $scope.form.settings.submitMessage;
          }
          else {
            message = 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.';
          }
          onSubmit(submission, message, form);
          // Trigger the form submission.
          $scope.$emit('formSubmission', submission);
        };

        var alertsWatcher = null;

        $scope.submitUrl = function (url,component) {
          var settings = {
            headers: {}
          };
          if (url) {
            // Create a sanitized submission object.
            var submissionData = {data: {}};
            if ($scope.submission._id) {
              submissionData._id = $scope.submission._id;
            }
            if ($scope.submission.owner) {
              submissionData.owner = $scope.submission.owner;
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
              if ($scope.submission.data.hasOwnProperty(component.key)) {
                var value = $scope.submission.data[component.key];
                if (component.type === 'number' && (value !== null)) {
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
            if (component.action === 'url' && component.type === 'button'){
              if (component.headers && component.headers.length > 0) {
                component.headers.forEach(function(e) {
                  if (e.header !== '' && e.value !== '') {
                    settings.headers[e.header] = e.value;
                  }
                });
              }
            }
            $http.post(url, submissionData, settings).then(function(response) {
              Formio.clearCache();
              $scope.$emit('formSubmission', response.data);

              $scope.form.submitting = false;
            }, function (err) {
              $scope.formioAlerts.push({
                type: 'danger',
                message: err.message
              });

              $scope.form.submitting = false;
            })
              .finally(function() {
                if ($scope.form) {

                  $scope.form.submitting = false;
                }
              });
          }
          else {
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please add an URL to the action.'
            });
          }
        };

        $scope.$on('submitUrl',function(event,args){
          // Allow custom action urls.
          $scope.submitUrl(args.url,args.component);
        });

        $scope.submitForm = function(submissionData, form) {
          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            var action = $scope.action;
            // Add the action Id if it is not already part of the url.
            if (method === 'put' && (action.indexOf(submissionData._id) === -1)) {
              action += '/' + submissionData._id;
            }
            $http[method](action, submissionData)
              .then(function(response) {
                Formio.clearCache();
                onSubmitDone(method, response.data, form);
              })
              .catch(FormioScope.onError($scope, $element))
              .finally(function() {
                if (form) {
                  form.submitting = false;
                }
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio && !$scope.formio.noSubmit) {
            // copy to remove angular $$hashKey
            var submissionMethod = submissionData._id ? 'put' : 'post';
            $scope.formio.saveSubmission(submissionData, $scope.formioOptions)
              .then(function(submission) {
                // If submission saved propagate method to ngFormioHelper for correct message
                if (typeof submission === 'object') {
                  submission.method = submissionMethod;
                }
                onSubmitDone(submissionMethod, submission, form);
              })
              .catch(FormioScope.onError($scope, $element))
              .finally(function() {
                if (form) {
                  form.submitting = false;
                }
              });
          }
          else {
            $scope.$emit('formSubmission', submissionData);
          }
        };

        $scope.isDisabled = function(component) {
          return $scope.readOnly || component.disabled || (Array.isArray($scope.disableComponents) && $scope.disableComponents.indexOf(component.key) !== -1);
        };

        $scope.isRequired = function(component) {
          return FormioUtils.isRequired(component, $scope.requireComponents);
        };

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {

          $scope.formioAlerts = [];
          if ($scope.submission.state !== 'draft' && $scope.checkErrors(form)) {
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please fix the following errors before submitting.'
            });

            alertsWatcher = $scope.$watch(function() {
              return form.$valid;
            }, function(value) {
              if (value) {
                $scope.formioAlerts = [];
                alertsWatcher();
              }
            });

            return;
          }

          form.submitting = true;

          FormioUtils.alter('submit', $scope, $scope.submission, function(err) {
            if (err) {
              form.submitting = false;
              return FormioScope.onError($scope, $element)(err);
            }

            // Create a sanitized submission object.
            var submissionData = {data: {}};
            if ($scope.submission._id) {
              submissionData._id = $scope.submission._id;
            }
            if ($scope.submission.owner) {
              submissionData.owner = $scope.submission.owner;
            }
            if ($scope.submission.state) {
              submissionData.state = $scope.submission.state;
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
              if ($scope.submission.data.hasOwnProperty(component.key)) {
                var value = $scope.submission.data[component.key];
                if (component.type === 'number' && (value !== null)) {
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

            // Allow the form to be completed externally.
            $scope.$on('submitDone', function(event, submission, message) {
              onSubmit(submission, message, form);
            });

            // Allow an error to be thrown externally.
            $scope.$on('submitError', function(event, error) {
              FormioScope.onError($scope, $element)(error);
              form.submitting = false;
            });

            var submitEvent = $scope.$emit('formSubmit', submissionData);
            if (submitEvent.defaultPrevented) {
              // Listener wants to cancel the form submission
              form.submitting = false;
              return;
            }

            // Make sure to make a copy of the submission data to remove bad characters.
            submissionData = angular.copy(submissionData);
            $scope.submitForm(submissionData, form);
          }.bind(this));
        };
      }
    ],
    templateUrl: 'formio.html'
  };
};
