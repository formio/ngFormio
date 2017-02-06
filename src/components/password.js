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
          input: true,
          tableView: false,
          inputType: 'password',
          label: '',
          key: 'passwordField',
          placeholder: '',
          prefix: '',
          suffix: '',
          protected: true,
          persistent: true,
          clearOnHide: true
        }
      });
    }
  ]);
};
