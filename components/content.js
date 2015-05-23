app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('content', {
      title: 'Content',
      template: 'formio/components/content.html',
      settings: {
        input: false,
        html: ''
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/content.html',
      '<div ng-bind-html="component.html | safehtml"></div>'
    );
  }
]);
