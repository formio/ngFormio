'use strict';

var _ = require('lodash');
var util = require('./util');
var debug = require('debug')('formio:action:hubspot');
var nunjucks = require('nunjucks');

module.exports = function(router) {
  /**
   * HubspotContactAction class.
   *   This class is used to create the Hubspot ContactField action.
   *
   * @constructor
   */
  var HubspotContactFieldAction = function(data, req, res) {
    router.formio.Action.call(this, data, req, res);
  };

  // Derive from Action.
  HubspotContactFieldAction.prototype = Object.create(router.formio.Action.prototype);
  HubspotContactFieldAction.prototype.constructor = HubspotContactFieldAction;
  HubspotContactFieldAction.info = function(req, res, next) {
    next(null, {
      name: 'hubspotContactFields',
      title: 'Hubspot Contact Fields (Premium)',
      description: 'Allows you to change contact fields in hubspot.',
      premium: true,
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create']
      }
    });
  };

  HubspotContactFieldAction.settingsForm = function(req, res, next) {
    util.connect(router, req, function(err, hubspot) {
      if (err) { return next(); }

      // Create the panel for all the fields.
      var fieldPanel = {
        type: 'panel',
        theme: 'info',
        title: 'Hubspot Fields',
        input: false,
        components: []
      };

      fieldPanel.components.push({

      });

      hubspot.contacts_properties({version: 'v2'}, function(err, properties) {
        var filteredProperties = _.filter(_.sortBy(properties, 'label'), function(property) {
          return !property.readOnlyValue && !property.hidden;
        });

        // Create the select items for each hubspot field.
        var dataSrc = [
          {
            label: "No change",
            value: ""
          },
          {
            label: "Increment",
            value: "increment"
          },
          {
            label: "Decrement",
            value: "decrement"
          },
          {
            label: "Current Datetime",
            value: "currentdt"
          },
          {
            label: "Field Value",
            value: "fieldvalue"
          },
        ];
        _.each(filteredProperties, function(field) {
          var fieldOptions = {
            type: 'fieldset',
            legend: field.label + ' Field',
            input: false,
            components: [
              {
                type: 'columns',
                input: false,
                columns: [
                  {
                    components: [
                      {
                        type: 'select',
                        key: 'settings[' + field.name + '_action]',
                        label: "Action",
                        input: true,
                        placeholder: 'Select an action to change',
                        template: '<span>{{ item.label || item.value }}</span>',
                        dataSrc: 'values',
                        data: {values: dataSrc},
                        valueProperty: '',
                        multiple: false
                      },
                    ]
                  },
                  {
                    components: [
                      {
                        type: 'textfield',
                        key: 'settings[' + field.name + '_value]',
                        label: 'Value',
                        input: true,
                        multiple: false
                      }
                    ]
                  }
                ]
              }
            ]
          }
          fieldPanel.components.push(fieldOptions);
        });

        next(null, [fieldPanel]);
      });
    });
  };

  /**
   * Execute the action.
   *
   * @param handler
   * @param method
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param next
   *   The callback function to execute upon completion.
   */
  HubspotContactFieldAction.prototype.resolve = function(handler, method, req, res, next) {
    var actionInfo = this;
    // Dont block on the hubspot request.
    next();

    util.connect(router, req, function(err, hubspot) {
      if (err) {
        debug(err);
        return;
      }

      // Store the current resource.
      var currentResource = res.resource;

      // Limit to _action fields with a value set.
      var fields = _.pick(actionInfo.settings, function (value, key) {
        return value && _.endsWith(key, '_action')
      });

      // Remove _action from the field names so we can map everything out.
      fields = _.mapKeys(fields, function (value, key) {
        return key.substring(0, key.length - 7);
      });

      var getContactById = function (vid, done) {
        debug('vid: ' + vid);
        hubspot.contacts_contact_by_id({vid: vid}, function(err, result) {
          if (err) { return done(err); }
          debug(result);
          done(null, result);
        });
      };

      var createOrUpdate = function (email, user, done) {
        debug('searching for ' + email);
        hubspot.contacts_create_update({email: email}, function(err, result) {
          if (err) { return done(err); }
          debug(result);
          // Save off the vid to the user's account.
          router.formio.resources.submission.model.update({
            _id: user._id
          }, {
            $push: {
              // Add the external ids
              externalIds: {
                type: 'hubspotContact',
                id: result.vid
              }
            }
          }, function (err, result) {
            if (err) {
              debug(err);
              return;
            }
          });
          done(null, result.vid);
        })
      }

      var updateContact = function (contact) {
        var payload = {
          contact_id: contact.vid,
          properties: {}
        };

        _.each(fields, function (action, key) {
          var value = actionInfo.settings[key + '_value'];
          var current = contact.properties.hasOwnProperty(key) ? contact.properties[key].value : null;
          payload.properties[key] = processField(action, key, value, current);
        });

        debug(payload);
        hubspot.contacts_properties_update(payload, function(err) {
          if (err) { return debug(err); }
        });
      }

      var processField = function(action, key, value, current) {
        switch(action) {
          case 'increment':
            value = parseInt(value) || 1;
            current = parseInt(current) || 0;
            return current + value;
            break;
          case 'decrement':
            value = parseInt(value) || 1;
            current = parseInt(current) || 0;
            return current - value;
            break;
          case 'currentdt':
            return Date.now();
            break;
          case 'fieldvalue':
            return nunjucks.renderString(value, currentResource);
            break;
        }
      }

      router.formio.cache.loadSubmission(req, req.token.form._id, req.token.user._id, function (err, user) {
        if (err) { return debug(err); }

        // if no user, don't do anything as we can't identify them.
        if (!user) {
          return debug('no user found');
        }

        var externalId = _.result(_.find(user.externalIds, {type: 'hubspotContact'}), 'id');
        if (externalId) {
          getContactById(externalId, function (err, contact) {
            if (err) { return debug(err); }
            updateContact(contact);
          });
        }
        else {
          // We are assuming an email field here which may not be the case with other projects.
          if (user.data.hasOwnProperty('email')) {
            createOrUpdate(user.data.email, user, function (err, contactId) {
              if (err) { return debug(err); }
              getContactById(contactId, function (err, contact) {
                if (err) { return debug(err); }
                updateContact(contact);
              });
            });
          }
        }
      });
    });
  };

  return HubspotContactFieldAction;
};
