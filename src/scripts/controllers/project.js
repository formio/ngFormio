'use strict';
import semver from 'semver';
import DOMPurify from "dompurify";

/* globals NumberAbbreviate, Chartist, localStorage, Blob */

// loadedFiles is used to prevent double loading files on each session.
var loadedFiles = [];

var app = angular.module('formioApp.controllers.project', ['angular-chartist']);

const EVERYONE_ROLE = {_id: '000000000000000000000000', title: 'Everyone', description: 'A role for all Users'};

/*
* Prevents user inputting non-alphanumeric characters or starting the domain with a hyphen.
* Also automatically lowercases the domain.
* Having hyphens at the end is allowed (else user can't type hyphens)
* but should be stripped on submit.
*/
app.directive('validSubdomain', function(){
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var invalidRegex = /[^0-9a-z\-]|^\-/g;
      ngModel.$parsers.push(function (inputValue) {
        var transformedInput = inputValue.toLowerCase().replace(invalidRegex, '');
        if (transformedInput !== inputValue) {
          ngModel.$setViewValue(transformedInput);
          ngModel.$render();
        }
        return transformedInput;
     });
    }
  };
});

/*
* Adds an async validator to check a URL for uniqueness
* Options:
*   unique-checker="/some/formio/endpoint" (required, url to POST)
*   unique-checker-param="nameOfRequestParam" (name of param in request)
*   unique-checker-result-prop="nameOfResultProp" (name of property in result to check)
*/
app.directive('uniqueChecker', ['$http', '$q', 'Formio', function($http, $q, Formio){
  return {
    scope: {
      url: '@uniqueChecker',
      param: '@uniqueCheckerParam',
      resultProp: '@uniqueCheckerResultProp'
    },
    require: 'ngModel',
    restrict: 'A',
    link: function($scope, el, attrs, ngModel) {
      var original = '';
      ngModel.$asyncValidators.unique = function(modelValue, viewValue) {
        var value = modelValue || viewValue;
        if (!original && value) {
          original = value;
        }
        if (original && original === value) {
          var deferred = $q.defer();
          deferred.resolve();
          return deferred.promise;
        }

        $scope.param = $scope.param || 'name';
        $scope.resultProp = $scope.resultProp || 'available';
        var req = {};
        req[$scope.param] = value;

        if(!value) {
          return $q.reject();
        }

        return $http.post($scope.url, req)
          .then(function(response) {
            if(!response.data.available) {
              return $q.reject('unavailable');
            }
            return true;
          });
      };
    }
  };
}]);

app.directive('upgradeWarning', function() {
  return {
    restrict: 'E',
    templateUrl: 'views/project/upgradeWarning.html',
    controller: [
      '$scope',
      '$attrs',
      function(
        $scope,
        $attrs
      ) {
        $scope.warning = $attrs.warning;
        $scope.projectSettingsVisible = function() {
          return ($scope.highestRole === 'owner' || $scope.highestRole === 'team_admin');
        };
      }
    ]
  };
});

app.controller('ProjectCreateController', [
  '$scope',
  '$rootScope',
  '$state',
  'FormioAlerts',
  'Formio',
  'FormioProject',
  'ProjectFrameworks',
  'ngDialog',
  function(
    $scope,
    $rootScope,
    $state,
    FormioAlerts,
    Formio,
    FormioProject,
    ProjectFrameworks,
    ngDialog
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.isBusy = false;

    $scope.createType = 'Project';
    $scope.projectType = 'Project';

    $scope.frameworks = _.filter(ProjectFrameworks, function(item) {return !item.disabled;});

    $scope.project = {};

    if ($scope.selectedFramework) {
      $scope.project.framework = $scope.selectedFramework.name;
      $scope.hideFrameworks = true;
    }
    else {
      $scope.selectedFramework = {
        title: 'Custom'
      };
      $scope.project.framework = $scope.frameworks[0].name;
    }

    $scope.loadTemplate = function() {
      var input = angular.element(this).get(0);
      if (!input || input.length === 0) {
        return;
      }
      var template = input.files[0];

      // FOR-107 - Fix for safari where FileReader isnt a function.
      if (typeof window.FileReader !== 'function' && typeof window.FileReader !== 'object') {
        return;
      }

      if (!template) {
        return;
      }

      // Read the file.
      var reader = new FileReader();
      reader.onload = function(e) {
        $scope.project.template = JSON.parse(e.target.result);
        $scope.hasTemplate = true;
        $scope.$apply();
      };
      reader.readAsText(template);
    };

    $scope.removeTemplate = function() {
      delete $scope.project.template;
      $scope.hasTemplate = false;
    };

    $scope.saveProject = function() {
      // Debounce.
      if ($scope.isBusy) {
        return;
      }
      $scope.isBusy = true;
      FormioProject.createProject($scope.project).then(function(project) {
        $scope.isBusy = false;
        // Reset tour and go directly to it.
        localStorage.removeItem('stepFlowCurrentParentStep');
        localStorage.removeItem('stepFlowCurrentChildStep');
        ngDialog.close();
        $state.go('project.tour', {projectId: project._id});
      }).catch((err) => {
        $scope.isBusy = false;
        throw err;
      });
    };
  }
]);

app.controller('ProjectCreateEnvironmentController', [
  '$scope',
  '$state',
  'AppConfig',
  'Formio',
  'FormioProject',
  'FormioAlerts',
  'PrimaryProject',
  function(
    $scope,
    $state,
    AppConfig,
    Formio,
    FormioProject,
    FormioAlerts,
    PrimaryProject
  ) {
    $scope.environmentTypes = [
      {
        key: 'hosted',
        label: 'Hosted'
      },
      {
        key: 'onPremise',
        label: 'On Premise'
      }
    ];
    $scope.createType = 'Stage';

    $scope.currentProject = {};
    $scope.primaryProjectPromise.then(function(primaryProject) {
      var parentProject = $scope.tenantProject ? $scope.tenantProject : primaryProject;
      $scope.currentProject = {
        title: '',
        type: 'stage',
        project: parentProject._id
      };
      $scope.$watch('currentProject.title', function(newTitle) {
        $scope.currentProject.name = newTitle.replace(/\W/g, '').toLowerCase() + '-' + parentProject.name;
      });
    });

    $scope.isBusy = false;

    $scope.saveProject = function() {
      // Debounce.
      if ($scope.isBusy) {
        return;
      }
      $scope.isBusy = true;
      FormioProject.createEnvironment($scope.currentProject)
        .then(function(project) {
          PrimaryProject.clear();
          $scope.isBusy = false;
          $state.go('project.overview', {projectId: project._id});
        })
        .catch(FormioAlerts.onError.bind(FormioAlerts))
        .catch(function() {$scope.isBusy = false;});
    };
  }
]);

