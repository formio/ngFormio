'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerViewCtrl
 * @description
 * # CustomerViewCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CustomerViewCtrl', [
    '$scope',
    '$stateParams',
    'Formio',
    function (
      $scope,
      $stateParams,
      Formio
    ) {
      var loader = Formio($scope.customerForm + '/submission/' + $stateParams.customerId);
      $scope.customer = {};
      loader.loadSubmission().then(function(submission) {
        $scope.customer = submission;
      });
    }
]);
