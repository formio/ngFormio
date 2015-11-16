'use strict';

var _ = require('lodash');
var util = require('./util');
var debug = require('debug')('formio:action:hubspot');

module.exports = function(router) {
  /**
   * HubspotContactAction class.
   *   This class is used to create the Hubspot Event action.
   *
   * @constructor
   */
  var HubspotEventAction = function(data, req, res) {
    router.formio.Action.call(this, data, req, res);
  };

  // Derive from Action.
  HubspotEventAction.prototype = Object.create(router.formio.Action.prototype);
  HubspotEventAction.prototype.constructor = HubspotEventAction;
  HubspotEventAction.info = function(req, res, next) {
    next(null, {
      name: 'hubspotEvent',
      title: 'Hubspot Events (Premium)',
      description: 'Allows you to integrate into Hubspot Events.',
      premium: true,
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create']
      }
    });
  };

  HubspotEventAction.settingsForm = function(req, res, next) {
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

        // TODO: Make email required.
        // Create the select items for each hubspot field.
        var dataSrc = router.formio.hook.alter('url', '/form/' + req.params.formId + '/components', req);
        _.each(filteredProperties, function(field) {
          fieldPanel.components.push({
            type: 'select',
            input: true,
            label: field.label + ' Field',
            key: 'settings[' + field.name + ']',
            placeholder: 'Select the ' + field.label + ' field',
            template: '<span>{{ item.label || item.key }}</span>',
            dataSrc: 'url',
            data: {url: dataSrc},
            valueProperty: 'key',
            multiple: false
          });
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
  HubspotEventAction.prototype.resolve = function(handler, method, req, res, next) {
    // Dont block on the hubspot request.
    next();

    // Store the current resource.
    var currentResource = res.resource;

    // Get the externalId for this resource.
    var externalId = _.result(_.find(currentResource.item.externalIds, {type: 'hubspotEvent'}), 'id');

    var payload = {
      properties: {}
    };

    // Only add the payload for post and put.
    if (req.method === 'POST' || req.method === 'PUT') {

      // Iterate over all the settings for this action.
      _.each(this.settings, function (formKey, hubspotKey) {
        // Only continue for fields that are provided in the request.
        if (!req.body.data.hasOwnProperty(formKey)) { return; }

        // Get the data.
        var data = req.body.data[formKey];

        // Email needs to be in the payload as well as properties.
        if (hubspotKey === 'email') {
          payload.email = data;
        }

        payload.properties[hubspotKey] = data;
      });

      util.connect(router, req, function(err, hubspot) {
        if (err) {
          debug(err);
          return;
        }

        hubspot.contacts_create_update(payload, function(err, result) {
          // Should we do something with the error?
          if (err) {
            debug(err);
            return;
          }

          if (!externalId && result.vid) {
            // Update the resource with the external Id.
            router.formio.resources.submission.model.update({
              _id: currentResource.item._id
            }, {
              $push: {
                externalIds: {
                  type: 'hubspotEvent',
                  id: result.vid
                }
              }
            }, function (err, result) {
              if (err) {
                // Should we do something with the error?
                debug(err);
                return;
              }
            });
          }
        });
      });
    }
    else if (req.method === 'DELETE') {
      // TODO: If vid exists on formio contact, delete from hubspot.
      // node-hubspot.js does not currently have a contact_delete function. Will need to add.
    }
  };

  return HubspotEventAction;
};
