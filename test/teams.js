'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var chance = new (require('chance'))();

module.exports = function(app, template, hook) {
  describe('Teams', function() {
    // Cannot run these tests without access to formio instance
    if (!app.formio) {
      return;
    }

    describe('Single Team Tests', function() {
      it('A Formio User should be able to access the Team Form', function(done) {
        request(app)
          .get('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Formio User should be able to create a Team', function(done) {
        request(app)
          .post('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send({
            data: {
              name: 'test',
              members: []
            }
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            // Store the team reference for later.
            template.team1 = res.body;

            done();
          });
      });

      it('The Team Owner should be able to add a Formio user to their Team', function(done) {
        request(app)
          .put('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team1._id)
          .set('x-jwt-token', template.formio.owner.token)
          .send({
            data: {
              members: [
                {_id: template.users.user1._id}
              ]
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.data.members.length, 1);
            assert.equal(response.data.members[0]._id, template.users.user1._id);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            // Update the team reference for later.
            template.team1 = response;

            done();
          });
      });

      it('A Team member should not be able to update the Team', function(done) {
        request(app)
          .put('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team1._id)
          .set('x-jwt-token', template.users.user1.token)
          .send({
            data: {
              members: [
                {_id: template.users.user1._id},
                {_id: template.users.user2._id}
              ]
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member should not be able to delete the Team', function(done) {
        request(app)
          .delete('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team1._id)
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should not be able to add a Team they own to their project, if its not on a team plan', function(done) {
        var teamAccess = {type: 'team_read', roles: [template.team1._id]};

        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: oldResponse.access.concat(teamAccess) })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                // Confirm that the team role was not added to the projects permissions.
                var response = res.body;
                var found = false;
                response.access.forEach(function(permission) {
                  if(permission.type === 'team_read') {
                    found = true;
                    assert.equal(permission.roles.length, 0);
                  }
                });
                assert.equal(found, true);

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });

      it('Upgrade the project to a team project plan', function(done) {
        app.formio.resources.project.model.findOne({_id: template.project._id, deleted: {$eq: null}}, function(err, project) {
          if(err) {
            return done(err);
          }

          project.plan = 'team1';
          project.save(function(err) {
            if(err) {
              return done(err);
            }

            // Update the template version of the project.
            request(app)
              .get('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                // Update the project.
                var response = res.body;
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      it('A Project Owner should be able to add a Team they own to their project, if its on a team plan', function(done) {
        var teamAccess = {type: 'team_read', roles: [template.team1._id]};

        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: oldResponse.access.concat(teamAccess) })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                // Confirm that the team role was not added to the projects permissions.
                var response = res.body;
                var found = false;
                response.access.forEach(function(element) {
                  if(element.type === 'team_read') {
                    found = true;
                    assert.notEqual(template.team1._id, null);
                    assert.notEqual(template.team1._id, '');
                    assert.deepEqual(element, teamAccess);
                  }
                });
                assert.equal(found, true);

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });

      it('A Team member should be able to remove themselves from the Team', function(done) {
        request(app)
          .post('/team/' + template.team1._id + '/leave')
          .set('x-jwt-token', template.users.user1.token)
          .send()
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('The Team should not have any members, after the final user leaves.', function(done) {
        request(app)
          .get('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team1._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.data.members.length, 0);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            // Update the team reference for later.
            template.team1 = response;

            done();
          });
      });

      it('A Project Owner should be able to remove a team from their project', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;
            var oldAccess = _.clone(oldResponse.access);
            var newAccess = _.filter(oldAccess, function(permission) {
              if (permission.type && !_.startsWith(permission.type, 'team_')) {
                return permission;
              }
            });

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: newAccess })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.notEqual(oldAccess.length, newAccess.length);
                assert.equal(oldAccess.length, (newAccess.length + 1));

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });
    });

    describe('Multi Team Tests', function() {
      it('Register another Formio User', function(done) {
        request(app)
          .post('/project/' + template.formio.project._id + '/form/' + template.formio.formRegister._id + '/submission')
          .send({
            data: {
              'user.name': chance.name(),
              'user.email': chance.email(),
              'user.password': 'test123'
            }
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;

            // Update our testProject.owners data.
            var tempPassword = 'test123';
            template.formio.user1 = response;
            template.formio.user1.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create another project', function(done) {
        request(app)
          .post('/project')
          .send({
            title: chance.word(),
            description: chance.sentence()
          })
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            template.project2 = response;

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create another Team', function(done) {
        request(app)
          .post('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission')
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              name: 'test2',
              members: []
            }
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Store the team reference for later.
            template.team2 = response;

            done();
          });
      });

      it('A Team Owner should not be able to edit a team they do not own', function(done) {
        request(app)
          .put('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team2._id)
          .set('x-jwt-token', template.formio.owner.token)
          .send({
            data: {
              members: [template.formio.owner.token]
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team Owner should not be able to delete a team they do not own', function(done) {
        request(app)
          .delete('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team2._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should not be able to add a Team they do not own to their project', function(done) {
        var teamAccess = {type: 'team_read', roles: [template.team2._id]};

        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;
            oldResponse.access.push(teamAccess);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: oldResponse.access })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var proj = _.clone(template.project);
                proj.access.push({type: 'team_read', roles: []});

                // Confirm that the project wasnt modified.
                var response = res.body;
                assert.deepEqual(_.omit(proj, 'modified'), _.omit(response, 'modified'));
                template.projet = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });

      it('A Team Owner should not be able to add their Team to a project they do not own', function(done) {
        var teamAccess = {type: 'team_read', roles: [template.team2._id]};

        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({ access: [teamAccess] })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    var testForm = null;
    var testSubmission = null;
    describe('Permissions test bootstrap', function() {
      it('Add a member to the test team', function(done) {
        // Add a member to the team for the permission tests.
        request(app)
          .put('/project/' + template.formio.project._id + '/form/' + template.formio.teamResource._id + '/submission/' + template.team1._id)
          .set('x-jwt-token', template.formio.owner.token)
          .send({
            data: {
              members: [
                {_id: template.formio.user1._id}
              ]
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.data.members.length, 1);
            assert.equal(response.data.members[0]._id, template.formio.user1._id);

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            // Update the team reference for later.
            template.team1 = response;

            done();
          });
      });

      it('Create a test form', function(done) {
        var tempForm = {
          title: 'Temp2 Form',
          name: 'temp2Form',
          path: 'temp2/tempform',
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

        request(app)
          .post('/project/' + template.project._id + '/form')
          .set('x-jwt-token', template.formio.owner.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            testForm = response;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create a test submission', function(done) {
        request(app)
          .post('/project/' + template.project._id + '/form/' + testForm._id + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send({
            data: {
              foo: 'bar'
            }
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            testSubmission = response;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - team_read', function() {
      // Bootstrap
      it('A Project Owner should be able to add one of their teams to have access with the team_read permission', function(done) {
        var teamAccess = {type: 'team_read', roles: [template.team1._id]};

        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: oldResponse.access.concat(teamAccess) })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var found = false;
                var response = res.body;
                response.access.forEach(function(element) {
                  if (element.type === 'team_read') {
                    found = true;
                    assert.notEqual(template.team1._id, null);
                    assert.notEqual(template.team1._id, '');
                    assert.deepEqual(element, teamAccess);
                  }
                });

                assert.equal(found, true);

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });

      // Project tests
      it('A Team member with team_read, should not be able to create a project role', function(done) {
        request(app)
          .post('/project/' + template.project._id + '/role')
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            title: chance.word(),
            description: chance.sentence()
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should be able to read the project data', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit('modified', template.project), _.omit('modified', response));

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to read the project settings data', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('settings'), false);

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to update the project settings data', function(done) {
        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            settings: {
              foo: 'bar'
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to delete the project', function(done) {
        request(app)
          .delete('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // Form tests
      it('A Team member with team_read, should not be able to create a form', function(done) {
        var tempForm = {
          title: 'Temp2 Form',
          name: 'temp2Form',
          path: 'temp2/tempform',
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

        request(app)
          .post('/project/' + template.project._id + '/form')
          .set('x-jwt-token', template.formio.user1.token)
          .send(tempForm)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should be able to read any form', function(done) {
        request(app)
          .get('/project/' + template.project._id + '/form/' + testForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to update a form', function(done) {
        request(app)
          .put('/project/' + template.project._id + '/form/' + testForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              components: []
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to delete a form', function(done) {
        request(app)
          .delete('/project/' + template.project._id + '/form/' + testForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // Submission tests
      it('A Team member with team_read, should not be able to create a submission', function(done) {
        request(app)
          .post('/project/' + template.project._id + '/form/' + testForm._id + '/submission')
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              foo: 'bar2'
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should be able to read a submission', function(done) {
        request(app)
          .get('/project/' + template.project._id + '/form/' + testForm._id + '/submission/' + testSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              foo: 'bar2'
            }
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to update a submission', function(done) {
        request(app)
          .put('/project/' + template.project._id + '/form/' + testForm._id + '/submission/' + testSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              foo: 'updated'
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_read, should not be able to delete a submission', function(done) {
        request(app)
          .delete('/project/' + template.project._id + '/form/' + testForm._id + '/submission/' + testSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // Normalization
      it('A Project Owner should be able to remove any team with access to the project', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;
            var oldAccess = _.clone(oldResponse.access);
            var newAccess = _.filter(oldAccess, function(permission) {
              if (permission.type && !_.startsWith(permission.type, 'team_')) {
                return permission;
              }
            });

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: newAccess })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.notEqual(oldAccess.length, newAccess.length);
                assert.equal(oldAccess.length, (newAccess.length + 1));

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });
    });

    describe('Permissions - team_write', function() {
      // Bootstrap
      it('A Project Owner should be able to add one of their teams to have access with the team_read permission', function(done) {
        var teamAccess = {type: 'team_write', roles: [template.team1._id]};

        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: oldResponse.access.concat(teamAccess) })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var found = false;
                var response = res.body;
                response.access.forEach(function(element) {
                  if (element.type === 'team_write') {
                    found = true;
                    assert.notEqual(template.team1._id, null);
                    assert.notEqual(template.team1._id, '');
                    assert.deepEqual(element, teamAccess);
                  }
                });

                assert.equal(found, true);

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });

      // Project tests
      it('A Team member with team_write, should be able to create a project role', function(done) {
        request(app)
          .post('/project/' + template.project._id + '/role')
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            title: chance.word(),
            description: chance.sentence()
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_write, should be able to read the project data', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit('modified', template.project), _.omit('modified', response));

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_write, should not be able to read the project settings data', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('settings'), false);

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_write, should not be able to update the project settings data', function(done) {
        var temp = {
          settings: {
            foo: 'bar'
          }
        };

        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send(temp)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.hasOwnProperty('settings'), false);

            app.formio.resources.project.model.findOne({_id: template.project._id}, function(err, project) {
              if(err) {
                return done(err);
              }

              // Confirm that the settings were not changed.
              assert.notDeepEqual(project.settings, temp.settings);

              // Store the JWT for future API calls.
              template.formio.user1.token = res.headers['x-jwt-token'];

              done();
            });
          });
      });

      it('A Team member with team_write, should be able to update the project data', function(done) {
        request(app)
          .put('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            description: chance.sentence()
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Update the template project.
            template.project = response;

            done();
          });
      });

      it('A Team member with team_write, should not be able to delete the project', function(done) {
        request(app)
          .delete('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // Form tests
      var tempForm = null;
      it('A Team member with team_write, should be able to create a form', function(done) {
        tempForm = {
          title: chance.word(),
          name: chance.word(),
          path: chance.word(),
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

        request(app)
          .post('/project/' + template.project._id + '/form')
          .set('x-jwt-token', template.formio.user1.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Update the temp form.
            tempForm = response;

            done();
          });
      });

      it('A Team member with team_write, should be able to read a form', function(done) {
        request(app)
          .get('/project/' + template.project._id + '/form/' + tempForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, tempForm);

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Update the temp form.
            tempForm = response;

            done();
          });
      });

      it('A Team member with team_write, should be able to update a form', function(done) {
        tempForm.title = chance.word();

        request(app)
          .put('/project/' + template.project._id + '/form/' + tempForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            title: tempForm.title
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, 'modified'), _.omit(tempForm, 'modified'));

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Update the temp form.
            tempForm = response;

            done();
          });
      });

      // Submission tests
      it('A Team member with team_write, should not be able to create a submission', function(done) {
        request(app)
          .post('/project/' + template.project._id + '/form/' + tempForm._id + '/submission')
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              foo: chance.word()
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      var tempSubmission = null;
      it('Bootstrap a submission for tests', function(done) {
        tempSubmission = {
          data: {
            foo: chance.word()
          }
        };

        request(app)
          .post('/project/' + template.project._id + '/form/' + tempForm._id + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send(tempSubmission)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            tempSubmission = response;

            done();
          });
      });

      it('A Team member with team_write, should not be able to read a submission', function(done) {
        request(app)
          .get('/project/' + template.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_write, should not be able to update a submission', function(done) {
        request(app)
          .put('/project/' + template.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            data: {
              foo: chance.sentence()
            }
          })
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Team member with team_write, should not be able to delete a submission', function(done) {
        request(app)
          .delete('/project/' + template.project._id + '/form/' + tempForm._id + '/submission/' + tempSubmission._id)
          .set('x-jwt-token', template.formio.user1.token)
          .expect('Content-Type', /text/)
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // Final Form test
      it('A Team member with team_write, should be able to delete a form', function(done) {
        request(app)
          .put('/project/' + template.project._id + '/form/' + tempForm._id)
          .set('x-jwt-token', template.formio.user1.token)
          .send({
            title: tempForm.title
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, 'modified'), _.omit(tempForm, 'modified'));

            // Store the JWT for future API calls.
            template.formio.user1.token = res.headers['x-jwt-token'];

            // Update the temp form.
            tempForm = response;

            done();
          });
      });

      // Normalization
      it('A Project Owner should be able to remove any team with access to the project', function(done) {
        request(app)
          .get('/project/' + template.project._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Update the users project access with the new team.
            var oldResponse = res.body;
            var oldAccess = _.clone(oldResponse.access);
            var newAccess = _.filter(oldAccess, function(permission) {
              if (permission.type && !_.startsWith(permission.type, 'team_')) {
                return permission;
              }
            });

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            request(app)
              .put('/project/' + template.project._id)
              .set('x-jwt-token', template.formio.owner.token)
              .send({ access: newAccess })
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.notEqual(oldAccess.length, newAccess.length);
                assert.equal(oldAccess.length, (newAccess.length + 1));

                // Update the project.
                template.project = response;

                // Store the JWT for future API calls.
                template.formio.owner.token = res.headers['x-jwt-token'];

                done();
              });
          });
      });
    });

    describe('Permissions - team_admin', function() {
      // Project tests
      it('A Team member with team_admin, should be able to create a project role', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to read the project data', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to read the project settings data', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to update the project settings data', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to update the project data', function(done) {
        done();
      });

      it('A Team member with team_admin, should not be able to delete the project', function(done) {
        done();
      });

      // Form tests
      it('A Team member with team_admin, should be able to create a form', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to read a form', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to update a form', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to delete a form', function(done) {
        done();
      });

      // Submission tests
      it('A Team member with team_admin, should be able to create a submission', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to read a submission', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to update a submission', function(done) {
        done();
      });

      it('A Team member with team_admin, should be able to delete a submission', function(done) {
        done();
      });
    });

    describe('Resource normalization', function() {
      it('Delete a test submission', function(done) {
        request(app)
          .delete('/project/' + template.project._id + '/form/' + testForm._id + '/submission/' + testSubmission._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            testSubmission = null;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Delete the test form', function(done) {
        request(app)
          .delete('/project/' + template.project._id + '/form/' + testForm._id)
          .set('x-jwt-token', template.formio.owner.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            testForm = null;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });
};
