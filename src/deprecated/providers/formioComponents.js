const app = angular.module('formio');

export default app.provider('formioComponents', function() {
  let warned = false;
  let components = {};
  let groups = {
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
  return {
    addGroup: function(name, group) {
      groups[name] = group;
    },
    register: function(type, component, group) {
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
    },
    $get: function() {
      if (!warned) {
        console.warn('formioComponents is deprecated');
        warned = true;
      }
      return {
        components: components,
        groups: groups
      };
    }
  };
});
