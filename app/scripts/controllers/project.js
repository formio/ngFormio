'use strict';

var app = angular.module('formioApp.controllers.project', []);

var refreshUsers = function(userForm, $scope) {
  return function(filter) {
    userForm.loadSubmissions({params: {'data.name': filter}}).then(function(users) {
      $scope.users = [];
      angular.forEach(users, function(user) {
        $scope.users.push({
          id: user._id,
          name: user.data.name
        });
      });
    });
  };
};

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
  'Restangular',
  'FormioAlerts',
  'Formio',
  function(
    $scope,
    $rootScope,
    $state,
    Restangular,
    FormioAlerts,
    Formio
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.currentProject = {};
    $scope.users = [];
    $scope.refreshUsers = refreshUsers(new Formio($rootScope.userForm), $scope);
    $scope.saveProject = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentProject.name) {
        $scope.currentProject.name = $scope.currentProject.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      Restangular.all('project').post($scope.currentProject).then(function(project) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'New Project created!'
        });
        $state.go('project.edit', {projectId: project._id});
      }, function(error) {
        if (error.data.message && error.data.message.indexOf('duplicate key error index') !== -1) {
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
  '$http',
  function(
    $scope,
    $rootScope,
    $stateParams,
    Formio,
    FormioAlerts,
    $state,
    $http
  ) {
    $rootScope.activeSideBar = 'projects';
    $rootScope.noBreadcrumb = false;
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
      return $http.get($scope.formio.projectUrl + '/role');
    }).then(function(result) {
      $scope.currentProjectRoles = result.data;
      $scope.rolesLoading = false;
    });

    $scope.getRole = function(id) {
      return _.find($scope.currentProjectRoles, {_id: id});
    };
  }
]);

app.controller('ProjectSettingsController', [
  '$scope',
  '$rootScope',
  '$state',
  'FormioAlerts',
  'Formio',
  function(
    $scope,
    $rootScope,
    $state,
    FormioAlerts,
    Formio
  ) {
    // Go to first settings section
    if($state.current.name === 'project.settings') {
      $state.go('project.settings.project', {location: 'replace'});
    }

    $rootScope.noBreadcrumb = false;
    $scope.users = [];
    $scope.refreshUsers = refreshUsers(new Formio($rootScope.userForm), $scope);

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
        // Reload state so alerts display.
        $state.go($state.current.name, {
          projectId: project._id
        }, {reload: true});
      }, function(error) {
        FormioAlerts.onError(error);
      });
    };
  }
]);

app.controller('ProjectDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.deleteProject = function() {
      if (!$scope.currentProject || !$scope.currentProject._id) { return; }
      $scope.formio.deleteProject().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Project was deleted!'
        });
        $state.go('home');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
