var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datetime', {
        title: 'Date / Time',
        template: 'formio/components/datetime.html',
        tableView: function(data, component, $interpolate) {
          return $interpolate('<span>{{ "' + data + '" | date: "' + component.format + '" }}</span>')();
        },
        group: 'advanced',
        controller: ['$scope', '$timeout', function($scope, $timeout) {
          if ($scope.builder) return;

          var dateValue = function() {
            // If the date is set, then return the true date value.
            if ($scope.data[$scope.component.key]) {
              return ($scope.data[$scope.component.key] instanceof Date) ? $scope.data[$scope.component.key] : new Date($scope.data[$scope.component.key]);
            }

            // See if a default date is set.
            if ($scope.component.defaultDate) {
              var defaultDate = new Date($scope.component.defaultDate);
              if (!defaultDate || isNaN(defaultDate.getDate())) {
                try {
                  defaultDate = new Date(eval($scope.component.defaultDate));
                }
                catch (e) {
                  defaultDate = '';
                }
              }

              if (defaultDate && !isNaN(defaultDate.getDate())) {
                return defaultDate;
              }
            }

            // Default to empty.
            return '';
          };

          // Ensure the date value is always a date object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            if (!$scope.data) {
              return;
            }
            var valueSet = !!$scope.data[$scope.component.key];
            $scope.data[$scope.component.key] = dateValue();
            if (valueSet) {
              loadComplete();
            }
          });

          // If they have 12 hour time enabled, we need to ensure that we see the meridian in the format.
          if (
            $scope.component.enableTime &&
            $scope.component.timePicker &&
            $scope.component.timePicker.showMeridian &&
            ($scope.component.format.indexOf('mm') !== -1) &&
            ($scope.component.format.indexOf('a') === -1)
          ) {
            $scope.component.format += ' a';
          }

          if (!$scope.component.maxDate) {
            delete $scope.component.maxDate;
          }
          if (!$scope.component.minDate) {
            delete $scope.component.minDate;
          }

          $scope.autoOpen = true;
          $scope.onClosed = function() {
            $scope.autoOpen = false;
            $timeout(function() {
              $scope.autoOpen = true;
            }, 250);
          };
        }],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'datetimeField',
          placeholder: '',
          format: 'yyyy-MM-dd HH:mm a',
          enableDate: true,
          enableTime: true,
          defaultDate: '',
          minDate: null,
          maxDate: null,
          datepickerMode: 'day',
          datePicker: {
            showWeeks: true,
            startingDay: 0,
            initDate: '',
            minMode: 'day',
            maxMode: 'year',
            yearRange: '20'
          },
          timePicker: {
            hourStep: 1,
            minuteStep: 1,
            showMeridian: true,
            readonlyInput: false,
            mousewheel: true,
            arrowkeys: true
          },
          protected: false,
          persistent: true,
          clearOnHide: true,
          validate: {
            required: false,
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
      $templateCache.put('formio/components/datetime.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/datetime.html', 'utf8')
      ));
    }
  ]);
};
