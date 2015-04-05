components.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('number', {
    title: 'Number',
    template: 'formio/components/number.html',
    settings: {
      input: true,
      inputType: 'number',
      label: '',
      key: '',
      placeholder: '',
      prefix: '',
      suffix: '',
      defaultValue: '',
      validate: {
        required: false,
        min: '',
        max: '',
        greater: '',
        less: '',
        step: 'any',
        integer: '',
        multiple: '',
        custom: ''
      }
    }
  });
});
components.run([
  '$templateCache',
  'FormioUtils',
  function(
    $templateCache,
    FormioUtils
  ) {
    $templateCache.put('formio/components/number.html', FormioUtils.fieldWrap(
      '<input type="{{ component.inputType }}" ' +
        'class="form-control" ' +
        'id="{{ component.key }}" ' +
        'name="{{ component.key }}" ' +
        'ng-model="data[component.key]" ' +
        'ng-required="component.validate.required" ' +
        'min="{{ component.validate.min }}" ' +
        'max="{{ component.validate.max }}" ' +
        'step="{{ component.validate.step }}" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'formio-input-mask="{{ component.inputMask }}">'
    ));
  }
]);

