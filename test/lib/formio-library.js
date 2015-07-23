'use strict';

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;

module.exports = function(formio) {
  var getApp = function(appName, callback, errorCallback) {
    formio.resources.application.model.findOne({'name': 'formio'}, function (err, app) {
      if (err) {
        errorCallback(err);
      }
      else if (!app) {
        errorCallback('Application not found');
      }
      else {
        callback(app);
      }
    });
  }

  var getForm = function(appId, formName, callback, errorCallback) {
    formio.resources.form.model.findOne({app: appId, name: formName}, function (err, form) {
      if (err) {
        errorCallback(err);
      }
      else if (!form) {
        errorCallback('Form not found');
      }
      else {
        callback(form);
      }
    });
  }

  var getSubmission = function(filter, callback, errorCallback) {
    formio.resources.submission.model.findOne(filter, function (err, submission) {
      if (err) {
        errorCallback(err);
      }
      else {
        callback(submission);
      }
    });
  }

  var createSubmission = function(submission, callback, errorCallback) {
    formio.resources.submission.model.create(submission, function (err, submission) {
      if (err) {
        errorCallback(err);
      }
      else {
        callback(submission);
      }
    });
  }

  var authUser = function(appName, formName, email, password, callback, errorCallback) {
    getApp('formio', function(app) {
      getForm(app._id, 'user', function(form) {
        formio.auth.authenticate(form, 'email', 'password', email, password, function(err, res) {
          if (err) {
            callback(null);
          }
          else {
            callback(res);
          }
        })
      }, errorCallback);
    }, errorCallback);
  }

  var createUser = function(appName, formName, email, password, callback, errorCallback) {
    getApp(appName, function(app) {
      getForm(app._id, formName, function(form) {
        var encrypt = require('formio/app/actions/fields/password');
        var req = {
          body:
          {
            data:
            {
              email: email,
              password: password
            }
          }
        };
        encrypt.beforePost({key: 'password'}, req, {}, function() {
          createSubmission({
            form: form._id,
            data: {
              email: email,
              password:req.body.data.password
            }
          }, function(user) {
            callback(user);
          }, errorCallback);
        });
      }, errorCallback);
    }, errorCallback);
  }

  var createAndAuthUser = function(email, password, next) {
    createUser('formio', 'user', email, password, function() {
      authUser('formio', 'user', email, password, function(res) {
        if (res) {
          next(null, res);
        }
        else {
          next(new Error('Authentication Failed.'));
        }
      });
    }, next);

  }

  var library = English.library()
    .given('I am (?:on|at) (?:the )?(.+?)(?: page)?$', function(path, next) {
      if (path === 'home') {
        path = '/'
      }
      this.driver.url(path).then(function() {
        setTimeout(next, 500);
      });
    })
    .given('an account exists with the email $EMAIL and the password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user', email, password, function(res) {
        if (!res) {
          // User doesn't exist. Create it.
          createUser('formio', 'user', email, password, function() {
            next();
          }, next);
        }
        else {
          // User already exists. Do nothing.
          next();
        }
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
    .given('I am logged in', function(next) {
      var email = Math.random().toString(36).substring(7) + '@example.com';
      var password = Math.random().toString(36).substring(7);
      var driver = this.driver;
      createAndAuthUser(email, password, function(err, res) {
        if (err) {
          next(err);
        }
        else {
          driver.localStorage('POST', {key: 'formioToken', value: res.token.token})
            .then(function() {
              driver.url('/app').then(function() {
                setTimeout(next, 500);
              })
            });
        }
      });
    })
    .given('I am logged in as $EMAIL with password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user', email, password, function(res) {
        if (res) {
          driver.localStorage('POST', {key: 'formioToken', value: res.token.token})
            .then(function() {
               next();
            });
        }
        else {
          next(new Error('Authentication Failed.'));
        }
      });
    })
    .when('I click (?:on )?the $LINK link', function(link, next) {
      this.driver.click('=' + link)
        .then(function() {
          setTimeout(next, 500);
        })
        .catch(function(err) {
          next(err);
        });
    })
    .when('I click (?:on )?the $BUTTON button', function(button, next) {
      this.driver.click('button=' + button).then(function() {
        setTimeout(next, 500);
      });
    })
    .when('I enter $TEXT in the $FIELD field', function(text, field, next) {
      this.driver.setValue(field, text)
        .then(function() {
          next();
        })
        .catch(function(err) {
          next(err);
        });
    })
    .then('the title is $TITLE', function(given_title, next) {
      this.driver.getTitle()
        .then(function(title) {
          try {
            assert.equal(title, given_title);
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
      if (path === 'home') {
        path = '/'
      }
      var url = this.driver.options.baseUrl + path;
      this.driver.url()
        .then(function(res) {
          try {
            assert.equal(res.value, url);
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
    .then('I have been logged in', function(next) {
      this.driver.localStorage('GET', 'formioToken', function(err, res) {
        if (err) {
          return next(err);
        }
        else if (!res.value) {
          return next(new Error('No token set.'));
        }
        next();
      });
    })
    .then('I have not been logged in', function(next) {
      this.driver.localStorage('GET', 'formioToken', function(err, res) {
        if (err) {
          next(err);
        }
        else if (res.value) {
          next(new Error('Token set.'));
        }
        else {
          next();
        }
      });
    })
    .then('I see an alert with (?:the text )?$TEXT', function(text, next) {
      this.driver.element('.alert=' + text)
        .then(function(err, html) {
          next();
        })
        .catch(function(err) {
          next(err);
      });
    })

  return library;
};
