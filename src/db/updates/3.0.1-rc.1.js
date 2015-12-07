'use strict';

var _ = require('lodash');
var async = require('async');

/**
 * Update 3.0.1-rc.1
 *
 * This is a private update script to be taken before 3.0.1.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  var projects = db.collection('projects');
  var forms = db.collection('forms');
  var submissions = db.collection('submissions');

  // Get the formio project.
  var getFormio = function(cb) {
    projects.findOne({deleted: {$eq: null}, name: 'formio'}, function(err, project) {
      if(err) {
        return cb(err);
      }

      return cb(null, project);
    });
  };

  // Get the formio form for teams.
  var getTeams = function(project, cb) {
    forms.findOne({deleted: {$eq: null}, project: project._id, name: 'team'}, function(err, form) {
      if(err) {
        return cb(err);
      }

      return cb(null, project, form);
    });
  };

  // Remove the old teams with private information inside them.
  var removeOldTeams = function(project, form, cb) {
    submissions.deleteMany({form: form._id}, function(err) {
      if(err) {
        return cb(err);
      }

      return cb(null, project, form);
    });
  };

  // Update the formio teams form to be up-to-date.
  var updateTeams = function(project, form, cb) {
    // Update the name to be required.
    form.components[0].validate.required = true;

    // Update the resource form component to only search names and store them.
    form.components[1].searchFields = ['data.name__regex'];

    // Update the submission access to allow all users to see a team
    form.submissionAccess = [
      {
        type: 'create_all',
        roles: ['55cd5c3ca51a96bef99ef550']
      },
      {
        type: 'read_all',
        roles: ['55cd5c3ca51a96bef99ef550', '55cd5c3ca51a96bef99ef552', '55cd5c3ca51a96bef99ef551']
      },
      {
        type: 'update_all',
        roles: ['55cd5c3ca51a96bef99ef550']
      },
      {
        type: 'delete_all',
        roles: ['55cd5c3ca51a96bef99ef550']
      },
      {
        type: 'create_own',
        roles: ['55cd5c3ca51a96bef99ef552', '55cd5c3ca51a96bef99ef551']
      },
      {
        type: 'read_own',
        roles: ['55cd5c3ca51a96bef99ef552', '55cd5c3ca51a96bef99ef551']
      },
      {
        type: 'update_own',
        roles: ['55cd5c3ca51a96bef99ef552', '55cd5c3ca51a96bef99ef551']
      },
      {
        type: 'delete_own',
        roles: ['55cd5c3ca51a96bef99ef552', '55cd5c3ca51a96bef99ef551']
      }
    ];

    forms.updateOne({_id: form._id, project: project._id}, {$set: {components: form.components, submissionAccess: form.submissionAccess}}, function(err) {
      if(err) {
        return cb(err);
      }

      return cb();
    });
  };

  // Execute update 3.0.1-rc.1
  async.waterfall([
    getFormio,
    getTeams,
    removeOldTeams,
    updateTeams
  ], function(err) {
    if(err) {
      return done(err);
    }

    done();
  });
};
