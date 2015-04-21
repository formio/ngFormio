'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:QuoteEditCtrl
 * @description
 * # QuoteEditCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('QuoteEditCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.quoteUrl = $scope.quoteForm + '/submission/' + $stateParams.quoteId;
      $scope.quote = {_id: $stateParams.quoteId};
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewQuote', {quoteId: submission._id});
      });
    }
  ]);
