app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('checkbox', {
      title: 'Check Box',
      template: 'formio/components/checkbox.html',
      settings: {
        input: true,
        inputType: 'checkbox',
        tableView: true,
        // This hides the default label layout so we can use a special inline label
        hideLabel: true,
        label: '',
        key: '',
        prefix: '',
        suffix: '',
        defaultValue: false,
        protected: false,
        persistent: true,
        validate: {
          required: false,
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
    $templateCache.put('formio/components/checkbox.html', FormioUtils.fieldWrap(
      '<div class="checkbox">' +
        '<label for={{ component.key }} ng-class="{\'field-required\': component.validate.required}">' +
          '<input type="{{ component.inputType }}" ' +
            'id="{{ component.key }}" ' +
            'name="{{ component.key }}" ' +
            'value="{{ component.key }}" ' +
            'ng-disabled="readOnly" ' +
            'ng-model="data[component.key]" ' +
            'ng-required="component.validate.required">' +
          '{{ component.label }}' +
        '</label>'+
      '</div>'
    ));
  }
]);
