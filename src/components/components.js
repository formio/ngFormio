module.exports = function(app) {
  app.provider('formioComponents', function() {
    var components = {};
    var groups = {
      __component: {
        title: 'Basic Components'
      },
      advanced: {
        title: 'Special Components'
      },
      layout: {
        title: 'Layout Components'
      }
    };

    function mergeComponents(type, component, group) {
      if (!components[type]) {
        components[type] = component;
      }
      else {
        angular.extend(components[type], component);
      }

      // Set the type for this component.
      if (!components[type].group) {
        components[type].group = group || '__component';
      }
      components[type].settings.type = type;
    }

    function addGroup(name, group) {
      groups[name] = group;
    }

    return {
      addGroup: addGroup,
      register: mergeComponents,
      $get: function() {
        return {
          components: components,
          groups: groups,
          update: mergeComponents,
          addGroup: addGroup
        };
      }
    };
  });

  app.directive('safeMultipleToSingle', [function() {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function($scope, el, attrs, ngModel) {
        ngModel.$formatters.push(function(modelValue) {
          if (!$scope.component.multiple && Array.isArray(modelValue)) {
            return modelValue[0] || '';
          }

          return modelValue;
        });
      }
    };
  }]);
};
