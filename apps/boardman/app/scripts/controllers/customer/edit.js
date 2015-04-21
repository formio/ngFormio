'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerEditCtrl
 * @description
 * # CustomerEditCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CustomerEditCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.customerUrl = $scope.customerForm + '/submission/' + $stateParams.customerId;
      $scope.customer = {_id: $stateParams.customerId};
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewCustomer', {customerId: submission._id});
      });
    }
]);
