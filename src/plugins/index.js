module.exports = function(app) {
  require('./storage/url')(app);
  require('./storage/s3')(app);
  require('./storage/dropbox')(app);
};
