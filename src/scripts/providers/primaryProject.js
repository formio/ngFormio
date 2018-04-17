'use strict';

var app = angular.module('formioApp');

app.factory('PrimaryProject', [
  'AppConfig',
  '$q',
  '$http',
  function (AppConfig, $q, $http) {
    var scope = false;

    return {
      set: function (project, $scope) {

        // Don't recalculate if primary project hasn't changed.
        if (scope && project._id === scope.primaryProject._id) {
          return _.assign($scope, scope);
        }

        scope = {};

        scope.primaryProject = project;
        var highestRoleQ = $q.defer();
        scope.highestRoleLoaded = highestRoleQ.promise;

        // Load project environments
        $http.get(AppConfig.apiBase + '/project?project=' + project._id).then(function (result) {
          scope.environments = result.data;
          _.assign($scope, scope);
        });

        // Load the projects teams.
        $http.get(AppConfig.apiBase + '/team/project/' + project._id).then(function (result) {
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
              read: true,
              write: true,
              admin: true
            };
            if (_.has($scope.user, '_id') && _.has($scope.localProject, 'owner') && ($scope.user._id === $scope.localProject.owner)) {
              highestRole = 'owner';
            }
            else if (hasRoles('team_admin')) {
              highestRole = 'team_admin';
            }
            else if (hasRoles('team_write')) {
              highestRole = 'team_write';
              scope.projectPermissions.admin = false;
            }
            else if (hasRoles('team_read')) {
              highestRole = 'team_read';
              scope.projectPermissions.admin = false;
              scope.projectPermissions.write = false;
            }
            else {
              highestRole = 'anonymous';
            }

            scope.highestRole = highestRole;
            _.assign($scope, scope);
            highestRoleQ.resolve();
          });
        });
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
  }
]);
