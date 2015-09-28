'use strict'

module.exports = function() {

  // The default base url.
  var baseUrl = '';
  var domain;
  var noalias = false;
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

  // Return the provider interface.
  return {

    // Set the base URL for the formio API.
    setBaseUrl: function(url, _noalias) {
      noalias = _noalias;
      baseUrl = url;
    },
    setDomain: function(dom) {
      domain = dom;
    },
    $get: [
      '$http',
      '$q',
      'formioInterceptor',
      '$location',
      '$rootScope',
      function(
        $http,
        $q,
        formioInterceptor,
        $location,
        $rootScope
      ) {

        // The formio class.
        var Formio = function(path) {

          // Ensure we have an instance of Formio.
          if (!(this instanceof Formio)) { return new Formio(path); }
          if (!path) {
            // Allow user to create new projects if this was instantiated without
            // a url
            this.projectUrl = baseUrl + '/project';
            this.projectId = false;
            this.query = '';
            return;
          }

          // Initialize our variables.
          this.projectsUrl = '';
          this.projectUrl = '';
          this.projectId = '';
          this.formUrl = '';
          this.formsUrl = '';
          this.formId = '';
          this.submissionsUrl = '';
          this.submissionUrl = '';
          this.submissionId = '';
          this.actionsUrl = '';
          this.actionId = '';
          this.actionUrl = '';
          this.query = '';

          // Normalize to an absolute path.
          if ((path.indexOf('http') !== 0) && (path.indexOf('//') !== 0)) {
            baseUrl = baseUrl ? baseUrl : $location.absUrl().match(/http[s]?:\/\/api./)[0];
            path = baseUrl + path;
          }

          var hostparts = getUrlParts(path);
          var parts = [];
          var hostName = hostparts[1] + hostparts[2];
          path = hostparts.length > 3 ? hostparts[3] : '';
          var queryparts = path.split('?');
          if (queryparts.length > 1) {
            path = queryparts[0];
            this.query = '?' + queryparts[1];
          }

          // See if this is a form path.
          if ((path.search(/(^|\/)form($|\/)/) !== -1)) {

            // Register a specific path.
            var registerPath = function(name, base) {
              this[name + 'sUrl'] = base + '/' + name;
              var regex = new RegExp('\/' + name + '\/([^/]+)');
              if (path.search(regex) !== -1) {
                parts = path.match(regex);
                this[name + 'Url'] = parts ? (base + parts[0]) : '';
                this[name + 'Id'] = (parts.length > 1) ? parts[1] : '';
                base += parts[0];
              }
              return base;
            }.bind(this);

            // Register an array of items.
            var registerItems = function(items, base, staticBase) {
              for (var i in items) {
                var item = items[i];
                if (item instanceof Array) {
                  registerItems(item, base, true);
                }
                else {
                  var newBase = registerPath(item, base);
                  base = staticBase ? base : newBase;
                }
              }
            };

            registerItems(['project', 'form', ['submission', 'action']], hostName);
          }
          else {

            // This is an aliased url.
            this.projectUrl = hostName;
            this.projectId = (hostparts.length > 2) ? hostparts[2].split('.')[0] : '';
            var subRegEx = new RegExp('\/(submission|action)($|\/.*)');
            var subs = path.match(subRegEx);
            this.pathType = (subs && (subs.length > 1)) ? subs[1] : '';
            path = path.replace(subRegEx, '');
            path = path.replace(/\/$/, '');
            this.formsUrl = hostName + '/form';
            this.formUrl = hostName + path;
            this.formId = path.replace(/^\/+|\/+$/g, '');
            var items = ['submission', 'action'];
            for (var i in items) {
              var item = items[i];
              this[item + 'sUrl'] = hostName + path + '/' + item;
              if ((this.pathType === item) && (subs.length > 2) && subs[2]) {
                this[item + 'Id'] = subs[2].replace(/^\/+|\/+$/g, '');
                this[item + 'Url'] = hostName + path + subs[0];
              }
            }
          }
        };

        /**
         * When a request error occurs.
         * @param deferred
         */
        var requestError = function(deferred) {
          return function(error) {
            if (error === 'Unauthorized') {
              $rootScope.$broadcast('formio.unauthorized', error);
            }
            else if (error === 'Login Timeout') {
              $rootScope.$broadcast('formio.sessionExpired', error);
            }
            deferred.reject(error);
          };
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
              $http.get(url, query).success(deferred.resolve).error(requestError(deferred));
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
            return request(this[_url] + this.query, query);
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
            var method = this[_id] ? 'put' : 'post';
            _url = this[_id] ? this[_url] : this[type + 'sUrl'];
            $http[method](_url + this.query, data)
              .success(function (result) {
                cache = {};
                result.method = method;
                deferred.resolve(result);
              })
              .error(requestError(deferred));
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
            $http.delete(this[_url]).success(deferred.resolve).error(requestError(deferred));
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
        Formio.prototype.loadProject = _load('project');
        Formio.prototype.saveProject = _save('project');
        Formio.prototype.deleteProject = _delete('project');
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
        Formio.prototype.actionInfo = function(name) { return request(this.formUrl + '/actions/' + name); };

        // Static methods.
        Formio.loadProjects = function() { return request(baseUrl + '/project'); };
        Formio.clearCache = function() { cache = {}; };
        Formio.baseUrl = baseUrl;
        Formio.setUser = formioInterceptor.setUser.bind(formioInterceptor);
        Formio.getUser = formioInterceptor.getUser.bind(formioInterceptor);
        Formio.setToken = formioInterceptor.setToken.bind(formioInterceptor);
        Formio.getToken = formioInterceptor.getToken.bind(formioInterceptor);
        Formio.currentUser = function() {
          var deferred = $q.defer();
          var user = this.getUser();
          if (user) { deferred.resolve(angular.fromJson(user)); return deferred.promise; }
          var token = this.getToken();
          if (!token) { deferred.resolve(null); return deferred.promise; }
          $http.get(baseUrl + '/current').success(function(user) {
            this.setUser(user);
            deferred.resolve(user);
          }.bind(this)).error(requestError(deferred));
          return deferred.promise;
        };

        // Keep track of their logout callback.
        Formio.logout = function() {
          return $http.get(baseUrl + '/logout').finally(function() {
            this.setToken(null);
            this.setUser(null);
          }.bind(this));
        };
        Formio.fieldData = function(data, component) {
          if (!data) { return ''; }
          if (component.key.indexOf('.') !== -1) {
            var value = data;
            var parts = component.key.split('.');
            var key = '';
            for (var i = 0; i < parts.length; i++) {
              key = parts[i];

              // Handle nested resources
              if (value.hasOwnProperty('_id')) {
                value = value.data;
              }

              // Return if the key is not found on the value.
              if (!value.hasOwnProperty(key)) {
                return;
              }

              // Convert old single field data in submissions to multiple
              if(key === parts[parts.length - 1] && component.multiple && !Array.isArray(value[key])) {
                value[key] = [value[key]];
              }

              // Set the value of this key.
              value = value[key];
            }
            return value;
          }
          else {
            // Convert old single field data in submissions to multiple
            if(component.multiple && !Array.isArray(data[component.key])) {
              data[component.key] = [data[component.key]];
            }
            return data[component.key];
          }
        };

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};
