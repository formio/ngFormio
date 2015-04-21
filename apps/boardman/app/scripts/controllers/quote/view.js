'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:QuoteViewCtrl
 * @description
 * # QuoteViewCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('QuoteViewCtrl', [
    '$scope',
    '$stateParams',
    'Formio',
    function (
      $scope,
      $stateParams,
      Formio
    ) {
      var loader = Formio($scope.quoteForm + '/submission/' + $stateParams.quoteId);
      $scope.quote = {};
      loader.loadSubmission().then(function(submission) {
        $scope.quote = submission;
      });
    }
]);
