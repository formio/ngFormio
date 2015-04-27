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
    'ngAnimate',
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
        .state('auth', {
          abstract: true,
          url: '/auth',
          templateUrl: 'views/user/auth.html'
        })
        .state('auth.login', {
          url: '/login',
          parent: 'auth',
          templateUrl: 'views/user/login.html',
          controller: 'UserLoginController'
        })
        .state('auth.register', {
          url: '/register',
          parent: 'auth',
          templateUrl: 'views/user/register.html',
          controller: 'UserRegisterController'
        })
        .state('profile', {
          abstract: true,
          url: '/profile',
          templateUrl: 'views/user/profile/profile.html'
        })
        .state('profile.view', {
          url: '/view',
          parent: 'profile',
          templateUrl: 'views/user/profile/profile-view.html'
        })
        .state('profile.edit', {
          url: '/edit',
          parent: 'profile',
          templateUrl: 'views/user/profile/profile-edit.html'
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
    '$rootScope',
    'Formio',
    function(
      $scope,
      $rootScope,
      Formio
    ) {
      $rootScope.activeSideBar = 'home';
      $rootScope.currentApp = null;
      $scope.apps = {};
      Formio.loadApps().then(function(apps) {
        $scope.apps = apps;
      });
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
    'Formio',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts,
      Formio
    ) {

      // urls for Form.io forms.
      $rootScope.formioAppUrl = '/app/553a40b9174a9d18bb566beb';
      $rootScope.userForm = '/app/553a40b9174a9d18bb566beb/resource/553a4114174a9d18bb566bec';
      $rootScope.userLoginForm = '/app/553a40b9174a9d18bb566beb/form/553a5799ab352f11dddb0f30';
      $rootScope.userRegisterForm = '/app/553a40b9174a9d18bb566beb/form/553a57eeab352f11dddb0f31';

      // Always redirect to login if they are not authenticated.
      $state.go('home');

      if (!$rootScope.user) {
        Formio.currentUser().then(function(user) {
          $rootScope.user = user;
        });
      }

      // Adding the alerts capability.
      $rootScope.alerts = [];
      $rootScope.closeAlert = function(index) {
        $rootScope.alerts.splice(index, 1);
      };

      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
      $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        $rootScope.alerts = FormioAlerts.getAlerts();
        $rootScope.previousState = fromState.name;
        $rootScope.previousParams = fromParams;
        $rootScope.currentState = toState.name;
      });

      // Logout of form.io.
      $rootScope.logout = function() {
        Formio.logout().then(function() {
          $state.go('auth.login');
        }, FormioAlerts.onError.bind(FormioAlerts));
      };

      // Ensure they are logged.
      $rootScope.$on('$stateChangeStart', function(event, toState) {
        $rootScope.authenticated = !!Formio.getToken();
        if (toState.name.substr(0, 4) === 'auth') { return; }
        if(!$rootScope.authenticated) {
          event.preventDefault();
          $state.go('auth.login');
        }
      });

      // Set the active sidebar.
      $rootScope.activeSideBar = 'apps';

      // Determine if a state is active.
      $rootScope.isActive = function(state) {
        return $state.current.name.indexOf(state) !== -1;
      };

      // Add back functionality to the template.
      $rootScope.back = function() {
        $state.go($rootScope.previousState, $rootScope.previousParams);
      };
    }
  ]);
