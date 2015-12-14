module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }
      ctrl.$parsers.unshift(function(input) {
        var valid = true;
        if (input) {
          var custom = scope.component.validate.custom;
          custom = custom.replace(/({{\s+(.*)\s+}})/, function(match, $1, $2) {
            return scope.data[$2];
          });
          /* jshint evil: true */
          valid = eval(custom);
          ctrl.$setValidity('custom', (valid === true));
        }
        if (valid !== true) {
          scope.component.customError = valid;
        }
        return (valid === true) ? input : valid;
      });
    }
  };
};
