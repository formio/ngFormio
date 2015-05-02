var app = angular.module('formio', []);

/**
 * Create the formio provider.
 */
app.provider('Formio', function() {

  // The default base url.
  var baseUrl = '';
  var rootUrl = '';
  var cache = {};

  /**
   * Returns parts of the URL that are important.
   * Indexex
   *  - 0: The full url
   *  - 1: The protocol
   *  - 2: The hostname
   *  - 3: The rest
   *
   * @param url
   * @returns {*}
   */
  var getUrlParts = function(url) {
    return url.match(/^(http[s]?:\/\/)([^/]+)($|\/.*)/);
  };

  /**
   * Get the root url to show all applications.
   */
  var getRootUrl = function() {
    if (rootUrl) { return rootUrl; }
    if (!baseUrl) { return ''; }
    var parts = getUrlParts(baseUrl);
    var domain = (parts.length > 2) ? parts[2].replace(/^[^.]+\./g, '') : '';
    rootUrl = parts[1] + domain;
    rootUrl += (parts.length > 3) ? parts[3] : '';
    return rootUrl;
  };

  // Return the provider interface.
  return {

    // Set the base URL for the formio API.
    setBaseUrl: function(url) {
      baseUrl = url;
    },
    $get: [
      '$http',
      '$q',
      'formioInterceptor',
      '$location',
      function(
        $http,
        $q,
        formioInterceptor,
        $location
      ) {

        // The formio class.
        var Formio = function(path) {

          // Ensure we have an instance of Formio.
          if (!(this instanceof Formio)) { return new Formio(path); }
          if (!path) { return; }

          // Initialize our variables.
          this.appUrl = '';
          this.appId = '';
          this.appId = '';
          this.formUrl = '';
          this.formsUrl = '';
          this.formId = '';
          this.submissionsUrl = '';
          this.submissionUrl = '';
          this.submissionId = '';
          this.actionsUrl = '';
          this.actionId = '';
          this.actionUrl = '';

          // Normalize to an absolute path.
          if (path.indexOf('http') !== 0) {
            baseUrl = baseUrl ? baseUrl : $location.absUrl().match(/http[s]?:\/\/[^/?]*/)[0] + '/app/api';
            path = baseUrl + path;
          }

          var hostparts = getUrlParts(path);
          var hostnames = (hostparts.length > 2) ? hostparts[2].split('.') : [];
          var subdomain = '';
          if (
            ((hostnames.length === 2) && (hostnames[1].indexOf('localhost') === 0)) || (hostnames.length >= 3)
          ) {
            subdomain = hostnames[0];
            this.appId = subdomain;
          }

          // Get the paths for this formio url.
          var subs = path.match(/\/(submission|action)\/?([^?]*)/);
          if (subs && subs.length > 1) {
            subs.shift();
          }

          // Remove the submissions and actions from the path.
          path = path.replace(/\/(submission|action).*/, '');
          var paths = [];

          // See if this url has a subdomain.
          if (subdomain) {

            // Get the paths.
            paths = path.match(/(http[s]?:\/\/.*app\/api)\/?([^?]*)?/);
            if (paths.length > 1) {
              paths.shift();
            }
          }
          else {
            var formpaths = path.match(/^http.*\/.*\/form\/?([^?]*)/);
            if (formpaths && formpaths.length > 1) {
              paths[1] = formpaths[1] ? 'form/' + formpaths[1] : '';
              paths[0] = paths[1] ? path.replace('/' + paths[1], '') : path;
            }
            else {

              // Assume this is an app url.
              paths[0] = path;
            }
          }

          if (paths.length > 0) {
            this.appUrl = (paths.length > 0) ? paths[0] : '';
            this.appId = true;
            this.formsUrl = this.appUrl ? (this.appUrl + '/form') : '';
            this.formId = (paths.length > 1) ? paths[1] : '';
            this.formUrl = this.appUrl ? (this.appUrl + '/' + this.formId) : '';
            this.pathType = (subs && (subs.length > 0)) ? subs[0] : '';
            angular.forEach(['submission', 'action'], function(item) {
              var index = item + 'sUrl';
              var itemId = item + 'Id';
              var itemUrl = item + 'Url';
              this[index] = this.formUrl ? (this.formUrl + '/' + item) : '';
              this[itemId] = (subs && (this.pathType === item) && (subs.length > 1)) ? subs[1] : '';
              this[itemUrl] = this[itemId] ? this[index] + '/' + this[itemId] : this[index];
            }.bind(this));
          }
        };

        /**
         * Perform a request GET request with caching abilities.
         *
         * @param url
         * @param query
         * @returns {*}
         */
        var request = function(url, query) {
          var deferred = $q.defer();
          if (!url) { return deferred.promise; }

          // Get the cached promise to save multiple loads.
          var cacheKey = url;
          cacheKey += query ? angular.toJson(query) : '';
          cacheKey = btoa(cacheKey);
          if (cache.hasOwnProperty(cacheKey)) {
            return cache[cacheKey];
          }
          else {

            // Set the cache, then send the request.
            cache[cacheKey] = deferred.promise;
            try {
              $http.get(url, query).success(deferred.resolve).error(deferred.reject);
            }
            catch (error) {
              deferred.reject(error.message);
            }
          }
          return deferred.promise;
        };

        /**
         * Load a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _load = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function(query) {
            if (!this[_id]) { return $q.defer().promise; }
            return request(this[_url], query);
          };
        };

        /**
         * Save a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _save = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function(data) {
            var deferred = $q.defer();
            if (!this[_url]) { return deferred.promise; }
            var method = this[_id] ? 'put' : 'post';
            $http[method](this[_url], data)
              .success(function (result) {
                cache = {};
                result.method = method;
                deferred.resolve(result);
              })
              .error(deferred.reject);
            return deferred.promise;
          };
        };

        /**
         * Delete a resource.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _delete = function(type) {
          var _id = type + 'Id';
          var _url = type + 'Url';
          return function() {
            var deferred = $q.defer();
            if (!this[_id]) { return deferred.promise; }
            cache = {};
            $http.delete(this[_url]).success(deferred.resolve).error(deferred.reject);
            return deferred.promise;
          };
        };

        /**
         * Resource index method.
         *
         * @param type
         * @returns {Function}
         * @private
         */
        var _index = function(type) {
          var _url = type + 'sUrl';
          return function(query) {
            return request(this[_url], query);
          };
        };

        // Define specific CRUD methods.
        Formio.prototype.loadApp = _load('app');
        Formio.prototype.saveApp = _save('app');
        Formio.prototype.deleteApp = _delete('app');
        Formio.prototype.loadForm = _load('form');
        Formio.prototype.saveForm = _save('form');
        Formio.prototype.deleteForm = _delete('form');
        Formio.prototype.loadForms = _index('form');
        Formio.prototype.loadSubmission = _load('submission');
        Formio.prototype.saveSubmission = _save('submission');
        Formio.prototype.deleteSubmission = _delete('submission');
        Formio.prototype.loadSubmissions = _index('submission');
        Formio.prototype.loadAction = _load('action');
        Formio.prototype.saveAction = _save('action');
        Formio.prototype.deleteAction = _delete('action');
        Formio.prototype.loadActions = _index('action');
        Formio.prototype.availableActions = function() { return request(this.formUrl + '/actions'); };

        // Static methods.
        Formio.loadApps = function() { return request(getRootUrl(baseUrl) + '/app'); };
        Formio.clearCache = function() { cache = {}; };
        Formio.baseUrl = baseUrl;
        Formio.setUser = function(user) {
          if (!user) { return localStorage.removeItem('formioUser'); }
          localStorage.setItem('formioUser', angular.toJson(user));
        };
        Formio.setToken = formioInterceptor.setToken.bind(formioInterceptor);
        Formio.getToken = formioInterceptor.getToken.bind(formioInterceptor);
        Formio.currentUser = function() {
          var deferred = $q.defer();
          var user = localStorage.getItem('formioUser');
          if (user) { deferred.resolve(angular.fromJson(user)); return deferred.promise; }
          var token = localStorage.getItem('formioToken');
          if (!token) { deferred.resolve(null); return deferred.promise; }
          $http.get(baseUrl + '/current').success(function(user) {
            this.setUser(user);
            deferred.resolve(user);
          }.bind(this)).error(deferred.reject);
          return deferred.promise;
        };
        Formio.logout= function() {
          var deferred = $q.defer();
          $http.get(baseUrl + '/logout').success(function() {
            this.setToken(null);
            this.setUser(null);
            deferred.resolve();
          }.bind(this)).error(function() {
            this.setToken(null);
            this.setUser(null);
            deferred.reject(new Error('Your session expired, please login again.'));
          }.bind(this));
          return deferred.promise;
        };
        Formio.submissionData = function(data, component, onId) {
          if (!data) { return ''; }
          if (component.protected) { return '--- PROTECTED ---'; }
          if (component.key.indexOf('.') !== -1) {
            var value = data;
            var parts = component.key.split('.');
            var currentKey = '';
            var setValue = false;
            angular.forEach(parts, function(key) {
              if ((key !== '_id') && value.hasOwnProperty('_id')) {
                value = value.data;
              }
              if (!value.hasOwnProperty(key)) {
                setValue = false;
                return;
              }
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
        angular.element('#formio-loading').show();

        // Used to set the form action.
        var getAction = function(action) {
          if (!action) { return ''; }
          if ($scope.action) { return ''; }
          if (action.substr(0, 1) === '/') {
            action = Formio.baseUrl + action;
          }
          return action;
        };

        // Set the action.
        $scope.action = getAction($scope.formAction);

        // Allow sub components the ability to add new form components to the form.
        var addedData = {};
        $scope.$on('addFormComponent', function(event, component) {
          if (!addedData.hasOwnProperty(component.settings.key)) {
            addedData[component.settings.key] = true;
            var defaultComponent = formioComponents.components[component.type];
            $scope._form.components.push(angular.extend(defaultComponent.settings, component.settings));
          }
        });

        // Set the action if they provided it in the form.
        $scope.$watch('form.action', function(value) {
          if (!value) { return; }
          var action = getAction(value);
          if (action) {
            $scope.action = action;
          }
        });

        // Return the value and set the scope for the model input.
        $scope.submissionData = Formio.submissionData;

        if ($scope.src) {
          loader = new Formio($scope.src);
          if (options.form) {
            loader.loadForm().then(function(form) {
              $scope._form = form;
              angular.element('#formio-loading').hide();
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

          $scope.formoLoaded = true;

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
      formAction: '=',
      form: '=',
      submission: '='
    },
    controller: [
      '$scope',
      '$http',
      'FormioScope',
      'Formio',
      function(
        $scope,
        $http,
        FormioScope,
        Formio
      ) {
        $scope.formioAlerts = [];
        $scope.formio = FormioScope.register($scope, {
          form: true,
          submission: true
        });

        // Called when the form is submitted.
        $scope.onSubmit = function(isValid) {
          if (!isValid) { return; }

          // Create a sanitized submission object.
          var submissionData = {data: {}};
          if ($scope._submission._id) {
            submissionData._id = $scope._submission._id;
          }
          if ($scope._submission.data._id) {
            submissionData._id = $scope._submission.data._id;
          }
          angular.forEach($scope._form.components, function(component) {
            if ($scope._submission.data.hasOwnProperty(component.key)) {
              submissionData.data[component.key] = $scope._submission.data[component.key];
            }
          });
          angular.forEach($scope._submission.data, function(value, key) {
            if (submissionData.data.hasOwnProperty(key) && !value.hasOwnProperty('_id')) {
              submissionData.data[key] = value;
            }
          });

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            $scope.formioAlerts.push({
              type: 'success',
              message: 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.'
            });

            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function (submission) {
              Formio.clearCache();
              onSubmitDone(method, submission);
            }).error(FormioScope.onError($scope));
          }

          // If they wish to submit to the default location.
          else if ($scope.formio) {
            $scope.formio.saveSubmission(submissionData).then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope));
          }
          else {
            $scope.$emit('formSubmission', submissionData);
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
      src: '=',
      formAction: '=',
      resourceName: '='
    },
    templateUrl: 'formio-delete.html',
    controller: [
      '$scope',
      'FormioScope',
      'Formio',
      '$http',
      function(
        $scope,
        FormioScope,
        Formio,
        $http
      ) {
        $scope.formioAlerts = [];
        var resourceName = 'resource';
        var resourceTitle = 'Resource';
        var methodName = '';
        var loader = FormioScope.register($scope, {
          form: true,
          submission: true
        });

        if (loader) {
          resourceName = loader.submissionId ? 'submission' : 'form';
          resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
          methodName = 'delete' + resourceTitle;
        }

        // Set the resource name
        $scope._resourceName = $scope.resourceName || resourceName;

        // Create delete capability.
        $scope.onDelete = function() {

          // Called when the delete is done.
          var onDeleteDone = function(data) {
            $scope.formioAlerts.push({
              type: 'success',
              message: resourceTitle + ' was deleted.'
            });
            Formio.clearCache();
            $scope.$emit('delete', data);
          };

          if ($scope.action) {
            $http.delete($scope.action).success(onDeleteDone).error(FormioScope.onError($scope));
          }
          else if (loader) {
            if (!methodName) { return; }
            if (typeof loader[methodName] !== 'function') { return; }
            loader[methodName]().then(onDeleteDone, FormioScope.onError($scope));
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

app.directive('customValidator', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }
      ctrl.$parsers.unshift(function(input) {
        var valid = true;
        if (input) {
          var custom = scope.component.validate.custom;
          custom = custom.replace(/({{\s+(.*)\s+}})/, function(match, $1, $2) {
            return scope.data[$2];
          });
          /* jshint evil: true */
          valid = eval(custom);
          ctrl.$setValidity('custom', (valid === true));
        }
        if (valid !== true) {
          scope.component.customError = valid;
        }
        return (valid === true) ? input : valid;
      });
    }
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
        data: '=',
        formio: '='
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

          // Allow component keys to look like "settings[username]"
          if ($scope.component.key.indexOf('[') !== -1) {
            var matches = $scope.component.key.match(/([^\[]+)\[([^]+)\]/);
            if ((matches.length === 3) && $scope.data.hasOwnProperty(matches[1])) {
              $scope.data = $scope.data[matches[1]];
              $scope.component.key = matches[2];
            }
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

app.factory('formioInterceptor', function() {
  var Interceptor = {
    token: '',
    setToken: function(token) {
      token = token || '';
      if (token === this.token) { return; }
      this.token = token;
      if (!token) { return localStorage.removeItem('formioToken'); }
      localStorage.setItem('formioToken', token);
    },
    getToken: function() {
      if (this.token) { return this.token; }
      var token = localStorage.getItem('formioToken') || '';
      this.token = token;
      return token;
    }
  };

  /**
   * Set the JWT token within the request.
   *
   * @type {function(this:{token: string, setToken: Function, getToken: Function})}
   */
  Interceptor.response = function(response) {
    var token = response.headers('x-jwt-token');
    if (token || (token === '')) { this.setToken(token); }
    return response;
  }.bind(Interceptor);

  /**
   * Set the token in the request headers.
   *
   * @type {function(this:{token: string, setToken: Function, getToken: Function})}
   */
  Interceptor.request = function(config) {
    var token = this.getToken();
    if (token) { config.headers['x-jwt-token'] = token; }
    return config;
  }.bind(Interceptor);
  return Interceptor;
});

app.config([
  '$httpProvider',
  function(
    $httpProvider
  ) {
    $httpProvider.interceptors.push('formioInterceptor');
  }
]);

app.run([
  '$templateCache',
  function($templateCache) {

    // The template for the formio forms.
    $templateCache.put('formio.html',
      '<form role="form" name="formioForm" ng-submit="onSubmit(formioForm.$valid)" novalidate>' +
        '<i id="formio-loading" style="font-size: 2em;" class="fa fa-spinner fa-pulse"></i>' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<formio-component ng-repeat="component in _form.components track by $index" component="component" data="_submission.data" formio="formio"></formio-component>' +
        '<button ng-show="_form.components.length" type="submit" class="btn btn-primary" ng-disabled="formioForm.$invalid">Submit</button>' +
      '</form>'
    );

    $templateCache.put('formio-delete.html', '' +
      '<form role="form">' +
        '<div ng-repeat="alert in formioAlerts" class="alert alert-{{ alert.type }}" role="alert">' +
          '{{ alert.message }}' +
        '</div>' +
        '<h3>Are you sure you wish to delete the {{ _resourceName }}?</h3>' +
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
              '<div class="button-group" style="display:flex;">' +
                '<a ng-click="$emit(\'submissionView\', submission)" class="btn btn-primary btn-xs"><span class="glyphicon glyphicon-eye-open"></span></a>&nbsp;' +
                '<a ng-click="$emit(\'submissionEdit\', submission)" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;' +
                '<a ng-click="$emit(\'submissionDelete\', submission)" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove-circle"></span></a>' +
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
        '<p class="help-block" ng-show="formioFieldForm[component.key].$error.custom">{{ component.customError }}</p>' +
      '</div>'
    );
  }
]);
