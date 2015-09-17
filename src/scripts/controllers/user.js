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

app.controller('ResetPasswordSendController', [
  '$scope',
  '$state',
  '$rootScope',
  function(
    $scope,
    $state
  ) {
    $scope.$on('formSubmission', function(err, submission) {
      if (!submission) { return; }
      $state.go('auth-resetpass-send-done');
    });
  }
]);

app.controller('ResetPasswordController', [
  '$scope',
  '$state',
  '$rootScope',
  '$stateParams',
  function(
    $scope,
    $state,
    $rootScope,
    $stateParams
  ) {
    $scope.resetPassFormWithToken = $rootScope.resetPassForm + '?x-jwt-token=' + $stateParams['x-jwt-token'];
    $scope.$on('formSubmission', function(err, submission) {
      if (!submission) { return; }
      $state.go('auth-resetpass-done');
    });
  }
]);
