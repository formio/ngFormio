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
    'ui.bootstrap.tooltip',
    'ui.select',
    'ui.bootstrap.datetimepicker',
    'angularMoment',
    'ckeditor',
    'formioApp.controllers',
    'formioApp.utils',
    'kendo.directives',
    'truncate',
    'ngFileUpload',
    'ngDialog',
    'swaggerUi',
    'toastr'
  ])
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    '$locationProvider',
    'FormioProvider',
    'AppConfig',
    'toastrConfig',
    function(
      $stateProvider,
      $urlRouterProvider,
      $locationProvider,
      FormioProvider,
      AppConfig,
      toastrConfig
    ) {
      // Reset the hashPrefix to remove the "!".
      $locationProvider.hashPrefix('');

      // Allow HTML in the notifications.
      toastrConfig.allowHtml = true;

      // Set the base URL for our API.
      FormioProvider.setBaseUrl(AppConfig.apiBase);
      FormioProvider.setAppUrl(AppConfig.formioBase);
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
            '': {
              templateUrl: 'views/user/auth.html',
              controller: 'UserAuthController'
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
        .state('profile.payment', {
          url: '/payment',
          parent: 'profile',
          abstract: true,
          controller: 'ProfilePaymentController',
          templateUrl: 'views/user/profile/payment.html'
        })
        .state('profile.payment.view', {
          url: '/view',
          parent: 'profile.payment',
          templateUrl: 'views/user/profile/payment-view.html'
        })
        .state('profile.payment.edit', {
          url: '/edit',
          parent: 'profile.payment',
          templateUrl: 'views/user/profile/payment-edit.html'
        })
        .state('project', {
          abstract: true,
          url: '/project/:projectId',
          controller: 'ProjectController',
          templateUrl: 'views/project/project.html',
          params: {
            showWelcomeModal: false
          }
        })
        .state('project.overview', {
          url: '/overview',
          controller: 'ProjectOverviewController',
          templateUrl: 'views/project/overview.html',
          params: {
            graphType: 'Month'
          }
        })
        .state('createProject', {
          url: '/create/project',
          templateUrl: 'views/project/create.html',
          controller: 'ProjectCreateController'
        })
        .state('project.data', {
          url: '/data',
          templateUrl: 'views/project/data.html',
          controller: 'ProjectDataController',
          params: {
            graphType: 'Month'
          }
        })
        .state('project.formio', {
          url: '/formio',
          templateUrl: 'views/formio/index.html',
          controller: 'ProjectFormioController'
        })
        .state('project.build', {
          url: '/build',
          templateUrl: 'views/project/build.html',
          controller: 'ProjectBuildController'
        })
        .state('project.launch', {
          url: '',
          templateUrl: 'views/project/launch/index.html',
          controller: 'LaunchController'
        })
        .state('project.launch.form', {
          url: '/form',
          templateUrl: 'views/project/launch/form.html',
          controller: 'LaunchController'
        })
        .state('project.launch.preview', {
          url: '/preview',
          templateUrl: 'views/project/preview.html',
          controller: 'ProjectPreviewController'
        })
        .state('project.launch.local', {
          url: '/local',
          templateUrl: 'views/project/launch/local.html',
          controller: 'LaunchController'
        })
        .state('project.launch.app', {
          url: '/app',
          templateUrl: 'views/project/launch/app.html',
          controller: 'LaunchController'
        })
        .state('project.launch.cordova', {
          url: '/cordova',
          templateUrl: 'views/project/launch/cordova.html',
          controller: 'LaunchController'
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
        .state('project.settings.access', {
          url: '/access',
          parent: 'project.settings',
          templateUrl: 'views/project/access/access.html',
          controller: 'AccessController'
        })
        .state('project.settings.email', {
          url: '/email',
          parent: 'project.settings',
          templateUrl: 'views/project/email/email.html'
        })
        .state('project.settings.storage', {
          url: '/storage',
          parent: 'project.settings',
          templateUrl: 'views/project/storage/storage.html',
          controller: 'ProjectStorageController'
        })
        .state('project.settings.data', {
          url: '/data',
          templateUrl: 'views/project/data/index.html'
        })
        .state('project.settings.apiKeys', {
          url: '/apiKeys',
          templateUrl: 'views/project/apiKeys/index.html'
        })
        .state('project.settings.customjscss', {
          url: '/customjscss',
          templateUrl: 'views/project/customjscss/index.html'
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
  .factory('FormioProject', [
    '$http',
    '$q',
    'Formio',
    'FormioAlerts',
    'GoogleAnalytics',
    'AppConfig',
    function(
      $http,
      $q,
      Formio,
      FormioAlerts,
      GoogleAnalytics,
      AppConfig
    ) {
      return {
        createProject: function(project) {
          var deferred = $q.defer();
          var formio = new Formio();

          // Default all new projects to have cors set to '*'.
          if (!project.settings) {
            project.settings = {};
          }
          if (!project.settings.cors) {
            project.settings.cors = '*';
          }

          formio.saveProject(project).then(function(project) {
            FormioAlerts.addAlert({
              type: 'success',
              message: 'New Project created!'
            });
            GoogleAnalytics.sendEvent('Project', 'create', null, 1);
            deferred.resolve(project);
          }, function(error) {
            if (error.data && error.data.message && error.data.message.indexOf('duplicate key error index') !== -1) {
              error.data.errors.name = {
                path: 'name',
                message: 'Project domain already exists. Please pick a different domain.'
              };
            }
            FormioAlerts.onError(error);
            deferred.reject();
          });
          return deferred.promise;
        },
        loadTemplates: function() {
          var deferred = $q.defer();
          deferred.resolve(AppConfig.templates);
          return deferred.promise;
        }
      };
    }
  ])
  .controller('HomeController', [
    '$scope',
    '$state',
    '$rootScope',
    'Formio',
    'FormioAlerts',
    'FormioProject',
    'AppConfig',
    'ProjectPlans',
    'ProjectUpgradeDialog',
    '$timeout',
    '$q',
    function(
      $scope,
      $state,
      $rootScope,
      Formio,
      FormioAlerts,
      FormioProject,
      AppConfig,
      ProjectPlans,
      ProjectUpgradeDialog,
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
            $scope.teamMember = _.some(results, function(team) {
              return ($rootScope.user && team.owner !== $rootScope.user._id) || false;
            });
          });
        } else {
          $scope.teamMember = _.some(results, function(team) {
            return ($rootScope.user && team.owner !== $rootScope.user._id) || false;
          });
        }
      });

      $scope.teamSupport = function(project) {
        return (project.plan === 'team' || project.plan === 'commercial');
      };

      $scope.templates = [];
      FormioProject.loadTemplates().then(function(templates) {
        $scope.templates = templates;
      });

      $scope.submitted = false;
      $scope.createProject = function(template) {
        if (!$scope.submitted) {
          $scope.submitted = true;
          FormioProject.createProject(template).then(function(project) {
            $state.go('project.overview', {projectId: project._id});
          });
        }
      };

      $scope.projects = {};
      $scope.projectsLoaded = false;
      // TODO: query for unlimited projects instead of this limit
      var _projectsPromise = Formio.loadProjects('?limit=9007199254740991&sort=-modified')
        .then(function(projects) {
          $scope.projectsLoaded = true;
          angular.element('#projects-loader').hide();
          $scope.projects = projects;
          $scope.teamsEnabled = _.some(projects, function(project) {
            project.plan = project.plan || '';
            return (project.plan === 'team' || project.plan === 'commercial');
          });
        })
        .catch(FormioAlerts.onError.bind(FormioAlerts));

      // Inject the projects teams into the model if available
      $q.all([_teamsPromise, _projectsPromise]).then(function() {
        $scope.projects = _.map($scope.projects, function(project) {
          project.teams = [];

          // Build the projects teams list if present in the permissions.
          _.forEach(project.access, function(permission) {
            if (_.startsWith(permission.type, 'team_')) {
              permission.roles = permission.roles || [];
              project.teams.push(permission.roles);
            }
          });

          // Filter and translate the teams for use on the ui.
          project.teams = _.uniq(_.flattenDeep(project.teams));
          project.teams = _.map(project.teams, function(team) {
            _.forEach($scope.teams, function(loadedTeam) {
              if (loadedTeam._id === team) {
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

      $scope.showUpgradeDialog = ProjectUpgradeDialog.show.bind(ProjectUpgradeDialog);

      $rootScope.welcomeForceClose = false;
      $scope.closeWelcome = function() {
        $rootScope.welcomeForceClose = true;
      };
      $scope.showWelcome = function() {
        if ($rootScope.welcomeForceClose) {
          return false;
        }
        // Only show welcome message for users with 0 or 1 projects or users within the last day.
        if ($rootScope.user) {
          return (($scope.projectsLoaded && $scope.projects.length < 2) || ((new Date($rootScope.user.created).getTime() / 1000) + 86400 > (Date.now() / 1000)));
        }
        return true;
      };
    }

  ])
  .filter('trusted', [
    '$sce',
    function($sce) {
      return function(url) {
        return $sce.trustAsResourceUrl(url);
      };
    }
  ])
  .filter('capitalize', function() {
    return function(token) {
      return token.charAt(0).toUpperCase() + token.slice(1);
    };
  })
  .filter('timeSince', function() {
    return function(token) {
      var elapsed = (new Date().getTime() - new Date(token).getTime()) / 1000;

      var interval;
      interval = Math.floor(elapsed / 31536000);
      if (interval >= 1) {
        return interval + " year" + (interval > 1 ? 's' : '');
      }

      interval = Math.floor(elapsed / 2592000);
      if (interval >= 1){
        return interval + " month" + (interval > 1 ? 's' : '');
      }

      interval = Math.floor(elapsed / 86400);
      if (interval >= 1) {
        return interval + " day" + (interval > 1 ? 's' : '');
      }

      interval = Math.floor(elapsed / 3600);
      if (interval >= 1) {
        return interval + " hour" + (interval > 1 ? 's' : '');
      }

      interval = Math.floor(elapsed / 60);
      if (interval >= 1) {
        return interval + " minute" + (interval > 1 ? 's' : '');
      }

      return Math.floor(elapsed) + " second" + (elapsed > 1 ? 's' : '');
    };
  })
  .run([
    '$state',
    '$stateParams',
    '$rootScope',
    'FormioAlerts',
    'Formio',
    'AppConfig',
    'ProjectProgress',
    'GoogleAnalytics',
    '$location',
    '$window',
    '$http',
    '$timeout',
    function(
      $state,
      $stateParams,
      $rootScope,
      FormioAlerts,
      Formio,
      AppConfig,
      ProjectProgress,
      GoogleAnalytics,
      $location,
      $window,
      $http,
      $timeout
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
      $rootScope.apiBase = AppConfig.apiBase;
      $rootScope.apiProtocol = AppConfig.apiProtocol;
      $rootScope.apiServer = AppConfig.apiServer;

      $rootScope.projectPath = function(project) {
        var path = '';
        switch(AppConfig.pathType) {
          case 'Subdomains':
            if (project.hasOwnProperty('name')) {
              path = AppConfig.apiProtocol + '//' + project.name + '.' + AppConfig.apiServer;
            }
            else if (project.hasOwnProperty('_id')) {
              path = AppConfig.apiBase + '/project/' + project._id;
            }
            break;
          case 'Subdirectories':
            if (project.hasOwnProperty('name')) {
              path = AppConfig.apiBase + '/' + project.name;
            }
            else if (project.hasOwnProperty('_id')) {
              path = AppConfig.apiBase + '/project/' + project._id;
            }
            break;
          case 'ProjectId':
            path = AppConfig.apiBase + '/project/' + project._id;
            break;
        }
        return path;
      };

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

      $rootScope.isProjectOwner = function(project) {
        return $rootScope.user && $rootScope.user._id === project.owner;
      };

      // Adding the alerts capability.
      $rootScope.alerts = [];
      $rootScope.closeAlert = function(index) {
        $rootScope.alerts.splice(index, 1);
      };

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
        $state.go('project.overview', {
          projectId: project._id
        });
      };

      $rootScope.getPreviewURL = function(project) {
        if (!project.settings || !project.settings.preview) { return ''; }
        var url = 'https://help.form.io/project/';
        url += '?project=' + encodeURIComponent(project.name);
        url += '&previewUrl=' + encodeURIComponent(project.settings.preview.url);
        url += '&host=' + encodeURIComponent(AppConfig.serverHost);
        url += '&protocol=' + encodeURIComponent($location.protocol());
        url += '&repo=' + encodeURIComponent(project.settings.preview.repo);
        return url;
      };

      var authErrorCount = 0;
      var authError = _.throttle(function() {
        if (authErrorCount >= 3) {
          return;
        }

        // Attempt to confirm if the current user is denied access or logged out.
        $http.get(AppConfig.apiBase + '/current')
          .then(function(data) {
            // Fix resource select components - FA-773.
            // Fix issue with access denied for team_write users, making it impossible to use the ui - FA-837
            if (/^20\d{1}$/.test(data.status.toString())) {
              FormioAlerts.addAlert({
                type: 'danger',
                message: 'You are not authorized to view some data on this page.'
              });
              return;
            }

            $rootScope.currentApp = null;
            $rootScope.currentForm = null;
            $state.go('home');
            FormioAlerts.addAlert({
              type: 'danger',
              message: 'You are not authorized to perform the requested operation.'
            });
          })
          .catch(function(e) {
            authErrorCount += 1;
          });
      }, 1000);

      var logoutError = _.throttle(function() {
        $rootScope.currentProject = null;
        $rootScope.currentForm = null;
        if ($state.is('auth')) {
          var reloads = localStorage.getItem('reloads');
          if (reloads >= 3) {
            return;
          }
          reloads = reloads || 0;
          reloads += 1;
          localStorage.setItem('reloads', reloads);

          $timeout(function() {
            $window.location.reload();
          });
        } else {
          // Clear reloads and attempt to reload the page.
          localStorage.removeItem('reloads');
          $state.go('auth');
        }
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'Your session has expired. Please log in again.'
        });
      }, 1000);

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
        if (toState.name.substr(0, 4) === 'auth') {
          return;
        }
        if (!$rootScope.authenticated) {
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

      $rootScope.$watch('currentProject', function(newProject) {
        ProjectProgress.setProject(newProject);
      });

      // Set the active sidebar.
      $rootScope.activeSideBar = 'projects';

      // Determine if a state is active.
      $rootScope.isActive = function(state) {
        return $state.current.name.indexOf(state) !== -1;
      };

      // Add back functionality to the template.
      $rootScope.back = function(defaultState, defaultParams) {
        if ($rootScope.previousState) {
          $state.go($rootScope.previousState, $rootScope.previousParams);
        } else {
          $state.go(defaultState, defaultParams);
        }
      };

      // CKEditor whitelist
      // On approved elements allow:
      //   - Any attribute beginning with 'data-'
      //   - Any inline style
      //   - Any class name
      CKEDITOR.config.extraAllowedContent = '*[data-*]{*}(*)';
    }
  ])
  .factory('GoogleAnalytics', ['$window', '$state', function($window, $state) {
    // Recursively build the whole state url
    // This gets the url without substitutions, to send
    // to Google Analytics
    var getFullStateUrl = function(state) {
      if (state.parent) {
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
          order: 1,
          name: 'basic',
          title: 'Basic',
          labelStyle: 'label-info',
          priceDescription: 'Free'
        },
        independent: {
          order: 2,
          name: 'independent',
          title: 'Independent',
          labelStyle: 'label-warning',
          priceDescription: '$15/mo'
        },
        team: {
          order: 3,
          name: 'team',
          title: 'Team Pro',
          labelStyle: 'label-success',
          priceDescription: 'Starting at $100/mo'
        },
        commercial: {
          order: 4,
          name: 'commercial',
          title: 'Commercial',
          labelStyle: 'label-commercial',
          priceDescription: 'Starting at $250/mo per instance'
        }
      },
      getPlans: function() {
        return _(this.plans).values().sortBy('order').value();
      },
      getPlan: function(plan) {
        return this.plans[plan];
      },
      getPlanName: function(plan) {
        if (!this.plans[plan]) return '';
        return this.plans[plan].title;
      },
      getPlanLabel: function(plan) {
        if (!this.plans[plan]) return '';
        return this.plans[plan].labelStyle;
      },
      getAPICallsLimit: function(apiCalls) {
        if (!apiCalls || !apiCalls.limit) {
          return '∞';
        }
        return $filter('number')(apiCalls.limit);
      },
      getAPICallsPercent: function(apiCalls) {
        if (!apiCalls || !apiCalls.limit) {
          return '0%';
        }
        var percent = apiCalls.used / apiCalls.limit * 100;
        return (percent > 100) ? '100%' : percent + '%';
      },
      getProgressBarClass: function(apiCalls) {
        if (!apiCalls || !apiCalls.limit) return 'progress-bar-success';
        var percentUsed = apiCalls.used / apiCalls.limit;
        if (percentUsed >= 0.9) return 'progress-bar-danger';
        if (percentUsed >= 0.7) return 'progress-bar-warning';
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
        if (!this.permissions[type]) return '';
        return this.permissions[type].label;
      }
    };
  });
