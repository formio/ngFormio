'use strict';

var app = angular.module('formio.components');
app.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('textfield', {
    title: 'Text Field',
    template: 'formio/components/textfield.html',
    settings: {
      input: true,
      inputType: 'text',
      inputMask: '',
      label: '',
      key: '',
      placeholder: '',
      prefix: '',
      suffix: '',
      multiple: false,
      defaultValue: '',
      validate: {
        required: false,
        minLength: '',
        maxLength: '',
        pattern: '',
        custom: ''
      }
    }
  });
});
app.run([
  '$templateCache',
  'FormioUtils',
  function(
    $templateCache,
    FormioUtils
  ) {
    $templateCache.put('formio/components/textfield.html', FormioUtils.fieldWrap(
      '<input type="{{ component.inputType }}" ' +
        'class="form-control" ' +
        'id="{{ component.key }}" ' +
        'name="{{ component.key }}" ' +
        'ng-model="data[component.key]" ' +
        'ng-required="component.validate.required" ' +
        'ng-minlength="component.validate.minLength" ' +
        'ng-maxlength="component.validate.maxLength" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'formio-input-mask="{{ component.inputMask }}">'
    ));
  }
]);
