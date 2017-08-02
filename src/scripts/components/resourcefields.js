'use strict';
angular.module('formioApp').config([
    'formioComponentsProvider',
    'AppConfig',
    function (formioComponentsProvider, AppConfig) {
      formioComponentsProvider.register('resourcefields', {
        title: 'Resource Fields',
        template: 'formio/components/resourcefields.html',
        controller: ['$scope', '$rootScope', '$http', 'FormioUtils', 'Formio', function ($scope, $rootScope, $http, FormioUtils, Formio) {
          var settings = $scope.component;
          var resourceExclude = '';
          $scope.resourceComponents = [];
          if ($rootScope.currentForm && $rootScope.currentForm._id) {
            resourceExclude = '&_id__ne=' + $rootScope.currentForm._id;
          }
          $scope.resourceSelect = {
            type: 'select',
            input: true,
            label: settings.title ? settings.title : 'Select a resource',
            key: 'resource',
            placeholder: settings.placeholder || '',
            dataSrc: 'url',
            data: {url: settings.basePath + '?type=resource' + resourceExclude},
            valueProperty: '_id',
            defaultValue: $scope.data.resource,
            template: '<span>{{ item.title }}</span>',
            multiple: false,
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: settings.hasOwnProperty('required') ? settings.required : true
            }
          };

          $scope.propertyField = {
            label: 'Resource Property',
            key: 'property',
            inputType: 'text',
            input: true,
            placeholder: 'Assign this resource to the following property',
            prefix: '',
            suffix: '',
            type: 'textfield',
            defaultValue: $scope.data.property,
            multiple: false
          };

          $scope.baseUrl = $scope.options.baseUrl || Formio.getBaseUrl();

          // Keep track of the available forms on the provided form.
          var formFields = [];

          // Fetch the form information.
          $http.get($scope.baseUrl + settings.basePath + '/' + settings.form).then(function(result) {
            FormioUtils.eachComponent(result.data.components, function(component) {
              if (component.type !== 'button') {
                formFields.push({
                  value: component.key,
                  label: component.label
                });
              }
            });
          });

          // Watch the selection of a new resource and set the resource field information.
          $scope.$watch('data.resource', function(data) {
            if (!data) { return; }
            $scope.data.fields = $scope.data.fields || {};
            $http.get($scope.baseUrl + settings.basePath + '/' + data).then(function(results) {
              $scope.resourceComponents = [];
              FormioUtils.eachComponent(results.data.components, function(component) {
                if (component.type !== 'button') {
                  $scope.resourceComponents.push({
                    type: 'select',
                    input: true,
                    label: component.label,
                    key: component.key,
                    dataSrc: 'values',
                    defaultValue: $scope.data.fields[component.key],
                    data: { values: formFields },
                    validate: {
                      required: component.validate ? (component.validate.required) : false
                    }
                  });
                }
              });
            });
          });
        }],
        settings: {
          input: true,
          tableView: false,
          builder: false,
          inputType: 'text',
          inputMask: '',
          label: '',
          key: 'textField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: '',
            customPrivate: false
          }
        }
      });
    }
  ])
  .directive('formioSettingsInfo', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        component: '=',
        formio: '=',
        data: '='
      },
      templateUrl: 'views/form/formio-settings-info.html'
    };
  })
  .run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache, FormioUtils) {
      $templateCache.put('formio/components/resourcefields.html', FormioUtils.fieldWrap(
        '<formio-component component="resourceSelect" data="data" options="options"></formio-component>' +
        '<formio-component ng-if="data.resource" component="propertyField" data="data" options="options"></formio-component>' +
        '<fieldset ng-if="data.resource">' +
          '<legend>Resource Fields</legend>' +
          '<div class="well">Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource.</div>' +
          '<formio-component ng-repeat="resourceComponent in resourceComponents" component="resourceComponent" data="data.fields"></formio-component>' +
        '</fieldset>'
      ));
    }
  ]);
