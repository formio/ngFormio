var fs = require('fs');
var _get = require('lodash/get');
var _trimEnd = require('lodash/trimEnd');
module.exports = function(app) {
  var getDateParts = function(component, value) {
    var showDay = !_get(component, 'fields.day.hide', false);
    var showMonth = !_get(component, 'fields.month.hide', false);
    var showYear = !_get(component, 'fields.year.hide', false);
    var parts = (typeof value === 'string') ? value.split('/') : value;
    if (parts instanceof Array) {
      return {
        day: showDay ? Number(parts[(component.dayFirst ? 0 : 1)]) : 0,
        month: showMonth ? Number(parts[(component.dayFirst ? 1 : 0)]) : 0,
        year: showYear ? Number(parts[parts.length - 1]) : 0
      };
    }
    else {
      return null;
    }
  };

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
        options: '=?'
      },
      templateUrl: 'formio/components/day-input.html',
      controller: ['$scope', function($scope) {
        if ($scope.options && $scope.options.building) return;
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
          // Year is leap if it is evenly divisible by 400 or evenly divisible by 4 and not evenly divisible by 100.
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
              return 31;
          }
        }

        $scope.maxDay = 31;
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
        if (scope.options && scope.options.building) return;
        // Set the scope values based on the current model.
        scope.$watch('ngModel', function() {
          // Only update on load.
          if (ngModel.$viewValue && !ngModel.$dirty) {
            var dateParts = getDateParts(scope.component, ngModel.$viewValue);
            if (dateParts) {
              scope.date.day = dateParts.day;
              scope.date.month = padLeft(dateParts.month.toString(), 2);
              scope.date.year = dateParts.year;
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
          var value = '';
          var showDay = !_get(scope.component, 'fields.day.hide', false);
          var showMonth = !_get(scope.component, 'fields.month.hide', false);
          var showYear = !_get(scope.component, 'fields.year.hide', false);
          if (showDay && scope.component.dayFirst) {
            value += day + '/';
          }
          else if (showMonth && !scope.component.dayFirst) {
            value += month + '/';
          }

          if (showDay && !scope.component.dayFirst) {
            value += day + '/';
          }
          else if (showMonth && scope.component.dayFirst) {
            value += month + '/';
          }

          if (showYear) {
            value += year;
          }
          ngModel.$setViewValue(_trimEnd(value, '/'));
        };

        ngModel.$validators.day = function(modelValue, viewValue) {
          var value = modelValue || viewValue;
          var showDay = !_get(scope.component, 'fields.day.hide', false);
          var showMonth = !_get(scope.component, 'fields.month.hide', false);
          var showYear = !_get(scope.component, 'fields.year.hide', false);
          var dayRequired = showDay && _get(scope.component, 'fields.day.required', false);
          var monthRequired = showMonth && _get(scope.component, 'fields.month.required', false);
          var yearRequired = showYear && _get(scope.component, 'fields.year.required', false);
          var required = dayRequired || monthRequired || yearRequired;
          if (!required) {
            return true;
          }
          if (!value && required) {
            return false;
          }
          var dateParts = getDateParts(scope.component, value);
          if (dateParts) {
            if (dayRequired && !dateParts.day) {
              return false;
            }
            if (monthRequired && !dateParts.month) {
              return false;
            }
            if (yearRequired && !dateParts.year) {
              return false;
            }
          }
          return true;
        };

        scope.getLabelStyles = function(component) {
          var labelPosition = component.inputsLabelPosition;

          if (labelPosition === 'left') {
            return {
              float: 'left',
              width: '30%',
              'margin-right': '3%',
              'text-align': 'left'
            };
          }

          if (labelPosition === 'right') {
            return {
              float: 'right',
              width: '30%',
              'margin-left': '3%',
              'text-align': 'right'
            };
          }
        };

        scope.getInputStyles = function(component) {
          var labelPosition = component.inputsLabelPosition;

          if ([
            'left',
            'right'
          ].indexOf(labelPosition) !== -1) {
            var styles = {
              width: '67%'
            };

            if (labelPosition === 'left') {
              styles['margin-left'] = '33%';
            }
            else {
              styles['margin-right'] = '33%';
            }

            return styles;
          }
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
          autofocus: false,
          input: true,
          tableView: true,
          label: 'Day',
          key: 'day',
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
