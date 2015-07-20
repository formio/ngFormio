'use strict';

var app = angular.module('formioApp.controllers.access', ['ngFormBuilder']);



app.controller('AccessController', ['$scope', function($scope) {
  $scope.permissionLabels = {
    'create_all': {
      label: 'Create All',
      tooltip: 'The Create All permission will allow a user, with one of the given Roles, to create an Application level entity, regardless of who owns the Application. Additionally with this permission, a user can define the Owner of the entity. E.g. Forms or Roles.'
    },
    'read_all': {
      label: 'Read All',
      tooltip: 'The Read All permission will allow a user, with one of the given Roles, to read an Application level entity, regardless of who owns the Application. E.g. The Application itself or its Roles.'
    },
    'update_all': {
      label: 'Update All',
      tooltip: 'The Update All permission will allow a user, with one of the given Roles, to update an Application level entity, regardless of who owns the Application. Additionally with this permission, a user can change the Owner of an entity. E.g. The Application itself or its Roles.'
    },
    'delete_all': {
      label: 'Delete All',
      tooltip: 'The Delete All permission will allow a user, with one of the given Roles, to delete an Application level entity, regardless of who owns the Application. E.g. The Application itself or its Roles.'
    },
    'create_own': {
      label: 'Create Own',
      tooltip: 'The Create Own permission will allow a user, with one of the given Roles, to create an Application level entity. Upon creating an entity, the user will be defined as its Owner. E.g. Forms or Roles.'
    },
    'read_own': {
      label: 'Read Own',
      tooltip: 'The Read Own permission will allow a user, with one of the given Roles, to read an Application level entity. A user can only read an entity if they are defined as its owner. E.g. Forms or Roles.'
    },
    'update_own': {
      label: 'Update Own',
      tooltip: 'The Update Own permission will allow a user, with one of the given Roles, to update an Application level entity. A user can only update an entity if they are defined as its owner. E.g. Forms or Roles.'
    },
    'delete_own': {
      label: 'Delete Own',
      tooltip: 'The Delete Own permission will allow a user, with one of the given Roles, to delete an Application level entity. A user can only delete an entity if they are defined as its owner. E.g. Forms or Roles.'
    }
  };
}]);

/**
 * Creates a table to edit permission roles.
 * Requires you pass the permissions array to edit as `permissions`
 * Requires you pass labels/tooltips for each permission type as `labels`. This should be an object like $scope.permissionLabels above.
 * Requires you pass application roles as `roles`.
 * Can also pass promise as `waitFor` to wait for before initializing the permissions.
 */
app.directive('permissionEditor', ['$q', function($q) {
  var PERMISSION_TYPES = {
    'create_all': 'Create All',
    'read_all': 'Read All',
    'update_all': 'Update All',
    'delete_all': 'Delete All',
    'create_own': 'Create Own',
    'read_own': 'Read Own',
    'update_own': 'Update Own',
    'delete_own': 'Delete Own'
  };

  return {
    scope: {
      roles: '=',
      permissions: '=',
      labels: '=',
      waitFor: '='
    },
    restrict: 'E',
    templateUrl: 'views/app/access/permission-editor.html',
    link: function($scope) {
      // Fill in missing permissions / enforce order
      ($scope.waitFor || $q.when()).then(function(){
        var tempPerms = [];
        _.each(PERMISSION_TYPES, function(permission, type) {
          var existingPerm = _.find($scope.permissions, {type: type});
          tempPerms.push(existingPerm || {
            type: type,
            roles: []
          });
        });
        // Replace permissions with complete set of permissions
        $scope.permissions.splice.apply($scope.permissions, [0, $scope.permissions.length].concat(tempPerms));
      });

      $scope.getPermissionLabel = function(permission) {
        return $scope.labels[permission.type].label;
      };

      $scope.getPermissionTooltip = function(permission) {
        return $scope.labels[permission.type].tooltip;
      };
    }
  };
}]);
