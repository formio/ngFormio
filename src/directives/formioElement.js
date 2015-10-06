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
      controller: function() {
        // This is required for some reason as it will occasionally throw an error without it.
      }
    };
  }
];
