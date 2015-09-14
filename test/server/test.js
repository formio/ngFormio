'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var assert = require('assert');
var mongoose = require('mongoose');
var app = express();
var events = require('events');
var _ = require('lodash');

// Use the main router Project.
var formioServer = require('./index')(require('./config'));
var formio = null;

// Initialize the formio router.
formioServer.init().then(function(_formio) {
  formio = _formio;

  // Use the formio router.
  app.use('/', formioServer);

  // Emit the old event listener for the server being ready.
  formioServer.events.emit('ready');
});

// The bootstrap Form.io Project contents.
var bootstrap = {
  // The Form.io Project.
  project: null,

  // The Administrator Role for the Form.io Project.
  roleAdministrator: null,

  // The Authenticated Role for the Form.io Project.
  roleAuthenticated: null,

  // The Anonymous Role for the Form.io Project.
  roleAnonymous: null,

  // The User Resource.
  resource: null,

  // The User Login Form.
  formLogin: null,

  // The User Register Form.
  formRegister: null,

  // The Login Form Action.
  actionLogin: null,

  // The Register Form Action.
  actionRegister: null,

  // A Form.io User.
  submission: null
};

// The bootstrap Form.io User-created Project contents.
var testProject = {
  // The Form.io user who created this Project.
  owner: {
    token: '',
    data: {
      username: 'Admin1',
      password: 'test123'
    }
  },

  // The Administrator Role for the Form.io Project.
  roleAdministrator: null,

  // The Authenticated Role for the Form.io Project.
  roleAuthenticated: null,

  // The Anonymous Role for the Form.io Project.
  roleAnonymous: null,

  // A administrator of this User-created Project.
  admin1: {
    token: '',
    data: {
      username: 'admin_user',
      password: 'test123'
    }
  },

  // A user of this User-created Project.
  user1: {
    token: '',
    data: {
      username: 'User1',
      password: 'test123'
    }
  },

  // A user of this User-created Project.
  user2: {
    token: '',
    data: {
      username: 'User2',
      password: 'test123'
    }
  },

  // The User-created Project.
  project: null,

  // The User-created Resource.
  resource: null,

  // The User-created Login Form.
  formLogin: null,

  // The User-created Register Form.
  formRegister: null,

  // The User-created Login Form Action.
  actionLogin: null,

  // The User-created Register Form Action.
  actionRegister: null,

  // The User-created Role Assignment Action on the Register Form.
  actionRole: null
};

/**
 * Compare the API response with
 *
 * @param actual
 *   The Actual value of the request response.
 * @param expected
 *   The Expected value of the request response.
 * @param omitted
 *   An Array of omitted values from the comparison, due to being unknown..
 */
var compare = function(actual, expected, omitted) {
  // Only iterate and compare the values of known entities. E.g. mongo ObjectId's cant be known at insert time.
  var defined = _.difference(Object.keys(actual), Object.keys(omitted));

  // Confirm that the defined values are all expected.
  assert.deepEqual(Object.keys(defined), Object.keys(expected), 'The response and expected item keys should match.');

  // Confirm each defined element of the response is equal to its expected value.
  defined.forEach(function(element) {
    assert.deepEqual(actual[element], expected[element], 'The response `' + element +'` should match the expected value.')
  });

  // Confirm that each omitted value is present in the response.
  omitted.forEach(function(element) {
    assert(actual.hasOwnProperty(element), 'The response should contain `' + element + '`.');
  });
};

/**
 * Create a simulated Form.io environment for testing.
 */
