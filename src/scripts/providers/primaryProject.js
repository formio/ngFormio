'use strict';

var app = angular.module('formioApp');

app.factory('PrimaryProject', [
  'AppConfig',
  '$q',
  '$http',
  '$rootScope',
  function (AppConfig, $q, $http, $rootScope) {
    var scope = false;
    var PrimaryProject = {
      loadStages: function (project, $scope) {
        if ($scope.stagesProject && project._id === $scope.stagesProject._id) {
          return;
        }

        $scope.stagesProject = project;
        // Load project stages
        $http.get(AppConfig.apiBase + '/project?project=' + project._id + '&type=stage').then(function (result) {
          $scope.environments = result.data;
          $scope.environments.forEach(function(environment) {
            // If environment has a remote, load remote info for lastDeploy and modified.
            if (environment.remote) {
              var remoteProjectUrl = $rootScope.projectPath(environment.remote.project, environment.remote.url, environment.remote.type);
              $http.get(remoteProjectUrl).then(function(result) {
                environment.modified = result.data.modified;
                environment.lastDeploy = result.data.lastDeploy;
              });
            }
          });
        });
      },
      set: function (project, $scope) {

        // Don't recalculate if primary project hasn't changed.
        if (scope && project._id === scope.primaryProject._id) {
          if (!$scope.tenantProject) {
            PrimaryProject.loadStages(project, $scope);
          }
          $scope.highestRoleQ.resolve();
          return _.assign($scope, scope);
        }

        scope = {};

        scope.primaryProject = project;
        scope.highestRoleLoaded = $scope.highestRoleLoaded;
        scope.highestRoleQ = $scope.highestRoleQ;
        if (!$scope.tenantProject) {
          PrimaryProject.loadStages(project, $scope);
        }

        // Load the projects teams.
        $http.get(AppConfig.apiBase + '/team/project/' + project._id)
          .then(function (result) {
            scope.primaryProjectTeams = result.data;
            scope.projectTeamsLoading = false;
            _.assign($scope, scope);


            // Calculate the users highest role within the project.
            $q.all([$scope.userTeamsPromise, $scope.projectTeamsPromise]).then(function () {
              var roles = _.has($scope.user, 'roles') ? $scope.user.roles : [];
              var teams = _($scope.userTeams ? $scope.userTeams : [])
                .map('_id')
                .filter()
                .value();
              var allRoles = _(roles.concat(teams)).filter().value();
              var highestRole = null;
              /**
               * Determine if the user contains a role of the given type.
               *
               * @param {String} type
               *   The type of role to search for.
               * @returns {boolean}
               *   If the current user has the role or not.
               */
              var hasRoles = function (type) {
                if (scope.primaryProjectTeams) {
                  var potential = _(scope.primaryProjectTeams)
                    .filter({permission: type})
                    .map('_id')
                    .value();
                  return (_.intersection(allRoles, potential).length > 0);
                }
              };


              scope.projectPermissions = {
                access: false,
                read: false,
                write: false,
                admin: false
              };
              if (_.has($scope.user, '_id') && _.has($scope.localProject, 'owner') && ($scope.user._id === $scope.localProject.owner)) {
                highestRole = 'owner';
                scope.projectPermissions.admin = true;
                scope.projectPermissions.write = true;
                scope.projectPermissions.read = true;
                scope.projectPermissions.access = true;
              }
              else if (hasRoles('team_admin')) {
                highestRole = 'team_admin';
                scope.projectPermissions.admin = true;
                scope.projectPermissions.write = true;
                scope.projectPermissions.read = true;
                scope.projectPermissions.access = true;
              }
              else if (hasRoles('team_write')) {
                highestRole = 'team_write';
                scope.projectPermissions.write = true;
                scope.projectPermissions.read = true;
                scope.projectPermissions.access = true;
              }
              else if (hasRoles('team_read')) {
                highestRole = 'team_read';
                scope.projectPermissions.read = true;
                scope.projectPermissions.access = true;
              }
              else if (hasRoles('team_access')) {
                highestRole = 'team_access';
                scope.projectPermissions.access = true;
              }
              else {
                highestRole = 'anonymous';
              }

              scope.highestRole = highestRole;
              _.assign($scope, scope);
              $scope.highestRoleQ.resolve();
            }).catch((err) => $scope.highestRoleQ.reject(err))
          }).catch((err) => $scope.highestRoleQ.reject(err));
        return _.assign($scope, scope);
      },
      get: function ($scope) {
        if (scope) {
          _.assign($scope, scope);
        }
      },
      clear: function () {
        scope = false;
      }
    };
    return PrimaryProject;
  }
]);
