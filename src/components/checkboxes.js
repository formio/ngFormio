var fs = require('fs');
module.exports = function (app) {

  app.directive('formioCheckboxes', [function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        readOnly: '=',
        model: '=ngModel'
      },
      templateUrl: 'formio/components/checkboxes-directive.html',
      link: function($scope, el, attrs, ngModel) {
        // Initialize model
        var model = {};
        angular.forEach($scope.component.values, function(v) {
          model[v.value] = !!ngModel.$viewValue[v.value];
        });
        ngModel.$setViewValue(model);
        ngModel.$setPristine(true);

        ngModel.$isEmpty = function(value) {
          return Object.keys(value).every(function(key) {
            return !value[key];
          });
        };

        $scope.toggleCheckbox = function(value) {
          var model = angular.copy(ngModel.$viewValue);
          model[value] = !model[value];
          ngModel.$setViewValue(model);
        };
      }
    };
  }]);

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('checkboxes', {
        title: 'Check Boxes',
        template: 'formio/components/checkboxes.html',
        tableView: function (data) {
          if (!data) return '';

          return Object.keys(data)
          .filter(function(key) {
            return data[key];
          })
          .join(', ');
        },
        settings: {
          input: true,
          inputType: 'checkboxes',
          tableView: true,
          label: '',
          key: 'checkboxesField',
          values: [],
          defaultValue: {},
          inline: false,
          protected: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache) {
      $templateCache.put('formio/components/checkboxes-directive.html',
        fs.readFileSync(__dirname + '/../templates/components/checkboxes-directive.html', 'utf8')
      );
      $templateCache.put('formio/components/checkboxes.html',
        fs.readFileSync(__dirname + '/../templates/components/checkboxes.html', 'utf8')
      );
    }
  ]);
};
