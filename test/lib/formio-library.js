'use strict';

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;
var request = require('request');

module.exports = function(config) {
  // Global timeout for wait* commands.
  var timeout = 60000;

  //var getProject = function(projectName, next) {
  //  formio.resources.project.model.findOne({'name': projectName}, function(err, project) {
  //    if (err) {
  //      return next(err);
  //    }
  //    else if (!project) {
  //      return next(new Error('Project not found'));
  //    }
  //
  //    next(null, project);
  //  });
  //};
  //
  //var getForm = function(projectId, formName, next) {
  //  formio.resources.form.model.findOne({project: projectId, name: formName}, function(err, form) {
  //    if (err) {
  //      return next(err);
  //    }
  //    else if (!form) {
  //      return next(new Error('Form not found'));
  //    }
  //
  //    next(null, form);
  //  });
  //};
  //
  //var getSubmission = function(filter, next) {
  //  formio.resources.submission.model.findOne(filter, function(err, submission) {
  //    if (err) {
  //      return next(err);
  //    }
  //
  //    next(null, submission);
  //  });
  //};
  //
  //var createSubmission = function(submission, next) {
  //  formio.resources.submission.model.create(submission, function(err, submission) {
  //    if (err) {
  //      return next(err);
  //    }
  //
  //    next(null, submission);
  //  });
  //};

  var ensureOnPage = function(path, next) {
    if (!path) {
      path = '/#';
    }
    this.driver.url()
      .then(function(res) {
        // Already on the page.
        if (res.value === path) {
          return next();
        }
        this.driver.url(path)
          .then(function() {
            next();
          });
      });
  }

  var authUser = function(projectName, formName, email, password, next) {
    request({
      "rejectUnauthorized": false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'user.email': email,
          'user.password': password
        }
      }
    }, function(err, response, body) {
      if (err) return next(err);
      next(null, body);
    });
  };

  var createUser = function(projectName, formName, email, password, next) {
    request({
      "rejectUnauthorized": false,
      uri: config.serverProtocol + '://' + projectName + '.' + config.serverHost + '/' + formName + '/submission',
      method: 'POST',
      form: {
        data: {
          'user.email': email,
          'user.name': Date.now(),
          'user.password': password,
          'verifyPassword': password
        }
      }
    }, function(err, response, body) {
      if (err) return next(err);
      next(null, body.toJSON());
    });
  };

  var createAndAuthUser = function(email, password, next) {
    createUser('formio', 'user/register', email, password, function(err, user) {
      if (err) {
        return next(err);
      }

      authUser('formio', 'user/login', email, password, function(err, res) {
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

      this.driver.url(path)
        .then(function() {
          next();
        });
    })
    .given('an account exists with the email $EMAIL and the password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user/login', email, password, function(err, res) {
        if (err || res === 'Invalid user') {
          // User doesn't exist. Create it.
          return createUser('formio', 'user/register', email, password, next);
        }

        // User already exists. Do nothing.
        next();
      });
    })
    .given('I am logged out', function(next) {
      this.driver.localStorage('DELETE', 'formioToken')
        .then(function() {
          next();
        }.bind(this))
        .catch(function(err) {
          next(err);
        });
    })
    .given('I am logged in', function(next) {
      var email = Math.random().toString(36).substring(7) + '@example.com';
      var password = Math.random().toString(36).substring(7);
      var driver = this.driver;
      createAndAuthUser(email, password, function(err, res) {
        if (err) {
          return next(err);
        }

        driver.localStorage('POST', {key: 'formioToken', value: res.token.token})
          .then(function() {
            next();
          })
          .catch(function(err) {
            next(err);
          });
      });
    })
    .given('I am logged in as $EMAIL with password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user/login', email, password, function(err, res) {
        if (err) {
          return next(err);
        }
        if (!res) {
          return next(new Error('Authentication Failed.'));
        }

        driver.localStorage('POST', {key: 'formioToken', value: res.token.token})
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
      this.driver.click('//button[contains(.,\'' + button + '\')]')
        .then(function() {
          next();
        });
    })
    .when('I enter $TEXT in the $FIELD field', function(text, field, next) {
      this.driver.waitForExist(field, timeout)
        .then(function() {
          this.driver.setValue(field, text)
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
    .when('I expand the user menu', function(next) {
      var driver = this.driver
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
      this.driver.localStorage('GET', 'formioToken', function(err, res) {
        if (err) {
          return next(err);
        }
        if ((!err) && (res.value)) {
          return next();
        }

        next(new Error('No formioToken found; ' + JSON.stringify(res)));
      });
    })
    .then('I have been logged out', function(next) {
      this.driver.localStorage('GET', 'formioToken', function(err, res) {
        if (err) {
          return next(err);
        }
        if ((!err) && (res.value)) {
          return next(new Error('User still logged in: ' + JSON.stringify(res)));
        }

        next();
      });
    })
    .then('I see an alert with (?:the text )?$TEXT', function(text, next) {
      this.driver.waitForExist('//div[@role=\'alert\']', timeout)
        .then(function() {
          this.driver.getText('//div[@role=\'alert\']')
            .then(function(alert) {
              assert.equal(text, alert);
              next();
            });
        }.bind(this))
        .catch(function(err) {
          next(err);
        });
    });

  return library;
};
