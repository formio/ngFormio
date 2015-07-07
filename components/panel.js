app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('panel', {
      title: 'Panel',
      template: 'formio/components/panel.html',
      group: 'layout',
      settings: {
        input: false,
        title: '',
        theme: 'default',
        components: []
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/panel.html',
      '<div class="panel panel-{{ component.theme }}">' +
        '<div ng-if="component.title" class="panel-heading"><h3 class="panel-title">{{ component.title }}</h3></div>' +
        '<div class="panel-body">' +
          '<formio-component ng-repeat="component in component.components" ng-if="componentFound(component)" component="component" data="data" formio="formio" read-only="readOnly"></formio-component>' +
        '</div>' +
      '</div>'
    );
  }
]);
