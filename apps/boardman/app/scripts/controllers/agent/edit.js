'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerEditCtrl
 * @description
 * # CustomerEditCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('AgentEditCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.agentUrl = $scope.agentForm + '/submission/' + $stateParams.agentId;
      $scope.agent = {_id: $stateParams.agentId};
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewAgent', {agentId: submission._id});
      });
    }
]);
