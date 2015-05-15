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
        .state('settings', {
          url: '/settings',
          templateUrl: 'views/user/settings.html'
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
        .state('createApp', {
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
          templateUrl: 'views/app/app-form.html',
          controller: 'AppEditController'
        })
        .state('app.delete', {
          url: '/delete',
          parent: 'app',
          templateUrl: 'views/app/delete.html',
          controller: 'AppDeleteController'
        })
        .state('team', {
          url: '/team/:teamId',
          controller: 'TeamController',
          templateUrl: 'views/team/team.html'
        })
        .state('createTeam', {
          url: '/create/team',
          controller: 'TeamCreateController',
          templateUrl: 'views/team/create.html'
        })
        .state('team.view', {
          url: '/view',
          parent: 'team',
          templateUrl: 'views/team/view.html'
        })
        .state('team.edit', {
          url: '/edit',
          parent: 'team',
          controller: 'TeamEditController',
          templateUrl: 'views/team/edit.html'
        })
        .state('team.delete', {
          url: '/delete',
          parent: 'team',
          controller: 'TeamDeleteController',
          templateUrl: 'views/team/delete.html'
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
    '$window',
    'AppConfig',
    function(
      $scope,
      $rootScope,
      Formio,
      $window,
      AppConfig
    ) {
      $rootScope.activeSideBar = 'home';
      $rootScope.currentApp = null;
      $scope.teams = [];
      $scope.teamsLoading = true;
      $scope.teamsUrl = $rootScope.teamForm + '/submission';
      $scope.$on('pagination:loadPage', function() {
        $scope.teamsLoading = false;
        angular.element('#team-loader').hide();
      });
      $scope.apps = {};
      $scope.appsLoading = true;
      Formio.loadApps().then(function(apps) {
        $scope.appsLoading = false;
        angular.element('#apps-loader').hide();
        $scope.apps = apps;
      });

      $scope.startTutorial = function() {
        $window.open('//' + AppConfig.baseUrl + '/start', 'formio-tutorial', 'height=640,width=960');
      };
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
    'AppConfig',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts,
      Formio,
      AppConfig
    ) {

      // urls for Form.io forms.
      $rootScope.userForm = 'http://formio.' + AppConfig.baseUrl + '/app/api/user';
      $rootScope.userLoginForm = 'http://formio.' + AppConfig.baseUrl + '/app/api/user/login';
      $rootScope.userRegisterForm = 'http://formio.' + AppConfig.baseUrl + '/app/api/user/register';
      $rootScope.teamForm = 'http://formio.' + AppConfig.baseUrl + '/app/api/team';

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

      // Trigger when a logout occurs.
      Formio.onLogout.then(function() {
        $state.go('auth.login');
      }, function() {
        $state.go('auth.login');
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'Your session has expired. Please log in again.'
        });
      });

      // Logout of form.io.
      $rootScope.logout = function() {
        Formio.logout();
      };

      // Ensure they are logged.
      $rootScope.$on('$stateChangeStart', function(event, toState) {
        $rootScope.authenticated = !!Formio.getToken();
        if (toState.name.substr(0, 4) === 'auth') { return; }
        if(!$rootScope.authenticated) {
          event.preventDefault();
          $state.go('auth.register');
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
