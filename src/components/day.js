var fs = require('fs');
module.exports = function(app) {
  app.directive('dayPart', function() {
    return {
      restrict: 'A',
      replace: true,
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        if (scope.builder) return;
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
            ngModel.$setViewValue(ngModel.$viewValue.replace(/\D/g,''));
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
        gridCol: '=',
        builder: '=?'
      },
      templateUrl: 'formio/components/day-input.html',
      controller: ['$scope', function($scope) {
        if ($scope.builder) return;
        $scope.months = [
          {value: '', label: $scope.component.fields.month.placeholder},
          {value: '01', label: 'January'},
          {value: '02', label: 'February'},
          {value: '03', label: 'March'},
          {value: '04', label: 'April'},
          {value: '05', label: 'May'},
          {value: '06', label: 'June'},
          {value: '07', label: 'July'},
          {value: '08', label: 'August'},
          {value: '09', label: 'September'},
          {value: '10', label: 'October'},
          {value: '11', label: 'November'},
          {value: '12', label: 'December'}
        ];

        $scope.date = {
          day: '',
          month: '',
          year: ''
        };
      }],
      link: function(scope, elem, attrs, ngModel) {
        if (scope.builder) return;
        // Set the scope values based on the current model.
        scope.$watch('ngModel', function() {
          // Only update on load.
          if (ngModel.$viewValue && !ngModel.$dirty) {
            var parts = typeof ngModel.$viewValue === 'string'
              ? ngModel.$viewValue.split('/')
              : ngModel.$viewValue;
            if ((parts instanceof Array) && parts.length === 3) {
              scope.date.day = parts[(scope.component.dayFirst ? 0 : 1)];
              scope.date.month = parts[(scope.component.dayFirst ? 1 : 0)];
              scope.date.year = parts[2];
            }
          }
        });

        var padLeft = function padLeft(nr, n, str) {
          nr = nr.toString();
          if (nr.length > n) {
            return nr.substr(0, n);
          }

          return Array((n - nr.length) + 1).join(str || '0') + nr;
        };

        scope.onChange = function() {
          var day = padLeft(scope.date.day, 2);
          var month = padLeft(scope.date.month, 2);
          var year = padLeft(scope.date.year, 4);
          var value = scope.component.dayFirst ? day : month;
          value += '/';
          value += scope.component.dayFirst ? month : day;
          value += '/' + year;
          ngModel.$setViewValue(value);
        };

        ngModel.$validators.day = function(modelValue, viewValue) {
          var value = modelValue || viewValue;
          var required = scope.component.fields.day.required || scope.component.fields.month.required || scope.component.fields.year.required;

          if (!required) {
            return true;
          }
          if (!value && required) {
            return false;
          }
          var parts = value.split('/');
          if (scope.component.fields.day.required) {
            if (parts[(scope.component.dayFirst ? 0 : 1)] === '00') {
              return false;
            }
          }
          if (scope.component.fields.month.required) {
            if (parts[(scope.component.dayFirst ? 1 : 0)] === '00') {
              return false;
            }
          }
          if (scope.component.fields.year.required) {
            if (parts[2] === '0000') {
              return false;
            }
          }
          return true;
        };
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
          clearOnHide: true,
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
        fs.readFileSync(__dirname + '/../templates/components/day-input.html', 'utf8')
      );
    }
  ]);
};
