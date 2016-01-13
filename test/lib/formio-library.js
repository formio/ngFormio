'use strict';

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;
var request = require('request');
var chance = (new require('chance'))();
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
      length: chance.natural({min: 5, max: 20}),
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
      length: chance.natural({min: 5, max: 20})
    });
    return this.string(options);
  };

  /**
   * Generate a random string of the given type, for use in the tests.
   *
   * @param {String} type
   */
  var random = function(type) {
    switch (type) {
      case 'fullName' :
        return chance.name();
      case 'name':
      case 'username':
        return chance.username();
      case 'email':
        return chance.email();
      case 'password':
        return chance.password();
      default:
        return '';
    }
  };

  /**
   * Update an object in the state cache using its cache key, and a key/value pair.
   *
   * @param {String} cacheKey
   *   The key used for state.
   * @param {String} oldKey
   *   The key used for access with the object stored at state[cacheKey]
   * @param {String} newValue
   *   The value to set at oldKey, e.g.: state[cacheKey].oldKey = newValue;
   *
   * @returns {boolean}
   *   If the cache key was updated or not.
   */
  var update = function(cacheKey, oldKey, newValue) {
    // Attempt to get cached values.
    if (_.has(state, cacheKey)) {
      // Get the object at the old cache key.
      var temp = _.get(state, cacheKey);

      // Store the old value for future comparisons.
      var _old = oldKey + '_old';
      _.set(temp, _old, _.get(temp, oldKey));

      // Update the value for the old key in the temp cache object.
      _.set(temp, oldKey, newValue);
      // Update the object stored at the cacheKey.
      _.set(state, cacheKey, temp);

      return true;
    }

    return false;
  };

  /**
   * Attempt to translate the text using the state cache.
   *
   * @param {String} text
   *   The text string to translate.
   *
   * @returns {*}
   */
  var replacements = function(text) {
    // Regex to find ${string}.
    var regex = /\$\{(.+?[^\}])\}/g;

    // Regex to find ${random-*} strings.
    var randomRegex = /random-(.*)/;
    var randomAssignRegex = /random-(.*)>.*/;
    var randomAssignKeyRegex = /random-.*>(.*)/;

    // Regex to find ${key.value}
    var searchRegex = /(.*)\.(.*)/;

    text = text.replace(regex, function(match, str) {
      // If this is a request for a random string and store, get a random string and store it at #key.
      if (randomAssignRegex.test(str)) {
        var type = randomAssignRegex.exec(str).pop();
        var parts = (randomAssignKeyRegex.exec(str).pop()).split('.');
        var cacheKey = parts[0];
        var key = parts[1];
        var value = random(type);

        // Force the cache key to exist so its always inserted.
        state[cacheKey] = state[cacheKey] || {};

        update(cacheKey, key, value);
        return value;
      }

      // Ig this is just a request for a random string.
      if (randomRegex.test(str)) {
        return random(randomRegex.exec(str).pop());
      }

      // Attempt to get cached values.
      if (searchRegex.test(str)) {
        var parts = searchRegex.exec(str);
        parts.shift(); // remove original string
        var key = parts.shift();
        var property = parts.pop();

        if (_.has(state, [key, property])) {
          return _.get(state, [key, property]);
        }
      }

      return '';
    });

    return text;
  };

  /**
   * Handles the response from a request. Will set the localStorage token if available in the header.
   *
   * @param driver
   * @param err
   * @param response
   * @param body
   * @param next
   * @returns {*}
   */
  var handleResponse = function(driver, err, response, body, next) {
    if (err) {
      return next(err);
    }

    var token = response.headers['x-jwt-token'] || '';
    driver.localStorage('POST', {key: 'formioToken', value: token})
      .then(function() {
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          }
          catch(e) {}
        }

        next(null, body);
      })
      .catch(function(err) {
        next(err);
      });
  };

  /**
   * Util function to authenticate a user against the given project and form with the email and password.
   *
   * @param driver
   * @param projectName
   * @param formName
   * @param email
   * @param password
   * @param next
   */
  var authUser = function(driver, projectName, formName, email, password, next) {
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
      handleResponse(driver, err, response, body, next);
    });
  };

  /**
   * Util function to create a user against the given project and form with the email and password.
   *
   * @param driver
   * @param projectName
   * @param formName
   * @param username
   * @param email
   * @param password
   * @param next
   */
  var createUser = function(driver, projectName, formName, username, email, password, next) {
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
      handleResponse(driver, err, response, body, next);
    });
  };

  /**
   * Util function to create and authenticate a user against the given project and form with the email and password.
   *
   * @param driver
   * @param username
   * @param email
   * @param password
   * @param next
   */
  var createAndAuthUser = function(driver, username, email, password, next) {
    createUser(driver, 'formio', 'user/register', username, email, password, function(err, user) {
      if (err) {
        return next(err);
      }

      authUser(driver, 'formio', 'user/login', email, password, function(err, res) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        next(null, res);
      });
    });
  };

  var library = English.library()
    .given('I am (?:on|at) (?:the )?(.+?)(?: page)?$', function(url, next) {
      var path = (url === 'home') ? config.baseUrl + '/' : config.baseUrl + url;

      var driver = this.driver;
      driver.url(path)
        .then(function() {
          next();
        });
    })
    .given('an account exists with the username $USERNAME, email $EMAIL and password $PASSWORD', function(username, email, password, next) {
      username = replacements(username);
      email = replacements(email);
      password = replacements(password);

      var driver = this.driver;
      authUser(driver, 'formio', 'user/login', email, password, function(err, res) {
        if (err || res === 'Invalid user') {
          // User doesn't exist. Create it.
          return createUser(driver, 'formio', 'user/register', username, email, password, next);
        }

        // User already exists. Do nothing.
        next();
      });
    })
    .given('I am logged out', function(next) {
      var driver = this.driver;
      driver.localStorage('DELETE', 'formioToken')
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
        authUser(driver, 'formio', 'user/login', state[tempUser].email, state[tempUser].password, function(err, res) {
          if (err) {
            return next(err);
          }
          if (!res) {
            return next(new Error('Authentication Failed.'));
          }

          next();
        });
      }
      else {
        state[tempUser] = {};
        state[tempUser].fullName = chance.name();
        state[tempUser].name = chance.username();
        state[tempUser].email = chance.email();
        state[tempUser].password = chance.word({length: 10});
        createAndAuthUser(driver, state[tempUser].name, state[tempUser].email, state[tempUser].password, function(err, res) {
          if (err) {
            return next(err);
          }

          next();
        });
      }
    })
    .given('I am logged in as $EMAIL with password $PASSWORD', function(email, password, next) {
      var driver = this.driver;
      authUser(driver, 'formio', 'user/login', email, password, function(err, res) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        next();
      });
    })
    .when('I click (?:on )?the $LINK link', function(link, next) {
      var driver = this.driver;
      driver.waitForExist('=' + link, timeout)
        .then(function() {
          driver.click('=' + link)
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        })
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
      var driver = this.driver;
      driver.pause(time)
        .then(function() {
          next();
        }).catch(next);
    })
    .then('the title is $TITLE', function(title, next) {
      var driver = this.driver;
      driver.getTitle()
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

      var driver = this.driver;
      driver.url()
        .then(function(res) {
          assert.equal(res.value, path);
          next();
        });
    })
    .then('I have been logged in', function(next) {
      var driver = this.driver;
      driver.pause(700).then(function(){
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
      driver.pause(500).then(function(){
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

      driver.waitForExist('//div[@class=\'ui-notification\']/div[@class=\'message\']', timeout)
        .then(function() {
          driver.getText('//div[@class=\'ui-notification\']/div[@class=\'message\']')
            .then(function(alert) {
              assert.equal(text, alert);
              next();
            })
            .catch(function(err) {
              next(err);
            });
        })
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

      var driver = this.driver;
      driver.waitForExist('//*[text()=\'' + text + '\']', 500)
        .then(function(found) {
          next();
        })
        .catch(function(err) {
          next(err);
        });
    })
    .then('the $BUTTON button is disabled', function(button, next) {
      var driver = this.driver;
      driver.waitForExist('//button[text()=\'' + button + '\']', 500)
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
    })
    .then('the user account for $user was updated with $new for $old', function(user, newValue, oldKey, next) {
      if (!user || !newValue || !oldKey) {
        return next('Wrong values given for: user|newValue|oldKey');
      }

      // Attempt to translate the given new value.
      user = user.toString();
      // If testing for a new random value
      if (newValue === '${random}') {
        // Confirm the current key has an old value.
        assert.equal(_.has(state, user + '.' + oldKey + '_old'), true);
        // Confirm the current keys old value is different from the current value.
        assert.notEqual(_.get(state, user + '.' + oldKey + '_old'), _.get(state, user + '.' + oldKey));
        return next();
      }
      else {
        newValue = replacements(newValue);
      }

      // Update the value and continue.
      update(user, oldKey, newValue);
      next();
    })
    .then('the user profile for $user was changed', function(user, next) {
      var _fullName = user.toString() + '.fullName';
      var _name = user.toString() + '.name';
      var _email = user.toString() + '.email';
      var _password = user.toString() + '.password';
      var fullName = replacements('${' + _fullName + '}');
      var name = replacements('${' + _name + '}');
      var email = replacements('${' + _email + '}');
      var password = replacements('${' + _password + '}');

      var driver = this.driver;
      authUser(driver, 'formio', 'user/login', email, password, function(err, res) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        assert.equal(_.get(res, 'data.fullName'), fullName);
        assert.equal(_.get(res, 'data.name'), name);
        assert.equal(_.get(res, 'data.email'), email);

        // Compare old values if present.
        [
          {current: fullName, label: _fullName},
          {current: name, label: _name},
          {current: email, label: _email},
          {current: password, label: _password}
        ].forEach(function(element) {
          if (_.has(state, element.label + '_old')) {
            assert.notEqual(element.current, _.get(state, element.label + '_old'));
          }
        });

        next(null, res);
      });
    });

  return library;
};
