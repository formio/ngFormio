'use strict';
angular.module('formioApp').config([
    'formioComponentsProvider',
    'AppConfig',
    function (formioComponentsProvider, AppConfig) {
      formioComponentsProvider.register('resourcefields', {
        title: 'Resource Fields',
        template: 'formio/components/resourcefields.html',
        controller: ['$scope', '$http', 'FormioUtils', function ($scope, $http, FormioUtils) {
          var settings = $scope.component;
          $scope.resourceComponents = [];
          $scope.selectedResource = {};
          $scope.resourceSelect = {
            type: 'select',
            input: true,
            label: 'Select a resource',
            key: 'resource',
            placeholder: '',
            dataSrc: 'url',
            data: {url: settings.basePath + '?type=resource'},
            valueProperty: '_id',
            defaultValue: $scope.data.resource,
            template: '<span>{{ item.title }}</span>',
            multiple: false,
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true
            }
          };

          // Keep track of the available forms on the provided form.
          var formFields = [];

          // Fetch the form information.
          $http.get(AppConfig.apiBase + settings.basePath + '/' + settings.form).then(function(result) {
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
          $scope.$watch('selectedResource.resource', function(data) {
            if (!data) { return; }
            if (data !== $scope.data.resource) {
              $scope.data.resource = data;
              $scope.data.fields = {};
            }
            $scope.resourceComponents = [];
            $http.get(AppConfig.apiBase + settings.basePath + '/' + data).then(function(results) {
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

          // If a resource is already provided, then load the fields.
          if ($scope.data.resource) {
            $scope.selectedResource.resource = $scope.data.resource;
          }
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
  ]).run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache, FormioUtils) {
      $templateCache.put('formio/components/resourcefields.html', FormioUtils.fieldWrap(
        '<formio-component component="resourceSelect" data="selectedResource"></formio-component>' +
        '<fieldset ng-if="data.resource">' +
          '<legend>Resource Fields</legend>' +
          '<div class="well">Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource.</div>' +
          '<formio-component ng-repeat="resourceComponent in resourceComponents" component="resourceComponent" data="data.fields"></formio-component>' +
        '</fieldset>'
      ));
    }
  ]);
