module.exports = WebdriverioFormio;

var webdriverjs = require('webdriverio/lib/webdriverio');
var inherits = require('util').inherits;

function WebdriverioFormio(options) {
  webdriverjs.apply(this, arguments);

  var client = this;
  //var originalUrl = client.url.bind(client);

  patch('init', addTimeout);
  client.addCommand('url', function(url, cb) {
    if (typeof url === 'function') {
      return client.prototype.url.call(client, url);
    }

    // If this is not an angular page, skip the angular check.
    if (!url.indexOf('/app') === 0) {
      return client.prototype.url.call(client, url);
    }

    /*!
     * parameter check
     */
    if (typeof url === 'string') {

      if(typeof options.baseUrl === 'string' && url.indexOf('/') === 0) {
        url = options.baseUrl + url;
      }
    }

    originalUrl('about:blank')
      .execute(function() {
        var url = arguments[0];
        window.name = 'NG_DEFER_BOOTSTRAP!' + window.name;
        window.location.assign(url);
      }, [url]);

    waitForLoad(function(err) {
      if (err) {
        return cb(err);
      }

      client
        .executeAsync(browserScripts.testForAngular, [20], function(err, res) {
          if (err) {
            return cb(err)
          }

          client.execute(function() {
            angular.resumeBootstrap();
          }, [], cb);
        });
    });

    function waitForLoad(cb) {
      var timeout;
      var cancelLoading = setTimeout(function hasTimeout() {
        timeout = true;
        cb(new Error('Timeout while waiting for page to load'));
      }, 10 * 1000);

      hasLoaded(function checkForLoad(err, res) {
        if (timeout === true) {
          return;
        }

        if (err) {
          clearTimeout(cancelLoading);
          return cb(err);
        }

        if (res === true) {
          clearTimeout(cancelLoading);
          return cb(null)
        }

        hasLoaded(checkForLoad);
      });

      function hasLoaded(cb) {
        originalUrl(function(err, url) {
          if (url === 'about:blank') {
            return cb(err, false);
          }

          cb(err, true)
        });
      }
    }

  });

  [ 'element', 'elements', 'title'].forEach(waitForAngularBefore);

  ['url', 'elementIdClick'].forEach(waitForAngularAfter);

  function waitForAngularBefore (method) {
    var original = client[method];
    client.addCommand(method, function(){

      var originalArgs = arguments;

      waitForAngular(function() {
        original.apply(client, originalArgs);
      });
    });
  }

  function waitForAngularAfter (method) {
    patch(method, waitForAngular);
  }

  function patch(method, patchFn) {
    var original = client[method];

    client.addCommand(method, function() {
      var originalArgs = Array.prototype.slice.call(arguments);
      var cb = originalArgs.pop();

      originalArgs.push(function() {
        var responseArgs = arguments;

        patchFn(function() {
          cb.apply(client, responseArgs);
        });
      });

      original.apply(client, originalArgs);
    });
  }

  function waitForAngular(cb) {
    client.executeAsync(
      browserScripts.waitForAngular,
      [options.ngRoot],
      cb);
  }

  function addTimeout(cb) {
    client.timeouts('script', 10 * 1000, cb);
  }
}

inherits(WebdriverioFormio, webdriverjs);

WebdriverioFormio.remote = function WebdriverioFormioRemote(options) {
  return require('webdriverio').remote(options, WebdriverioFormio);
}
