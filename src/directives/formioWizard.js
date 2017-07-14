const app = angular.module('formio');
// Need to do something here.
app.directive('formioWizard', function() {
  return {
    restrict: 'E',
    replace: true,
    template: '<div>Formio Wizard</div>'
  };
});
