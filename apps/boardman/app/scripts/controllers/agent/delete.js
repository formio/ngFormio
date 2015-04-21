'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerDeleteCtrl
 * @description
 * # CustomerDeleteCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('AgentDeleteCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.agentUrl = $scope.agentForm + '/submission/' + $stateParams.agentId;
      $scope.$on('delete', function() {
        $state.go('listAgents');
      });
    }
  ]);
