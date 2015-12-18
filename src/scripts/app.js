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
    'ui.router',
    'ui.bootstrap',
    'ui.bootstrap.alert',
    'ui.bootstrap.tpls',
    'ui.select',
    'ui.bootstrap.datetimepicker',
    'ui-notification',
    'angularMoment',
    'ngCkeditor',
    'formioApp.controllers',
    'formioApp.utils',
    'kendo.directives',
    'truncate',
    'ngFileUpload'
  ])
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    'FormioProvider',
    'AppConfig',
    function (
      $stateProvider,
      $urlRouterProvider,
      FormioProvider,
      AppConfig
    ) {
      // Set the base URL for our API.
      FormioProvider.setBaseUrl(AppConfig.apiBase);
      FormioProvider.setDomain(AppConfig.domain);

      $stateProvider
        .state('home', {
          url: '/?',
          templateUrl: 'views/home/home.html',
          controller: 'HomeController'
        })
        .state('auth', {
          url: '/auth',
          views: {
            '' : {
              templateUrl: 'views/user/auth.html'
            },
            'login@auth': {
              templateUrl: 'views/user/login.html',
              controller: 'UserLoginController'
            },
            'register@auth': {
              templateUrl: 'views/user/register.html',
              controller: 'UserRegisterController'
            }
          }
        })
        .state('auth-resetpass-send', {
          url: '/resetsend',
          templateUrl: 'views/user/resetpass/resetsend.html',
          controller: 'ResetPasswordSendController'
        })
        .state('auth-resetpass-send-done', {
          url: '/resetsend/done',
          templateUrl: 'views/user/resetpass/resetsend-done.html'
        })
        .state('auth-resetpass', {
          url: '/resetpass?x-jwt-token',
          templateUrl: 'views/user/resetpass/resetpass.html',
          controller: 'ResetPasswordController'
        })
        .state('auth-resetpass-done', {
          url: '/resetpass/done',
          templateUrl: 'views/user/resetpass/resetpass-done.html'
        })
        .state('profile', {
          abstract: true,
          url: '/profile',
          controller: 'ProfileController',
          templateUrl: 'views/user/profile/profile.html'
        })
        .state('profile.view', {
          url: '/view',
          parent: 'profile',
          controller: 'ProfileController',
          templateUrl: 'views/user/profile/profile-view.html'
        })
        .state('profile.edit', {
          url: '/edit',
          parent: 'profile',
          controller: 'ProfileController',
          templateUrl: 'views/user/profile/profile-edit.html'
        })
        .state('project', {
          abstract: true,
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
          templateUrl: 'views/project/edit.html'
        })
        .state('project.data', {
          url: '/data',
          templateUrl: 'views/data/index.html',
          controller: 'ProjectDataController'
        })
        .state('project.preview', {
          url: '/preview',
          templateUrl: 'views/project/preview.html',
          controller: [
            '$scope',
            '$sce',
            '$location',
            function(
              $scope,
              $sce,
              $location
            ) {
              $scope.previewUrl = '';
              $scope.repo = '';
              $scope.hasTemplate = true;
              $scope.$watch('currentProject', function(project) {
                if (!project.settings) { return; }
                if (!project.settings.preview) {
                  $scope.hasTemplate = false;
                  project.settings.preview = {
                    repo: 'https://github.com/formio/formio-app-template',
                    url: 'http://formio.github.io/formio-app-template/'
                  };
                }

                var url = project.settings.preview.url;
                url += '/?apiUrl=' + encodeURIComponent(AppConfig.apiBase);
                url += '&appUrl=' + encodeURIComponent($location.protocol() + '://' + project.name + '.' + AppConfig.serverHost);
                $scope.previewUrl = $sce.trustAsResourceUrl(url);
                $scope.repo = project.settings.preview.repo;
              });

            }
          ]
        })
        .state('project.api', {
          url: '/api',
          templateUrl: 'views/project/api/index.html',
          controller: 'ApiController'
        })
        .state('project.settings', {
          url: '/settings',
          templateUrl: 'views/project/settings.html',
          controller: 'ProjectSettingsController'
        })
        .state('project.settings.project', {
          url: '/project',
          templateUrl: 'views/project/project-settings.html'
        })
        .state('project.settings.plan', {
          url: '/plan',
          templateUrl: 'views/project/project-plan.html',
          controller: 'ProjectPlanController'
        })
        .state('project.settings.email', {
          url: '/email',
          templateUrl: 'views/project/email/email.html'
        })
        .state('project.settings.storage', {
          url: '/storage',
          parent: 'project.settings',
          templateUrl: 'views/project/storage/storage.html',
          controller: 'ProjectStorageController'
        })
        .state('project.settings.databases', {
          url: '/databases',
          templateUrl: 'views/project/databases/index.html'
        })
        .state('project.settings.oauth', {
          url: '/oauth',
          templateUrl: 'views/project/oauth/index.html'
        })
        .state('project.settings.roles', {
          abstract: true,
          url: '/roles',
          templateUrl: 'views/project/roles/roles.html'
        })
        .state('project.settings.roles.view', {
          url: '',
          templateUrl: 'views/project/roles/view.html'
        })
        .state('project.settings.roles.edit', {
          url: '/:roleId/edit',
          templateUrl: 'views/project/roles/edit.html',
          controller: 'RoleController'
        })
        .state('project.settings.roles.delete', {
          url: '/:roleId/delete',
          templateUrl: 'views/project/roles/delete.html',
          controller: 'RoleController'
        })
        .state('project.settings.teams', {
          abstract: true,
          url: '/teams',
          templateUrl: 'views/project/teams/teams.html'
        })
        .state('project.settings.teams.view', {
          url: '',
          controller: 'ProjectTeamViewController',
          templateUrl: 'views/project/teams/view.html'
        })
        .state('project.settings.teams.add', {
          url: '/add',
          controller: 'ProjectTeamEditController',
          templateUrl: 'views/project/teams/edit.html'
        })
        .state('project.settings.teams.edit', {
          url: '/:teamId/edit',
          controller: 'ProjectTeamEditController',
          templateUrl: 'views/project/teams/edit.html'
        })
        .state('project.settings.teams.delete', {
          url: '/:teamId/delete',
          controller: 'ProjectTeamDeleteController',
          templateUrl: 'views/project/teams/delete.html'
        })
        .state('project.settings.cors', {
          url: '/cors',
          templateUrl: 'views/project/cors/index.html'
        })
        .state('project.settings.office365', {
          url: '/office365',
          templateUrl: 'views/project/office365/office365.html'
        })
        .state('project.settings.hubspot', {
          url: '/hubspot',
          templateUrl: 'views/project/hubspot/hubspot.html'
        })
        .state('project.settings.export', {
          url: '/export',
          templateUrl: 'views/project/export.html'
        })
        .state('project.delete', {
          url: '/delete',
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
          controller: 'TeamViewController',
          templateUrl: 'views/team/view.html'
        })
        .state('team.edit', {
          url: '/edit',
          controller: 'TeamEditController',
          templateUrl: 'views/team/edit.html'
        })
        .state('team.delete', {
          url: '/delete',
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
    'FormioAlerts',
    'ProjectPlans',
    '$timeout',
    '$q',
    function(
      $scope,
      $rootScope,
      Formio,
      FormioAlerts,
      ProjectPlans,
      $timeout,
      $q
    ) {
      $rootScope.showHeader = true;
      $rootScope.activeSideBar = 'home';
      $rootScope.currentProject = null;
      $rootScope.currentForm = null;

      // Determine if the current users can make teams or is a team member.
      $scope.teamsEnabled = false;
      $scope.teamMember = false;

      $scope.teams = [];
      $scope.teamsLoading = true;
      var _teamsPromise = Formio.request($scope.appConfig.apiBase + '/team/all', 'GET').then(function(results) {
        $scope.teams = results;
        $scope.teamsLoading = false;

        // See if the current user is a member of any of the given teams.
        if (!$rootScope.user) {
          Formio.currentUser().then(function(user) {
            $rootScope.user = user;
            $scope.teamMember = _.any(results, function(team) {
              return ($rootScope.user && team.owner !== $rootScope.user._id) || false;
            });
          });
        }
        else {
          $scope.teamMember = _.any(results, function(team) {
            return ($rootScope.user && team.owner !== $rootScope.user._id) || false;
          });
        }
      });

      $scope.teamSupport = function(project) {
        return (project.plan === 'team' || project.plan === 'commercial');
      };

      $scope.projects = {};
      $scope.projectsLoading = true;
      // TODO: query for unlimited projects instead of this limit
      var _projectsPromise = Formio.loadProjects('?limit=9007199254740991&sort=-modified').then(function(projects) {
        $scope.projectsLoading = false;
        angular.element('#projects-loader').hide();
        $scope.projects = projects;
        $scope.teamsEnabled = _.any(projects, function(project) {
          project.plan = project.plan || '';
          return (project.plan === 'team' || project.plan === 'commercial');
        });
      }).catch(FormioAlerts.onError.bind(FormioAlerts));

      // Inject the projects teams into the model if available
      $q.all([_teamsPromise, _projectsPromise]).then(function() {
        $scope.projects = _.map($scope.projects, function(project) {
          project.teams = [];

          // Build the projects teams list if present in the permissions.
          _.forEach(project.access, function(permission) {
            if(_.startsWith(permission.type, 'team_')) {
              permission.roles = permission.roles || [];
              project.teams.push(permission.roles);
            }
          });

          // Filter and translate the teams for use on the ui.
          project.teams = _.uniq(_.flattenDeep(project.teams));
          project.teams = _.map(project.teams, function(team) {
            _.forEach($scope.teams, function(loadedTeam) {
              if(loadedTeam._id === team) {
                team = loadedTeam;
              }
            });

            return team;
          });

          return project;
        });
      });

      $scope.showIntroVideo = function() {
        $scope.introVideoVisible = true;
        // Need to expand video after it's visible to have transition effect
        $timeout(function() {
          $scope.introVideoExpanded = true;
        }, 50);
      };

      $scope.getPlanName = ProjectPlans.getPlanName.bind(ProjectPlans);
      $scope.getPlanLabel = ProjectPlans.getPlanLabel.bind(ProjectPlans);
      $scope.getAPICallsLimit = ProjectPlans.getAPICallsLimit.bind(ProjectPlans);
      $scope.getAPICallsPercent = ProjectPlans.getAPICallsPercent.bind(ProjectPlans);
      $scope.getProgressBarClass = ProjectPlans.getProgressBarClass.bind(ProjectPlans);
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
    'GoogleAnalytics',
    '$location',
    '$window',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts,
      Formio,
      AppConfig,
      GoogleAnalytics,
      $location,
      $window
    ) {

      // Force SSL.
      if (AppConfig.forceSSL && $location.protocol() !== 'https') {
        $window.location.href = $location.absUrl().replace('http', 'https');
      }

      // Set the configuration on the rootScope.
      $rootScope.appConfig = AppConfig;

      // Set the form.io forms in the root scope.
      $rootScope.userForm = AppConfig.userForm;
      $rootScope.userLoginForm = AppConfig.userLoginForm;
      $rootScope.userRegisterForm = AppConfig.userRegisterForm;
      $rootScope.userLinkGithubForm = AppConfig.userLinkGithubForm;
      $rootScope.teamForm = AppConfig.teamForm;
      $rootScope.feedbackForm = AppConfig.feedbackForm;
      $rootScope.resetPassForm = AppConfig.resetPassForm;
      $rootScope.planForm = AppConfig.planForm;

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

      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
      $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        $window.document.body.scrollTop = $window.document.documentElement.scrollTop = 0;
        $rootScope.showHeader = false;
        $rootScope.previousState = fromState.name;
        $rootScope.previousParams = fromParams;
        $rootScope.currentState = toState.name;
        GoogleAnalytics.sendPageView();
      });

      $rootScope.goToProject = function(project) {
        $state.go('project.resource.index', {projectId: project._id});
      };

      $rootScope.getPreviewURL = function(project) {
        if (!project.settings || !project.settings.preview) { return ''; }
        var url = 'http://help.form.io/project';
        url += '?project=' + encodeURIComponent(project.name);
        url += '&previewUrl=' + encodeURIComponent(project.settings.preview.url);
        url += '&host=' + encodeURIComponent(AppConfig.serverHost);
        url += '&protocol=' + encodeURIComponent($location.protocol());
        url += '&repo=' + encodeURIComponent(project.settings.preview.repo);
        return url;
      };

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
        if ($state.is('auth')) {
          $window.location.reload();
        }
        else {
          $state.go('auth');
        }
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
          $state.go('auth');
        }).catch(logoutError);
      };

      // Ensure they are logged.
      $rootScope.$on('$stateChangeStart', function(event, toState) {
        $rootScope.userToken = Formio.getToken();
        $rootScope.authenticated = !!$rootScope.userToken;
        if (toState.name.substr(0, 4) === 'auth') { return; }
        if(!$rootScope.authenticated) {
          event.preventDefault();
          $state.go('auth');
        }
      });

      $rootScope.$on('$stateChangeSuccess', function(event, state) {
        var parts = state.name.split('.');
        var classes = [];
        var currentClass = [];
        for (var i in parts) {
          currentClass.push(parts[i]);
          var className = currentClass.join('-');
          classes.push(className + '-page');
        }
        $rootScope.mainClass = classes.join(' ');
      });

      // Set the active sidebar.
      $rootScope.activeSideBar = 'projects';

      // Determine if a state is active.
      $rootScope.isActive = function(state) {
        return $state.current.name.indexOf(state) !== -1;
      };

      // Add back functionality to the template.
      $rootScope.back = function(defaultState, defaultParams) {
        if($rootScope.previousState) {
          $state.go($rootScope.previousState, $rootScope.previousParams);
        }
        else {
          $state.go(defaultState, defaultParams);
        }
      };
    }
  ])
  .factory('GoogleAnalytics', ['$window', '$state', function($window, $state) {
    // Recursively build the whole state url
    // This gets the url without substitutions, to send
    // to Google Analytics
    var getFullStateUrl = function(state) {
      if(state.parent) {
        return getFullStateUrl($state.get(state.parent)) + state.url;
      }
      return state.url;
    };

    return {
      sendPageView: function() {
        $window.ga('set', 'page', getFullStateUrl($state.current));
        $window.ga('send', 'pageview');
      },

      sendEvent: function(category, action, label, value) {
        $window.ga('send', 'event', category, action, label, value);
      }
    };
  }])
  .factory('ProjectPlans', ['$filter', function($filter) {
    return {
      plans: {
        basic: {
          name: 'Basic',
          labelStyle: 'label-info'
        },
        independent: {
          name: 'Independent',
          labelStyle: 'label-warning'
        },
        team: {
          name: 'Team Pro',
          labelStyle: 'label-success'
        },
        commercial: {
          name: 'Commercial',
          labelStyle: 'label-commercial'
        }
      },
      getPlanName: function(plan) {
        if(!this.plans[plan]) return '';
        return this.plans[plan].name;
      },
      getPlanLabel: function(plan) {
        if(!this.plans[plan]) return '';
        return this.plans[plan].labelStyle;
      },
      getAPICallsLimit: function(apiCalls) {
        if(!apiCalls || !apiCalls.limit) {
          return '∞';
        }
        return $filter('number')(apiCalls.limit);
      },
      getAPICallsPercent: function(apiCalls) {
        if(!apiCalls || !apiCalls.limit) {
          return '0%';
        }
        var percent = apiCalls.used / apiCalls.limit * 100;
        return (percent > 100) ? '100%' : percent + '%';
      },
      getProgressBarClass: function(apiCalls) {
        if(!apiCalls || !apiCalls.limit) return 'progress-bar-success';
        var percentUsed = apiCalls.used / apiCalls.limit;
        if(percentUsed >= 0.9) return 'progress-bar-danger';
        if(percentUsed >= 0.7) return 'progress-bar-warning';
        return 'progress-bar-success';
      }
    };
  }])
  .factory('TeamPermissions', function() {
    return {
      permissions: {
        team_read: {
          label: 'Read'
        },
        team_write: {
          label: 'Write'
        },
        team_admin: {
          label: 'Admin'
        }
      },
      getPermissionLabel: function(type) {
        if(!this.permissions[type]) return '';
        return this.permissions[type].label;
      }
    };
  });
