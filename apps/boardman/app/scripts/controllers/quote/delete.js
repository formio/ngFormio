'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:QuoteDeleteCtrl
 * @description
 * # QuoteDeleteCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('QuoteDeleteCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    function (
      $scope,
      $state,
      $stateParams
    ) {
      $scope.quoteUrl = $scope.quoteForm + '/submission/' + $stateParams.quoteId;
      $scope.$on('delete', function() {
        $state.go('listQuotes');
      });
    }
]);
