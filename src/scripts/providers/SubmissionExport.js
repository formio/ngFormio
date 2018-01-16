'use strict';

var app = angular.module('formioApp');

app.factory('SubmissionExport', [
  '$http',
  'FileSaver',
  function($http, FileSaver) {
    return {
      export: function(formio, form, type) {
        console.log(formio.projectUrl + '/form/' + form._id + '/export?format=' + type);
        return $http({
          url: formio.projectUrl + '/form/' + form._id + '/export?format=' + type,
          method: 'GET',
          responseType: 'blob'
        }).then(function(response) {
          FileSaver.saveAs(response.data, form.name + '.' + type);
        });
      }
    };
  }
]);
