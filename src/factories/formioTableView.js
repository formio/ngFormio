import { Components } from 'formiojs';

const app = angular.module('formio');
export default app.factory('formioTableView', [function () {
  return function (value, component) {
    if (!value && value !== 0 && value !== false) {
      return '';
    }
    if (!component || !component.input || !component.type) {
      return value;
    }
    const componentObject = Components.create(component, {
      readOnly: true,
      viewAsHtml: true
    });
    if (!componentObject.getView) {
      return value;
    }
    if (component.multiple && value.length > 0) {
      var values = [];
      angular.forEach(value, function (arrayValue) {
        values.push(componentObject.getView(arrayValue));
      });
      return values;
    }
    return componentObject.getView(value);
  };
}]);
