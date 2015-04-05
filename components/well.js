app.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('well', {
    title: 'Well',
    template: 'formio/components/well.html',
    group: 'layout',
    settings: {
      input: false,
      components: []
    }
  });
});
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/well.html',
      '<div class="well">' +
        '<formio-component ng-repeat="component in component.components" component="component" data="data"></formio-component>' +
      '</div>'
    );
  }
]);
