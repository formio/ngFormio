module.exports = [
  'Formio',
  'formioComponents',
  '$interpolate',
  'FormioUtils',
  function(
    Formio,
    formioComponents,
    $interpolate,
    FormioUtils
  ) {
    return function(value, component) {
      if (!value && value !== 0 && value !== false) {
        return '';
      }
      if (!component || !component.input|| !component.type) {
        return value;
      }
      var componentInfo = formioComponents.components[component.type];
      if (!componentInfo.tableView) {
        return value;
      }
      if (component.multiple && (value.length > 0)) {
        var values = [];
        angular.forEach(value, function(arrayValue) {
          values.push(componentInfo.tableView(arrayValue, {
            component: component,
            $interpolate: $interpolate,
            componentInfo: formioComponents,
            util: FormioUtils
          }));
        });
        return values;
      }
      return componentInfo.tableView(value, {
        component: component,
        $interpolate: $interpolate,
        componentInfo: formioComponents,
        util: FormioUtils
      });
    };
  }
];
