app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('fieldset', {
      title: 'Field Set',
      template: 'formio/components/fieldset.html',
      settings: {
        input: false,
        legend: '',
        components: []
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/fieldset.html',
      '<fieldset>' +
        '<legend ng-if="component.legend">{{ component.legend }}</legend>' +
        '<formio-component ng-repeat="component in component.components" component="component" data="data"></formio-component>' +
      '</fieldset>'
    );
  }
]);
