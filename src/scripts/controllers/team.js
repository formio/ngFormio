'use strict';

var app = angular.module('formioApp.controllers.team', []);

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
    $scope.loadTeamPromise = $scope.formio.loadSubmission().then(function(team) {
      $scope.team = team;
    });
  }
]);

app.controller('TeamCreateController', [
  '$rootScope',
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  'AppConfig',
  function(
    $rootScope,
    $scope,
    $state,
    Formio,
    FormioAlerts,
    AppConfig,
  ) {
    $scope.teamFormObj = {components: []};
    $scope.team = {data: {}, metadata: {}};
    $scope.team.data.members = [];
    $scope.team.data.admins = [];
    const teamFormio = (new Formio($rootScope.teamForm));
    teamFormio.loadForm().then((form) => {
      if ($rootScope.onPremise && AppConfig.sso) {
        form.components.splice(form.components.length - 2, 0, {
          type: 'checkbox',
          label: 'SSO Team',
          description: 'Check this if you wish this team to be mapped to a Single-Sign-On Role',
          key: 'ssoteam',
          input: true
        });
      }

      $scope.teamFormObj = form;
    });

    Formio.currentUser().then(function(user) {
      if (user && (user.data.name || user.data.email)) {
        $scope.team.data.members.push({
          _id: user._id,
          data: {
            name: user.data.name || user.data.email.substr(0, user.data.email.indexOf('@'))
          }
        });
      }
    });

    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      $scope.team.metadata.ssoteam = $scope.team.data.ssoteam;
      delete $scope.team.data.ssoteam;
      teamFormio.saveSubmission($scope.team).then((team) => {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'New team created!'
        });
        $state.go('team.view', { teamId: team._id });
      });
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
    $scope.ssoPortal = $rootScope.onPremise && AppConfig.sso;
    $scope.activeView = 'members';
    $scope.switchView = function(view) {
      $scope.activeView = view;
    };

    $scope.add = {
      Person: undefined
    };

    $scope.teamPermissionsLoaded = false;
    Formio.request(AppConfig.apiBase + '/team/' + $stateParams.teamId + '/projects', 'GET')
      .then(function(teams) {
        $scope.teamPermissionsLoaded = true;
        $scope.teamPermissions = teams;
      });

    $scope.isAdmin = false;
    $scope.loadTeamPromise.then(function() {
      Formio.currentUser().then(function(user) {
        $scope.isAdmin = $scope.team.owner === user._id || _.find($scope.team.data.admins, {_id: user._id});
      });
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
          FormioAlerts.addAlert({
            type: 'danger',
            message: err.message
          });
          $state.go('home', null, {reload: true});
        });
    };

    $scope.selectMembers = [];
    var notFoundMember = {
      data: {
        name: 'Not Found'
      }
    };

    $scope.refreshMembers = function(input) {
      Formio.request(AppConfig.apiBase + '/team/members?&name=' + input, 'GET')
        .then(function(members) {
          $scope.selectMembers = members.length ? members : [ _.clone(notFoundMember) ];
          $scope.$apply();
        });
    };

    $scope.saveTeam = function() {
      $scope.formio.saveSubmission(angular.copy($scope.team)).then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Team membership updated.'
        });
      }).catch(function(err) {
        FormioAlerts.addAlert({
          type: 'danger',
          message: err.message
        });
      });
    };

    $scope.changeRole = function(member, role) {
      $scope.add.Person = undefined;

      if (member.data.name === notFoundMember.data.name) {
        return;
      }

      _.remove($scope.team.data.admins, { _id: member._id });
      _.remove($scope.team.data.members, { _id: member._id });
      if (role) {
        $scope.team.data[role] = $scope.team.data[role] || [];
        $scope.team.data[role].push(member);
      }
      $scope.saveTeam();
    };
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

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go('team.view', { teamId: $scope.team._id });
    });
  }
]);
