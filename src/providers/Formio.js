'use strict'

module.exports = function() {

  // The formio class.
  var Formio = require('formiojs')();

  // Return the provider interface.
  return {

    // Set the base URL for the formio API.
    setBaseUrl: function(url, _noalias) {
      Formio.setBaseUrl(url, _noalias);
    },
    setDomain: function(dom) {
      // Remove this?
    },
    $get: [
      'formioInterceptor',
      '$rootScope',
      function(
        formioInterceptor,
        $rootScope
      ) {

        /**
         * When a request error occurs.
         * @param deferred
         */
        Formio.onRequestError = function(deferred) {
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

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};
