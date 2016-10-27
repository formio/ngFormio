var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('fieldset', {
        title: 'Field Set',
        template: 'formio/components/fieldset.html',
        group: 'layout',
        settings: {
          key: 'fieldset',
          input: false,
          tableView: true,
          legend: '',
          components: []
        },
        viewTemplate: 'formio/componentsView/fieldset.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/fieldset.html',
        fs.readFileSync(__dirname + '/../templates/components/fieldset.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/fieldset.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/fieldset.html', 'utf8')
      );
    }
  ]);
};
