'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');

module.exports = function(app, template, hook) {
  if (!app.formio) return;

  describe('Teams', function() {
    it('A Formio User should be able to access the Team Form', function(done) {
      request(app)
        .get('/project/' + template.project._id + '/form/' + template.formio.formTeam._id)
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
      done();
    });

    it('The Team Owners token should contain the Team _id in the roles list', function(done) {
      done();
    });

    it('The Team owner should be able to add a Formio user to their Team', function(done) {
      done();
    });

    it('A Team member should not be able to add another user to the Team', function(done) {
      done();
    });

    it('A Team member should not be able to update the Team', function(done) {
      done();
    });

    it('A Team member should not be able to delete the Team', function(done) {
      done();
    });

    it('A Team member should be able to remove themselves from the Team', function(done) {
      done();
    });
  });
};