app.controller('ProjectController', [
  '$scope',
  '$rootScope',
  '$stateParams',
  'Formio',
  'FormioAlerts',
  '$state',
  'AppConfig',
  'ProjectPlans',
  '$http',
  '$q',
  'GoogleAnalytics',
  'RemoteTokens',
  'PrimaryProject',
  'PDFServer',
  'LicenseKeyHelper',
  function(
    $scope,
    $rootScope,
    $stateParams,
    Formio,
    FormioAlerts,
    $state,
    AppConfig,
    ProjectPlans,
    $http,
    $q,
    GoogleAnalytics,
    RemoteTokens,
    PrimaryProject,
    PDFServer,
    LicenseKeyHelper
  ) {
    // Load in existing primary project scope.
    $scope.status = {
      save: 'pristine'
    };
    PrimaryProject.get($scope);

    $scope.currentSection = {};
    $rootScope.activeSideBar = 'projects';
    $rootScope.noBreadcrumb = false;

    $scope.token = Formio.getToken();
    $scope.resourcesLoading = true;
    $scope.projectsLoaded = false;
    $scope.resources = [];
    $scope.$on('pagination:loadPage', function(status) {
      var formType = status.targetScope.$parent.formType;
      $scope[formType + 'sLoading'] = false;
      angular.element('#' + formType + '-loader').hide();
    });
    $scope.forms = [];
    Formio.setBaseUrl(AppConfig.apiBase);
    Formio.setProjectUrl(AppConfig.formioBase);
    $scope.formio = new Formio('/project/' + $stateParams.projectId);
    $scope.localFormio = $scope.formio;
    $scope.currentProject = {_id: $stateParams.projectId, access: []};
    $scope.projectUrl = '';
    $scope.unsecurePortal = 'http://' + window.location.host;

    $scope.rolesLoading = true;
    $scope.loadRoles = function() {
      return $scope.loadProjectPromise.then(function() {
        return $scope.highestRoleLoaded.then(function() {
          if ($scope.projectPermissions.access) {
            return $http.get($scope.formio.projectUrl + '/role?limit=1000').then(function(result) {
              $scope.currentProjectRoles = result.data;
              // Add Everyone role.
              $scope.currentProjectRoles.push(EVERYONE_ROLE);
              $scope.rolesLoading = false;
              return $scope.currentProjectRoles;
            });
          }
          return [];
        });
      });
    };

    $scope.projectModified = function(project) {
      if (project.lastDeploy) {
        return new Date(project.modified) - new Date(project.lastDeploy) > 200;
      }
      return false;
    };

    $scope.minPlan = function(plan, project) {
      var plans = ['basic', 'independent', 'team', 'commercial', 'trial'];
      var checkProject = project || $scope.primaryProject || { plan: 'none' };
      return plans.indexOf(checkProject.plan) >= plans.indexOf(plan);
    };

    $scope._saveProject = function(project, formio) {
      if (!project._id) { return FormioAlerts.onError(new Error('No Project found.')); }
      if ($scope.status.save === 'saving') {
        return;
      }

      // If the remote project name or title changes, be sure to update the link as well.
      if(($scope.localProject.hasOwnProperty('remote') &&
          $scope.localProject.remote &&
        $scope.localProject.remote.hasOwnProperty('project')) &&
        $scope.localProject._id !== $scope.currentProject._id &&
        $scope.localProject.remote.project._id === project._id &&
        (
          $scope.localProject.remote.project.name !== project.name ||
          $scope.localProject.title !== project.title
        )
      ) {
        $scope.localProject.title = project.title;
        $scope.localProject.remote.project.name = project.name;
        $scope.localFormio.saveProject($scope.localProject);
      }

      formio = formio || (new Formio('/project/' + project._id));
      $scope.status.save = 'saving';
      return formio.saveProject(angular.copy(project))
        .then(function(project) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Project settings saved.'
          });
          PrimaryProject.clear();
          if (!AppConfig.onPremise) {
            GoogleAnalytics.sendEvent('Project', 'update', null, 1);
          }
          $scope.status.save = 'saved';
          return project;
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    $scope.saveProject = function() {
      return $scope._saveProject($scope.currentProject, $scope.formio);
    };

    $scope.saveLocalProject = function() {
      return $scope._saveProject($scope.localProject, $scope.localFormio);
    };

    $scope.switchEnv = function(environmentId) {
      $state.go('project.overview', {projectId: environmentId});
    };

    var primaryProjectQ = $q.defer();
    var tenantProjectQ = $q.defer();
    var formioReady = $q.defer();
    $scope.formioReady = formioReady.promise;
    $scope.primaryProjectPromise = primaryProjectQ.promise;
    $scope.tenantProject = null;
    $scope.tenantProjectPromise = tenantProjectQ.promise;
    PDFServer.setPrimaryProject(primaryProjectQ.promise);
    LicenseKeyHelper.setPrimaryProject(primaryProjectQ.promise);
    $scope.highestRoleQ = $q.defer();
    $scope.highestRoleLoaded = $scope.highestRoleQ.promise;
    $scope.setCurrentProject = function(currentProject) {
      $scope.currentProject = currentProject;
    };

    // Sets the tenant project.
    var setTenant = function(tenant) {
      if (tenant && tenant.type === 'tenant') {
        $scope.tenantProject = tenant;
        PrimaryProject.loadStages(tenant, $scope);
        tenantProjectQ.resolve(tenant);
      }
    };

    $scope.loadProjectPromise = $scope.formio.loadProject(null, {ignoreCache: true}).then(function(result) {
      $scope.localProject = result;
      setTenant($scope.localProject);
      $scope.localProjectUrl = $rootScope.projectPath(result);
      var promiseResult = result;
      // If this is a remote project, load the remote.

      $scope.rolesLoading = true;

      if ($scope.localProject.remote) {
        $scope.isRemote = true;
        Formio.setProjectUrl($scope.projectUrl = $rootScope.projectPath($scope.localProject.remote.project, $scope.localProject.remote.url, $scope.localProject.remote.type));
        $scope.projectProtocol = $scope.localProject.remote.url.indexOf('https') === 0 ? 'https:' : 'http:';
        if ($scope.projectProtocol === 'http:' && $scope.projectProtocol !== window.location.protocol) {
          $scope.protocolSecureError = true;
        }
        $scope.projectServer = $scope.localProject.remote.url.replace(/(^\w+:|^)\/\//, '');
        $scope.localFormio = $scope.formio;
        $scope.baseUrl = $scope.localProject.remote.url;
        $scope.formio = new Formio($scope.projectUrl, {
          base: $scope.localProject.remote.url
        });
        promiseResult = $http({
          method: 'GET',
          url: $scope.localProjectUrl + '/access/remote'
        })
          .then(function(response) {
            RemoteTokens.setRemoteToken($scope.baseUrl, response.data);
            RemoteTokens.setRemoteToken($scope.projectUrl, response.data);
            // Set remote token for projectId url as well.
            RemoteTokens.setRemoteToken($scope.projectUrl.replace($scope.localProject.remote.project.name, 'project/' + $scope.localProject.remote.project._id), response.data);
            return $scope.formio
              .loadProject(null, {
                ignoreCache: true
              })
              .then(function(currentProject) {
                $scope.setCurrentProject(currentProject);
                if ($scope.currentProject.apiCalls && $scope.currentProject.apiCalls.formManager === true) {
                  $scope.hasFormManager = true;
                }
                else {
                  $scope.hasFormManager = false
                }
                if ($scope.currentProject.apiCalls && $scope.currentProject.apiCalls.tenant === true) {
                  $scope.tenantEnabled = true;
                }
                else {
                  $scope.tenantEnabled = false
                }
                $scope.loadRoles();
                formioReady.resolve($scope.formio);
                return currentProject;
              });
          });
      }
      else {
        $scope.projectProtocol = AppConfig.apiProtocol;
        $scope.projectServer = AppConfig.apiServer;
        $scope.baseUrl = AppConfig.apiBase;
        $scope.setCurrentProject($scope.localProject);
        Formio.setProjectUrl($scope.projectUrl = $rootScope.projectPath(result));
        if ($scope.currentProject.apiCalls && $scope.currentProject.apiCalls.formManager === true) {
          $scope.hasFormManager = true;
        }
        else {
          $scope.hasFormManager = false
        }
        if ($scope.currentProject.apiCalls && $scope.currentProject.apiCalls.tenant === true) {
          $scope.tenantEnabled = true;
        }
        else {
          $scope.tenantEnabled = false
        }
        formioReady.resolve($scope.formio);
        $scope.loadRoles();
      }
      $scope.projectType = 'Stage';
      $scope.environmentName = ($scope.localProject.project) ? result.title : 'Live';
      $scope.projectsLoaded = true;

      // Load the users teams.
      $scope.userTeamsLoading = true;

      $scope.userTeamsPromise = $http.get(AppConfig.apiBase + '/team/all').then(function(result) {
        $scope.userTeams = result.data;
        $scope.userTeamsLoading = false;

        // Separate out the teams that the current user owns, to save an api call.
        $scope.primaryProjectEligibleTeams = _.filter(result.data, {owner: $scope.user._id});
      });

      var userTeamsOwnPromise = $http.get(AppConfig.apiBase + '/team/own').then(function(result) {
        $scope.primaryProjectEligibleTeams = result.data;
      });

      $scope.projectTeamsLoading = true;

      // Traverses the project parent tree until it gets to the primary project until it reaches the primary.
      var loadPrimaryProject = function(project) {
        if (!project.project) {
          return project;
        }

        return (new Formio('/project/' + project.project))
          .loadProject(null, {ignoreCache: true}).then((parentProject) => {
            setTenant(parentProject);
            return loadPrimaryProject(parentProject);
          });
      };

      primaryProjectQ.resolve(loadPrimaryProject($scope.localProject));
      $scope.projectViewReady = false;
      $scope.primaryProjectPromise.then(function(primaryProject) {
        var currTime = (new Date()).getTime();
        var trialTime = (new Date(primaryProject.trial.toString())).getTime();
        var createTime = (new Date(primaryProject.created.toString())).getTime();
        var delta = Math.ceil(parseInt((currTime - trialTime) / 1000));
        var day = 86400;
        var trialRemaining = 30 - parseInt(delta / day);
        var createdDays = parseInt(Math.ceil(parseInt((currTime - createTime) / 1000)) / day);

        $scope.trialDaysRemaining = trialRemaining > 0 ? trialRemaining : 0;
        $scope.createdDays = createdDays;
        document.body.className += ' ' + 'project-' + primaryProject.plan;

        PrimaryProject.set(primaryProject, $scope);
        $scope.refreshStages = () => {
          PrimaryProject.loadStages(primaryProject, $scope);
        };
        $scope.highestRoleLoaded.then(function() {
            // If they already have a high role, skip this.
            if (['owner', 'team_admin'].indexOf($scope.highestRole) !== -1) {
              $scope.projectViewReady = true;
              return;
            }

            // If any stage roles exist, override the project role.
            return $http.get(AppConfig.apiBase + '/team/stage/' + $scope.localProject._id).then(function (result) {
                $scope.stageProjectTeams = result.data;
                $scope.projectTeamsLoading = false;

                // Calculate the users highest role within the project.
                $q.all([$scope.userTeamsPromise, $scope.projectTeamsPromise]).then(function () {
                  var roles = _.has($scope.user, 'roles') ? $scope.user.roles : [];
                  var teams = _($scope.userTeams ? $scope.userTeams : [])
                    .map('_id')
                    .filter()
                    .value();
                  var allRoles = _(roles.concat(teams)).filter().value();

                  /**
                   * Determine if the user contains a role of the given type.
                   *
                   * @param {String} type
                   *   The type of role to search for.
                   * @returns {boolean}
                   *   If the current user has the role or not.
                   */
                  var hasRoles = function (type) {
                    if ($scope.stageProjectTeams) {
                      var potential = _($scope.stageProjectTeams)
                        .filter({permission: type})
                        .map('_id')
                        .value();
                      return (_.intersection(allRoles, potential).length > 0);
                    }
                  };

                  if (hasRoles('stage_write')) {
                    $scope.highestRole = 'team_write';
                  }
                  else if (hasRoles('stage_read')) {
                    $scope.highestRole = 'team_read';
                  }

                  // Reassign permissions.
                  $scope.projectPermissions.admin = false;
                  $scope.projectPermissions.write = false;
                  $scope.projectPermissions.read = false;
                  $scope.projectPermissions.access = false;

                  // Permissions are fallthrough so allow to pass.
                  switch ($scope.highestRole) {
                    case 'owner':
                      /* falls through */
                    case 'team_admin':
                      $scope.projectPermissions.admin = true;
                      /* falls through */
                    case 'team_write':
                      $scope.projectPermissions.write = true;
                      /* falls through */
                    case 'team_read':
                      $scope.projectPermissions.read = true;
                      /* falls through */
                    case 'team_access':
                      $scope.projectPermissions.access = true;
                      /* falls through */
                  }

                  $scope.projectViewReady = true;
                }).catch(() => ($scope.projectViewReady = true));
            }).catch(() => ($scope.projectViewReady = true));
        }).catch(() => ($scope.projectViewReady = true));
      });

      $scope.projectSettingsVisible = function() {
        return ($scope.highestRole === 'owner' || $scope.highestRole === 'team_admin');
      };

      $scope.spec = {};
      $scope.swaggerLoading = true;
      Formio.makeStaticRequest($scope.projectUrl + '/spec.json', 'GET', null, { noToken:true })
        .then(function(spec) {
          $scope.swaggerLoading = false;
          $scope.spec = spec;
          spec.host = $scope.projectUrl.replace(/https?:\/\//, '');
        });

      $scope.projectError = false;
      return promiseResult;
    }).catch(function(err) {
      if (!err) {
        $scope.projectError = window.location.origin + ' is not allowed to access the API. To fix this, go to your project page on https://form.io and add ' + window.location.origin + ' to your project CORS settings.';
      }
      else {
        var error = err.message || err;
        if(typeof err === 'object') {
          error = JSON.stringify(error);
        }
        $scope.projectError = error;
      }
    });

    $scope.loadProjectPromise.then(function() {
      if (!$scope.currentProject.public) {
        return;
      }

      // See if they have a module available.
      if ($scope.currentProject.public.formModule) {
        let formModule = null;
        try {
          eval(`formModule = ${$scope.currentProject.public.formModule}`);
        }
        catch (err) {
          console.warn(err);
        }
        if (formModule) {
          Formio.use(formModule);
        }
      }

      if (!$scope.currentProject.public.custom) {
        return;
      }

      var allowedFiles, allow, element;
      var custom = $scope.currentProject.public.custom;

      try {
        allowedFiles = JSON.parse(localStorage.getItem('allowedFiles')) || {};
      }
      catch(err) {
        // iOS in private mode will throw errors.
      }

      // Dynamically load JS files.
      if (custom.js && loadedFiles.indexOf(custom.js) === -1) {
        try {
          allow = allowedFiles.hasOwnProperty(custom.js) ? allowedFiles[custom.js] : null;
          if (allow === null) {
            allowedFiles[custom.js] = allow = window.confirm('This project contains custom javascript. Would you like to load it? Be sure you trust the source as loading custom javascript can be a security concern.');
            localStorage.setItem('allowedFiles', JSON.stringify(allowedFiles));
          }

          if (allow) {
            loadedFiles.push(custom.js);
            element = document.createElement('script');
            element.setAttribute('type','text/javascript');
            element.setAttribute('src', custom.js);
            document.head.appendChild(element);
          }
        }
        catch(err) {
          console.log(err);
        }
      }

      // Dynamically load CSS files.
      if (custom.css && loadedFiles.indexOf(custom.css) === -1) {
        try {
          allow = allowedFiles.hasOwnProperty(custom.css) ? allowedFiles[custom.css] : null;
          if (allow === null) {
            allowedFiles[custom.css] = allow = window.confirm('This project contains custom styles. Would you like to load it? Be sure you trust the source as loading custom styles can be a security concern.');
            localStorage.setItem('allowedFiles', JSON.stringify(allowedFiles));
          }

          if (allow) {
            loadedFiles.push(custom.css);
            element = document.createElement("link");
            element.setAttribute("rel", "stylesheet");
            element.setAttribute("type", "text/css");
            element.setAttribute("href", custom.css);
            document.head.appendChild(element);
          }
        }
        catch(err) {
          console.log(err);
        }
      }
    });

    $scope.getRole = function(id) {
      return _.find($scope.currentProjectRoles, {_id: id});
    };

    $scope.getPlanName = ProjectPlans.getPlanName.bind(ProjectPlans);
    $scope.getPlanLabel = ProjectPlans.getPlanLabel.bind(ProjectPlans);
    $scope.getAPICallsLimit = ProjectPlans.getAPICallsLimit.bind(ProjectPlans);
    $scope.getAPICallsPercent = ProjectPlans.getAPICallsPercent.bind(ProjectPlans);
    $scope.getProgressBarClass = ProjectPlans.getProgressBarClass.bind(ProjectPlans);
    $scope.getProgressBarClassPercent = ProjectPlans.getProgressBarClassPercent.bind(ProjectPlans);
  }
]);

app.controller('ProjectDeployController', [
  '$scope',
  '$state',
  '$stateParams',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'PrimaryProject',
  function(
    $scope,
    $state,
    $stateParams,
    AppConfig,
    Formio,
    FormioAlerts,
    PrimaryProject
  ) {
    if ($stateParams.tag) {
      Formio.makeStaticRequest($scope.localProjectUrl + '/tag/' + $stateParams.tag._id, 'GET')
        .then(function(tag) {
          $scope.tag = tag;
        });
    }
    else {
      $scope.primaryProjectPromise.then(function(project) {
        project = $scope.tenantProject ? $scope.tenantProject : project;
        Formio.makeStaticRequest(AppConfig.apiBase + '/project/' + project._id + '/tag?limit=10&sort=-created', 'GET', null, {ignoreCache: true})
          .then(function(tags) {
            $scope.tags = tags;
          });
      });
    }

    $scope.deployTag = function(tag) {
      tag = tag || $scope.tag;
      if (!tag) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please select a tag to deploy.'
        });
      }
      $scope.isBusy = true;
      Formio.makeStaticRequest($scope.projectUrl + '/deploy', 'POST', {
        type: 'template',
        template: tag.template
      })
        .then(function() {
          $scope.isBusy = false;
          $scope.deployTagOption = '';
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Project tag ' + _.escape(tag.tag) + ' deployed to ' + _.escape($scope.currentProject.title) + '.'
          });
          Formio.clearCache();
          // If Remote, update the local project as well.
          if ($scope.localProject._id !== $scope.currentProject._id) {
            $scope.localProject.tag = tag.tag;
            $scope.saveLocalProject()
              .then(function() {
                PrimaryProject.clear();
                $state.go('project.env.staging.manage', null, {reload: true, notify: true});
              });
          }
          else {
            PrimaryProject.clear();
            $state.go('project.env.staging.manage', null, {reload: true, notify: true});
          }
        })
        .catch(FormioAlerts.onError.bind(FormioAlerts))
        .catch(function() {$scope.isBusy = false;});
    };
  }
]);

app.controller('ProjectTagCreateController', [
  '$scope',
  '$state',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'PrimaryProject',
  function(
    $scope,
    $state,
    AppConfig,
    Formio,
    FormioAlerts,
    PrimaryProject
  ) {
    $scope.isBusy = false;
    $scope.addTag = function() {
      var tag = $scope.tag;
      var description = $scope.description || '';

      if (!tag) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please enter a tag identifier.'
        });
      }
      $scope.isBusy = true;

      var tagDone = function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Project Tag was created.'
        });
        $scope.isBusy = false;
        PrimaryProject.clear();
        $state.go('project.env.staging.manage', null, {reload: true, notify: true});
      };

      Formio.makeStaticRequest($scope.projectUrl + '/export', 'GET')
        .then(function(template) {
          Formio.makeStaticRequest(AppConfig.apiBase + '/project/' + $scope.localProject._id + '/tag', 'POST', {
            project: $scope.tenantProject ? $scope.tenantProject._id : $scope.primaryProject._id,
            tag: tag.substr(0, 32),
            description: description.substr(0, 256),
            template: template
          })
            .then(function() {
              $scope.isBusy = false;

              // Make sure we update the remote project version if it exists as well.
              if ($scope.localProject.remote && $scope.localProject.remote.url) {
                $scope.currentProject.tag = tag;
                $scope.currentProject.lastDeploy = new Date().toISOString();
                $scope.saveProject().then(function() {
                  tagDone();
                }).catch(function(err) {
                  $scope.isBusy = false;
                  FormioAlerts.onError(err);
                });
              }
              else {
                tagDone();
              }
            })
            .catch(function(err) {
              $scope.isBusy = false;
              FormioAlerts.onError(err);
            });
        })
        .catch(function(err) {
          $scope.isBusy = false;
          FormioAlerts.onError(err);
        });
    };
  }
]);

app.controller('ProjectTagManageController', [
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  'AppConfig',
  function($scope, $state, Formio, FormioAlerts, AppConfig) {
    $scope.primaryProjectPromise.then(function(project) {
      $scope.tagsParams = {
        sort: '-created'
      };
      project = $scope.tenantProject ? $scope.tenantProject : project;
      $scope.tagsUrl = AppConfig.apiBase + '/project/' + project._id + '/tag?sort=-created';
    });

    $scope.selectedTags = [];

    $scope.toggleSelection = function(tag) {
      var index = $scope.selectedTags.indexOf(tag);

      if (index > -1) {
        $scope.selectedTags.splice(index, 1);
      }
      else {
        $scope.selectedTags.push(tag);
      }
    };

    $scope.deploy = function() {
      if (!$scope.selectedTags.length) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please select a tag to deploy'
        });
      }

      if ($scope.selectedTags.length > 1) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please select only one tag to deploy'
        });
      }

      $state.go('project.env.staging.deploy', {tag: $scope.selectedTags[0]});
    };
  }
]);

