var fs = require('fs');
var moment = require('moment');

module.exports = function(app) {
  app.directive('timeFormat', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attr, ngModel) {
        ngModel.$parsers.push(function(utcDate) {
          if (!utcDate) return '';
          return moment(utcDate).format(scope.component.format);
        });

        ngModel.$formatters.push(function(utcDate) {
          if (!utcDate) return;
          return moment(utcDate, scope.component.format).toDate();
        });

        scope.$watch('data.' + scope.component.key, function() {
          if (ngModel.$modelValue) {
            ngModel.$setViewValue(moment(ngModel.$modelValue, scope.component.format).format('HH:mm:ss.SSS'));
            ngModel.$render();
          }
        });
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('time', {
        title: 'Time',
        template: 'formio/components/time.html',
        group: 'advanced',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'time',
          format: 'HH:mm',
          label: 'Time',
          key: 'time',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          clearOnHide: true
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function(
      $templateCache,
      FormioUtils
    ) {
      $templateCache.put('formio/components/time.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/time.html', 'utf8')
      ));
    }
  ]);
};
