var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('panel', {
        title: 'Panel',
        template: 'formio/components/panel.html',
        group: 'layout',
        settings: {
          key: 'panel',
          input: false,
          title: '',
          theme: 'default',
          components: []
        },
        viewTemplate: 'formio/componentsView/panel.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/panel.html',
        fs.readFileSync(__dirname + '/../templates/components/panel.html', 'utf8')
      );

      $templateCache.put('formio/componentsView/panel.html',
        fs.readFileSync(__dirname + '/../templates/componentsView/panel.html', 'utf8')
      );
    }
  ]);
};
