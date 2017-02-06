var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('checkbox', {
        title: 'Check Box',
        template: 'formio/components/checkbox.html',
        tableView: function(data) {
          return data ? 'Yes' : 'No';
        },
        controller: ['$scope', function($scope) {
          if ($scope.builder) return;
          // FA-850 - Ensure the checked value is always a boolean object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            var boolean = {
              true: true,
              false: false
            };
            if ($scope.data && $scope.data.hasOwnProperty($scope.component.key) && !($scope.data[$scope.component.key] instanceof Boolean)) {
              if ($scope.component.validate && $scope.component.validate.required && !$scope.data[$scope.component.key]) {
                delete $scope.data[$scope.component.key];
              }
              else {
                $scope.data[$scope.component.key] = boolean[$scope.data[$scope.component.key]] || false;
              }
              loadComplete();
            }
          });
        }],
        settings: {
          input: true,
          inputType: 'checkbox',
          tableView: true,
          // This hides the default label layout so we can use a special inline label
          hideLabel: true,
          label: '',
          datagridLabel: true,
          key: 'checkboxField',
          defaultValue: false,
          protected: false,
          persistent: true,
          clearOnHide: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/checkbox.html',
        fs.readFileSync(__dirname + '/../templates/components/checkbox.html', 'utf8')
      );
    }
  ]);
};
