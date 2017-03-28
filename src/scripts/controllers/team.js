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
    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
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

app.controller('TeamViewController', [
  '$scope',
  '$stateParams',
  '$rootScope',
  'Formio',
  'AppConfig',
  'FormioAlerts',
  'GoogleAnalytics',
  '$state',
  'TeamPermissions',
  function(
    $scope,
    $stateParams,
    $rootScope,
    Formio,
    AppConfig,
    FormioAlerts,
    GoogleAnalytics,
    $state,
    TeamPermissions
  ) {
    $scope.getPermissionLabel = TeamPermissions.getPermissionLabel.bind(TeamPermissions);
    $scope.teamPermissionsLoaded = false;
    Formio.request(AppConfig.apiBase + '/team/' + $stateParams.teamId + '/projects', 'GET')
      .then(function(teams) {
        $scope.teamPermissionsLoaded = true;
        $scope.teamPermissions = teams;
      });

    $scope.leaveTeam = function(id) {
      // Always clear cache for the current teams.
      Formio.clearCache();

      if(!id) return $state.go('home', null, {reload: true});

      Formio.request(AppConfig.apiBase + '/team/' + id + '/leave', 'POST')
        .then(function() {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Team membership updated.'
          });
          GoogleAnalytics.sendEvent('Submission', 'update', null, 1);

          // Reload state so alerts display and project updates.
          $state.go('home', null, {reload: true});
        }, function(err) {
          console.log(err);
          $state.go('home', null, {reload: true});
        });
    };
  }
]);

app.controller('TeamAddController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Team was deleted.'
      });
      $state.go('project.teams.view');
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
    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
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
    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Team was deleted.'
      });
      $state.go('home');
    });
  }
]);
