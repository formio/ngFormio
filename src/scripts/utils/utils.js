'use strict';

angular.module('formioApp.utils', [])
/**
 * Automatically focuses an input when created.
 * Must use like `autofocus="expression"`
 */
.directive('autofocus', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    scope: {
      autofocus: '&autofocus'
    },
    link : function($scope, $element) {
      if($scope.autofocus) {
        $timeout(function() {
          $element[0].focus();
        });
      }

    }
  };
}]);
