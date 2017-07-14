import {Formio} from 'formiojs/full';

const app = angular.module('formio');
export default app.directive('formio', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      url: '=?',
      form: '=?',
      submission: '=?',
      options: '=?'
    },
    link: function (scope, element) {
      scope.element = element[0];

      scope.initializeForm();
    },
    controller: [
      '$scope',
      function ($scope) {
        $scope.initializeForm = function() {
          if ($scope.src) {
            $scope.createPromise = Formio.createForm($scope.element, $scope.src, $scope.options)
              .then(formio => {
                $scope.formio = formio;
                $scope.formio.src = $scope.src;
                return formio;
              });
          }
          if ($scope.form && !$scope.src) {
            $scope.createPromise = Formio.createForm($scope.element, $scope.form, $scope.options)
              .then(formio => {
                $scope.formio = formio;
                $scope.formio.submission = $scope.form;
                return formio;
              });
          }
          if ($scope.submission && $scope.createPromise) {
            $scope.createPromise
              .then(() => {
                $scope.formio.submission = $scope.submission
              });
          }
        };
        $scope.$watch('src', $scope.initializeForm);

        $scope.$watch('form', $scope.initializeForm);

        $scope.$watch('submission', $scope.initializeForm);

        // Clean up the Form from DOM.
        $scope.$on('$destroy', function () {
          $scope.formio.destroy(true);
        });
      }
    ],
    template: '<div />'
  };
});
