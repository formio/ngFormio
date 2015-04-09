'use strict';

/**
 * @ngdoc overview
 * @name formioApp
 * @description
 * # formioApp
 *
 * Main module of the application.
 */
angular
  .module('formioApp', [
    'ngSanitize',
    'restangular',
    'ui.router',
    'ui.bootstrap.alert',
    'ui.bootstrap.tpls',
    'ui.select',
    'angularMoment',
    'formioApp.controllers',
    'formioApp.services',
    'formioApp.directives'
  ])
  .constant('AppConfig', {
    appBase: 'http://localhost:3000',
    apiBase: 'http://localhost:3000/api'
  })
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    'FormioProvider',
    'RestangularProvider',
    'AppConfig',
    function (
      $stateProvider,
      $urlRouterProvider,
      FormioProvider,
      RestangularProvider,
      AppConfig
    ) {

      // Set the base URL for our API.
      FormioProvider.setBaseUrl(AppConfig.apiBase);
      RestangularProvider.setBaseUrl(AppConfig.apiBase);

      $stateProvider
        .state('home', {
          url: '/?',
          templateUrl: 'views/home/home.html'
        })
        .state('appIndex', {
          url: '/app',
          templateUrl: 'views/app/index.html',
          controller: 'AppIndexController'
        })
        .state('userIndex', {
          url: '/user',
          templateUrl: 'views/user/index.html',
          controller: 'UserIndexController'
        })
        .state('importExport', {
          url: '/import-export',
          templateUrl: 'views/import/index.html',
          controller: 'ImportExportController'
        })
        .state('help', {
          url: '/help',
          templateUrl: 'views/help/index.html',
          controller: 'HelpIndexController'
        });

      // Otherwise go home.
      $urlRouterProvider.otherwise('/');
    }
  ])
  .filter('trusted', [
    '$sce',
    function ($sce) {
      return function(url) {
        return $sce.trustAsResourceUrl(url);
      };
    }
  ])
  .run([
    '$state',
    '$stateParams',
    '$rootScope',
    'FormioAlerts',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts
    ) {
      $state.go('home');

      // Adding the alerts capability.
      $rootScope.alerts = [];
      $rootScope.closeAlert = function(index) {
        $rootScope.alerts.splice(index, 1);
      };

      // Determins if the navigation is active.
      $rootScope.isActive = function() {
        var active = true;
        var nav = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
          if (nav.hasOwnProperty(arguments[i])) {
            nav = nav[arguments[i]];
          }
          else {
            active = false;
            break;
          }
        }
        return active;
      };

      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
      $rootScope.$on('$stateChangeSuccess', function(ev, toState, toParams, fromState, fromParams) {
        $rootScope.alerts = FormioAlerts.getAlerts();
        $rootScope.previousState = fromState.name;
        $rootScope.previousParams = fromParams;
        $rootScope.currentState = toState.name;
      });

      // Set the active sidebar.
      $rootScope.activeSideBar = 'apps';

      // Add back functionality to the template.
      $rootScope.back = function() {
        $state.go($rootScope.previousState, $rootScope.previousParams);
      };
    }
  ]);
