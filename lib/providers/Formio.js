"use strict";

require("core-js/modules/es.array.splice");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _formiojs = require("formiojs");

var app = angular.module('formio'); // Configure the formioInterceptor. to be used.

app.config(['$httpProvider', '$injector', function ($httpProvider, $injector) {
  if (!$httpProvider.defaults.headers.get) {
    $httpProvider.defaults.headers.get = {};
  } // Make sure that ngAnimate doesn't mess up loader.


  try {
    $injector.get('$animateProvider').classNameFilter(/^((?!(fa-spinner|glyphicon-spin)).)*$/);
  }
  /* eslint-disable no-empty */
  catch (err) {}
  /* eslint-enable no-empty */
  // Disable IE caching for GET requests.


  $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
  $httpProvider.defaults.headers.get.Pragma = 'no-cache';
  $httpProvider.interceptors.push('formioInterceptor');
}]);

var _default = app.provider('Formio', function () {
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
    setDomain: function setDomain() {// Remove this?
    },
    $get: ['$rootScope', '$q', function ($rootScope, $q) {
      var wrapQPromise = function wrapQPromise(promise) {
        return $q.when(promise).catch(function (error) {
          if (error === 'Unauthorized') {
            $rootScope.$broadcast('formio.unauthorized', error);
          } else if (error === 'Login Timeout') {
            $rootScope.$broadcast('formio.sessionExpired', error);
          } // Propagate error


          throw error;
        });
      };

      _formiojs.Formio.registerPlugin({
        priority: -100,
        // Wrap Formio.request's promises with $q so $apply gets called correctly.
        wrapRequestPromise: wrapQPromise,
        wrapStaticRequestPromise: wrapQPromise
      }, 'ngFormioPromiseWrapper'); // Call a safe apply.


      var safeApply = function safeApply(fn) {
        var phase = $rootScope.$root.$$phase;

        if (phase == '$apply' || phase == '$digest') {
          if (fn && typeof fn === 'function') {
            fn();
          }
        } else {
          $rootScope.$apply(fn);
        }
      }; // Broadcast offline events from $rootScope


      _formiojs.Formio.events.onAny(function () {
        var event = 'formio.' + this.event;
        var args = [].splice.call(arguments, 0);
        args.unshift(event);

        try {
          safeApply(function () {
            $rootScope.$broadcast.apply($rootScope, args);
          });
        } catch (err) {
          console.log(err);
        }
      }); // Return the formio interface.


      return _formiojs.Formio;
    }]
  };
});

exports.default = _default;