'use strict';

var app = angular.module('formio', [
  'formio.components'
]);

/**
 * Create the formio provider.
 */
app.provider('Formio', function() {

  // The default base url.
  var baseUrl = 'https://api.form.io';

  // Return the provider interface.
  return {

    // Set the base URL for the formio API.
    setBaseUrl: function(url) {
      baseUrl = url;
    },
    $get: [
      '$http',
      '$q',
      function(
        $http,
        $q
      ) {

        // The formio class.
        var Formio = function(path) {

          // Ensure we have an instance of Formio.
          if (!(this instanceof Formio)) { return new Formio(path); }
          this.formUrl = '';
          this.subUrl = '';
          this.subId = '';
          if (path) {
            // Get the root URL.
            var url = baseUrl + path;

            // Get the Form URL.
            this.formUrl = url.replace(/\/submission\/.*/, '');

            // Get the submission URL.
            this.subUrl = '/submission';
            this.subId = '';
            var matches = url.match(/\/submission\/([^\/]+)/);
            if (matches && (matches.length > 0)) {
              this.subUrl = matches[0];
              this.subId = matches[1];
            }
          }
        };

        // Load the object.
        var request = function(url, query) {
          var deferred = $q.defer();
          if (url) {
            $http.get(url, query).success(deferred.resolve).error(deferred.reject);
          }
          return deferred.promise;
        };

        Formio.prototype.loadResources = function(query) {
          return request(baseUrl + '/resource', query);
        };
        Formio.prototype.loadForm = function(query) {
          return request(this.formUrl, query);
        };
        Formio.prototype.deleteForm = function() {
          var deferred = $q.defer();
          $http.delete(this.formUrl).success(deferred.resolve).error(deferred.reject);
          return deferred.promise;
        };
        Formio.prototype.loadSubmission = function(query) {
          return this.subId ? request(this.formUrl + this.subUrl, query) : request();
        };
        Formio.prototype.saveSubmission = function(submission) {
          var deferred = $q.defer();
          var method = this.subId ? 'put' : 'post';
          $http[method](this.formUrl + this.subUrl, {data: submission.data})
            .success(function(result) {
              result.method = method;
              deferred.resolve(result);
            })
            .error(deferred.reject);
          return deferred.promise;
        };
        Formio.prototype.deleteSubmission = function() {
          var deferred = $q.defer();
          if (this.subId) {
            $http.delete(this.formUrl + this.subUrl).success(deferred.resolve).error(deferred.reject);
          }
          return deferred.promise;
        };
        Formio.prototype.loadSubmissions = function(query) {
          var deferred = $q.defer();
          request(this.formUrl + this.subUrl, query).then(function(submissions) {
            deferred.resolve(submissions ? submissions : []);
          }, deferred.reject);
          return deferred.promise;
        };

        // Static methods.
        Formio.submissionData = function(data, component, onId) {
          if (!data) return '';
          if (component.key.indexOf('.') !== -1) {
            var value = data;
            var parts = component.key.split('.');
            var currentKey = '';
            var setValue = false;
            angular.forEach(parts, function(key) {
              if (!value.hasOwnProperty(key)) { return; }
              value = value[key];
              setValue = true;
              if (onId) {
                currentKey += key + '.';
                onId(currentKey, value);
              }
            });

            if (setValue) {
              data[component.key] = value;
              return value;
            }

            return '';
          }
          else {
            return data[component.key];
          }
        };

        // Return the formio interface.
        return Formio;
      }
    ]
  };
});

/**
 * Provides a way to regsiter the Formio scope.
 */
