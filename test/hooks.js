'use strict';

module.exports = {
  alter: {
    /**
     * Add the project path and _id to the request url.
     *
     * @param url
     * @param template
     * @returns {string}
     */
    url: function(url, template, projectName) {
      projectName = projectName || 'project';
      return '/project/' + template[projectName]._id + url;
    }
  }
};
