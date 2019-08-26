var fs = require('fs');

module.exports = function(app) {
  app.directive('formioSelectBoxes', [function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        componentId: '=',
        readOnly: '=',
        model: '=ngModel',
        gridRow: '=',
        gridCol: '=',
        options: '=?'
      },
      templateUrl: 'formio/components/selectboxes-directive.html',
      link: function($scope, el, attrs, ngModel) {
        if ($scope.options && $scope.options.building) return;

        // Initialize model
        var model = {};
        angular.forEach($scope.component.values, function(v) {
          model[v.value] = ngModel.$viewValue.hasOwnProperty(v.value)
            ? !!ngModel.$viewValue[v.value]
            : false;
        });

        var modelValue = $scope.model || model;
        if (!ngModel.$isEmpty(modelValue)) {
          // FA-835 - Update the view model with our defaults.
          // FA-921 - Attempt to load a current model, if present before the defaults.
          ngModel.$setViewValue(modelValue);
          ngModel.$setPristine(true);
        }

        $scope.toggleCheckbox = function(value) {
          var _model = angular.copy(ngModel.$viewValue || {});
          _model[value] = !_model[value];
          ngModel.$setViewValue(_model);
        };
      },
      controller: [
        '$scope',
        'FormioUtils',
        function(
          $scope,
          FormioUtils
        ) {
          $scope.topOrLeftOptionLabel = FormioUtils.optionsLabelPositionWrapper(FormioUtils.topOrLeftOptionLabel);
          $scope.getOptionLabelStyles = FormioUtils.optionsLabelPositionWrapper(FormioUtils.getOptionLabelStyles);
          $scope.getOptionInputStyles = FormioUtils.optionsLabelPositionWrapper(FormioUtils.getOptionInputStyles);
        }
      ]
    };
  }]);

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('selectboxes', {
        title: 'Select Boxes',
        template: 'formio/components/selectboxes.html',
        tableView: function(data, options) {
          if (!data) return '';

          return Object.keys(data)
          .filter(function(key) {
            return data[key];
          })
          .map(function(data) {
            options.component.values.forEach(function(item) {
              if (item.value === data) {
                data = item.label;
              }
            });
            return data;
          })
          .join(', ');
        },
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          label: 'Select Boxes',
          key: 'selectboxes',
          values: [],
          inline: false,
          protected: false,
          persistent: true,
          hidden: false,
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
      $templateCache.put('formio/components/selectboxes-directive.html',
        fs.readFileSync(__dirname + '/../templates/components/selectboxes-directive.html', 'utf8')
      );
      $templateCache.put('formio/components/selectboxes.html',
        fs.readFileSync(__dirname + '/../templates/components/selectboxes.html', 'utf8')
      );
    }
  ]);
};
