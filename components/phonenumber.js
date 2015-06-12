app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('phoneNumber', {
      title: 'Phone Number',
      template: 'formio/components/phoneNumber.html',
      settings: {
        input: true,
        tableView: true,
        inputMask: '(999) 999-9999',
        label: '',
        key: '',
        placeholder: '',
        prefix: '',
        suffix: ''
      }
    });
  }
]);
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/phoneNumber.html',
      '<label ng-if="component.label" for="{{ component.key }}">{{ component.label }}</label>' +
      '<div class="input-group" ng-if="component.prefix || component.suffix">' +
        '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
        '<input type="text" class="form-control" ng-model="data[component.key]" ng-disabled="readOnly" id="{{ component.key }}" placeholder="{{ component.placeholder }}" formio-input-mask="{{ component.inputMask }}">' +
        '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
      '</div>' +
      '<input ng-if="!component.prefix && !component.suffix" type="text" class="form-control" ng-model="data[component.key]" id="{{ component.key }}" placeholder="{{ component.placeholder }}" formio-input-mask="{{ component.inputMask }}">'
    );
  }
]);
