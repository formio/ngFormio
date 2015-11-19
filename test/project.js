'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var moment = require('moment');
var async = require('async');
var chance = new (require('chance'))();
var uuidRegex = /^([a-z]{15})$/;

module.exports = function(app, template, hook) {
  /**
   * Helper function to confirm the given properties are not present.
   */
  var not = function(item, properties) {
    if (!item || !properties) {
      return;
    }
    if (!(properties instanceof Array)) {
      return;
    }

    var list = [].concat(item);
    list.forEach(function(i) {
      for(var a = 0; a < properties.length; a++) {
        assert.equal(i.hasOwnProperty(properties[a].toString()), false);
      }
    });
  };

  describe('Projects', function() {
    var tempProject = {
      title: chance.word(),
      description: chance.sentence(),
      template: _.omit(_.omit(template, 'users'), 'formio')
    };
    var originalProject = _.cloneDeep(tempProject, true);

    // Update the template with current data for future tests.
    var mapProjectToTemplate = function(project, template, callback) {
      var mapActions = function(forms, cb) {
        var form = null;
        for (var a = 0; a < forms.length || 0; a++) {
          form = forms[a];

          request(app)
            .get('/project/' + template.project._id + '/form/' + form._id + '/actions?limit=9999')
            .set('x-jwt-token', template.formio.owner.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) return cb(err);

              // Update the JWT for future API calls.
              template.formio.owner.token = res.headers['x-jwt-token'];

              res.body.forEach(function(action) {
                template.actions[form.name] = template.actions[form.name] || {};
                template.actions[form.name] = action;
              });
            });
        }

        cb();
      };

      var mapForms = function(cb) {
        request(app)
          .get('/project/' + template.project._id + '/form?limit=9999')
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) return cb(err);

            // Update the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            res.body.forEach(function(form) {
              template[form.type + 's'][form.name] = template[form.type + 's'][form.name] || {};
              template[form.type + 's'][form.name] = form;
            });
            mapActions(res.body, cb);
          });
      };

      var mapRoles = function(cb) {
        request(app)
          .get('/project/' + template.project._id + '/role?limit=9999')
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) return cb(err);

            // Update the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            res.body.forEach(function(role) {
              template.roles[role.title.toLowerCase()] = template.roles[role.title.toLowerCase()] || {};
              template.roles[role.title.toLowerCase()] = role;
            });
            cb();
          });
      };

      async.series([
        mapForms,
        mapRoles
      ], function(err) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    };

    it('A Form.io User should be able to create a project from a template', function(done) {
      request(app)
        .post('/project')
        .send(tempProject)
        .set('x-jwt-token', template.formio.owner.token)
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
          assert.equal(response.hasOwnProperty('name'), true);
          assert.notEqual(response.name.search(uuidRegex), -1);
          assert.equal(response.description, tempProject.description);

          // Check plan and api calls info
          if (app.formio) {
            var plan = process.env.PROJECT_PLAN;
            assert.equal(response.plan, plan, 'The plan should match the default new project plan.');
            assert.deepEqual(response.apiCalls, {
              used: 0,
              remaining: app.formio.plans.limits[response.plan],
              limit: app.formio.plans.limits[response.plan],
              reset: moment().startOf('month').add(1, 'month').toISOString()
            });
          }


          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted', 'primary']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          mapProjectToTemplate(response._id, template, done);
        });
    });

    it('A Form.io User should be able to Read their Project', function(done) {
      request(app)
        .get('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
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
          assert.equal(response.name, template.project.name);
          assert.equal(response.description, template.project.description);

          // Check plan and api calls info
          if (app.formio) {
            var plan = process.env.PROJECT_PLAN;
            assert.equal(response.plan, plan, 'The plan should match the default new project plan.');
            assert.deepEqual(response.apiCalls, {
              used: 0,
              remaining: app.formio.plans.limits[response.plan],
              limit: app.formio.plans.limits[response.plan],
              reset: moment().startOf('month').add(1, 'month').toISOString()
            });
          }

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted', 'primary', 'machineName']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Update their Project', function(done) {
      var newDescription = 'An updated Project Description.';

      request(app)
        .put('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
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
          assert.equal(response.name, template.project.name);
          assert.equal(response.description, newDescription);

          // Check plan and api calls info
          if (app.formio) {
            var plan = process.env.PROJECT_PLAN;
            assert.equal(response.plan, plan, 'The plan should match the default new project plan.');
            assert.deepEqual(response.apiCalls, {
              used: 0,
              remaining: app.formio.plans.limits[response.plan],
              limit: app.formio.plans.limits[response.plan],
              reset: moment().startOf('month').add(1, 'month').toISOString()
            });
          }

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to update the settings of their Project', function(done) {
      var newSettings = {cors: '*', email: {gmail: {auth: {user: 'test@example.com', pass: 'test123'}}}};

      request(app)
        .put('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
        .send({settings: newSettings})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.hasOwnProperty('settings'), true);
          assert.deepEqual(response.settings, newSettings);

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Read the Index of their User-Created Projects', function(done) {
      request(app)
        .get('/project?limit=9999')
        .set('x-jwt-token', template.formio.owner.token)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.length, 1);
          assert.equal(response[0].name, template.project.name);

          // Check plan and api calls info
          if (app.formio) {
            var plan = process.env.PROJECT_PLAN;
            assert.equal(response[0].plan, plan, 'The plan should match the default new project plan.');
            assert.deepEqual(response[0].apiCalls, {
              used: 0,
              remaining: app.formio.plans.limits[response[0].plan],
              limit: app.formio.plans.limits[response[0].plan],
              reset: moment().startOf('month').add(1, 'month').toISOString()
            });
          }

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted']);

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('An Anonymous User should not be able to Create a Project', function(done) {
      request(app)
        .post('/project')
        .send(tempProject)
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
        .get('/project/' + template.project._id)
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
        .put('/project/' + template.project._id)
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
        .delete('/project/' + template.project._id)
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

    it('Updating a Project with duplicate permission types will condense the access permissions', function(done) {
      var newAccess = _.clone(template.project.access);
      newAccess.push({
        type: 'read_all',
        roles: [template.project.defaultAccess]
      });

      request(app)
        .put('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
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
          assert.equal(response.name, template.project.name);
          assert.equal(response.description, template.project.description);

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to Delete their Project without explicit permissions', function(done) {
      request(app)
        .delete('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.deepEqual(response, {});

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Deleted Project should still remain in the Database', function(done) {
      if (!app.formio) return done();

      app.formio.resources.project.model.find({project: template.project._id, deleted: {$eq: null}})
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          if (results.length === 0) {
            done();
          }
          else {
            done(new Error('Expected zero results, got ' + results.length));
          }
        });
    });

    it('A Deleted Project should not have any active Forms', function(done) {
      if (!app.formio) return done();

      app.formio.resources.form.model.find({project: template.project._id, deleted: {$eq: null}})
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          if (results.length === 0) {
            done();
          }
          else {
            done(new Error('Expected zero results, got ' + results.length));
          }
        });
    });

    it('A Deleted Project should not have any active Roles', function(done) {
      if (!app.formio) return done();

      app.formio.resources.role.model.find({project: template.project._id, deleted: {$eq: null}})
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          if (results.length === 0) {
            done();
          }
          else {
            done(new Error('Expected zero results, got ' + results.length));
          }
        });
    });

    it('Recreate the user Project for later tests', function(done) {
      request(app)
        .post('/project')
        .set('x-jwt-token', template.formio.owner.token)
        .send(originalProject)
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
          assert.equal(response.hasOwnProperty('name'), true);
          assert.notEqual(response.name.search(uuidRegex), -1);
          assert.equal(response.description, originalProject.description);

          // Check that the response does not contain these properties.
          not(response, ['__v', 'deleted', 'settings_encrypted', 'primary', 'machineName']);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          mapProjectToTemplate(response._id, template, done);
        });
    });
  });

  describe('Project Plans', function() {
    describe('Community Plan', function() {
      it('Confirm the project is on the community plan', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('plan'), true);
            assert.equal(response.plan, 'community');

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project on the community plan will have a uuid generated name on creation', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('name'), true);
            assert.notEqual(response.name.search(uuidRegex), -1);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project on the community plan should not be able to change the uuid generated name on project update', function(done) {
        var attempt = chance.word({length: 10});

        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .send({name: attempt})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('name'), true);
            assert.equal(response.name, template.project.name);
            assert.notEqual(response.name.search(uuidRegex), -1);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project on the community plan will not be able to set cors options on creation', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('settings'), true);
            assert.equal(response.settings.hasOwnProperty('cors'), true);
            assert.equal(response.settings.cors, '*');

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project on the community plan will not be able to set cors options on project update', function(done) {
        var attempt = '*,www.example.com';

        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .send({settings: {cors: attempt}})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('settings'), true);
            assert.equal(response.settings.hasOwnProperty('cors'), true);
            assert.equal(response.settings.cors, '*');

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });
};
