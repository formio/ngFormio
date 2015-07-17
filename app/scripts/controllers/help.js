'use strict';

var app = angular.module('formioApp.controllers.help', []);

app.controller('HelpIndexController', [
  '$scope',
  '$rootScope',
  function(
    $scope,
    $rootScope
  ) {
    $rootScope.activeSideBar = 'help';
    $rootScope.noBreadcrumb = true;
  }
]);
