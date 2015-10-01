'use strict';

var _ = require('lodash');
var adal = require('adal-node');
var uuid = require('node-uuid');
var AuthenticationContext = adal.AuthenticationContext;
var nunjucks = require('nunjucks');
var request = require('request');
var Q = require('q');

module.exports = {
  /**
   * The baseUrl for Office 365 API.
   */
  baseUrl: 'https://outlook.office365.com',

  /**
   * Execute a request to Office 365 API.
   * @param router
   * @param req
   * @param res
   * @param resource
   * @param type
   * @param payload
   * @returns {Promise.<T>|*}
   */
  request: function(router, req, res, resource, type, payload) {

    // Store the current resource.
    var currentResource = res.resource;

    // Connect to Office 365.
    return this.connect(router, req).then(function(connection) {
      var deferred = Q.defer();

      // The URL to request.
      var url = this.baseUrl + "/api/v1.0/users('" + connection.settings.office365.email + "')/" + resource;
      var externalId = '';
      var method = 'POST';

      // Handle PUT and DELETE methods.
      if (req.method !== 'POST') {

        // Get the externalId for this resource.
        externalId = _.result(_.find(currentResource.item.externalIds, {type: type}), 'id');

        // Return if there is no external Id to update.
        if (!externalId) { return; }

        // Add to the url.
        url += "('" + externalId + "')";

        // Set the method.
        method = (req.method === 'PUT') ? 'PATCH' : 'DELETE';
      }

      // Perform the request.
      request({
        url: url,
        method: method,
        json: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + connection.response.accessToken,
          'User-Agent': 'form.io/1.0',
          'client-request-id': uuid.v4(),
          'return-client-request-id': true,
          'Date': (new Date()).toUTCString()
        },
        body: payload
      }, function(error, response, body) {

        // Reject the promise if an error occured.
        if (error) {
          return deferred.reject(error);
        }
        if (!response) {
          return deferred.reject(new Error('No response from Office 365.'));
        }

        // Make sure we have a body.
        if (response.body) {

          // Reject if the body says we have an error.
          if (response.body.hasOwnProperty('error') && response.body.error) {
            return deferred.reject(response.body.error);
          }

          // Only add an externalId if none is provided.
          if ((req.method === 'POST') && !externalId && response.body.Id) {

            // Update the resource with the external Id.
            router.formio.resources.submission.model.update({
              _id: currentResource.item._id
            }, {
              $push: {
                externalIds: {
                  type: type,
                  id: response.body.Id
                }
              }
            }, function (err, result) {
              if (err) {
                return deferred.reject(err);
              }
            });
          }
        }
      });

      return deferred.promise;
    }.bind(this));
  },

  /**
   * Connect to Office 365 and provide a token.
   *
   * @param router
   * @param req
   * @returns {*}
   */
  connect: function(router, req) {
    var deferred = Q.defer();
    router.formio.hook.settings(req, function(err, settings) {
      if (err) {
        return deferred.reject(err);
      }
      if (!settings) {
        return deferred.reject('No settings found.');
      }
      if (
        !settings.office365 ||
        !settings.office365.tenant ||
        !settings.office365.clientId ||
        !settings.office365.cert ||
        !settings.office365.thumbprint
      ) {
        return deferred.reject('Office 365 Not configured.');
      }

      // Create the AuthenticationContext.
      var context = new AuthenticationContext('https://login.windows.net/' + settings.office365.tenant);

      // Authenticate to Office 365.
      context.acquireTokenWithClientCertificate(
        this.baseUrl + '/',
        settings.office365.clientId,
        settings.office365.cert,
        settings.office365.thumbprint,
        function (err, response) {
          if (err) {
            return deferred.reject(err);
          }

          deferred.resolve({
            settings: settings,
            response: response
          });
        }
      );
    }.bind(this));

    return deferred.promise;
  },

  /**
   * Parse an address from Google Maps to Office 365.
   * @param value
   * @returns {*}
   */
  getAddress: function(value) {
    var address = {};
    if (!value || !value.address_components) {
      return {};
    }

    _.each(value.address_components, function(component) {
      _.each(component.types, function(type) {
        address[type] = component;
      });
    });

    var streetName = address.street_number ? (address.street_number.long_name + ' ') : '';
    streetName += address.route ? address.route.short_name : '';

    return {
      Street: streetName,
      City: address.locality ? address.locality.long_name : '',
      State: address.administrative_area_level_1 ? address.administrative_area_level_1.long_name : '',
      CountryOrRegion: address.country ? address.country.long_name : '',
      PostalCode: address.postal_code ? address.postal_code.long_name : ''
    };
  },

  /**
   * Parse an array of parameters.
   *
   * @param array
   * @param params
   * @returns {*}
   */
  getArray: function(array, params) {
    _.each(array, function(value) {
      value = nunjucks.renderString(value, params);
    });

    return array;
  },

  /**
   * Parse GPS coordinates.
   *
   * @param value
   * @returns {*}
   */
  getCoordinates: function(value) {
    if (!value || !value.geometry || !value.geometry.location) {
      return {};
    }

    return {
      Latitude: value.geometry.location.lat,
      Longitude: value.geometry.location.lng
    };
  },

  /**
   * Parse a location.
   *
   * @param value
   * @returns {{DisplayName: *, Address: *, Coordinates: *}}
   */
  getLocation: function(value) {
    if (!value) {
      return {};
    }

    return {
      DisplayName: value.formatted_address,
      Address: this.getAddress(value),
      Coordinates: this.getCoordinates(value)
    };
  },

  /**
   * Return an email property.
   *
   * @param value
   * @returns {{Name: *, Address: *}}
   */
  getEmail: function(value) {
    return {
      Name: value,
      Address: value
    };
  },

  /**
   * Return a recipient.
   *
   * @param value
   * @returns {{EmailAddress: *}}
   */
  getRecipient: function(value) {
    return {
      EmailAddress: this.getEmail(value)
    };
  },

  /**
   * Get recipients of an email.
   *
   * @param value
   * @param params
   * @returns {Array}
   */
  getRecipients: function(value, params) {
    var recipients = [];
    _.each(value, function(recipient) {
      var email = nunjucks.renderString(recipient, params);
      recipients.push(this.getRecipient(email));
    }.bind(this));
    return recipients;
  },

  /**
   * Parses an attendees array.
   *
   * @param value
   * @param params
   * @returns {Array}
   */
  getAttendees: function(value, params) {
    var attendees = [];
    _.each(value, function(attendee) {
      var email = nunjucks.renderString(attendee, params);
      attendees.push({
        EmailAddress: this.getEmail(email),
        Type: 'Required'
      });
    }.bind(this));

    return attendees;
  },

  getBody: function(value, params) {
    return {
      ContentType: 'HTML',
      Content: nunjucks.renderString(value, params)
    };
  }
};
