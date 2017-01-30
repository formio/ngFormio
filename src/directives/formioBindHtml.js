module.exports = ['$sce', '$parse', '$compile', function($sce, $parse, $compile) {
  return {
    restrict: 'A',
    compile: function formioBindHtmlCompile(tElement, tAttrs) {
      var formioBindHtmlGetter = $parse(tAttrs.formioBindHtml);
      $compile.$$addBindingClass(tElement);
      return function formioBindHtmlLink(scope, element, attr) {
        $compile.$$addBindingInfo(element, attr.formioBindHtml);
        var value = formioBindHtmlGetter(scope);
        element.html($sce.getTrustedHtml(value) || '');
      };
    }
  };
}];
