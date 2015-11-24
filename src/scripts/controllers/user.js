'use strict';

var app = angular.module('formioApp.controllers.user', []);

app.controller('UserLoginController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      GoogleAnalytics.sendEvent('User', 'login', null, 1);
      $state.go('home');
    });
  }
]);

app.controller('UserRegisterController', [
  '$scope',
  '$state',
  '$rootScope',
  'GoogleAnalytics',
  function(
    $scope,
    $state,
    $rootScope,
    GoogleAnalytics
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $rootScope.user = submission;
      GoogleAnalytics.sendEvent('User', 'register', null, 1);
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
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
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
    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      if (!submission) { return; }
      $state.go('auth-resetpass-done');
    });
  }
]);

app.controller('ProfileController', [
  '$scope',
  '$rootScope',
  'Formio',
  function(
    $scope,
    $rootScope,
    Formio
  ) {
    $scope.isLinked = function() {
      if(!$scope.user) return false;
      return !!(_.find($scope.user.externalIds, {type: 'github'}));
    };

    $scope.userLoading = true;
    Formio.currentUser().then(function(user) {
      $rootScope.user = user;
      $scope.profileUrl = $rootScope.userForm + '/submission/' + $rootScope.user._id;
      $scope.userLoading = false;
    });

    $scope.$on('formSubmission', function(event, submission) {
      $rootScope.user = submission;
    });
  }
]);
