'use strict';
var app = angular.module('formioApp.controllers.app', []);
app.controller('AppIndexController', [
  '$scope',
  '$rootScope',
  function(
    $scope,
    $rootScope
  ) {
    $rootScope.activeSideBar = 'apps';
    $rootScope.noBreadcrumb = false;
  }
]);
