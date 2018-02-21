'use strict';

var app = angular.module('formioApp.controllers.role', ['formioApp.controllers.form']);

app.controller('RoleController', [
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  'SubmissionAccessLabels',
  '$http',
  function(
    $scope,
    $state,
    Formio,
    FormioAlerts,
    SubmissionAccessLabels,
    $http
  ) {
    $scope.saveRole = function() {
      if($scope.roleForm.$invalid) {
        return;
      }
      var method = $scope.role._id ? 'put' : 'post';
      var url = $scope.formio.projectUrl + '/role';
      if($scope.role._id) {
        url += '/' + $scope.role._id;
      }
      else {
        url += '?limit=1000';
      }
      return $http[method](url, $scope.role)
        .then(function(result) {
          if(!$scope.role._id) {
            $scope.currentProjectRoles.push(result.data);
          }
          else {
            var index = _.findIndex($scope.currentProjectRoles, {_id: $scope.role._id});
            $scope.currentProjectRoles.splice(index, 1, result.data);
          }

          FormioAlerts.addAlert({
            type: 'success',
            message: 'Role successfully ' + ($scope.role._id ? 'saved' : 'created') + '.'
          });

          $scope.back('project.access');
        }, FormioAlerts.onError.bind(FormioAlerts))
        .catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    $scope.deleteRole = function() {
      if(!$scope.role || !$scope.role._id) {
        return FormioAlerts.onError(new Error('No role found.'));
      }
      $http.delete($scope.formio.projectUrl + '/role/' + $scope.role._id)
      .then(function() {
        var index = _.findIndex($scope.currentProjectRoles, {_id: $scope.role._id});
        $scope.currentProjectRoles.splice(index, 1);

        FormioAlerts.addAlert({
          type: 'success',
          message: 'Role successfully deleted.'
        });

        $scope.back('project.access');
      }).catch(function(err) {
        var error = {};
        switch(err.status) {
          case 404: error.message = 'Role not found.';
            break;
          case 405: error.message = 'The ' + $scope.role.title + ' role is required. This can be renamed but not deleted, because it is the role assigned to unauthenticated users.';
            break;
          default: error.message = err.data;
        }
        FormioAlerts.onError(error);
      });
    };

    // If no roleId is available in ui-router, default to creating a new role.
    if (!$state.params.roleId) {
      $scope.role = {
        title: '',
        description: '',
        project: $scope.currentProject._id
      };
      return;
    }

    // Get the current roles before trying to check the forms in which they have access.
    $scope.loadRoles().then(function() {
      $scope.originalRole = $scope.getRole($state.params.roleId);
      if (!$scope.originalRole) {
        return FormioAlerts.onError(new Error('No role found.'));
      }

      $scope.role = _.cloneDeep($scope.originalRole);
      // Load forms that assign this role permissions
      $scope.formio.loadForms({params: {
        select: '_id,title,type,submissionAccess',
        limit: 10000
      }}).then(function(result) {
        if (!result) {
          $scope.assignedForms = [];
          return;
        }

        // Check all the forms for the current roleId.
        $scope.assignedForms = result.filter(function(form) {
          form.rolePermissions = form.submissionAccess.filter(function(perm) {
            return _.includes(perm.roles, $state.params.roleId) && SubmissionAccessLabels[perm.type];
          });

          form.permissionList = _(form.rolePermissions).map(function(p){
            if(SubmissionAccessLabels[p.type]) {
              return SubmissionAccessLabels[p.type].label;
            }
          }).compact().value().join(', ');

          return form.rolePermissions.length;
        });
      });
    });
  }
]);
