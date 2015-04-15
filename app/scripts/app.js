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
          templateUrl: 'views/home/home.html',
          controller: 'HomeController'
        })
        .state('app', {
          url: '/app/:appId',
          controller: 'AppController',
          templateUrl: 'views/app/app.html'
        })
        .state('app.create', {
          url: '/create/app',
          templateUrl: 'views/app/create.html',
          controller: 'AppCreateController'
        })
        .state('app.view', {
          url: '/view',
          parent: 'app',
          templateUrl: 'views/app/view.html'
        })
        .state('app.edit', {
          url: '/edit',
          parent: 'app',
          templateUrl: 'views/app/edit.html',
          controller: 'AppEditController'
        })
        .state('app.delete', {
          url: '/delete',
          parent: 'app',
          templateUrl: 'views/app/delete.html',
          controller: 'AppDeleteController'
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
  .controller('HomeController', [
    '$scope',
    'Restangular',
    '$rootScope',
    function(
      $scope,
      Restangular,
      $rootScope
    ) {
      $rootScope.activeSideBar = 'home';
      $rootScope.currentApp = null;
      $scope.apps = Restangular.all('app').getList().$object;
      $scope.users = Restangular.all('user').getList().$object;
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
