'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CompanyDeleteCtrl
 * @description
 * # CompanyDeleteCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CompanyDeleteCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.companyUrl = $scope.companyForm + '/submission/' + $stateParams.companyId;
      $scope.$on('delete', function() {
        $state.go('listCompanies');
      });
    }
  ]);
