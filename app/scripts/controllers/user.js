'use strict';
var app = angular.module('formioApp.controllers.user', []);
app.controller('UserIndexController', [
  '$scope',
  '$rootScope',
  function(
    $scope,
    $rootScope
  ) {
    $rootScope.activeSideBar = 'user';
    $rootScope.noBreadcrumb = true;
  }
]);
