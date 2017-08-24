'use strict';

var assert = require('assert');
var request = require('request');
var chance = (new require('chance'))();
var _ = require('lodash');

module.exports = function (config) {
  // Global timeout for wait* commands.
  var timeout = 6000;
  var state = {};
  var projects = {};

  /**
   * Wrap the string function for usernames.
   *
   * @param options
   * @returns {*}
   */
  chance.username = function (options) {
    options = options || {};
    _.extend(options, {
      length: chance.natural({min: 5, max: 20}),
      pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
    return this.string(options).toLowerCase();
  };

  /**
   * Wrap the string function for passwords.
   * @param options
   * @returns {*}
   */
  chance.password = function (options) {
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
  var random = function (type) {
    switch (type) {
      case 'fullName':
        return chance.name();
      case 'name':
      case 'username':
        return chance.username().toLowerCase();
      case 'email':
        return chance.email();
      case 'password':
        return chance.password();
      case 'title':
        return chance.word({length: chance.natural({min: 5, max: 40})});
      case 'description':
        return chance.sentence();
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
  var update = function (cacheKey, oldKey, newValue) {
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
  var replacements = function (text) {
    if (text === '${empty}') {
      return '';
    }

    // Regex to find ${string}.
    var regex = /\$\{(.+?[^\}])\}/g;

    // Regex to find ${random-*} strings.
    var randomRegex = /random-(.*)/;
    var randomAssignRegex = /random-(.*)>.*/;
    var randomAssignKeyRegex = /random-.*>(.*)/;

    // Regex to find ${key.value}
    var searchRegex = /(.*)\.(.*)/;

    text = text.replace(regex, function (match, str) {
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
  var handleResponse = function (driver, err, response, body, next) {
    if (err) {
      return next(err);
    }
    var token = response.headers['x-jwt-token'] || '';
    browser.executeScript('localStorage.removeItem("formioToken");')
      .then(function () {
        browser.executeScript("return localStorage.setItem('formioToken','" + token + "');")
          .then(function () {
            if (typeof body === 'string') {
              try {
                body = JSON.parse(body);
              }
              catch (e) {
              }
            }
            next(null, body);
          })
          .catch(next);
      })
      .catch(next);
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
  var authUser = function (driver, projectName, formName, email, password, next) {
    request({
      rejectUnauthorized: false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'email': email,
          'password': password
        }
      }
    }, function (err, response, body) {
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
  var createUser = function (driver, projectName, formName, username, email, password, next) {
    request({
      rejectUnauthorized: false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'email': email,
          'name': username,
          'password': password,
          'verifyPassword': password
        }
      }
    }, function (err, response, body) {
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
  var createAndAuthUser = function (driver, username, email, password, next) {
    createUser(driver, 'formio', 'user/register', username, email, password, function (err, user) {
      if (err) {
        return next(err);
      }

      authUser(driver, 'formio', 'user/login', email, password, function (err, res) {
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

  /**
   * Create a project via the api with the given title and description for the current user.
   *
   * @param driver
   * @param title
   * @param description
   * @param next
   */
  var createProject = function (driver, title, description, next) {
    browser.executeScript("return localStorage.getItem('formioToken');").then(function (res) {
      if (!res) {
        return next('Not Authenticated!');
      }
      request({
        rejectUnauthorized: false,
        uri: config.serverProtocol + '://api.' + config.serverHost + '/project',
        method: 'POST',
        form: {
          title: title,
          description: description
        },
        headers: {
          'x-jwt-token': res
        }
      }, function (err, response, body) {
        handleResponse(driver, err, response, body, function (err, result) {
          if (err) {
            next(err);
          }
          // Save the project
          projects[title] = result;
          next(null, result);
        });
      });
    })
      .catch(next);
  };

  /**
   * Get a project from the temporary cache.
   */
  var getProject = function (title, next) {
    if (!projects[title]) {
      next('Project not found');
    }
    next(null, projects[title]);
  };

  var scrollTo = function(ele) {
    return ele.getLocation()
      .then(function(location) {
        return browser.executeScript('window.scrollTo(' + location.x + ', ' + (location.y - 60) + ');');
      });
  };

  this.iSeeElement = function (ele) {
    it('I see the element ' + ele, function (next) {
      var EC = protractor.ExpectedConditions;
      var elt = element(by.css(ele));
      browser.wait(EC.visibilityOf(elt), timeout);
      next();
    });
  };

  this.enterTextInField = function (field, text) {
    it('I enter ' + text + ' in ' + field + ' field', function (next) {
      text = replacements(text.toString());
      var ele = element(by.css(field));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function () {
        ele.clear().sendKeys(text).then(next).catch(next);
      });
    });
  };

  this.checkingUrlIamOn = function (url) {
    if (!url.toLowerCase().includes('http')) {
      url = config.baseUrl + "/" + url;
    }
    it('I am on ' + url, function (next) {
      browser.wait(function () {
        return browser.getCurrentUrl().then(function (cUrl) {
          return cUrl.toLowerCase() == url.toLowerCase();
        });
      }, timeout).then(function (value) {
        try {
          assert.equal(value, true);
          next();
        } catch (err) {
          next(err);
        }
      });
    });
  };

  this.waitForActionToComplete = function (time) {
    it('I wait for ' + (time / 1000) + ' seconds', function (next) {
      browser.sleep(time).then(next).catch(next);
    });
  };

  this.iDonotSeeText = function (text) {
    it('I donot see "' + text + '"', function (next) {
      try {
        var ele = element(by.xpath("//*[text()='" + text + "']"));
        browser.wait(function () {
          return ele.isPresent().then(function (res) {
            return !res;
          })
        }, timeout).then(function (value) {
          try {
            assert.equal(value, true);
            next();
          } catch (err) {
            next(err);
          }
        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.iSeeText = function (text) {
    it('I see text "' + text + '"', function (next) {
      try {
        var xpath = '//*[contains(text(),"' + replacements(text) + '")]';
        browser.wait(function () {
          return element(by.xpath(xpath)).isPresent();
        }, timeout).then(function (result) {
          element.all(by.xpath(xpath)).isDisplayed().then(function (visible) {
            if (typeof (visible) == 'object') {
              assert.equal(visible.indexOf(true) > -1, true);
            } else {
              assert.equal(visible, true);
            }
          });
          next();
        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.goToPage = function (url) {
    it('I go to ' + url, function (next) {
      url = config.baseUrl + "/" + url;
      browser.get(url).then(next).catch(next);
    });
  };


  this.clickOnElementWithText = function (text) {
    it('I click on the ' + text + ' text', function (next) {
      var ele =  element(by.xpath('//*[text()="' + replacements(text.toString()) + '"]'));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function (res) {
        scrollTo(ele)
          .then(function() {
            ele.click().then(next).catch(next);
          });
      });
    });
  };

  this.clickOnLink = function (text) {
    it('I click on the ' + text + ' link', function (next) {
      var ele =  element(by.partialLinkText(replacements(text.toString())));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function (res) {
        scrollTo(ele)
          .then(function() {
            ele.click().then(next).catch(next);
          });
      });
    });
  };

  this.clickOnButton = function (text) {
    it('I click on the ' + text + ' link', function (next) {
      var ele =  element(by.partialButtonText(replacements(text.toString())));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function (res) {
        scrollTo(ele)
          .then(function() {
            ele.click().then(next).catch(next);
          });
      });
    });
  };

  this.clickOnClass = function (className) {
    it('I click on the ' + className + ' class', function (next) {
      var ele =  element(by.className(replacements(className.toString())));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function (res) {
        scrollTo(ele)
          .then(function() {
            ele.click().then(next).catch(next);
          });
      });
    });
  };

  this.iSeeTextIn = function (ele, text) {
    text = replacements(text);
    it('I see text "' + text + '"', function (next) {
      ele = (typeof (ele) == 'object') ? ele : element(by.cssContainingText(ele, text));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function () {
        try {
          config.expect(ele.getText()).to.eventually.equal(text);
          next();
        } catch (err) {
          next(err);
        }
      });
    });
  };

  this.userExistsWith = function (username, email, password) {
    username = replacements(username);
    email = replacements(email);
    password = replacements(password);
    it("Given an account exists with the username " + username + ", email " + email + " and password " + password + ".", function (next) {
      var driver = browser;
      authUser(driver, 'formio', 'user/login', email, password, function (err, res) {
        if (err || res === 'User or password was incorrect') {
          // User doesn't exist. Create it.
          return createUser(driver, 'formio', 'user/register', username, email, password, next);
        }
        next();
      });
    });
  };

  this.logout = function () {
    it('I am logging out', function (next) {
      try {
        browser.executeScript('localStorage.clear();')
          .then(browser.refresh())
          .then(function () {
            next();
          });
      } catch (err) {
        next(err);
      }
    });
  };

  this.btnDisabled = function (field) {
    it('I see ' + field + ' button is disabled', function (next) {
      try {
        var btn = element(by.xpath('//button[text()=\'' + field + '\']'));
        browser.wait(function () {
          return btn.isPresent().then(function (present) {
            if (present) {
              return btn.isEnabled().then(function (res) {
                return !res;
              });
            }
            return present;
          });
        }, timeout).then(function (value) {
          try {
            assert.equal(value, true);
            next();
          } catch (err) {
            next(err);
          }
        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.btnEnabled = function (field) {
    it('I see ' + field + ' button is Enabled', function (next) {
      try {
        var btn = element(by.xpath('//button[text()="' + field + '"]'));
        browser.wait(function () {
          return btn.isPresent().then(function (present) {
            if (present) {
              return btn.isEnabled();
            }
            return present;
          });
        }, timeout).then(function (value) {
          try {
            assert.equal(value, true);
            next();
          } catch (err) {
            next(err);
          }
        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.clickOnElement = function (text) {
    it('I click on the ' + text, function (next) {
      var ele = text.startsWith("xpath:") ? element(by.xpath(text.substring(text.indexOf(':') + 1))) : element(by.css(text));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function () {
        ele.click().then(next).catch(next);
      });
    });
  };

  this.iAmLoggedIn = function () {
    it('I have been logged in', function (next) {
      var tries = 0;
      (function attempt() {
        if (tries > 25) {
          return next(new Error('No formioToken found.'));
        }
        browser.sleep(100).then(function () {
          browser.executeScript("return localStorage.getItem('formioToken');")
            .then(function (res) {
              if (res) {
                return next();
              }
              tries += 1;
              attempt();
            })
            .catch(next);
        })
          .catch(next);
      })();
    })
  };

  this.iAmLoggedInFor = function (tempUser) {
    it("I am logged in for " + tempUser, function (next) {
      if (!next && tempUser) {
        next = tempUser;
        tempUser = null;
      }
      var driver = browser;
      if (tempUser && state[tempUser]) {
        authUser(driver, 'formio', 'user/login', state[tempUser].email, state[tempUser].password, function (err, res) {
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
        createAndAuthUser(driver, state[tempUser].name, state[tempUser].email, state[tempUser].password, function (err, res) {
          if (err) {
            return next(err);
          }
          next();
        });
      }
    });
  };

  this.newWindow = function () {
    it("I am on a new window", function (next) {
      browser.getAllWindowHandles().then(function (handles) {
        browser.ignoreSynchronization = true;
        browser.switchTo().window(handles[1]);
        config.expect(handles.length).to.equal(2);
        next();
      })
        .catch(next);
    });
  };

  this.closeWindow = function () {
    it('I close the window', function (next) {
      browser.getAllWindowHandles().then(function (handles) {
        browser.close();
        browser.ignoreSynchronization = true;
        browser.switchTo().window(handles[0]);
        next();
      })
        .catch(next)
    });
  };

  this.clickBtnWithLink = function (btn, link) {
    it('I click on ' + btn + ' with ' + link, function (next) {
      var ele = element(by.xpath('//a[contains(@class,"btn btn-default btn-block btn-lg") and contains(@href,"' + link + '")]'));
      browser.wait(function () {
        return ele.isPresent();
      }, config.timeout);
      ele.click().then(next).catch(next);
    });
  };

  this.projectCount = function (num) {
    it('My project count is ' + num, function (next) {
      if (num === 0) {
        try {
          config.expect(element(by.xpath('//div[@ng-repeat="project in projects"]')).isPresent()).to.eventually.equal(false);
          next();
        } catch (err) {
          next(err);
        }
      }
      else {
        browser.wait(function () {
          return element(by.xpath('//div[@ng-repeat="project in projects"]')).isPresent();
        }, timeout).then(function () {
          try {
            element.all(by.xpath('//div[@ng-repeat="project in projects"]')).getText().then(function (res) {
              var arr = new Array(res);
              var merged = [].concat.apply([], arr);
              config.expect(merged.length).to.equal(num);
            });
            next();
          } catch (err) {
            next(err);
          }
        });
      }
    });
  };

  this.switchTab = function () {
    it('I go to the next to tab', function (next) {
      try {
        browser.getAllWindowHandles().then(function (handles) {
          //browser.driver.close();
          browser.ignoreSynchronization = true;
          browser.switchTo().window(handles[1]);
          //browser.driver.close();
          next();
        });
      } catch (err) {
        next(err);
      }

    });
  };

  this.iSeeValueIn = function (ele, text) {
    text = replacements(text.toString());
    it('I see text ' + text + ' in ' + ele, function (next) {
      var ele1 = (typeof (ele) == 'object') ? ele : element(by.css(ele, text));
      browser.wait(function () {
        return ele1.isPresent();
      }, timeout).then(function () {
        ele1.getAttribute('value').then(function (value) {
          config.expect(value === text);
          next();
        })
          .catch(next);
      });
    });
  };

  this.checkIfLoggedOut = function () {
    it('I am logged Out', function (next) {
      try {
        var value = browser.executeScript("return localStorage.getItem('formioToken');");
        config.expect(value).to.eventually.equal(null);
        next();
      } catch (err) {
        next(err);
      }
    });
  };

  this.iDonotSeeElement = function (ele) {
    it('I donot see the element ' + ele, function (next) {
      var elt = element(by.css(ele));
      browser.wait(function () {
        return elt.isPresent();
      }, timeout).then(function () {
        elt.isDisplayed().then(function (visible) {
          assert.equal(visible, false);
        });
        next();
      });
    });
  };

  this.valueUpdate = function (ele, newVal, oldVal) {
    it('The user account for ' + ele + ' was updated with ' + newVal + ' for ' + oldVal, function (next) {
      ele = ele.toString();
      if (newVal === '${random}') {
        assert.equal(_.has(state, ele + '.' + oldVal + '_old'), true);
        assert.notEqual(_.get(state, ele + '.' + oldVal + '_old'), _.get(state, ele + '.' + oldVal));
        return next();
      }
      else {
        newVal = replacements(newVal);
      }
      update(ele, oldVal, newVal);
      next();
    });
  };

  this.valueChanged = function (user) {
    it('The user profile for ' + user + ' was changed.', function (next) {
      var _fullName = user.toString() + '.fullName';
      var _name = user.toString() + '.name';
      var _email = user.toString() + '.email';
      var _password = user.toString() + '.password';
      var fullName = replacements('${' + _fullName + '}');
      var name = replacements('${' + _name + '}');
      var email = replacements('${' + _email + '}');
      var password = replacements('${' + _password + '}');

      var driver = browser;
      authUser(driver, 'formio', 'user/login', email, password, function (err, res) {
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
        ].forEach(function (element) {
          if (_.has(state, element.label + '_old')) {
            assert.notEqual(element.current, _.get(state, element.label + '_old'));
          }
        });

        next(null, res);
      });
    })
  };

  this.portalIamOn = function (title) {
    title = replacements(title.toString());
    it('I am on page "' + title + '"', function (next) {
      try {
        var xpath = "//*[@class='project-title']";
        browser.wait(function () {
          return element(by.xpath(xpath)).isPresent();
        }, timeout).then(function (result) {
          var elet = element.all(by.xpath(xpath))
          elet.getAttribute('value').then(function (value) {
            config.expect(value === title);
            next();
          });
        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.clickOnElementIn = function (ele, text) {
    text = replacements(text.toString());
    it('I click on the ' + text + ' in' + ele + ' element', function (next) {
      var ele = element(by.xpath('//*[text()=\'' + name + '\']//..//..//..//*[contains(@class,\'' + button + '\')]'));
      browser.wait(function () {
        return ele.isPresent();
      }, timeout).then(function () {
        ele.click().then(next).catch(next);
      });
    });
  };

  this.projectPageIamOn = function (page, title) {
    title = replacements(title.toString());
    it('I am on ' + page + ' page of the ' + title + 'project', function (next) {
      try {
        var path = res.value.split("/");
        var x = (path[path.length - 1] + '*') == "*" ? path[path.length - 2] : path[path.length - 1];
        var xpath = "//*[@class='project-title']";
        browser.wait(function () {
          return element(by.xpath(xpath)).isPresent();
        }, timeout).then(function (result) {
          var elet = element.all(by.xpath(xpath))
          elet.getAttribute('value').then(function (value) {
            config.expect(value === title);
            next();
          })

        });
      } catch (err) {
        next(err);
      }
    });
  };

  this.projectExisting = function (title, description) {
    title = replacements(title);
    it("Project exists with " + title + ' name', function (next) {
      try {
        description = replacements(description);
        var driver = browser;
        createProject(driver, title, description, function (err, res) {
          if (err) {
            return next(err);
          }
          browser.refresh().then(function () {
            next(null,res);
          });
        });
      } catch (err) {
        next(err);
      }
    });
  };
};
