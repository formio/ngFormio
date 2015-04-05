app.config(function(formioComponentsProvider) {
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
      suffix: ''
    }
  });
});
