var fs = require('fs');
var moment = require('moment-timezone');
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
          // Ensure the date value is always a date object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            if ($scope.data && $scope.data[$scope.component.key] && !($scope.data[$scope.component.key] instanceof Date)) {
              $scope.data[$scope.component.key] = new Date($scope.data[$scope.component.key]);
              loadComplete();
            }
          });

          if (!$scope.component.maxDate) {
            delete $scope.component.maxDate;
          }
          if (!$scope.component.minDate) {
            delete $scope.component.minDate;
          }

          $scope.tz = {}
          $scope.tz.options = {};
          if ($scope.component.enableTimezone) {
            $scope.tz.timezone = moment.tz.guess();
            $scope.tz.zones = moment.tz.names();

            var updateOffset = function() {
              if ($scope.tz.timezone && $scope.data[$scope.component.key]) {
                $scope.options.timezone = moment($scope.data[$scope.component.key]).tz($scope.tz.timezone).format('Z').replace(':','');
              }
              else {
                delete $scope.tz.options.timezone;
              }
            }

            $scope.$watch('tz.timezone', updateOffset);
            $scope.$watch('data.' + $scope.component.key, updateOffset);
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
          format: 'yyyy-MM-dd HH:mm',
          enableDate: true,
          enableTime: true,
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
