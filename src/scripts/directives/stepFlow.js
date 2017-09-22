'use strict';

var app = angular.module('formioApp');

app.directive('stepFlow', function() {
  return {
    scope: {
      steps: '=',
      active: '=?'
    },
    controller: [
      '$scope',
      function($scope) {
        var element = angular.element;
        $scope.$watch('steps', function() {
          if ($scope.steps) {
            $scope.currentStep = $scope.currentParentStep = $scope.steps[0];
          }
          $scope.nextSteps = {};
          var lastStep;
          $scope.steps.forEach(function(step) {
            if (step.children && step.children.length) {
              step.children.forEach(function(childStep) {
                if (lastStep) {
                  $scope.nextSteps[lastStep.step] = childStep;
                }
                lastStep = childStep;
              });
            }
            else {
              if (lastStep) {
                $scope.nextSteps[lastStep.step] = step;
              }
              lastStep = step;
            }
          });
        });

        // If not set, default to open.
        if (typeof $scope.active !== 'boolean') {
          $scope.active = true;
        }

        $scope.changeStep = function(parentStep, childStep) {
          $scope.currentStep = childStep || parentStep;
          $scope.currentParentStep = parentStep;
          if (childStep) {
            $scope.currentChildStep = childStep;
          }
          else {
            $scope.currentChildStep = null;
            // If children exist, set the first step as active.
            if (parentStep.children && parentStep.children.length) {
              $scope.currentChildStep = parentStep.children[0];
            }
          }
        };
      }
    ],
    templateUrl: 'views/project/stepFlow.html'
  };
});
