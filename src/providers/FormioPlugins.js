module.exports = function() {
  var plugins = {};

  return {
    register: function(type, name, plugin) {
      if (!plugins[type]) {
        plugins[type] = {};
      }
      plugins[type][name] = plugin;
    },

    $get: [
      function() {
        return function(type, name) {
          if (type) {
            if (name) {
              return plugins[type][name] || false;
            }
            return plugins[type] || false;
          }
          return plugins;
        };
      }
    ]
  };
};
