app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('columns', {
      title: 'Columns',
      template: 'formio/components/columns.html',
      group: 'layout',
      settings: {
        input: false,
        columns: [{components: []},{components: []}]
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/columns.html',
      '<div class="row">' +
        '<div class="col-xs-6" ng-repeat="column in component.columns">' +
          '<formio-component ng-repeat="component in column.components" component="component" data="data" formio="formio"></formio-component>' +
        '</div>' +
      '</div>'
    );
  }
]);
