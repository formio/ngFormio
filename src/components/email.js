module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('email', {
        title: 'Email',
        template: 'formio/components/textfield.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          inputType: 'email',
          label: '',
          key: 'emailField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          clearOnHide: true,
          kickbox: {
            enabled: false
          }
        }
      });
    }
  ]);
};
