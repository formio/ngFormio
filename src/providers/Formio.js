module.exports = function() {

  // The formio class.
  var Formio = require('formiojs')();

  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: Formio.setBaseUrl,
    cacheOfflineProject: Formio.cacheOfflineProject,
    clearCache: Formio.clearCache,
    clearOfflineData: Formio.clearOfflineData,
    forceOffline: Formio.forceOffline,
    isForcedOffline: Formio.isForcedOffline,
    queueSubmissions: Formio.queueSubmissions,
    offline: Formio.offline,
    dequeueSubmissions: Formio.dequeueSubmissions,
    submissionQueueLength: Formio.submissionQueueLength,
    getNextQueuedSubmission: Formio.getNextQueuedSubmission,
    setNextQueuedSubmission: Formio.setNextQueuedSubmission,
    skipNextQueuedSubmission: Formio.skipNextQueuedSubmission,
    setDomain: function(dom) {
      // Remove this?
    },

    $get: [
      '$rootScope',
      '$q',
      function(
        $rootScope,
        $q
      ) {

        // Wrap Formio.request's promises with $q so $apply gets called correctly.
        var request = Formio.request;
        Formio.request = function() {
          return $q.when(request.apply(Formio, arguments))
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

        // Same with Formio.makeRequest.
        var makeRequest = Formio.prototype.makeRequest;
        Formio.prototype.makeRequest = function() {
          return $q.when(makeRequest.apply(this, arguments));
        };

        // Broadcast offline events from $rootScope
        ['queue', 'dequeue', 'requeue', 'formSubmission', 'formError', 'queueEmpty']
        .forEach(function(offlineEvent) {
          Formio.offline.on(offlineEvent, function() {
            var event = 'formio.offline.' + offlineEvent;
            var args = [].splice.call(arguments, 0);
            args = [event].concat(args);
            $rootScope.$apply(function() {
              $rootScope.$broadcast.apply($rootScope, args);
            });
          });
        });

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};