app.factory('FormioScope', [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      onError: function($scope) {
        return function(error) {
          if (error.name === 'ValidationError') {
            angular.element('#form-group-' + error.details[0].path).addClass('has-error');
            var message = 'ValidationError: ' + error.details[0].message;
            $scope.formioAlerts.push({
              type: 'danger',
              message: message
            });
          }
          else {
            $scope.formioAlerts.push({
              type: 'danger',
              message: error
            });
          }
          $scope.$emit('formError', error);
        };
      },
      register: function($scope, options) {
        var loader = null;
        $scope._form = $scope.form || {};
        $scope._submission = $scope.submission || {data: {}};
        $scope._submissions = $scope.submissions || [];

        // Allow sub components the ability to add new form components to the form.
        var addedData = {};
        $scope.$on('addFormComponent', function(event, component) {
          if (!addedData.hasOwnProperty(component.settings.key)) {
            addedData[component.settings.key] = true;
            var defaultComponent = formioComponents.components[component.type];
            $scope._form.components.push(angular.extend(defaultComponent.settings, component.settings));
          }
        });

        // Return the value and set the scope for the model input.
        $scope.submissionData = Formio.submissionData;

        if ($scope.src) {
          loader = new Formio($scope.src);
          if (options.form) {
            loader.loadForm().then(function(form) {
              $scope._form = form;
              $scope.$emit('formLoad', form);
            }, this.onError($scope));
          }
          if (options.submission) {
            loader.loadSubmission().then(function(submission) {
              $scope._submission = submission;
              $scope.$emit('submissionLoad', submission);
            }, this.onError($scope));
          }
          if (options.submissions) {
            loader.loadSubmissions().then(function(submissions) {
              $scope._submissions = submissions;
              $scope.$emit('submissionsLoad', submissions);
            }, this.onError($scope));
          }
        }
        else {

          // Emit the events if these objects are already loaded.
          if ($scope._form) {
            $scope.$emit('formLoad', $scope._form);
          }
          if ($scope._submission) {
            $scope.$emit('submissionLoad', $scope._submission);
          }
          if ($scope._submissions) {
            $scope.$emit('submissionsLoad', $scope._submissions);
          }
        }

        // Return the loader.
        return loader;
      }
    };
  }
]);

app.factory('FormioUtils', function() {
  return {
    fieldWrap: function(input) {
      input = input + '<formio-errors></formio-errors>';
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label" for="{{ component.key }}" class="control-label">{{ component.label }}</label>';
      var required = '<span ng-if="component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
          inputLabel + required +
          '<div class="input-group" ng-if="component.prefix || component.suffix">' +
            '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
            input +
            '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
          '</div>' +
          '<div ng-if="!component.prefix && !component.suffix">' + input + '</div>' +
        '</div>' +
        '<div ng-if="component.multiple"><table class="table table-bordered">' +
          inputLabel +
          '<tr ng-repeat="value in data[component.key] track by $index">' +
            '<td>' + required +
              '<div class="input-group" ng-if="component.prefix || component.suffix">' +
                '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
                multiInput +
                '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
              '</div>' +
              '<div ng-if="!component.prefix && !component.suffix">' + multiInput + '</div>' +
            '</td>' +
            '<td><a ng-click="removeFieldValue($index)" class="btn btn-danger"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> Add another</a></td>' +
          '</tr>' +
        '</table></div>';
      return template;
    }
  };
});

app.directive('formio', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=',
      form: '=',
      submission: '='
    },
    controller: [
      '$scope',
      'FormioScope',
      function(
        $scope,
        FormioScope
      ) {
        $scope.formioAlerts = [];
        var loader = FormioScope.register($scope, {
          form: true,
          submission: true
        });

        // Called when the form is submitted.
        $scope.onSubmit = function(isValid) {
          if (!isValid) { return; }
          if (loader) {
            loader.saveSubmission($scope._submission).then(function(submission) {
              var message = submission.method === 'put' ? 'updated' : 'created';
              $scope.formioAlerts.push({
                type: 'success',
                message: 'Submission was ' + message + '.'
              });
              $scope.$emit('formSubmission', submission);
            }, FormioScope.onError($scope));
          }
          else {
            $scope.$emit('formSubmission', $scope._submission);
          }
        };
      }
    ],
    templateUrl: 'formio.html'
  };
});

