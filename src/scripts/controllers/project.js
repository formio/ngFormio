'use strict';

/* globals NumberAbbreviate, chance, Chartist */

// loadedFiles is used to prevent double loading files on each session.
var loadedFiles = [];

var app = angular.module('formioApp.controllers.project', ['angular-chartist']);

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

        return $http.post(Formio.getBaseUrl() + $scope.url, req)
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

app.controller('ProjectCreateController', [
  '$scope',
  '$rootScope',
  '$state',
  'FormioAlerts',
  'Formio',
  'FormioProject',
  function(
    $scope,
    $rootScope,
    $state,
    FormioAlerts,
    Formio,
    FormioProject
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.currentProject = {template: 'default'};
    $scope.hasTemplate = false;
    $scope.showName = false;
    $scope.templateLimit = 3;

    $scope.templates = [];
    FormioProject.loadTemplates().then(function(templates) {
      $scope.templates = templates;
      angular.forEach(templates, function(template) {
        if (template.name === $scope.currentProject.template) {
          $scope.currentProject.template = template.template;
        }
      });
    });

    $scope.showAllTemplates = function() {
      $scope.templateLimit = Infinity;
    };

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
        $scope.oldTemplate = $scope.currentProject.template;
        $scope.currentProject.template = JSON.parse(e.target.result);
        $scope.hasTemplate = true;
        $scope.$apply();
      };
      reader.readAsText(template);
    };

    $scope.unloadTemplate = function() {
      $scope.currentProject.template = $scope.oldTemplate;
      $scope.oldTemplate = null;
      $scope.hasTemplate = false;
    };

    $scope.saveProject = function() {
      FormioProject.createProject($scope.currentProject).then(function(project) {
        $state.go('project.env.overview', {projectId: project._id});
      });
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
  'ProjectUpgradeDialog',
  '$q',
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
    ProjectUpgradeDialog,
    $q
  ) {
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
    $scope.formsLoading = true;
    $scope.forms = [];
    $scope.formio = new Formio('/project/' + $stateParams.projectId);
    $scope.currentProject = {_id: $stateParams.projectId, access: []};
    $scope.projectApi = '';

    $scope.rolesLoading = true;
    $scope.loadRoles = function() {
      return $http.get($scope.formio.projectUrl + '/role').then(function(result) {
        $scope.currentProjectRoles = result.data;
        $scope.rolesLoading = false;

        return $scope.currentProjectRoles;
      });
    };
    $scope.loadRoles();

    $scope.minPlan= function(plan, project) {
      var plans = ['basic', 'independent', 'team', 'trial', 'commercial'];
      var checkProject = project || $scope.primaryProject || { plan: 'none' };
      return plans.indexOf(checkProject.plan) >= plans.indexOf(plan);
    };

    $scope.switchEnv = function(environmentId) {
      $state.go('.', {projectId: environmentId});
    };

    $scope.loadProjectPromise = $scope.formio.loadProject().then(function(result) {
      $scope.currentProject = result;
      $scope.projectType = $scope.currentProject.hasOwnProperty('project') ? 'Environment' : 'Project';
      $scope.projectApi = AppConfig.protocol + '//' + result.name + '.' + AppConfig.serverHost;
      $rootScope.currentProject = result;
      $scope.showName = !(result.plan && result.plan === 'basic');
      $scope.projectsLoaded = true;
      var allowedFiles, allow, custom;

      try {
        allowedFiles = JSON.parse(localStorage.getItem('allowedFiles')) || {};
      }
      catch(err) {
        // iOS in private mode will throw errors.
      }
      // Dynamically load JS files.
      if ($scope.currentProject.settings && $scope.currentProject.settings.custom && $scope.currentProject.settings.custom.js && loadedFiles.indexOf($scope.currentProject.settings.custom.js) === -1) {
        try {
          allow = allowedFiles.hasOwnProperty($scope.currentProject.settings.custom.js) ? allowedFiles[$scope.currentProject.settings.custom.js] : null;
          if (allow === null) {
            allowedFiles[$scope.currentProject.settings.custom.js] = allow = window.confirm('This project contains custom javascript. Would you like to load it? Be sure you trust the source as loading custom javascript can be a security concern.');
            localStorage.setItem('allowedFiles', JSON.stringify(allowedFiles));
          }

          if(allow) {
            loadedFiles.push($scope.currentProject.settings.custom.js);
            custom = document.createElement('script');
            custom.setAttribute('type','text/javascript');
            custom.setAttribute('src', $scope.currentProject.settings.custom.js);
            document.head.appendChild(custom);
          }
        }
        catch(err) {
          console.log(err);
        }
      }

      // Dynamically load CSS files.
      if ($scope.currentProject.settings && $scope.currentProject.settings.custom && $scope.currentProject.settings.custom.css && loadedFiles.indexOf($scope.currentProject.settings.custom.css) === -1) {
        try {
          allow = allowedFiles.hasOwnProperty($scope.currentProject.settings.custom.css) ? allowedFiles[$scope.currentProject.settings.custom.css] : null;
          if (allow === null) {
            allowedFiles[$scope.currentProject.settings.custom.css] = allow = window.confirm('This project contains custom styles. Would you like to load it? Be sure you trust the source as loading custom styles can be a security concern.');
            localStorage.setItem('allowedFiles', JSON.stringify(allowedFiles));
          }

          if(allow) {
            loadedFiles.push($scope.currentProject.settings.custom.css);
            custom = document.createElement("link");
            custom.setAttribute("rel", "stylesheet");
            custom.setAttribute("type", "text/css");
            custom.setAttribute("href", $scope.currentProject.settings.custom.css);
            document.head.appendChild(custom);
            localStorage.setItem('loadedFiles', loadedFiles);
          }
        }
        catch(err) {
          console.log(err);
        }
      }

      // Load the users teams.
      $scope.userTeamsLoading = true;
      var userTeamsPromise = $http.get(AppConfig.apiBase + '/team/all').then(function(result) {
        $scope.userTeams = result.data;
        $scope.userTeamsLoading = false;

        // Separate out the teams that the current user owns, to save an api call.
        $scope.currentProjectEligibleTeams = _.filter(result.data, {owner: $scope.user._id});
      });

      // Load the projects teams.
      $scope.projectTeamsLoading = true;
      var projectTeamsPromise = $http.get(AppConfig.apiBase + '/team/project/' + $scope.currentProject._id).then(function(result) {
        $scope.currentProjectTeams = result.data;
        $scope.projectTeamsLoading = false;
      });

      var primaryProjectPromise;
      if ($scope.currentProject.project) {
        // This is an environment. Load the primary Project
        primaryProjectPromise = (new Formio('/project/' + $scope.currentProject.project)).loadProject();
      }
      else {
        // This is the primary environment.
        primaryProjectPromise = $q.when($scope.currentProject);
      }
      primaryProjectPromise.then(function(primaryProject) {
        $scope.primaryProject = primaryProject;
        Formio.loadProjects('?project=' + $scope.primaryProject._id).then(function(environments) {
          $scope.environments = environments;
        });
      });

      // Calculate the users highest role within the project.
      $q.all([userTeamsPromise, projectTeamsPromise]).then(function() {
        var roles = _.has($scope.user, 'roles') ? $scope.user.roles : [];
        var teams = _($scope.userTeams ? $scope.userTeams : [])
          .map('_id')
          .filter()
          .value();
        var allRoles = _(roles.concat(teams)).filter().value();
        var highestRole = null;

        /**
         * Determine if the user contains a role of the given type.
         *
         * @param {String} type
         *   The type of role to search for.
         * @returns {boolean}
         *   If the current user has the role or not.
         */
        var hasRoles = function(type) {
          var potential = _($scope.currentProjectTeams)
            .filter({permission: type})
            .map('_id')
            .value();
          return (_.intersection(allRoles, potential).length > 0);
        };

        $scope.projectPermissions = {
          read: true,
          write: true,
          admin: true
        };
        if (_.has($scope.user, '_id') && _.has($scope.currentProject, 'owner') &&  ($scope.user._id === $scope.currentProject.owner)) {
          highestRole = 'owner';
        }
        else if (hasRoles('team_admin')) {
          highestRole = 'team_admin';
        }
        else if (hasRoles('team_write')) {
          highestRole = 'team_write';
          $scope.projectPermissions.admin = false;
        }
        else if (hasRoles('team_read')) {
          highestRole = 'team_read';
          $scope.projectPermissions.admin = false;
          $scope.projectPermissions.write = false;
        }
        else {
          highestRole = 'anonymous';
        }

        $scope.highestRole = highestRole;
      });

      $scope.projectSettingsVisible = function() {
        return ($scope.highestRole === 'owner' || $scope.highestRole === 'team_admin');
      };
    }).catch(function(err) {
      if (!err) {
        FormioAlerts.addAlert({
          type: 'danger',
          message: window.location.origin + ' is not allowed to access the API. To fix this, go to your project page on https://form.io and add ' + window.location.origin + ' to your project CORS settings.'
        });
      }
      else {
        var error = err.message || err;
        if(typeof err === 'object') {
          error = JSON.stringify(error);
        }
        FormioAlerts.addAlert({
          type: 'danger',
          message: 'Could not load Project (' + error + ')'
        });
      }
      $state.go('home');
    });

    $scope.getRole = function(id) {
      return _.find($scope.currentProjectRoles, {_id: id});
    };

    $scope.getSwaggerURL = function(format) {
      return AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/spec.json';
    };

    $scope.getPlanName = ProjectPlans.getPlanName.bind(ProjectPlans);
    $scope.getPlanLabel = ProjectPlans.getPlanLabel.bind(ProjectPlans);
    $scope.getAPICallsLimit = ProjectPlans.getAPICallsLimit.bind(ProjectPlans);
    $scope.getAPICallsPercent = ProjectPlans.getAPICallsPercent.bind(ProjectPlans);
    $scope.getProgressBarClass = ProjectPlans.getProgressBarClass.bind(ProjectPlans);
    $scope.showUpgradeDialog = ProjectUpgradeDialog.show.bind(ProjectUpgradeDialog);
  }
]);