describe('Bootstrap Form.io', function() {
  before(function(done) {
    formio.events.on('ready', done);
  });

  it('Should remove old test data', function(done) {
    /**
     * Remove all documents using a mongoose model.
     *
     * @param model
     *   The mongoose model to delete.
     * @param next
     *   The callback to execute.
     */
    var dropDocuments = function(model, next) {
      model.remove({}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    // Remove all test documents for roles.
    var dropRoles = function() {
      dropDocuments(formio.roles.resource.model, done);
    };

    // Remove all test documents for actions.
    var dropActions = function() {
      dropDocuments(formio.actions.model, dropRoles);
    };

    // Remove all test documents for submissions.
    var dropSubmissions = function() {
      dropDocuments(formio.resources.submission.model, dropActions);
    };

    // Remove all test documents for forms.
    var dropForms = function() {
      dropDocuments(formio.resources.form.model, dropSubmissions);
    };

    // Remove all test documents for Projects.
    var dropProjects = function() {
      dropDocuments(formio.resources.project.model, dropForms);
    };

    // Clear out all test data, starting with Projects.
    dropProjects();
  });

  it('Should be able to bootstrap Form.io', function(done) {
    /**
     * Store a document using a mongoose model.
     *
     * @param model
     *   The mongoose model to use for document storage.
     * @param document
     *   The document to store in Mongo.
     * @param next
     *   The callback to execute.
     */
    var storeDocument = function(model, document, next) {
      model.create(bootstrap[document], function(err, result) {
        if (err) {
          return done(err);
        }

        bootstrap[document] = result;
        next();
      });
    };

    // Create the initial submission for the initialForm form.
    var createSubmission = function() {
      bootstrap.submission = {
        data: {
          username: 'Admin',
          password: 'test123'
        },
        form: bootstrap.formRegister._id
      };

      storeDocument(formio.resources.submission.model, 'submission', done);
    };

    // Attach the auth action for the initialForm.
    var createActionRegister = function() {
      bootstrap.actionRegister = {
        title: 'Authentication',
        name: 'auth',
        handler: ['before'],
        method: ['create'],
        priority: 0,
        settings: {
          association: 'new',
          username: 'user.username',
          password: 'user.password'
        },
        form: bootstrap.formRegister._id
      };

      storeDocument(formio.actions.model, 'actionRegister', createSubmission);
    };

    // Attach the auth action for the initialForm.
    var createActionLogin = function() {
      bootstrap.actionLogin = {
        title: 'Authentication',
        name: 'auth',
        handler: ['before'],
        method: ['create'],
        priority: 0,
        settings: {
          association: 'existing',
          username: 'user.username',
          password: 'user.password'
        },
        form: bootstrap.formLogin._id
      };

      storeDocument(formio.actions.model, 'actionLogin', createActionRegister);
    };

    // Create the initial form to register users.
    var createRegisterForm = function() {
      bootstrap.formRegister = {
        title: 'User Register',
        name: 'register',
        path: 'user/register',
        type: 'form',
        project: bootstrap.project._id,
        access: [
          {type: 'read_all', roles: [bootstrap.roleAnonymous._id]}
        ],
        submissionAccess: [
          {type: 'create_own', roles: [bootstrap.roleAnonymous._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'user.username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'user.password',
            label: 'password',
            inputType: 'password',
            input: true
          },
          {
            theme: 'primary',
            disableOnInvalid: true,
            action: 'submit',
            block: false,
            rightIcon: '',
            leftIcon: '',
            size: 'md',
            key: 'submit',
            label: 'Submit',
            input: true,
            type: 'button'
          }
        ]
      };

      storeDocument(formio.resources.form.model, 'formRegister', createActionLogin);
    };

    // Create the initial form to authenticate against our resource.
    var createLoginForm = function() {
      bootstrap.formLogin = {
        title: 'User Login',
        name: 'login',
        path: 'user/login',
        type: 'form',
        project: bootstrap.project._id,
        access: [
          {type: 'read_all', roles: [bootstrap.roleAnonymous._id]}
        ],
        submissionAccess: [
          {type: 'create_own', roles: [bootstrap.roleAnonymous._id]},
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'user.username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'user.password',
            label: 'password',
            inputType: 'password',
            input: true
          },
          {
            theme: 'primary',
            disableOnInvalid: true,
            action: 'submit',
            block: false,
            rightIcon: '',
            leftIcon: '',
            size: 'md',
            key: 'submit',
            label: 'Submit',
            input: true,
            type: 'button'
          }
        ]
      };

      storeDocument(formio.resources.form.model, 'formLogin', createRegisterForm);
    };

    // Create the initial resource to for users.
    var createResource = function() {
      bootstrap.resource = {
        title: 'Users',
        name: 'user',
        path: 'user',
        type: 'resource',
        project: bootstrap.project._id,
        access: [],
        submissionAccess: [
          {type: 'read_own', roles: [bootstrap.roleAuthenticated._id]},
          {type: 'update_own', roles: [bootstrap.roleAuthenticated._id]},
          {type: 'delete_own', roles: [bootstrap.roleAuthenticated._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      storeDocument(formio.resources.form.model, 'resource', createLoginForm);
    };

    // Set the default Project access.
    var setDefaultProjectAccess = function() {
      formio.resources.project.model.findById(bootstrap.project._id, function(err, document) {
        if (err) {
          return done(err);
        }

        // Update the default role for this Project.
        document.defaultAccess = bootstrap.roleAnonymous._id;
        document.access = [{type: 'read_all', roles: [bootstrap.roleAnonymous._id]}];

        // Save the changes to the Form.io Project and continue.
        document.save(function(err) {
          if (err) {
            return done(err);
          }

          // No error occurred, document the changes.
          bootstrap.project.defaultAccess = bootstrap.roleAnonymous._id;

          // Call next callback.
          createResource();
        });
      });

    };

    // Create the initial anonymous role for Form.io.
    var createRoleAnonymous = function() {
      bootstrap.roleAnonymous = {
        title: 'Anonymous',
        description: 'A role for Anonymous Users.',
        project: bootstrap.project._id
      };

      storeDocument(formio.roles.resource.model, 'roleAnonymous', setDefaultProjectAccess);
    };

    // Create the initial authenticated role for Form.io.
    var createRoleAuthenticated = function() {
      bootstrap.roleAuthenticated = {
        title: 'Authenticated',
        description: 'A role for Authenticated Users.',
        project: bootstrap.project._id
      };

      storeDocument(formio.roles.resource.model, 'roleAuthenticated', createRoleAnonymous);
    };

    // Create the initial adminstrator role for Form.io.
    var createRoleAdministrator = function() {
      bootstrap.roleAdministrator = {
        title: 'Administrator',
        description: 'A role for Administrative Users.',
        project: bootstrap.project._id
      };

      storeDocument(formio.roles.resource.model, 'roleAdministrator', createRoleAuthenticated);
    };

    // Create the initial Project for Form.io.
    var createProject = function() {
      bootstrap.project = {
        title: 'Form.io Test',
        name: 'formio',
        description: 'This is a test version of formio.',
        settings: {
          cors: '*'
        }
      };

      storeDocument(formio.resources.project.model, 'project', createRoleAdministrator);
    };

    // Create the initial Form.io Project.
    createProject();
  });

  it('Should be able to register a new user for Form.io', function(done) {
    request(app)
      .post('/project/' + bootstrap.project._id + '/form/' + bootstrap.formRegister._id + '/submission')
      .send({
        data: {
          'user.username': testProject.owner.data.username,
          'user.password': testProject.owner.data.password
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.owner.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, bootstrap.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.owners data.
        var tempPassword = testProject.owner.data.password;
        testProject.owner = response;
        testProject.owner.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('A Form.io User should be able to login', function(done) {
    request(app)
      .post('/project/' + bootstrap.project._id + '/form/' + bootstrap.formLogin._id + '/submission')
      .send({
        data: {
          'user.username': testProject.owner.data.username,
          'user.password': testProject.owner.data.password
        }
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.owner.data.username);
        assert(!response.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, bootstrap.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.owners data.
        var tempPassword = testProject.owner.data.password;
        testProject.owner = response;
        testProject.owner.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('A Form.io User should be able to login using an Alias', function(done) {
    request(app)
      .post('/' + bootstrap.formLogin.path)
      .set('host', bootstrap.project.name + '.localhost')
      .send({
        data: {
          'user.username': testProject.owner.data.username,
          'user.password': testProject.owner.data.password
        }
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.owner.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, bootstrap.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.owners data.
        var tempPassword = testProject.owner.data.password;
        testProject.owner = response;
        testProject.owner.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('An Anonymous user should not be able to access the /current endpoint', function(done) {
    request(app)
      .get('/current')
      .expect(401)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.text;
        assert.equal(response, 'Unauthorized');

        done();
      });
  });

  it('A Form.io User should be able to see the current User', function(done) {
    request(app)
      .get('/current')
      .set('x-jwt-token', testProject.owner.token)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.owner.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, bootstrap.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.owners data.
        var tempPassword = testProject.owner.data.password;
        testProject.owner = response;
        testProject.owner.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });
});

describe('User Project Creation', function() {
  var tempProject = {
    title: 'Test Project',
    name: 'testProject',
    description: 'This is a test Project for mocha tests.',
    settings: {
      cors: '*'
    }
  };

  describe('Permissions - Project Level - Project Owner', function() {
    it('A Form.io User should be able to Create an Project', function(done) {
      request(app)
        .post('/project')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempProject)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.access[0].type, 'create_all');
          assert.notEqual(response.access[0].roles, [], 'The create_all Administrator `role` should not be empty.');
          assert.equal(response.access[1].type, 'read_all');
          assert.notEqual(response.access[1].roles, [], 'The read_all Administrator `role` should not be empty.');
          assert.equal(response.access[2].type, 'update_all');
          assert.notEqual(response.access[2].roles, [], 'The update_all Administrator `role` should not be empty.');
          assert.equal(response.access[3].type, 'delete_all');
          assert.notEqual(response.access[3].roles, [], 'The delete_all Administrator `role` should not be empty.');
          assert.notEqual(response.defaultAccess, [], 'The Projects default `role` should not be empty.');
          assert.equal(response.name, tempProject.name);
          assert.equal(response.description, tempProject.description);
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Read their Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.access[0].type, 'create_all');
          assert.notEqual(response.access[0].roles, [], 'The create_all Administrator `role` should not be empty.');
          assert.equal(response.access[1].type, 'read_all');
          assert.notEqual(response.access[1].roles, [], 'The read_all Administrator `role` should not be empty.');
          assert.equal(response.access[2].type, 'update_all');
          assert.notEqual(response.access[2].roles, [], 'The update_all Administrator `role` should not be empty.');
          assert.equal(response.access[3].type, 'delete_all');
          assert.notEqual(response.access[3].roles, [], 'The delete_all Administrator `role` should not be empty.');
          assert.notEqual(response.defaultAccess, [], 'The Projects default `role` should not be empty.');
          assert.equal(response.name, testProject.project.name);
          assert.equal(response.description, testProject.project.description);
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Update their Project', function(done) {
      var newDescription = 'An updated Project Description.';

      request(app)
        .put('/project/' + testProject.project._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({
          description: newDescription
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.access[0].type, 'create_all');
          assert.notEqual(response.access[0].roles, [], 'The create_all Administrator `role` should not be empty.');
          assert.equal(response.access[1].type, 'read_all');
          assert.notEqual(response.access[1].roles, [], 'The read_all Administrator `role` should not be empty.');
          assert.equal(response.access[2].type, 'update_all');
          assert.notEqual(response.access[2].roles, [], 'The update_all Administrator `role` should not be empty.');
          assert.equal(response.access[3].type, 'delete_all');
          assert.notEqual(response.access[3].roles, [], 'The delete_all Administrator `role` should not be empty.');
          assert.notEqual(response.defaultAccess, [], 'The Projects default `role` should not be empty.');
          assert.equal(response.name, testProject.project.name);
          assert.equal(response.description, newDescription);
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Read the Index of their User-Created Projects', function(done) {
      request(app)
        .get('/project')
        .set('x-jwt-token', testProject.owner.token)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.name, testProject.name);
          assert.equal(response.length, 1);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Project Level - Authenticated User', function() {
    // @TODO: Decouple tests and add tests for a registered Project user here.
  });

  describe('Permissions - Project Level - Anonymous User', function() {
    it('An Anonymous User should not be able to Create an Project', function(done) {
      request(app)
        .post('/project')
        .send(testProject.project)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous User should not be able to Read a User-Created Project without permission', function(done) {
      request(app)
        .get('/project/' + testProject.project._id)
        .expect(401)
        .expect('Content-Type', /text\/plain/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous User should not be able to Update a User-Created Project without permission', function(done) {
      var newDescription = 'An updated Project Description #2.';

      request(app)
        .put('/project/' + testProject.project._id)
        .send({description: newDescription})
        .expect(401)
        .expect('Content-Type', /text\/plain/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous User should not be able to Read the Index of User-Created Projects', function(done) {
      request(app)
        .get('/project')
        .expect(401)
        .expect('Content-Type', /text\/plain/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous User should not be able to Delete a User-Created Project without permission', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id)
        .expect(401)
        .expect('Content-Type', /text\/plain/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });
  });

  describe('Project Normalization', function() {
    it('Updating an Project with duplicate permission types will condense the access permissions', function(done) {
      var newAccess = _.clone(testProject.project.access);
      newAccess.push({
        type: 'read_all',
        roles: [testProject.project.defaultAccess]
      });

      request(app)
        .put('/project/' + testProject.project._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({access: newAccess})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');

          // Confirm that all permission types are present.
          assert.equal(response.access.length, 4);
          var permissions = _.pluck(response.access, 'type');
          assert.deepEqual(permissions, ['create_all', 'read_all', 'update_all', 'delete_all']);

          // Confirm that all roles are not empty.
          response.access.forEach(function(permission) {
            assert.notEqual(permission.roles, [], 'The ' + permission.type + ' role should not be empty.');
          });

          assert.notEqual(response.defaultAccess, [], 'The Projects default `role` should not be empty.');
          assert.equal(response.name, testProject.project.name);
          assert.equal(response.description, testProject.project.description);
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Delete their Project without explicit permissions', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, '');

          // Update the stored Project data.
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Recreate the user Project for later tests', function(done) {
      request(app)
        .post('/project')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempProject)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.access[0].type, 'create_all');
          assert.notEqual(response.access[0].roles, [], 'The create_all Administrator `role` should not be empty.');
          assert.equal(response.access[1].type, 'read_all');
          assert.notEqual(response.access[1].roles, [], 'The read_all Administrator `role` should not be empty.');
          assert.equal(response.access[2].type, 'update_all');
          assert.notEqual(response.access[2].roles, [], 'The update_all Administrator `role` should not be empty.');
          assert.equal(response.access[3].type, 'delete_all');
          assert.notEqual(response.access[3].roles, [], 'The delete_all Administrator `role` should not be empty.');
          assert.notEqual(response.defaultAccess, [], 'The Projects default `role` should not be empty.');
          assert.equal(response.name, tempProject.name);
          assert.equal(response.description, tempProject.description);
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
});

describe('User-Created Project - Role Creation', function() {
  // Store the temp role for this test suite.
  var tempRole = {
    title: 'TestRole',
    description: 'A test role.'
  };

  // Before this suite runs, attach the test Project's id to the payload.
  before(function() {
    tempRole.project = testProject.project._id;
  });

  describe('Permissions - Project Level - Project Owner', function() {
    it('A Form.io Project Owner should be able to Create a Role', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/role')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempRole)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'Each role in the response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'Each role in the response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'Each role in the response should contain a `created` timestamp.');
          assert.equal(response.project, tempRole.project);
          assert.equal(response.title, tempRole.title);
          assert.equal(response.description, tempRole.description);

          // Store this temp role for later use.
          tempRole = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io Project Owner should be able to Read an available Role', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.deepEqual(response, tempRole);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io Project Owner should be able to Update an available Role', function(done) {
      var updatedRole = _.clone(tempRole);
      updatedRole.title = 'Update';

      request(app)
        .put('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedRole.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Update the modified timestamp, before comparison.
          updatedRole.modified = response.modified;
          assert.deepEqual(response, updatedRole);

          // Store this temp role for later use.
          tempRole = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io Project Owner should be able to Read the Index of available Roles', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/role')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 4);

          // Iterate the roles and determine if they contain the correct data.
          for (var a = 0; a < response.length; a++) {
            assert(response[a].hasOwnProperty('_id'), 'Each role in the response should contain an `_id`.');
            assert(response[a].hasOwnProperty('modified'), 'Each role in the response should contain a `modified` timestamp.');
            assert(response[a].hasOwnProperty('created'), 'Each role in the response should contain a `created` timestamp.');
            assert.equal(response[a].project, testProject.project._id);

            // Store the response data, because the order is unsure (Dont store dummy tempRole).
            if (response[a].title === 'Administrator') {
              assert.equal(response[a].title, 'Administrator');
              assert.equal(response[a].description, 'A role for Administrative Users.');
              testProject.roleAdministrator = response[a];
            }
            else if (response[a].title === 'Authenticated') {
              assert.equal(response[a].title, 'Authenticated');
              assert.equal(response[a].description, 'A role for Authenticated Users.');
              testProject.roleAuthenticated = response[a];
            }
            else if (response[a].title === 'Anonymous') {
              assert.equal(response[a].title, 'Anonymous');
              assert.equal(response[a].description, 'A role for Anonymous Users.');
              testProject.roleAnonymous = response[a];
            }
          }

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Project Level - Authenticated User', function() {
    // @TODO: Decouple tests and add tests for a registered Project user.
  });

  describe('Permissions - Project Level - Anonymous User', function() {
    it('An Anonymous user should not be able to Create a Role for a User-Created Project', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/role')
        .send(tempRole)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read a Role for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Update a Role for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .send({title: 'Some Update'})
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read the Index of Roles for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/role')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Delete a Role for a User-Created Project', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });
  });

  describe('Other Role Tests', function() {
    it('The defaultAccess Role for a Project cannot be deleted', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/role/' + testProject.project.defaultAccess)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /text\/plain/)
        .expect(405)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Method Not Allowed');

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Role Normalization', function() {
    it('A Form.io Project Owner should be able to Delete a Role', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/role/' + tempRole._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, '');

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
});

describe('User-Created Project - Form Creation', function() {
  // Store the temp form for this test suite.
  var tempForm = {
    title: 'Temp Form',
    name: 'tempForm',
    path: 'temp/form',
    type: 'form',
    access: [],
    submissionAccess: [],
    components: [
      {
        type: 'textfield',
        validate: {
          custom: '',
          pattern: '',
          maxLength: '',
          minLength: '',
          required: false
        },
        defaultValue: '',
        multiple: false,
        suffix: '',
        prefix: '',
        placeholder: 'foo',
        key: 'foo',
        label: 'foo',
        inputMask: '',
        inputType: 'text',
        input: true
      }
    ]
  };

  // Before this suite runs, attach the test Project's id to the payload.
  before(function() {
    tempForm.project = testProject.project._id;
  });

  describe('Permissions - Form Level - Project Owner', function() {
    it('A Project Owner should not be able to Create a Form without a Project ID', function(done) {
      request(app)
        .post('/project//form') // Missing project id
        .set('x-jwt-token', testProject.owner.token)
        .send(tempForm)
        .expect(401)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          done();
        });
    });

    it('A Project Owner should not be able to Create a Form without a valid Project ID', function(done) {
      request(app)
        .post('/project/💩/form') // Invalid project id
        .set('x-jwt-token', testProject.owner.token)
        .send(tempForm)
        .expect(400)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          done();
        });
    });

    it('A Project Owner should not be able to Create a Form without a real Project ID', function(done) {
      request(app)
        .post('/project/999999999999999999999999/form') // Non-existent project id
        .set('x-jwt-token', testProject.owner.token)
        .send(tempForm)
        .expect(404)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          done();
        });
    });

    it('An Project Owner should be able to Create a Form', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempForm)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, tempForm.title);
          assert.equal(response.name, tempForm.name);
          assert.equal(response.path, tempForm.path);
          assert.equal(response.type, 'form');
          assert.equal(response.project, tempForm.project);
          assert.notEqual(response.access, []);
          assert.equal(response.access.length, 1);
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 3);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
          assert.deepEqual(response.submissionAccess, []);
          assert.deepEqual(response.components, tempForm.components);
          tempForm = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read their Form', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.deepEqual(response, tempForm);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Update their Form', function(done) {
      var updatedForm = _.clone(tempForm);
      updatedForm.title = 'Updated';

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedForm.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Update the modified timestamp, before comparison.
          updatedForm.modified = response.modified;

          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          updatedForm = _.omit(updatedForm, '__v');

          assert.deepEqual(response, updatedForm);

          // Save this form for later use.
          tempForm = updatedForm;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read their Index of Forms', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 1);
          // Remove the __v property for comparisons.
          response[0] = _.omit(response[0], '__v');
          assert.deepEqual(response, [tempForm]);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read their Index of Forms with the Form filter', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form?type=form')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 1);
          // Remove the __v property for comparisons.
          response[0] = _.omit(response[0], '__v');
          assert.deepEqual(response, [tempForm]);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read their Form using an alias', function(done) {
      request(app)
        .get('/' + tempForm.path)
        .set('host', testProject.project.name + '.localhost')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempForm);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Update their Form using an alias', function(done) {
      var updatedForm = _.clone(tempForm);
      updatedForm.title = 'Updated2';

      request(app)
        .put('/' + tempForm.path)
        .set('host', testProject.project.name + '.localhost')
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedForm.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Update the modified timestamp, before comparison.
          updatedForm.modified = response.modified;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, updatedForm);

          // Save this form for later use.
          tempForm = updatedForm;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Form Level - Authenticated User', function() {
    // @TODO: Decouple tests and add tests for a registered Project user.
  });

  describe('Permissions - Form Level - Anonymous User', function() {
    it('An Anonymous user should not be able to Create a Form for a User-Created Project', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .send(tempForm)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should be able to Read a Form for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempForm);

          done();
        });
    });

    it('An Anonymous user should not be able to Update a Form for a User-Created Project', function(done) {
      var updatedForm = _.clone(tempForm);
      updatedForm.title = 'Updated';

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .send({title: updatedForm.title})
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read the Index of Forms for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read the Index of Forms for a User-Created Project with the Form filter', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form?type=form')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read a Form for a User-Created Project using it alias', function(done) {
      request(app)
        .get('/' + tempForm.path)
        .set('host', testProject.project.name + '.localhost')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempForm)

          done();
        });
    });

    it('An Anonymous user should not be able to Update a Form for a User-Created Project using it alias', function(done) {
      var updatedForm = _.clone(tempForm);
      updatedForm.title = 'Updated2';

      request(app)
        .put('/' + tempForm.path)
        .set('host', testProject.project.name + '.localhost')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });
  });

  describe('Form Normalization', function() {
    it('Updating a Form with duplicate access permission types will condense the access permissions', function(done) {
      var updatedAccess  = [
        {type: 'read_all', roles: [testProject.roleAuthenticated._id]},
        {type: 'read_all', roles: [testProject.project.defaultAccess]}
      ];

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({access: updatedAccess})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 2);
          assert.deepEqual(response.access[0].roles, [testProject.roleAuthenticated._id, testProject.project.defaultAccess]);

          // Save this form for later use.
          tempForm = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Updating a Form with duplicate submissionAccess permission types will condense the submissionAccess permissions', function(done) {
      var updatedSubmissionAccess  = [
        {type: 'read_all', roles: [testProject.roleAuthenticated._id]},
        {type: 'read_all', roles: [testProject.project.defaultAccess]}
      ];

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({submissionAccess: updatedSubmissionAccess})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess[0].type, 'read_all');
          assert.equal(response.submissionAccess[0].roles.length, 2);
          assert.deepEqual(response.submissionAccess[0].roles, [testProject.roleAuthenticated._id, testProject.project.defaultAccess]);

          // Save this form for later use.
          tempForm = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Delete their Form', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.deepEqual(response, '');

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Create a Register Form', function(done) {
      testProject.formRegister = {
        title: 'User Register',
        name: 'register',
        path: 'user/register',
        type: 'form',
        project: testProject.project._id,
        access: [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ],
        submissionAccess: [
          {type: 'create_own', roles: [testProject.roleAnonymous._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'user.username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'user.password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(testProject.formRegister)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, testProject.formRegister.title);
          assert.equal(response.name, testProject.formRegister.name);
          assert.equal(response.path, testProject.formRegister.path);
          assert.equal(response.type, 'form');
          assert.equal(response.project, testProject.project._id);
          assert.equal(response.submissionAccess[0].type, 'create_own');
          assert.equal(response.submissionAccess[0].roles[0], testProject.roleAnonymous._id);
          assert.equal(response.access.length, 1);
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 3);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
          assert.deepEqual(response.components, testProject.formRegister.components);
          testProject.formRegister = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Create a Login Form', function(done) {
      testProject.formLogin = {
        title: 'User Login',
        name: 'login',
        path: 'user/login',
        type: 'form',
        project: testProject.project._id,
        access: [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ],
        submissionAccess: [
          {type: 'create_own', roles: [testProject.roleAnonymous._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'user.username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'user.password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(testProject.formLogin)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, testProject.formLogin.title);
          assert.equal(response.name, testProject.formLogin.name);
          assert.equal(response.path, testProject.formLogin.path);
          assert.equal(response.type, 'form');
          assert.equal(response.project, testProject.project._id);
          assert.equal(response.submissionAccess[0].type, 'create_own');
          assert.equal(response.submissionAccess[0].roles[0], testProject.roleAnonymous._id);
          assert.equal(response.access.length, 1);
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 3);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
          assert.deepEqual(response.components, testProject.formLogin.components);
          testProject.formLogin = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
});

describe('Nested Resources', function() {
  var survey = null;
  var customerForm = null;
  var surveyForm = null;

  it('A Project Owner should be able to Create a Customer Resource', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form')
      .set('x-jwt-token', testProject.owner.token)
      .send({
        title: 'Customer',
        name: 'customer',
        path: 'customer',
        type: 'resource',
        project: testProject.project._id,
        access: [],
        submissionAccess: [
          {type: 'read_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_own', roles: [testProject.roleAuthenticated._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'First Name',
            key: 'firstName',
            label: 'First Name',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'Last Name',
            key: 'lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(res.body.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(res.body.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(res.body.hasOwnProperty('access'), 'The response should contain an the `access`.');
        assert.equal(res.body.title, 'Customer');
        assert.equal(res.body.name, 'customer');
        assert.equal(res.body.path, 'customer');
        assert.equal(res.body.type, 'resource');
        assert.equal(res.body.project, testProject.project._id);
        customerForm = res.body;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('Should be able to create a Customer Survey form', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form')
      .set('x-jwt-token', testProject.owner.token)
      .send({
        title: 'Customer Survey',
        name: 'survey',
        path: 'survey',
        type: 'form',
        project: testProject.project._id,
        access: [],
        submissionAccess: [
          {type: 'read_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_own', roles: [testProject.roleAuthenticated._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'First Name',
            key: 'customer.firstName',
            label: 'First Name',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'Last Name',
            key: 'customer.lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(res.body.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(res.body.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(res.body.hasOwnProperty('access'), 'The response should contain an the `access`.');
        assert.equal(res.body.title, 'Customer Survey');
        assert.equal(res.body.name, 'survey');
        assert.equal(res.body.path, 'survey');
        assert.equal(res.body.type, 'form');
        assert.equal(res.body.project, testProject.project._id);
        surveyForm = res.body;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  var survey = null;
  it('Should be able to create a submission in the survey', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form/' + surveyForm._id + '/submission')
      .set('x-jwt-token', testProject.owner.token)
      .send({
        data: {
          'customer.firstName': 'Joe',
          'customer.lastName': 'Smith'
        }
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function(err, res) {
        if(err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('data'), 'The response body should have data.');
        assert(response.hasOwnProperty('created'), 'The submission should have a created date');
        assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
        assert(response.hasOwnProperty('_id'), 'The response should have an _id');
        assert(response.data.hasOwnProperty('customer'), 'The response body should have a customer.');
        assert(response.data.customer.hasOwnProperty('created'), 'The data should have created timestamp.');
        assert(response.data.customer.hasOwnProperty('modified'), 'Make sure there is a modified date');
        assert(response.data.customer.hasOwnProperty('_id'), 'The customer should have an ID.');
        assert.equal(response.data.customer.form, customerForm._id);
        assert.equal(response.data.customer.data.firstName, 'Joe');
        assert.equal(response.data.customer.data.lastName, 'Smith');
        survey = res.body;

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('Should be able to get the customer', function(done) {
    request(app)
      .get('/project/' + testProject.project._id + '/form/' + customerForm._id + '/submission/' + survey.data.customer._id)
      .set('x-jwt-token', testProject.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;

        assert(response.hasOwnProperty('data'), 'The response should have data.');
        assert.equal(response.form, customerForm._id);
        assert.equal(response.data.firstName, 'Joe');
        assert.equal(response.data.lastName, 'Smith');

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('Should be able to query the survey submission', function(done) {
    request(app)
      .get('/project/' + testProject.project._id + '/form/' + surveyForm._id + '/submission/' + survey._id)
      .set('x-jwt-token', testProject.owner.token)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('data'), 'The response should have data.');
        assert.equal(response.form, surveyForm._id);
        assert(response.data.hasOwnProperty('customer'), 'Customer object was not found');
        assert(response.data.customer.hasOwnProperty('_id'), 'Customer should have an _id');
        assert.equal(response.data.customer.data.firstName, 'Joe');
        assert.equal(response.data.customer.data.lastName, 'Smith');

        // Store the JWT for future API calls.
        testProject.owner.token = res.headers['x-jwt-token'];

        done();
      });
  });
});

describe('User-Created Project - Resource Creation', function() {
  // Store the temp resource for this test suite.
  var tempResource = {
    title: 'tempResource',
    name: 'tempResource',
    path: 'temp',
    type: 'resource',
    access: [],
    submissionAccess: [],
    components: [
      {
        type: 'textfield',
        validate: {
          custom: '',
          pattern: '',
          maxLength: '',
          minLength: '',
          required: false
        },
        defaultValue: '',
        multiple: false,
        suffix: '',
        prefix: '',
        placeholder: 'foo',
        key: 'foo',
        label: 'foo',
        inputMask: '',
        inputType: 'text',
        input: true
      }
    ]
  };

  // Before the suite runs, attach the test Project's id to the payload.
  before(function() {
    tempResource.project = testProject.project._id;
  });

  describe('Permissions - Resource Level - Project Owner', function() {
    it('A Project Owner should be able to Create a Resource', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempResource)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, tempResource.title);
          assert.equal(response.name, tempResource.name);
          assert.equal(response.path, tempResource.path);
          assert.equal(response.type, 'resource');
          assert.equal(response.project, tempResource.project);
          assert.deepEqual(response.components, tempResource.components);
          tempResource = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];
          done();
        });
    });

    it('A Project Owner should be able to Read a Resource', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempResource._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempResource);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Update a Resource', function(done) {
      var updatedResource = _.clone(tempResource);
      updatedResource.title = 'Updated';

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempResource._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedResource.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          // Update the modified timestamp, before comparison.
          updatedResource.modified = response.modified;
          assert.deepEqual(response, updatedResource);

          // Save this resource for later use.
          tempResource = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read the Index of Resources', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form?type=resource')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 2);
          // Remove the __v property for comparisons.
          response[0] = _.omit(response[0], '__v');
          response[1] = _.omit(response[1], '__v');
          assert.deepEqual(response[0], tempResource);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read a Resource using its alias', function(done) {
      request(app)
        .get('/' + tempResource.path)
        .set('host', testProject.project.name + '.localhost')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempResource);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Update a Resource using its alias', function(done) {
      var updatedResource = _.clone(tempResource);
      updatedResource.title = 'Updated2';

      request(app)
        .put('/' + tempResource.path)
        .set('host', testProject.project.name + '.localhost')
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedResource.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          // Update the modified timestamp, before comparison.
          updatedResource.modified = response.modified;
          assert.deepEqual(response, updatedResource);

          // Save this resource for later use.
          tempResource = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Resource Level - Authenticated User', function() {
    // @TODO: Decouple tests and add tests for a registered Project user.
  });

  describe('Permissions - Resource Level - Anonymous User', function() {
    it('An Anonymous user should not be able to Create a Resource for a User-Created Project', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .send(tempResource)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should be able to Read a Resource for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempResource._id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempResource);

          done();
        });
    });

    it('An Anonymous user should not be able to Update a Resource for a User-Created Project', function(done) {
      var updatedResource = _.clone(tempResource);
      updatedResource.title = 'Updated';

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempResource._id)
        .send({title: updatedResource.title})
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read the Index of Resource for a User-Created Project', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form?type=resource')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read a Resource for a User-Created Project using it alias', function(done) {
      request(app)
        .get('/' + tempResource.path)
        .set('host', testProject.project.name + '.localhost')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempResource);

          done();
        });
    });

    it('An Anonymous user should not be able to Update a Resource for a User-Created Project using it alias', function(done) {
      var updatedResource = _.clone(tempResource);
      updatedResource.title = 'Updated2';

      request(app)
        .put('/' + tempResource.path)
        .set('host', testProject.project.name + '.localhost')
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });
  });

  describe('Resource Normalization', function() {
    it('A Project Owner should be able to Delete a Resource', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/form/' + tempResource._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, '');

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Create a User Resource', function(done) {
      testProject.resource = {
        title: 'Users',
        name: 'user',
        path: 'user',
        type: 'resource',
        project: testProject.project._id,
        access: [],
        submissionAccess: [
          {type: 'read_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_own', roles: [testProject.roleAuthenticated._id]}
        ],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'username',
            key: 'username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(testProject.resource)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, testProject.resource.title);
          assert.equal(response.name, testProject.resource.name);
          assert.equal(response.path, testProject.resource.path);
          assert.equal(response.type, 'resource');
          assert.equal(response.project, testProject.project._id);
          assert.deepEqual(response.components, testProject.resource.components);
          testProject.resource = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

});

describe('User-Created Project - Action Creation', function() {
  // Store the temp form for this test suite.
  var tempForm = {
    title: 'Temp Form',
    name: 'tempForm',
    path: 'temp',
    type: 'form',
    access: [],
    submissionAccess: [],
    components: [
      {
        type: 'textfield',
        validate: {
          custom: '',
          pattern: '',
          maxLength: '',
          minLength: '',
          required: false
        },
        defaultValue: '',
        multiple: false,
        suffix: '',
        prefix: '',
        placeholder: 'foo',
        key: 'foo',
        label: 'foo',
        inputMask: '',
        inputType: 'text',
        input: true
      }
    ]
  };

  // Store the temp action for this test suite.
  var tempAction = {
    title: 'Authentication',
    name: 'auth',
    handler: ['before'],
    method: ['create'],
    priority: 0,
    settings: {
      association: 'existing',
      username: 'user.username',
      password: 'user.password'
    }
  };

  // Before this suite runs, attach the test Project's id to the payload.
  before(function() {
    tempForm.project = testProject.project._id;
  });

  describe('Bootstrap', function() {
    it('Create a Form for Action tests', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempForm)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, tempForm.title);
          assert.equal(response.name, tempForm.name);
          assert.equal(response.path, tempForm.path);
          assert.equal(response.type, 'form');
          assert.equal(response.project, tempForm.project);
          assert.equal(response.access.length, 1);
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 3);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
          assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
          assert.deepEqual(response.submissionAccess, []);
          assert.deepEqual(response.components, tempForm.components);
          tempForm = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Project Level - Project Owner', function() {
    it('A Project Owner should be able to Create an Action', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
        .set('x-jwt-token', testProject.owner.token)
        .send(tempAction)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert.equal(response.title, tempAction.title);
          assert.equal(response.name, tempAction.name);
          assert.deepEqual(response.handler, tempAction.handler);
          assert.deepEqual(response.method, tempAction.method);
          assert.equal(response.priority, tempAction.priority);
          assert.deepEqual(response.settings, tempAction.settings);
          assert.equal(response.form, tempForm._id);
          tempAction = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read an Action', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempAction);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Update an Action', function(done) {
      var updatedAction = _.clone(tempAction);
      updatedAction.title = 'Updated';

      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .set('x-jwt-token', testProject.owner.token)
        .send({title: updatedAction.title})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, updatedAction);

          tempAction = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Read the Index of Actions', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
        .set('x-jwt-token', testProject.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 1);
          // Remove the __v property for comparisons.
          response[0] = _.omit(response[0], '__v');
          assert.deepEqual(response, [tempAction]);

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Permissions - Project Level - Authenticated User', function() {
    // @TODO: Decouple tests and add tests for a registered Project user.
  });

  describe('Permissions - Project Level - Anonymous User', function() {
    it('An Anonymous user should not be able to Create an Action for a User-Created Project Form', function(done) {
      request(app)
        .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
        .send(tempAction)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should not be able to Read an Action for a User-Created Project Form', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          // Remove the __v property for comparisons.
          response = _.omit(response, '__v');
          assert.deepEqual(response, tempAction);

          done();
        });
    });

    it('An Anonymous user should not be able to Update an Action for a User-Created Project Form', function(done) {
      request(app)
        .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .send({foo: 'bar'})
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });

    it('An Anonymous user should be able to Read the Index of Actions for a User-Created Project Form', function(done) {
      request(app)
        .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 1);
          // Remove the __v property for comparisons.
          response[0] = _.omit(response[0], '__v');
          assert.deepEqual(response, [tempAction]);

          done();
        });
    });

    it('An Anonymous user should not be able to Delete an Action for a User-Created Project Form', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .expect('Content-Type', /text\/plain/)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, 'Unauthorized');

          done();
        });
    });
  });

  describe('RoleAction Functionality tests', function() {
    // The temp form with the add RoleAction for existing submissions.
    var addForm = {
      title: 'Add Form',
      name: 'addForm',
      path: 'addForm',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: []
    };

    // The temp form with the remove RoleAction for existing submissions.
    var removeForm = {
      title: 'Remove Form',
      name: 'removeForm',
      path: 'removeForm',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: []
    };

    // The temp form with the add RoleAction for new submissions.
    var submissionForm = {
      title: 'Submission Form',
      name: 'submissionForm',
      path: 'submissionForm',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: [
        {
          type: 'textfield',
          validate: {
            custom: '',
            pattern: '',
            maxLength: '',
            minLength: '',
            required: false
          },
          defaultValue: '',
          multiple: false,
          suffix: '',
          prefix: '',
          placeholder: 'foo',
          key: 'foo',
          label: 'foo',
          inputMask: '',
          inputType: 'text',
          input: true
        }
      ]
    };

    // The temp role add action for existing submissions.
    var addAction = {
      title: 'Add Role',
      name: 'role',
      handler: ['before'],
      method: ['create'],
      priority: 1,
      settings: {
        association: 'existing',
        type: 'add'
      }
    };

    // The temp role remove action for existing submissions.
    var removeAction = {
      title: 'Remove Role',
      name: 'role',
      handler: ['before'],
      method: ['create'],
      priority: 1,
      settings: {
        association: 'existing',
        type: 'remove'
      }
    };

    // The temp role add action for new submissions.
    var submissionAction = {
      title: 'Add Role',
      name: 'role',
      handler: ['after'],
      method: ['create'],
      priority: 1,
      settings: {
        association: 'new',
        type: 'add',
        role: null
      }
    };

    // The temp submission.
    var submission = {};

    // The dummy role for this test suite.
    var dummyRole = {
      title: 'dummyRole',
      description: 'A dummy role.'
    };

    // Before this suite runs, attach the test Project's id to the payload.
    before(function() {
      dummyRole.project = testProject.project._id;
      addForm.project = testProject.project._id;
      removeForm.project = testProject.project._id;
      submissionForm.project = testProject.project._id;
    });

    describe('Bootstrap', function() {
      it('Create the dummy role', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/role')
          .set('x-jwt-token', testProject.owner.token)
          .send(dummyRole)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Remove the __v property for comparisons.
            response = _.omit(response, '__v');
            assert(response.hasOwnProperty('_id'), 'Each role in the response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'Each role in the response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'Each role in the response should contain a `created` timestamp.');
            assert.equal(response.project, dummyRole.project);
            assert.equal(response.title, dummyRole.title);
            assert.equal(response.description, dummyRole.description);

            // Store this temp role for later use.
            dummyRole = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      describe('Role dependent', function() {
        // Attach the dummy role to the submission action before starting its tests.
        before(function() {
          submissionForm.access = [
            {type: 'read_all', roles: [testProject.roleAnonymous._id]}
          ];
          submissionForm.submissionAccess = [
            {type: 'create_own', roles: [testProject.roleAnonymous._id]},
            {type: 'read_own', roles: [dummyRole._id]},
            {type: 'update_own', roles: [dummyRole._id]},
            {type: 'delete_own', roles: [dummyRole._id]}
          ];

          submissionAction.settings.role = dummyRole._id;
        });

        // Create the dummy forms and attach each respective action.
        it('Create the addForm Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(addForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, addForm.title);
              assert.equal(response.name, addForm.name);
              assert.equal(response.path, addForm.path);
              assert.equal(response.type, addForm.type);
              assert.equal(response.project, addForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 4);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, addForm.components);
              addForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Attach the addAction (RoleAction) to its Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + addForm._id + '/action')
            .set('x-jwt-token', testProject.owner.token)
            .send(addAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, addAction.title);
              assert.equal(response.name, addAction.name);
              assert.deepEqual(response.handler, addAction.handler);
              assert.deepEqual(response.method, addAction.method);
              assert.equal(response.priority, addAction.priority);
              assert.deepEqual(response.settings, addAction.settings);
              assert.equal(response.form, addForm._id);
              addAction = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the removeForm Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(removeForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, removeForm.title);
              assert.equal(response.name, removeForm.name);
              assert.equal(response.path, removeForm.path);
              assert.equal(response.type, removeForm.type);
              assert.equal(response.project, removeForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 4);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, removeForm.components);
              removeForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Attach the removeAction (RoleAction) to its Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + removeForm._id + '/action')
            .set('x-jwt-token', testProject.owner.token)
            .send(removeAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, removeAction.title);
              assert.equal(response.name, removeAction.name);
              assert.deepEqual(response.handler, removeAction.handler);
              assert.deepEqual(response.method, removeAction.method);
              assert.equal(response.priority, removeAction.priority);
              assert.deepEqual(response.settings, removeAction.settings);
              assert.equal(response.form, removeForm._id);
              removeAction = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the submissionForm Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(submissionForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert(response.hasOwnProperty('submissionAccess'), 'The response should contain an the `submissionAccess`.');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 4);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
              assert.equal(response.submissionAccess.length, 4);
              assert.equal(response.title, submissionForm.title);
              assert.equal(response.name, submissionForm.name);
              assert.equal(response.path, submissionForm.path);
              assert.equal(response.type, submissionForm.type);
              assert.equal(response.project, submissionForm.project);
              assert.deepEqual(response.components, submissionForm.components);
              submissionForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Attach the submissionAction (RoleAction) to its Form', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + submissionForm._id + '/action')
            .set('x-jwt-token', testProject.owner.token)
            .send(submissionAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, submissionAction.title);
              assert.equal(response.name, submissionAction.name);
              assert.deepEqual(response.handler, submissionAction.handler);
              assert.deepEqual(response.method, submissionAction.method);
              assert.equal(response.priority, submissionAction.priority);
              assert.deepEqual(response.settings, submissionAction.settings);
              assert.equal(response.form, submissionForm._id);
              submissionAction = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('RoleAction Functionality tests for Existing Submissions', function() {
      it('The Project Owner should not have the dummy Role assigned', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + bootstrap.resource._id + '/submission/' + testProject.owner._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            // Confirm the response does not contain the dummy role.
            var response = res.body;
            assert.equal(response.roles.indexOf(dummyRole._id), -1);

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A submission to the addForm Form should return the updated Submission with the dummy Role added', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + addForm._id + '/submission')
          .set('x-jwt-token', testProject.owner.token)
          .send({
            data: {
              role: dummyRole._id,
              submission: testProject.owner._id
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.body;
            assert.notEqual(response.roles.indexOf(dummyRole._id), -1);
            testProject.owner = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A submission to the removeForm Form should return the updated Submission with the dummy Role removed', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + removeForm._id + '/submission')
          .set('x-jwt-token', testProject.owner.token)
          .send({
            data: {
              role: dummyRole._id,
              submission: testProject.owner._id
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.roles.indexOf(dummyRole._id), -1);
            testProject.owner = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('The Project Owner should not have the dummy Role assigned after a submission to the removeForm Form', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + bootstrap.resource._id + '/submission/' + testProject.owner._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            // Confirm the response does not contain the dummy role.
            var response = res.body;
            assert.equal(response.roles.indexOf(dummyRole._id), -1);

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A submission to the addForm Form using the Form alias should return the updated Submission with the dummy Role added', function(done) {
        request(app)
          .post('/' + addForm.path)
          .set('x-jwt-token', testProject.owner.token)
          .set('Host', testProject.project.name + '.localhost')
          .send({
            data: {
              role: dummyRole._id,
              submission: testProject.owner._id
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.body;
            assert.notEqual(response.roles.indexOf(dummyRole._id), -1);
            testProject.owner = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A submission to the removeForm Form using the Form alias should return the updated Submission with the dummy Role removed', function(done) {
        request(app)
          .post('/' + removeForm.path)
          .set('x-jwt-token', testProject.owner.token)
          .set('Host', testProject.project.name + '.localhost')
          .send({
            data: {
              role: dummyRole._id,
              submission: testProject.owner._id
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.roles.indexOf(dummyRole._id), -1);
            testProject.owner = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('The Project Owner should not have the dummy Role assigned after a submission to the removeForm Form using the Form alias', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + bootstrap.resource._id + '/submission/' + testProject.owner._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            // Confirm the response does not contain the dummy role.
            var response = res.body;
            assert.equal(response.roles.indexOf(dummyRole._id), -1);

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('RoleAction Functionality tests for New Submissions', function() {
      it('A new Submission to the submissionForm should create a new Submission and contain the dummyRole Role', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + submissionForm._id + '/submission')
          .send({
            data: {
              foo: 'bar'
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.body;
            assert.notEqual(response.roles.indexOf(dummyRole._id), -1);
            submission = response;

            done();
          });
      });
    });

    describe('RoleAction Normalization', function() {
      it('Remove the temp submission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + submissionForm._id + '/submission/' + submission._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            submission = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the dummy role', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/role/' + dummyRole._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            dummyRole = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the submissionAction', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + submissionForm._id + '/action/' + submissionAction._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            submissionAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the removeAction', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + removeForm._id + '/action/' + removeAction._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            removeAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the addAction', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + addForm._id + '/action/' + addAction._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            addAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the submissionForm', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + submissionForm._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            submissionForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the removeForm', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + removeForm._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            removeForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Remove the addForm', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + addForm._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');
            addForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Action Normalization', function() {
    it('A Project Owner should be able to Delete an Action', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + tempAction._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.equal(response, '');

          tempAction = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Delete the Form used for Action tests', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.deepEqual(response, '');

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Create an Authentication Action (Login Form)', function(done) {
      testProject.actionLogin = {
        title: 'Authentication',
        name: 'auth',
        handler: ['before'],
        method: ['create'],
        priority: 0,
        settings: {
          association: 'existing',
          username: 'user.username',
          password: 'user.password'
        }
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form/' + testProject.formLogin._id + '/action')
        .set('x-jwt-token', testProject.owner.token)
        .send({ data: testProject.actionLogin })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert.equal(response.title, testProject.actionLogin.title);
          assert.equal(response.name, testProject.actionLogin.name);
          assert.deepEqual(response.handler, testProject.actionLogin.handler);
          assert.deepEqual(response.method, testProject.actionLogin.method);
          assert.equal(response.priority, testProject.actionLogin.priority);
          assert.deepEqual(response.settings, testProject.actionLogin.settings);
          assert.equal(response.form, testProject.formLogin._id);
          testProject.actionLogin = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should be able to Create an Authentication Action (Registration Form)', function(done) {
      testProject.actionRegister = {
        title: 'Authentication',
        name: 'auth',
        handler: ['before'],
        method: ['create'],
        priority: 0,
        settings: {
          association: 'new',
          username: 'user.username',
          password: 'user.password'
        }
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form/' + testProject.formRegister._id + '/action')
        .set('x-jwt-token', testProject.owner.token)
        .send({ data: testProject.actionRegister })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert.equal(response.title, testProject.actionRegister.title);
          assert.equal(response.name, testProject.actionRegister.name);
          assert.deepEqual(response.handler, testProject.actionRegister.handler);
          assert.deepEqual(response.method, testProject.actionRegister.method);
          assert.equal(response.priority, testProject.actionRegister.priority);
          assert.deepEqual(response.settings, testProject.actionRegister.settings);
          assert.equal(response.form, testProject.formRegister._id);
          testProject.actionRegister = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('An Project Onwer should be able to Create a Role Assignment Action (Registration Form)', function(done) {
      testProject.actionRole = {
        title: 'Role Assignment',
        name: 'role',
        handler: ['after'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'new',
          type: 'add',
          role: testProject.roleAuthenticated._id
        }
      };

      request(app)
        .post('/project/' + testProject.project._id + '/form/' + testProject.formRegister._id + '/action')
        .set('x-jwt-token', testProject.owner.token)
        .send({ data: testProject.actionRole })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert.equal(response.title, testProject.actionRole.title);
          assert.equal(response.name, testProject.actionRole.name);
          assert.deepEqual(response.handler, testProject.actionRole.handler);
          assert.deepEqual(response.method, testProject.actionRole.method);
          assert.equal(response.priority, testProject.actionRole.priority);
          assert.deepEqual(response.settings, testProject.actionRole.settings);
          assert.equal(response.form, testProject.formRegister._id);
          testProject.actionRole = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
});

describe('User-Created Project - User Registration', function() {
  it('A new User should be able to register for a User-created Project', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form/' + testProject.formRegister._id + '/submission')
      .send({
        data: {
          'user.username': testProject.user1.data.username,
          'user.password': testProject.user1.data.password
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user1.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
        assert.deepEqual(response.roles, [testProject.roleAuthenticated._id]);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user1 data.
        var tempPassword = testProject.user1.data.password;
        testProject.user1 = response;
        testProject.user1.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('A new User should be able to register for a User-created Project using an Alias', function(done) {
    request(app)
      .post('/' + testProject.formRegister.path)
      .set('host', testProject.project.name + '.localhost')
      .send({
        data: {
          'user.username': testProject.user2.data.username,
          'user.password': testProject.user2.data.password
        }
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user2.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
        assert.deepEqual(response.roles, [testProject.roleAuthenticated._id]);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user2 data.
        var tempPassword = testProject.user2.data.password;
        testProject.user2 = response;
        testProject.user2.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user2.token = res.headers['x-jwt-token'];

        done();
      });
  });

  describe('Create an Administrative User', function() {
    var roleForm = {
      title: 'Role Manipulation Form',
      name: 'roleForm',
      path: 'roleForm',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: []
    };

    var addAction = {
      title: 'Add Role',
      name: 'role',
      handler: ['before'],
      method: ['create'],
      priority: 1,
      settings: {
        association: 'existing',
        type: 'add'
      }
    };

    before(function() {
      roleForm.project = testProject.project._id;
    });

    describe('Bootstrap', function() {
      it('Create the Role Manipulation Form', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.owner.token)
          .send(roleForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Remove the __v property for comparisons.
            response = _.omit(response, '__v');
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
            assert.equal(response.title, roleForm.title);
            assert.equal(response.name, roleForm.name);
            assert.equal(response.path, roleForm.path);
            assert.equal(response.type, roleForm.type);
            assert.equal(response.project, roleForm.project);
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, roleForm.components);
            roleForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Attach the RoleAction to its Form', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + roleForm._id + '/action')
          .set('x-jwt-token', testProject.owner.token)
          .send(addAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, addAction.title);
            assert.equal(response.name, addAction.name);
            assert.deepEqual(response.handler, addAction.handler);
            assert.deepEqual(response.method, addAction.method);
            assert.equal(response.priority, addAction.priority);
            assert.deepEqual(response.settings, addAction.settings);
            assert.equal(response.form, roleForm._id);
            addAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Create an Authenticated User', function() {
      it('Create a User', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + testProject.formRegister._id + '/submission')
          .send({
            data: {
              'user.username': testProject.admin1.data.username,
              'user.password': testProject.admin1.data.password
            }
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
            assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
            assert.equal(response.data.username, testProject.admin1.data.username);
            assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
            assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
            assert.equal(response.form, testProject.resource._id);
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [testProject.roleAuthenticated._id]);
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            // Update our testProject.admin1 data.
            var tempPassword = testProject.admin1.data.password;
            testProject.admin1 = response;
            testProject.admin1.data.password = tempPassword;

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Update the Project User to be an Administrator', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + roleForm._id + '/submission')
          .set('x-jwt-token', testProject.owner.token)
          .send({
            data: {
              role: testProject.roleAdministrator._id,
              submission: testProject.admin1._id
            }
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
            assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
            assert.equal(response.data.username, testProject.admin1.data.username);
            assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
            assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
            assert.equal(response.form, testProject.resource._id);
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [testProject.roleAuthenticated._id, testProject.roleAdministrator._id]);
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            // Update our testProject.admin1 data.
            var tempPassword = testProject.admin1.data.password;
            var tempToken = testProject.admin1.token;
            testProject.admin1 = response;
            testProject.admin1.data.password = tempPassword;
            testProject.admin1.token = tempToken;

            // Store the JWT for future API calls; Note that this is for the owner, not admin.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Get an updated X-JWT-Token for the Administrator', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + testProject.formLogin._id + '/submission')
          .send({
            data: {
              'user.username': testProject.admin1.data.username,
              'user.password': testProject.admin1.data.password
            }
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
            assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
            assert.equal(response.data.username, testProject.admin1.data.username);
            assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
            assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
            assert.equal(response.form, testProject.resource._id);
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [testProject.roleAuthenticated._id, testProject.roleAdministrator._id]);
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            // Update our testProject.admin1 data.
            var tempPassword = testProject.admin1.data.password;
            var tempToken = testProject.admin1.token;
            testProject.admin1 = response;
            testProject.admin1.data.password = tempPassword;

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });
});

describe('User-Created Project - User Authentication', function() {
  it('A Registered User for a User-Created Project should be able to login', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form/' + testProject.formLogin._id + '/submission')
      .send({
        data: {
          'user.username': testProject.user1.data.username,
          'user.password': testProject.user1.data.password
        }
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user1.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user1 data.
        var tempPassword = testProject.user1.data.password;
        testProject.user1 = response;
        testProject.user1.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('A User Authenticated for a User-Created Project using the Form path should be able to view the current User', function(done) {
    request(app)
      .get('/current')
      .set('x-jwt-token', testProject.user1.token)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user1.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user1 data.
        var tempPassword = testProject.user1.data.password;
        testProject.user1 = response;
        testProject.user1.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('A Registered User for a User-Created Project should be able to login using an Alias', function(done) {
    request(app)
      .post('/' + testProject.formLogin.path)
      .set('host', testProject.project.name + '.localhost')
      .send({
        data: {
          'user.username': testProject.user2.data.username,
          'user.password': testProject.user2.data.password
        }
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user2.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user2 data.
        var tempPassword = testProject.user2.data.password;
        testProject.user2 = response;
        testProject.user2.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user2.token = res.headers['x-jwt-token'];

        done();
      });
  });

  var oldToken = null;
  it('An Authenticated and Registered User for a User-Created Project should be able to logout', function(done) {
    request(app)
      .get('/logout')
      .set('x-jwt-token', testProject.user1.token)
      .expect(204)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        // Store the old auth token for further tests.
        oldToken = testProject.user1.token;

        // Confirm that the token was sent and empty.
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
        assert.equal(res.headers['x-jwt-token'], '');

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('An Authenticated and Registered User for a User-Created Project should be able to login again', function(done) {
    request(app)
      .post('/project/' + testProject.project._id + '/form/' + testProject.formLogin._id + '/submission')
      .send({
        data: {
          'user.username': testProject.user1.data.username,
          'user.password': testProject.user1.data.password
        }
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user1.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Confirm the new token is different than the last.
        assert.notEqual(
          res.headers.hasOwnProperty('x-jwt-token'),
          oldToken,
          'The `x-jwt-token` recieved from re-logging in should be different than previously.'
        );

        // Update our testProject.owners data.
        var tempPassword = testProject.user1.data.password;
        testProject.user1 = response;
        testProject.user1.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });

  it('An Anonymous User should not be able to access the current User endpoint', function(done) {
    request(app)
      .get('/current')
      .expect('Content-Type', /text\/plain/)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.text;
        assert.equal(response, 'Unauthorized');

        done();
      });
  });

  it('A User who has re-logged in for a User-Created Project should be able to view the current User', function(done) {
    request(app)
      .get('/current')
      .set('x-jwt-token', testProject.user1.token)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var response = res.body;
        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
        assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
        assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
        assert(response.data.hasOwnProperty('username'), 'The submission `data` should contain the `username`.');
        assert.equal(response.data.username, testProject.user1.data.username);
        assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, testProject.resource._id);
        assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

        // Update our testProject.user1 data.
        var tempPassword = testProject.user1.data.password;
        testProject.user1 = response;
        testProject.user1.data.password = tempPassword;

        // Store the JWT for future API calls.
        testProject.user1.token = res.headers['x-jwt-token'];

        done();
      });
  });
});

describe('User-Created Project - Submission Creation', function() {
  describe('Submission Level Permissions (Project Owner)', function() {
    describe('Submission CRUD', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Project owner access check',
        name: 'access',
        path: 'access/owner',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submission for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
      });

      describe('Bootstrap', function(done) {
        it('Create a Form for a Submission level Access Check - Project Owner', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner Submission', function(done) {
        it('The Project Owner should be able to Create a submission without explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Read a submission without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Update a submission without explicit permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmission);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the submission data.
              tempSubmission = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1, 'The response should contain 1 element');
              assert.deepEqual(response[0], tempSubmission);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Read a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Update a submission without explicit permissions using the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmission);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);
              tempSubmission = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmission);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        var deleteTest = {data: {value: 'foo'}};
        it('The Project Owner should be able to Create a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send(deleteTest)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, deleteTest.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              deleteTest = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to Delete a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + deleteTest._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              deleteTest = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User Submission', function(done) {
        it('A Registered user should not be able to Create a submission without explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(tempSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Create a submissions without explicit permissions using the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .send(tempSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submissions without explicit permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submission without explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User Submission', function(done) {
        it('An Anonymous user should not be able to Create a submission without explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(tempSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('Host', testProject.project.name + '.localhost')
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Create a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmission._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function(done) {
        it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmission = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the form created for Access Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Ownership', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm',
        name: 'dummyForm',
        path: 'dummy/form',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
      });

      describe('Bootstrap', function(done) {
        it('Create the Form for Ownership Checks', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner', function() {
        it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
          var tempSubmission = {data: {value: 'foo'}};

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.owner._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
          var tempSubmission = {data: {value: 'foo'}, owner: testProject.user1._id};

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, tempSubmission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the response for an update test.
              temp = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({owner: testProject.owner._id})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the owner of temp for comparison.
              temp.owner = testProject.owner._id;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should not be able create a submission in their name, without permissions', function(done) {
          var submission = {data: {value: 'foo'}, owner: testProject.user1._id};

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to create a submission in someones name, without permissions', function(done) {
          var submission = {data: {value: 'foo'}, owner: testProject.user2._id};

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({owner: testProject.user1._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send({data: temp.data})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send({data: {value: 'foo'}, owner: testProject.user2._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the Form created for Ownership Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });
  });

  describe('Submission Level Permissions (Authenticated User)', function() {
    describe('Submission CRUD - _own', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Authenticated access check',
        name: 'access',
        path: 'access/authenticated',
        type: 'form',
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the template submission for this test suite.
      var templateSubmission = {data: {value: 'foo'}};

      // Store the user1 temp submission for this test suite.
      var tempSubmissionUser1 = {};

      // Store the user2 temp submission for this test suite.
      var tempSubmissionUser2 = {};

      // Store the Project Owners submission for this test suite.
      var tempSubmissionOwner1 = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'read_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_own', roles: [testProject.roleAuthenticated._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create a Form for a Submission level Access Check - Authenticated User', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User Submission', function(done) {
        it('A Registered user should be able to Create a submission with explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read a submission with explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Update a submission with explicit Own permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser1);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the submission data.
              tempSubmissionUser1 = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read a submission with explicit Own permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Update a submission with explicit Own permissions using the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser1);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the submission data.
              tempSubmissionUser1 = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Delete a submission with explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');

              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Create a submission with explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Additional Registered user should be able to Create a submission with explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user2.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
              tempSubmissionUser2 = response;

              // Store the JWT for future API calls.
              testProject.user2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a Submission with explicit Own permissions, that they do not personally Own', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1, 'The response should contain 1 element');
              assert.deepEqual(response[0], tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Additional Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmissionUser2);

              // Store the JWT for future API calls.
              testProject.user2.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner Submission', function(done) {
        it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser2);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);
              tempSubmissionUser2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 3);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner1);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 3);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User Submission', function(done) {
        it('An Anonymous user should not be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit Own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function(done) {
        it('A Registered user should be able to Delete a submission with explicit Own permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');

              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit Own permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionUser2._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');

              tempSubmissionUser2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the form created for Access Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission CRUD - _all', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Authenticated access check',
        name: 'access',
        path: 'access/authenticated',
        type: 'form',
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the template submission for this test suite.
      var templateSubmission = {data: {value: 'foo'}};

      // Store the user1 temp submission for this test suite.
      var tempSubmissionUser1 = {};

      // Store the Project Owners submission for this test suite.
      var tempSubmissionOwner1 = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_all', roles: [testProject.roleAuthenticated._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create a Form for a Submission level Access Check - Authenticated User', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User Submission', function(done) {
        it('A Registered user should be able to Create a submission with explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read a submission with explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Update a submission with explicit permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser1);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the submission data.
              tempSubmissionUser1 = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read the Index of submissions with explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read a submission with explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Update a submission with explicit permissions using the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser1);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp for response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the submission data.
              tempSubmissionUser1 = updatedSubmission;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Read the Index of submissions with explicit permissions using the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);
              assert.deepEqual(response[0], tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Delete a submission with explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');

              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should be able to Create a submission with explicit permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner Submission', function(done) {
        it('The Project owner should be able to Create a submission without explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionUser1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionUser1);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Create a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit permissions with the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner1);
          updatedSubmission.data.value = 'bar2';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User Submission', function(done) {
        it('An Anonymous user should not be able to Create a submission without explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Create a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission without explicit permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function(done) {
        it('A Registered user should be able to Delete a submission with explicit permissions using the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionUser1._id)
            .set('x-jwt-token', testProject.user1.token)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');

              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the form created for Access Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Ownership - _own', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm',
        name: 'dummyForm',
        path: 'dummy/form',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'read_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_own', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_own', roles: [testProject.roleAuthenticated._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create the Form for Ownership Checks', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner', function() {
        it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.owner._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user2._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the response for an update test.
              temp = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
          var doc = {data: temp.data, owner: testProject.user1._id};

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.owner.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the owner of temp for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should be able create a submission in their name, with _own permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.user1._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to create a submission in someones name, with _own permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.owner._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to update the owner of a submission, with _own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user1._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the Form created for Ownership Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Ownership - _all', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm',
        name: 'dummyForm',
        path: 'dummy/form',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'read_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'update_all', roles: [testProject.roleAuthenticated._id]},
          {type: 'delete_all', roles: [testProject.roleAuthenticated._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create the Form for Ownership Checks', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner', function() {
        it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.owner._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user2._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the response for an update test.
              temp = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user1._id;

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({owner: submission.owner})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the temp owner for comparison.
              temp.owner = submission.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should be able create a submission in their name, with _all permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.user1._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should be able to create a submission in someones name, with _all permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.owner._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should be able to update the owner of a submission, with _all permissions', function(done) {
          var doc = {owner: testProject.owner._id};

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.user1.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the owner of temp for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user1._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the Form created for Ownership Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });
  });

  describe('Submission Level Permissions (Anonymous User)', function() {
    describe('Submission CRUD - _own', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Anonymous access check',
        name: 'access',
        path: 'access/anonymous',
        type: 'form',
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the template submission for this test suite.
      var templateSubmission = {data: {value: 'foo'}};

      // Store the annonymous temp submission1 for this test suite.
      var tempSubmissionAnon1 = {};

      // Store the annonymous temp submission2 for this test suite.
      var tempSubmissionAnon2 = {};

      // Store the Project Owners submission1 for this test suite.
      var tempSubmissionOwner1 = {};

      // Store the Project Owners submission2 for this test suite.
      var tempSubmissionOwner2 = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_own', roles: [testProject.roleAnonymous._id]},
          {type: 'read_own', roles: [testProject.roleAnonymous._id]},
          {type: 'update_own', roles: [testProject.roleAnonymous._id]},
          {type: 'delete_own', roles: [testProject.roleAnonymous._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create a Form for a Submission level Access Check - Anonymous User', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User Submission', function(done) {
        it('An Anonymous user should be able to Create a submission with explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon1 = response;

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .send({value: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should be able to Create a submission with explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon2 = response;

              done();
            });
        });

        it('An Anonymous user should not be able to Read a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Update a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id)
            .set('Host', testProject.project.name + '.localhost')
            .send({value: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous user should not be able to Delete a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Project Owner Submission', function(done) {
        it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner1);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the stored resource.
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 3);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner2);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the stored resource.
              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 3);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User Submission', function(done) {
        it('A Registered user should not be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit Own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submission without explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Submission Normalization', function(done) {
        it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionAnon1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionAnon2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the form created for Access Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission CRUD - _all', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Anonymous access check',
        name: 'access',
        path: 'access/anonymous',
        type: 'form',
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the template submission for this test suite.
      var templateSubmission = {data: {value: 'foo'}};

      // Store the annonymous temp submission1 for this test suite.
      var tempSubmissionAnon1 = {};

      // Store the annonymous temp submission2 for this test suite.
      var tempSubmissionAnon2 = {};

      // Store the Project Owners submission1 for this test suite.
      var tempSubmissionOwner1 = {};

      // Store the Project Owners submission2 for this test suite.
      var tempSubmissionOwner2 = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_all', roles: [testProject.roleAnonymous._id]},
          {type: 'read_all', roles: [testProject.roleAnonymous._id]},
          {type: 'update_all', roles: [testProject.roleAnonymous._id]},
          {type: 'delete_all', roles: [testProject.roleAnonymous._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create a Form for a Submission level Access Check - Anonymous User', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User Submission', function(done) {
        it('An Anonymous user should be able to Create a submission with explicit permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon1 = response;

              done();
            });
        });

        it('An Anonymous user should be able to Read a submission with explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionAnon1);

              done();
            });
        });

        it('An Anonymous user should be able to Update a submission with explicit permissions', function(done) {
          var compare = _.omit(tempSubmissionAnon1, 'modified');
          compare.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .send({data: {value: compare.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), compare);
              tempSubmissionAnon1 = response;

              done();
            });
        });

        it('An Anonymous user should be able to Read the Index of submissions without explicit permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);

              done();
            });
        });

        it('An Anonymous user should be able to Delete a submission with explicit permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionAnon1 = response;

              done();
            });
        });

        it('An Anonymous user should be able to Create a submission with explicit permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon2 = response;

              done();
            });
        });

        it('An Anonymous user should be able to Read a submission with explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionAnon2);

              done();
            });
        });

        it('An Anonymous user should be able to Update a submission with explicit permissions with the Form alias', function(done) {
          var compare = _.omit(tempSubmissionAnon2, 'modified');
          compare.data.value = 'bar';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id)
            .set('Host', testProject.project.name + '.localhost')
            .send({data: {value: compare.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), compare);
              tempSubmissionAnon2 = response;

              done();
            });
        });

        it('An Anonymous user should be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);

              done();
            });
        });

        it('An Anonymous user should be able to Delete a submission with explicit permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id)
            .set('Host', testProject.project.name + '.localhost')
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
              tempSubmissionAnon2 = response;

              done();
            });
        });
      });

      describe('Project Owner Submission', function(done) {
        it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner1);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the stored resource.
              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 1);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmissionOwner2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          var updatedSubmission = _.clone(tempSubmissionOwner2);
          updatedSubmission.data.value = 'bar';

          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .send({data: {value: updatedSubmission.data.value}})
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Update the modified timestamp before response comparison.
              updatedSubmission.modified = response.modified;
              assert.deepEqual(response, updatedSubmission);

              // Update the stored resource.
              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, 2);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User Submission', function(done) {
        it('A Registered user should not be able to Create a submission without explicit Own permissions', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit Own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
          request(app)
            .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submission without explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .post('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send(templateSubmission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .put('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .send({foo: 'bar'})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .get('/' + tempForm.path + '/submission')
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.user1.token)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Submission Normalization', function(done) {
        it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias', function(done) {
          request(app)
            .delete('/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id)
            .set('Host', testProject.project.name + '.localhost')
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the form created for Access Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Ownership - _own', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm',
        name: 'dummyForm',
        path: 'dummy/form',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_own', roles: [testProject.roleAnonymous._id]},
          {type: 'read_own', roles: [testProject.roleAnonymous._id]},
          {type: 'update_own', roles: [testProject.roleAnonymous._id]},
          {type: 'delete_own', roles: [testProject.roleAnonymous._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create the Form for Ownership Checks', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner', function() {
        it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.owner._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user2._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the response for an update test.
              temp = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
          var doc = {data: temp.data, owner: testProject.user1._id};

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.owner.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the temp owner for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should not be able create a submission in their name, without _own permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to create a submission in someones name, without _own permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.owner._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to update the owner of a submission, without _own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should be able create a submission in their name, with _own permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, null);

              // Update the submission data.
              tempSubmissions.push(response);

              done();
            });
        });

        it('An Anonymous User should not be able to create a submission in someones name, with _own permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user1._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });

        it('An Anonymous User should not be able to update the owner of a submission, with _own permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the Form created for Ownership Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Ownership - _all', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm',
        name: 'dummyForm',
        path: 'dummy/form',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.project = testProject.project._id;
        tempForm.access = [
          {type: 'read_all', roles: [testProject.roleAnonymous._id]}
        ];
        tempForm.submissionAccess = [
          {type: 'create_all', roles: [testProject.roleAnonymous._id]},
          {type: 'read_all', roles: [testProject.roleAnonymous._id]},
          {type: 'update_all', roles: [testProject.roleAnonymous._id]},
          {type: 'delete_all', roles: [testProject.roleAnonymous._id]}
        ];
      });

      describe('Bootstrap', function(done) {
        it('Create the Form for Ownership Checks', function(done) {
          request(app)
            .post('/project/' + testProject.project._id + '/form')
            .set('x-jwt-token', testProject.owner.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.project, tempForm.project);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
              assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Project Owner', function() {
        it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, testProject.owner._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user2._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.owner.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the response for an update test.
              temp = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
          var doc = {data: temp.data, owner: testProject.user1._id};

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.owner.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the temp owner for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should not be able create a submission in their name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.owner._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .set('x-jwt-token', testProject.user1.token)
            .send(submission)
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should not be able to update the owner of a submission, without permissions', function(done) {
          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .set('x-jwt-token', testProject.user1.token)
            .send({data: temp.data, owner: testProject.owner._id})
            .expect(401)
            .expect('Content-Type', /text\/plain/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, 'Unauthorized')

              // Store the JWT for future API calls.
              testProject.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should be able create a submission with no owner, with _all permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, null);

              // Update the submission data.
              tempSubmissions.push(response);

              done();
            });
        });

        it('An Anonymous User should be able to create a submission in someones name, with _all permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = testProject.user1._id;

          request(app)
            .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission')
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.equal(response.owner, submission.owner);

              // Update the submission data.
              tempSubmissions.push(response);

              done();
            });
        });

        it('An Anonymous User should be able to update the owner of a submission, with _all permissions', function(done) {
          var doc = {data: temp.data, owner: testProject.owner._id};

          request(app)
            .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + temp._id)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the __v property for comparisons.
              response = _.omit(response, '__v');
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the temp owner for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(_.omit(temp, '__v'), 'modified'));

              done();
            });
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the Submissions created for Ownership Checks', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/submission/' + submission._id)
              .set('x-jwt-token', testProject.owner.token)
              .expect(204)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.text;
                assert.deepEqual(response, '');

                // Store the JWT for future API calls.
                testProject.owner.token = res.headers['x-jwt-token'];
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function(done) {
        it('Delete the Form created for Ownership Checks', function(done) {
          request(app)
            .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
            .set('x-jwt-token', testProject.owner.token)
            .expect(204)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.text;
              assert.deepEqual(response, '');
              tempForm = response;

              // Store the JWT for future API calls.
              testProject.owner.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });
  });
});

// @TODO: Decouple these tests with bootstrapProjectForms middleware.
describe('User-Created Project Permissions (Continued)', function() {
  describe('Project Creation', function() {
    describe('Permissions - Project Level - Authenticated User', function() {
      // @TODO: Fix Project creation for users of user-created Projects.
      //it('A User-Created Projects Authenticated User should not be able to Create an Project', function(done) {
      //  request(app)
      //    .post('/project')
      //    .set('x-jwt-token', testProject.user1.token)
      //    .send({foo: 'bar'})
      //    .expect('Content-Type', /text\/plain/)
      //    .expect(401)
      //    .end(function(err, res) {
      //      if (err) {
      //        return done(err);
      //      }
      //
      //      var response = res.text;
      //      assert.equal(response, 'Unauthorized');
      //
      //      // Store the JWT for future API calls.
      //      testProject.user1.token = res.headers['x-jwt-token'];
      //
      //      done();
      //    });
      //});

      it('A User-Created Projects Authenticated User should not be able to Read an Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect(401)
          .expect('Content-Type', /text\/plain/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update an Project without permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id)
          .set('x-jwt-token', testProject.user1.token)
          .send({foo: 'bar'})
          .expect(401)
          .expect('Content-Type', /text\/plain/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should be able to Read the Index of Projects that they own', function(done) {
        request(app)
          .get('/project')
          .set('x-jwt-token', testProject.user1.token)
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete an Project without permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect(401)
          .expect('Content-Type', /text\/plain/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Role Creation', function() {
    // Store the temp role for this test suite.
    var tempRole = {
      title: 'Dummy',
      description: 'A Dummy role'
    };

    // Before this suite runs, attach the test Project's id to the payload.
    before(function() {
      tempRole.project = testProject.project._id;
    });

    describe('Permissions - Project Level - Authenticated User', function() {
      it('A User-Created Projects Authenticated User should not be able to Create a Role for a Project without permission', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/role')
          .set('x-jwt-token', testProject.user1.token)
          .send(tempRole)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read a Role for a Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/role/' + testProject.roleAuthenticated._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update a Role for a Project without permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id + '/role/' + testProject.roleAuthenticated._id)
          .set('x-jwt-token', testProject.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Roles for a Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/role')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete a Role for a Project without permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/role/' + testProject.roleAuthenticated._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Form Creation', function() {
    // Store the owners form for this test suite.
    var ownerForm = {
      title: 'ownerForm',
      name: 'ownerForm',
      path: 'owner/form',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: []
    };

    // Store the authenticated form for this test suite.
    var adminForm = {
      title: 'adminForm',
      name: 'adminForm',
      path: 'admin/form',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: []
    };

    // Before this suite runs, attach the test Project's id to the payload.
    before(function() {
      ownerForm.project = testProject.project._id;
      adminForm.project = testProject.project._id;
    });

    describe('Bootstrap', function() {
      it('Create a Form for Permission checks', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.owner.token)
          .send(ownerForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
            assert.equal(response.title, ownerForm.title);
            assert.equal(response.name, ownerForm.name);
            assert.equal(response.path, ownerForm.path);
            assert.equal(response.type, ownerForm.type);
            assert.equal(response.project, ownerForm.project);
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
            assert.deepEqual(response.submissionAccess, ownerForm.submissionAccess);
            assert.deepEqual(response.components, ownerForm.components);
            ownerForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Form Level - Authenticated User', function() {
      it('A User-Created Projects Authenticated User should not be able to Create a Form for a Project without permission', function(done) {
        var tempForm = {
          title: 'tempForm',
          name: 'tempForm',
          path: 'temp/form',
          type: 'form',
          access: [],
          submissionAccess: [],
          components: []
        };

        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.user1.token)
          .send(tempForm)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should be able to Read a Form for a Project with permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + ownerForm._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, ownerForm);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update a Form for a Project without permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id + '/form/' + ownerForm._id)
          .set('x-jwt-token', testProject.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Forms for a Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Forms for a Project without permission using the Form type filter', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form?type=form')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete a Form for a Project without permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + ownerForm._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should be able to Read a Form for a Project with permission using the Form alias', function(done) {
        request(app)
          .get('/' + ownerForm.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, ownerForm);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update a Form for a Project without permission using the Form alias', function(done) {
        request(app)
          .put('/' + ownerForm.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Forms for a Project without permission using the Form alias', function(done) {
        request(app)
          .get('/')
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete a Form for a Project without permission using the Form alias', function(done) {
        request(app)
          .delete('/' + ownerForm.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Form Level - Administrative User', function() {
      it('A User-Created Projects Administrative User should be able to Create a Form for a Project with permission', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.admin1.token)
          .send(adminForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.
            adminForm = response;

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Read a Form for a Project with permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + adminForm._id)
          .set('x-jwt-token', testProject.admin1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Update a Form for a Project with permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id + '/form/' + adminForm._id)
          .set('x-jwt-token', testProject.admin1.token)
          .send({title: 'adminForm1'})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Read the Index of Forms for a Project with permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.admin1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Read the Index of Forms for a Project with permission using the Form type filter', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form?type=form')
          .set('x-jwt-token', testProject.admin1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Read a Form for a Project with permission using the Form alias', function(done) {
        request(app)
          .get('/' + adminForm.path)
          .set('x-jwt-token', testProject.admin1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Update a Form for a Project with permission using the Form alias', function(done) {
        request(app)
          .put('/' + adminForm.path)
          .set('x-jwt-token', testProject.admin1.token)
          .set('host', testProject.project.name + '.localhost')
          .send({foo: 'bar'})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Read the Index of Forms for a Project with permission using the Form alias', function(done) {
        request(app)
          .get('/')
          .set('x-jwt-token', testProject.admin1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Administrative User should be able to Delete a Form for a Project with permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + adminForm._id)
          .set('x-jwt-token', testProject.admin1.token)
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            // @TODO: finish response validation.

            // Store the JWT for future API calls.
            testProject.admin1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form Normalization', function(done) {
      it('Delete the Owner Form created for Access Checks', function(done) {
        request(app)
          .delete('/' + ownerForm.path)
          .set('x-jwt-token', testProject.owner.token)
          .set('host', testProject.project.name + '.localhost')
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.deepEqual(response, '');
            ownerForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Resource Creation', function() {
    // Store the temp resource for this test suite.
    var tempResource = {
      title: 'tempResource',
      name: 'tempResource',
      path: 'temp',
      type: 'resource',
      access: [],
      submissionAccess: [],
      components: [
        {
          type: 'textfield',
          validate: {
            custom: '',
            pattern: '',
            maxLength: '',
            minLength: '',
            required: false
          },
          defaultValue: '',
          multiple: false,
          suffix: '',
          prefix: '',
          placeholder: 'foo',
          key: 'foo',
          label: 'foo',
          inputMask: '',
          inputType: 'text',
          input: true
        }
      ]
    };

    // Store the owners resource for this test suite.
    var ownerResource = {};

    // Before the suite runs, attach the test Project's id to the payload.
    before(function() {
      tempResource.project = testProject.project._id;
    });

    describe('Bootstrap', function() {
      it('Create a Resource for Permission checks', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.owner.token)
          .send(tempResource)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
            assert.equal(response.title, tempResource.title);
            assert.equal(response.name, tempResource.name);
            assert.equal(response.path, tempResource.path);
            assert.equal(response.type, 'resource');
            assert.equal(response.project, tempResource.project);
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, tempResource.components);
            ownerResource = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Resource Level - Authenticated User', function() {
      it('A User-Created Projects Authenticated User should not be able to Create a Resource for a Project without permission', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.user1.token)
          .send(tempResource)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should be able to Read a Resource for a Project with permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + ownerResource._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, ownerResource);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update a Resource for a Project without permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id + '/form/' + ownerResource._id)
          .set('x-jwt-token', testProject.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Resources for a Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Resources for a Project without permission using the Form type filter', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form?type=form')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete a Resource for a Project without permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/role/' + ownerResource._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should be able to Read a Resource for a Project permission using the Form alias', function(done) {
        request(app)
          .get('/' + ownerResource.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, ownerResource);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Update a Resource for a Project without permission using the Form alias', function(done) {
        request(app)
          .put('/' + ownerResource.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Read the Index of Resources for a Project without permission using the Form alias', function(done) {
        request(app)
          .get('/')
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A User-Created Projects Authenticated User should not be able to Delete a Resource for a Project without permission using the Form alias', function(done) {
        request(app)
          .delete('/' + ownerResource.path)
          .set('x-jwt-token', testProject.user1.token)
          .set('host', testProject.project.name + '.localhost')
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Resource Normalization', function(done) {
      it('Delete the Resource created for Access Checks', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + ownerResource._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.deepEqual(response, '');
            ownerResource = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Action Creation', function() {
    // Store the temp form for this test suite.
    var tempForm = {
      title: 'Temp Form',
      name: 'tempForm',
      path: 'temp',
      type: 'form',
      access: [],
      submissionAccess: [],
      components: [
        {
          type: 'textfield',
          validate: {
            custom: '',
            pattern: '',
            maxLength: '',
            minLength: '',
            required: false
          },
          defaultValue: '',
          multiple: false,
          suffix: '',
          prefix: '',
          placeholder: 'foo',
          key: 'foo',
          label: 'foo',
          inputMask: '',
          inputType: 'text',
          input: true
        }
      ]
    };

    // Store the temp action for this test suite.
    var tempAction = {
      title: 'Authentication',
      name: 'auth',
      handler: ['before'],
      method: ['create'],
      priority: 0,
      settings: {
        association: 'existing',
        username: 'user.username',
        password: 'user.password'
      }
    };
    var ownerAction = {};

    // Before this suite runs, attach the test Project's id to the payload.
    before(function() {
      tempForm.project = testProject.project._id;
    });

    describe('Bootstrap', function() {
      it('Create a Form for Permission checks', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form')
          .set('x-jwt-token', testProject.owner.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.project, tempForm.project);
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAnonymous._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAuthenticated._id), -1);
            assert.notEqual(response.access[0].roles.indexOf(testProject.roleAdministrator._id), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, tempForm.components);
            tempForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create an Action for Permission checks', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
          .set('x-jwt-token', testProject.owner.token)
          .send(tempAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, tempAction.title);
            assert.equal(response.name, tempAction.name);
            assert.deepEqual(response.handler, tempAction.handler);
            assert.deepEqual(response.method, tempAction.method);
            assert.equal(response.priority, tempAction.priority);
            assert.deepEqual(response.settings, tempAction.settings);
            assert.equal(response.form, tempForm._id);
            ownerAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Project Level - Authenticated User', function() {
      it('An Authenticated user should not be able to Create an Action for a Project without permission', function(done) {
        request(app)
          .post('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
          .set('x-jwt-token', testProject.user1.token)
          .send(tempAction)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Authenticated user should not be able to Read an Action for a Project with permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + ownerAction._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, ownerAction);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Authenticated user should not be able to Update an Action for a Project without permission', function(done) {
        request(app)
          .put('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + ownerAction._id)
          .set('x-jwt-token', testProject.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Authenticated user should not be able to Read the Index of Actions for a Project without permission', function(done) {
        request(app)
          .get('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action')
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, [ownerAction]);

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Authenticated user should be able to Delete an Action for a Project with permission', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + ownerAction._id)
          .set('x-jwt-token', testProject.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Unauthorized');

            // Store the JWT for future API calls.
            testProject.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Action Normalization', function() {
      it('Delete the Action created for Access Checks', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + tempForm._id + '/action/' + ownerAction._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.deepEqual(response, '');
            tempAction = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form Normalization', function(done) {
      it('Delete the Form created for Access Checks', function(done) {
        request(app)
          .delete('/project/' + testProject.project._id + '/form/' + tempForm._id)
          .set('x-jwt-token', testProject.owner.token)
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.deepEqual(response, '');
            tempForm = response;

            // Store the JWT for future API calls.
            testProject.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Project Normalization', function(done) {
    it('Delete the Project created for Access Checks', function(done) {
      request(app)
        .delete('/project/' + testProject.project._id)
        .set('x-jwt-token', testProject.owner.token)
        .expect(204)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.text;
          assert.deepEqual(response, '');
          testProject.project = response;

          // Store the JWT for future API calls.
          testProject.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
});

