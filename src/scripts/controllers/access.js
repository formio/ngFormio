'use strict';

var app = angular.module('formioApp.controllers.access', []);

app.controller('AccessController', ['$scope', function($scope) {
  $scope.permissionLabels = {
    'create_all': {
      label: 'Create All',
      tooltip: 'The Create All permission will allow a user with one of the given Roles to create a form, resource and role and define the Owner of the entity.',
      elevated: true
    },
    'read_all': {
      label: 'Read All',
      tooltip: 'The Read All permission will allow a user with one of the given Roles to read all forms, resources and roles as well as the project itself regardless of who owns the entity.',
      elevated: true
    },
    'update_all': {
      label: 'Update All',
      tooltip: 'The Update All permission will allow a user with one of the given Roles to update all forms, resources and roles as well as the project itself regardless of who owns the entity.',
      elevated: true
    },
    'delete_all': {
      label: 'Delete All',
      tooltip: 'The Delete All permission will allow a user with one of the given Roles to delete all forms, resources and roles as well as the project itself regardless of who owns the entity.',
      elevated: true
    },
    'create_own': {
      label: 'Create Own',
      tooltip: 'The Create Own permission will allow a user with one of the given Roles to create a form or resource and the user will be defined as its Owner.'
    },
    'read_own': {
      label: 'Read Own',
      tooltip: 'The Read Own permission will allow a user with one of the given Roles to read a form or resource if they are defined as its owner.'
    },
    'update_own': {
      label: 'Update Own',
      tooltip: 'The Update Own permission will allow a user with one of the given Roles to update a form or resource if they are defined as its owner.'
    },
    'delete_own': {
      label: 'Delete Own',
      tooltip: 'The Delete Own permission will allow a user with one of the given Roles to delete a form or resource if they are defined as its owner.'
    },
    'team_read': {
      label: 'Team Read',
      tooltip: 'The Team Read permission will allow a user on one of the given Teams the ability to read form definitions.'
    },
    'team_write': {
      label: 'Team Write',
      tooltip: 'The Team Write permission will allow a user on one of the given Teams the ability to read and edit form definitions.'
    },
    'team_admin': {
      label: 'Team Admin',
      tooltip: 'The Team Admin permission will allow a user on one of the given Teams the ability to read and edit form definitions, project settings, and submission data.'
    }
  };

  $scope.$on('permissionsChange', function() {
    $scope.saveProject();
  });
}]);

/**
 * Creates a table to edit permission roles.
 * Requires you pass the permissions array to edit as `permissions`
 * Requires you pass labels/tooltips for each permission type as `labels`. This should be an object like $scope.permissionLabels above.
 * Requires you pass Project roles as `roles`.
 * Can also pass promise as `waitFor` to wait for before initializing the permissions.
 */
app.directive('permissionEditor', ['$q', function($q) {
  var PERMISSION_TYPES = [
    'create_own',
    'create_all',
    'read_own',
    'read_all',
    'update_own',
    'update_all',
    'delete_own',
    'delete_all',
    'team_read',
    'team_write',
    'team_admin'
  ];

  return {
    scope: {
      roles: '=',
      permissions: '=',
      labels: '=',
      waitFor: '=',
      permissionFilter: '=?',
      protected: '=?'
    },
    restrict: 'E',
    templateUrl: 'views/project/access/access/permission-editor.html',
    link: function($scope) {
      // Fill in missing permissions / enforce order
      ($scope.waitFor || $q.when()).then(function() {
        var tempPerms = [];
        _.each(PERMISSION_TYPES, function(type) {
          var existingPerm = _.find($scope.permissions, {type: type});
          tempPerms.push(existingPerm || {
              type: type,
              roles: []
            });
        });
        // Replace permissions with complete set of permissions
        $scope.permissions.splice.apply($scope.permissions, [0, $scope.permissions.length].concat(tempPerms));
      });

      $scope.getPermissionsToShow = function() {
        return $scope.permissions.filter($scope.shouldShowPermission);
      };

      $scope.shouldShowPermission = function(permission) {
        if (!$scope.permissionFilter) {
          return !!$scope.labels[permission.type];
        }

        var found = false;
        var filters = $scope.permissionFilter.split(',');
        filters.forEach(function(item) {
          if (permission.type.indexOf(item) !== -1) {
            found = true;
          }
        });

        return (found && !!$scope.labels[permission.type]);
      };

      $scope.getPermissionLabel = function(permission) {
        return $scope.labels[permission.type].label;
      };

      $scope.getPermissionTooltip = function(permission) {
        return $scope.labels[permission.type].tooltip;
      };

      $scope.getPermissionElevated = function(permission) {
        return $scope.labels[permission.type].elevated || false;
      };

      $scope.onChange = function() {
        $scope.$emit('permissionsChange');
      };
    }
  };
}]);

