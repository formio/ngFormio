app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('resource', {
      title: 'Resource',
      template: function($scope) {
        return $scope.component.multiple ? 'formio/components/resource-multiple.html' : 'formio/components/resource.html';
      },
      controller: function(settings, $scope, $http, Formio) {
        $scope.selectItems = [];
        if (settings.resource) {
          var formio = new Formio($scope.formio.appUrl + '/form/' + settings.resource);
          var params = {};

          // If they wish to filter the results.
          if (settings.selectFields) {
            params.select = settings.selectFields;
          }

          if (settings.searchExpression && settings.searchFields) {
            var search = new RegExp(settings.searchExpression);
            $scope.refreshSubmissions = function(input) {
              if (!input) { return []; }
              var matches = input.match(search);
              var shouldRequest = false;
              if (matches && matches.length > 1) {
                angular.forEach(settings.searchFields, function(field, index) {
                  if ((matches.length > (index + 1)) && matches[index + 1]) {
                    params[field] = matches[index + 1];
                    shouldRequest = true;
                  }
                });
              }

              // Do not request unless we have parameters.
              if (!shouldRequest) { return; }
            };
          }
          else {

            // Load all submissions.
            $scope.refreshSubmissions = function() {};
          }

          // Load the submissions.
          formio.loadSubmissions({
            params: params
          }).then(function(submissions) {
            $scope.selectItems = submissions || [];
          });
        }
      },
      settings: {
        input: true,
        label: '',
        key: '',
        placeholder: '',
        resource: '',
        template: '<span>{{ item.data }}</span>',
        selectFields: '',
        searchExpression: '',
        searchFields: '',
        multiple: false,
        refresh: false,
        refreshDelay: 0
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/resource.html',
      '<label ng-if="component.label" for="{{ component.key }}">{{ component.label }}</label>' +
      '<ui-select ng-model="data[component.key]" id="{{ component.key }}" theme="bootstrap">' +
        '<ui-select-match placeholder="{{ component.placeholder }}">' +
          '<formio-select-item template="component.template" item="$item || $select.selected" select="$select"></formio-select-item>' +
        '</ui-select-match>' +
        '<ui-select-choices repeat="item in selectItems | filter: $select.search" refresh="refreshSubmissions($select.search)" refresh-delay="1000">' +
          '<formio-select-item template="component.template" item="item" select="$select"></formio-select-item>' +
        '</ui-select-choices>' +
      '</ui-select>'
    );

    // Change the ui-select to ui-select multiple.
    $templateCache.put('formio/components/resource-multiple.html',
      $templateCache.get('formio/components/resource.html').replace('<ui-select', '<ui-select multiple')
    );
  }
]);
