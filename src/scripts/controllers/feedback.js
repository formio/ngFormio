'use strict';

var app = angular.module('formioApp.controllers.feedback', []);

app.directive('formioFeedback', function() {
    return {
      restrict: 'E',
      controller: 'FeedbackController',
      templateUrl: 'views/feedback/feedback.html'
    };
  }
);

app.controller('FeedbackController', [
  '$scope',
  'AppConfig',
  function(
    $scope,
    AppConfig
  ) {
    $scope.showFeedback = function() {
      $scope.open = true;
    }
    $scope.hideFeedback = function() {
      $scope.open = false;
    }
  }
]);
