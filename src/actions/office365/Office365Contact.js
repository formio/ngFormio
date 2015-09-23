'use strict';

var _ = require('lodash');
var util = require('./util');
module.exports = function(router) {

  // The available fields.
  var office365Fields = {
    AssistantName: {
      title: 'Assistant Name',
      type: 'string'
    },
    Birthday: {
      title: 'Birthday',
      type: 'datetime'
    },
    BusinessAddress: {
      title: 'Business Address',
      type: 'address'
    },
    BusinessHomePage: {
      title: 'Business Home Page',
      type: 'string'
    },
    BusinessPhones: {
      title: 'Business Phone Numbers',
      type: 'array[string]'
    },
    Categories: {
      title: 'Categories',
      type: 'array[string]'
    },
    CompanyName: {
      title: 'Company',
      type: 'string'
    },
    Department: {
      title: 'Department',
      type: 'string'
    },
    DisplayName: {
      title: 'Display Name',
      type: 'string'
    },
    EmailAddresses: {
      title: 'Email Address',
      type: 'array[email]'
    },
    FileAs: {
      title: 'File As',
      type: 'string'
    },
    Generation: {
      title: 'Generation',
      type: 'string'
    },
    GivenName: {
      title: 'First Name',
      type: 'string'
    },
    HomeAddress: {
      title: 'Home Address',
      type: 'address'
    },
    HomePhones: {
      title: 'Home Phone Number',
      type: 'array[string]'
    },
    ImAddresses: {
      title: 'IM Address',
      type: 'array[string]'
    },
    Initials: {
      title: 'Initials',
      type: 'string'
    },
    JobTitle: {
      title: 'Job Title',
      type: 'string'
    },
    Manager: {
      title: 'Manager',
      type: 'string'
    },
    MiddleName: {
      title: 'Middle Name',
      type: 'string'
    },
    MobilePhone1: {
      title: 'Mobile Phone Number',
      type: 'string'
    },
    NickName: {
      title: 'Nick Name',
      type: 'string'
    },
    OfficeLocation: {
      title: 'Office Location',
      type: 'string'
    },
    OtherAddress: {
      title: 'Other Address',
      type: 'address'
    },
    Profession: {
      title: 'Profession',
      type: 'string'
    },
    Surname: {
      title: 'Last Name',
      type: 'string'
    },
    Title: {
      title: 'Title',
      type: 'string'
    }
  };

  /**
   * Office365ContactAction class.
   *   This class is used to create the Office 365 Contact action.
   *
   * @constructor
   */
  var Office365ContactAction = function(data, req, res) {
    router.formio.Action.call(this, data, req, res);
  };

  // Derive from Action.
  Office365ContactAction.prototype = Object.create(router.formio.Action.prototype);
  Office365ContactAction.prototype.constructor = Office365ContactAction;
  Office365ContactAction.info = function(req, res, next) {
    next(null, {
      name: 'office365contact',
      title: 'Office 365 Contacts',
      description: 'Allows you to integrate into your Office 365 Contacts.',
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create', 'update', 'delete']
      }
    });
  }
  Office365ContactAction.settingsForm = function(req, res, next) {

    // Create the panel for all the fields.
    var fieldPanel = {
      type: 'panel',
      theme: 'info',
      title: 'Office 365 Fields',
      input: false,
      components: []
    };

    // Create the select items for each office 365 field.
    var dataSrc = router.formio.hook.alter('url', '/form/' + req.params.formId + '/components', req);
    _.each(office365Fields, function(field, fieldKey) {
      fieldPanel.components.push({
        type: 'select',
        input: true,
        label: field.title + ' Field',
        key: 'settings[' + fieldKey + ']',
        placeholder: 'Select the ' + field.title + ' field',
        template: '<span>{{ item.label || item.key }}</span>',
        dataSrc: 'url',
        data: {url: dataSrc},
        valueProperty: 'key',
        multiple: false
      });
    });

    next(null, [fieldPanel]);
  };

  /**
   * Execute the action.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param cb
   *   The callback function to execute upon completion.
   */
  Office365ContactAction.prototype.resolve = function(handler, method, req, res, next) {
    var payload = {};

    // Only add the payload for post and put.
    if (req.method === 'POST' || req.method === 'PUT') {

      // Iterate over all the settings for this action.
      _.each(this.settings, function (formKey, o365Key) {

        // Only continue for fields that are provided in the request.
        if (!req.body.data.hasOwnProperty(formKey)) { return; }

        // Get the data.
        var data = req.body.data[formKey];

        // Get the data type and normalize it.
        var dataType = office365Fields[o365Key].type;
        var isArray = (dataType.indexOf('array[') === 0);
        dataType = dataType.replace(/^array\[/, '');
        dataType = dataType.replace(/]$/, '');

        // Parse the data.
        if (dataType === 'address') {
          data = util.getAddress(data);
        }

        if (dataType === 'email') {
          data = util.getEmail(data);
        }

        // Convert the data to an array if necessary.
        if (isArray && !_.isArray(data)) {
          data = [data];
        }

        payload[o365Key] = data;
      });
    }

    // Perform the request.
    util.request(router, req, res, 'contacts', 'Office365Contact', payload);

    // Move onto the next middleware.
    next();
  };

  // Return the Office365ContactAction.
  return Office365ContactAction;
};
