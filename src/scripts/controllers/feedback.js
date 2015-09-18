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
  '$rootScope',
  '$timeout',
  function(
    $scope,
    $rootScope,
    $timeout
  ) {
    $scope.state = 'closed';
    $scope.feedbackInfo = {};
    $scope.showFeedback = function() {
      if ($rootScope.user && $rootScope.user.data) {
        var email = $rootScope.user.data.email;
        var id = $rootScope.user._id;
      }
      else {
        var email = 'anonymous@example.com';
        var id = '';
      }
      $scope.feedbackInfo = {
        data: {
          url: window.location.href,
          user: {
            email: email,
            id: id
          }
        }
      };
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
  }
]);
