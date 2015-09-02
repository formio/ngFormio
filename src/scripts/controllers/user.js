'use strict';

var app = angular.module('formioApp.controllers.user', []);

app.controller('UserLoginController', [
  '$scope',
  '$state',
  '$rootScope',
  function(
    $scope,
    $state,
    $rootScope
  ) {
    $scope.$on('formSubmission', function(err, submission) {
      if (!submission) { return; }
      $rootScope.user = submission;
      $state.go('home');
    });
  }
]);

app.controller('UserRegisterController', [
  '$scope',
  '$state',
  '$rootScope',
  function(
    $scope,
    $state,
    $rootScope
  ) {
    $scope.$on('formSubmission', function(err, submission) {
      if (!submission) { return; }
      $rootScope.user = submission;
      $state.go('home');
    });
  }
]);
