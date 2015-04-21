'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CustomerListCtrl
 * @description
 * # CustomerListCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CustomerIndexCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('submissionView', function(event, submission) {
        $state.go('viewCustomer', {
          customerId: submission._id
        });
      });

      $scope.$on('submissionEdit', function(event, submission) {
        $state.go('editCustomer', {
          customerId: submission._id
        });
      });

      $scope.$on('submissionDelete', function(event, submission) {
        $state.go('deleteCustomer', {
          customerId: submission._id
        });
      });
    }
  ]);
