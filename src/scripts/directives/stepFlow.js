'use strict';

/* globals localStorage */

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
          $scope.nextSteps = {};
          var lastStep;
          $scope.steps.forEach(function(step) {
            if (step.children && step.children.length) {
              step.children.forEach(function(childStep) {
                if (lastStep) {
                  $scope.nextSteps[lastStep.step] = {parentStep: step, childStep: childStep};
                }
                lastStep = childStep;
              });
            }
            else {
              if (lastStep) {
                $scope.nextSteps[lastStep.step] = {parentStep: step};
              }
              lastStep = step;
            }
          });
          var parentStep = false;
          var childStep = false;
          try {
            parentStep = JSON.parse(localStorage.getItem('stepFlowCurrentParentStep'));
            childStep = JSON.parse(localStorage.getItem('stepFlowCurrentChildStep'));
          }
          catch (e) {
            console.warn('Error getting previous step flows.');
          }
          if (parentStep) {
            $scope.changeStep(parentStep, childStep);
          }
          else {
            if ($scope.steps) {
              $scope.changeStep($scope.steps[0]);
            }
          }
        });

        // If not set, default to open.
        if (typeof $scope.active !== 'boolean') {
          $scope.active = true;
        }

        $scope.changeStep = function(parentStep, childStep) {
          window.scrollTo(0, 0);
          $scope.currentStep = childStep || parentStep;
          $scope.currentParentStep = parentStep;
          $scope.nextStep = $scope.nextSteps[$scope.currentStep.step];
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
          localStorage.setItem('stepFlowCurrentChildStep', JSON.stringify($scope.currentChildStep));
          localStorage.setItem('stepFlowCurrentParentStep', JSON.stringify($scope.currentParentStep));
        };

        $scope.init = function() {
          return $scope.variables;
        };
      }
    ],
    templateUrl: 'views/project/stepFlow.html'
  };
});
