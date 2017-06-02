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
          if ($scope.component.form) {
            var url = '';
            if ($scope.component.project) {
              url += '/project/' + $scope.component.project;
            }
            else if ($scope.formio && $scope.formio.projectUrl) {
              url += $scope.formio.projectUrl;
            }
            url += '/form/' + $scope.component.form;
            $scope.component.src = (new Formio(url)).formUrl;
          }

          var submitForm = function(cb) {
            var url = $scope.component.src;
            if ($scope.data[$scope.component.key] && $scope.data[$scope.component.key]._id) {
              url += '/submission/' + $scope.data[$scope.component.key]._id;
            }
            (new Formio(url)).saveSubmission($scope.data[$scope.component.key]).then(function(sub) {
              $scope.data[$scope.component.key] = sub;
              cb();
            }, cb);
          };

          FormioUtils.hook('formComponent:submit', function(scope, cb) {
            submitForm(function(err) {
              if (err) {
                return cb(err);
              }

              if ($scope.component.reference) {
                $scope.data[$scope.component.key] = {_id: $scope.data[$scope.component.key]._id};
              }

              cb();
            });
          });

          FormioUtils.hook('formComponent:nextPage', function(scope, cb) {
            submitForm(cb);
          });

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