app.controller('ProjectTagDeleteController', [
  '$scope',
  '$state',
  '$stateParams',
  '$http',
  '$q',
  function(
    $scope,
    $state,
    $stateParams,
    $http,
    $q
  ) {
    if (!$stateParams.tags || !$stateParams.tags.length) {
      $state.go('project.env.staging.manage');
    }

    $scope.tags = $stateParams.tags;

    $scope.delete = function() {
      $q.all($scope.tags.map(
        function(tag) {
          return $http.delete($scope.localProjectUrl + '/tag/' + tag._id);
        })
      ).then(function() {
        $state.go('project.env.staging.manage');
      });
    };
  }
]);

app.controller('ProjectImportController', [
  '$scope',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    AppConfig,
    Formio,
    FormioAlerts
  ) {
    $scope.isBusy = false;
    $scope.importTemplate = function(template) {
      $scope.isBusy = true;
      if (!template) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please select a file to import.'
        });
      }
      delete template.title;
      delete template.name;
      delete template.description;
      Formio.makeStaticRequest($scope.projectUrl + '/import', 'POST', {
          template: template
        })
        .then(function() {
          $scope.isBusy = false;
          $scope.importFile = null;
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Project template imported to ' + _.escape($scope.currentProject.title) + '.'
          });
        })
        .catch(function(err) {
          $scope.isBusy = false;
          FormioAlerts.onError(err);
        });
    };
  }
]);

app.directive('projectStep', function() {
  return {
    restrict: 'E',
    transclude: true,
    replace: true,
    scope: {
      title: '=',
      complete: '=',
      open: '=?'
    },
    template: '' +
    '<li class="list-group-item project-step">' +
    '  <span class="header" ng-click="toggle()">' +
    '    <i class="fa pull-right project-icon" ng-class="complete ? \'fa-check-circle-o\' : \'fa-circle-o\'"></i>' +
    '    <h4 class="list-group-item-heading">{{ title }}</h4>' +
    '  </span>' +
    '  <div class="contents" ng-if="open" ng-transclude></div>' +
    '</li>',
    controller: [
      '$scope',
      function ($scope) {
        $scope.open = $scope.open || false;

        $scope.toggle = function () {
          $scope.open = !$scope.open;
        };
      }
    ]
  };
});

app.controller('ProjectOverviewController', [
  '$scope',
  '$stateParams',
  '$http',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'ProjectFrameworks',
  'LicenseServerHelper',
  function(
    $scope,
    $stateParams,
    $http,
    AppConfig,
    Formio,
    FormioAlerts,
    ProjectFrameworks,
    LicenseServerHelper
  ) {
    $scope.currentSection.title = 'Overview';
    $scope.currentSection.icon = 'fa fa-dashboard';
    $scope.currentSection.help = '';

    $scope.graphType = $stateParams.graphType;

    $scope.hasTeams = function() {
      return ['trial', 'team', 'commercial'].indexOf($scope.currentProject.plan) !== -1;
    };

    $scope.loadProjectPromise.then(function() {
      var projectCreated = new Date($scope.currentProject.created);
      projectCreated.setSeconds(projectCreated.getSeconds() + 30);

      $scope.formio.loadForms({
          params: {
            type: 'form',
            modified__gt: projectCreated.toISOString(),
            sort: '-modified',
            select: 'type,title,_id'
          }
        })
        .then(function(forms) {
          $scope.recentForms = forms;
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));

      $scope.formio.loadForms({
          params: {
            type: 'resource',
            modified__gt: projectCreated.toISOString(),
            sort: '-modified',
            select: 'type,title,_id'
          }
        })
        .then(function(forms) {
          $scope.recentResources = forms;
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));

      $scope.currentFramework = {};
      ProjectFrameworks.forEach(function(framework) {
        if (framework.name === $scope.currentProject.framework) {
          $scope.currentFramework = framework;
        }
      });

      $scope.scopes = [
        {
          title: 'Forms and Resources',
          prop: 'forms',
          key: 'form',
          columns: [
            {
              field: 'id',
              title: 'Form ID'
            },
            {
              field: 'title',
              title: 'Title'
            },
            {
              field: 'name',
              title: 'Name'
            },
            {
              field: 'path',
              title: 'Path'
            },
            {
              field: 'formType',
              title: 'Type'
            },
          ]
        },
        {
          title: 'PDFs',
          prop: 'pdfs',
          key: 'pdf',
          columns: [
            {
              field: 'fileId',
              title: 'File Id'
            },
            {
              field: 'path',
              title: 'Path'
            },
          ]
        },
        {
          title: 'Form Requests',
          prop: 'formRequests',
          key: 'formRequest',
          monthly: true,
        },
        {
          title: 'Submission Requests',
          prop: 'submissionRequests',
          key: 'submissionRequest',
          monthly: true,
        },
        {
          title: 'Emails',
          prop: 'emails',
          key: 'email',
          monthly: true,
        },
        {
          title: 'PDF Downloads',
          prop: 'pdfDownloads',
          key: 'pdfDownload',
          monthly: true,
        },
      ];

      $scope.setScope = async (scope) => {
        $scope.currentScope = scope;
        $scope.utilizations = await LicenseServerHelper.getLicenseUtilizations($scope.currentProject.apiCalls.licenseId, scope.prop, `projectId=${$scope.currentProject._id}`);
        $scope.$apply();
      };

      $scope.getValue = (value) => {
        if (value === '1') {
          return 'Yes';
        }
        if (value === '0') {
          return 'No';
        }
        return value;
      };

      $scope.reloadProject = () => {
        $scope.formio.loadProject(null, {ignoreCache: true}).then(function(result) {
          $scope.setCurrentProject(result);
        });
      };

      $scope.onAction = async (utilization, action) => {
        const {id, status, lastCheck, ...data} = utilization;
        data.licenseId = $scope.currentProject.apiCalls.licenseId;
        data.type = $scope.currentScope.prop.substring(0, $scope.currentScope.prop.length - 1);
        await LicenseServerHelper.utilizationAction(data, action);
        $scope.setScope($scope.currentScope);
      };
    });
  }
]);

app.factory('ProjectAnalytics', [
  '$http',
  'AppConfig',
  function(
    $http,
    AppConfig
  ) {
      return {
        getSubmissionAnalytics: function(project, year, month, day) {
          var url = project + '/analytics/year/' + year;
          if (month !== undefined && month !== null) {
            url += '/month/' + month;
          }
          if (day !== undefined && day !== null) {
            url += '/day/' + day;
          }
          return $http.get(url)
          .then(function(response) {
            if(day === undefined || day === null) {
              return response.data;
            }

            // Convert a single day's submission data to the same format as the month and year requests
            var submissions = response.data.submissions;

            // Default each hr to have no submissions.
            var data = _(0).range(24)
            .map(function(hr) {
              return {
                hour: hr,
                submissions: 0
              };
            })
            .value();

            // Go through raw timestamps and add them to the right hour entry
            _.forEach(submissions, function(timestamp) {
              var date = new Date(parseInt(timestamp));
              data[date.getUTCHours()].submissions += 1;
            });

            return data;
          });
        }
      };
  }
]);

app.controller('ChartController', [
  '$scope',
  'Formio',
  'ProjectAnalytics',
  'moment',
  function(
    $scope,
    Formio,
    ProjectAnalytics,
    moment
  ) {

    $scope.loadProjectPromise.then(function() {
      // Get the current time.
      var curr = new Date();
      $scope.viewDate = {
        year: curr.getUTCFullYear(),
        month: (curr.getUTCMonth() + 1),
        day: curr.getUTCDate()
      };
      $scope.label = {
        year: 'Yearly Submission Requests by Month',
        month: 'Monthly Submission Requests by Day',
        day: 'Daily Submission Requests by Hour'
      };
      $scope.analyticsOptions = {
        height: '300px',
        low: 0,
        lineSmooth: false,
        axisY: {
          onlyInteger: true
        }
      };
      $scope.analyticsEvents = {
        draw: function(data) {
          // FOR-163 - ie hack for charts not supporting foreignObject; translate the svg text labels.
          if (data.type === 'label') {
            if (typeof SVGForeignObjectElement !== 'function') {
              data.element.attr({
                transform: 'rotate(30 ' + data.x + ' ' + data.y + ')'
              });
            }
          }

          // Intercept each chart point and register a click event.
          if(data.type === 'point') {
            // Register a click event to modify the graph based on the current view and click location.
            data.element._node.onclick = function() {
              if($scope.currentType === 'year') {
                // Adjust month for non-zero index.
                $scope.viewDate.month = (data.index + 1);
                $scope.displayView('month', true);
              }
              else if($scope.currentType === 'month') {
                // Adjust day for non-zero index.
                $scope.viewDate.day = (data.index + 1);
                $scope.displayView('day', true);
              }
            };
          }
        }
      };

      /**
       * View switcher utility to graph the data for the current view type.
       *
       * @param {String} type
       *   The type of view to display: year, month, view.
       * @param {Boolean} [cached]
       *   If the view should use the the $scope.viewDate time rather than the current time.
       */
      $scope.displayView = function(type, cached) {
        var _y = curr.getUTCFullYear();
        var _m = curr.getUTCMonth() + 1;
        var _d = curr.getUTCDate();
        if(cached) {
          $scope.graphType = '';
          _y = $scope.viewDate.year;
          _m = $scope.viewDate.month;
          _d = $scope.viewDate.day;
        }
        else {
          // Clear the cache values;
          $scope.viewDate.year = _y;
          $scope.viewDate.month = _m;
          $scope.viewDate.day = _d;
        }

        if(type === 'year') {
          $scope.analyticsLoading = true;
          ProjectAnalytics.getSubmissionAnalytics($scope.projectUrl, _y)
            .then(function(data) {
              $scope.currentType = type;
              $scope.analytics = {
                labels: _.map(_.map(data, 'month'), function(month) {
                  return _.add(month, 1);
                }),
                series: [
                  _.map(data, 'submissions')
                ]
              };

              $scope.analyticsLoading = false;
            });
        }
        else if(type === 'month') {
          $scope.analyticsLoading = true;
          ProjectAnalytics.getSubmissionAnalytics($scope.projectUrl, _y, _m)
            .then(function(data) {
              $scope.currentType = type;
              $scope.analytics = {
                labels: _.map(_.map(data, 'day'), function(day) {
                  return _.add(day, 1);
                }),
                series: [
                  _.map(data, 'submissions')
                ]
              };

              $scope.analyticsLoading = false;
            });
        }
        else if(type === 'day') {
          $scope.analyticsLoading = true;

          /**
           * Get the local hourly timestamps that relate to utc 0-23 to display as labels.
           *
           * @param year {Number}
           *   The current year in question.
           * @param month {Number}
           *   The current month in question.
           * @param day {Number}
           *   The current day in question.
           *
           * @returns {Array}
           *   The Labels to be associated with utc 0-23 corresponding data.
           */
          var calculateLocalTimeLabels = function(year, month, day) {
            var local = [];

            // Calculate the current utc offset in rounded hours.
            var start = null;
            var time = moment(year + ' ' + month + ' ' + day, 'YYYY MM DD');
            var offset = Math.ceil(((new Date()).getTimezoneOffset() / 60));
            if(offset > 0) {
              // Behind utc by the given amount.
              start = (24 - offset);
              time.subtract(1, 'days');
            }
            else {
              // Current timezone is ahead of utc.
              start = (0 - offset);
            }

            // Change the am flag based on the start of display labels.
            var am = (start > 11) ? false : true;
            for(var i = 0; i < 24; i++) {
              // Flip the am flag when the clock wraps around.
              var output = ((start + i) % 12);
              if(output === 0) {
                am = !am;

                // When the am flag wraps, set the output to 12 rather than 0.
                output = 12;

                time.add(1, 'days');
              }

              // Add each label sequentially in the utc order.
              local.push('' + output + (am ? 'AM' : 'PM') + ' ' + time.format('M/D/YYYY'));
            }

            return local;
          };

          ProjectAnalytics.getSubmissionAnalytics($scope.projectUrl, _y, _m, _d)
            .then(function(data) {
              $scope.currentType = type;
              var displayHrs = calculateLocalTimeLabels(_y, _m, _d);

              $scope.analytics = {
                labels: displayHrs,
                series: [_.map(data, 'submissions')]
              };

              $scope.analyticsLoading = false;
            });
        }
      };
      $scope.types = ['Year', 'Month', 'Day'];
      $scope.graphChange = function() {
        $scope.displayView(($scope.graphType || '').toLowerCase());
      };
    });
  }
]);

app.controller('ProjectDataController', [
  '$scope',
  '$stateParams',
  function(
    $scope,
    $stateParams
  ) {
    $scope.currentSection.title = 'Data';
    $scope.currentSection.icon = 'fa fa-table';
    $scope.currentSection.help = '';

    $scope.graphType = $stateParams.graphType;
  }
]);

app.controller('ProjectPreviewController', [
  '$scope',
  '$sce',
  '$location',
  'AppConfig',
  function(
    $scope,
    $sce,
    $location,
    AppConfig
  ) {
    $scope.previewUrl = '';
    $scope.repo = '';
    $scope.hasTemplate = true;
    $scope.$watch('currentProject', function(project) {
      if (!project.settings) {
        return;
      }
      if (!project.settings.preview) {
        $scope.hasTemplate = false;
        project.settings.preview = {
          repo: 'https://github.com/formio/formio-app-template',
          url: 'http://formio.github.io/formio-app-template/'
        };
      }

      var url = project.settings.preview.url.replace('http://', $location.protocol() + '://');
      url += '/?apiUrl=' + encodeURIComponent(AppConfig.apiBase);
      url += '&appUrl=' + encodeURIComponent($location.protocol() + '://' + project.name + '.' + AppConfig.serverHost);
      $scope.previewUrl = $sce.trustAsResourceUrl(url);
      $scope.repo = project.settings.preview.repo;
    });

  }
]);

