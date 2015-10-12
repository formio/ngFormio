'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');

module.exports = function(app, template, hook) {
  describe('Analytics', function() {
    if (!app.formio || !app._server || !app._server.analytics || !app._server.analytics.isConnected()) return;

    var redis = app._server.analytics.redis;
    it('Should clear all the redis data', function(done) {
      redis.flushall(function(err, val) {
        if (err) {
          return done(err);
        }

        assert.equal(val, 'OK');
        done();
      });
    });

    it('A request to a project endpoint should be tracked', function(done) {
      request(app)
        .get('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var key = (new Date()).getMonth().toString() + ':' + template.project._id;
          redis.llen(key, function(err, length) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(length, 1);
            assert.equal(response.plan, 'basic');

            template.project = response;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];
            done();
          });
        });
    });

    it('A project which has exceeded its API limit should still fulfill requests (throttled)', function(done) {
      // Override the basic project limits for tests.
      var old = app._server.plans.limits['basic'];
      app._server.plans.limits['basic'] = 1;

      request(app)
        .get('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var key = (new Date()).getMonth().toString() + ':' + template.project._id;
          redis.llen(key, function(err, length) {
            if (err) {
              return done(err);
            }

            // Reset the basic plan limits.
            app._server.plans.limits['basic'] = old;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];
            done();
          });
        });
    });

    it('The API server will run smoothly without analytics if redis crashes', function(done) {
      var old = app._server.analytics.redis;
      app._server.analytics.redis = null;

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
          assert.equal(response.plan, 'basic');

          template.project = res.body;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          // Reset the redis ref.
          app._server.analytics.redis = old;

          done();
        });
    });

    it('The API server will run smoothly without analytics if redis crashes', function(done) {
      redis.debug('segfault', function() {
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
            assert.equal(response.plan, 'basic');

            template.project = res.body;

            // Store the JWT for future API calls.
            template.formio.owner.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });
};
