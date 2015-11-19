'use strict';

module.exports = function(router, formioServer) {
  return {
    project: require('./ProjectResource')(router, formioServer)
  };
};
