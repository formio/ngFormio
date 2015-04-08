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

app.controller('AppCreateController', [
  '$scope',
  '$rootScope',
  '$state',
  'Restangular',
  'FormioAlerts',
  function(
    $scope,
    $rootScope,
    $state,
    Restangular,
    FormioAlerts
  ) {
    $rootScope.noBreadcrumb = false;
    $scope.app = {};
    $scope.createApplication = function() {
      Restangular.all('app').post($scope.app).then(function(app) {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'New application created!'
        });
        $state.go('viewApp', {appId: app._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('AppController', [
  '$scope',
  '$rootScope',
  '$stateParams',
  'Restangular',
  function(
    $scope,
    $rootScope,
    $stateParams,
    Restangular
  ) {
    $rootScope.activeSideBar = 'apps';
    $rootScope.noBreadcrumb = false;
    $scope.currentApp = {_id: $stateParams.appId};
    Restangular.one('app', $stateParams.appId).get().then(function(result) {
      $scope.currentApp = result;
      $rootScope.currentApp = result;
    });
  }
]);
