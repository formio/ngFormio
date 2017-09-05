var fs = require('fs');
module.exports = function(app) {
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
          {value: '00', label: $scope.component.fields.month.placeholder},
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

        function isLeapYear(year) {
          // Year is leap if it evenly divisible by 400 or evenly divisible by 4 and not evenly divisible by 100.
          return !(year % 400) || (!!(year % 100) && !(year % 4));
        }

        function getDaysInMonthCount(month, year) {
          switch (month) {
            case 1:     // January
            case 3:     // March
            case 5:     // May
            case 7:     // July
            case 8:     // August
            case 10:    // October
            case 12:    // December
              return 31;
            case 4:     // April
            case 6:     // June
            case 9:     // September
            case 11:    // November
              return 30;
            case 2:     // February
              return isLeapYear(year) ? 29 : 28;
            default:
              return 0;
          }
        }

        $scope.maxDay = 0;
        $scope.$watch(function() {
          return $scope.date.month + '/' + $scope.date.year;
        }, function() {
          var day = Number($scope.date.day);
          var month = Number($scope.date.month);
          var year = Number($scope.date.year);
          $scope.maxDay = getDaysInMonthCount(month, year);

          if (day > $scope.maxDay) {
            $scope.date.day = null;
          }
        });

        $scope.date = {
          day: '',
          month: '00',
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
              scope.date.day = Number(parts[(scope.component.dayFirst ? 0 : 1)]);
              scope.date.month = parts[(scope.component.dayFirst ? 1 : 0)];
              scope.date.year = Number(parts[2]);
            }
          }
        });

        var padLeft = function padLeft(nr, n, str) {
          nr = (nr || '').toString();
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
              type: 'number',
              placeholder: '',
              required: false
            },
            month: {
              type: 'select',
              placeholder: '',
              required: false
            },
            year: {
              type: 'number',
              placeholder: '',
              required: false
            }
          },
          dayFirst: false,
          protected: false,
          persistent: true,
          hidden: false,
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
