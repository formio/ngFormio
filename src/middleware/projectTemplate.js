var request = require("request");
var _ = require('lodash');
var jwt = require('jsonwebtoken');
module.exports = function(formio) {
  return function(req, res, next) {
    // If the Project was not created, skip this bootstrapping process.
    if (res.resource.status !== 201) {
      return next();
    }

    // The Project that was just created.
    var project = res.resource.item;

    // The project template they wish to use.
    var template = req.template || 'default';

    // Update the owner of the Project, and give them the Administrator Role.
    var updateProjectOwner = function(template, adminRoles) {

      // Find the Project owner by id, and add the administrator role of this Project to their roles.
      formio.resources.submission.model.findOne({_id: project.owner, deleted: {$eq: null}}, function(err, owner) {
        if (err) {
          return next(err);
        }

        // Attempt to remove array with one null element, inserted by mongo.
        if ((owner.roles.length === 1) && (owner.roles[0] === null)) {
          owner.roles = [];
        }

        // Add the administrative roles of this Project to the creators roles.
        _.each(adminRoles, function(adminRole) {
          owner.roles.push(adminRole._id);
        });

        var roles = owner.roles;
        owner.save(function(saveErr) {
          if (saveErr) {
            return next(saveErr);
          }

          // Update the users jwt token to reflect the user role changes.
          var token = formio.util.getHeader(req, 'x-jwt-token');
          jwt.verify(token, formio.config.jwt.secret, function(error, decoded) {
            if (error) {
              return next(error);
            }

            // Add the user roles to the token.
            decoded.user.roles = roles;

            // Update req/res tokens.
            req.user = decoded.user;
            req.token = decoded;
            res.token = formio.auth.getToken({
              form: decoded.form,
              user: decoded.user
            });

            res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
            res.setHeader('x-jwt-token', res.token);
            return next();
          });
        });
      });
    };

    // Update the Project and attach the anonymous role as the default Role.
    var updateProject = function(template) {

      // Give the project owner all the administrator roles.
      var adminRoles = [];
      _.each(template.roles, function(role) {
        if (role.admin) {
          adminRoles.push(role._id);
        }
      });

      // Add the access for the project.
      project.access = [
        {type: 'create_all', roles: adminRoles},
        {type: 'read_all', roles: adminRoles},
        {type: 'update_all', roles: adminRoles},
        {type: 'delete_all', roles: adminRoles}
      ];

      // Save the project.
      project.save(function(err) {
        if (err) {
          return next(err);
        }

        // Update the project owner with the admin roles.
        updateProjectOwner(template, adminRoles);
      });
    };

    // Method to import the template.
    var importTemplate = function (template) {

      // Import the template within formio.
      formio.import.template(template, {
        role: function(item) {
          item.project = project._id;
          return item;
        },
        form: function(item) {
          item.project = project._id;
          return item;
        }
      }, function(err) {
        if (err) {
          return next('An error occured with the template import.');
        }

        // Update the project with this template.
        updateProject(template);
      });
    };

    // Allow external templates.
    if (typeof template === 'object') {

      // Import the template.
      importTemplate(template);
    }
    else if (template.indexOf('http') !== -1) {
      request({
        url: template,
        json: true
      }, function (err, response, body) {
        if (err) {
          return next(err.message);
        }

        if (response.statusCode !== 200) {
          return next('Unable to load template.');
        }

        // Import the template.
        importTemplate(body);
      })
    }
    else if (formio.templates.hasOwnProperty(template)) {

      // Import the template.
      importTemplate(formio.templates[template]);
    }
    else {

      // Unknown template.
      return next('Unknown template.');
    }
  }
};
