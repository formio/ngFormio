const app = angular.module('formio');
export default app.provider('formioComponents', function() {
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
  return {
    addGroup: function(name, group) {
      console.warn('formioComponents is deprecated');
    },
    register: function(type, component, group) {
      console.warn('formioComponents is deprecated');
    },
    $get: function() {
      console.warn('formioComponents is deprecated');
      return {
        components: components,
        groups: groups
      };
    }
  };
});