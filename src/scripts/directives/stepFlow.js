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
      'AppConfig',
      function($scope, AppConfig) {
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

        // The url to goto for embedding.
        $scope.iframeCode = '';
        $scope.embedCode = '';
        $scope.setiframeCode = function(gotoUrl) {
          var embedCode = '<script src="https://unpkg.com/formiojs@latest/dist/formio.embed.js?src=';
          embedCode += $scope.variables.projectUrl + '/demographics';
          embedCode += '"></script>';
          $scope.embedCode = embedCode;
          var iframeCode = '<script type="text/javascript">';
          iframeCode += '(function a(d, w, u) {';
          iframeCode +=    'var h = d.getElementsByTagName("head")[0];';
          iframeCode +=    'var s = d.createElement("script");';
          iframeCode +=    's.type = "text/javascript";';
          iframeCode +=    's.src = "' + AppConfig.appBase + '/lib/seamless/seamless.parent.min.js";';
          iframeCode +=    's.onload = function b() {';
          iframeCode +=        'var f = d.getElementById("formio-form-demographics");';
          iframeCode +=        'if (!f || (typeof w.seamless === u)) {';
          iframeCode +=            'return setTimeout(b, 100);';
          iframeCode +=        '}';
          iframeCode +=        'w.seamless(f, {fallback:false}).receive(function(d, e) {';
          iframeCode +=            gotoUrl ? 'window.location.href = "' + gotoUrl + '";' : '';
          iframeCode +=        '});';
          iframeCode +=    '};';
          iframeCode +=    'h.appendChild(s);';
          iframeCode += '})(document, window);';
          iframeCode += '</script>';
          iframeCode += '<iframe id="formio-form-demographics" style="width:100%;border:none;" height="600px" src="https://formview.io/#/' + $scope.variables.projectUrl + '/demographics?iframe=1&header=0"></iframe>';
          $scope.iframeCode = iframeCode;
        };

        $scope.setiframeCode();
      }
    ],
    templateUrl: 'views/project/stepFlow.html'
  };
});
