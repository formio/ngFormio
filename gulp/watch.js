'use strict';

var path = require('path');

module.exports = function(gulp, plugins) {
  return function() {
    var bundle = plugins.browserify({
      entries: './src/formio.js',
      debug: true,
      ignoreMissing: true
    });

    var build = require('./scripts-basic')(gulp, plugins, bundle);
    bundle = plugins.watchify(bundle);
    bundle.on('update', function(files) {
      console.log('Changed files: ', files.map(path.relative.bind(path, process.cwd())).join(', '));
      console.log('Rebuilding dist/formio.js...');
      build();
    });
    bundle.on('log', function(msg) {
      console.log(msg);
    });

    return build();
  };
};