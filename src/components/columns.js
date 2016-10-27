var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('columns', {
        title: 'Columns',
        template: 'formio/components/columns.html',
        group: 'layout',
        settings: {
          input: false,
          key: 'columns',
          columns: [{components: []}, {components: []}]
        },
        viewTemplate: 'formio/componentsView/columns.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/columns.html',
        fs.readFileSync(__dirname + '/../templates/components/columns.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/columns.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/columns.html', 'utf8')
      );
    }
  ]);
};
