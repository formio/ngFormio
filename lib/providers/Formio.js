'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _formiojs = require('formiojs');

var app = angular.module('formio');
exports.default = app.provider('Formio', function () {
  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: _formiojs.Formio.setBaseUrl,
    getBaseUrl: _formiojs.Formio.getBaseUrl,
    setApiUrl: _formiojs.Formio.setBaseUrl,
    getApiUrl: _formiojs.Formio.getBaseUrl,
    setAppUrl: _formiojs.Formio.setAppUrl,
    setProjectUrl: _formiojs.Formio.setProjectUrl,
    getAppUrl: _formiojs.Formio.getAppUrl,
    getProjectUrl: _formiojs.Formio.getProjectUrl,
    registerPlugin: _formiojs.Formio.registerPlugin,
    getPlugin: _formiojs.Formio.getPlugin,
    providers: _formiojs.Formio.providers,
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

      _formiojs.Formio.registerPlugin({
        priority: -100,
        // Wrap Formio.request's promises with $q so $apply gets called correctly.
        wrapRequestPromise: wrapQPromise,
        wrapStaticRequestPromise: wrapQPromise
      }, 'ngFormioPromiseWrapper');

      // Broadcast offline events from $rootScope
      _formiojs.Formio.events.onAny(function () {
        var event = 'formio.' + this.event;
        var args = [].splice.call(arguments, 0);
        args.unshift(event);
        $rootScope.$apply(function () {
          $rootScope.$broadcast.apply($rootScope, args);
        });
      });

      // Return the formio interface.
      return _formiojs.Formio;
    }]
  };
});