app.directive('formioSelectItem', [
  '$compile',
  function(
    $compile
  ) {
    return {
      restrict: 'E',
      scope: {
        template: '=',
        item: '=',
        select: '='
      },
      link: function(scope, element) {
        if (scope.template) {
          element.html($compile(angular.element(scope.template))(scope));
        }
      }
    };
  }
]);

app.directive('uiSelectRequired', function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      if (!attrs.ngRequired) { return; }
      scope.$watch(function () {
        return ngModel.$modelValue;
      }, function () {
        ngModel.$setValidity('required', !!(ngModel.$modelValue && ngModel.$modelValue.length));
      });
    }
  };
});

// Configure the Select component.
app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('select', {
      title: 'Select',
      template: function($scope) {
        return $scope.component.multiple ? 'formio/components/select-multiple.html' : 'formio/components/select.html';
      },
      controller: function(settings, $scope, $http, Formio) {
        $scope.nowrap = true;
        $scope.selectItems = [];
        var valueProp = $scope.component.valueProperty;
        $scope.getSelectItem = function(item) {
          if(!item) {
            return '';
          }
          if(settings.dataSrc === 'values') {
            return item.value;
          }
          return valueProp ? item[valueProp] : item;
        };

        switch(settings.dataSrc) {
          case 'values':
            $scope.selectItems = settings.data.values;
            break;
          case 'json':
            try {
              $scope.selectItems = angular.fromJson(settings.data.json);
            }
            catch (error) {
              $scope.selectItems = [];
            }
            break;
          case 'url':
            var options = {cache: true};
            if(settings.data.url.substr(0, 1) === '/') {
              settings.data.url = Formio.baseUrl + settings.data.url;
            }

            // Disable auth for outgoing requests.
            if (settings.data.url.indexOf(Formio.baseUrl) === -1) {
              options = {
                disableJWT: true,
                headers: {
                  Authorization: undefined,
                  Pragma: undefined,
                  'Cache-Control': undefined
                }
              };
            }
            $http.get(settings.data.url, options).success(function(data) {
              $scope.selectItems = data;
            });
            break;
          default:
            $scope.selectItems = [];
        }
      },
      settings: {
        input: true,
        tableView: true,
        label: '',
        key: '',
        placeholder: '',
        data: {
          values: [{
            value: 'value1',
            label: 'Value 1'
          },
          {
            value: 'value2',
            label: 'Value 2'
          }],
          json: '',
          url: ''
        },
        dataSrc: 'values',
        valueProperty: '',
        defaultValue: '',
        template: '<span>{{ item.label }}</span>',
        multiple: false,
        refresh: false,
        refreshDelay: 0,
        protected: false,
        unique: false,
        persistent: true,
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
    $templateCache.put('formio/components/select.html',
      '<label ng-if="component.label" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
      '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
      '<ui-select ui-select-required ng-model="data[component.key]" name="{{ component.key }}" ng-disabled="readOnly" ng-required="component.validate.required" id="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">' +
          '<formio-select-item template="component.template" item="$item || $select.selected" select="$select"></formio-select-item>' +
        '</ui-select-match>' +
        '<ui-select-choices repeat="getSelectItem(item) as item in selectItems | filter: $select.search">' +
          '<formio-select-item template="component.template" item="item" select="$select"></formio-select-item>' +
        '</ui-select-choices>' +
      '</ui-select>' +
      '<formio-errors></formio-errors>'
    );

    // Change the ui-select to ui-select multiple.
    $templateCache.put('formio/components/select-multiple.html',
      $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
    );
  }
]);
