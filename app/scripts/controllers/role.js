'use strict';

var app = angular.module('formioApp.controllers.role', []);

app.controller('RoleController', [
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  '$http',
  function(
    $scope,
    $state,
    Formio,
    FormioAlerts,
    $http
  ) {
    if($state.params.roleId) {
      $scope.originalRole = $scope.getRole($state.params.roleId);
      if(!$scope.originalRole) {
        return FormioAlerts.onError(new Error('No role found.'));
      }
      $scope.role = _.cloneDeep($scope.originalRole);
    }
    else {
      $scope.role = {
        title: '',
        description: '',
        app: $scope.currentApp._id
      };
    }

    $scope.saveRole = function() {
      if($scope.roleForm.$invalid) {
        return;
      }
      var method = $scope.role._id ? 'put' : 'post';
      var url = $scope.formio.appUrl + '/role';
      if($scope.role._id) {
        url += '/' + $scope.role._id;
      }
      return $http[method](url, $scope.role)
      .then(function(result) {
        if(!$scope.role._id) {
          $scope.currentAppRoles.push(result.data);
        }
        else {
          var index = _.findIndex($scope.currentAppRoles, {_id: $scope.role._id});
          $scope.currentAppRoles.splice(index, 1, result.data);
        }

        FormioAlerts.addAlert({
          type: 'success',
          message: 'Role successfully ' + ($scope.role._id ? 'saved' : 'created') + '.'
        });

        $scope.back();
      }).catch(FormioAlerts.onError.bind(FormioAlerts));
    };

    $scope.deleteRole = function() {
      if(!$scope.role || !$scope.role._id) {
        return FormioAlerts.onError(new Error('No role found.'));
      }
      $http.delete($scope.formio.appUrl + '/role/' + $scope.role._id)
      .then(function() {
        var index = _.findIndex($scope.currentAppRoles, {_id: $scope.role._id});
        $scope.currentAppRoles.splice(index, 1);

        FormioAlerts.addAlert({
          type: 'success',
          message: 'Role successfully deleted.'
        });

        $scope.back();
      }).catch(function(err) {
        FormioAlerts.onError({message: (err.status === 404) ? 'Role not found' : err.data});
      });
    };

  }
]);
