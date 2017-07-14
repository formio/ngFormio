import template from '../templates/formio-submission.html';

const app = angular.module('formio');
app.directive('formioSubmission', function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      form: '=',
      submission: '=',
      ignore: '=?'
    },
    template: template,
    controller: [
      '$scope',
      'FormioUtils',
      function(
        $scope,
        FormioUtils
      ) {
        $scope.isVisible = function(component, row) {
          return FormioUtils.isVisible(
            component,
            row,
            $scope.submission ? $scope.submission.data : null,
            $scope.ignore
          );
        };
      }
    ]
  };
});