app.controller('LaunchController', [
  '$rootScope',
  '$scope',
  '$sce',
  '$location',
  '$http',
  'Formio',
  'FormioAlerts',
  'AppConfig',
  'ProjectFrameworks',
  'ProjectFrameworkSteps',
  function(
    $rootScope,
    $scope,
    $sce,
    $location,
    $http,
    Formio,
    FormioAlerts,
    AppConfig,
    ProjectFrameworks,
    ProjectFrameworkSteps
  ) {
    $scope.repository = '';
    $scope.step = 'welcome';
    $scope.stepActive = 'welcome';
    $scope.welcome = true;
    $scope.advanceSteps = false;
    $scope.repo = '';
    $scope.currentSection.title = 'Welcome';
    $scope.currentSection.icon = 'fa fa-check-square-o';
    $scope.currentSection.help = 'https://help.form.io/embedding/';
    $scope.hasTemplate = true;
    $scope.frameworks = ProjectFrameworks;
    //var formio = new Formio(AppConfig.apiBase + '/project/' + $scope.currentProject._id);

    $scope.$watch('currentProject', function(project) {
      if (!project) {
        return;
      }
      if (!project.framework) {
        project.framework = 'angular2';
      }
      $scope.current = {
        framework: project.framework,
        steps: ProjectFrameworkSteps(project.framework)
      };

      $scope.framework = project.framework;
      if (project.framework === 'angular') {
        $scope.repository = 'https://github.com/formio/ng-app-starterkit';
      }
      if (project.framework === 'angular2') {
        $scope.repository = 'https://github.com/formio/angular-formio';
      }
      if (project.framework === 'react') {
        $scope.repository = 'https://github.com/formio/react-formio';
      }
      if (!project.settings) {
        return;
      }
      if (!project.settings.preview) {
        $scope.hasTemplate = false;
        project.settings.preview = {
          repository: 'https://github.com/formio/formio-app-template',
          url: 'http://formio.github.io/formio-app-template/'
        };

      }
    });

    // Change Steps on Overview
    $scope.nextStep = function (next){

      $scope.step = next;
      if (next === 'form'|| next==='action') {
        $scope.stepActive ='form';
      }
      if(next === 'embed') {
        $scope.stepActive ='embed';
      }
      if(next === 'adFeatures') {
        $scope.stepActive = 'adFeatures';
        $scope.welcome = false;
        $scope.advanceSteps = true;
      }
      if (next === 'welcome') {
        $scope.stepActive ='welcome';
        $scope.welcome = true;
        $scope.advanceSteps = false;
      }
      if (next === 'account') {
        $scope.stepActive ='account';
      }
      if (next === 'launch') {
        $scope.stepActive ='launch';
      }
      if ( next ==='download' || next==='setup' || next === 'start') {
        $scope.stepActive ='start';
      }
      if (next === 'resource' || next === 'emberResource') {
        $scope.stepActive ='resource';
      }
    };
    // Change Steps on Overview
    $scope.prevStep = function (prev){
      $scope.step = prev;
      if (prev === 'form'|| prev==='action') {
        $scope.stepActive ='form';
      }
      if(prev === 'embed') {
        $scope.stepActive ='embed';
      }
      if(prev === 'adFeatures') {
        $scope.stepActive = 'adFeatures';
        $scope.welcome = false;
        $scope.advanceSteps = true;
      }
      if (prev === 'welcome') {
        $scope.stepActive ='welcome';
        $scope.welcome = true;
        $scope.advanceSteps = false;
      }
      if (prev === 'account') {
        $scope.stepActive ='account';
      }
      if (prev === 'launch') {
        $scope.stepActive ='launch';
      }
      if ( prev ==='download' || prev==='setup' || prev === 'start') {
        $scope.stepActive ='start';
      }
      if (prev === 'resource' || prev === 'emberResource') {
        $scope.stepActive ='resource';
      }
    };
//light box images
    $scope.formCreate = [
      {
        'url': 'https://monosnap.com/file/xiUp2i1xQYy1XwA581awTJnZqeB787.png',
        'thumbUrl': 'https://monosnap.com/file/xiUp2i1xQYy1XwA581awTJnZqeB787.png',
        'caption': 'Name the Form.'
      },
      {
        'url': 'https://monosnap.com/file/j8MyWTPZKtGm3SbwwrdnXA8UsCc9i4.png',
        'thumbUrl': 'https://monosnap.com/file/j8MyWTPZKtGm3SbwwrdnXA8UsCc9i4.png',
        'caption': 'Drag and Drop.'
      },
      {
        'url': 'https://monosnap.com/file/BsqWN7Q6B9rv7Wbw32Fw9kNb8b1qLo.png',
        'thumbUrl': 'https://monosnap.com/file/BsqWN7Q6B9rv7Wbw32Fw9kNb8b1qLo.png',
        'caption': 'Save the field component.'
      }];
    $scope.formAction = [
      {
        'url': 'https://monosnap.com/file/3p8XyDte8PKG1cP9jO9oqsvXiJeVv7.png',
        'thumbUrl': 'https://monosnap.com/file/3p8XyDte8PKG1cP9jO9oqsvXiJeVv7.png',
        'caption': 'Select Action'
      },
      {
        'url': 'https://monosnap.com/file/F9sKZl3QOHuffZGK5l0OQQaecBWUkJ.png',
        'thumbUrl': 'https://monosnap.com/file/F9sKZl3QOHuffZGK5l0OQQaecBWUkJ.png',
        'caption': 'Setting Email.'
      }];
    $scope.$watch('project', function(newProject, oldProject) {
      if (newProject && newProject.name) {
        Formio.setProjectUrl($scope.projectUrl = $rootScope.projectPath(newProject));
      }
    });
  }
]);

