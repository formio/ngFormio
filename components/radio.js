app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('radio', {
      title: 'Radio',
      template: 'formio/components/radio.html',
      settings: {
        input: true,
        tableView: true,
        inputType: 'radio',
        label: '',
        key: '',
        values: [
          {
            value: 'value1',
            label: 'Value 1'
          },
          {
            value: 'value2',
            label: 'Value 2'
          }
        ],
        defaultValue: '',
        protected: false,
        persistent: true,
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
  function(
    $templateCache,
    FormioUtils
  ) {
    $templateCache.put('formio/components/radio.html', FormioUtils.fieldWrap(
      '<div class="radio" ng-repeat="v in component.values track by $index">' +
        '<label class="control-label" for="value">' +
          '<input type="{{ component.inputType }}" ' +
            'id="{{ v.value }}" ' +
            'name="{{ component.key }}" ' +
            'value="{{ v.value }}" ' +
            'ng-model="data[component.key]" ' +
            'ng-required="component.validate.required" ' +
            'ng-disabled="readOnly"' +
            'custom-validator="component.validate.custom">' +
          '{{ v.label }}' +
        '</label>' +
      '</div>'
    ));
  }
]);
