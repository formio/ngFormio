module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ctrl) {
      var minValue;
      ctrl.$validators.min = function(value) {
        if (ctrl.$isEmpty(value) || angular.isUndefined(minValue)) {
          return true;
        } else {
          var valueAsNumber = angular.isNumber(value) ? value : parseFloat(value, 10);
          return valueAsNumber >= minValue;
        }
      };
      
      scope.$watch(attrs.formioMin, function(value) {
        if (angular.isDefined(value) && !angular.isNumber(value)) {
          value = parseFloat(value, 10);
        }
        minValue = angular.isNumber(value) && !isNaN(value) ? value : undefined;
        ctrl.$validate();
      });
    }
  };
};
