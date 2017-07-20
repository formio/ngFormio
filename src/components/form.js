var fs = require('fs');
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
        controller: ['$scope', 'FormioUtils', 'Formio', function($scope, FormioUtils, Formio) {
          var url = $scope.component.src;
          $scope.options = $scope.options || {};
          var baseUrl = $scope.options.baseUrl || Formio.getBaseUrl();
          if ($scope.component.form) {
            url = baseUrl;
            if ($scope.component.project) {
              url += '/project/' + $scope.component.project;
            }
            else if ($scope.formio && $scope.formio.projectUrl) {
              url  = $scope.formio.projectUrl;
            }
            url += '/form/' + $scope.component.form;
            url = (new Formio(url, {base: baseUrl})).formUrl;
          }

          if ($scope.data[$scope.component.key] && $scope.data[$scope.component.key]._id) {
            url += '/submission/' + $scope.data[$scope.component.key]._id;
          }

          $scope.formFormio = new Formio(url, {base: baseUrl});
          $scope.formFormio.loadForm().then(function(form) {
            $scope.componentForm = form;
          });

          var submitForm = function(scope, cb) {
            if (FormioUtils.getComponent(scope.activePage.components, $scope.component.key)) {
              $scope.formFormio.saveSubmission(angular.copy($scope.data[$scope.component.key])).then(function(sub) {
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

          // See if we need to load the submission into scope.
          if (
            $scope.data[$scope.component.key] &&
            $scope.data[$scope.component.key]._id &&
            !$scope.data[$scope.component.key].data
          ) {
            $scope.formFormio.loadSubmission().then(function(submission) {
              angular.merge($scope.data[$scope.component.key], submission);
            });
          }

          // Make sure to hide the submit button on the loaded form.
          $scope.$on('formLoad', function(err, form) {
            FormioUtils.eachComponent(form.components, function(component) {
              if ((component.type === 'button') && (component.action === 'submit')) {
                component.hidden = true;
              }
            });
          });
        }],
        tableView: GridUtils.generic
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
