'use strict';
angular.module('formioApp')
  .directive('pdfBuilder', function() {
    return {
      replace: true,
      templateUrl: 'views/pdfbuilder.html',
      scope: {
        form: '=?'
      },
      controller: ['$scope', function($scope) {
        console.log($scope.form);
      }]
    };
  });
