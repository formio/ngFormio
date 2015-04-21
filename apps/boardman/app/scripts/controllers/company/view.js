'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:CompanyViewCtrl
 * @description
 * # CompanyViewCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('CompanyViewCtrl', [
    '$scope',
    '$stateParams',
    'Formio',
    function (
      $scope,
      $stateParams,
      Formio
    ) {
      var loader = Formio($scope.companyForm + '/submission/' + $stateParams.companyId);
      $scope.company = {};
      loader.loadSubmission().then(function(submission) {
        $scope.company = submission;
      });
    }
  ]);
