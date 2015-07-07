app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('fieldset', {
      title: 'Field Set',
      template: 'formio/components/fieldset.html',
      settings: {
        input: false,
        tableView: true,
        legend: '',
        key: '',
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
        '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
      '</fieldset>'
    );
  }
]);
