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
      options: '=?'
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      '$q',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils,
        $q
      ) {
        var iframeReady = $q.defer();
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        $scope.iframeReady = false;
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
          if ($scope.form.builder) {
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

        $scope.getPDFDownload = function(pdf) {
          if (!$scope.formio) {
            return;
          }
          var download = '';
          if ($scope.formio && $scope.formio.submissionUrl) {
            download = $scope.formio.submissionUrl;
          }
          else if ($scope.submission._id) {
            download = Formio.baseUrl + '/project/' + $scope.form.project + '/';
            download += '/form/' + $scope.form._id;
            download += '/submission/' + $scope.submission._id;
          }
          if (!download) {
            return;
          }

          download += '/download/' + pdf.id;
          var allowedPath = download.replace(Formio.baseUrl, '');
          allowedPath = allowedPath.replace(Formio.getProjectUrl(), '');
          return $scope.formio.getTempToken(3600, 'GET:' + allowedPath).then(function(tempToken) {
            download += '?token=' + tempToken.key;
            $scope.downloadUrl = download;
            return download;
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

        $scope.$on('iframe-ready', function() {
          $scope.iframeReady = true;
          var iframe = $element.find('.formio-iframe')[0];
          if (iframe) {
            iframeReady.resolve(iframe);
            if ($scope.form) {
              sendIframeMessage({name: 'form', data: $scope.form});
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

        var cancelFormLoadEvent = $scope.$on('formLoad', function(event, form) {
          cancelFormLoadEvent();
          iframeReady.promise.then(function() {
            $scope.getPDFDownload(form.settings.pdf);
          });
          sendIframeMessage({name: 'form', data: form});
        });

        $scope.$on('submissionLoad', function(event, submission) {
          submission.readOnly = $scope.readOnly;
          sendIframeMessage({name: 'submission', data: submission});
        });

        // Submit the form from the iframe.
        $scope.$on('iframe-submission', function(event, submission) {
          $scope.submitForm(submission);
        });

        // Called from the submit on iframe.
        $scope.submitIFrameForm = function() {
          sendIframeMessage({name: 'getSubmission'});
        };

        $scope.zoomIn = function() {
          sendIframeMessage({name: 'zoomIn'});
        };

        $scope.zoomOut = function() {
          sendIframeMessage({name: 'zoomOut'});
        };

        // FOR-71
        if (!$scope._src && !$scope.builder) {
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

        $scope.checkErrors = function(form) {
          if (form.submitting) {
            return true;
          }
          form.$setDirty(true);
          for (var key in form) {
            if (form[key] && form[key].hasOwnProperty('$pristine')) {
              form[key].$setDirty(true);
            }
            if (form[key] && form[key].$validate) {
              form[key].$validate();
            }
          }
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
          else {
            message = 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.';
          }
          onSubmit(submission, message, form);
          // Trigger the form submission.
          $scope.$emit('formSubmission', submission);
        };

        $scope.submitForm = function(submissionData, form) {
          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            var action = $scope.action;
            // Add the action Id if it is not already part of the url.
            if (method === 'put' && (action.indexOf(submissionData._id) === -1)) {
              action += '/' + submissionData._id;
            }
            $http[method](action, submissionData).then(function(response) {
              Formio.clearCache();
              onSubmitDone(method, response.data, form);
            }, FormioScope.onError($scope, $element))
              .finally(function() {
                if (form) {
                  form.submitting = false;
                }
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio && !$scope.formio.noSubmit) {
            // copy to remove angular $$hashKey
            $scope.formio.saveSubmission(submissionData, $scope.formioOptions).then(function(submission) {
              onSubmitDone(submission.method, submission, form);
            }, FormioScope.onError($scope, $element)).finally(function() {
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
          if ($scope.checkErrors(form)) {
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please fix the following errors before submitting.'
            });
            return;
          }

          form.submitting = true;
          FormioUtils.alter('submit', $scope, $scope.submission, function(err) {
            if (err) {
              return this.showAlerts(err.alerts);
            }

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
