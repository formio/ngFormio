'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:QuoteCreateCtrl
 * @description
 * # QuoteCreateCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('QuoteCreateCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('formSubmission', function(event, submission) {
        $state.go('viewQuote', {quoteId: submission._id});
      });
    }
]);
