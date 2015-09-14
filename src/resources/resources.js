'use strict';

module.exports = function(router, formio) {
  return {
    project: require('./ProjectResource')(router, formio)
  };
};
