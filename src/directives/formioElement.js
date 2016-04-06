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
      }
    };
  }
];
