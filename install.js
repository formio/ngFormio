var async = require('async');
var fs = require('fs');
var _ = require('lodash');

module.exports = function(formio, done) {

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASS) {
    return done('Cannot set up server. Please set environment variables for ADMIN_EMAIL and ADMIN_PASS and restart the server.');
  }

  var importer = require('formio/src/templates/import')(formio);
  var template;
  var project;
  var user;

  var steps = {
    readJson: function(done) {
      console.log(' > Setting up formio project.');

      try {
        fs.readFile('./deployment/import/formio.json', function(err, data) {
          if (err) { return done(err); }
          template = JSON.parse(data);
          done();
        });
      }
      catch (err) {
        return done(err);
      }
    },
    importProject: function(done) {
      var parseProject = function(template, item) {
        var project = _.clone(template);
        delete project.roles;
        delete project.forms;
        delete project.actions;
        delete project.resources;
        return project;
      }

      console.log(' > Importing formio project.');
      importer.project = importer.createInstall(formio.mongoose.models.project, parseProject);
      var items = [''];
      importer.project(template, items, function(err) {
        if (err) { return done(err) };
        project = items[0];
        done();
      });
    },
    importItems: function(done) {
      console.log(' > Importing roles, forms, resources, and actions.');

      // Add project id to roles and forms.
      var alter = {
        role: function(role) {
          role.project = project._id;
          return role;
        },
        form: function(form) {
          form.project = project._id;
          return form;
        }
      };
      importer.template(template, alter, function(err, template) {
        if (err) { return done(err); }
        done();
      });
    },
    createRootAccount: function(done) {
      console.log(' > Creating root user account.');

      var password = require('formio/src/actions/fields/password.js')(formio);
      password.encryptPassword(process.env.ADMIN_PASS, function(err, hash) {
        if (err) { return done(err); }

        // Create the root user submission.
        formio.resources.submission.model.create({
          form: template.resources.user._id,
          data: {
            email: process.env.ADMIN_EMAIL,
            password: hash
          },
          roles: [
            template.roles.administrator._id
          ]
        }, function(err, data) {
          if (err) { return done(err); }
          user = data;
          done();
        });
      });
    },
    updateProject: function(done) {
      console.log(' > Updating project with owner and roles.');
      formio.resources.project.model.findOne({_id: project._id}, function(err, project) {
        if (err) { return done(err); }
        project.access = [
          {
            "type" : "create_all",
            "roles" : [
              template.roles.administrator._id
            ]
          },
          {
            "type" : "read_all",
            "roles" : [
              template.roles.administrator._id
            ]
          },
          {
            "type" : "update_all",
            "roles" : [
              template.roles.administrator._id
            ]
          },
          {
            "type" : "delete_all",
            "roles" : [
              template.roles.administrator._id
            ]
          }
        ];
        project.owner = user._id;
        project.save();
        done();
      });
    }
  };

  async.series([
    steps.readJson,
    steps.importProject,
    steps.importItems,
    steps.createRootAccount,
    steps.updateProject,
  ], function(err, result) {
    if (err) {
      console.log(err);
      return done(err);
    }

    console.log(' > Finished setting up formio project.');
    done();
  });

}
