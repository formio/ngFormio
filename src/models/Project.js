'use strict';

var _ = require('lodash');
var EncryptedProperty = require('../plugins/EncryptedProperty');

module.exports = function(formio) {
  var cache = require('../cache/cache')(formio);
  var model = formio.BaseModel({
    schema: new formio.mongoose.Schema({
      title: {
        type: String,
        description: 'The project title.',
        required: true,
        maxlength: 63
      },
      name: {
        type: String,
        description: 'The name of the project.',
        required: true,
        maxlength: 63,
        index: true
      },
      description: {
        type: String,
        description: 'A description for the project.',
        maxlength: 512
      },
      owner: {
        type: formio.mongoose.Schema.Types.ObjectId,
        ref: 'submission',
        index: true,
        default: null
      },
      plan: {
        type: String,
        enum: ['basic', 'team1', 'team2', 'team3'],
        default: 'basic',
        index: true
      },
      deleted: {
        type: Number,
        default: null
      },
      access: [formio.schemas.PermissionSchema]
    })
  });

  // Encrypt 'settings' property at rest in MongoDB.
  model.schema.plugin(EncryptedProperty, {
    secret: formio.config.mongoSecret,
    plainName: 'settings'
  });

  // Validation
  var invalidRegex = /[^0-9a-zA-Z\-]|^\-|\-$/;
  model.schema.path('name').validate(function(name) {
    return !invalidRegex.test(name);
  }, 'A Project domain name may only contain letters, numbers, and hyphens (but cannot start or end with a hyphen)');

  model.schema.path('name').validate(function(name) {
    return !formio.config.reservedSubdomains || !_.contains(formio.config.reservedSubdomains, name);
  }, 'This domain is reserved. Please use a different domain.');

  // Validate the uniqueness of the value given for the name.
  model.schema.path('name').validate(function(value, done) {
    var search = {
      name: value,
      deleted: {$eq: null}
    };

    // Ignore the id if this is an update.
    if (this._id) {
      search._id = {$ne: this._id};
    }

    formio.mongoose.model('project').findOne(search).exec(function(err, result) {
      if (err || result) {
        return done(false);
      }

      done(true);
    });
  }, 'The Project name must be unique.');

  return model;
};
