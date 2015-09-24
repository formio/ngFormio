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
          var hostnames = [];
          var subdomain = '';
          if(domain) {
            if(hostparts.length > 2) {
              var domainIndex = hostparts[2].indexOf(domain);
              if(domainIndex !== 0) {
                // Ignore "." between subdomains & domain
                domainIndex--;
              }
              hostnames = hostnames.concat(hostparts[2].substring(0, domainIndex).split('.'));
              hostnames = hostnames.concat(domain);
            }
            if (!noalias && hostnames.length >= 2) {
              subdomain = hostnames[0];
              this.projectId = subdomain;
            }
          }
          // Revert to old behavior if domain is not set
          else {
            hostnames = (hostparts.length > 2) ? hostparts[2].split('.') : [];
            if(!noalias &&
              (((hostnames.length === 2) && (hostnames[1].indexOf('localhost') === 0)) || (hostnames.length >= 3))
            ) {
              subdomain = hostnames[0];
              this.projectId = subdomain;
            }
          }

          // Get the paths for this formio url.
          var subs = path.match(/\/(submission|action)\/?([^?]*)/);
          if (subs && subs.length > 1) {
            subs.shift();
          }

          // Get the base path without submissions and actions.
          // Quick way to test... http://jsfiddle.net/travistidwell/wL49L766/4/
          var paths = [];
          var queryparts = path.split('?');
          this.query = (queryparts.length > 1) ? '?' + queryparts[1] : '';
          path = queryparts[0].replace(/\/(submission|action)($|\/.*)/, '');
          path = path.replace(/\/$/, '');

          // See if this url has a subdomain.
          if (subdomain && subdomain !== 'api') {
            // Get the paths.
            paths = path.match(/(http[s]?:\/\/?.*\..*?)\/([^?]*)?/);
            if (paths && paths.length > 1) {
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
              // Assume this is a project url.
              paths[0] = path;
            }
          }

          if (paths.length > 0) {
            this.projectUrl = paths[0];
            this.projectId = true;
            this.formsUrl = this.projectUrl ? (this.projectUrl + '/form') : '';
            this.formId = (paths.length > 1) ? paths[1] : '';
            this.formUrl = this.projectUrl ? (this.projectUrl + '/' + this.formId) : '';
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
            if (!this[_url]) { return deferred.promise; }
            var method = this[_id] ? 'put' : 'post';
            $http[method](this[_url] + this.query, data)
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
