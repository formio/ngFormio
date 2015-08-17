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
    'ui.bootstrap',
    'ui.bootstrap.alert',
    'ui.bootstrap.tpls',
    'ui.select',
    'ui.bootstrap.datetimepicker',
    'angularMoment',
    'ngCkeditor',
    'formioApp.controllers',
    'formioApp.services'
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
      FormioProvider.setDomain(AppConfig.domain);
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
        .state('project', {
          url: '/project/:projectId',
          controller: 'ProjectController',
          templateUrl: 'views/project/project.html'
        })
        .state('createProject', {
          url: '/create/project',
          templateUrl: 'views/project/create.html',
          controller: 'ProjectCreateController'
        })
        .state('project.edit', {
          url: '/edit',
          parent: 'project',
          templateUrl: 'views/project/edit.html'
        })
        .state('project.settings', {
          url: '/settings',
          parent: 'project',
          templateUrl: 'views/project/settings.html',
          controller: 'ProjectSettingsController'
        })
        .state('project.settings.project', {
          url: '/project',
          parent: 'project.settings',
          templateUrl: 'views/project/project-settings.html'
        })
        .state('project.settings.email', {
          url: '/email',
          parent: 'project.settings',
          templateUrl: 'views/project/email/email.html'
        })
        .state('project.settings.roles', {
          abstract: true,
          url: '/roles',
          parent: 'project.settings',
          templateUrl: 'views/project/roles/roles.html'
        })
        .state('project.settings.roles.view', {
          url: '',
          parent: 'project.settings.roles',
          templateUrl: 'views/project/roles/view.html'
        })
        .state('project.settings.roles.edit', {
          url: '/:roleId/edit',
          parent: 'project.settings.roles',
          templateUrl: 'views/project/roles/edit.html',
          controller: 'RoleController'
        })
        .state('project.settings.roles.delete', {
          url: '/:roleId/delete',
          parent: 'project.settings.roles',
          templateUrl: 'views/project/roles/delete.html',
          controller: 'RoleController'
        })
        .state('project.settings.office365', {
          url: '/office365',
          parent: 'project.settings',
          templateUrl: 'views/project/office365/office365.html'
        })
        .state('project.delete', {
          url: '/delete',
          parent: 'project',
          templateUrl: 'views/project/delete.html',
          controller: 'ProjectDeleteController'
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
    function(
      $scope,
      $rootScope,
      Formio
    ) {
      $rootScope.activeSideBar = 'home';
      $rootScope.currentProject = null;
      $rootScope.currentForm = null;
      $scope.teams = [];
      $scope.teamsLoading = true;
      $scope.teamsUrl = $rootScope.teamForm + '/submission';
      $scope.$on('pagination:loadPage', function() {
        $scope.teamsLoading = false;
        angular.element('#team-loader').hide();
      });
      $scope.projects = {};
      $scope.projectsLoading = true;
      Formio.loadProjects().then(function(projects) {
        $scope.projectsLoading = false;
        angular.element('#projects-loader').hide();
        $scope.projects = projects;
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
    'AppConfig',
    '$location',
    '$window',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts,
      Formio,
      AppConfig,
      $location,
      $window
    ) {

      // Force SSL.
      if (AppConfig.forceSSL && $location.protocol() !== 'https') {
        $window.location.href = $location.absUrl().replace('http', 'https');
      }

      // Set the form.io forms in the root scope.
      $rootScope.userForm = AppConfig.userForm;
      $rootScope.userLoginForm = AppConfig.userLoginForm;
      $rootScope.userRegisterForm = AppConfig.userRegisterForm;
      $rootScope.teamForm = AppConfig.teamForm;

      // Start the tutorial.
      $rootScope.startTutorial = function() {
        $window.open(AppConfig.tutorial, 'formio-tutorial', 'height=640,width=960');
      };

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

      var authError = function() {
        $rootScope.currentApp = null;
        $rootScope.currentForm = null;
        $state.go('home');
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'You are not authorized to perform the requested operation.'
        });
      };

      var logoutError = function() {
        $rootScope.currentProject = null;
        $rootScope.currentForm = null;
        $state.go('auth.login');
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'Your session has expired. Please log in again.'
        });
      };

      // Catches error from expired/invalid session.
      $rootScope.$on('formio.unauthorized', authError);

      // Catches error from expired/invalid session.
      $rootScope.$on('formio.sessionExpired', logoutError);

      // Logout of form.io and go to login page.
      $rootScope.logout = function() {
        Formio.logout().then(function() {
          $rootScope.currentProject = null;
          $rootScope.currentForm = null;
          $state.go('auth.login');
        }).catch(logoutError);
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
      $rootScope.activeSideBar = 'projects';

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