app.controller('ProjectFormioController', [
  '$scope',
  'Formio',
  'AppConfig',
  '$window',
  '$http',
  '$interpolate',
  '$filter',
  'FormioAlerts',
  'LicenseServerHelper',
  function(
    $scope,
    Formio,
    AppConfig,
    $window,
    $http,
    $interpolate,
    $filter,
    FormioAlerts,
    LicenseServerHelper
  ) {
    $scope.currentSection.title = 'Admin Data';
    $scope.currentSection.icon = 'glyphicon glyphicon-globe';
    $scope.currentSection.help = '';
    $scope.views = ['Overview', 'Current', 'Licenses', 'Users', 'Projects', 'Upgrades'];
    $scope.showDaily = false;
    $scope.showCreated = false;
    $scope.showIds = false;
    $scope.showEmployees = false;
    var _employees = null;

    $scope.$watch('view', (view) => {
      localStorage.setItem('adminView', view);
    });

    $scope.view = localStorage.getItem('adminView') || $scope.views[0];

    // Initialize the first graph, by loading the formio team and filtering out all bad data.
    $scope.init = function() {
      $http.get(AppConfig.teamForm + '/submission/56856be57535d60100ce7ee3').then(function(result) {
        _employees = _(result.data.data.members)
          .map('_id')
          .value();

        $scope.updateUsage();
      });
    };

    $scope.toggle = function(btn) {
      $scope[btn] = !$scope[btn];

      if (btn === 'showDaily') {
        if (!$scope[btn]) {
          $scope.viewDate.day = 0;
          $scope.updateUsage();
        }
      }
      else if (btn === 'showEmployees') {
        $scope.updateUsage();
      }
    };

    // Get the current time.
    var curr = new Date();
    $scope.days = [];
    var i = 0;
    for (i = 1; i < 32; i++) {
      $scope.days.push(i);
    }
    $scope.months = [];
    for (i = 1; i < 13; i++) {
      $scope.months.push(i);
    }
    $scope.years = [];
    var delta = curr.getUTCFullYear() - 2015;
    for (i = 0; i <= delta; i++) {
      $scope.years.push((2015 + i));
    }
    $scope.viewDate = {
      year: curr.getUTCFullYear(),
      month: (curr.getUTCMonth() + 1),
      day: 0
    };

    /**
     *
     * @param projectIds
     * @param next
     */
    var getProjectData = function(projectIds, next) {
      if (!(projectIds instanceof Array)) {
        projectIds = [projectIds];
      }

      Formio.request(AppConfig.apiBase + '/analytics/translate/project', 'POST', projectIds, undefined, undefined, true).then(function(data) {
        return next(data);
      });
    };

    /**
     *
     * @param ownerIds
     * @param next
     */
    var getOwnerData = function(ownerIds, next) {
      if (!(ownerIds instanceof Array)) {
        ownerIds = [ownerIds];
      }

      Formio.request(AppConfig.apiBase + '/analytics/translate/owner', 'POST', ownerIds, undefined, undefined, true).then(function(data) {
        return next(data);
      });
    };

    /**
     * Merge two arrays of objects together using the shared key as a primary index.
     *
     * @param {Array} original
     * @param {Array} potentiallyNew
     * @param [String] key
     * @returns {Array}
     */
    var merge = function(original, potentiallyNew, key) {
      if (!key) {
        key = '_id';
      }

      // Build a map with the new data.
      var potentialMap = {};
      _.forEach(potentiallyNew, function(element) {
        potentialMap[element[key]] = element;
      });

      return _(original)
        .map(function(element) {
          if (potentialMap[element[key]]) {
            return _.merge(element, potentialMap[element[key]]);
          }

          return element;
        })
        .value();
    };

    /**
     * Filter the formio employees from the items, listed as the owners.
     *
     * @param {Array} items
     *   The list of items to be filtered.
     * @returns {Array}
     *   The filtered contents.
     */
    var filterEmployees = function(items, path) {
      path = path || 'data.email';

      var ignoredEmails = ['@form.io', '@example', '@test', 'test@', '@prodtest', '@delaplex.in', '@tudip.nl'];
      return _(items)
        .reject(function(item) {
          var hasIgnoredEmail = _.some(ignoredEmails, function(value) {
            if (
              $scope.showEmployees ||
              (!_.get(item, path) && !_.get(item, 'ownerData.email')) ||
              _.get(item, path) === '' ||
              _.get(item, 'ownerData.email') === ''
            ) {
              return false;
            }

            // Filter the data.email or ownerData.email based on whats available.
            return _.has(item, path) ? (_.get(item, path).toString().indexOf(value) !== -1) : false;
          });

          return (!$scope.showEmployees && _employees.indexOf(item.owner) !== -1) || hasIgnoredEmail;
        })
        .value();
    };

    /**
     * Get the formio projects created during the configured time period, to the next logical unit of time.
     */
    $scope.getProjectsCreated = function() {
      $scope.projectsCreated = null;
      var url = AppConfig.apiBase + '/analytics/created/projects/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        $scope.projectsCreated = _(data)
          .orderBy(['created'], ['desc'])
          .value();

        var allOwners = _.map(data, 'owner');
        getOwnerData(allOwners, function(ownerData) {
          // Change the data response format for merge.
          ownerData = _(ownerData)
            .map(function(element) {
              return {
                owner: element._id,
                ownerData: element.data
              };
            })
            .value();

          $scope.projectsCreated = filterEmployees(merge($scope.projectsCreated, ownerData, 'owner'));
          $scope.$apply();
        });
      });
    };

    /**
     * Get the formio users created during the configured time period, to the next logical unit of time.
     */
    $scope.getUsersCreated = function() {
      $scope.usersCreated = null;
      var url = AppConfig.apiBase + '/analytics/created/users/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        $scope.usersCreated = _(data)
          .orderBy(['created'], ['desc'])
          .value();

        $scope.usersCreated = filterEmployees($scope.usersCreated);
        $scope.$apply();
      });
    };

    /**
     * Get the list of upgraded/downgraded projects during the configured time period.
     */
    $scope.getProjectUpgrades = function() {
      $scope.projectUpgrades = null;
      $scope.monthlyUpgrades = null;
      $scope.monthlyDowngrades = null;
      var plans = {
        trial: 0,
        basic: 1,
        independent: 2,
        team: 3,
        commercial: 4
      };
      var url = AppConfig.apiBase + '/analytics/upgrades/projects/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        $scope.projectUpgrades = _(data)
          .orderBy(['created'], ['desc'])
          .map(function(item) {
            item.plan = plans[item.data.oldPlan] < plans[item.data.newPlan] ? 'success' : 'danger';
            return item;
          })
          .value();

        $scope.projectUpgrades = filterEmployees($scope.projectUpgrades, 'data.project.owner.data.email');
        $scope.monthlyUpgrades = _($scope.projectUpgrades)
          .filter(function(item) {
            return item.plan == 'success';
          })
          .value().length;
        $scope.monthlyDowngrades = (($scope.projectUpgrades.length || 0) - ($scope.monthlyUpgrades || 0)) || 0;
        $scope.$apply();
      });
    };

    $scope.getTotalProjects = function() {
      $scope.totalProjects = null;
      $scope.totalProjectsNotDeleted = null;
      $scope.totalProjectsDeleted = null;
      $scope.totalProjectsCommercial = null;
      $scope.totalProjectsTeam = null;
      $scope.totalProjectsIndependent = null;

      var url = AppConfig.apiBase + '/analytics/total/projects/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        $scope.totalProjects = _(data)
          .orderBy(['created'], ['desc'])
          .value();
        $scope.totalProjects = filterEmployees($scope.totalProjects, 'owner.data.email');

        $scope.totalProjectsNotDeleted = [];
        $scope.totalProjectsDeleted = [];
        $scope.totalProjectsCommercial = [];
        $scope.totalProjectsTeam = [];
        $scope.totalProjectsIndependent = [];
        _($scope.totalProjects)
          .each(function(item) {
            // Build the project count lists.
            if (item.deleted === null) {
              $scope.totalProjectsNotDeleted.push(item);
            }
            else if (item.deleted !== null) {
              $scope.totalProjectsDeleted.push(item);
            }

            // Build the premium project count lists.
            if (item.plan === 'commercial') {
              $scope.totalProjectsCommercial.push(item);
            }
            else if (item.plan === 'team') {
              $scope.totalProjectsTeam.push(item);
            }
            else if (item.plan === 'independent') {
              $scope.totalProjectsIndependent.push(item);
            }
          });

        $scope.$apply();
      });
    };

    $scope.plans = ['basic', 'independent', 'team', 'commercial', 'trial'];
    $scope.input = {
      project: '',
      plan: $scope.plans[0]
    };
    $scope.updateProject = function() {
      $scope.status.save = 'saving';
      Formio.request(AppConfig.apiBase + '/analytics/upgrade', 'PUT', {
        project: $scope.input.project,
        plan: $scope.input.plan
      })
        .then(function(data) {
          FormioAlerts.addAlert({
            type: 'success',
            message: data
          });
          if (data === 'OK') {
            $scope.input.project = '';
            $scope.input.plan = $scope.plans[0];
            $scope.getTotalProjects();
            $scope.status.save = 'saved';
          }
        })
        .catch(function(err) {
          FormioAlerts.addAlert({
            type: 'danger',
            message: err.message || err
          });
        });
    };

    $scope.getLicense = function() {
      Formio.request('https://license.form.io/generate/' + $scope.input.license, 'GET')
        .then(function(license) {
          $scope.currentLicense = license;
          $scope.$apply();
        })
        .catch(function(err) {
          $scope.currentLicense = 'Unable to get license. Please check the license id.';
          $scope.$apply();
        });
    };

    $scope.inputUser = {deleted: null};
    $scope.searchUser = {
      data: null,
      projects: null
    };
    $scope.findUser = function() {
      $scope.searchUser.data = _.first(_($scope.totalUsers)
        .filter($scope.inputUser)
        .value());

      $scope.searchUser.projects = _($scope.totalProjects)
        .filter({owner: {_id: $scope.searchUser.data._id}, deleted: null})
        .value();

      // Reset the search fields
      $scope.inputUser = {deleted: null};
    };

    $scope.getTotalUsers = function() {
      $scope.totalUsers = null;
      $scope.totalUsersNotDeleted = null;
      $scope.totalUsersDeleted = null;
      var url = AppConfig.apiBase + '/analytics/total/users/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        $scope.totalUsers = _(data)
          .orderBy(['created'], ['desc'])
          .value();
        $scope.totalUsers = filterEmployees($scope.totalUsers, 'data.email');

        $scope.totalUsersNotDeleted = [];
        $scope.totalUsersDeleted = [];
        _($scope.totalUsers)
          .each(function(item) {
            if (item.deleted === null) {
              $scope.totalUsersNotDeleted.push(item);
            }
            else if (item.deleted !== null) {
              $scope.totalUsersDeleted.push(item);
            }
          });

        $scope.$apply();
      });
    };

    /**
     * Get the list of api usage during the configured time period.
     */
    $scope.getAPIUsage = function() {
      $scope.monthlyUsage = null;
      $scope.monthlySubmissions = null;
      $scope.monthlyNonsubmissions = null;
      $scope.totalMonthlySubmissions = null;
      $scope.totalMonthlyNonsubmissions = null;

      var BSON = new RegExp('^[0-9a-fA-F]{24}$');
      var url = AppConfig.apiBase + '/analytics/project/year/' + $scope.viewDate.year + '/month/' + $scope.viewDate.month;
      if ($scope.showDaily) {
        url += '/day/' + $scope.viewDate.day;
      }

      Formio.request(url, 'GET', undefined, undefined, true).then(function(data) {
        data = _(data)
          .map(function(element) {
            var calls = element[0];
            var key = element[1].split(':');
            var _y = key[0];
            var _m = key[1];
            var _d = key[2];
            var project = key[3];
            var type = key[4];

            return {_id: project, calls: calls, type: type, year: _y, month: _m, day: _d};
          })
          .filter(function(item) {
            if (_.isString(item._id) && BSON.test(item._id)) {
              return true;
            }

            return false;
          })
          .value();

        $scope.monthlyUsage = _(data)
          .groupBy(function(element) {
            return element._id;
          })
          .map(function(groups, _id) {
            var submissions = _(groups)
              .filter({type: 's'})
              .map('calls')
              .value();
            var nonsubmissions = _(groups)
              .filter({type: 'ns'})
              .map('calls')
              .value();

            return {
              _id: _id,
              submissions: _.sum(submissions),
              nonsubmissions: _.sum(nonsubmissions)
            };
          })
          .value();

        $scope.monthlySubmissions = _($scope.monthlyUsage)
          .orderBy(['submissions'], ['desc'])
          .reject({submissions: 0})
          .value();

        $scope.monthlyNonsubmissions = _($scope.monthlyUsage)
          .orderBy(['nonsubmissions'], ['desc'])
          .reject({nonsubmissions: 0})
          .value();

        $scope.usageLoading = false;
        $scope.$apply();

        /**
         * Build a usage graph for the submission analytics.
         *
         * @param {String} type
         *   submission or nonsubmission.
         * @param {Array} typeData
         *   The input data to graph.
         * @param {String} symbol
         *   s or ns, corresponding to the type.
         * @param [Number] quantity
         *   The number of top results to display.
         *
         * @returns {*}
         */
        var buildUsageGraph = function(type, typeData, symbol, quantity) {
          $scope[type + 'GraphOptions'] = {
            onlyInteger: true,
            plugins: [
              Chartist.plugins.tooltip()
            ]
          };

          // Grab the top 5 submission users, and compare them, with the overall.
          quantity = quantity || 5;
          var top = _(typeData)
            .take(quantity)
            .map(function(item) {
              return item._id;
            })
            .value();
          $scope[type + 'DisplayTop'] = 'Top ' +  quantity + ': ' + top.join(', ');

          // Build the total submission chart data.
          $scope[type + 'GraphData'] = {
            labels: [],
            series: []
          };
          var days = new Date($scope.viewDate.year, $scope.viewDate.month - 1, 0).getDate();
          var templateSeries = [];
          for (var i = 1; i <= days; i++) {
            // Create each day label
            $scope[type + 'GraphData'].labels.push(i);

            // add the series data for each graph line.
            templateSeries.push({meta: '', value: 0});
          }
          for (var q = 0; q < (quantity + 1); q++) {
            $scope[type + 'GraphData'].series.push(_.cloneDeep(templateSeries));
          }

          // If there is no usage, skip traversing the data.
          if (!top || top.length === 0) {
            return $scope.$apply();
          }

          // Group the submission data into 6 groups for quick glance views.
          var groupPos = 0;
          _(data)
            .groupBy(function(item) {
              if (top.indexOf(item._id) === -1) {
                return 'other';
              }

              return item._id;
            })
            .forEach(function(group, category) {
              _(group)
                .filter({type: symbol})
                .forEach(function(entry) {
                  var day = parseInt(entry.day);
                  $scope[type + 'GraphData'].series[groupPos][day - 1].meta = category;
                  $scope[type + 'GraphData'].series[groupPos][day - 1].value += entry.calls;
                });

              groupPos += 1;
            });
        };

        // Update project data for top submissions.
        var allProjects = _.uniq(_.map($scope.monthlySubmissions, '_id').concat(_.map($scope.monthlyNonsubmissions, '_id')));
        getProjectData(allProjects, function(submissionData) {
          $scope.monthlySubmissions = merge($scope.monthlySubmissions, submissionData);
          $scope.monthlyNonsubmissions = merge($scope.monthlyNonsubmissions, submissionData);
          $scope.$apply();

          var allOwners = _.uniq(_.map($scope.monthlySubmissions, 'owner').concat(_.map($scope.monthlyNonsubmissions, 'owner')));
          getOwnerData(allOwners, function(ownerData) {
            // Change the data response format for merge.
            ownerData = _(ownerData)
              .map(function(element) {
                return {
                  owner: element._id,
                  ownerData: element.data
                };
              })
              .value();

            // Merge all values and filter out the formio employees if set.
            $scope.monthlySubmissions = filterEmployees(merge($scope.monthlySubmissions, ownerData, 'owner'));
            $scope.totalMonthlySubmissions = _.sum(_.map($scope.monthlySubmissions, 'submissions'));
            $scope.monthlyNonsubmissions = filterEmployees(merge($scope.monthlyNonsubmissions, ownerData, 'owner'));
            $scope.totalMonthlyNonsubmissions = _.sum(_.map($scope.monthlyNonsubmissions, 'nonsubmissions'));

            buildUsageGraph('submission', $scope.monthlySubmissions, 's');
            buildUsageGraph('nonsubmission', $scope.monthlyNonsubmissions, 'ns');

            $scope.$apply();
          });
        });
      });
    };

    /**
     * Export the current data to csv.
     */
    $scope.downloadUsage = function() {
      var title = '';
      var csv = '';

      // Add the display date to the title and header rows.
      title += 'formio-usage-export-' + $scope.viewDate.month + '/';
      csv += 'Month,' + $scope.viewDate.month + '\n';
      if ($scope.viewDate.day !== 0) {
        title += $scope.viewDate.day + '/';
        csv += 'Day,' + $scope.viewDate.day + '\n';
      }
      title += $scope.viewDate.year + '.csv';
      csv += 'Year,' + $scope.viewDate.year + '\n\n';

      // Add the overview data.
      csv += 'Overview\n';
      csv += 'Projects Created,' + ($scope.projectsCreated.length || 0) + '\n';
      csv += 'Project Plan Upgrades,' + ($scope.monthlyUpgrades || 0) + '\n';
      csv += 'Project Plan Downgrades,' + ($scope.monthlyDowngrades || 0) + '\n';
      csv += 'Users Created,' + ($scope.usersCreated.length || 0) + '\n';
      csv += 'Submissions,' + $scope.totalMonthlySubmissions + '\n';
      csv += 'Non-Submissions,' + $scope.totalMonthlyNonsubmissions + '\n';

      // Add the header labels and submission data.
      csv += '\nProject API Submission Usage\n';
      csv += 'Project _id,Project Requests,Request Type,Project Name,Project Title,Project Plan,Project Created,Owner _id,Owner Name,Owner Email\n';
      _.forEach($scope.monthlySubmissions, function(element) {
        csv +=
          (element._id ? element._id : '') + ',' +
          (element.submissions ? element.submissions : '') + ',' +
          'submission,' +
          (element.name ? element.name : '') + ',' +
          (element.title ? element.title : '') + ',' +
          (element.plan ? element.plan : '') + ',' +
          (element.created ? element.created : '') + ',' +
          (element.owner ? element.owner : '') + ',' +
          (element.ownerData && element.ownerData.name ? element.ownerData.name : '') + ',' +
          (element.ownerData && element.ownerData.email ? element.ownerData.email : '') + '\n';
      });

      // Add the header labels again and nonsubmission data.
      csv += '\nProject API Non-Submission Usage\n';
      csv += 'Project _id,Project Requests,Request Type,Project Name,Project Title,Project Plan,Project Created,Owner _id,Owner Name,Owner Email\n';
      _.forEach($scope.monthlySubmissions, function(element) {
        csv +=
          (element._id ? element._id : '') + ',' +
          (element.submissions ? element.submissions : '') + ',' +
          'nonsubmission,' +
          (element.name ? element.name : '') + ',' +
          (element.title ? element.title : '') + ',' +
          (element.plan ? element.plan : '') + ',' +
          (element.created ? element.created : '') + ',' +
          (element.owner ? element.owner : '') + ',' +
          (element.ownerData && element.ownerData.name ? element.ownerData.name : '') + ',' +
          (element.ownerData && element.ownerData.email ? element.ownerData.email : '') + '\n';
      });

      csv += '\nNew Users\n';
      csv += 'User _id,User Name,User Full Name,User Email,Created,Deleted\n';
      _.forEach($scope.usersCreated, function(element) {
        csv +=
          (element._id ? element._id : '') + ',' +
          (element.data && element.data.name ? element.data.name : '') + ',' +
          (element.data && element.data.fullName ? element.data.fullName : '') + ',' +
          (element.data && element.data.email ? element.data.email : '') + ',' +
          (element.created ? element.created : '') + ',' +
          (element.deleted ? element.deleted : '') + '\n';
      });

      csv += '\nNew Projects\n';
      csv += 'Project _id,Project Name,Project Title,Project Plan,Created,Owner _id,Owner Name,Owner Email\n';
      _.forEach($scope.projectsCreated, function(element) {
        csv +=
          (element._id ? element._id : '') + ',' +
          (element.name ? element.name : '') + ',' +
          (element.title ? element.title : '') + ',' +
          (element.plan ? element.plan : '') + ',' +
          (element.created ? element.created : '') + ',' +
          (element.owner ? element.owner : '') + ',' +
          (element.ownerData && element.ownerData.name ? element.ownerData.name : '') + ',' +
          (element.ownerData && element.ownerData.email ? element.ownerData.email : '') + '\n';
      });

      csv += '\nProject Plan Status Changes\n';
      csv += 'Event Date,Project _id,Project Name,Project Title,Old Plan,New Plan,Created,Owner _id,Owner Name,Owner Email\n';
      _.forEach($scope.projectUpgrades, function(element) {
        csv +=
          _.get(element, 'created', '') + ',' +
          _.get(element, 'data.project._id', '') + ',' +
          _.get(element, 'data.project.name', '') + ',' +
          _.get(element, 'data.project.title', '') + ',' +
          _.get(element, 'data.oldPlan', '') + ',' +
          _.get(element, 'data.newPlan', '') + ',' +
          _.get(element, 'data.project.created', '') + ',' +
          _.get(element, 'data.project.owner._id', '') + ',' +
          _.get(element, 'data.project.owner.data.name', '') + ',' +
          _.get(element, 'data.project.owner.data.email', '') + '\n';
      });

      // Create and init dl.
      var dl = $window.document.createElement('a');
      dl.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      dl.setAttribute('download', title);
      dl.click();
    };

    $scope.usageLoading = false;

    $scope.updateUsage = function() {
      $scope.usageLoading = true;

      // Load the number of projects created during this reference time.
      $scope.getProjectsCreated();

      // Load the number of users created during this reference time.
      $scope.getUsersCreated();

      // Load all the project upgrades during the reference time.
      $scope.getProjectUpgrades();

      $scope.getAPIUsage();
      $scope.getTotalProjects();
      $scope.getTotalUsers();

      $scope.searchUser = {
        data: null,
        projects: null
      };
    };

    $scope.initLicenses = async () => {
      $scope.open = {};

      $scope.openLicense = ($index) => {
        $scope.open[$index] = true;
      };

      $scope.closeLicense = ($index) => {
        $scope.open[$index] = false;
      };

      $scope.licenses = await LicenseServerHelper.getLicensesAdmin($scope.licenseQuerystring);
      $scope.$apply();
    };

    $scope.licenseColumns = [
      {
        label: 'Name',
        prop: 'licenseName',
        type: 'text',
        query: 'data.licenseName__regex',
        filter: value => value,
      },
      {
        label: 'Company',
        prop: 'company',
        type: 'text',
        query: 'data.company__regex',
        filter: value => value,
      },
      {
        label: 'Location',
        prop: 'location',
        type: 'select',
        query: 'data.location',
        filter: location => {
          if (!location) {
            return '';
          }
          const locations = {
            hosted: 'Hosted',
            onPremise: 'On Premise',
          };
          return locations[location];
        },
        options: [
          {
            value: 'hosted',
            label: 'Hosted'
          },
          {
            value: 'onPremise',
            label: 'On Premise'
          },
        ]
      },
      {
        label: 'Plan',
        prop: 'plan',
        type: 'select',
        query: 'data.plan',
        filter: plan => {
          if (!plan) {
            return '';
          }
          const plans = {
            basic: 'Basic',
            trial: 'Trial',
            independent: 'Independent',
            team: 'Team Pro',
            commercial: 'Enterprise',
          };
          return plans[plan];
        },
        options: [
          {
            value: 'basic',
            label: 'Basic'
          },
          {
            value: 'independent',
            label: 'Independent'
          },
          {
            value: 'team',
            label: 'Team Pro'
          },
          {
            value: 'commercial',
            label: 'Enterprise'
          },
          {
            value: 'trial',
            label: 'Trial'
          },
        ]
      },
      {
        label: 'Start Date',
        prop: 'startDate',
        type: 'date',
        query: 'data.startDate__gt',
        filter: value => $filter('date')(value, 'MM/dd/yyyy hh:mm a'),
      },
      {
        label: 'End Date',
        prop: 'endDate',
        type: 'date',
        query: 'data.endDate__lt',
        filter: value => $filter('date')(value, 'MM/dd/yyyy hh:mm a'),
      },
      {
        label: 'Authorized Users',
        prop: 'user',
        type: 'text',
        query: 'data.user.data.email__regex',
        filter: users => {
          if (!users) {
            return '';
          }
          return users.map(function(user) {
            return user.data.name + ' (' + user.data.email + ')'
          }).join(', ');
        },
      },
    ];

    const getLocalStorageJSON = (key) => {
      const value = localStorage.getItem(key);

      try {
        return JSON.parse(value) || {};
      }
      catch (err) {
        return {};
      }
    };

    $scope.filters = getLocalStorageJSON('licenseFilter');
    // Fix dates being stringified.
    if ($scope.filters.startDate) {
      $scope.filters.startDate = new Date($scope.filters.startDate);
    }
    if ($scope.filters.endDate) {
      $scope.filters.endDate = new Date($scope.filters.endDate);
    }

    $scope.licenseQuerystring = getLocalStorageJSON('licenseFilterQuery');

    $scope.open = {};

    $scope.openCal = (prop) => {
      $scope.open[prop] = !$scope.open[prop];
    }

    $scope.setLicenseFilter = async (col) => {
      if ($scope.filters[col.prop]) {
        $scope.licenseQuerystring[col.query] = $scope.filters[col.prop];
      }
      else {
        delete $scope.licenseQuerystring[col.query];
      }
      localStorage.setItem('licenseFilter', JSON.stringify($scope.filters));
      localStorage.setItem('licenseFilterQuery', JSON.stringify($scope.licenseQuerystring));
      $scope.licenses = await LicenseServerHelper.getLicensesAdmin($scope.licenseQuerystring);
      $scope.$apply();
    };

    $scope.initLicenses();
  }
]);

