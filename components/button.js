app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('button', {
      title: 'Button',
      template: 'formio/components/button.html',
      settings: {
        input: true,
        label: 'Submit',
        tableView: false,
        key: 'submit',
        size: 'md',
        leftIcon: '',
        rightIcon: '',
        block: false,
        action: 'submit',
        disableOnInvalid: true,
        theme: 'primary'
      }
    });
  }
]);
app.run([
  '$templateCache',
  function(
    $templateCache
  ) {
    $templateCache.put('formio/components/button.html',
      '<button ng-class="{\'btn-block\': component.block}" class="btn btn-{{ component.theme }} btn-{{ component.size }}" ng-disabled="readOnly || (component.disableOnInvalid && form.$invalid)" ng-click="$emit(component.action)">' +
        '<span ng-if="component.leftIcon" class="{{ component.leftIcon }}" aria-hidden="true"></span>' +
        '<span ng-if="component.leftIcon && component.label">&nbsp;</span>' +
        '{{ component.label }}' +
        '<span ng-if="component.rightIcon && component.label">&nbsp;</span>' +
        '<span ng-if="component.rightIcon" class="{{ component.rightIcon }}" aria-hidden="true"></span>' +
      '</button>'
    );
  }
]);

