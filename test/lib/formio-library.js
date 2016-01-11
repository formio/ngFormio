'use strict';

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;
var request = require('request');
var chance = require('chance').Chance();
var _ = require('lodash');

module.exports = function(config) {
  // Global timeout for wait* commands.
  var timeout = 60000;
  var state = {};

  /**
   * Wrap the string function for usernames.
   *
   * @param options
   * @returns {*}
   */
  chance.username = function(options) {
    options = options || {};
    _.extend(options, {
      length: 10,
      pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
    return this.string(options);
  };

  /**
   * Wrap the string function for passwords.
   * @param options
   * @returns {*}
   */
  chance.password = function(options) {
    options = options || {};
    _.extend(options, {
      length: 12
    });
    return this.string(options);
  };

  /**
   *
   * @param text
   * @returns {*}
   */
  var replacements = function(text) {
    // Regex to find ${string}.
    var regex = /\$\{(.+?[^\}])\}/g;
    text = text.replace(regex, function(match, str) {
      if (_.has(state, str)) {
        return _.get(state, str);
      }
      var parts = str.split('-');
      // If we've substituted this before use the same value.
      // If chance knows the type, fulfill with the chance library.
      if (typeof chance[parts[1]] === 'function') {
        state[str] = chance[parts[1]]();
        return state[str];
      }
      // Don't know how to handle it.
      return '';
    });
    return text;
  };

  /**
   *
   * @param err
   * @param response
   * @param body
   * @param next
   * @returns {*}
   */
  var handleResponse = function(err, response, body, next) {
    if (err) {
      return next(err);
    }
    if (response.statusCode != 200) {
      return next(body);
    }

    var token = response.headers['x-jwt-token'] || '';
    next(null, body, token);
  };

  /**
   *
   * @param projectName
   * @param formName
   * @param email
   * @param password
   * @param next
   */
  var authUser = function(projectName, formName, email, password, next) {
    request({
      rejectUnauthorized: false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'user.email': email,
          'user.password': password
        }
      }
    }, function(err, response, body) {
      handleResponse(err, response, body, next);
    });
  };

  /**
   *
   * @param projectName
   * @param formName
   * @param username
   * @param email
   * @param password
   * @param next
   */
  var createUser = function(projectName, formName, username, email, password, next) {
    request({
      rejectUnauthorized: false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'user.email': email,
          'user.name': username,
          'user.password': password,
          'verifyPassword': password
        }
      }
    }, function(err, response, body) {
      handleResponse(err, response, body, next);
    });
  };

  /**
   *
   * @param username
   * @param email
   * @param password
   * @param next
   */
  var createAndAuthUser = function(username, email, password, next) {
    createUser('formio', 'user/register', username, email, password, function(err, user) {
      if (err) {
        return next(err);
      }

      authUser('formio', 'user/login', email, password, function(err, res, token) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        next(null, res, token);
      });
    });
  };

  var library = English.library()
    .given('I am (?:on|at) (?:the )?(.+?)(?: page)?$', function(url, next) {
      var path = (url === 'home') ? config.baseUrl + '/' : config.baseUrl + url;

      this.driver.url(path)
        .then(function() {
          next();
        });
    })
    .given('an account exists with the username $USERNAME, email $EMAIL and password $PASSWORD', function(username, email, password, next) {
      username = replacements(username);
      email = replacements(email);
      password = replacements(password);
      authUser('formio', 'user/login', email, password, function(err, res) {
        if (err || res === 'Invalid user') {
          // User doesn't exist. Create it.
          return createUser('formio', 'user/register', username, email, password, next);
        }

        // User already exists. Do nothing.
        next();
      });
    })
    .given('I am logged out', function(next) {
      this.driver.localStorage('DELETE', 'formioToken')
        .then(function() {
          next();
        })
        .catch(function(err) {
          next(err);
        });
    })
    .given('I am logged in(?: for )?(.+)?$', function(tempUser, next) {
      if (!next && tempUser) {
        next = tempUser;
        tempUser = null;
      }

      var driver = this.driver;
      if (tempUser && state[tempUser]) {
        authUser('formio', 'user/login', state[tempUser].email, state[tempUser].password, function(err, res, token) {
          if (err) {
            return next(err);
          }
          if (!res) {
            return next(new Error('Authentication Failed.'));
          }

          driver.localStorage('POST', {key: 'formioToken', value: token})
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        });
      }
      else {
        state[tempUser] = {};
        state[tempUser].username = Math.random().toString(36).substring(7);
        state[tempUser].email = Math.random().toString(36).substring(7) + '@example.com';
        state[tempUser].password = Math.random().toString(36).substring(7);
        createAndAuthUser(state[tempUser].username, state[tempUser].email, state[tempUser].password, function(err, res, token) {
          if (err) {
            return next(err);
          }

          driver.localStorage('POST', {key: 'formioToken', value: token})
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        });
      }
    })
    .given('I am logged in as $EMAIL with password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user/login', email, password, function(err, res, token) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        driver.localStorage('POST', {key: 'formioToken', value: token})
          .then(function() {
            next();
          });
      });
    })
    .when('I click (?:on )?the $LINK link', function(link, next) {
      this.driver.waitForExist('=' + link, timeout)
        .then(function() {
          this.driver.click('=' + link)
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        }.bind(this))
        .catch(function(err) {
          next(err);
        });
    })
    .when('I click (?:on )?the $BUTTON button', function(button, next) {
      var driver = this.driver;
      driver.pause(1000)
        .then(function() {
          return driver.waitForExist('//button[contains(.,\'' + button + '\')]', timeout);
        })
        .then(function() {
          return driver.click('//button[contains(.,\'' + button + '\')]');
        })
        .then(function() {
          next();
        });
    })
    .when('I enter $TEXT in the $FIELD field', function(text, field, next) {
      var driver = this.driver;
      driver.waitForExist(field, timeout)
        .then(function() {
          return driver.setValue(field, replacements(text));
        })
        .then(function() {
          next();
        })
        .catch(next);
    })
    .when('I expand the user menu', function(next) {
      var driver = this.driver;
      driver.waitForExist('#user-menu')
        .then(function() {
          driver.click('#user-menu')
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            })
        })
        .catch(function(err) {
          next(err);
        });
    })
    .when('I wait $TIME milliseconds', function(time, next) {
      this.driver.pause(time).then(function() {
        next();
      }).catch(next);
    })
    .then('the title is $TITLE', function(title, next) {
      this.driver.getTitle()
        .then(function(res) {
          try {
            assert.equal(res, title);
            next();
          }
          catch(err) {
            next(err);
          }
        })
        .catch(function(err) {
          next(err);
        });
    })
    .then('I am (?:on|at) (?:the )?(.+?)(?: page)$', function(path, next) {
      path = (path === 'home') ? config.baseUrl + '/' : config.baseUrl + path;

      this.driver.url()
        .then(function(res) {
          assert.equal(res.value, path);
          next();
        });
    })
    .then('I have been logged in', function(next) {
      var driver = this.driver;
      this.driver.pause(700).then(function(){
        driver.localStorage('GET', 'formioToken', function(err, res) {
          if (err) {
            return next(err);
          }
          if ((!err) && (res.value)) {
            return next();
          }

          next(new Error('No formioToken found; ' + JSON.stringify(res)));
        });
      });
    })
    .then('I have been logged out', function(next) {
      var driver = this.driver;
      this.driver.pause(500).then(function(){
        driver.localStorage('GET', 'formioToken', function(err, res) {
          if (err) {
            return next(err);
          }
          if ((!err) && (res.value)) {
            return next(new Error('User still logged in: ' + JSON.stringify(res)));
          }

          next();
        });
      });
    })
    .then('I see a notification with (?:the text )?$TEXT', function(text, next) {
      var driver = this.driver;
      driver.waitForExist('//div[@class=\'ui-notification\']/div[@class=\'message\']', timeout)
        .then(function() {
          return driver.getText('//div[@class=\'ui-notification\']/div[@class=\'message\']');
        })
        .then(function(alert) {
          assert.equal(text, alert);
        });

      this.driver.waitForExist('//div[@class=\'ui-notification\']/div[@class=\'message\']', timeout)
        .then(function() {
          this.driver.getText('//div[@class=\'ui-notification\']/div[@class=\'message\']')
            .then(function(alert) {
              assert.equal(text, alert);
              next();
            })
            .catch(function(err) {
              next(err);
            });
        }.bind(this))
        .catch(function(err) {
          next(err);
        });
    })
    .then('I see an alert with (?:the text )?$TEXT', function(text, next) {
      var driver = this.driver;
      driver.waitForExist('//div[@role=\'alert\']', timeout)
        .then(function() {
          return driver.getText('//div[@role=\'alert\']');
        })
        .then(function(alert) {
          assert.equal(text, alert);
          next();
        })
        .catch(next);
    })
    .then('I see $TEXT', function(text, next) {
      text = replacements(text);

      this.driver.waitForExist('//*[text()=\'' + text + '\']', 500)
        .then(function(found) {
          next();
        })
        .catch(function(err) {
          next(err);
        });
    })
    .then('the $BUTTON button is disabled', function(button, next) {
      var driver = this.driver;
      this.driver.waitForExist('//button[text()=\'' + button + '\']', 500)
        .then(function() {
          next();
          //driver.isEnabled('//button[text()=\'' + button + '\']')
          //  .then(function(isEnabled) {
          //    assert(!isEnabled, 'Button ' + button + ' is enabled when it should be disabled');
          //    next();
          //  })
          //  .catch(function(err) {
          //    next(err);
          //  });
        })
        .catch(function(err) {
          next(err);
        });
    });

  return library;
};
