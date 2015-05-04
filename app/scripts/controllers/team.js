'use strict';

var app = angular.module('formioApp.controllers.team', []);

app.controller('TeamCreateController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New team created!'
      });
      $state.go('home');
    });
  }
]);

app.controller('TeamController', [
  '$scope',
  '$stateParams',
  '$rootScope',
  'Formio',
  function(
    $scope,
    $stateParams,
    $rootScope,
    Formio
  ) {
    $scope.teamUrl = $rootScope.teamForm + '/submission/' + $stateParams.teamId;
    $scope.team = {};
    $scope.formio = new Formio($scope.teamUrl);
    $scope.formio.loadSubmission().then(function(team) {
      $scope.team = team;
    });
  }
]);

app.controller('TeamEditController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $scope.$on('formSubmission', function() {
      $state.go('home');
    });
  }
]);

app.controller('TeamDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Team was deleted.'
      });
      $state.go('home');
    });
  }
]);