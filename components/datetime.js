'use strict';

var app = angular.module('formio.components');
app.directive('dateTimePicker', function() {
  return {
    restrict: 'AE',
    scope: false,
    link: function(scope, element) {
      element.datetimepicker();
    }
  };
});
app.config(function(formioComponentsProvider) {
  formioComponentsProvider.register('datetime', {
    title: 'Date / Time',
    template: 'formio/components/datetime.html',
    settings: {
      input: true,
      label: '',
      key: '',
      placeholder: '',
      prefix: '',
      suffix: '',
      multiple: false,
      validate: {
        required: false,
        custom: ''
      }
    }
  });
});
app.run([
  '$templateCache',
  function($templateCache) {
    $templateCache.put('formio/components/datetime.html',
      ''
    );
  }
]);
