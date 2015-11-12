'use strict';

var app = angular.module('formioApp.controllers.project', []);

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
      ngModel.$asyncValidators.unique = function(modelValue, viewValue) {
        $scope.param = $scope.param || 'name';
        $scope.resultProp = $scope.resultProp || 'available';
        var value = modelValue || viewValue;
        var req = {};
        req[$scope.param] = value;

        if(!value) {
          return $q.reject();
        }

        return $http.post(Formio.baseUrl + $scope.url, req)
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
  '$http',
  'GoogleAnalytics',
  function(
    $scope,
    $rootScope,
    $state,
    FormioAlerts,
    Formio,
    $http,
    GoogleAnalytics
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.currentProject = {template: 'default'};
    $scope.hasTemplate = false;
    $scope.showName = false;
    var formio = new Formio();

    // The project templates.
    $scope.templates = [
      {
        title: 'Default',
        template: 'default'
      },
      {
        title: 'Empty',
        template: 'empty'
      }
    ];

    $scope.loadTemplate = function() {
      var input = angular.element(this).get(0);
      if (!input || input.length === 0) {
        return;
      }
      var template = input.files[0];

      if (typeof window.FileReader !== 'function') {
        return;
      }

      if (!template) {
        return;
      }

      // Read the file.
      var reader = new FileReader();
      reader.onload = function(e) {
        $scope.currentProject.template = JSON.parse(e.target.result);
        $scope.hasTemplate = true;
        $scope.$apply();
      };
      reader.readAsText(template);
    };

    // Try to load the external template source.
    $http.get(
      'https://cdn.rawgit.com/formio/help.form.io/gh-pages/templates/index.json',
      {
        disableJWT: true,
        headers: {
          Authorization: undefined,
          Pragma: undefined,
          'Cache-Control': undefined
        }
      }
    ).success(function (result) {
      angular.forEach(result, function(template) {
        if (template.name === $scope.currentProject.template) {
          $scope.currentProject.template = template.template;
        }
      });
      $scope.templates = result;
    });

    $scope.saveProject = function() {
      // Default all new projects to have cors set to '*'.
      if (!$scope.currentProject.settings) {
        $scope.currentProject.settings = {};
      }
      if (!$scope.currentProject.settings.cors) {
        $scope.currentProject.settings.cors = '*';
      }

      formio.saveProject($scope.currentProject).then(function(project) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'New Project created!'
        });
        GoogleAnalytics.sendEvent('Project', 'create', null, 1);
        $state.go('project.edit', {projectId: project._id});
      }, function(error) {
        if (error.data && error.data.message && error.data.message.indexOf('duplicate key error index') !== -1) {
          error.data.errors.name = {
            path: 'name',
            message: 'Project domain already exists. Please pick a different domain.'
          };
        }
        FormioAlerts.onError(error);
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
  '$http',
  function(
    $scope,
    $rootScope,
    $stateParams,
    Formio,
    FormioAlerts,
    $state,
    AppConfig,
    $http
  ) {
    $rootScope.activeSideBar = 'projects';
    $rootScope.noBreadcrumb = false;
    $scope.token = Formio.getToken();
    $scope.resourcesLoading = true;
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
    $scope.rolesLoading = true;
    $scope.loadProjectPromise = $scope.formio.loadProject().then(function(result) {
      $scope.currentProject = result;
      $rootScope.currentProject = result;
      $scope.showName = !(result.plan && result.plan === 'community');
      return $http.get($scope.formio.projectUrl + '/role');
    }).then(function(result) {
      $scope.currentProjectRoles = result.data;
      $scope.rolesLoading = false;
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
      format = format || 'html';
      return AppConfig.apiBase + '/project/' + $scope.currentProject._id + '/spec.' + format + '?token=' + Formio.getToken();
    };
  }
]);

app.controller('ProjectSettingsController', [
  '$scope',
  '$rootScope',
  '$state',
  'GoogleAnalytics',
  'FormioAlerts',
  function(
    $scope,
    $rootScope,
    $state,
    GoogleAnalytics,
    FormioAlerts
  ) {
    // Go to first settings section
    if($state.current.name === 'project.settings') {
      $state.go('project.settings.project', {location: 'replace'});
    }
    $scope.loadProjectPromise.then(function() {
      // Mask child scope's reference to currentProject with a clone
      // Parent reference gets updated when we reload after saving
      $scope.currentProject.plan = $scope.currentProject.plan || 'community';
      $scope.currentProject = _.cloneDeep($scope.currentProject);
    });

    // Save the Project.
    $scope.saveProject = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentProject.name) {
        $scope.currentProject.name = $scope.currentProject.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      if (!$scope.currentProject._id) { return FormioAlerts.onError(new Error('No Project found.')); }
      $scope.formio.saveProject($scope.currentProject).then(function(project) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Project saved.'
        });
        GoogleAnalytics.sendEvent('Project', 'update', null, 1);
        // Reload state so alerts display and project updates.
        $state.go($state.current.name, {
          projectId: project._id
        }, {reload: true});
      }, function(error) {
        FormioAlerts.onError(error);
      });
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
      $scope.formio.deleteProject().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Project was deleted!'
        });
        GoogleAnalytics.sendEvent('Project', 'delete', null, 1);
        $state.go('home');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