app.directive('formioDelete', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=',
      submission: '=',
      src: '='
    },
    templateUrl: 'formio-delete.html',
    controller: [
      '$scope',
      'FormioScope',
      function(
        $scope,
        FormioScope
      ) {
        $scope.formioAlerts = [];
        var loader = FormioScope.register($scope, {
          form: true,
          submission: true
        });
        var resourceName = loader.subId ? 'submission' : 'form';
        var methodName = 'delete' + resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
        $scope.resourceName = resourceName;
        $scope.onDelete = function() {
          if (typeof loader[methodName] === 'function') {
            loader[methodName]().then(function (data) {
              $scope.formioAlerts.push({
                type: 'success',
                message: 'Submission was deleted.'
              });
              $scope.$emit('delete', data);
            }, FormioScope.onError($scope));
          }
        };
        $scope.onCancel = function() {
          $scope.$emit('cancel');
        };
      }
    ]
  };
});

/**
 * Filter to flatten form components.
 */
app.filter('flattenComponents', function() {
  return function flatten(components, flattened) {
    flattened = flattened || {};
    angular.forEach(components, function(component) {
      if (component.columns && (component.columns.length > 0)) {
        angular.forEach(component.columns, function(column) {
          flatten(column, flattened);
        });
      }
      else if (component.components && (component.components.length > 0)) {
        flatten(component.components, flattened);
      }
      else if (component.input) {
        flattened[component.key] = component;
      }
    });
    return flattened;
  };
});

app.directive('formioErrors', function() {
  return {
    scope: false,
    restrict: 'E',
    templateUrl: 'formio/errors.html'
  };
});

app.directive('formioSubmissions', function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      src: '=',
      form: '=',
      submissions: '='
    },
    templateUrl: 'formio/submissions.html',
    controller: [
      '$scope',
      'FormioScope',
      function(
        $scope,
        FormioScope
      ) {
        FormioScope.register($scope, {
          form: true,
          submissions: true
        });
      }
    ]
  };
});

app.directive('formioComponent', [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      replace: true,
      restrict: 'E',
      scope: {
        component: '=',
        data: '='
      },
      templateUrl: 'formio/component.html',
      controller: [
        '$scope',
        '$http',
        function(
          $scope,
          $http
        ) {

          // Initialize the data.
          if (!$scope.data) {
            $scope.data = {};
          }

          // If this component references an object, we need to determine the
          // value by navigating through the object.
          if (
            $scope.component &&
            $scope.component.key &&
            $scope.component.key.indexOf('.') !== -1
          ) {
            $scope.$watch('data', function(data) {
              if (!data || angular.equals({}, data)) { return; }
              Formio.submissionData($scope.data, $scope.component, function(idPath, value) {
                if (value.hasOwnProperty('_id')) {
                  $scope.$emit('addFormComponent', {
                    type: 'hidden',
                    settings: {
                      key: idPath + '_id'
                    }
                  });
                }
              });
            });
          }

          // Get the settings.
          var component = formioComponents.components[$scope.component.type];

          // Set the component with the defaults from the component settings.
          angular.forEach(component.settings, function(value, key) {
            if (!$scope.component.hasOwnProperty(key)) {
              $scope.component[key] = value;
            }
          });

          // Add a new field value.
          $scope.addFieldValue = function() {
            $scope.data[$scope.component.key].push('');
          };

          // Remove a field value.
          $scope.removeFieldValue = function(index) {
            $scope.data[$scope.component.key].splice(index, 1);
          };

          // Set the template for the component.
          if (typeof component.template === 'function') {
            $scope.template = component.template($scope);
          }
          else {
            $scope.template = component.template;
          }

          // Establish a default for data.
          if ($scope.data && !$scope.data.hasOwnProperty($scope.component.key) && $scope.component.hasOwnProperty('defaultValue')) {
            $scope.data[$scope.component.key] = $scope.component.multiple ? [$scope.component.defaultValue] : $scope.component.defaultValue;
          }

          // If the component has a controller.
          if (component.controller) {
            component.controller($scope.component, $scope, $http, Formio);
          }
        }
      ]
    };
  }
]);
app.directive('formioElement', [
  '$compile',
  '$templateCache',
  function(
    $compile,
    $templateCache
  ) {
    return {
      scope: false,
      link: function(scope, element) {
        element.replaceWith($compile($templateCache.get(scope.template))(scope));
      }
    };
  }
]);

