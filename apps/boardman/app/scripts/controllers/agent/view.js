'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerViewCtrl
 * @description
 * # CustomerViewCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('AgentViewCtrl', [
    '$scope',
    '$stateParams',
    'Formio',
    function (
      $scope,
      $stateParams,
      Formio
    ) {
      var loader = Formio($scope.agentForm + '/submission/' + $stateParams.agentId);
      $scope.agent = {};
      loader.loadSubmission().then(function(submission) {
        $scope.agent = submission;
      });
    }
]);
