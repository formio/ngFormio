var Q = require('q');
var async = require('async');

/**
 * Keep track of spark mappings accross multiple servers.
 * @constructor
 */
var SparkCollection = function() {
  this.sparks = {};
  this.ready = false;
  this.redis = null;
};

/**
 * Connect to the Spark collection.
 * @param redis
 * @returns {*|promise}
 */
SparkCollection.prototype.connect = function(redis) {
  var deferred = Q.defer();
  this.redis = redis;
  if (this.redis) {
    this.redis.on('error', function() {
      this.ready = false;
      this.redis = null;
      deferred.reject();
    }.bind(this));
    this.redis.on('ready', function() {
      this.ready = true;
      deferred.resolve();
    }.bind(this));
    this.redis.on('end', function() {
      this.ready = false;
      this.redis = null;
      deferred.reject();
    }.bind(this));
  }
  else {
    this.redis = null;
    this.ready = true;
    deferred.resolve();
  }
  return deferred.promise;
};

/**
 * Get a spark provided the spark key.
 *
 * @param key
 * @returns {*}
 */
SparkCollection.prototype.get = function(key) {
  if (this.redis) {
    return Q.ninvoke(this.redis, 'get', 'spark-' + key);
  }
  else if (this.sparks.hasOwnProperty(key)) {
    var deferred = Q.defer();
    deferred.resolve(his.sparks[key]);
    return deferred.promise;
  }
};

/**
 * Set the spark object.
 *
 * @param key
 * @param obj
 * @returns {*}
 */
SparkCollection.prototype.set = function(key, obj) {
  if (this.redis) {
    return Q.ninvoke(this.redis, 'set', 'spark-' + key, obj);
  }
  else {
    var deferred = Q.defer();
    this.sparks[key] = obj;
    deferred.resolve();
    return deferred.promise;
  }
};

/**
 * Clear the spark collection.
 *
 * @returns {*|promise}
 */
SparkCollection.prototype.clear = function() {
  var deferred = Q.defer();
  if (this.redis) {
    this.redis.keys('spark-*', function(err, keys) {
      async.eachSeries(keys, this.redis.del.bind(this.redis), function() {
        deferred.resolve();
      });
    }.bind(this));
  }
  else {
    this.sparks = {};
    deferred.resolve();
  }
  return deferred.promise;
};

/**
 * Delete a spark item.
 *
 * @param key
 * @returns {*}
 */
SparkCollection.prototype.del = function(key) {
  if (this.redis) {
    return Q.ninvoke(this.redis, 'del', 'spark-' + key);
  }
  else if (this.sparks.hasOwnProperty(key)) {
    var deferred = Q.defer();
    delete this.sparks[key];
    deferred.resolve();
    return deferred.promise;
  }
};

module.exports = SparkCollection;
