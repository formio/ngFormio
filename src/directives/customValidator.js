module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (scope.options && scope.options.building) return;
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }

      var _get = function(item, path, def) {
        if (!item) {
          return def || undefined;
        }
        if (!path) {
          return item;
        }

        // If the path is a string, turn it into an array.
        if (typeof path === 'string') {
          path = path.split('.');
        }
        // If the path is an array, take the first element, and recurse its path
        if (path instanceof Array) {
          var current = path.shift();
          if (item.hasOwnProperty(current)) {
            // If there are no more path items, stop here.
            if (path.length === 0) {
              return item[current];
            }

            return _get(item[current], path);
          }

          return undefined;
        }

        return undefined;
      };

      ctrl.$validators.custom = function(modelValue, viewValue) {
        var valid = true;
        /*eslint-disable no-unused-vars */
        var input = modelValue || viewValue;

        // FOR-255 - Enable row data and form data to be visible in the validator.
        var data = scope.submission.data;
        var row = scope.data;
        /*eslint-enable no-unused-vars */

        var custom = scope.component.validate.custom;
        custom = custom.replace(/({{\s{0,}(.*[^\s]){1}\s{0,}}})/g, function(match, $1, $2) {
          return _get(scope.submission.data, $2);
        });

        try {
          /* jshint evil: true */
          eval(custom);
        }
        catch (err) {
          valid = err.message;
        }

        if (valid !== true) {
          scope.component.customError = valid;
          return false;
        }
        return true;
      };
    }
  };
};
