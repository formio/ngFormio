'use strict';

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;

module.exports = function(formio) {
  var getProject = function(projectName, next) {
    formio.resources.project.model.findOne({'name': 'formio'}, function (err, project) {
      if (err) {
        return next(err);
      }
      else if (!project) {
        return next(new Error('Project not found'));
      }

      next(null, project);
    });
  };

  var getForm = function(projectId, formName, next) {
    formio.resources.form.model.findOne({project: projectId, name: formName}, function (err, form) {
      if (err) {
        return next(err);
      }
      else if (!form) {
        return next(new Error('Form not found'));
      }

      next(null, form);
    });
  };

  var getSubmission = function(filter, next) {
    formio.resources.submission.model.findOne(filter, function (err, submission) {
      if (err) {
        return next(err);
      }

      next(null, submission);
    });
  };

  var createSubmission = function(submission, next) {
    formio.resources.submission.model.create(submission, function (err, submission) {
      if (err) {
        return next(err);
      }

      next(null, submission);
    });
  };

  var authUser = function(projectName, formName, email, password, next) {
    getProject('formio', function(err, project) {
      if (err) {
        return next(err);
      }

      getForm(project._id, 'user', function(err, form) {
        if (err) {
          return next(err);
        }

        formio.auth.authenticate(form, 'email', 'password', email, password, function(err, res) {
          if (err) {
            return next(err);
          }

          next(null, res);
        });
      });
    });
  };

  var createUser = function(projectName, formName, email, password, next) {
    getProject(projectName, function(err, project) {
      if (err) {
        return next(err);
      }

      getForm(project._id, formName, function(err, form) {
        if (err) {
          return next(err);
        }

        var encrypt = require('formio/app/actions/fields/password');
        var req = {
          body: {
            data: {
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
          }, next);
        });
      });
    });
  };

  var createAndAuthUser = function(email, password, next) {
    createUser('formio', 'user', email, password, function(err, user) {
      if (err) {
        return next(err);
      }

      authUser('formio', 'user', email, password, function(err, res) {
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
      var path = (url === 'home') ? '/' : url;

      this.driver.url(path)
        .then(function() {
          next();
        });
    })
    .given('an account exists with the email $EMAIL and the password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user', email, password, function(err, res) {
        if (err) {
          return next(err);
        }
        if (!res) {
          // User doesn't exist. Create it.
          return createUser('formio', 'user', email, password, next, next);
        }

        // User already exists. Do nothing.
        next();
      });
    })
    .given('I am logged out', function(next) {
      this.driver.localStorage('DELETE', 'formioToken')
        .then(function() {
          // Only continue when the localStorage manipulation is done.
          this.driver.waitUntil(function() {
            return this.driver.localStorage('GET', 'formioToken', function(err, res) {
              return ((!err) && (!res.value)) ? true : false;
            });
          }.bind(this), 5000).then(function() {
            next();
          });
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
            driver.url('/project')
              .then(function(){
                next();
              });
          });
      });
    })
    .given('I am logged in as $EMAIL with password $PASSWORD', function(email, password, next) {
      authUser('formio', 'user', email, password, function(err, res) {
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
      this.driver.waitForExist('=' + link, 5000)
        .then(function() {
          this.driver.click('=' + link)
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        }.bind(this));
    })
    .when('I click (?:on )?the $BUTTON button', function(button, next) {
      this.driver.waitForExist('button=' + button, 5000)
        .then(function() {
          this.driver.click('button=' + button)
            .then(function() {
              next();
            })
            .catch(function(err) {
              next(err);
            });
        }.bind(this));
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
      path = (path === 'home') ? '/' : path;
      var url = this.driver.options.baseUrl + path;

      this.driver.waitUntil(function() {
        return this.driver.url().then(function(res) {
          try {
            assert.equal(res.value, url);
            return true;
          }
          catch(err) {
            return false;
          }
        });
      }.bind(this), 5000).then(function() {
        next();
      });
    })
    .then('I have been logged in', function(next) {
      this.driver.waitUntil(function() {
        return this.driver.localStorage('GET', 'formioToken', function(err, res) {
            return ((!err) && (res.value)) ? res.value : false;
        });
      }.bind(this), 5000).then(function(token) {
        next();
      });
    })
    .then('I have not been logged in', function(next) {
      this.driver.waitUntil(function() {
        return this.driver.localStorage('GET', 'formioToken', function(err, res) {
          return ((!err) && (!res.value)) ? true : false;
        });
      }.bind(this), 5000).then(function() {
        next();
      });
    })
    .then('I see an alert with (?:the text )?$TEXT', function(text, next) {
      this.driver.waitForExist('.alert=' + text, 1000)
        .then(function(err, html) {
          next();
        })
        .catch(function(err) {
          next(err);
        });
    });

  return library;
};
