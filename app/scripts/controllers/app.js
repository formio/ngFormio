'use strict';
var app = angular.module('formioApp.controllers.app', []);
app.controller('AppIndexController', [
  '$scope',
  '$rootScope',
  'Restangular',
  function(
    $scope,
    $rootScope,
    Restangular
  ) {
    $rootScope.noBreadcrumb = false;
    $rootScope.currentApp = false;
    $rootScope.currentForm = false;
    $scope.apps = Restangular.all('app').getList().$object;
  }
]);

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

app.controller('AppCreateController', [
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
    $scope.currentApp = {};
    $scope.users = [];
    $scope.refreshUsers = refreshUsers(new Formio($rootScope.userForm), $scope);
    $scope.saveApplication = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentApp.name) {
        $scope.currentApp.name = $scope.currentApp.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      Restangular.all('app').post($scope.currentApp).then(function(app) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'New application created!'
        });
        $state.go('app.view', {appId: app._id});
      }, function(error) {
        if (error.data.message && error.data.message.indexOf('duplicate key error index') !== -1) {
          error.data.errors.name = {
            path: 'name',
            message: 'Application domain already exists. Please pick a different domain.'
          };
        }
        FormioAlerts.onError(error);
      });
    };
  }
]);

app.controller('AppController', [
  '$scope',
  '$rootScope',
  '$stateParams',
  'Formio',
  'FormioAlerts',
  '$state',
  function(
    $scope,
    $rootScope,
    $stateParams,
    Formio,
    FormioAlerts,
    $state
  ) {
    $rootScope.activeSideBar = 'apps';
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
    $scope.formio = new Formio('/app/' + $stateParams.appId);
    $scope.currentApp = {_id: $stateParams.appId, access: []};
    $scope.formio.loadApp().then(function(result) {
      $scope.currentApp = result;
      $rootScope.currentApp = result;
    });

    // Save the application.
    $scope.saveApplication = function() {
      // Need to strip hyphens at the end before submitting
      if($scope.currentApp.name) {
        $scope.currentApp.name = $scope.currentApp.name.toLowerCase().replace(/[^0-9a-z\-]|^\-+|\-+$/g, '');
      }

      if (!$scope.currentApp._id) { return FormioAlerts.onError(new Error('No application found.')); }
      $scope.formio.saveApp($scope.currentApp).then(function (app) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Application saved.'
        });
        $state.go('app.view', {
          appId: app._id
        });
      }, function(error) {
        FormioAlerts.onError(error);
      });
    };
  }
]);

app.controller('AppEditController', [
  '$scope',
  '$rootScope',
  '$state',
  'Formio',
  function(
    $scope,
    $rootScope,
    $state,
    Formio
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.users = [];
    $scope.refreshUsers = refreshUsers(new Formio($rootScope.userForm), $scope);
  }
]);

app.controller('AppSettingsController', [
  '$scope',
  function(
    $scope
  ) {
    $scope.active = 'email';
    $scope.subActive = '';
  }
]);

app.controller('AppDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.deleteApp = function() {
      if (!$scope.currentApp || !$scope.currentApp._id) { return; }
      $scope.formio.deleteApp().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Application was deleted!'
        });
        $state.go('home');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