app.controller('ProjectSettingsController', [
  '$scope',
  '$rootScope',
  '$state',
  'FormioAlerts',
  'ProjectFrameworks',
  '$http',
  'PrimaryProject',
  function(
    $scope,
    $rootScope,
    $state,
    FormioAlerts,
    ProjectFrameworks,
    $http,
    PrimaryProject
  ) {
    $scope.loadProjectPromise.then(function() {
      $scope.localProject.plan = $scope.localProject.plan || 'basic';

      $scope.highestRoleLoaded.then(function() {
        // Check the highest role, after the project has been loaded.
        if (!$scope.highestRole || ($scope.highestRole && ['team_read', 'team_write'].indexOf($scope.highestRole) !== -1)) {
          $state.go('project.overview');
          return;
        }

        $scope.currentSection.title = 'Settings';
        $scope.currentSection.icon = 'fa fa-cogs';
        $scope.currentSection.help = 'https://help.form.io/userguide/#settings-project';
        // Go to first settings section
        if($state.current.name === 'project.settings') {
          $state.go('project.settings.project', {location: 'replace'});
        }
      });
    });

    $scope.addKey = function() {
      if (!$scope.currentProject.settings.keys) {
        $scope.currentProject.settings.keys = [];
      }
      var keyIndex = ($scope.currentProject.settings.keys.length + 1);
      $scope.currentProject.settings.keys.forEach(function(key) {
        if (key.name === ('Key ' + keyIndex)) {
          keyIndex++;
        }
      });
      var s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      $scope.currentProject.settings.keys.push({
        name: 'Key ' + keyIndex,
        key: Array(30).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join(''),
      });
      $scope._saveProject($scope.currentProject, $scope.formio);
    };

    $scope.removeKey = function($index) {
      $scope.currentProject.settings.keys.splice($index, 1);
      $scope._saveProject($scope.currentProject, $scope.formio);
    };

    $scope.updateProject = function() {
      $scope._saveProject($scope.currentProject, $scope.formio);
    };

    // Save the Project.
    $scope.saveProject = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentProject.name) {
        $scope.currentProject.name = $scope.currentProject.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      $scope._saveProject($scope.currentProject, $scope.formio).then(function(project) {
        $state.go($state.current.name, null, {reload: true});
      });
    };

    $scope.authenticatedWithOAuth = false;
    $scope.verifiedOAuth = false;

    // Oauth verification for atlassian
    $scope.loginWithOAuth = function() {
      $http.post($scope.currentProject + '/atlassian/oauth/authorize')
        .then(function(result) {
          $scope.authenticatedWithOAuth = true;
          var data = result.data;
          var url = data.url;
          window.open(url, 'OAuth', 'width=800,height=618');
          $scope.currentProject = $scope.currentProject || {};
          $scope.currentProject.settings = $scope.currentProject.settings || {};
          $scope.currentProject.settings.atlassian = $scope.currentProject.settings.atlassian || {};
          $scope.currentProject.settings.atlassian.oauth = $scope.currentProject.settings.atlassian.oauth || {};
          $scope.currentProject.settings.atlassian.oauth.token = data.token;
          $scope.currentProject.settings.atlassian.oauth.token_secret = data.token_secret;

          // Remove existing verifier
          $scope.currentProject.settings.atlassian.oauth.oauth_verifier = '';
        })
        .catch(function(error) {
          FormioAlerts.onError({
            message: error.data
          });
        });
    };

    $scope.verifyOAuth = function() {
      $http.post($scope.projectUrl + '/atlassian/oauth/finalize', {
        oauth_verifier: $scope.currentProject.settings.atlassian.oauth.oauth_verifier
      })
      .then(function(result) {
        $scope.verifiedOAuth = true;
        var data = result.data;
        $scope.currentProject.settings.atlassian.oauth.token = data.access_token;
        $scope._saveProject($scope.currentProject);
      })
      .catch(function(error) {
        FormioAlerts.onError({
          message: error.data
        });
      });
    };
  }
]);

app.controller('ProjectSettingsScriptController', [
  '$scope',
  '$rootScope',
  '$state',
  function(
    $scope,
    $rootScope,
    $state
  ) {
    $scope.scriptSub = {data: {script: ''}};
    $scope.scriptForm = {
      components: [
        {
          type: 'textarea',
          label: 'Form Module',
          hideLabel: true,
          editor: 'ace',
          key: 'module',
          rows: 5,
          input: true,
          tableView: false
        }
      ]
    };

    $scope.loadProjectPromise.then(() => {
      $scope.scriptSub.data.module = _.get($scope.currentProject, 'settings.formModule');
      $scope.$watch('scriptSub.data.module', (script) => {
        _.set($scope.currentProject, 'settings.formModule', script);
      });
    });
  }
]);

app.controller('oauthRoles', ['$scope', '$http', function($scope, $http) {
  $scope.$watch('currentProject.settings.oauth.openid', function() {
    var openIdData = getOpenIdData();
    if (!openIdData) {
      return;
    }
    openIdData.roles = openIdData.roles || [{}];
    openIdData.authorizationMethod = openIdData.authorizationMethod || 'body';
  }, true);

  $scope.addRow = function() {
    var openIdData = getOpenIdData();
    if (openIdData) {
      openIdData.roles = (openIdData.roles || [{}]).concat({});
    }
  };

  $scope.removeRow = function(index) {
    var openIdData = getOpenIdData();
    if (openIdData && openIdData.roles) {
      openIdData.roles.splice(index, 1);
    }
  };

  function getOpenIdData() {
    return $scope.currentProject.settings && $scope.currentProject.settings.oauth && $scope.currentProject.settings.oauth.openid;
  }
}]);

app.controller('ProjectRemoteController', [
  '$http',
  '$scope',
  '$state',
  '$stateParams',
  'AppConfig',
  function($http, $scope, $state, $stateParams, AppConfig) {
    $scope.loading = false;
    $scope.remote = {
      type: 'Subdirectories'
    };
    $scope.environmentTypes = ['Subdomains', 'Subdirectories'];

    $scope.insecureWarning = false;
    $scope.$watch('remote.url', function(url) {
      if (url) {
        $scope.insecureWarning = url.indexOf('http:') !== -1 && window.location.protocol === 'https:';
      }
      $scope.loading = false;
    });

    // Remove any unnecessary characters when pasted
    $scope.checkUrl = function (url)
    {
      if (url.substring(url.length-1) === "/" || url.substring(url.length-1) === "?" ||
        url.substring(url.length-1) === "+")
      {
        url = url.substring(0, url.length-1);
      }
      return url;
    };

    $scope.check = function() {
      $scope.loading = true;
      if (!$scope.remote.url || !$scope.remote.secret) {
        $scope.remoteError = 'Server URL or Secret not provided.';
        $scope.loading = false;
        return;
      }

      $scope.remote.url = $scope.checkUrl($scope.remote.url);

      $scope.localProject.settings.remoteSecret = $scope.remote.secret;
      $scope.saveLocalProject()
        .then(function(project) {
          $http({
            method: 'GET',
            url: $scope.projectUrl + '/access/remote'
          })
            .then(function(response) {
              $scope.remoteToken = response.data;
              $http({
                method: 'GET',
                url: $scope.remote.url + '/status',
                headers: {
                  'x-remote-token': $scope.remoteToken
                },
                disableJWT: true
              })
                .then(function(result) {
                  if (result && result.data && result.data.version && semver.satisfies(result.data.version.split('-')[0], '>=5.0.0')) {
                    $http({
                      method: 'GET',
                      url: $scope.remote.url + '/project?limit=10000&select=title,name',
                      headers: {
                        'x-remote-token': $scope.remoteToken
                      },
                      disableJWT: true
                    })
                      .then(function(result) {
                        delete $scope.remoteError;
                        if (!Array.isArray(result.data)) {
                          $scope.remoteError = 'Server did not respond properly. It may not be a form.io server.';
                        }
                        else {
                          $scope.remoteProjects = result.data;
                          $scope.remoteProjects.unshift({
                            title: 'New Stage',
                            name: 'new'
                          });
                        }
                        $scope.loading = false;
                      })
                      .catch(function(err) {
                        if (err.status === -1) {
                          $scope.remoteError = 'Remote server did not respond to a CORS request properly. It may not be a properly configured form.io server or does not exist.';
                        }
                        else {
                          $scope.remoteError = err.status + ' - ' + err.statusText + ': ' + err.data;
                          if (err.status === 401) {
                            $scope.remoteError += '. Please check your access key';
                          }
                        }
                        $scope.loading = false;
                      });
                  }
                  else {
                    $scope.remoteError = 'Environment too old of a version. Please upgrade.';
                  }
                  $scope.loading = false;
                })
                .catch(function(err) {
                  $scope.remoteError = 'Environment did not respond to a CORS request properly. It may not be a properly configured form.io server or does not exist.';
                  $scope.loading = false;
                });

            });
        })
        .catch(function(err) {
          if (err) {
            $scope.remoteError = 'Unable to save Portal Key. Please check your permissions.';
            $scope.loading = false;
          }
        });
      return;
    };

    $scope.connect = function() {
      $scope.loading = true;
      if ($scope.remote.project.name === 'new') {
        $http({
          method: 'GET',
          url: $scope.projectUrl + '/export'
        })
          .then(function(result) {
            var project = angular.copy($scope.currentProject);
            project.template = result.data;
            delete project.access;
            delete project._id;
            delete project.plan;
            $http({
              method: 'POST',
              url: $scope.remote.url + '/project',
              headers: {
                'x-remote-token': $scope.remoteToken
              },
              data: project,
              disableJWT: true
            })
              .then(function(result) {
                $scope.remote.project = result.data;
                $scope.localProject.remote = angular.copy($scope.remote);
                delete $scope.localProject.remote.secret;
                $scope.saveLocalProject().then(function() {
                  $scope.loading = false;
                  $state.reload();
                });
              })
              .catch(function(err) {
                $scope.loading = false;
                $scope.remoteError = 'Error importing environment - ' + err.status + ' - ' + err.statusText + ': ' + err.data;
              });
        })
        .catch(function(err) {
          $scope.loading = false;
          $scope.remoteError = 'Error exporting environment - ' + err.status + ' - ' + err.statusText + ': ' + err.data;
        });
      }
      else {
        // Connecting to existing project
        $scope.localProject.remote = angular.copy($scope.remote);
        delete $scope.localProject.remote.secret;
        $scope.saveLocalProject()
          .then(function() {
            $scope.loading = false;
            $state.reload();
          });
      }
    };

    $scope.disconnect = function() {
      $scope.localProject.remote = false;
      $scope.saveLocalProject()
        .then(function() {
          $state.reload();
        });
    };
  }
]);

