import {Formio} from 'formiojs/full';

const app = angular.module('formio');
app.provider('Formio', function() {
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
      if (scope.src) {
        scope.createPromise = Formio.createForm(element, scope.src, scope.options).then(formio => {
          scope.formio = formio;
          scope.formio.src = src;
        });
      }
      if (form) {
        scope.createPromise = Formio.createForm(element, scope.form, scope.options).then(formio => {
          scope.formio = formio;
          scope.formio.form = form;
        });
      }

      scope.initializeFormio = function () {

      };

      scope.initializeFormio();
    },
    controller: [
      '$scope',
      function ($scope) {
        $scope.$watch('src', function (src) {
          $scope.createPromise = Formio.createForm(this.element, src, $scope.options).then(formio => {
            $scope.formio = formio;
            $scope.formio.src = src;
          });
          $scope.initializeFormio();
        });

        $scope.$watch('form', function (form) {
          $scope.createPromise = Formio.createForm(this.element, form, $scope.options).then(formio => {
            $scope.formio = formio;
            $scope.formio.form = form;
          });
          $scope.initializeFormio();
        });

        $scope.$watch('submission', function (submission) {
          $scope.formio.form = submission;
        });

        // Clean up the Form from DOM.
        $scope.$on('$destroy', function () {
          $scope.formio.destroy(true);
        });
      }
    ],
    template: '<div />'
  };
});
