'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CompanyIndexCtrl
 * @description
 * # CompanyIndexCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CompanyIndexCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('submissionView', function(event, submission) {
        $state.go('viewCompany', {
          companyId: submission._id
        });
      });

      $scope.$on('submissionEdit', function(event, submission) {
        $state.go('editCompany', {
          companyId: submission._id
        });
      });

      $scope.$on('submissionDelete', function(event, submission) {
        $state.go('deleteCompany', {
          companyId: submission._id
        });
      });
    }
  ]);
