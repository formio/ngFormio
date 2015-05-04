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
  function(
    $scope,
    $rootScope,
    $stateParams,
    Formio
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
  }
]);

app.controller('AppEditController', [
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
    $rootScope.noBreadcrumb = false;
    $scope.users = [];
    $scope.refreshUsers = refreshUsers(new Formio($rootScope.userForm), $scope);
    $scope.saveApplication = function() {
      if (!$scope.currentApp._id) { return FormioAlerts.onError(new Error('No application found.')); }
      $scope.formio.saveApp($scope.currentApp).then(function () {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Application saved.'
        });
        $state.go('home');
      }).error(FormioAlerts.onError.bind(FormioAlerts));
    };
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
      }).error(FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
