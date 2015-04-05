components.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('email', {
    title: 'Email',
    template: 'formio/components/textfield.html',
    settings: {
      input: true,
      inputType: 'email',
      label: '',
      key: '',
      placeholder: '',
      prefix: '',
      suffix: ''
    }
  });
});
