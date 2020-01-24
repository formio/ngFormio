'use strict';

var app = angular.module('formioApp');

app.factory('SubmissionExport', [
  '$http',
  'FileSaver',
  'FormioUtils',
  function($http, FileSaver, FormioUtils) {
    return {
      export: function(formio, form, type) {
        var url = formio.projectUrl + '/form/' + form._id + '/export?format=' + type;
        if (type === 'csv') {
          url += '&view=formatted';
        }
        url += '&timezone=' + encodeURIComponent(FormioUtils.currentTimezone());
        console.log(url);
        return $http({
          url: url,
          method: 'GET',
          responseType: 'blob'
        }).then(function(response) {
          FileSaver.saveAs(response.data, form.name.toLowerCase() + '.' + type);
        });
      }
    };
  }
]);
