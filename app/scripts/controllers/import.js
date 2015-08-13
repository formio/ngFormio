'use strict';

var app = angular.module('formioApp.controllers.import', []);

app.controller('ImportExportController', [
  '$scope',
  '$rootScope',
  function(
    $scope,
    $rootScope
  ) {
    $rootScope.activeSideBar = 'import';
    $rootScope.noBreadcrumb = true;
  }
]);
