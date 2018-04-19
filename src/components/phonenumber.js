var fs = require('fs');

module.exports = function (app) {
  app.directive('phonenumberInput', function () {
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
      templateUrl: 'formio/components/phonenumber-input.html',
      controller: ['$scope', 'FormioUtils', function ($scope, FormioUtils) {
        if ($scope.options && $scope.options.building) return;
        $scope.isRequired = function (component) {
          return FormioUtils.isRequired(component)
        }
      }],
      link: function (scope, elem, attrs, ngModel) {
        if (scope.options && scope.options.building) return;

        scope.onMaskChange = onMaskChange;
        scope.onPhoneChange = onPhoneChange;

        scope.$watch('ngModel', function () {
            // Only update on load.
            if (ngModel.$viewValue && !ngModel.$dirty) {
              scope.phoneNumber = ngModel.$viewValue;
            }

            //set default mask if there is no value to display
            if (scope.isMultipleMasksField && !ngModel.$dirty && !ngModel.$viewValue) {
              var defaultMask = scope.component.inputMasks && scope.component.inputMasks.length ? scope.component.inputMasks[0].mask : undefined;
              scope.component.inputMask = defaultMask;
              scope.currentMask = defaultMask;
            }
          }
        );

        scope.isMultipleMasksField = scope.component.allowMultipleMasks && scope.component.inputMasks && scope.component.inputMasks.length > 0;

        function onMaskChange(newMask) {
          scope.component.inputMask = newMask;
        }

        function onPhoneChange(newPhoneNumber) {
          ngModel.$setViewValue(newPhoneNumber);
        }
      }
    };
  })
  ;


  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('phoneNumber', {
        title: 'Phone Number',
        template: 'formio/components/phonenumber.html',
        group: 'advanced',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'tel',
          inputMask: '(999) 999-9999',
          inputMasks: [
            {
              label: 'US',
              mask: '(999) 999-9999'
            }
          ],
          label: 'Phone Number',
          key: 'phonenumber',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          defaultValue: '',
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
    'FormioUtils',
    function ($templateCache, FormioUtils) {
      $templateCache.put('formio/components/phonenumber.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/phonenumber.html', 'utf8')
      ));
      $templateCache.put('formio/components/phonenumber-input.html',
        fs.readFileSync(__dirname + '/../templates/components/phonenumber-input.html', 'utf8')
      );
    }
  ]);
}
;
