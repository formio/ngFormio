'use strict';

var app = angular.module('formio.components');
app.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('textarea', {
    title: 'Text Area',
    template: 'formio/components/textarea.html',
    settings: {
      input: true,
      label: '',
      key: '',
      placeholder: '',
      prefix: '',
      suffix: '',
      rows: 3,
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
    $templateCache.put('formio/components/textarea.html', FormioUtils.fieldWrap(
      '<textarea ' +
        'class="form-control" ' +
        'ng-model="data[component.key]" ' +
        'id="{{ component.key }}" ' +
        'placeholder="{{ component.placeholder }}" ' +
        'rows="{{ component.rows }}"></textarea>'
    ));
  }
]);
