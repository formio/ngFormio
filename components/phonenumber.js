app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('phoneNumber', {
      title: 'Phone Number',
      template: 'formio/components/textfield.html',
      settings: {
        input: true,
        tableView: true,
        inputMask: '(999) 999-9999',
        label: '',
        key: '',
        placeholder: '',
        prefix: '',
        suffix: '',
        multiple: false,
        protected: false,
        unique: false,
        persistent: true,
        validate: {
          required: false
        }
      }
    });
  }
]);
