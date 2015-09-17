'use strict';

module.exports = function(formio) {
  return {
    loadProjectByName: function(req, name, cb) {
      var cache = formio.cache.cache(req);
      if (cache.projectNames && cache.projectNames[name]) {
        return this.loadProject(req, cache.projectNames[name], cb);
      }

      // Find the project and cache for later.
      formio.resources.project.model.findOne({
        name: name,
        deleted: {$eq: null}
      }).exec(function(err, project) {
        if (err) {
          return cb(err);
        }
        if (!project) {
          return cb('Project not found');
        }

        var projectId = project._id.toString();
        if (!cache.projectNames) {
          cache.projectNames = {};
        }
        cache.projectNames[name] = projectId;
        cache.projects[projectId] = project;
        cb(null, project);
      });
    },

    /**
     * Returns the current project.
     * @param req
     * @returns {*}
     */
    currentProject: function(req) {
      var cache = formio.cache.cache(req);
      var id = req.projectId || req.params.projectId;
      if (cache.projects[id]) {
        return cache.projects[id];
      }
      return null;
    },

    /**
     * Load an Project provided the Project ID.
     * @param req
     * @param id
     * @param cb
     */
    loadProject: function (req, id, cb) {
      var cache = formio.cache.cache(req);
      if (cache.projects[id]) {
        return cb(null, cache.projects[id]);
      }

      id = (typeof id === 'string') ? formio.mongoose.Types.ObjectId(id) : id;
      var query = {_id: id, deleted: {$eq: null}};
      var params = req.params;
      formio.resources.project.model.findOne(query).exec(function (err, result) {

        // @todo: Figure out why we have to reset the params after project load.
        req.params = params;
        if (err) {
          return cb(err);
        }
        if (!result) {
          return cb('Project not found');
        }

        cache.projects[id] = result;
        cb(null, result);
      });
    }
  };
};
