'use strict';

var assert = require('assert');
var mongoose = require('mongoose');
var plugin = require('../../src/plugins/EncryptedProperty');
var schema, Model, model;

describe('EncryptedProperty Tests', function() {
  before(function(done) {
    mongoose.connect('localhost/test', done);
  });

  beforeEach(function setup(callback) {
    schema = new mongoose.Schema({
      title: String
    });

    schema.plugin(plugin, {
      secret: 'password',
      plainName: 'plaintext'
    });

    Model = mongoose.model('Model', schema);
    model = new Model();

    callback();
  });

  afterEach(function() {
    delete mongoose.models.Model;
    delete mongoose.modelSchemas.Model;
  });

  after(function(done) {
    mongoose.disconnect(done);
  });

  it('should throw an error if not all required properties are specified', function() {
    assert.throws(function() {
      plugin({}, {});
    });
  });

  it('should not store the plaintext', function() {
    model.plaintext = {un: 'username', pw: 'password'};
    assert.equal(typeof(model.toObject().plaintext), 'undefined');
  });

  it('should store binary object', function() {
    model.plaintext = {un: 'username', pw: 'password'};
    assert.equal(typeof(model.toObject().plaintext_encrypted), 'object');
    assert.notEqual(typeof(model.toObject().plaintext_encrypted._bsontype), 'Binary');
  });

  it('should return undefined when the property has no value', function() {
    assert.equal(typeof(model.plaintext), 'undefined');
  });

  it('should not send encrypted field as JSON', function() {
    model.plaintext = {un: 'username', pw: 'password'};
    assert.equal(typeof(model.toJSON().plaintext_encrypted), 'undefined');
  });

  it('should send plaintext of field as JSON', function() {
    model.plaintext = {un: 'username', pw: 'password'};
    assert.equal(typeof(model.toJSON().plaintext), 'object');
    assert.equal(model.toJSON().plaintext.un, 'username');
    assert.equal(model.toJSON().plaintext.pw, 'password');
  });

  it('should encrypt undefined', function() {
    model.plaintext = undefined;
    assert.equal(model.toJSON().plaintext, undefined);
  });
});
