module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('phoneNumber', {
        title: 'Phone Number',
        template: 'formio/components/textfield.html',
        group: 'advanced',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'tel',
          inputMask: '(999) 999-9999',
          label: 'Phone Number',
          key: 'phonenumber',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          defaultValue: '',
          clearOnHide: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
};
