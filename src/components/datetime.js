var fs = require('fs');
var _get = require('lodash/get');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datetime', {
        title: 'Date / Time',
        template: 'formio/components/datetime.html',
        tableView: function(data, options) {
          data = _.isDate(data) ? data.toISOString() : data;
          return options.$interpolate('<span>{{ "' + data + '" | date: "' + options.component.format + '" }}</span>')();
        },
        group: 'advanced',
        controller: ['$scope', '$timeout', 'FormioUtils', function($scope, $timeout, FormioUtils) {
        /* eslint-enable no-unused-vars */
          // Close calendar pop up when tabbing off button
          $scope.onKeyDown = function(event) {
            return event.keyCode === 9 ? false : $scope.calendarOpen;
          };

          $scope.onBlur = function(event) {
            if (!$scope.data[$scope.component.key]) {
              event.target.value = '';
            }
          };

          var dateValue = function() {
            // If the date is set, then return the true date value.
            if ($scope.data[$scope.component.key]) {
              return ($scope.data[$scope.component.key] instanceof Date) ? $scope.data[$scope.component.key] : new Date($scope.data[$scope.component.key]);
            }

            return FormioUtils.getDateSetting($scope.component.defaultDate);
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
          $scope.component.datePicker.minDate = FormioUtils.getDateSetting(_get($scope.component, 'datePicker.minDate'));
          $scope.component.datePicker.maxDate = FormioUtils.getDateSetting(_get($scope.component, 'datePicker.maxDate'));

          $scope.autoOpen = true;
          $scope.onClosed = function() {
            $scope.autoOpen = false;
            $timeout(function() {
              $scope.autoOpen = true;
            }, 250);
          };
        }],
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          label: 'Date Time',
          key: 'datetime',
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
