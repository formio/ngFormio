import { Formio } from 'formiojs';
export default angular.module('formio').directive('formBuilder', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      url: '=?',
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
        $scope.options = $scope.options || {};

        // Initialize the builder.
        $scope.initBuilder = (element) => {
          builderElement = element;
          builderElement.innerHTML = '';
          builder = new Formio.FormBuilder(builderElement, $scope.form, $scope.options);
          builder.ready.then(() => {
            builder.instance.on('change', (event) => {
              // Do not emit form change events if this is from submission data.
              if (!event.data) {
                $scope.$emit('formChange', builder.instance.schema);
              }
            });
            builder.instance.onAny((event, ...args) => {
              if (event === 'formio.render') {
                $scope.$emit(event, builder.instance.schema);
              } 
              else {
                $scope.$emit(event, ...args);
              } 
            });
          });

          builderReady = builder.ready;
        };

        $scope.display = $scope.form.display;

        // Detect when the display changes.
        $scope.$watch('form.display', display => {
          if (builderReady && display) {
            builderReady.then(() => {
              if (display !== $scope.display) {
                builder.setDisplay(display);
              }
              $scope.display = display;
            });
          }
        });

        $scope.$watch('form', form => {
          if (!form || !form.components) {
            return;
          }
          if (builderReady) {
            builderReady.then(() => {
              if ($scope.url) {
                builder.instance.url = $scope.url;
              }
              builder.setForm(form);
            });
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
