module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('content', {
        title: 'Content',
        template: 'formio/components/content.html',
        settings: {
          key: 'content',
          input: false,
          html: ''
        },
        viewTemplate: 'formio/components/content.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/content.html',
        require('./templates/content.html')
      );
    }
  ]);
};
