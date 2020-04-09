const app = angular.module('formio');
export default app.factory('FormioScope', function() {
  return {
    onError: function ($scope, $element) {
      return function (error) {
        if ((error.name === 'ValidationError') && $element) {
          var element = $element.find('#form-group-' + error.details[0].path);
          element.addClass('has-error');
          var message = 'ValidationError: ' + error.details[0].message;
          $scope.showAlerts({
            type: 'danger',
            message: message
          });
          $scope.$on('formSubmit', function () {
            element.removeClass('has-error');
          });
        }
        else {
          if (error instanceof Error) {
            error = error.toString();
          }
          else if (typeof error === 'object') {
            error = JSON.stringify(error);
          }
          $scope.showAlerts({
            type: 'danger',
            message: error
          });
        }
        $scope.$emit('formError', error);
      };
    }
  };
});
