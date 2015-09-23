'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var chance = new (require('chance'))();

module.exports = function(app, template, hook) {
  describe('Malformed JSON', function() {
    it('should return a 400 error', function(done) {
      request(app)
        .post('/project')
        .set('x-jwt-token', template.formio.owner.token)
        .set('Content-Type', 'application/json')
        .send('{"title":"abc","name":"123","description":"respect","settings":{"cors":"*"}💩')
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(res.text, 'Unexpected token �');

          done();
        });
    });
  });

  describe('Forms', function() {
    var tempForm = {};

    it('A Project Owner should not be able to Create a Form without a Project ID', function(done) {
      request(app)
        .post('/project//form') // Missing project id
        .set('x-jwt-token', template.formio.owner.token)
        .send(tempForm)
        .expect(401)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should not be able to Create a Form without a valid Project ID', function(done) {
      request(app)
        .post('/project/💩/form') // Invalid project id
        .set('x-jwt-token', template.formio.owner.token)
        .send(tempForm)
        .expect(400)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should not be able to Create a Form without a name', function(done) {
      request(app)
        .post('/project/' + template.project._id + '/form')
        .set('x-jwt-token', template.formio.owner.token)
        .send(_.omit(tempForm, 'name'))
        .expect(400)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Project Owner should not be able to Create a Form without a path', function(done) {
      request(app)
        .post('/project/' + template.project._id + '/form')
        .set('x-jwt-token', template.formio.owner.token)
        .send(_.omit(tempForm, 'path'))
        .expect(400)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
};
