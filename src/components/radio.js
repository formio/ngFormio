var fs = require('fs');

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('radio', {
        title: 'Radio',
        template: 'formio/components/radio.html',
        tableView: function(data, options) {
          for (var i in options.component.values) {
            if (options.component.values[i].value === data) {
              return options.component.values[i].label;
            }
          }
          return data;
        },
        settings: {
          autofocus: false,
          input: true,
          tableView: true,
          inputType: 'radio',
          label: 'Radio',
          key: 'radio',
          values: [],
          defaultValue: '',
          protected: false,
          fieldSet:false,
          persistent: true,
          hidden: false,
          clearOnHide: true,
          validate: {
            required: false,
            custom: '',
            customPrivate: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/radio.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/radio.html', 'utf8')
      ));
    }
  ]);
};
