'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerCreateCtrl
 * @description
 * # CustomerCreateCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CustomerCreateCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewCustomer', {customerId: submission._id});
      });
    }
  ]);
