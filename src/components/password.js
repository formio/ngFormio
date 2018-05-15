module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('password', {
        title: 'Password',
        template: 'formio/components/textfield.html',
        tableView: function() {
          return '--- PROTECTED ---';
        },
        settings: {
          autofocus: false,
          input: true,
          tableView: false,
          inputType: 'password',
          label: 'Password',
          key: 'password',
          placeholder: '',
          prefix: '',
          suffix: '',
          protected: true,
          persistent: true,
          hidden: false,
          clearOnHide: true
        }
      });
    }
  ]);
};
