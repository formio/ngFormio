'use strict';
angular.module('formioApp.services', [])

  /**
   * The popup service.
   */
  .service('popupService', [
    '$window',
    function($window) {
      this.showPopup = function(message) {
        return $window.confirm(message);
      };
    }
  ]);
