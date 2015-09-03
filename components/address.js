/*jshint camelcase: false */
app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('address', {
      title: 'Address',
      template: function($scope) {
        return $scope.component.multiple ? 'formio/components/address-multiple.html' : 'formio/components/address.html';
      },
      controller: function(settings, $scope, $http) {
        $scope.address = {};
        $scope.addresses = [];
        $scope.refreshAddress = function(address) {
          var params = {address: address, sensor: false};
          return $http.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            {
              disableJWT: true,
              params: params,
              headers: {
                Authorization: undefined,
                Pragma: undefined,
                'Cache-Control': undefined
              }
            }
          ).then(function(response) {
            $scope.addresses = response.data.results;
          });
        };
      },
      tableView: function(data) {
        return data ? data.formatted_address : '';
      },
      settings: {
        input: true,
        tableView: true,
        label: '',
        key: 'addressField',
        placeholder: '',
        multiple: false,
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
    $templateCache.put('formio/components/address.html',
      '<label ng-if="component.label" for="{{ component.key }}" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>' +
      '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>' +
      '<ui-select ng-model="data[component.key]" safe-multiple-to-single ng-disabled="readOnly" ng-required="component.validate.required" id="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>' +
        '<ui-select-choices repeat="address in addresses track by $index" refresh="refreshAddress($select.search)" refresh-delay="500">' +
          '<div ng-bind-html="address.formatted_address | highlight: $select.search"></div>' +
        '</ui-select-choices>' +
      '</ui-select>'
    );

    // Change the ui-select to ui-select multiple.
    $templateCache.put('formio/components/address-multiple.html',
      $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
    );
  }
]);
