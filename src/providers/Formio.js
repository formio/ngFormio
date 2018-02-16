module.exports = function() {
  // The formio class.
  var Formio = require('formiojs');

  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: Formio.default.setBaseUrl,
    getBaseUrl: Formio.default.getBaseUrl,
    setApiUrl: Formio.default.setBaseUrl,
    getApiUrl: Formio.default.getBaseUrl,
    setAppUrl: Formio.default.setAppUrl,
    setProjectUrl: Formio.default.setProjectUrl,
    getAppUrl: Formio.default.getAppUrl,
    getProjectUrl: Formio.default.getProjectUrl,
    registerPlugin: Formio.default.registerPlugin,
    getPlugin: Formio.default.getPlugin,
    providers: Formio.default.providers,
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

        Formio.default.registerPlugin({
          priority: -100,
          // Wrap Formio.request's promises with $q so $apply gets called correctly.
          wrapRequestPromise: wrapQPromise,
          wrapStaticRequestPromise: wrapQPromise
        }, 'ngFormioPromiseWrapper');

        // Broadcast offline events from $rootScope
        Formio.default.events.onAny(function() {
          var event = 'formio.' + this.event;
          var args = [].splice.call(arguments, 0);
          args.unshift(event);
          $rootScope.$apply(function() {
            $rootScope.$broadcast.apply($rootScope, args);
          });
        });

        // Return the formio interface.
        return Formio.default;
      }
    ]
  };
};