app.directive('resourcePermissionEditor', ['$q', 'FormioUtils', function($q, FormioUtils) {
  var PERMISSION_TYPES = ['read', 'create', 'write', 'admin'];

  return {
    scope: {
      resources: '=',
      labels: '=',
      waitFor: '=',
      form: '='
    },
    restrict: 'E',
    templateUrl: 'views/project/access/access/resource-permission-editor.html',
    link: function($scope) {
      var resource = {
        input: true,
        label: 'Resource',
        key: 'resource',
        defaultValue: '',
        data: {
          values: [],
        },
        dataSrc: 'values',
        type: 'select',
      };

      $scope.template = {
        components: [
          {
            label: 'Resources',
            key: 'resources',
            type: 'datagrid',
            input: true,
            components: [
              resource,
              {
                input: true,
                label: 'Role (optional)',
                key: 'role',
                defaultValue: '',
                type: 'textfield',
              },
            ],
          },
        ],
      };

      $scope.submissions = {};

      ($scope.waitFor || $q.when()).then(function() {
        // Iterate the current resources and populate the known permissions.
        $scope.resources.forEach(function(component) {
          resource.data.values.push({
            value: component.key,
            label: component.label || component.placeholder || component.key,
          });

          if ((component.submissionAccess || component.defaultPermission) && component.key) {
            if (!component.submissionAccess) {
              component.submissionAccess = [
                {
                  type: component.defaultPermission,
                  roles: [],
                },
              ];
            }
            delete component.defaultPermission;

            component.submissionAccess.map(function(access) {
              var submission = $scope.submissions[access.type];

              if (!submission) {
                submission = {
                  data: {
                    resources: [],
                  }
                };
                $scope.submissions[access.type] = submission;
              }

              access.roles = _.compact(access.roles || []);

              submission.data.resources = submission.data.resources.concat(
                access.roles.length
                  ? access.roles.map(function(role) {
                    return {
                      resource: component.key,
                      role: role,
                    };
                  })
                  : {
                    resource: component.key,
                    role: '',
                  }
              );
            });
          }
        });

        PERMISSION_TYPES.forEach(function(permission) {
          $scope.submissions[permission] = $scope.submissions[permission] || {
            data: {
              resources: [
                {
                  resource: '',
                  role: '',
                },
              ],
            },
          };
        });

        $scope.$watch('submissions', function(newVal, oldVal) {
          if (!_.isEqual(newVal, oldVal)) {
            $scope.resources.forEach(function(component) {
              component.submissionAccess = [];

              _.forEach(newVal, function(submission, type) {
                var access = _.find(component.submissionAccess, {type: type});

                (submission.data.resources || []).forEach(function(resource) {
                  if (resource.resource === component.key) {
                    if (!access) {
                      access = {
                        type: type,
                        roles: [],
                      };
                      component.submissionAccess.push(access);
                    }

                    if (resource.role) {
                      access.roles.push(resource.role);
                    }
                  }
                });
              });

              if (!component.submissionAccess.length) {
                delete component.submissionAccess;
              }
            });

            $scope.onChange();
          }
        }, true);
      });

      $scope.getPermissionsToShow = function() {
        return PERMISSION_TYPES.filter($scope.shouldShowPermission);
      };

      $scope.shouldShowPermission = function(permission) {
        return !!$scope.labels[permission];
      };

      $scope.getPermissionLabel = function(permission) {
        return $scope.labels[permission].label;
      };

      $scope.getPermissionTooltip = function(permission) {
        return $scope.labels[permission].tooltip;
      };

      $scope.onChange = _.debounce(function() {
        $scope.$emit('permissionsChange');
      }, 300);
    }
  };
}]);
