'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CompanyCreateCtrl
 * @description
 * # CompanyCreateCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CompanyCreateCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewCompany', {companyId: submission._id});
      });
    }
  ]);
