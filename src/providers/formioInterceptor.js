const app = angular.module('formio');
export default app.factory('FormioScope', function() {
  return {
    onError: function() {
      console.warn('FormioScope is deprecated');
    },
    register: function() {
      console.warn('FormioScope is deprecated');
    },
  };
});