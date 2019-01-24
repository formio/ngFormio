module.exports = function() {
  // The formio class.
  var Formio = require('formiojs/Formio').default;

  // Return the provider interface.
  return {
    // Expose Formio configuration functions
    setBaseUrl: Formio.setBaseUrl,
    getBaseUrl: Formio.getBaseUrl,
    setApiUrl: Formio.setBaseUrl,
    getApiUrl: Formio.getBaseUrl,
    setAppUrl: Formio.setAppUrl,
    setProjectUrl: Formio.setProjectUrl,
    getAppUrl: Formio.getAppUrl,
    getProjectUrl: Formio.getProjectUrl,
    registerPlugin: Formio.registerPlugin,
    getPlugin: Formio.getPlugin,
    providers: Formio.providers,
    setDomain: function() {
      // Remove this?
    },

    $get: [
      '$rootScope',
      '$q',
      function(
        $rootScope,
        $q
      ) {
        var wrapQPromise = function(promise) {
          return $q.when(promise)
          .catch(function(error) {
            if (error === 'Unauthorized') {
              $rootScope.$broadcast('formio.unauthorized', error);
            }
            else if (error === 'Login Timeout') {
              $rootScope.$broadcast('formio.sessionExpired', error);
            }
            // Propagate error
            throw error;
          });
        };

        Formio.registerPlugin({
          priority: -100,
          // Wrap Formio.request's promises with $q so $apply gets called correctly.
          wrapRequestPromise: wrapQPromise,
          wrapStaticRequestPromise: wrapQPromise
        }, 'ngFormioPromiseWrapper');

        // Call a safe apply.
        var safeApply = function(fn) {
          var phase = $rootScope.$root.$$phase;
          if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
              fn();
            }
          } else {
            $rootScope.$apply(fn);
          }
        };

        // Broadcast offline events from $rootScope
        Formio.events.onAny(function() {
          var event = 'formio.' + this.event;
          var args = [].splice.call(arguments, 0);
          args.unshift(event);
          try {
            safeApply(function() {
              $rootScope.$broadcast.apply($rootScope, args);
            });
          }
          catch (err) {
            console.log(err);
          }
        });

        // Add ability to set the scope base url.
        Formio.setScopeBase = function($scope) {
          $scope.baseUrl = $scope.options ? $scope.options.baseUrl : '';
          if (!$scope.baseUrl && $scope.formio && $scope.formio.projectUrl) {
            $scope.baseUrl = $scope.formio.projectUrl;
          }
          if (!$scope.baseUrl) {
            $scope.baseUrl = Formio.getBaseUrl();
          }
          return $scope.baseUrl;
        };

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};
