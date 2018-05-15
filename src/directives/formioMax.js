module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ctrl) {
      var maxValue;
      ctrl.$validators.max = function(value) {
        if (ctrl.$isEmpty(value) || angular.isUndefined(maxValue)) {
          return true;
        } else {
          var valueAsNumber = angular.isNumber(value) ? value : parseFloat(value, 10);
          return valueAsNumber <= maxValue;
        }
      };

      scope.$watch(attrs.formioMax, function(value) {
        if (angular.isDefined(value) && !angular.isNumber(value)) {
          value = parseFloat(value, 10);
        }
        maxValue = angular.isNumber(value) && !isNaN(value) ? value : undefined;
        ctrl.$validate();
      });
    }
  };
};