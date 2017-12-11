'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _full = require('formiojs/full');

var app = angular.module('formio');
exports.default = app.provider('Formio', function () {
  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: _full.Formio.setBaseUrl,
    getBaseUrl: _full.Formio.getBaseUrl,
    setApiUrl: _full.Formio.setBaseUrl,
    getApiUrl: _full.Formio.getBaseUrl,
    setAppUrl: _full.Formio.setAppUrl,
    setProjectUrl: _full.Formio.setProjectUrl,
    getAppUrl: _full.Formio.getAppUrl,
    getProjectUrl: _full.Formio.getProjectUrl,
    registerPlugin: _full.Formio.registerPlugin,
    getPlugin: _full.Formio.getPlugin,
    providers: _full.Formio.providers,
    setDomain: function setDomain() {
      // Remove this?
    },

    $get: ['$rootScope', '$q', function ($rootScope, $q) {
      var wrapQPromise = function wrapQPromise(promise) {
        return $q.when(promise).catch(function (error) {
          if (error === 'Unauthorized') {
            $rootScope.$broadcast('formio.unauthorized', error);
          } else if (error === 'Login Timeout') {
            $rootScope.$broadcast('formio.sessionExpired', error);
          }
          // Propagate error
          throw error;
        });
      };

      _full.Formio.registerPlugin({
        priority: -100,
        // Wrap Formio.request's promises with $q so $apply gets called correctly.
        wrapRequestPromise: wrapQPromise,
        wrapStaticRequestPromise: wrapQPromise
      }, 'ngFormioPromiseWrapper');

      // Broadcast offline events from $rootScope
      _full.Formio.events.onAny(function () {
        var event = 'formio.' + this.event;
        var args = [].splice.call(arguments, 0);
        args.unshift(event);
        $rootScope.$apply(function () {
          $rootScope.$broadcast.apply($rootScope, args);
        });
      });

      // Return the formio interface.
      return _full.Formio;
    }]
  };
});