app.controller('PrimaryProjectSettingsController', [
  '$scope',
  '$rootScope',
  '$state',
  'ProjectFrameworks',
  'Formio',
  function(
    $scope,
    $rootScope,
    $state,
    ProjectFrameworks,
    Formio
  ) {
    $scope.frameworks = _.filter(ProjectFrameworks, function(item) {return !item.disabled;});

    $scope.primaryProjectPromise.then(function(primaryProject) {
      $scope.project = _.clone(primaryProject);
      $scope.formio = new Formio('/project/' + primaryProject._id);
    });

    $scope.saveProject = function() {
      return $scope._saveProject($scope.project, $scope.formio).then(function(project) {
        $state.go('project.overview', null, { reload: true, inherit: true, notify: true });
      });
    };
  }
]);

app.controller('ProjectTeamController', [
  '$scope',
  '$http',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'TeamPermissions',
  function(
    $scope,
    $http,
    AppConfig,
    Formio,
    FormioAlerts,
    TeamPermissions
  ) {
    $scope.getPermissionLabel = TeamPermissions.getPermissionLabel.bind(TeamPermissions);

    $scope.primaryProjectPromise.then(function(primaryProject) {
      $scope.projectTeamsPromise = $http.get(AppConfig.apiBase + '/team/project/' + primaryProject._id).then(function(result) {
        $scope.primaryProjectTeams = result.data;

        $http.get(AppConfig.apiBase + '/team/all').then(function(result) {
          $scope.userTeams = result.data;
          $scope.userTeamsLoading = false;
        });

        $http.get(AppConfig.apiBase + '/team/own').then(function(result) {
          $scope.primaryProjectEligibleTeams = result.data;
          $scope.uniqueEligibleTeams = _.filter($scope.primaryProjectEligibleTeams, function(team) {
            return _.findIndex($scope.primaryProjectTeams, { _id: team._id }) === -1;
          });
        });
      });
    });

    var setTeamPermission = function(project, team, newPermission) {
      var access = project.access ||  [];
      var found = false;

      // Search the present permissions to add the new permission.
      access = _.forEach(access, function(permission) {
        // Remove all the old permissions.
        permission.roles = permission.roles || [];
        permission.roles = _.without(permission.roles, team._id);

        // Add the given role to the new permission type.
        if (permission && permission.type === newPermission) {
          found = true;

          permission.roles = permission.roles || [];
          permission.roles.push(team._id);
        }
      });

      // This team permission was not found, add it.
      if(!found && newPermission) {
        access.push({
          type: newPermission,
          roles: [team._id]
        });
      }

      // Update the current project access with the new team access.
      project.access = access;
    };

    $scope.teamPermissions = [
      {
        value: 'team_access',
        label: 'Project Access',
        description: 'Provides only access to the project without permission to read or edit anything'
      },
      {
        value: 'team_read',
        label: 'Project Read',
        description: ''
      },
      {
        value: 'team_write',
        label: 'Project Write',
        description: ''
      },
      {
        value: 'team_admin',
        label: 'Project Admin',
        description: ''
      }
    ];

    $scope.added = {
      team: undefined
    };

    $scope.addTeam = function(team) {
      setTeamPermission($scope.primaryProject, team, 'team_read');
      $scope._saveProject($scope.primaryProject).then(function(project) {
        $scope.primaryProject = project;
      });
      _.remove($scope.uniqueEligibleTeams, { _id: team._id });
      team.permission = 'team_read';
      $scope.primaryProjectTeams.push(team);
      $scope.added.team = undefined;
    };

    $scope.removeTeam = function(team) {
      setTeamPermission($scope.primaryProject, team);
      $scope._saveProject($scope.primaryProject).then(function(project) {
        $scope.primaryProject = project;
      });
      _.remove($scope.primaryProjectTeams, { _id: team._id });
      delete team.permission;
      $scope.uniqueEligibleTeams.push(team);
    };

    $scope.updateTeam = function(team, permission) {
      setTeamPermission($scope.primaryProject, team, permission);
      $scope._saveProject($scope.primaryProject).then(function(project) {
        $scope.primaryProject = project;
      });
    };
  }
]);

app.controller('ProjectStages', [
  '$scope',
  'LicenseServerHelper',
  'PrimaryProject',
  async function(
    $scope,
    LicenseServerHelper,
    PrimaryProject,
  ) {
    const licenses = await LicenseServerHelper.getLicenses();
    // Find the current license.
    $scope.license = licenses.filter((lic) => !!lic.data.licenseKeys.filter((key) => key.key === $scope.primaryProject.settings.licenseKey).length)[0];

    // If we can't find the license, the user doesn't have access to the license.
    $scope.refresh = async () => {
      if ($scope.license) {
        $scope.stages = await LicenseServerHelper.getLicenseUtilizations($scope.license._id, 'stages', `projectId=${$scope.primaryProject._id}`);
        $scope.enabledStages = $scope.stages.filter((stage) => stage.status === "1");
        $scope.livestages = await LicenseServerHelper.getLicenseUtilizations($scope.license._id, 'livestages', `projectId=${$scope.primaryProject._id}`);
        $scope.livestages = $scope.livestages.reduce((prev, stage) => {
          prev[stage.stageId] = stage.status === '1';
          return prev;
        }, {});
        $scope.$apply();
      }
    };

    $scope.refresh();

    $scope.onAction = async (stage, utilization, action) => {
      const {id, status, lastCheck, ...data} = stage;
      data.licenseId = $scope.license._id;
      data.type = utilization;
      await LicenseServerHelper.utilizationAction(data, action);
      $scope.refresh();
    }
  }
]);

app.controller('ProjectTenantController', [
  '$scope',
  '$http',
  '$sce',
  'AppConfig',
  'Formio',
  '$state',
  function(
    $scope,
    $http,
    $sce,
    AppConfig,
    Formio,
    $state,
  ) {
    $scope.primaryProjectUrl = '';
    const tenantContainer = document.getElementById('tenant-app');
    $scope.primaryProjectPromise.then(function(primaryProject) {
      $scope.primaryProjectUrl = AppConfig.apiBase + '/' + $scope.primaryProject.name;
      if ($scope.tenantEnabled) {
        let url = `${AppConfig.appBase}/tenant/?iframe=true`;
        url += `&project=${encodeURIComponent($scope.primaryProjectUrl)}`;
        url += `&base=${encodeURIComponent($scope.baseUrl)}`;
        url += `#/project/${primaryProject._id}/tenant/index`;
        tenantContainer.innerHTML = '';
        const tenantElement = document.createElement('iframe');
        tenantElement.setAttribute('style', 'width: 100%');
        tenantElement.setAttribute('id', 'tenant-frame');
        tenantElement.setAttribute('src', $sce.trustAsResourceUrl(url));
        tenantContainer.appendChild(tenantElement);
        const tenantFrame = window.seamless(tenantElement);
        tenantFrame.receive(function (data, event) {
          if (data.event === 'gotoTenant') {
            $state.go('project.overview', {projectId: data.tenant._id});
          }
        });
      } else {
        console.warn('Multi-Tenant not enabled');
      }
    });
  }
]);

app.controller('ProjectConfigController', [
  '$scope',
  function($scope) {
    $scope.configuration = {data: {config: []}};
    $scope.loadProjectPromise.then(function(project) {
      _.each(project.config, function(value, key) {
        $scope.configuration.data.config.push({
          key: key,
          value: typeof value === 'object' ? JSON.stringify(value) : value,
          json: typeof value === 'object' ? true : false
        });
      });
    });
    $scope.configForm = {
      components: [
        {
          type: 'datagrid',
          key: 'config',
          label: 'Configurations',
          addAnother: 'Add Configuration',
          hideLabel: true,
          components: [
            {
              type: 'textfield',
              key: 'key',
              label: 'Key',
              input: true
            },
            {
              type: 'textfield',
              key: 'value',
              label: 'Value',
              input: true
            },
            {
              type: 'checkbox',
              key: 'json',
              label: 'JSON',
              tooltip: 'Check this if the value is a JSON object.',
              input: true
            }
          ]
        }
      ]
    };
    $scope.saveConfiguration = function() {
      $scope.currentProject.config = {};
      _.each($scope.configuration.data.config, function(config) {
        $scope.currentProject.config[config.key] = config.json ? JSON.parse(config.value) : config.value;
      });
      $scope.saveProject();
    };
  }
]);

app.controller('SAMLController', [
  '$scope',
  function(
    $scope
  ) {
    $scope.projectSP = '';
    $scope.loadProjectPromise.then(function(project) {
      $scope.exampleJSON = JSON.stringify({
        entryPoint: 'https://ad.example.net/adfs/ls/',
        issuer: 'https://your-app.example.net/login/callback',
        callbackUrl: 'https://your-app.example.net/login/callback',
        cert: 'MIICizCCAfQCCQCY8tKaMc0BMjANBgkqh ... W==',
        authnContext: 'http://schemas.microsoft.com/ws/2008/06/identity/authenticationmethod/windows',
        identifierFormat: null
      }, null, 2);
      $scope.projectSP = _.get($scope.currentProject, 'settings.saml.sp', `<EntityDescriptor
 xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
 xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
 entityID="${$scope.projectUrl}/saml/metadata">
    <SPSSODescriptor WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
        <AssertionConsumerService isDefault="true" index="0" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${$scope.projectUrl}/saml/acs"/>
    </SPSSODescriptor>
</EntityDescriptor>`);
    });
    $scope.saveSAML = function() {
      if ($scope.projectSP) {
        _.set($scope.currentProject, 'settings.saml.sp', $scope.projectSP);
      }
      $scope.saveProject();
    };

    $scope.addRow = function() {
      var samlData = _.get($scope.currentProject, 'settings.saml');
      if (samlData) {
        samlData.roles = (samlData.roles || [{}]).concat({});
      }
      else {
        samlData = {roles: [{}]};
        _.set($scope.currentProject, 'settings.saml', samlData)
      }
    };

    $scope.removeRow = function(index) {
      var samlData = _.get($scope.currentProject, 'settings.saml');
      if (samlData && samlData.roles) {
        samlData.roles.splice(index, 1);
      }
    };
  }
]);

app.controller('StageTeamController', [
  '$scope',
  '$http',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'TeamPermissions',
  function(
    $scope,
    $http,
    AppConfig,
    Formio,
    FormioAlerts,
    TeamPermissions
  ) {
    $scope.getPermissionLabel = TeamPermissions.getPermissionLabel.bind(TeamPermissions);

    var setTeamPermission = function(project, team, newPermission) {
      var access = project.access ||  [];
      var found = false;

      // Search the present permissions to add the new permission.
      access = _.forEach(access, function(permission) {
        // Remove all the old permissions.
        permission.roles = permission.roles || [];
        permission.roles = _.without(permission.roles, team._id);

        // Add the given role to the new permission type.
        if (permission && permission.type === newPermission) {
          found = true;

          permission.roles = permission.roles || [];
          permission.roles.push(team._id);
        }
      });

      // This team permission was not found, add it.
      if(!found && newPermission) {
        access.push({
          type: newPermission,
          roles: [team._id]
        });
      }

      // Update the current project access with the new team access.
      project.access = access;
    };

    $scope.loadProjectPromise.then(function() {
      $http.get(AppConfig.apiBase + '/team/stage/' + $scope.localProject._id).then(function(result) {
        $scope.stageProjectTeams = result.data;

        if ($scope.stageProjectTeams && $scope.localProject) {
          _.forEach($scope.stageProjectTeams, function(team){
            if (team) {
              setTeamPermission($scope.localProject, team, team.permission)
            }
          });
        }

        $http.get(AppConfig.apiBase + '/team/all').then(function(result) {
          $scope.userTeams = result.data;
          $scope.userTeamsLoading = false;
        });

        $http.get(AppConfig.apiBase + '/team/own').then(function(result) {
          $scope.stageProjectEligibleTeams = result.data;
          $scope.uniqueEligibleTeams = _.filter($scope.stageProjectEligibleTeams, function(team) {
            return _.findIndex($scope.stageProjectTeams, { _id: team._id }) === -1;
          });
        });
      });
    });

    $scope.teamPermissions = [
      {
        value: 'stage_read',
        label: 'Stage Read',
        description: ''
      },
      {
        value: 'stage_write',
        label: 'Stage Write',
        description: ''
      }
    ];

    $scope.added = {
      team: undefined
    };

    $scope.addTeam = function(team) {
      setTeamPermission($scope.localProject, team, 'stage_read');
      $scope.saveLocalProject();
      _.remove($scope.uniqueEligibleTeams, { _id: team._id });
      team.permission = 'stage_read';
      $scope.stageProjectTeams.push(team);
      $scope.added.team = undefined;
    };

    $scope.removeTeam = function(team) {
      setTeamPermission($scope.localProject, team);
      $scope.saveLocalProject();
      _.remove($scope.stageProjectTeams, { _id: team._id });
      delete team.permission;
      $scope.uniqueEligibleTeams.push(team);
    };

    $scope.updateTeam = function(team, permission) {
      setTeamPermission($scope.localProject, team, permission);
      $scope.saveLocalProject();
    };
  }
]);

app.controller('ProjectPlanController', [
  '$scope',
  function($scope) {
    $scope.submission = {
      data: {
        project: $scope.primaryProject._id
      }
    };
    $scope.$on('formSubmission', function() {
      $scope.submitted = true;
    });
  }
]);

app.controller('ProjectSendgridEmailController', [
  '$scope',
  function(
    $scope
  ) {
    // Force the sendgrid settings to be defined.
    $scope.currentProject.settings = $scope.currentProject.settings || {};
    $scope.currentProject.settings.email = $scope.currentProject.settings.email || {};
    $scope.currentProject.settings.email.sendgrid = $scope.currentProject.settings.email.sendgrid || {};
    $scope.currentProject.settings.email.sendgrid.auth = $scope.currentProject.settings.email.sendgrid.auth || {};
    $scope.currentProject.settings.email.sendgrid.auth.api_user = $scope.currentProject.settings.email.sendgrid.auth.api_user || 'apikey';
    $scope.currentProject.settings.email.sendgrid.auth.api_key = $scope.currentProject.settings.email.sendgrid.auth.api_key || '';
  }
]);

