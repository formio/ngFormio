'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerDeleteCtrl
 * @description
 * # CustomerDeleteCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CustomerDeleteCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.customerUrl = $scope.customerForm + '/submission/' + $stateParams.customerId;
      $scope.$on('delete', function() {
        $state.go('listCustomers');
      });
    }
  ]);
