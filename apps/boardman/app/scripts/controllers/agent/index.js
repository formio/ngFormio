'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerListCtrl
 * @description
 * # CustomerListCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('AgentIndexCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('submissionView', function(event, submission) {
        $state.go('viewAgent', {
          agentId: submission._id
        });
      });

      $scope.$on('submissionEdit', function(event, submission) {
        $state.go('editAgent', {
          agentId: submission._id
        });
      });

      $scope.$on('submissionDelete', function(event, submission) {
        $state.go('deleteAgent', {
          agentId: submission._id
        });
      });
    }
  ]);