app.controller('ProjectDeployController', [
  '$scope',
  function($scope) {
    // This just fakes it for now.
    $scope.versions = [
      '1.0.0',
      '1.0.1',
      '1.0.2',
      '1.1.0',
      '1.2.0',
      '1.2.1'
    ];
    $scope.deployVersion = $scope.versions[5];

    $scope.addVersion = function(version) {
      $scope.versions.push(version);
      $scope.version = '';
    }
  }
]);

app.controller('ProjectBuildController', [
  '$scope',
  '$http',
  function($scope, $http) {
    // This is restricted to form.io domains.
    var key = 'AIzaSyDms9ureQ45lp6BT6LuZtoANB_GcR2jZmE';
    $scope.currentSection.title = 'Building Applications on Form.io';
    $scope.currentSection.icon = 'fa fa-cubes';
    $scope.currentSection.help = 'https://help.form.io/intro/appdev/';
    $scope.angular1 = [];
    $scope.angular2 = [];
    $scope.react = [];

    $http.get('https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,id,snippet,status&maxResults=50&playlistId=PLL9kNSjqyfJ70DiT2Yn_8cCXGpEs_ReRb&key=' + key).then(function(result) {
      $scope.angular1 = result.data.items;
    });
    $http.get('https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,id,snippet,status&maxResults=50&playlistId=PLL9kNSjqyfJ5Mj5FvZ7gL4MZj5o4yN5Sg&key=' + key).then(function(result) {
      $scope.react = result.data.items;
    });
    $http.get('https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,id,snippet,status&maxResults=50&playlistId=PLL9kNSjqyfJ51N9rw0Wnqu6Yl8OMZdE-Q&key=' + key).then(function(result) {
      $scope.angular2 = result.data.items;
    });
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

app.provider('ProjectProgress', function() {
  // TODO: Should we make this configurable with a register function?
  var stepDefinitions;
  var steps = {};
  var project;
  var forms = [];
  var userForms = [];
  var states = {};
  var formio;

  this.$get = [
    '$rootScope',
    '$q',
    'Formio',
    'AppConfig',
    function(
      $rootScope,
      $q,
      Formio,
      AppConfig
    ) {
      stepDefinitions = [
        {
          key: 'createProject',
          complete: function(next) {
            next(true);
          }
        },
        {
          key: 'setupUsers',
          complete: function(next) {
            var promises = [];
            userForms.forEach(function(userForm) {
              var userFormio = new Formio(AppConfig.apiBase + '/project/' + userForm.project + '/form/' + userForm._id + '/submission');
              promises.push(userFormio.loadSubmissions());
            });
            $q.all(promises).then(function(results) {
              var hasUser = true;
              results.forEach(function(result) {
                if (result.length === 0) {
                  hasUser = false;
                }
              });
              next(hasUser);
            });
          }
        },
        {
          key: 'modifyForm',
          complete: function(next) {
            formio.loadForms({
                params: {
                  limit: Number.MAX_SAFE_INTEGER // Don't limit results
                }
              })
              .then(function(projectForms) {
                forms = projectForms;
                forms.forEach(function(form) {
                  if (project && (new Date(project.created).getTime() + 10000) < new Date(form.modified).getTime()) {
                    return next(true);
                  }
                });
                next(false);
              });
          }
        },
        {
          key: 'setupProviders',
          complete: function(next) {
            var projectSettings = project.settings || {};
            var result = (projectSettings.email || projectSettings.storage);
            next(result);
          }
        },
        {
          key: 'cloneApp',
          route: 'project.launch.local'
        },
        {
          key: 'newForm',
          complete: function(next) {
            formio.loadForms({
                params: {
                  limit: Number.MAX_SAFE_INTEGER // Don't limit results
                }
              })
              .then(function(projectForms) {
                forms = projectForms;
                forms.forEach(function(form) {
                  if (project && (new Date(project.created).getTime() + 10000) < new Date(form.created).getTime()) {
                    return next(true);
                  }
                });
                next(false);
              });
          }
        },
        {
          key: 'launchApp',
          route: 'project.launch.app'
        }
      ];
      // Define route based steps.
      angular.forEach(stepDefinitions, function(step) {
        if (step.route) {
          states[step.route] = step.key;
        }
      });

      var saveStep = function(step) {
        if (project.steps.indexOf(step) === -1) {
          project.steps.push(step);
          formio.saveProject(project);
        }
      };

      var progress = {
        steps: steps,
        userForms: userForms,
        setProject: function(newProject) {
          project = newProject;
          if (project) {
            // Initialize new projects.
            if (!project.steps) {
              project.steps = [];
            }
            formio = new Formio(AppConfig.protocol + '//' + project.name + '.' + AppConfig.serverHost);

            formio.loadForms({
                params: {
                  limit: Number.MAX_SAFE_INTEGER // Don't limit results
                }
              })
              .then(function(projectForms) {
                forms = projectForms;

                // Empty userForms without breaking prototypical inheritance.
                userForms.length = 0;
                angular.forEach(forms, function(form) {
                  if (form.name === 'user' || (form.tags && form.tags.indexOf('user') !== -1)) {
                    userForms.push(form);
                  }
                });
                progress.checkComplete();
              });
          }
        },
        checkComplete: function(state) {
          if (!project) {
            return;
          }
          var promises = [];
          // Check for state changes
          if (state && states[state.name] && project.steps.indexOf(states[state.name]) === -1) {
            saveStep(states[state.name]);
          }

          // Check each complete function
          angular.forEach(stepDefinitions, function(step) {
            var defer = $q.defer();
            if (project.steps && project.steps.indexOf(step.key) !== -1) {
              defer.resolve({
                key: step.key,
                complete: true
              });
            }
            else if (typeof step.complete === 'function') {
              step.complete(function(result) {
                // If we evaluate to true and haven't before, save to project.
                if (result && project && project.steps.indexOf(step.key) === -1) {
                  saveStep(step.key);
                }
                defer.resolve({
                  key: step.key,
                  complete: result
                });
              });
            }
            else {
              defer.resolve({
                key: step.key,
                complete: false
              });
            }
            promises.push(defer.promise);
          });

          $q.all(promises).then(function(results) {
            var atIncomplete = false;
            var complete = 0;
            angular.forEach(results, function(result) {
              steps[result.key] = {
                complete: result.complete,
                open: false
              };
              if (steps[result.key].complete) {
                complete++;
              }
              else {
                if (!atIncomplete) {
                  steps[result.key].open = true;
                  atIncomplete = true;
                }
              }
            });
            $rootScope.stepsPercent = Math.round(complete / results.length * 20) * 5;
          });
        },
      };

      $rootScope.$on('$stateChangeSuccess', function(event, state) {
        progress.checkComplete(state);
      }).bind(this);

      return progress;
    }
  ];
});

app.controller('ProjectOverviewController', [
  '$scope',
  'ProjectProgress',
  '$stateParams',
  'AppConfig',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    ProjectProgress,
    $stateParams,
    AppConfig,
    Formio,
    FormioAlerts
  ) {
    $scope.currentSection.title = 'Overview';
    $scope.currentSection.icon = 'fa fa-dashboard';
    $scope.currentSection.help = '';

    $scope.steps = ProjectProgress.steps;
    $scope.userForms = ProjectProgress.userForms;

    var formio = new Formio(AppConfig.apiBase + '/project/' + $scope.currentProject._id);

    formio.loadForms({
        params: {
          limit: Number.MAX_SAFE_INTEGER // Don't limit results
        }
      })
      .then(function(forms) {
        $scope.forms = forms;
      }, FormioAlerts.onError.bind(FormioAlerts))
      .catch(FormioAlerts.onError.bind(FormioAlerts));

    var abbreviator = new NumberAbbreviate();

    $scope.hasTeams = function() {
      return $scope.currentProject.plan === 'team' || $scope.currentProject.plan === 'commercial';
    };

    $scope.getLastModified = function() {
      return _($scope.forms || [])
        .concat($scope.currentProjectRoles || [])
        .concat($scope.currentProject || {})
        .map(function(item) {
          return new Date(item.modified);
        })
        .max();
    };

    $scope.graphType = $stateParams.graphType;
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
          var url = AppConfig.apiBase + '/project/' + project + '/analytics/year/' + year;
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
        ProjectAnalytics.getSubmissionAnalytics($scope.currentProject._id, _y)
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
        ProjectAnalytics.getSubmissionAnalytics($scope.currentProject._id, _y, _m)
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

        ProjectAnalytics.getSubmissionAnalytics($scope.currentProject._id, _y, _m, _d)
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
  '$scope',
  '$sce',
  '$location',
  '$http',
  'Formio',
  'FormioAlerts',
  'AppConfig',
  function(
    $scope,
    $sce,
    $location,
    $http,
    Formio,
    FormioAlerts,
    AppConfig
  ) {
    $scope.currentSection.title = 'Launch';
    $scope.currentSection.icon = 'fa fa-rocket';
    $scope.currentSection.help = 'https://help.form.io/embedding/';
    $scope.hasTemplate = true;
    var formio = new Formio(AppConfig.apiBase + '/project/' + $scope.currentProject._id);

    formio.loadForms({
        params: {
          limit: Number.MAX_SAFE_INTEGER // Don't limit results
        }
      })
      .then(function(forms) {
        $scope.forms = forms;
      }, FormioAlerts.onError.bind(FormioAlerts))
      .catch(FormioAlerts.onError.bind(FormioAlerts));

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
      var parts = $scope.repo.split('/');
      $scope.appFolder = parts[parts.length - 1];
    });
    $scope.$watch('project', function(newProject, oldProject) {
      if (newProject && newProject.name) {
        $scope.projectApi = AppConfig.protocol + '//' + newProject.name + '.' + AppConfig.serverHost;
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
  'FormioAlerts',
  function(
    $scope,
    Formio,
    AppConfig,
    $window,
    $http,
    FormioAlerts
  ) {
    $scope.currentSection.title = 'Admin Data';
    $scope.currentSection.icon = 'glyphicon glyphicon-globe';
    $scope.currentSection.help = '';
    $scope.views = ['Overview', 'Current', 'Usage', 'Users', 'Projects', 'Upgrades'];
    $scope.view = $scope.views[0];
    $scope.showDaily = false;
    $scope.showCreated = false;
    $scope.showIds = false;
    $scope.showEmployees = false;
    var _employees = null;

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

    $scope.plans = ['basic', 'independent', 'team', 'commercial'];
    $scope.input = {
      project: '',
      plan: $scope.plans[0]
    };
    $scope.updateProject = function() {
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
        }
      })
      .catch(function(err) {
        FormioAlerts.addAlert({
          type: 'danger',
          message: err.message || err
        });
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
  }
]);

app.controller('ProjectSettingsController', [
  '$scope',
  '$rootScope',
  '$state',
  'GoogleAnalytics',
  'FormioAlerts',
  '$http',
  'AppConfig',
  function(
    $scope,
    $rootScope,
    $state,
    GoogleAnalytics,
    FormioAlerts,
    $http,
    AppConfig
  ) {
    if (!$scope.highestRole || ($scope.highestRole && ['team_read', 'team_write'].indexOf($scope.highestRole) !== -1)) {
      // this is constantly going to overview on reload.
      //$state.go('project.env.overview');
      //return;
    }

    $scope.currentSection.title = 'Settings';
    $scope.currentSection.icon = 'fa fa-cogs';
    $scope.currentSection.help = 'https://help.form.io/userguide/#settings-project';
    // Go to first settings section
    if($state.current.name === 'project.settings') {
      $state.go('project.settings.project', {location: 'replace'});
    }

    $scope.loadProjectPromise.then(function() {
      // Mask child scope's reference to currentProject with a clone
      // Parent reference gets updated when we reload after saving
      $scope.currentProject.plan = $scope.currentProject.plan || 'basic';
      $scope.currentProject = _.cloneDeep($scope.currentProject);
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
      $scope.currentProject.settings.keys.push({
        name: 'Key ' + keyIndex,
        key: chance.string({
          length: 30,
          pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        })
      });
    };

    $scope.removeKey = function($index) {
      $scope.currentProject.settings.keys.splice($index, 1);
    };

    // Save the Project.
    $scope.saveProject = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentProject.name) {
        $scope.currentProject.name = $scope.currentProject.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      if (!$scope.currentProject._id) { return FormioAlerts.onError(new Error('No Project found.')); }
      $scope.formio.saveProject($scope.currentProject)
        .then(function(project) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Project saved.'
          });
          GoogleAnalytics.sendEvent('Project', 'update', null, 1);
          // Reload state so alerts display and project updates.
          $state.go($state.current.name, {
            projectId: project._id
          }, {reload: true});
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    $scope.authenticatedWithOAuth = false;
    $scope.verifiedOAuth = false;

    // Oauth verification for atlassian
    $scope.loginWithOAuth = function() {
      $http.post(AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/atlassian/oauth/authorize')
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
      $http.post(AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/atlassian/oauth/finalize', {
        oauth_verifier: $scope.currentProject.settings.atlassian.oauth.oauth_verifier
      })
      .then(function(result) {
        $scope.verifiedOAuth = true;
        var data = result.data;
        $scope.currentProject.settings.atlassian.oauth.token = data.access_token;
        $scope.saveProject();
      })
      .catch(function(error) {
        FormioAlerts.onError({
          message: error.data
        });
      });
    };
  }
]);

app.controller('ProjectTeamViewController', [
  '$scope',
  'TeamPermissions',
  function(
    $scope,
    TeamPermissions
  ) {
    $scope.getPermissionLabel = TeamPermissions.getPermissionLabel.bind(TeamPermissions);
  }
]);

app.controller('ProjectTeamEditController', [
  '$scope',
  '$state',
  'FormioAlerts',
  'GoogleAnalytics',
  '$stateParams',
  'AppConfig',
  '$http',
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics,
    $stateParams,
    AppConfig,
    $http
  ) {
    $scope.addTeam = {
      _id: ($stateParams.teamId !== null) ? $stateParams.teamId : null,
      permission: ($stateParams.permission !== null) ? $stateParams.permission : null
    };

    if($scope.addTeam._id && !$scope.addTeam.permission) {
      $scope.addTeam.permission = _.filter($scope.currentProjectTeams, {_id: $scope.addTeam._id})[0].permission;
    }

    // Only allow users to select teams that do not have permissions yet.
    var current = _.map($scope.currentProjectTeams, '_id');

    // If editing a old permission, only allow the current team to be edited.
    if($scope.addTeam._id) {
      $scope.uniqueEligibleTeams = _.filter($scope.currentProjectTeams, {_id: $scope.addTeam._id});
    }
    else {
      // Get the latest team data.
      $http.get(AppConfig.apiBase + '/team/all').then(function(result) {
        $scope.userTeams = result.data;
        $scope.userTeamsLoading = false;

        // Separate out the teams that the current user owns, to save an api call.
        $scope.currentProjectEligibleTeams = _.filter(result.data, {owner: $scope.user._id});
        $scope.uniqueEligibleTeams = _.filter($scope.currentProjectEligibleTeams, function(team) {
          return (current.indexOf(team._id) === -1);
        });
      });
    }

    // Save the new team access with the existing project permissions.
    $scope.saveTeam = function() {
      var access = $scope.currentProject.access ||  [];
      var found = false;

      // Search the present permissions to add the new permission.
      access = _.forEach(access, function(permission) {
        // Remove all the old permissions.
        permission.roles = permission.roles || [];
        permission.roles = _.without(permission.roles, $scope.addTeam._id);

        // Add the given role to the new permission type.
        if (permission.type === $scope.addTeam.permission) {
          found = true;

          permission.roles = permission.roles || [];
          permission.roles.push($scope.addTeam._id);
        }
      });

      // This team permission was not found, add it.
      if(!found) {
        access.push({
          type: $scope.addTeam.permission,
          roles: [$scope.addTeam._id]
        });
      }

      // Update the current project access with the new team access.
      $scope.currentProject.access = access;

      // Use the formio service to save the current project.
      if (!$scope.currentProject._id) { return FormioAlerts.onError(new Error('No Project found.')); }
      $scope.formio.saveProject($scope.currentProject)
        .then(function(project) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Team saved.'
          });
          GoogleAnalytics.sendEvent('Project', 'update', null, 1);
          // Reload state so alerts display and project updates.
          $state.go('project.settings.teams.view', null, {reload: true});
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ProjectTeamDeleteController', [
  '$scope',
  '$stateParams',
  'FormioAlerts',
  'GoogleAnalytics',
  '$state',
  function(
    $scope,
    $stateParams,
    FormioAlerts,
    GoogleAnalytics,
    $state
  ) {
    $scope.removeTeam = _.filter($scope.currentProjectTeams, {_id: $stateParams.teamId})[0];
    $scope.saveTeam = function() {
      if(!$scope.removeTeam || !$scope.removeTeam) return $state.go('project.settings.teams.view', null, {reload: true});

      // Search the present permissions to remove the given permission.
      var access = $scope.currentProject.access ||  [];
      access = _.forEach(access, function(permission) {
        permission.roles = permission.roles || [];
        permission.roles = _.without(permission.roles, $scope.removeTeam._id);
      });

      // Update the current project access with the new team access.
      $scope.currentProject.access = access;

      // Use the formio service to save the current project.
      if (!$scope.currentProject._id) { return FormioAlerts.onError(new Error('No Project found.')); }
      $scope.formio.saveProject($scope.currentProject)
        .then(function(project) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Team removed.'
          });
          GoogleAnalytics.sendEvent('Project', 'update', null, 1);
          // Reload state so alerts display and project updates.
          $state.go('project.settings.teams.view', null, {reload: true});
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ProjectPlanController', [
  '$scope',
  function($scope) {
    $scope.submission = {
      data: {
        project: $scope.currentProject._id
      }
    };
    $scope.$on('formSubmission', function() {
      $scope.submitted = true;
    });
  }
]);

app.controller('ProjectEnvironmentAddController', [
  '$scope',
  '$state',
  'FormioProject',
  function(
    $scope,
    $state,
    FormioProject
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

    $scope.environment = {
      title: '',
      type: 'hosted',
      project: $scope.primaryProject._id
    };

    $scope.saveEnvironment = function() {
      FormioProject.createProject($scope.environment).then(function(project) {
        $state.go('project.env.overview', {projectId: project._id});
      });
    }
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

    $http.get(AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/dropbox/auth')
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
            $http.post(AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/dropbox/auth', params)
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
      $http.post(AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/dropbox/auth', {})
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
  function(
    $scope,
    $state,
    FormioAlerts,
    GoogleAnalytics
  ) {
    $scope.deleteProject = function() {
      if (!$scope.currentProject || !$scope.currentProject._id) { return; }
      $scope.formio.deleteProject()
        .then(function() {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Project was deleted!'
          });
          GoogleAnalytics.sendEvent('Project', 'delete', null, 1);
          $state.go('home');
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.factory('ProjectUpgradeDialog', [
  '$rootScope',
  '$state',
  'Formio',
  'FormioAlerts',
  'ngDialog',
  'AppConfig',
  'ProjectPlans',
  'UserInfo',
  '$http',
  function(
    $rootScope,
    $state,
    Formio,
    FormioAlerts,
    ngDialog,
    AppConfig,
    ProjectPlans,
    UserInfo,
    $http
  ) {
    return {
      show: function(project) {
        if ($rootScope.user._id !== project.owner) {
          FormioAlerts.onError({
            message: 'You must be a project\'s owner to upgrade its plan.'
          });
          return;
        }
        ngDialog.open({
          template: 'views/project/upgradeDialog.html',
          showClose: true,
          className: 'ngdialog-theme-default project-upgrade',
          controller: [
            '$scope',
            function($scope) {
              var loadPaymentInfo = function() {
                $scope.paymentInfoLoading = true;
                UserInfo.getPaymentInfo()
                .then(function(paymentInfo) {
                  $scope.paymentInfo = paymentInfo;
                  $scope.paymentInfoLoading = false;
                }, FormioAlerts.onError.bind(FormioAlerts))
                .catch(FormioAlerts.onError.bind(FormioAlerts));
              };

              loadPaymentInfo();

              var getActiveForm = function() {
                if(!$scope.paymentInfoLoading && !$scope.paymentInfo) {
                  return $scope.paymentForm;
                }
              };

              $scope.$on('formSubmission', function() {
                if(getActiveForm() === $scope.paymentForm) {
                  loadPaymentInfo();
                }
              });

              $scope.changePaymentInfo = function() {
                $scope.paymentInfo = null;
              };
              $scope.setSelectedPlan = function(plan) {
                $scope.selectedPlan = plan;
              };

              $scope.upgradeProject = function(plan) {
                $http.post(AppConfig.apiBase + '/project/' + project._id + '/upgrade',
                  {plan: plan}
                )
                .then(function() {
                  $scope.closeThisDialog(true);
                  Formio.clearCache();
                  $state.reload();
                }, FormioAlerts.onError.bind(FormioAlerts))
                .catch(FormioAlerts.onError.bind(FormioAlerts));
              };

              $scope.capitalize = _.capitalize;
              $scope.plans = ProjectPlans.getPlans();
              $scope.getPlan = ProjectPlans.getPlan.bind(ProjectPlans);
              $scope.paymentForm = AppConfig.paymentForm;
              $scope.commercialContactForm = AppConfig.commercialContactForm;
              $scope.commercialContactSubmission = {
                data: {
                  project: project._id,
                  contactName: $rootScope.user.data.fullName,
                  contactEmail: $rootScope.user.data.email
                }
              };

              // Default to the team plan for upgrades, unless they are already team pro, then show commercial.
              $scope.selectedPlan = ($scope.getPlan(project.plan).order < ProjectPlans.plans.team.order) ? _.find($scope.plans, {order: ProjectPlans.plans.team.order}) : _.find($scope.plans, {order: ProjectPlans.plans.commercial.order});

              // Display the selected plan, by name.
              if ($scope.selectedPlan) {
                $scope.selectedPlan = $scope.selectedPlan.name;
              }
              // When the plan is unknown, default to team pro.
              if ($scope.selectedPlan === undefined) {
                $scope.selectedPlan = 'team';
              }

            }
          ]
        });
      }
    };
  }
]);
