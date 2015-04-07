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
    $rootScope.activeSideBar = 'apps';
    $rootScope.noBreadcrumb = false;
    $scope.apps = Restangular.all('app').getList().$object;
  }
]);

app.controller('AppViewController', [
  '$scope',
  '$rootScope',
  'Restangular',
  function(
    $scope,
    $rootScope,
    Restangular
  ) {
    $rootScope.activeSideBar = 'apps';
    $rootScope.noBreadcrumb = false;
    $scope.app = {};
    Restangular.one('app', $stateParams.appId).then(function(result) {
      console.log(result);
    });
  }
]);