app.directive('formioInputMask', function() {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      if (attrs.formioInputMask) {
        element.mask(attrs.formioInputMask);
      }
    }
  };
});

app.run([
  '$templateCache',
  function($templateCache) {

    // The template for the formio forms.
    $templateCache.put('formio.html',
      '<form role="form" name="formioForm" ng-submit="onSubmit(formioForm.$valid)" novalidate>' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<formio-component ng-repeat="component in _form.components track by $index" component="component" data="_submission.data"></formio-component>' +
        '<button type="submit" class="btn btn-primary" ng-disabled="formioForm.$invalid">Submit</button>' +
      '</form>'
    );

    $templateCache.put('formio-delete.html', '' +
      '<form role="form">' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<h3>Are you sure you wish to delete the {{ resourceName }}?</h3>' +
        '<div class="btn-toolbar">' +
          '<button ng-click="onDelete()" class="btn btn-danger">Yes</button>' +
          '<button ng-click="onCancel()" class="btn btn-default">No</button>' +
        '</div>' +
      '</form>'
    );

    $templateCache.put('formio/submissions.html',
      '<table class="table">' +
        '<thead>' +
          '<tr>' +
            '<th ng-repeat="component in _form.components | flattenComponents">{{ component.label }}</th>' +
            '<th>Submitted</th>' +
            '<th>Updated</th>' +
            '<th>Operations</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<tr ng-repeat="submission in _submissions">' +
            '<td ng-repeat="component in _form.components | flattenComponents">{{ submissionData(submission.data, component) }}</td>' +
            '<td>{{ submission.created | amDateFormat:\'l, h:mm:ss a\' }}</td>' +
            '<td>{{ submission.modified | amDateFormat:\'l, h:mm:ss a\' }}</td>' +
            '<td>' +
              '<div class="button-group">' +
                '<a ng-click="$emit(\'submissionView\', submission)" class="btn btn-primary"><span class="glyphicon glyphicon-eye-open"></span></a>&nbsp;' +
                '<a ng-click="$emit(\'submissionEdit\', submission)" class="btn btn-default"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;' +
                '<a ng-click="$emit(\'submissionDelete\', submission)" class="btn btn-danger"><span class="glyphicon glyphicon-remove-circle"></span></a>' +
              '</div>' +
            '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>'
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      '<ng-form name="formioFieldForm">' +
        '<div class="form-group has-feedback" id="form-group-{{ component.key }}" ng-class="{\'has-error\': formioFieldForm[component.key].$invalid && !formioFieldForm[component.key].$pristine }">' +
          '<formio-element></formio-element>' +
        '</div>' +
      '</ng-form>'
    );

    $templateCache.put('formio/errors.html',
      '<div ng-show="formioFieldForm[component.key].$error && !formioFieldForm[component.key].$pristine">' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.email">{{ component.label }} must be a valid email.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.required">{{ component.label }} is required.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.number">{{ component.label }} must be a number.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.maxlength">{{ component.label }} must be shorter than {{ component.validate.maxLength + 1 }} characters.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.minlength">{{ component.label }} must be longer than {{ component.validate.minLength - 1 }} characters.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.min">{{ component.label }} must be higher than {{ component.validate.min - 1 }}.</p>' +
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.max">{{ component.label }} must be lower than {{ component.validate.max + 1 }}.</p>' +
      '</div>'
    );
  }
]);
