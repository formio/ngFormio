module.exports = function(router) {
  return {
    s3: require('./s3')(router)
  };
};
