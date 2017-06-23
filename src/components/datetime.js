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
        /* eslint-disable no-unused-vars */
        // NOTE: Do not delete the "moment" variable here. That is needed to make moment() work in default dates.
        controller: ['$scope', '$timeout', 'moment', function($scope, $timeout, moment) {
        /* eslint-enable no-unused-vars */
          // Close calendar pop up when tabbing off button
          $scope.onKeyDown = function(event) {
            return event.keyCode === 9 ? false : $scope.calendarOpen;
          };

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
          $scope.$watch('data.' + $scope.component.key, function() {
            var newValue = dateValue();
            if (newValue) {
              $scope.data[$scope.component.key] = newValue;
            }
          });

          // Watch for changes to the meridian settings to synchronize the submissionGrid and component view.
          $scope.$watch('component.timePicker.showMeridian', function(update) {
            // Remove any meridian reference, because were not in 12 hr.
            if (!$scope.component.enableTime || !update) {
              $scope.component.format = $scope.component.format.replace(/ a/, '');
              return;
            }

            // If we're missing the meridian string and were in 12 hr, add it.
            if (update && $scope.component.format.indexOf(' a') === -1) {
              $scope.component.format += ' a';
            }
          });

          if (!$scope.component.datePicker.maxDate) {
            delete $scope.component.datePicker.maxDate;
          }
          else {
            var maxDate = new Date($scope.component.datePicker.maxDate);
            $scope.component.datePicker.maxDate = new Date(
              maxDate.getUTCFullYear(),
              maxDate.getUTCMonth(),
              maxDate.getUTCDate(),
              23,
              59,
              59,
              999
            );
          }

          if (!$scope.component.datePicker.minDate) {
            delete $scope.component.datePicker.minDate;
          }
          else {
            var minDate = new Date($scope.component.datePicker.minDate);
            $scope.component.datePicker.minDate = new Date(
              minDate.getUTCFullYear(),
              minDate.getUTCMonth(),
              minDate.getUTCDate(),
              0,
              0,
              0,
              0
            );
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
          datepickerMode: 'day',
          datePicker: {
            showWeeks: true,
            startingDay: 0,
            initDate: '',
            minMode: 'day',
            maxMode: 'year',
            yearRows: 4,
            yearColumns: 5,
            minDate: null,
            maxDate: null
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
          hidden: false,
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
