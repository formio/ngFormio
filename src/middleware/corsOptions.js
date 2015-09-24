
/**
 * Provides CORS capabilities.
 *
 * Middleware to determine CORS access.
 */
module.exports = function(router) {
  return function(req, callback) {
    var whitelist = [
      'https://form.io',
      'https://test-form.io',
      'https://develop-form.io',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:9002',
      'https://portal.form.io',
      'https://portal.test-form.io',
      'https://portal.develop-form.io',
      'http://portal.localhost:3000',
      'http://portal.localhost:3001',
      'http://portal.localhost:9002'
    ];
    var pass = {
      origin: true
    };
    var fail = {
      origin: 'https://form.io'
    }

    // Allow CORS if there is no project.
    if (
      !req.projectId ||
      (req.projectId === 'available') ||
      !router.formio.mongoose.Types.ObjectId.isValid(req.projectId)
    ) {
      return callback(null, pass);
    }

    // Load the project settings.
    router.formio.hook.settings(req, function(err, settings) {
      if (err) {
        return callback(err);
      }

      // Build the list of supported domains.
      settings = settings || {};
      var cors = settings.cors || '*';
      whitelist = whitelist.concat(cors.split(/[\s,]+/));

      // Support * for domain name.
      if (whitelist.indexOf('*') !== -1) {
        return callback(null, pass);
      }

      if (whitelist.indexOf(req.header('Origin')) !== -1) {
        return callback(null, pass);
      }
      else {
        return callback(null, fail);
      }
    });
  };
}
