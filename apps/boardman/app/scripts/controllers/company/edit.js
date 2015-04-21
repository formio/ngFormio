'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CompanyEditCtrl
 * @description
 * # CompanyEditCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CompanyEditCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.companyUrl = $scope.companyForm + '/submission/' + $stateParams.companyId;
      $scope.company = {_id: $stateParams.companyId};
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewCompany', {companyId: submission._id});
      });
    }
  ]);
