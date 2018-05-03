import { Formio } from 'formiojs/lib/formio.builder';
export default angular.module('formio').directive('formBuilder', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      options: '<'
    },
    link: function (scope, element) {
      scope.initBuilder(element[0]);
    },
    controller: [
      '$scope',
      function ($scope) {
        let builder = null;
        let builderReady = null;
        let builderElement = null;

        // Initialize the builder.
        $scope.initBuilder = function(element) {
          builderElement = element;
          builderElement.innerHTML = '';
          builder = new Formio.Builder(builderElement, $scope.form);
          builderReady = builder.setDisplay($scope.form.display);
        };

        // Detect when the display changes.
        $scope.$watch('form.display', display => {
          if (builderReady && display) {
            builderReady.then(() => builder.setDisplay(display));
          }
        });

        $scope.$on('$destroy', function () {
          if (builder && builder.instance) {
            builder.instance.destroy(true);
          }
        });
      }
    ],
    template: '<div/>'
  };
});
