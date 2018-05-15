var fs = require('fs');
module.exports = function(app) {
  /*jshint camelcase: false */
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('address', {
        title: 'Address',
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/address-multiple.html' : 'formio/components/address.html';
        },
        controller: [
          '$scope',
          '$http',
          '$timeout',
          function(
            $scope,
            $http,
            $timeout
          ) {
            if ($scope.options && $scope.options.building) return;
            var settings = $scope.component;

            if (settings.autofocus) {
              $timeout(function() {
                var inputs = angular.element('#form-group-' + settings.key).find('input');
                inputs[settings.multiple ? 0 : 1].focus();
              });
            }

            $scope.address = {};
            $scope.addresses = [];
            $scope.refreshAddress = function(address) {
              var params = {
                address: address,
                sensor: false
              };
              if (!address) {
                return;
              }
              if ($scope.component.map && $scope.component.map.region) {
                params.region = $scope.component.map.region;
              }
              if ($scope.component.map && $scope.component.map.key) {
                params.key = $scope.component.map.key;
              }
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
          }
        ],
        tableView: function(data) {
          return data ? data.formatted_address : '';
        },
        group: 'advanced',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          label: 'Address',
          key: 'address',
          placeholder: '',
          multiple: false,
          protected: false,
          clearOnHide: true,
          unique: false,
          persistent: true,
          hidden: false,
          map: {
            region: '',
            key: ''
          },
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
        fs.readFileSync(__dirname + '/../templates/components/address.html', 'utf8')
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/address-multiple.html',
        $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};
