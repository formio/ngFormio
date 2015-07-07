app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('well', {
      title: 'Well',
      template: 'formio/components/well.html',
      group: 'layout',
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
    $templateCache.put('formio/components/well.html',
      '<div class="well">' +
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
      '</div>'
    );
  }
]);
