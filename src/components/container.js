var fs = require('fs');
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('container', {
        title: 'Container',
        template: 'formio/components/container.html',
        group: 'layout',
        settings: {
          input: false,
          label: '',
          tableView: true,
          legend: '',
          key:'ccontainer',
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/container.html',
        fs.readFileSync(__dirname + '/../templates/components/container.html', 'utf8')
      );
    }
  ]);
};
