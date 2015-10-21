'use strict';

var Redis = require('redis');
var onFinished = require('on-finished');
var debug = {
  isConnected: require('debug')('formio:analytics:isConnected'),
  connect: require('debug')('formio:analytics:connect'),
  record: require('debug')('formio:analytics:record'),
  hook: require('debug')('formio:analytics:hook'),
  getCalls: require('debug')('formio:analytics:getCalls')
};
var url = require('url');
var submission = /(\/project\/[a-f0-9]{24}\/form\/[a-f0-9]{24}\/submission)/i;

/**
 *
 * @param config
 * @returns {{record: Function}}
 */
module.exports = function(config) {
  var redis = null;

  /**
   * Simple function to help determine if redis is currently connected.
   *
   * @returns {boolean}
   */
  var isConnected = function() {
    if (redis && redis.hasOwnProperty('connected') && redis.connected === true) {
      debug.isConnected(true);
      return true;
    }
    else {
      debug.isConnected(false);
      return false;
    }
  };

  /**
   * Configure the redis connection.
   */
  var connect = function() {
    // Only connect once.
    if (isConnected()) {
      return;
    }

    // Configure the redis connection.
    if (config.redis && config.redis.port && config.redis.address) {
      var opts = {};
      if (config.redis.password) {
        opts.auth_pass = config.redis.password;
      }

      // Attempt to connect to redis 1 time only.
      redis = Redis.createClient(config.redis.port, config.redis.address, opts);
      redis.max_attempts = 1;

      // Attach debugging to specific events, unset redis ref on error/disconnect.
      redis.on('ready', function() {
        debug.connect('Connected');
      });
      redis.on('error', function(err) {
        redis = null;
        debug.connect(err.message || err);
      });
      redis.on('end', function() {
        redis = null;
        debug.connect('End');
      });

      return;
    }
    else {
      debug.connect('Redis options not found or incomplete: ' + JSON.stringify(config.redis || {}));
      return;
    }
  };

  // Try the connection on server start.
  connect();

  /**
   * Express middleware for tracking request analytics.
   *
   * @param project {String}
   *   The Project Id of this request.
   * @param path {String}
   *   The requested url for this request.
   * @param start {Number}
   *   The date timestamp this request started.
   */
  var record = function(project, path, start) {
    connect();
    if (!isConnected()) {
      debug.record('Skipping, redis not found.');
      return;
    }
    if (!project) {
      debug.record('Skipping non-project request: ' + path);
      return;
    }
    if (!path) {
      debug.record('Skipping request, unknown path: ' + path);
      return;
    }

    var now = new Date();
    var key = now.getUTCMonth() + ':' + project;

    // Update the redis key, dependent on if this is a submission or non-submission request.
    if (!submission.test(path)) {
      debug.record('Updating key, non-submission request: ' + path);
      key += ':ns';
    }
    else {
      key += ':s';
    }

    debug.record('Start: ' + start);
    debug.record('dt: ' + (now.getTime() - Number.parseInt(start, 10)).toString());
    var delta = start
      ? now.getTime() - start
      : 0;
    var value = path + ':' + now.getTime() + ':' + delta;

    redis.rpush(key, value, function(err, length) {
      if (err) {
        console.error(err);
        return;
      }

      debug.record(key + ' => ' + value + ' => ' + length);
    });
  };

  /**
   * Hook the response and record the event in redis, after the response is sent.
   *
   * @param req
   * @param res
   * @param next
   */
  var hook = function(req, res, next) {
    connect();
    if (!isConnected()) {
      return next();
    }

    // Attach the request start time.
    req._start = (new Date()).getTime();
    debug.hook(req._start);

    onFinished(res, function(err) {
      if (err) {
        debug.hook(err);
        return;
      }
      if (!req.projectId) {
        debug.hook('No projectId found in the request, skipping redis record.');
        return;
      }

      var id = req.projectId;
      var path = url.parse(req.url).pathname;
      var start = req._start;
      record(id, path, start);
    });

    next();
  };

  /**
   * Get the number of calls made for the given month and project.
   *
   * @param month {number|string}
   *   The month number to search for (0-11).
   * @param project {string}
   *   The Project Id to search for.
   */
  var getCalls = function(month, project, next) {
    connect();
    if (!isConnected() || !month || !project) {
      debug.getCalls('Skipping');
      return next();
    }

    // Only look for submission calls.
    var key = month.toString() + ':' + project.toString() + ':s';
    redis.llen(key, function(err, value) {
      if (err) {
        return next(err);
      }

      debug.getCalls(key + ' -> ' + value);
      next(null, value);
    });
  };

  /**
   * Expose the redis interface for analytics.
   */
  return {
    redis: redis,
    isConnected: isConnected,
    connect: connect,
    hook: hook,
    getCalls: getCalls
  };
};
