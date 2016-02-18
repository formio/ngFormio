module.exports = [
  '$compile',
  '$templateCache',
  function(
    $compile,
    $templateCache
  ) {
    return {
      scope: false,
      link: function(scope, element) {
        element.replaceWith($compile($templateCache.get(scope.template))(scope));
        scope.$emit('formElementRender', element);
      },
      controller: [
        '$scope',
        function(
          $scope
        ) {
          $scope.$watchCollection('data.' + $scope.component.key, function(_new, _old) {
            if (_new !== _old) {
              $scope.$emit('submissionDataUpdate', $scope.component.key, $scope.data[$scope.component.key]);
            }
          });
        }
      ]
    };
  }
];
