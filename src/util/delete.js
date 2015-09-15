'use strict';

var _ = require('lodash');
var debug = {
  submission: require('debug')('formio:util:delete#submission'),
  form: require('debug')('formio:util:delete#form'),
  action: require('debug')('formio:util:delete#action'),
  role: require('debug')('formio:util:delete#role'),
  project: require('debug')('formio:util:delete#project'),
  roleAccess: require('debug')('formio:util:delete#roleAccess')
};

/**
 *
 * @param router
 * @returns {{submission: Function, form: Function}}
 */
module.exports = function(formio) {
  /**
   * Flag a submission as deleted. If given a subId, one submission will be flagged; if given a formId, then all the
   * submissions for that formId will be flagged.
   *
   * @param subId {string|ObjectId}
   *   The submission id to flag as deleted.
   * @param forms {array}
   *   A list of form ids to flag all submissions as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteSubmission = function(forms, next) {
    if (!forms) {
      debug.submission('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    formio.resources.submission.model.find({form: {$in: forms}, deleted: {$eq: null}}, function(err, submissions) {
      if (err) {
        debug.submission(err);
        return next(err);
      }
      if (!submissions || submissions.length === 0) {
        debug.submission('No submissions found for the forms: ' + JSON.stringify(forms));
        return next();
      }

      submissions.forEach(function(submission) {
        submission.deleted = (new Date()).getTime();
        submission.save(function(err, submission) {
          if (err) {
            debug.submission(err);
            return next(err);
          }

          debug.submission(submission);
        });
      });

      next();
    });
  };

  /**
   * Flag a form as deleted. If given a formId, one form will be flagged; if given a projectId, then all the forms for
   * that projectId will be flagged.
   *
   * @param projectId {string|ObjectId}
   *   The project id to flag all forms as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteForm = function(projectId, next) {
    if (!projectId) {
      debug.form('Skipping');
      return next();
    }

    // Find all the forms that are associated with the given projectId and have not been deleted.
    formio.resources.form.model.find(
      {project: projectId, deleted: {$eq: null}}
    ).select('_id').lean(true).exec(function(err, formIds) {
      if (err) {
        debug.form(err);
        return next(err);
      }
      if (!formIds) {
        debug.form('No forms found with the project: ' + projectId);
        return next();
      }

      formio.resources.form.model.find({_id: {$in: formIds}, deleted: {$eq: null}}, function(err, forms) {
        if (err) {
          debug.form(err);
          return next(err);
        }
        if (!forms || forms.length === 0) {
          debug.form('No forms found with with _id\'s: ' + JSON.stringify(formIds));
          return next();
        }

        // Mark all un-deleted forms as deleted.
        forms.forEach(function(form) {
          form.deleted = (new Date()).getTime();
          form.save(function(err, form) {
            if (err) {
              debug.form(err);
              return next(err);
            }

            debug.form(form);
          });
        });

        // Delete all the actions for the given list of forms.
        deleteAction(formIds, function(err) {
          if (err) {
            debug.form(err);
            return next(err);
          }

          // Update all submissions related to the newly deleted forms, as being deleted.
          deleteSubmission(formIds, function(err) {
            if (err) {
              debug.form(err);
              return next(err);
            }

            next();
          });
        });
      });
    });
  };

  /**
   * Flag an Action as deleted. If given a actionId, one action will be flagged; if given a formId, or array of formIds,
   * then all the Actions for that form, or forms, will be flagged.
   *
   * @param actionId {string|ObjectId}
   *   The Action id to flag as deleted.
   * @param forms {string|ObjectId|array}
   *   A list of form ids to flag all Actions as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteAction = function(forms, next) {
    if (!forms) {
      debug.action('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    formio.actions.model.find({form: {$in: forms}, deleted: {$eq: null}}, function(err, actions) {
      if (err) {
        debug.action(err);
        return next(err);
      }
      if (!actions || actions.length === 0) {
        debug.action('No action found with form _id\'s: ' + JSON.stringify(forms));
        return next();
      }

      actions.forEach(function(action) {
        action.deleted = (new Date()).getTime();
        action.save(function(err, action) {
          if (err) {
            debug.action(err);
            return next(err);
          }

          debug.action(action);
        });
      });

      // Continue once all the forms have been updated.
      next();
    });
  };

  /**
   * Flag a Role as deleted. If given a roleId, one Role will be flagged; if given a projectId, then all the Roles for
   * that projectId will be flagged.
   *
   * @param projectId {string|ObjectId}
   *   The Project id to flag all Roles as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteRole = function(projectId, next) {
    if (!projectId) {
      debug.role('Skipping');
      return next();
    }

    formio.roles.resource.model.find({project: projectId, deleted: {$eq: null}}, function(err, roles) {
      if (err) {
        debug.role(err);
        return next(err);
      }
      if (!roles || roles.length === 0) {
        debug.role('No roles found with the project: ' + projectId);
        return next();
      }

      roles.forEach(function(role) {
        role.deleted = (new Date()).getTime();
        role.save(function(err, role) {
          if (err) {
            debug.role(err);
            return next(err);
          }

          debug.role(role);
        });
      });

      next();
    });
  };

  /**
   * Flag a project as deleted.
   *
   * @param projectId {string|ObjectId}
   *   The project id to flag as deleted.
   * @param next
   *   The callback function to return the results.
   *
   * @returns {*}
   */
  var deleteProject = function(projectId, next) {
    if (!projectId) {
      debug.project('Skipping');
      return next();
    }

    formio.resources.project.model.findOne({_id: projectId, deleted: {$eq: null}}, function(err, project) {
      if (err) {
        debug.project(err);
        return next(err);
      }
      if (!project) {
        debug.project('No project found with _id: ' + projectId);
        return next();
      }

      project.deleted = (new Date()).getTime();
      project.save(function(err, project) {
        if (err) {
          debug.project(err);
          return next(err);
        }

        deleteRole(projectId, function(err) {
          if (err) {
            debug.project(err);
            return next(err);
          }

          deleteForm(projectId, function(err) {
            if (err) {
              debug.project(err);
              return next(err);
            }

            debug.project(project);
            next();
          });
        });
      });
    });
  };

  /**
   * Expose the internal functionality for hiding 'deleted' entities.
   */
  return {
    project: deleteProject
  };
};
