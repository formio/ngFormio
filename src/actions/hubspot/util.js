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
  }
};
