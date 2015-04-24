app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('password', {
      title: 'Password',
      template: 'formio/components/textfield.html',
      settings: {
        input: true,
        inputType: 'password',
        label: '',
        key: '',
        placeholder: '',
        prefix: '',
        suffix: '',
        protected: true,
        persistent: true
      }
    });
  }
]);
