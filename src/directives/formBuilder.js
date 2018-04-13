import { Formio } from 'formiojs/lib/formio.builder';
import _ from 'lodash';
const app = angular.module('formio');
export default app.directive('formBuilder', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      src: '=',
      url: '=?',
      type: '=',
      onSave: '=',
      onCancel: '=',
      options: '<'
    },
    link: function (scope, element) {
      scope.initBuilder(element[0]);
    },
    controller: [
      '$scope',
      function ($scope) {
        let builderReady = null;
        let builderElement = null;
        $scope.onSave = $scope.onSave || _.noop;

        const createBuilder = function(type) {
          if (type && $scope.form) {
            $scope.form.type = type;
          }
          builderElement.innerHTML = '';
          builderReady = Formio.builder(builderElement, $scope.form).then((builder) => {
            builder.on('saveComponent', () => $scope.onSave(builder.schema));
            builder.on('deleteComponent', () => $scope.onSave(builder.schema));
            builder.on('cancelComponent', () => $scope.onSave(builder.schema));
            return builder;
          });
        };

        const setBuilderProperty = function(prop, value) {
          if (builderReady) {
            builderReady.then((builder) => {
              builder[prop] = value;
            });
          }
        };

        $scope.initBuilder = function(element) {
          builderElement = element;
          createBuilder();
        };

        $scope.$watch('src', src => setBuilderProperty('setSrc', src));
        $scope.$watch('url', url => setBuilderProperty('setUrl', url));
      }
    ],
    template: '<div />'
  };
});
