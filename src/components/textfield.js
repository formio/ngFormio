var fs = require('fs');

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textfield', {
        title: 'Text Field',
        template: 'formio/components/textfield.html',
        icon: 'fa fa-terminal',
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: 'Text',
          key: 'text',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          spellcheck: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: '',
            customPrivate: false
          },
          conditional: {
            show: null,
            when: null,
            eq: ''
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function(
      $templateCache,
      FormioUtils
    ) {
      $templateCache.put('formio/components/textfield.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/textfield.html', 'utf8')
      ));
    }
  ]);
};
