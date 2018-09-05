var fs = require('fs');
var isEmpty = require('lodash/isEmpty');
var GridUtils = require('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('form', {
        title: 'Form',
        template: 'formio/components/form.html',
        group: 'advanced',
        settings: {
          clearOnHide: true,
          input: true,
          tableView: true,
          key: 'formField',
          src: '',
          reference: true,
          form: '',
          path: '',
          label: '',
          protected: false,
          unique: false,
          persistent: true
        },
        controller: [
          '$scope',
          'FormioUtils',
          'Formio',
          '$timeout',
          function(
            $scope,
            FormioUtils,
            Formio,
            $timeout
          ) {
            $scope.options = $scope.options || {};
            var baseUrl = Formio.setScopeBase($scope);
            if (!$scope.data[$scope.component.key]) {
              $scope.data[$scope.component.key] = {data: {}};
            }

            var loadForm = function() {
              if (!$scope.component.form) {
                return;
              }

              var url = '';
              if ($scope.component.src) {
                url = $scope.component.src;
              }
              else if ($scope.formio && $scope.component.form) {
                url = $scope.formio.formsUrl + '/' + $scope.component.form;
              }

              if (!url) {
                console.warn('Cannot load form. Need to pass in src or url to formio directive.');
                return;
              }

              if ($scope.data[$scope.component.key] && $scope.data[$scope.component.key]._id) {
                // Submission url should refer to the submission's form.
                $scope.submissionFormio = new Formio($scope.formio.formsUrl + '/' + $scope.data[$scope.component.key].form + '/submission/' + $scope.data[$scope.component.key]._id, {base: baseUrl});
              }
              else {
                // Submission url is the same as the form url.
                $scope.submissionFormio = new Formio(url, {base: baseUrl});
              }
              $scope.url = url;

              $scope.formFormio = new Formio(url, {base: baseUrl});
              if ($scope.formFormio.formId) {
                $scope.formFormio.loadForm().then(function(formObj) {
                  if (!formObj) {
                    return;
                  }
                  if ($scope.componentForm) {
                    if ($scope.componentForm._id === formObj._id) {
                      return;
                    }
                    $scope.componentForm = null;
                  }
                  $timeout(function() {
                    $scope.componentForm = formObj;
                  });
                });
              }

              // See if we need to load the submission into scope.
              if (
                $scope.submissionFormio.submissionId &&
                $scope.data[$scope.component.key] &&
                $scope.data[$scope.component.key]._id &&
                isEmpty($scope.data[$scope.component.key].data)
              ) {
                $scope.submissionFormio.loadSubmission().then(function(submission) {
                  if (!submission) {
                    return;
                  }

                  angular.merge($scope.data[$scope.component.key], submission);
                });
              }
            };

            var submitForm = function(scope, cb) {
              var submission = angular.copy($scope.data[$scope.component.key]);

              // Only save if we have provided data.
              if (angular.equals(submission, {})) {
                return;
              }

              var components = [];
              if (scope.activePage) {
                components = scope.activePage.components;
              }
              else if (scope.form) {
                components = scope.form.components;
              }
              if (FormioUtils.getComponent(components, $scope.component.key)) {
                $scope.submissionFormio.saveSubmission(submission).then(function(sub) {
                  if (!$scope.data[$scope.component.key]) {
                    $scope.data[$scope.component.key] = {data: {}};
                  }
                  angular.merge($scope.data[$scope.component.key], sub);
                  cb();
                }, cb);
              }
              else {
                return cb();
              }
            };

            // Hook into the submit method.
            FormioUtils.hook($scope.component.key + ':submit', function(scope, data, cb) {
              submitForm(scope, cb);
            });

            // Hook into the nextpage method.
            FormioUtils.hook($scope.component.key + ':nextPage', function(scope, cb) {
              submitForm(scope, cb);
            });

            // Hook into the prevpage method.
            FormioUtils.hook($scope.component.key + ':prevPage', function(scope, cb) {
              submitForm(scope, cb);
            });

            // Make sure to hide the submit button on the loaded form.
            $scope.$on('formLoad', function(err, form) {
              FormioUtils.eachComponent(form.components, function(component) {
                if ((component.type === 'button') && (component.action === 'submit')) {
                  component.hidden = true;
                }
              });
            });

            $scope.$watch('component.form', function() {
              loadForm();
            });

            $scope.$watch('data[component.key]', function(submission) {
              if (!submission) {
                return;
              }
              angular.merge($scope.data[$scope.component.key], submission);
            }, true);
          }
        ],
        tableView: function(data, options) {
          // Include only form data.
          return data ? GridUtils.generic(data.data, options) : '';
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/form.html',
        fs.readFileSync(__dirname + '/../templates/components/form.html', 'utf8')
      );
    }
  ]);
};
