var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('well', {
        title: 'Well',
        template: 'formio/components/well.html',
        group: 'layout',
        settings: {
          key: 'well',
          input: false,
          components: []
        },
        viewTemplate: 'formio/componentsView/well.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/well.html',
        fs.readFileSync(__dirname + '/../templates/components/well.html', 'utf8')
      );
      $templateCache.put('formio/componentsView/well.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/well.html', 'utf8')
      );
    }
  ]);
};
