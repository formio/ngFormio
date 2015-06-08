app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('page', {
      template: 'formio/components/page.html',
      settings: {
        input: false,
        components: []
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/page.html',
      '<formio-component ng-repeat="component in component.components" component="component" data="data" formio="formio"></formio-component>'
    );
  }
]);
