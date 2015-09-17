'use strict';

var _ = require('lodash');
var hubspotApi = require('node-hubspot');

module.exports = {
  /**
   * Connect to Hubspot.
   *
   * @param router
   * @param req
   * @returns {*}
   */
  connect: function(router, req, next) {
    router.formio.hook.settings(req, function(err, settings) {
      if (err) {
        return next(err);
      }
      if (!settings) {
        return next('No settings found.');
      }
      if (!settings.hubspot) {
        return next('Hubspot not configured.');
      }

      var hubspot = hubspotApi({
        api_key: settings.hubspot.apikey,
        version: 'v3'
      });

      next(null, hubspot);
    });
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
      address: streetName,
      city: address.locality ? address.locality.long_name : '',
      state: address.administrative_area_level_1 ? address.administrative_area_level_1.long_name : '',
      CountryOrRegion: address.country ? address.country.long_name : '',
      zip: address.postal_code ? address.postal_code.long_name : ''
    };
  }
};
