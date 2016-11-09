var fs = require('fs');
module.exports = function(app) {
  app.directive('dayPart', function() {
    return {
      restrict: 'A',
      replace: true,
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        var limitLength = attrs.characters || 2;
        scope.$watch(attrs.ngModel, function() {
          if (!ngModel.$viewValue) {
            return;
          }
          var render = false;
          if (ngModel.$viewValue.length > limitLength) {
            ngModel.$setViewValue(ngModel.$viewValue.substring(0, limitLength));
            render = true;
          }
          if (isNaN(ngModel.$viewValue)) {
            ngModel.$setViewValue('');
            render = true;
          }
          if (
            parseInt(ngModel.$viewValue) < parseInt(attrs.min) ||
            parseInt(ngModel.$viewValue) > parseInt(attrs.max)
          ) {
            ngModel.$setViewValue(ngModel.$viewValue.substring(0, limitLength - 1));
            render = true;
          }
          if (render) {
            ngModel.$render();
          }
        });
      }
    };
  });
  app.directive('dayInput', function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        componentId: '=',
        readOnly: '=',
        ngModel: '=',
        gridRow: '=',
        gridCol: '='
      },
      templateUrl: 'formio/components/day-input.html' +
      controller: ['$scope', function($scope) {
        $scope.months = [$scope.component.fields.month.placeholder, 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];

        $scope.day = '';
        $scope.month = '';
        $scope.year = '';

        $scope.onChange = function() {

        };
      }],
      link: function(scope, elem, attrs, ngModel) {
        // Set the scope values based on the current model.
        var value = ngModel.$modelValue || ngModel.$viewValue;
        if (value) {
          var parts = value.split('/');
          scope.day = parts[(scope.component.dayFirst ? 0 : 1)];
          scope.month = parts[(scope.component.dayFirst ? 1 : 0)];
          scope.year = parts[2];
        }

        ngModel.$validators.day = function(modelValue, viewValue) {
          var value = modelValue || viewValue;

          //console.log('validate ', value);
          // Do validation
          return true;
        };
        //console.log(scope, elem, attrs, ngModel);
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('day', {
        title: 'Day',
        template: 'formio/components/day.html',
        group: 'advanced',
        //controller: ['$scope', function($scope) {
        //}],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'dayField',
          fields: {
            day: {
              type: 'text',
              placeholder: '',
              required: false
            },
            month: {
              type: 'select',
              placeholder: '',
              required: false
            },
            year: {
              type: 'text',
              placeholder: '',
              required: false
            }
          },
          dayFirst: false,
          protected: false,
          persistent: true,
          validate: {
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/day.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/day.html', 'utf8')
      ));
      $templateCache.put('formio/components/day-input.html',
        fs.readFileSync(__dirname + '/../templates/components/dayinput.html', 'utf8')
      );
    }
  ]);
};
