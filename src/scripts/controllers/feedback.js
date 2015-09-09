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
  '$timeout',
  function(
    $scope,
    $timeout
  ) {
    $scope.state = 'closed';
    $scope.showFeedback = function() {
      $scope.state = 'open';
    };
    $scope.hideFeedback = function() {
      $scope.state = 'closed';
    };
    $scope.$on('formSubmission', function() {
      $scope.state = 'thanks';
      $timeout(function() {
        $scope.state = 'closed';
      }, 2000);
    });
    $scope.$on('formLoad', function(err, form) {
      console.log(form);
    });
  }
]);
