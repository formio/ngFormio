app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('email', {
      title: 'Email',
      template: 'formio/components/textfield.html',
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
        persistent: true
      }
    });
  }
]);