app.controller('ProjectStorageController', [
  '$scope',
  '$http',
  '$interval',
  'AppConfig',
  function($scope, $http, $interval, AppConfig) {
    $scope.$watch('currentProject.settings.storage.s3.bucket', function(current, old) {
      if ($scope.currentProject.settings && $scope.currentProject.settings.storage && $scope.currentProject.settings.storage.s3) {
        // If bucket isn't valid, remove the bucketUrl as well.
        if (!$scope.currentProject.settings.storage.s3.bucket) {
          $scope.currentProject.settings.storage.s3.bucketUrl = '';
        }
        // If bucketUrl is blank or the old value, change it.
        if (!$scope.currentProject.settings.storage.s3.bucketUrl || $scope.currentProject.settings.storage.s3.bucketUrl === 'https://' + old + '.s3.amazonaws.com/') {
          $scope.currentProject.settings.storage.s3.bucketUrl = 'https://' + current + '.s3.amazonaws.com/';
        }
      }
    });

    $scope.loadProjectPromise
      .then(function() {
        return $http.get($scope.projectUrl + '/dropbox/auth');
      })
      .then(function(response) {
        $scope.dropboxSettings = response.data;
      });

    $scope.dropboxOauth = function(settings) {
      settings.redirect_uri = window.location.origin || window.location.protocol + '//' + window.location.host;

      /*eslint-enable camelcase */
      var params = Object.keys(settings).map(function(key) {
        return key + '=' + encodeURIComponent(settings[key]);
      }).join('&');

      var url = 'https://www.dropbox.com/1/oauth2/authorize' + '?' + params;

      var popup = window.open(url, 'Dropbox', 'width=800,height=618');
      var interval = $interval(function() {
        try {
          var popupHost = popup.location.host;
          var currentHost = window.location.host;
          if (popup && !popup.closed && popupHost === currentHost && popup.location.search) {
            popup.close();
            var params = popup.location.search.substr(1).split('&').reduce(function(params, param) {
              var split = param.split('=');
              params[split[0]] = split[1];
              return params;
            }, {});
            if (params.error) {
              $scope.showAlerts({
                type: 'danger',
                message: params.error_description || params.error
              });
              return;
            }
            // TODO: check for error response here
            if (settings.state !== params.state) {
              //$scope.showAlerts({
              //  type: 'danger',
              //  message: 'OAuth state does not match. Please try logging in again.'
              //});
              return;
            }
            // Post the code to the server so that we can convert it to an auth token.
            params.redirect_uri = settings.redirect_uri;
            $http.post($scope.projectUrl + '/dropbox/auth', params)
              .then(function(response) {
                // Store the token so any subsequent saves will contain it. We also set it server side in case they
                // don't press save after connecting to dropbox.
                $scope.currentProject.settings.storage = $scope.currentProject.settings.storage || {};
                $scope.currentProject.settings.storage.dropbox = response.data;
              });
          }
        }
        catch (error) {
          //if (error.name !== 'SecurityError') {
          //  $scope.showAlerts({
          //    type: 'danger',
          //    message: error.message || error
          //  });
          //}
        }
        if (!popup || popup.closed || popup.closed === undefined) {
          $interval.cancel(interval);
        }
      }, 100);

    };

    $scope.dropboxDisconnect = function() {
      $http.post($scope.projectUrl + '/dropbox/auth', {})
        .then(function(response) {
          // Remove dropbox settings and persist.
          $scope.currentProject.settings.storage = $scope.currentProject.settings.storage || {};
          $scope.currentProject.settings.storage.dropbox = response.data;
        });
    };
  }
]);

app.controller('ProjectDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  'GoogleAnalytics',
  'PrimaryProject',
  'Formio',
  '$q',
  'AppConfig',
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics,
    PrimaryProject,
    Formio,
    $q,
    AppConfig
  ) {
    $scope.primaryProjectPromise.then(function(primaryProject) {
      var isProject = ($scope.currentProject._id === primaryProject._id);
      var type = (isProject ? 'Project' : 'Stage');
      $scope.deleteProject = function(deleteRemote) {
        var deletePromises = [];
        if (!$scope.currentProject || !$scope.currentProject._id) { return; }
        $scope.isBusy = true;
        var localFormio = new Formio('/project/' + $scope.localProject._id);
        deletePromises.push(localFormio.deleteProject());
        if (deleteRemote) {
          deletePromises.push($scope.formio.deleteProject());
        }
        $q.all(deletePromises).then(function() {
            FormioAlerts.addAlert({
              type: 'success',
              message: type + ' was deleted!'
            });
            $scope.isBusy = false;
            if (!AppConfig.onPremise) {
              GoogleAnalytics.sendEvent(type, 'delete', null, 1);
            }
            PrimaryProject.clear();
            if (isProject) {
              $state.go('home');
            }
            else {
              $state.go('project.overview', {projectId: primaryProject._id});
            }
          }, FormioAlerts.onError.bind(FormioAlerts))
          .catch(FormioAlerts.onError.bind(FormioAlerts));
      };
    });

    $scope.isBusy = false;
  }
]);

app.controller('ProjectBilling', [
  '$rootScope',
  '$scope',
  '$http',
  '$state',
  '$window',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'UserInfo',
  'ProjectPlans',
  'PDFServer',
  function($rootScope, $scope, $http, $state, $window, AppConfig, Formio, FormioAlerts, UserInfo, ProjectPlans, PDFServer) {
    $scope.primaryProjectPromise.then(function(project) {

      $scope.planLoading = false;
      $scope.pdfInfo = {};

      $scope.plans = ProjectPlans.getPlans();

      $scope.loadPaymentInfo = function() {
        $scope.paymentInfoLoading = true;
        UserInfo.getPaymentInfo()
          .then(function(paymentInfo) {
            $scope.paymentInfo = paymentInfo;
            $scope.paymentInfoLoading = false;
          }, FormioAlerts.onError.bind(FormioAlerts))
          .catch(FormioAlerts.onError.bind(FormioAlerts));
      };

      $scope.loadPaymentInfo();

      var currTime = (new Date()).getTime();
      var projTime = (new Date(project.created.toString())).getTime();
      var delta = Math.ceil(parseInt((currTime - projTime) / 1000));
      var day = 86400;
      var remaining = 30 - parseInt(delta / day);
      $scope.trialDaysRemaining = remaining > 0 ? remaining : 0;

      // Default to the commercial from trial or to current plan.
      $scope.selectedPlan = $scope.getPlan(project.plan);
      $scope.pdfs = (project.billing && project.billing.pdfs) ? project.billing.pdfs : $scope.selectedPlan.features.pdfs;
      $scope.pdfDownloads = (project.billing && project.billing.pdfDownloads) ? project.billing.pdfDownloads : $scope.selectedPlan.features.pdfDownloads;
      $scope.pdfPrice = calculatePdfPrice();
      $scope.hasFormManager = !!(project.billing && project.billing.formManager);
    });

    var calculatePdfPrice = function() {
      if ($scope.selectedPlan.features.pdfs === $scope.pdfs) {
        return 0;
      }
      const base = $scope.selectedPlan.features.pdfs === 1 ? 0 : $scope.selectedPlan.features.pdfs;
      return ($scope.pdfs - base) * 2; // (total - base) / 25 * 50
    };

    var getActiveForm = function() {
      if(!$scope.paymentInfoLoading && !$scope.paymentInfo) {
        return $scope.paymentForm;
      }
    };

    $scope.$on('formSubmission', function() {
      if(getActiveForm() === $scope.paymentForm) {
        $scope.loadPaymentInfo();
      }
    });
    $scope.changePaymentInfo = function() {
      $scope.paymentInfo = null;
    };
    $scope.setSelectedPlan = function(plan) {
      const pdfModified = $scope.selectedPlan.features.pdfs !== $scope.pdfs || $scope.selectedPlan.features.pdfDownloads !== $scope.pdfDownloads;
      $scope.selectedPlan = plan;
      if (!pdfModified) {
        $scope.pdfs = plan.features.pdfs;
        $scope.pdfDownloads = plan.features.pdfDownloads;
      }
      // If not upgradeable, reset to default.
      if (!plan.features.pdfUpgradeable) {
        $scope.pdfs = plan.features.pdfs;
        $scope.pdfDownloads = plan.features.pdfDownloads;
        $scope.hasFormManager = false;
      }
      $scope.pdfPrice = calculatePdfPrice();
    };

    $scope.changePlan = function() {
      $scope.planLoading = true;

      $http.post(AppConfig.apiBase + '/project/' + $scope.primaryProject._id + '/upgrade',
        {
          plan: $scope.selectedPlan.name,
          pdfs: $scope.pdfs,
          pdfDownloads: $scope.pdfDownloads,
          formManager: $scope.hasFormManager,
        }
        )
        .then(function() {
          $scope.planLoading = false;
          Formio.clearCache();
          $window.location.reload();
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    $scope.capitalize = _.capitalize;
    $scope.plans = ProjectPlans.getPlans();
    $scope.getPlan = ProjectPlans.getPlan.bind(ProjectPlans);
    $scope.paymentForm = AppConfig.paymentForm;

    var calculatePrice = function() {
      if ($scope.selectedPlan) {
        var pdfPrice = 0;
        if ($scope.pdfInfo.plan === 'hosted') {
          pdfPrice = 50;
        }
        else {
          $scope.pdfInfo.plan = 'basic';
        }

        $scope.pricing = {
          plan: $scope.selectedPlan.price,
          pdfPrice: $scope.pdfPrice,
          formManager: $scope.hasFormManager ? 150 : 0,
        };
        $scope.pricing.total = $scope.pricing.plan + $scope.pricing.pdfPrice + $scope.pricing.formManager;
      }
    };

    $scope.increasePdfs = function() {
      if ($scope.pdfs === 1) {
        $scope.pdfs = 25;
        $scope.pdfDownloads = 1000;
      }
      else {
        $scope.pdfs += 25;
        $scope.pdfDownloads += 1000;
      }
      $scope.pdfPrice = calculatePdfPrice();
      calculatePrice();
    };

    $scope.decreasePdfs = function() {
      if ($scope.pdfs === 25) {
        $scope.pdfs = 1;
        $scope.pdfDownloads = 1000;
      }
      else {
        $scope.pdfs -= 25;
        $scope.pdfDownloads -= 1000;
      }
      $scope.pdfPrice = calculatePdfPrice();
      calculatePrice();
    };

    $scope.toggleFormManager = function() {
      $scope.hasFormManager = !$scope.hasFormManager;
      calculatePrice();
    };

    calculatePrice();

    $scope.$watch('selectedPlan', calculatePrice, true);
  }
]);

app.controller('ProjectExportController', [
  '$scope',
  '$state',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  'PrimaryProject',
  'FileSaver',
  function(
    $scope,
    $state,
    AppConfig,
    Formio,
    FormioAlerts,
    PrimaryProject,
    FileSaver
  ) {
    $scope.primaryProjectPromise.then(function(project) {
      Formio.makeStaticRequest($scope.projectUrl + '/export', 'GET')
        .then(function(template) {
          // Save oiginal for full reference.
          $scope.template = angular.copy(template);

          // Make a copy for modifications.
          $scope.export = angular.copy(template);
        });
    });

    $scope.sections = [
      {
        key: 'forms',
        label: 'Forms',
        toggle: 'added'
      },
      {
        key: 'resources',
        label: 'Resources',
        toggle: 'added'
      },
      {
        key: 'actions',
        label: 'Actions',
        toggle: 'added'
      },
      {
        key: 'roles',
        label: 'Roles',
        toggle: 'added'
      }
    ];

    $scope.includeAll = true;
    $scope.excludeAccess = true;

    $scope.toggleItem = function(section, key, item) {
      $scope.doToggle(section, key, item, $scope.export[section.key].hasOwnProperty(key));
    };

    $scope.doToggle = function(section, key, item, remove) {
      if (remove) {
        delete $scope.export[section.key][key];
        // Remove associated actions as well.
        if (['forms', 'resources'].indexOf(section.key) !== -1) {
          Object.keys($scope.export.actions).forEach(function(action) {
            if (action.indexOf(key + ':') === 0) {
              delete $scope.export.actions[action];
            }
          });
        }
      }
      else {
        $scope.export[section.key][key] = item;
        // Remove associated actions as well.
        if (['forms', 'resources'].indexOf(section.key) !== -1) {
          Object.keys($scope.template.actions).forEach(function(action) {
            if (action.indexOf(key + ':') === 0) {
              $scope.export.actions[action] = $scope.template.actions[action];
            }
          });
        }
      }
    };

    $scope.toggleAll = function(section) {
      Object.keys($scope.template[section.key]).forEach(function(key) {
        $scope.doToggle(section, key, $scope.template[section.key][key], section.toggle === 'added');
      });

      section.toggle = 'removed';
    };

    const excludeAccessProperties = (template) => {
      if (!$scope.excludeAccess) {
        return template;
      }

      template = _.cloneDeep(template);

      var {access, ...template} = template;

      Object.keys(template.forms)
        .forEach((key) => {
          var {access, submissionAccess, ...form} = template.forms[key];
          template.forms[key] = form;
        });

      Object.keys(template.resources)
        .forEach((key) => {
          var {access, submissionAccess, ...resource} = template.resources[key];
          template.resources[key] = resource;
        });

      template.excludeAccess = true;

      return template;
    }

    $scope.downloadTemplate = function() {
      if (!$scope.export.name) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please enter an export name.'
        });
      }

      if (!$scope.export.title) {
        return FormioAlerts.addAlert({
          type: 'warning',
          message: 'Please enter an export title.'
        });
      }

      // If includeAll is checked, be sure to use original template.
      if ($scope.includeAll) {
        var name = $scope.export.name;
        var title = $scope.export.title;
        $scope.export = excludeAccessProperties($scope.template);
        $scope.export.name = name;
        $scope.export.title = title;
      } else {
        $scope.export = excludeAccessProperties($scope.export);
      }

      FileSaver.saveAs(new Blob([JSON.stringify($scope.export, null, 2)], {type : 'application/json'}), $scope.currentProject.name + '-' + $scope.currentProject.tag + '.json');
    };

    $scope.isBusy = false;
  }
]);
