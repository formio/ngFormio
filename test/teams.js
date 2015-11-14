'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');

module.exports = function(app, template, hook) {
  describe('Teams', function() {
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

    it('The Team Owners token should contain the Team _id in the roles list', function(done) {
      done();
    });

    it('The Team owner should be able to add a Formio user to their Team', function(done) {
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

    describe('Permissions - team_read', function() {
      // Project tests
      it('A Team member with team_read, should not be able to create a project role', function(done) {
        done();
      });

      it('A Team member with team_read, should be able to read the project data', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to read the project settings data', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to update the project settings data', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to delete the project', function(done) {
        done();
      });

      // Form tests
      it('A Team member with team_read, should not be able to create a form', function(done) {
        done();
      });

      it('A Team member with team_read, should be able to read any form', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to update any', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to delete a form', function(done) {
        done();
      });

      // Submission tests
      it('A Team member with team_read, should not be able to create a submission', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to read a submission', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to update a submission', function(done) {
        done();
      });

      it('A Team member with team_read, should not be able to delete a submission', function(done) {
        done();
      });
    });

    describe('Permissions - team_write', function() {
      // Project tests
      it('A Team member with team_write, should be able to create a project role', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to read the project data', function(done) {
        done();
      });

      it('A Team member with team_write, should not be able to read the project settings data', function(done) {
        done();
      });

      it('A Team member with team_write, should not be able to update the project settings data', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to update the project data', function(done) {
        done();
      });

      it('A Team member with team_write, should not be able to delete the project', function(done) {
        done();
      });

      // Form tests
      it('A Team member with team_write, should be able to create a form', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to read a form', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to update a form', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to delete a form', function(done) {
        done();
      });

      // Submission tests
      it('A Team member with team_write, should not be able to create a submission', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to read a submission', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to update a submission', function(done) {
        done();
      });

      it('A Team member with team_write, should be able to delete a submission', function(done) {
        done();
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
  });
};
