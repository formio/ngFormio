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
          if ($scope.createPromise) {
            $scope.createPromise.then(function(formio) {
              // Pass events on.
              $scope.formio.events.onAny(function() {
                $scope.$emit.apply($scope, arguments);
                // Keep backwards compatibility by firing old events as well.
                var args = Array.prototype.slice.call(arguments);
                switch(arguments[0]) {
                  case 'formio.error':
                    args[0] = 'formError';
                    $scope.$emit.apply($scope, args);
                    break;
                  case 'formio.submit':
                    args[0] = 'formSubmit';
                    $scope.$emit.apply($scope, args);
                    break;
                  case 'formio.submitDone':
                    args[0] = 'formSubmission';
                    $scope.$emit.apply($scope, args);
                    break;
                  case 'formio.prevPage':
                    args[0] = 'wizardPrev';
                    $scope.$emit.apply($scope, args);
                    break;
                  case 'formio.nextPage':
                    args[0] = 'wizardNext';
                    $scope.$emit.apply($scope, args);
                    break;
                  case 'formio.customEvent':
                    args[0] = args[1].type;
                    $scope.$emit.apply($scope, args);
                    break;
                }
              });
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
