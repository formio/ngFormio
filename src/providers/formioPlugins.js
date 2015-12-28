
module.exports = function() {

  var plugins = {};

  return {

    register: function(type, name, plugin) {
      plugins[type][name] = plugin;
    },

    $get: [
      function() {
        return {
          get: function(type, name) {
            if (type) {
              if (name) {
                return plugins[type][name] || false;
              }
              return plugins[type] || false;
            }
            return plugins;
          }
        };
      }
    ]
  };
}
