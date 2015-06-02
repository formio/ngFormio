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
        format: 'yyyy-MM-dd HH:mm',
        default: '',
        enableDate: true,
        enableTime: true,
        datePicker: {
          minDate: null,
          maxDate: null,
          showWeeks: true,
          startingDay: 1,
          initDate: '',
          minMode: 'day',
          maxMode: 'year',
          yearRange: '20'
        },
        timePicker: {
          hourStep: 1,
          minuteStep: 1,
          showMeridian: true,
          meridians: null,
          readonlyInput: false,
          mousewheel: true,
          arrowkeys: true
        },
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
      '<p class="input-group">' +
        '<input type="text" class="form-control" ' +
          'ng-init="calendarOpen = false" ' +
          'is-open="calendarOpen" ' +
          'datetime-picker="component.format" ' +
          'enable-date="component.enableDate" ' +
          'enable-time="component.enableTime" ' +
          'ng-model="data[component.key]" ' +
          'datepicker-options="component.datePicker" ' +
          'timepicker-options="component.timePicker" />' +
        '<span class="input-group-btn">' +
          '<button type="button" class="btn btn-default" ng-click="calendarOpen = true">' +
            '<i ng-if="component.enableDate" class="fa fa-calendar"></i>' +
            '<i ng-if="!component.enableDate" class="fa fa-clock-o"></i>' +
          '</button>' +
        '</span>' +
      '</p>'
    ));
  }
]);
