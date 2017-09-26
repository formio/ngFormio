'use strict';

var app = angular.module('formioApp');

app.directive('stepFlow', function() {
  return {
    scope: {
      steps: '=',
      active: '=?',
      variables: '='
    },
    controller: [
      '$scope',
      function($scope) {
        var element = angular.element;
        $scope.$watch('steps', function() {
          var parentStep = false;
          var childStep = false;
          try {
            parentStep = JSON.parse(sessionStorage.getItem('stepFlowCurrentParentStep'));
            childStep = JSON.parse(sessionStorage.getItem('stepFlowCurrentChildStep'));
          }
          catch (e) {
            console.warn('Error getting previous step flows.');
          }
          if (parentStep) {
            $scope.changeStep(parentStep, childStep);
          }
          else {
            if ($scope.steps) {
              $scope.currentStep = $scope.currentParentStep = $scope.steps[0];
            }
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
          window.scrollTo(0, 0);
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
          sessionStorage.setItem('stepFlowCurrentChildStep', JSON.stringify($scope.currentChildStep));
          sessionStorage.setItem('stepFlowCurrentParentStep', JSON.stringify($scope.currentParentStep));
        };

        $scope.init = function() {
          return $scope.variables;
        }
      }
    ],
    templateUrl: 'views/project/stepFlow.html'
  };
});
