module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('email', {
        title: 'Email',
        template: 'formio/components/textfield.html',
        group: 'advanced',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'email',
          label: 'Email',
          key: 'email',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          kickbox: {
            enabled: false
          }
        }
      });
    }
  ]);
};
