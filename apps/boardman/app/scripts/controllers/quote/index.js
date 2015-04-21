'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:QuoteIndexCtrl
 * @description
 * # QuoteIndexCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('QuoteIndexCtrl', [
    '$scope',
    '$state',
    function (
      $scope,
      $state
    ) {
      $scope.$on('submissionView', function(event, submission) {
        $state.go('viewQuote', {
          quoteId: submission._id
        });
      });

      $scope.$on('submissionEdit', function(event, submission) {
        $state.go('editQuote', {
          quoteId: submission._id
        });
      });

      $scope.$on('submissionDelete', function(event, submission) {
        $state.go('deleteQuote', {
          quoteId: submission._id
        });
      });
    }
  ]);
