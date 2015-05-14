app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('datetime', {
      title: 'Date / Time',
      template: 'formio/components/datetime.html',
      settings: {
        input: true,
        label: '',
        key: '',
        placeholder: '',
        minuteStep: 15,
        protected: false,
        persistent: true,
        validate: {
          required: false,
          custom: ''
        }
      }
    });
  }
]);
app.run([
  '$templateCache',
  'FormioUtils',
  function($templateCache, FormioUtils) {
    $templateCache.put('formio/components/datetime.html', FormioUtils.fieldWrap(
      '<div class="dropdown">' +
        '<a class="dropdown-toggle" id="{{ component.key + \'-dropdown\' }}"role="button" data-toggle="dropdown" data-target="#" href="javascript:void(0);">' +
          '<div class="input-group">' +
            '<span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span>' +
            '<input type="text"' +
              'class="form-control" ' +
              'id="{{ component.key }}" ' +
              'name="{{ component.key }}" ' +
              'data-ng-model="data[component.key]" ' +
              'placeholder="{{ component.placeholder }}" ' +
              'custom-validator="component.validate.custom" ' +
              'ng-required="component.validate.required">' +
          '</div>' +
        '</a>' +
        '<ul class="dropdown-menu" role="menu">' +
          '<datetimepicker ' +
            'ng-model="data[component.key]" ' +
            'data-datetimepicker-config="{ minuteStep: component.minuteStep, dropdownSelector: \'#\' + component.key + \'-dropdown\' }">' +
          '</datetimepicker>' +
        '</ul>' +
      '</div>'
    ));
  }
]);
