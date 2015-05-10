'use strict';

angular.module('formioApp.directives', [])

// The logo directive.
.directive('logo', function() {
  return {
    restrict: 'E',
    scope: {
      size: '@',
      dotcolor: '@'
    },
    templateUrl: 'views/partials/logo.html'
  };
});
