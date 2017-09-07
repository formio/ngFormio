module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('page', {
        template: 'formio/components/page.html',
        settings: {
          key: 'page',
          input: false,
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/page.html',
        require('./templates/page.html')
      );
    }
  ]);
};
