/*! ng-formio v2.2.4 | https://npmcdn.com/ng-formio@2.2.4/LICENSE.txt */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  /**
   * Determine if a component is a layout component or not.
   *
   * @param {Object} component
   *   The component to check.
   *
   * @returns {Boolean}
   *   Whether or not the component is a layout component.
   */
  isLayoutComponent: function isLayoutComponent(component) {
    return (
      (component.columns && Array.isArray(component.columns)) ||
      (component.rows && Array.isArray(component.rows)) ||
      (component.components && Array.isArray(component.components))
    ) ? true : false;
  },

  /**
   * Iterate through each component within a form.
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {Function} fn
   *   The iteration function to invoke for each component.
   * @param {Boolean} includeAll
   *   Whether or not to include layout components.
   * @param {String} path
   *   The current data path of the element. Example: data.user.firstName
   */
  eachComponent: function eachComponent(components, fn, includeAll, path) {
    if (!components) return;
    path = path || '';
    components.forEach(function(component) {
      var hasColumns = component.columns && Array.isArray(component.columns);
      var hasRows = component.rows && Array.isArray(component.rows);
      var hasComps = component.components && Array.isArray(component.components);
      var noRecurse = false;
      var newPath = component.key ? (path ? (path + '.' + component.key) : component.key) : '';

      if (includeAll || component.tree || (!hasColumns && !hasRows && !hasComps)) {
        noRecurse = fn(component, newPath);
      }

      var subPath = function() {
        if (component.key && ((component.type === 'datagrid') || (component.type === 'container'))) {
          return newPath;
        }
        return path;
      };

      if (!noRecurse) {
        if (hasColumns) {
          component.columns.forEach(function(column) {
            eachComponent(column.components, fn, includeAll, subPath());
          });
        }

        else if (hasRows) {
          [].concat.apply([], component.rows).forEach(function(row) {
            eachComponent(row.components, fn, includeAll, subPath());
          });
        }

        else if (hasComps) {
          eachComponent(component.components, fn, includeAll, subPath());
        }
      }
    });
  },

  /**
   * Get a component by its key
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {String} key
   *   The key of the component to get.
   *
   * @returns {Object}
   *   The component that matches the given key, or undefined if not found.
   */
  getComponent: function getComponent(components, key) {
    var result;
    module.exports.eachComponent(components, function(component) {
      if (component.key === key) {
        result = component;
      }
    });
    return result;
  },

  /**
   * Flatten the form components for data manipulation.
   *
   * @param {Object} components
   *   The components to iterate.
   * @param {Boolean} includeAll
   *   Whether or not to include layout components.
   *
   * @returns {Object}
   *   The flattened components map.
   */
  flattenComponents: function flattenComponents(components, includeAll) {
    var flattened = {};
    module.exports.eachComponent(components, function(component, path) {
      flattened[path] = component;
    }, includeAll);
    return flattened;
  },

  /**
   * Get the value for a component key, in the given submission.
   *
   * @param {Object} submission
   *   A submission object to search.
   * @param {String} key
   *   A for components API key to search for.
   */
  getValue: function getValue(submission, key) {
    var data = submission.data || {};

    var search = function search(data) {
      var i;
      var value;

      if (data instanceof Array) {
        for (i = 0; i < data.length; i++) {
          if (typeof data[i] === 'object') {
            value = search(data[i]);
          }

          if (value) {
            return value;
          }
        }
      }
      else if (typeof data === 'object') {
        if (data.hasOwnProperty(key)) {
          return data[key];
        }

        var keys = Object.keys(data);
        for (i = 0; i < keys.length; i++) {
          if (typeof data[keys[i]] === 'object') {
            value = search(data[keys[i]]);
          }

          if (value) {
            return value;
          }
        }
      }
    };

    return search(data);
  }
};

},{}],2:[function(_dereq_,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {
      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      this._events.maxListeners = conf.maxListeners !== undefined ? conf.maxListeners : defaultMaxListeners;
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    } else {
      this._events.maxListeners = defaultMaxListeners;
    }
  }

  function logPossibleMemoryLeak(count) {
    console.error('(node) warning: possible EventEmitter memory ' +
      'leak detected. %d listeners added. ' +
      'Use emitter.setMaxListeners() to increase limit.',
      count);

    if (console.trace){
      console.trace();
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }
  EventEmitter.EventEmitter2 = EventEmitter; // backwards compatibility for exporting EventEmitter property

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name !== undefined) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else {
          if (typeof tree._listeners === 'function') {
            tree._listeners = [tree._listeners];
          }

          tree._listeners.push(listener);

          if (
            !tree._listeners.warned &&
            this._events.maxListeners > 0 &&
            tree._listeners.length > this._events.maxListeners
          ) {
            tree._listeners.warned = true;
            logPossibleMemoryLeak(tree._listeners.length);
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    if (n !== undefined) {
      this._events || init.call(this);
      this._events.maxListeners = n;
      if (!this._conf) this._conf = {};
      this._conf.maxListeners = n;
    }
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) {
        return false;
      }
    }

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all && this._all.length) {
      handler = this._all.slice();
      if (al > 3) {
        args = new Array(al);
        for (j = 0; j < al; j++) args[j] = arguments[j];
      }

      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this, type);
          break;
        case 2:
          handler[i].call(this, type, arguments[1]);
          break;
        case 3:
          handler[i].call(this, type, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
      if (typeof handler === 'function') {
        this.event = type;
        switch (al) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          args = new Array(al - 1);
          for (j = 1; j < al; j++) args[j - 1] = arguments[j];
          handler.apply(this, args);
        }
        return true;
      } else if (handler) {
        // need to make copy of handlers because list can change in the middle
        // of emit call
        handler = handler.slice();
      }
    }

    if (handler && handler.length) {
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this);
          break;
        case 2:
          handler[i].call(this, arguments[1]);
          break;
        case 3:
          handler[i].call(this, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
      return true;
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }

    return !!this._all;
  };

  EventEmitter.prototype.emitAsync = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
        if (!this._events.newListener) { return Promise.resolve([false]); }
    }

    var promises= [];

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all) {
      if (al > 3) {
        args = new Array(al);
        for (j = 1; j < al; j++) args[j] = arguments[j];
      }
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(this._all[i].call(this, type));
          break;
        case 2:
          promises.push(this._all[i].call(this, type, arguments[1]));
          break;
        case 3:
          promises.push(this._all[i].call(this, type, arguments[1], arguments[2]));
          break;
        default:
          promises.push(this._all[i].apply(this, args));
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      switch (al) {
      case 1:
        promises.push(handler.call(this));
        break;
      case 2:
        promises.push(handler.call(this, arguments[1]));
        break;
      case 3:
        promises.push(handler.call(this, arguments[1], arguments[2]));
        break;
      default:
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
        promises.push(handler.apply(this, args));
      }
    } else if (handler && handler.length) {
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(handler[i].call(this));
          break;
        case 2:
          promises.push(handler[i].call(this, arguments[1]));
          break;
        case 3:
          promises.push(handler[i].call(this, arguments[1], arguments[2]));
          break;
        default:
          promises.push(handler[i].apply(this, args));
        }
      }
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        return Promise.reject(arguments[1]); // Unhandled 'error' event
      } else {
        return Promise.reject("Uncaught, unspecified 'error' event.");
      }
    }

    return Promise.all(promises);
  };

  EventEmitter.prototype.on = function(type, listener) {
    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else {
      if (typeof this._events[type] === 'function') {
        // Change to array.
        this._events[type] = [this._events[type]];
      }

      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (
        !this._events[type].warned &&
        this._events.maxListeners > 0 &&
        this._events[type].length > this._events.maxListeners
      ) {
        this._events[type].warned = true;
        logPossibleMemoryLeak(this._events[type].length);
      }
    }

    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {
    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if (!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }

        this.emit("removeListener", type, listener);

        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }

        this.emit("removeListener", type, listener);
      }
    }

    function recursivelyGarbageCollect(root) {
      if (root === undefined) {
        return;
      }
      var keys = Object.keys(root);
      for (var i in keys) {
        var key = keys[i];
        var obj = root[key];
        if ((obj instanceof Function) || (typeof obj !== "object") || (obj === null))
          continue;
        if (Object.keys(obj).length > 0) {
          recursivelyGarbageCollect(root[key]);
        }
        if (Object.keys(obj).length === 0) {
          delete root[key];
        }
      }
    }
    recursivelyGarbageCollect(this.listenerTree);

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          this.emit("removeListenerAny", fn);
          return this;
        }
      }
    } else {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++)
        this.emit("removeListenerAny", fns[i]);
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if (this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else if (this._events) {
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if (this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenerCount = function(type) {
    return this.listeners(type).length;
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],3:[function(_dereq_,module,exports){
'use strict';

// Intentionally use native-promise-only here... Other promise libraries (es6-promise)
// duck-punch the global Promise definition which messes up Angular 2 since it
// also duck-punches the global Promise definition. For now, keep native-promise-only.
var Promise = _dereq_("native-promise-only");

// Require other libraries.
_dereq_('whatwg-fetch');
var EventEmitter = _dereq_('eventemitter2').EventEmitter2;
var copy = _dereq_('shallow-copy');
var providers = _dereq_('./providers');

// The default base url.
var baseUrl = 'https://api.form.io';
var appUrl = baseUrl;
var appUrlSet = false;

var plugins = [];

// The temporary GET request cache storage
var cache = {};

var noop = function(){};
var identity = function(value) { return value; };

// Will invoke a function on all plugins.
// Returns a promise that resolves when all promises
// returned by the plugins have resolved.
// Should be used when you want plugins to prepare for an event
// but don't want any data returned.
var pluginWait = function(pluginFn) {
  var args = [].slice.call(arguments, 1);
  return Promise.all(plugins.map(function(plugin) {
    return (plugin[pluginFn] || noop).apply(plugin, args);
  }));
};

// Will invoke a function on plugins from highest priority
// to lowest until one returns a value. Returns null if no
// plugins return a value.
// Should be used when you want just one plugin to handle things.
var pluginGet = function(pluginFn) {
  var args = [].slice.call(arguments, 0);
  var callPlugin = function(index, pluginFn) {
    var plugin = plugins[index];
    if (!plugin) return Promise.resolve(null);
    return Promise.resolve((plugin && plugin[pluginFn] || noop).apply(plugin, [].slice.call(arguments, 2)))
    .then(function(result) {
      if (result !== null && result !== undefined) return result;
      return callPlugin.apply(null, [index + 1].concat(args));
    });
  };
  return callPlugin.apply(null, [0].concat(args));
};

// Will invoke a function on plugins from highest priority to
// lowest, building a promise chain from their return values
// Should be used when all plugins need to process a promise's
// success or failure
var pluginAlter = function(pluginFn, value) {
  var args = [].slice.call(arguments, 2);
  return plugins.reduce(function(value, plugin) {
      return (plugin[pluginFn] || identity).apply(plugin, [value].concat(args));
  }, value);
};


/**
 * Returns parts of the URL that are important.
 * Indexes
 *  - 0: The full url
 *  - 1: The protocol
 *  - 2: The hostname
 *  - 3: The rest
 *
 * @param url
 * @returns {*}
 */
var getUrlParts = function(url) {
  var regex = '^(http[s]?:\\/\\/)';
  if (baseUrl && url.indexOf(baseUrl) === 0) {
    regex += '(' + baseUrl.replace(/^http[s]?:\/\//, '') + ')';
  }
  else {
    regex += '([^/]+)';
  }
  regex += '($|\\/.*)';
  return url.match(new RegExp(regex));
};

var serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
};

// The formio class.
var Formio = function(path) {

  // Ensure we have an instance of Formio.
  if (!(this instanceof Formio)) { return new Formio(path); }
  if (!path) {
    // Allow user to create new projects if this was instantiated without
    // a url
    this.projectUrl = baseUrl + '/project';
    this.projectsUrl = baseUrl + '/project';
    this.projectId = false;
    this.query = '';
    return;
  }

  // Initialize our variables.
  this.projectsUrl = '';
  this.projectUrl = '';
  this.projectId = '';
  this.formUrl = '';
  this.formsUrl = '';
  this.formId = '';
  this.submissionsUrl = '';
  this.submissionUrl = '';
  this.submissionId = '';
  this.actionsUrl = '';
  this.actionId = '';
  this.actionUrl = '';
  this.query = '';

  // Normalize to an absolute path.
  if ((path.indexOf('http') !== 0) && (path.indexOf('//') !== 0)) {
    baseUrl = baseUrl ? baseUrl : window.location.href.match(/http[s]?:\/\/api./)[0];
    path = baseUrl + path;
  }

  var hostparts = getUrlParts(path);
  var parts = [];
  var hostName = hostparts[1] + hostparts[2];
  path = hostparts.length > 3 ? hostparts[3] : '';
  var queryparts = path.split('?');
  if (queryparts.length > 1) {
    path = queryparts[0];
    this.query = '?' + queryparts[1];
  }

  // See if this is a form path.
  if ((path.search(/(^|\/)(form|project)($|\/)/) !== -1)) {

    // Register a specific path.
    var registerPath = function(name, base) {
      this[name + 'sUrl'] = base + '/' + name;
      var regex = new RegExp('\/' + name + '\/([^/]+)');
      if (path.search(regex) !== -1) {
        parts = path.match(regex);
        this[name + 'Url'] = parts ? (base + parts[0]) : '';
        this[name + 'Id'] = (parts.length > 1) ? parts[1] : '';
        base += parts[0];
      }
      return base;
    }.bind(this);

    // Register an array of items.
    var registerItems = function(items, base, staticBase) {
      for (var i in items) {
        if (items.hasOwnProperty(i)) {
          var item = items[i];
          if (item instanceof Array) {
            registerItems(item, base, true);
          }
          else {
            var newBase = registerPath(item, base);
            base = staticBase ? base : newBase;
          }
        }
      }
    };

    registerItems(['project', 'form', ['submission', 'action']], hostName);

    if (!this.projectId) {
      if (hostparts.length > 2 && hostparts[2].split('.').length > 2) {
        this.projectUrl = hostName;
        this.projectId = hostparts[2].split('.')[0];
      }
    }
  }
  else {

    // This is an aliased url.
    this.projectUrl = hostName;
    this.projectId = (hostparts.length > 2) ? hostparts[2].split('.')[0] : '';
    var subRegEx = new RegExp('\/(submission|action)($|\/.*)');
    var subs = path.match(subRegEx);
    this.pathType = (subs && (subs.length > 1)) ? subs[1] : '';
    path = path.replace(subRegEx, '');
    path = path.replace(/\/$/, '');
    this.formsUrl = hostName + '/form';
    this.formUrl = hostName + path;
    this.formId = path.replace(/^\/+|\/+$/g, '');
    var items = ['submission', 'action'];
    for (var i in items) {
      if (items.hasOwnProperty(i)) {
        var item = items[i];
        this[item + 'sUrl'] = hostName + path + '/' + item;
        if ((this.pathType === item) && (subs.length > 2) && subs[2]) {
          this[item + 'Id'] = subs[2].replace(/^\/+|\/+$/g, '');
          this[item + 'Url'] = hostName + path + subs[0];
        }
      }
    }
  }

  // Set the app url if it is not set.
  if (!appUrlSet) {
    appUrl = this.projectUrl;
  }
};

/**
 * Load a resource.
 *
 * @param type
 * @returns {Function}
 * @private
 */
var _load = function(type) {
  var _id = type + 'Id';
  var _url = type + 'Url';
  return function(query, opts) {
    if (query && typeof query === 'object') {
      query = serialize(query.params);
    }
    if (query) {
      query = this.query ? (this.query + '&' + query) : ('?' + query);
    }
    else {
      query = this.query;
    }
    if (!this[_id]) { return Promise.reject('Missing ' + _id); }
    return this.makeRequest(type, this[_url] + query, 'get', null, opts);
  };
};

/**
 * Save a resource.
 *
 * @param type
 * @returns {Function}
 * @private
 */
var _save = function(type) {
  var _id = type + 'Id';
  var _url = type + 'Url';
  return function(data, opts) {
    var method = this[_id] ? 'put' : 'post';
    var reqUrl = this[_id] ? this[_url] : this[type + 'sUrl'];
    cache = {};
    return this.makeRequest(type, reqUrl + this.query, method, data, opts);
  };
};

/**
 * Delete a resource.
 *
 * @param type
 * @returns {Function}
 * @private
 */
var _delete = function(type) {
  var _id = type + 'Id';
  var _url = type + 'Url';
  return function(opts) {
    if (!this[_id]) { Promise.reject('Nothing to delete'); }
    cache = {};
    return this.makeRequest(type, this[_url], 'delete', null, opts);
  };
};

/**
 * Resource index method.
 *
 * @param type
 * @returns {Function}
 * @private
 */
var _index = function(type) {
  var _url = type + 'Url';
  return function(query, opts) {
    query = query || '';
    if (query && typeof query === 'object') {
      query = '?' + serialize(query.params);
    }
    return this.makeRequest(type, this[_url] + query, 'get', null, opts);
  };
};

// Activates plugin hooks, makes Formio.request if no plugin provides a request
Formio.prototype.makeRequest = function(type, url, method, data, opts) {
  var self = this;
  method = (method || 'GET').toUpperCase();
  if(!opts || typeof opts !== 'object') {
    opts = {};
  }

  var requestArgs = {
    formio: self,
    type: type,
    url: url,
    method: method,
    data: data,
    opts: opts
  };

  var request = pluginWait('preRequest', requestArgs)
  .then(function() {
    return pluginGet('request', requestArgs)
    .then(function(result) {
      if (result === null || result === undefined) {
        return Formio.request(url, method, data);
      }
      return result;
    });
  });

  return pluginAlter('wrapRequestPromise', request, requestArgs);
};

// Define specific CRUD methods.
Formio.prototype.loadProject = _load('project');
Formio.prototype.saveProject = _save('project');
Formio.prototype.deleteProject = _delete('project');
Formio.prototype.loadForm = _load('form');
Formio.prototype.saveForm = _save('form');
Formio.prototype.deleteForm = _delete('form');
Formio.prototype.loadForms = _index('forms');
Formio.prototype.loadSubmission = _load('submission');
Formio.prototype.saveSubmission = _save('submission');
Formio.prototype.deleteSubmission = _delete('submission');
Formio.prototype.loadSubmissions = _index('submissions');
Formio.prototype.loadAction = _load('action');
Formio.prototype.saveAction = _save('action');
Formio.prototype.deleteAction = _delete('action');
Formio.prototype.loadActions = _index('actions');
Formio.prototype.availableActions = function() { return this.makeRequest('availableActions', this.formUrl + '/actions'); };
Formio.prototype.actionInfo = function(name) { return this.makeRequest('actionInfo', this.formUrl + '/actions/' + name); };

Formio.prototype.uploadFile = function(storage, file, fileName, dir, progressCallback) {
  var requestArgs = {
    provider: storage,
    method: 'upload',
    file: file,
    fileName: fileName,
    dir: dir
  }
  var request = pluginWait('preRequest', requestArgs)
    .then(function() {
      return pluginGet('fileRequest', requestArgs)
        .then(function(result) {
          if (storage && (result === null || result === undefined)) {
            if (providers.storage.hasOwnProperty(storage)) {
              var provider = new providers.storage[storage](this);
              return provider.uploadFile(file, fileName, dir, progressCallback);
            }
            else {
              throw('Storage provider not found');
            }
          }
          return result || {url: ''};
        }.bind(this));
    }.bind(this));

  return pluginAlter('wrapFileRequestPromise', request, requestArgs);
}

Formio.prototype.downloadFile = function(file) {
  var requestArgs = {
    method: 'download',
    file: file
  };

  var request = pluginWait('preRequest', requestArgs)
    .then(function() {
      return pluginGet('fileRequest', requestArgs)
        .then(function(result) {
          if (file.storage && (result === null || result === undefined)) {
            if (providers.storage.hasOwnProperty(file.storage)) {
              var provider = new providers.storage[file.storage](this);
              return provider.downloadFile(file);
            }
            else {
              throw('Storage provider not found');
            }
          }
          return result || {url: ''};
        }.bind(this));
    }.bind(this));

  return pluginAlter('wrapFileRequestPromise', request, requestArgs);
}

Formio.makeStaticRequest = function(url, method, data) {
  method = (method || 'GET').toUpperCase();

  var requestArgs = {
    url: url,
    method: method,
    data: data
  };

  var request = pluginWait('preRequest', requestArgs)
  .then(function() {
    return pluginGet('staticRequest', requestArgs)
    .then(function(result) {
      if (result === null || result === undefined) {
        return Formio.request(url, method, data);
      }
      return result;
    });
  });

  return pluginAlter('wrapStaticRequestPromise', request, requestArgs);
};

// Static methods.
Formio.loadProjects = function(query) {
  query = query || '';
  if (typeof query === 'object') {
    query = '?' + serialize(query.params);
  }
  return this.makeStaticRequest(baseUrl + '/project' + query);
};

Formio.request = function(url, method, data) {
  if (!url) {
    return Promise.reject('No url provided');
  }
  method = (method || 'GET').toUpperCase();
  var cacheKey = btoa(url);

  return new Promise(function(resolve, reject) {
    // Get the cached promise to save multiple loads.
    if (method === 'GET' && cache.hasOwnProperty(cacheKey)) {
      resolve(cache[cacheKey]);
    }
    else {
      resolve(new Promise(function(resolve, reject) {
        // Set up and fetch request
        var headers = new Headers({
          'Accept': 'application/json',
          'Content-type': 'application/json; charset=UTF-8'
        });
        var token = Formio.getToken();
        if (token) {
          headers.append('x-jwt-token', token);
        }

        var options = {
          method: method,
          headers: headers,
          mode: 'cors'
        };
        if (data) {
          options.body = JSON.stringify(data);
        }

        resolve(fetch(url, options));
      })
      .catch(function(err) {
        err.message = 'Could not connect to API server (' + err.message + ')';
        err.networkError = true;
        throw err;
      })
      .then(function(response) {
        // Handle fetch results
        if (response.ok) {
          var token = response.headers.get('x-jwt-token');
          if (response.status >= 200 && response.status < 300 && token && token !== '') {
            Formio.setToken(token);
          }
          // 204 is no content. Don't try to .json() it.
          if (response.status === 204) {
            return {};
          }
          return (response.headers.get('content-type').indexOf('application/json') !== -1 ?
            response.json() : response.text())
          .then(function(result) {
            // Add some content-range metadata to the result here
            var range = response.headers.get('content-range');
            if (range && typeof result === 'object') {
              range = range.split('/');
              if(range[0] !== '*') {
                var skipLimit = range[0].split('-');
                result.skip = Number(skipLimit[0]);
                result.limit = skipLimit[1] - skipLimit[0] + 1;
              }
              result.serverCount = range[1] === '*' ? range[1] : Number(range[1]);
            }
            return result;
          });
        }
        else {
          if (response.status === 440) {
            Formio.setToken(null);
            Formio.events.emit('formio.sessionExpired', response.body);
          }
          else if (response.status === 401) {
            Formio.events.emit('formio.unauthorized', response.body);
          }
          // Parse and return the error as a rejected promise to reject this promise
          return (response.headers.get('content-type').indexOf('application/json') !== -1 ?
            response.json() : response.text())
            .then(function(error){
              throw error;
            });
        }
      })
      .catch(function(err) {
        if (err === 'Bad Token') {
          Formio.setToken(null);
          Formio.events.emit('formio.badToken', err);
        }
        // Remove failed promises from cache
        delete cache[cacheKey];
        // Propagate error so client can handle accordingly
        throw err;
      }));
    }
  })
  .then(function(result) {
    // Save the cache
    if (method === 'GET') {
      cache[cacheKey] = Promise.resolve(result);
    }

    // Shallow copy result so modifications don't end up in cache
    if(Array.isArray(result)) {
      var resultCopy = result.map(copy);
      resultCopy.skip = result.skip;
      resultCopy.limit = result.limit;
      resultCopy.serverCount = result.serverCount;
      return resultCopy;
    }
    return copy(result);
  });
};

Formio.setToken = function(token) {
  token = token || '';
  if (token === this.token) { return; }
  this.token = token;
  if (!token) {
    Formio.setUser(null);
    // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
    try {
      return localStorage.removeItem('formioToken');
    }
    catch(err) {
      return;
    }
  }
  // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
  try {
    localStorage.setItem('formioToken', token);
  }
  catch(err) {
    // Do nothing.
  }
  Formio.currentUser(); // Run this so user is updated if null
};

Formio.getToken = function() {
  if (this.token) { return this.token; }
  try {
    var token = localStorage.getItem('formioToken') || '';
    this.token = token;
    return token;
  }
  catch (e) {
    return '';
  }
};

Formio.setUser = function(user) {
  if (!user) {
    this.setToken(null);
    // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
    try {
      return localStorage.removeItem('formioUser');
    }
    catch(err) {
      return;
    }
  }
  // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
  try {
    localStorage.setItem('formioUser', JSON.stringify(user));
  }
  catch(err) {
    // Do nothing.
  }
};

Formio.getUser = function() {
  try {
    return JSON.parse(localStorage.getItem('formioUser') || null);
  }
  catch (e) {
    return;
  }
};

Formio.setBaseUrl = function(url) {
  baseUrl = url;
  if (!appUrlSet) {
    appUrl = url;
  }
};

Formio.getBaseUrl = function() {
  return baseUrl;
};

Formio.setAppUrl = function(url) {
  appUrl = url;
  appUrlSet = true;
};

Formio.getAppUrl = function() {
  return appUrl;
};

Formio.clearCache = function() { cache = {}; };

Formio.currentUser = function() {
  var url = baseUrl + '/current';
  var user = this.getUser();
  if (user) {
    return pluginAlter('wrapStaticRequestPromise', Promise.resolve(user), {
      url: url,
      method: 'GET'
    })
  }
  var token = this.getToken();
  if (!token) {
    return pluginAlter('wrapStaticRequestPromise', Promise.resolve(null), {
      url: url,
      method: 'GET'
    })
  }
  return this.makeStaticRequest(url)
  .then(function(response) {
    Formio.setUser(response);
    return response;
  });
};

// Keep track of their logout callback.
Formio.logout = function() {
  var onLogout = function(result) {
    this.setToken(null);
    this.setUser(null);
    Formio.clearCache();
    return result;
  }.bind(this);
  return this.makeStaticRequest(baseUrl + '/logout').then(onLogout).catch(onLogout);
};

Formio.fieldData = function(data, component) {
  if (!data) { return ''; }
  if (!component || !component.key) { return data; }
  if (component.key.indexOf('.') !== -1) {
    var value = data;
    var parts = component.key.split('.');
    var key = '';
    for (var i = 0; i < parts.length; i++) {
      key = parts[i];

      // Handle nested resources
      if (value.hasOwnProperty('_id')) {
        value = value.data;
      }

      // Return if the key is not found on the value.
      if (!value.hasOwnProperty(key)) {
        return;
      }

      // Convert old single field data in submissions to multiple
      if (key === parts[parts.length - 1] && component.multiple && !Array.isArray(value[key])) {
        value[key] = [value[key]];
      }

      // Set the value of this key.
      value = value[key];
    }
    return value;
  }
  else {
    // Convert old single field data in submissions to multiple
    if (component.multiple && !Array.isArray(data[component.key])) {
      data[component.key] = [data[component.key]];
    }
    return data[component.key];
  }
};

Formio.providers = providers;

/**
 * EventEmitter for Formio events.
 * See Node.js documentation for API documentation: https://nodejs.org/api/events.html
 */
Formio.events = new EventEmitter({
  wildcard: false,
  maxListeners: 0
});

/**
 * Register a plugin with Formio.js
 * @param plugin The plugin to register. See plugin documentation.
 * @param name   Optional name to later retrieve plugin with.
 */
Formio.registerPlugin = function(plugin, name) {
  plugins.push(plugin);
  plugins.sort(function(a, b) {
    return (b.priority || 0) - (a.priority || 0);
  });
  plugin.__name = name;
  (plugin.init || noop).call(plugin, Formio);
};

/**
 * Returns the plugin registered with the given name.
 */
Formio.getPlugin = function(name) {
  return plugins.reduce(function(result, plugin) {
    if (result) return result;
    if (plugin.__name === name) return plugin;
  }, null);
};

/**
 * Deregisters a plugin with Formio.js.
 * @param  plugin The instance or name of the plugin
 * @return true if deregistered, false otherwise
 */
Formio.deregisterPlugin = function(plugin) {
  var beforeLength = plugins.length;
  plugins = plugins.filter(function(p) {
    if(p !== plugin && p.__name !== plugin) return true;
    (p.deregister || noop).call(p, Formio);
    return false;
  });
  return beforeLength !== plugins.length;
};

module.exports = Formio;

},{"./providers":4,"eventemitter2":2,"native-promise-only":9,"shallow-copy":10,"whatwg-fetch":11}],4:[function(_dereq_,module,exports){
module.exports = {
  storage: _dereq_('./storage')
};

},{"./storage":6}],5:[function(_dereq_,module,exports){
var Promise = _dereq_("native-promise-only");
var dropbox = function(formio) {
  return {
    uploadFile: function(file, fileName, dir, progressCallback) {
      return new Promise(function(resolve, reject) {
        // Send the file with data.
        var xhr = new XMLHttpRequest();

        if (typeof progressCallback === 'function') {
          xhr.upload.onprogress = progressCallback;
        }

        var fd = new FormData();
        fd.append('name', fileName);
        fd.append('dir', dir);
        fd.append('file', file);

        // Fire on network error.
        xhr.onerror = function(err) {
          err.networkError = true;
          reject(err);
        }

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            var response = JSON.parse(xhr.response);
            response.storage = 'dropbox';
            response.size = file.size;
            response.type = file.type;
            response.url = response.path_lower;
            resolve(response);
          }
          else {
            reject(xhr.response || 'Unable to upload file');
          }
        };

        xhr.onabort = function(err) {
          reject(err);
        }

        xhr.open('POST', formio.formUrl + '/storage/dropbox');
        try {
          var token = localStorage.getItem('formioToken');
        }
        catch (e) {
          // Swallow error.
        }
        if (token) {
          xhr.setRequestHeader('x-jwt-token', token);
        }
        xhr.send(fd);
      });
    },
    downloadFile: function(file) {
      file.url = formio.formUrl + '/storage/dropbox?path_lower=' + file.path_lower + (token ? '&x-jwt-token=' + token : '');
      return Promise.resolve(file);
    }
  };
};

dropbox.title = 'Dropbox';
dropbox.name = 'dropbox';
module.exports = dropbox;



},{"native-promise-only":9}],6:[function(_dereq_,module,exports){
module.exports = {
  dropbox: _dereq_('./dropbox.js'),
  s3: _dereq_('./s3.js'),
  url: _dereq_('./url.js'),
};

},{"./dropbox.js":5,"./s3.js":7,"./url.js":8}],7:[function(_dereq_,module,exports){
var Promise = _dereq_("native-promise-only");
var s3 = function(formio) {
  return {
    uploadFile: function(file, fileName, dir, progressCallback) {
      return new Promise(function(resolve, reject) {
        // Send the pre response to sign the upload.
        var pre = new XMLHttpRequest();

        var prefd = new FormData();
        prefd.append('name', fileName);
        prefd.append('size', file.size);
        prefd.append('type', file.type);

        // This only fires on a network error.
        pre.onerror = function(err) {
          err.networkError = true;
          reject(err);
        }

        pre.onabort = function(err) {
          reject(err);
        }

        pre.onload = function() {
          if (pre.status >= 200 && pre.status < 300) {
            var response = JSON.parse(pre.response);

            // Send the file with data.
            var xhr = new XMLHttpRequest();

            if (typeof progressCallback === 'function') {
              xhr.upload.onprogress = progressCallback;
            }

            response.data.fileName = fileName;
            response.data.key += dir + fileName;

            var fd = new FormData();
            for(var key in response.data) {
              fd.append(key, response.data[key]);
            }
            fd.append('file', file);

            // Fire on network error.
            xhr.onerror = function(err) {
              err.networkError = true;
              reject(err);
            }

            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                  storage: 's3',
                  name: fileName,
                  bucket: response.bucket,
                  key: response.data.key,
                  url: response.url + response.data.key,
                  acl: response.data.acl,
                  size: file.size,
                  type: file.type
                });
              }
              else {
                reject(xhr.response || 'Unable to upload file');
              }
            };

            xhr.onabort = function(err) {
              reject(err);
            }

            xhr.open('POST', response.url);

            xhr.send(fd);
          }
          else {
            reject(pre.response || 'Unable to sign file');
          }
        };

        pre.open('POST', formio.formUrl + '/storage/s3');

        pre.setRequestHeader('Accept', 'application/json');
        pre.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        try {
          var token = localStorage.getItem('formioToken');
        }
        catch (e) {
          // swallow error.
        }
        if (token) {
          pre.setRequestHeader('x-jwt-token', token);
        }

        pre.send(JSON.stringify({
          name: fileName,
          size: file.size,
          type: file.type
        }));
      });
    },
    downloadFile: function(file) {
      if (file.acl !== 'public-read') {
        return formio.makeRequest('file', formio.formUrl + '/storage/s3?bucket=' + file.bucket + '&key=' + file.key, 'GET');
      }
      else {
        return Promise.resolve(file);
      }
    }
  };
};

s3.title = 'S3';
s3.name = 's3';
module.exports = s3;

},{"native-promise-only":9}],8:[function(_dereq_,module,exports){
var Promise = _dereq_("native-promise-only");
var url = function(formio) {
  return {
    title: 'Url',
    name: 'url',
    uploadFile: function(file, fileName, dir, progressCallback) {
      return new Promise(function(resolve, reject) {
        var data = {
          dir: dir,
          name: fileName,
          file: file
        };

        // Send the file with data.
        var xhr = new XMLHttpRequest();

        if (typeof progressCallback === 'function') {
          xhr.upload.onprogress = progressCallback;
        }

        fd = new FormData();
        for(var key in data) {
          fd.append(key, data[key]);
        }

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Need to test if xhr.response is decoded or not.
            resolve({
              storage: 'url',
              name: fileName,
              url: xhr.response.url,
              size: file.size,
              type: file.type
            });
          }
          else {
            reject(xhr.response || 'Unable to upload file');
          }
        };

        // Fire on network error.
        xhr.onerror = function() {
          reject(xhr);
        }

        xhr.onabort = function() {
          reject(xhr);
        }

        xhr.open('POST', response.url);
        xhr.send(fd);
      });
    },
    downloadFile: function(file) {
      // Return the original as there is nothing to do.
      return Promise.resolve(file);
    }
  };
};

url.name = 'url';
url.title = 'Url';
module.exports = url;

},{"native-promise-only":9}],9:[function(_dereq_,module,exports){
(function (global){
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition();
	if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
	else if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
	/*jshint validthis:true */
	"use strict";

	var builtInProp, cycle, scheduling_queue,
		ToString = Object.prototype.toString,
		timer = (typeof setImmediate != "undefined") ?
			function timer(fn) { return setImmediate(fn); } :
			setTimeout
	;

	// dammit, IE8.
	try {
		Object.defineProperty({},"x",{});
		builtInProp = function builtInProp(obj,name,val,config) {
			return Object.defineProperty(obj,name,{
				value: val,
				writable: true,
				configurable: config !== false
			});
		};
	}
	catch (err) {
		builtInProp = function builtInProp(obj,name,val) {
			obj[name] = val;
			return obj;
		};
	}

	// Note: using a queue instead of array for efficiency
	scheduling_queue = (function Queue() {
		var first, last, item;

		function Item(fn,self) {
			this.fn = fn;
			this.self = self;
			this.next = void 0;
		}

		return {
			add: function add(fn,self) {
				item = new Item(fn,self);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = void 0;
			},
			drain: function drain() {
				var f = first;
				first = last = cycle = void 0;

				while (f) {
					f.fn.call(f.self);
					f = f.next;
				}
			}
		};
	})();

	function schedule(fn,self) {
		scheduling_queue.add(fn,self);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	// promise duck typing
	function isThenable(o) {
		var _then, o_type = typeof o;

		if (o != null &&
			(
				o_type == "object" || o_type == "function"
			)
		) {
			_then = o.then;
		}
		return typeof _then == "function" ? _then : false;
	}

	function notify() {
		for (var i=0; i<this.chain.length; i++) {
			notifyIsolated(
				this,
				(this.state === 1) ? this.chain[i].success : this.chain[i].failure,
				this.chain[i]
			);
		}
		this.chain.length = 0;
	}

	// NOTE: This is a separate function to isolate
	// the `try..catch` so that other code can be
	// optimized better
	function notifyIsolated(self,cb,chain) {
		var ret, _then;
		try {
			if (cb === false) {
				chain.reject(self.msg);
			}
			else {
				if (cb === true) {
					ret = self.msg;
				}
				else {
					ret = cb.call(void 0,self.msg);
				}

				if (ret === chain.promise) {
					chain.reject(TypeError("Promise-chain cycle"));
				}
				else if (_then = isThenable(ret)) {
					_then.call(ret,chain.resolve,chain.reject);
				}
				else {
					chain.resolve(ret);
				}
			}
		}
		catch (err) {
			chain.reject(err);
		}
	}

	function resolve(msg) {
		var _then, self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		try {
			if (_then = isThenable(msg)) {
				schedule(function(){
					var def_wrapper = new MakeDefWrapper(self);
					try {
						_then.call(msg,
							function $resolve$(){ resolve.apply(def_wrapper,arguments); },
							function $reject$(){ reject.apply(def_wrapper,arguments); }
						);
					}
					catch (err) {
						reject.call(def_wrapper,err);
					}
				})
			}
			else {
				self.msg = msg;
				self.state = 1;
				if (self.chain.length > 0) {
					schedule(notify,self);
				}
			}
		}
		catch (err) {
			reject.call(new MakeDefWrapper(self),err);
		}
	}

	function reject(msg) {
		var self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		self.msg = msg;
		self.state = 2;
		if (self.chain.length > 0) {
			schedule(notify,self);
		}
	}

	function iteratePromises(Constructor,arr,resolver,rejecter) {
		for (var idx=0; idx<arr.length; idx++) {
			(function IIFE(idx){
				Constructor.resolve(arr[idx])
				.then(
					function $resolver$(msg){
						resolver(idx,msg);
					},
					rejecter
				);
			})(idx);
		}
	}

	function MakeDefWrapper(self) {
		this.def = self;
		this.triggered = false;
	}

	function MakeDef(self) {
		this.promise = self;
		this.state = 0;
		this.triggered = false;
		this.chain = [];
		this.msg = void 0;
	}

	function Promise(executor) {
		if (typeof executor != "function") {
			throw TypeError("Not a function");
		}

		if (this.__NPO__ !== 0) {
			throw TypeError("Not a promise");
		}

		// instance shadowing the inherited "brand"
		// to signal an already "initialized" promise
		this.__NPO__ = 1;

		var def = new MakeDef(this);

		this["then"] = function then(success,failure) {
			var o = {
				success: typeof success == "function" ? success : true,
				failure: typeof failure == "function" ? failure : false
			};
			// Note: `then(..)` itself can be borrowed to be used against
			// a different promise constructor for making the chained promise,
			// by substituting a different `this` binding.
			o.promise = new this.constructor(function extractChain(resolve,reject) {
				if (typeof resolve != "function" || typeof reject != "function") {
					throw TypeError("Not a function");
				}

				o.resolve = resolve;
				o.reject = reject;
			});
			def.chain.push(o);

			if (def.state !== 0) {
				schedule(notify,def);
			}

			return o.promise;
		};
		this["catch"] = function $catch$(failure) {
			return this.then(void 0,failure);
		};

		try {
			executor.call(
				void 0,
				function publicResolve(msg){
					resolve.call(def,msg);
				},
				function publicReject(msg) {
					reject.call(def,msg);
				}
			);
		}
		catch (err) {
			reject.call(def,err);
		}
	}

	var PromisePrototype = builtInProp({},"constructor",Promise,
		/*configurable=*/false
	);

	// Note: Android 4 cannot use `Object.defineProperty(..)` here
	Promise.prototype = PromisePrototype;

	// built-in "brand" to signal an "uninitialized" promise
	builtInProp(PromisePrototype,"__NPO__",0,
		/*configurable=*/false
	);

	builtInProp(Promise,"resolve",function Promise$resolve(msg) {
		var Constructor = this;

		// spec mandated checks
		// note: best "isPromise" check that's practical for now
		if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
			return msg;
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			resolve(msg);
		});
	});

	builtInProp(Promise,"reject",function Promise$reject(msg) {
		return new this(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			reject(msg);
		});
	});

	builtInProp(Promise,"all",function Promise$all(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}
		if (arr.length === 0) {
			return Constructor.resolve([]);
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			var len = arr.length, msgs = Array(len), count = 0;

			iteratePromises(Constructor,arr,function resolver(idx,msg) {
				msgs[idx] = msg;
				if (++count === len) {
					resolve(msgs);
				}
			},reject);
		});
	});

	builtInProp(Promise,"race",function Promise$race(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			iteratePromises(Constructor,arr,function resolver(idx,msg){
				resolve(msg);
			},reject);
		});
	});

	return Promise;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(_dereq_,module,exports){
module.exports = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    var copy;
    
    if (isArray(obj)) {
        var len = obj.length;
        copy = Array(len);
        for (var i = 0; i < len; i++) {
            copy[i] = obj[i];
        }
    }
    else {
        var keys = objectKeys(obj);
        copy = {};
        
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            copy[key] = obj[key];
        }
    }
    return copy;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
        if ({}.hasOwnProperty.call(obj, key)) keys.push(key);
    }
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return {}.toString.call(xs) === '[object Array]';
};

},{}],11:[function(_dereq_,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      this.map[name].forEach(function(value) {
        callback.call(thisArg, value, name, this)
      }, this)
    }, this)
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  var support = {
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  function Body() {
    this.bodyUsed = false


    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (!body) {
        this._bodyText = ''
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body
    if (Request.prototype.isPrototypeOf(input)) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = input
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input
      } else {
        request = new Request(input, init)
      }

      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return
      }

      xhr.onload = function() {
        var status = (xhr.status === 1223) ? 204 : xhr.status
        if (status < 100 || status > 599) {
          reject(new TypeError('Network request failed'))
          return
        }
        var options = {
          status: status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],12:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  /*jshint camelcase: false */
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('address', {
        title: 'Address',
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/address-multiple.html' : 'formio/components/address.html';
        },
        controller: ['$scope', '$http', function($scope, $http) {
          $scope.address = {};
          $scope.addresses = [];
          $scope.refreshAddress = function(address) {
            var params = {
              address: address,
              sensor: false
            };
            if (!address) {
              return;
            }
            if ($scope.component.map && $scope.component.map.region) {
              params.region = $scope.component.map.region;
            }
            if ($scope.component.map && $scope.component.map.key) {
              params.key = $scope.component.map.key;
            }
            return $http.get(
              'https://maps.googleapis.com/maps/api/geocode/json',
              {
                disableJWT: true,
                params: params,
                headers: {
                  Authorization: undefined,
                  Pragma: undefined,
                  'Cache-Control': undefined
                }
              }
            ).then(function(response) {
              $scope.addresses = response.data.results;
            });
          };
        }],
        tableView: function(data) {
          return data ? data.formatted_address : '';
        },
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'addressField',
          placeholder: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          map: {
            region: '',
            key: ''
          },
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/address.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate }}</label>\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select ng-model=\"data[component.key]\" safe-multiple-to-single ng-disabled=\"readOnly\" ng-required=\"component.validate.required\" id=\"{{ componentId }}\" name=\"{{ componentId }}\" tabindex=\"{{ component.tabindex || 0 }}\" theme=\"bootstrap\">\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate }}\">{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"address in addresses\" refresh=\"refreshAddress($select.search)\" refresh-delay=\"500\">\n    <div ng-bind-html=\"address.formatted_address | highlight: $select.search\"></div>\n  </ui-select-choices>\n</ui-select>\n<formio-errors></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/address-multiple.html',
        $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],13:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('button', {
        title: 'Button',
        template: 'formio/components/button.html',
        settings: {
          input: true,
          label: 'Submit',
          tableView: false,
          key: 'submit',
          size: 'md',
          leftIcon: '',
          rightIcon: '',
          block: false,
          action: 'submit',
          disableOnInvalid: false,
          theme: 'primary'
        },
        controller: ['$scope', function($scope) {
          var settings = $scope.component;
          var onClick = function() {
            switch (settings.action) {
              case 'submit':
                return;
              case 'reset':
                $scope.resetForm();
                break;
              case 'oauth':
                if (!settings.oauth) {
                  $scope.showAlerts({
                    type: 'danger',
                    message: 'You must assign this button to an OAuth action before it will work.'
                  });
                  break;
                }
                if (settings.oauth.error) {
                  $scope.showAlerts({
                    type: 'danger',
                    message: settings.oauth.error
                  });
                  break;
                }
                $scope.openOAuth(settings.oauth);
                break;
            }
          };

          $scope.$on('buttonClick', function(event, component, componentId) {
            // Ensure the componentId's match (even though they always should).
            if (componentId !== $scope.componentId) {
              return;
            }
            onClick();
          });

          $scope.openOAuth = function(settings) {
            /*eslint-disable camelcase */
            var params = {
              response_type: 'code',
              client_id: settings.clientId,
              redirect_uri: window.location.origin || window.location.protocol + '//' + window.location.host,
              state: settings.state,
              scope: settings.scope
            };
            /*eslint-enable camelcase */

            // Make display optional.
            if (settings.display) {
              params.display = settings.display;
            }
            params = Object.keys(params).map(function(key) {
              return key + '=' + encodeURIComponent(params[key]);
            }).join('&');

            var url = settings.authURI + '?' + params;

            // TODO: make window options from oauth settings, have better defaults
            var popup = window.open(url, settings.provider, 'width=1020,height=618');
            var interval = setInterval(function() {
              try {
                var popupHost = popup.location.host;
                var currentHost = window.location.host;
                if (popup && !popup.closed && popupHost === currentHost && popup.location.search) {
                  popup.close();
                  var params = popup.location.search.substr(1).split('&').reduce(function(params, param) {
                    var split = param.split('=');
                    params[split[0]] = split[1];
                    return params;
                  }, {});
                  if (params.error) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: params.error_description || params.error
                    });
                    return;
                  }
                  // TODO: check for error response here
                  if (settings.state !== params.state) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: 'OAuth state does not match. Please try logging in again.'
                    });
                    return;
                  }
                  var submission = {data: {}, oauth: {}};
                  submission.oauth[settings.provider] = params;
                  submission.oauth[settings.provider].redirectURI = window.location.origin || window.location.protocol + '//' + window.location.host;
                  $scope.formioForm.submitting = true;
                  $scope.formio.saveSubmission(submission)
                  .then(function(submission) {
                    // Trigger the form submission.
                    $scope.$emit('formSubmission', submission);
                  })
                  .catch(function(error) {
                    $scope.showAlerts({
                      type: 'danger',
                      message: error.message || error
                    });
                  })
                  .finally(function() {
                    $scope.formioForm.submitting = false;
                  });
                }
              }
              catch (error) {
                if (error.name !== 'SecurityError') {
                  $scope.showAlerts({
                    type: 'danger',
                    message: error.message || error
                  });
                }
              }
              if (!popup || popup.closed || popup.closed === undefined) {
                clearInterval(interval);
              }
            }, 100);
          };
        }],
        viewTemplate: 'formio/componentsView/button.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/button.html',
        "<button type=\"{{component.action == 'submit' || component.action == 'reset' ? component.action : 'button'}}\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  ng-class=\"{'btn-block': component.block}\"\n  class=\"btn btn-{{ component.theme }} btn-{{ component.size }}\"\n  ng-disabled=\"readOnly || formioForm.submitting || (component.disableOnInvalid && formioForm.$invalid)\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-click=\"$emit('buttonClick', component, componentId)\">\n  <span ng-if=\"component.leftIcon\" class=\"{{ component.leftIcon }}\" aria-hidden=\"true\"></span>\n  <span ng-if=\"component.leftIcon && component.label\">&nbsp;</span>{{ component.label | formioTranslate }}<span ng-if=\"component.rightIcon && component.label\">&nbsp;</span>\n  <span ng-if=\"component.rightIcon\" class=\"{{ component.rightIcon }}\" aria-hidden=\"true\"></span>\n   <i ng-if=\"component.action == 'submit' && formioForm.submitting\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\n</button>\n"
      );

      $templateCache.put('formio/componentsView/button.html',
        ""
      );
    }
  ]);
};

},{}],14:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('checkbox', {
        title: 'Check Box',
        template: 'formio/components/checkbox.html',
        tableView: function(data) {
          return data ? 'Yes' : 'No';
        },
        controller: ['$scope', function($scope) {
          // FA-850 - Ensure the checked value is always a boolen object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            var boolean = {
              true: true,
              false: false
            };
            if ($scope.data && $scope.data[$scope.component.key] && !($scope.data[$scope.component.key] instanceof Boolean)) {
              $scope.data[$scope.component.key] = boolean[$scope.data[$scope.component.key]] || false;
              loadComplete();
            }
          });
        }],
        settings: {
          input: true,
          inputType: 'checkbox',
          tableView: true,
          // This hides the default label layout so we can use a special inline label
          hideLabel: true,
          label: '',
          key: 'checkboxField',
          defaultValue: false,
          protected: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/checkbox.html',
        "<div class=\"checkbox\">\n  <label for=\"{{ componentId }}\" ng-class=\"{'field-required': component.validate.required}\">\n    <input type=\"{{ component.inputType }}\"\n    id=\"{{ componentId }}\"\n    tabindex=\"{{ component.tabindex || 0 }}\"\n    ng-disabled=\"readOnly\"\n    ng-model=\"data[component.key]\"\n    ng-required=\"component.validate.required\">\n    {{ component.label | formioTranslate }}\n  </label>\n</div>\n"
      );
    }
  ]);
};

},{}],15:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('columns', {
        title: 'Columns',
        template: 'formio/components/columns.html',
        group: 'layout',
        settings: {
          input: false,
          columns: [{components: []}, {components: []}]
        },
        viewTemplate: 'formio/componentsView/columns.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/columns.html',
        "<div class=\"row\">\n  <div class=\"col-sm-6\" ng-repeat=\"column in component.columns track by $index\">\n    <formio-component\n      ng-repeat=\"component in column.components track by $index\"\n      component=\"component\"\n      data=\"data\"\n      formio=\"formio\"\n      formio-form=\"formioForm\"\n      read-only=\"readOnly\"\n      grid-row=\"gridRow\"\n      grid-col=\"gridCol\"\n      ng-if=\"show[column.key || ''] && show[component.key || '']\"\n      show=\"show\"\n    ></formio-component>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/columns.html',
        "<div class=\"row\">\n  <div class=\"col-sm-6\" ng-repeat=\"column in component.columns track by $index\">\n    <formio-component-view ng-repeat=\"component in column.components track by $index\" component=\"component\" data=\"data\" form=\"form\" ignore=\"ignore\"></formio-component-view>\n  </div>\n</div>\n"
      );
    }
  ]);
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(app) {
  app.provider('formioComponents', function() {
    var components = {};
    var groups = {
      __component: {
        title: 'Basic Components'
      },
      advanced: {
        title: 'Special Components'
      },
      layout: {
        title: 'Layout Components'
      }
    };
    return {
      addGroup: function(name, group) {
        groups[name] = group;
      },
      register: function(type, component, group) {
        if (!components[type]) {
          components[type] = component;
        }
        else {
          angular.extend(components[type], component);
        }

        // Set the type for this component.
        if (!components[type].group) {
          components[type].group = group || '__component';
        }
        components[type].settings.type = type;
      },
      $get: function() {
        return {
          components: components,
          groups: groups
        };
      }
    };
  });

  app.directive('safeMultipleToSingle', [function() {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function($scope, el, attrs, ngModel) {
        ngModel.$formatters.push(function(modelValue) {
          if (!$scope.component.multiple && Array.isArray(modelValue)) {
            return modelValue[0] || '';
          }

          return modelValue;
        });
      }
    };
  }]);
};

},{}],17:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('container', {
        title: 'Container',
        template: 'formio/components/container.html',
        viewTemplate: 'formio/componentsView/container.html',
        group: 'layout',
        icon: 'fa fa-folder-open',
        settings: {
          input: true,
          tree: true,
          components: [],
          tableView: true,
          label: '',
          key: 'container',
          protected: false,
          persistent: true
        }
      });
    }
  ]);
  app.controller('formioContainerComponent', [
    '$scope',
    function($scope) {
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || {};
      $scope.parentKey = $scope.component.key;
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/container.html', FormioUtils.fieldWrap(
        "<div ng-controller=\"formioContainerComponent\" class=\"formio-container-component\">\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data[parentKey]\"\n    formio=\"formio\"\n    formio-form=\"formioForm\"\n    read-only=\"readOnly\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    ng-if=\"show[component.key || ''] && show[_component.key || '']\"\n    show=\"show\"\n  ></formio-component>\n</div>\n"
      ));
    }
  ]);
};

},{}],18:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('content', {
        title: 'Content',
        template: 'formio/components/content.html',
        settings: {
          input: false,
          html: ''
        },
        viewTemplate: 'formio/components/content.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/content.html',
        "<div ng-bind-html=\"component.html | safehtml | formioTranslate:component.key\" id=\"{{ component.key }}\"></div>\n"
      );
    }
  ]);
};

},{}],19:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.directive('currencyInput', function() {
    // May be better way than adding to prototype.
    var splice = function(string, idx, rem, s) {
      return (string.slice(0, idx) + s + string.slice(idx + Math.abs(rem)));
    };
    return {
      restrict: 'A',
      link: function(scope, element) {
        element.bind('keyup', function() {
          var data = scope.data[scope.component.key];

          //clearing left side zeros
          while (data.charAt(0) === '0') {
            data = data.substr(1);
          }

          data = data.replace(/[^\d.\',']/g, '');

          var point = data.indexOf('.');
          if (point >= 0) {
            data = data.slice(0, point + 3);
          }

          var decimalSplit = data.split('.');
          var intPart = decimalSplit[0];
          var decPart = decimalSplit[1];

          intPart = intPart.replace(/[^\d]/g, '');
          if (intPart.length > 3) {
            var intDiv = Math.floor(intPart.length / 3);
            while (intDiv > 0) {
              var lastComma = intPart.indexOf(',');
              if (lastComma < 0) {
                lastComma = intPart.length;
              }

              if (lastComma - 3 > 0) {
                intPart = splice(intPart, lastComma - 3, 0, ',');
              }
              intDiv--;
            }
          }

          if (decPart === undefined) {
            decPart = '';
          }
          else {
            decPart = '.' + decPart;
          }
          var res = intPart + decPart;
          scope.$apply(function() {
            scope.data[scope.component.key] = res;
          });
        });
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('currency', {
        title: 'Currency',
        template: 'formio/components/currency.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: '',
          key: 'currencyField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          persistent: true,
          validate: {
            required: false,
            multiple: '',
            custom: ''
          },
          conditional: {
            show: null,
            when: null,
            eq: ''
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/currency.html', FormioUtils.fieldWrap(
        "<input type=\"{{ component.inputType }}\"\nclass=\"form-control\"\nid=\"{{ componentId }}\"\nname=\"{{ componentId }}\"\ntabindex=\"{{ component.tabindex || 0 }}\"\nng-model=\"data[component.key]\"\nng-required=\"component.validate.required\"\nng-disabled=\"readOnly\"\nsafe-multiple-to-single\nplaceholder=\"{{ component.placeholder }}\"\ncustom-validator=\"component.validate.custom\"\ncurrency-input\nui-mask-placeholder=\"\"\nui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],20:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('custom', {
        title: 'Custom',
        template: 'formio/components/custom.html',
        group: 'advanced',
        settings: {}
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/custom.html',
        "<div class=\"panel panel-default\">\n  <div class=\"panel-body text-muted text-center\">\n    Custom Component ({{ component.type }})\n  </div>\n</div>\n"
      );
    }
  ]);
};

},{}],21:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datagrid', {
        title: 'Data Grid',
        template: 'formio/components/datagrid.html',
        group: 'advanced',
        tableView: function(data, component, $interpolate, componentInfo) {
          var view = '<table class="table table-striped table-bordered"><thead><tr>';
          angular.forEach(component.components, function(component) {
            view += '<th>' + component.label + '</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          angular.forEach(data, function(row) {
            view += '<tr>';
            angular.forEach(component.components, function(component) {
              var info = componentInfo.components.hasOwnProperty(component.type) ? componentInfo.components[component.type] : {};
              if (info.tableView) {
                view += '<td>' + info.tableView(row[component.key] || '', component, $interpolate, componentInfo) + '</td>';
              }
              else {
                view += '<td>';
                if (component.prefix) {
                  view += component.prefix;
                }
                view += row[component.key] || '';
                if (component.suffix) {
                  view += ' ' + component.suffix;
                }
                view += '</td>';
              }
            });
            view += '</tr>';
          });
          view += '</tbody></table>';
          return view;
        },
        settings: {
          input: true,
          tree: true,
          components: [],
          tableView: true,
          label: '',
          key: 'datagrid',
          protected: false,
          persistent: true
        }
      });
    }
  ]);
  app.controller('formioDataGrid', [
    '$scope',
    function($scope) {
      // Ensure each data grid has a valid data model.
      $scope.data = $scope.data || {};
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [{}];

      // Pull out the rows and cols for easy iteration.
      $scope.rows = $scope.data[$scope.component.key];
      $scope.cols = $scope.component.components;
      $scope.localKeys = $scope.component.components.map(function(component) {
        return component.key;
      });

      // Add a row the to grid.
      $scope.addRow = function() {
        if (!Array.isArray($scope.rows)) {
          $scope.rows = [];
        }
        $scope.rows.push({});
      };

      // Remove a row from the grid.
      $scope.removeRow = function(index) {
        $scope.rows.splice(index, 1);
      };
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/datagrid.html', FormioUtils.fieldWrap(
        "<div class=\"formio-data-grid\" ng-controller=\"formioDataGrid\" ng-if=\"show[component.key || '']\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table datagrid-table\">\n    <tr>\n      <th ng-repeat=\"col in cols track by $index\" ng-if=\"show[col.key || ''] || localKeys.indexOf(col.conditional.when) !== -1\" ng-class=\"{'field-required': col.validate.required}\">{{ col.label | formioTranslate }}</th>\n    </tr>\n    <tr ng-repeat=\"row in rows track by $index\" ng-init=\"rowIndex = $index\">\n      <td ng-repeat=\"col in cols track by $index\" ng-init=\"col.hideLabel = true; colIndex = $index\" class=\"formio-data-grid-row\">\n        <formio-component\n          ng-if=\"(localKeys.indexOf(col.conditional.when) === -1 && show[col.key || '']) || checkConditional(col.key, row)\"\n          component=\"col\"\n          data=\"rows[rowIndex]\"\n          formio-form=\"formioForm\"\n          formio=\"formio\"\n          read-only=\"readOnly || col.disabled\"\n          grid-row=\"rowIndex\"\n          grid-col=\"colIndex\"\n          show=\"show\"\n        ></formio-component>\n      </td>\n      <td>\n        <a ng-click=\"removeRow(rowIndex)\" class=\"btn btn-default\">\n          <span class=\"glyphicon glyphicon-remove-circle\"></span>\n        </a>\n      </td>\n    </tr>\n  </table>\n  <div class=\"datagrid-add\">\n    <a ng-click=\"addRow()\" class=\"btn btn-primary\">\n      <span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> {{ component.addAnother || \"Add Another\" | formioTranslate}}\n    </a>\n  </div>\n</div>\n"
      ));
    }
  ]);
};

},{}],22:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datetime', {
        title: 'Date / Time',
        template: 'formio/components/datetime.html',
        tableView: function(data, component, $interpolate) {
          return $interpolate('<span>{{ "' + data + '" | date: "' + component.format + '" }}</span>')();
        },
        group: 'advanced',
        controller: ['$scope', '$timeout', function($scope, $timeout) {
          // Ensure the date value is always a date object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            if ($scope.data && $scope.data[$scope.component.key] && !($scope.data[$scope.component.key] instanceof Date)) {
              $scope.data[$scope.component.key] = new Date($scope.data[$scope.component.key]);
              loadComplete();
            }
          });

          if (!$scope.component.maxDate) {
            delete $scope.component.maxDate;
          }
          if (!$scope.component.minDate) {
            delete $scope.component.minDate;
          }

          $scope.autoOpen = true;
          $scope.onClosed = function() {
            $scope.autoOpen = false;
            $timeout(function() {
              $scope.autoOpen = true;
            }, 250);
          };
        }],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'datetimeField',
          placeholder: '',
          format: 'yyyy-MM-dd HH:mm',
          enableDate: true,
          enableTime: true,
          minDate: null,
          maxDate: null,
          datepickerMode: 'day',
          datePicker: {
            showWeeks: true,
            startingDay: 0,
            initDate: '',
            minMode: 'day',
            maxMode: 'year',
            yearRange: '20'
          },
          timePicker: {
            hourStep: 1,
            minuteStep: 1,
            showMeridian: true,
            readonlyInput: false,
            mousewheel: true,
            arrowkeys: true
          },
          protected: false,
          persistent: true,
          validate: {
            required: false,
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/datetime.html', FormioUtils.fieldWrap(
        "<div class=\"input-group\">\n  <input type=\"text\" class=\"form-control\"\n  name=\"{{ componentId }}\"\n  id=\"{{ componentId }}\"\n  ng-focus=\"calendarOpen = autoOpen\"\n  ng-click=\"calendarOpen = true\"\n  ng-init=\"calendarOpen = false\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"component.validate.required\"\n  is-open=\"calendarOpen\"\n  datetime-picker=\"{{ component.format }}\"\n  min-date=\"component.minDate\"\n  max-date=\"component.maxDate\"\n  datepicker-mode=\"component.datepickerMode\"\n  when-closed=\"onClosed()\"\n  enable-date=\"component.enableDate\"\n  enable-time=\"component.enableTime\"\n  ng-model=\"data[component.key]\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  placeholder=\"{{ component.placeholder | formioTranslate }}\"\n  datepicker-options=\"component.datePicker\"\n  timepicker-options=\"component.timePicker\" />\n  <span class=\"input-group-btn\">\n    <button type=\"button\" ng-disabled=\"readOnly\" class=\"btn btn-default\" ng-click=\"calendarOpen = true\">\n      <i ng-if=\"component.enableDate\" class=\"glyphicon glyphicon-calendar\"></i>\n      <i ng-if=\"!component.enableDate\" class=\"glyphicon glyphicon-time\"></i>\n    </button>\n  </span>\n</div>\n"
      ));
    }
  ]);
};

},{}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('email', {
        title: 'Email',
        template: 'formio/components/textfield.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          inputType: 'email',
          label: '',
          key: 'emailField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          kickbox: {
            enabled: false
          }
        }
      });
    }
  ]);
};

},{}],24:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('fieldset', {
        title: 'Field Set',
        template: 'formio/components/fieldset.html',
        group: 'layout',
        settings: {
          input: false,
          tableView: true,
          legend: '',
          components: []
        },
        viewTemplate: 'formio/componentsView/fieldset.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/fieldset.html',
        "<fieldset id=\"{{ component.key }}\">\n  <legend ng-if=\"component.legend\">{{ component.legend | formioTranslate }}</legend>\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    formio=\"formio\"\n    read-only=\"readOnly\"\n    formio-form=\"formioForm\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    ng-if=\"show[component.key || ''] && show[_component.key || '']\"\n    show=\"show\"\n  ></formio-component>\n</fieldset>\n"
      );

      $templateCache.put('formio/componentsView/fieldset.html',
        "<fieldset id=\"{{ component.key }}\">\n  <legend ng-if=\"component.legend\">{{ component.legend }}</legend>\n  <formio-component-view ng-repeat=\"component in component.components track by $index\" component=\"component\" data=\"data\" form=\"form\" ignore=\"ignore\"></formio-component-view>\n</fieldset>\n"
      );
    }
  ]);
};

},{}],25:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('file', {
        title: 'File',
        template: 'formio/components/file.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'file',
          placeholder: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true
        },
        viewTemplate: 'formio/componentsView/file.html'
      });
    }
  ]);

  app.directive('formioFileList', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        files: '=',
        form: '=',
        readOnly: '='
      },
      templateUrl: 'formio/components/formio-file-list.html',
      controller: [
        '$scope',
        function($scope) {
          $scope.removeFile = function(event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
          };

          $scope.fileSize = function(a, b, c, d, e) {
            return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes');
          };
        }
      ]
    };
  }]);

  app.directive('formioFile', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        file: '=',
        form: '='
      },
      template: '<a href="{{ file.url }}" ng-click="getFile($event)" target="_blank">{{ file.name }}</a>',
      controller: [
        '$window',
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $window,
          $rootScope,
          $scope,
          Formio
        ) {
          $scope.getFile = function(evt) {
            evt.preventDefault();
            $scope.form = $scope.form || $rootScope.filePath;
            var formio = new Formio($scope.form);
            formio
              .downloadFile($scope.file).then(function(file) {
                if (file) {
                  $window.open(file.url, '_blank');
                }
              })
              .catch(function(response) {
                // Is alert the best way to do this?
                // User is expecting an immediate notification due to attempting to download a file.
                alert(response);
              });
          };
        }
      ]
    };
  }]);

  app.directive('formioImage', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        file: '=',
        form: '='
      },
      template: '<img ng-src="{{ imageSrc }}" alt="{{ file.name }}" />',
      controller: [
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $rootScope,
          $scope,
          Formio
        ) {
          $scope.form = $scope.form || $rootScope.filePath;
          var formio = new Formio($scope.form);

          formio.downloadFile($scope.file)
            .then(function(result) {
              $scope.imageSrc = result.url;
              $scope.$apply();
            });
        }
      ]
    };
  }]);

  app.controller('formioFileUpload', [
    '$scope',
    'FormioUtils',
    function(
      $scope,
      FormioUtils
    ) {
      $scope.fileUploads = {};

      $scope.removeUpload = function(index) {
        delete $scope.fileUploads[index];
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data && $scope.data[$scope.component.key] === '') {
        $scope.data[$scope.component.key] = [];
      }
      if ($scope.data && $scope.data[$scope.component.key] && $scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          angular.forEach(files, function(file) {
            // Get a unique name for this file to keep file collisions from occurring.
            var fileName = FormioUtils.uniqueName(file.name);
            $scope.fileUploads[fileName] = {
              name: fileName,
              size: file.size,
              status: 'info',
              message: 'Starting upload'
            };
            var dir = $scope.component.dir || '';
            $scope.formio.uploadFile($scope.component.storage, file, fileName, dir, function processNotify(evt) {
              $scope.fileUploads[fileName].status = 'progress';
              $scope.fileUploads[fileName].progress = parseInt(100.0 * evt.loaded / evt.total);
              delete $scope.fileUploads[fileName].message;
              $scope.$apply();
            })
              .then(function(fileInfo) {
                delete $scope.fileUploads[fileName];
                // Ensure that the file component is an array.
                if (
                  !$scope.data[$scope.component.key] ||
                  !($scope.data[$scope.component.key] instanceof Array)
                ) {
                  $scope.data[$scope.component.key] = [];
                }
                $scope.data[$scope.component.key].push(fileInfo);
                $scope.$apply();
              })
              .catch(function(response) {
                $scope.fileUploads[fileName].status = 'error';
                $scope.fileUploads[fileName].message = response.data;
                delete $scope.fileUploads[fileName].progress;
                $scope.$apply();
              });
          });
        }
      };
    }
  ]);
  app.run([
    '$templateCache',
    function(
      $templateCache
    ) {
      $templateCache.put('formio/components/formio-file-list.html',
        "<table class=\"table table-striped table-bordered\">\n  <thead>\n    <tr>\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"></td>\n      <th>File Name</th>\n      <th>Size</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat=\"file in files track by $index\">\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"><a ng-if=\"!readOnly\" href=\"#\" ng-click=\"removeFile($event, $index)\" style=\"padding: 2px 4px;\" class=\"btn btn-sm btn-default\"><span class=\"glyphicon glyphicon-remove\"></span></a></td>\n      <td><formio-file file=\"file\" form=\"form\"></formio-file></td>\n      <td>{{ fileSize(file.size) }}</td>\n    </tr>\n  </tbody>\n</table>\n"
      );

      $templateCache.put('formio/components/file.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate }}</label>\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<div ng-controller=\"formioFileUpload\">\n  <formio-file-list files=\"data[component.key]\" form=\"formio.formUrl\"></formio-file-list>\n  <div ng-if=\"!readOnly && (component.multiple || (!component.multiple && !data[component.key].length))\">\n    <div ngf-drop=\"upload($files)\" class=\"fileSelector\" ngf-drag-over-class=\"'fileDragOver'\" ngf-multiple=\"component.multiple\" id=\"{{ componentId }}\" name=\"{{ componentId }}\"><span class=\"glyphicon glyphicon-cloud-upload\"></span>Drop files to attach, or <a style=\"cursor: pointer;\" ngf-select=\"upload($files)\" tabindex=\"{{ component.tabindex || 0 }}\" ngf-multiple=\"component.multiple\">browse</a>.</div>\n    <div ng-if=\"!component.storage\" class=\"alert alert-warning\">No storage has been set for this field. File uploads are disabled until storage is set up.</div>\n    <div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>\n  </div>\n  <div ng-repeat=\"fileUpload in fileUploads track by $index\" ng-class=\"{'has-error': fileUpload.status === 'error'}\" class=\"file\">\n    <div class=\"row\">\n      <div class=\"fileName control-label col-sm-10\">{{ fileUpload.name }} <span ng-click=\"removeUpload(fileUpload.name)\" class=\"glyphicon glyphicon-remove\"></span></div>\n      <div class=\"fileSize control-label col-sm-2 text-right\">{{ fileSize(fileUpload.size) }}</div>\n    </div>\n    <div class=\"row\">\n      <div class=\"col-sm-12\">\n        <span ng-if=\"fileUpload.status === 'progress'\">\n          <div class=\"progress\">\n            <div class=\"progress-bar\" role=\"progressbar\" aria-valuenow=\"{{fileUpload.progress}}\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width:{{fileUpload.progress}}%\">\n              <span class=\"sr-only\">{{fileUpload.progress}}% Complete</span>\n            </div>\n          </div>\n        </span>\n        <div ng-if=\"!fileUpload.status !== 'progress'\" class=\"bg-{{ fileUpload.status }} control-label\">{{ fileUpload.message }}</div>\n      </div>\n    </div>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/file.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate }}</label>\n<div ng-controller=\"formioFileUpload\">\n  <formio-file-list files=\"data[component.key]\" form=\"formUrl\" read-only=\"true\"></formio-file-list>\n</div>\n"
      );
    }
  ]);
};

},{}],26:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('hidden', {
        title: 'Hidden',
        template: 'formio/components/hidden.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          key: 'hiddenField',
          label: '',
          protected: false,
          unique: false,
          persistent: true
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/hidden.html',
        "<input type=\"hidden\" id=\"{{ componentId }}\" name=\"{{ componentId }}\" ng-model=\"data[component.key]\">\n"
      );
    }
  ]);
};

},{}],27:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.directive('formioHtmlElement', [
    '$sanitize',
    '$filter',
    function($sanitize, $filter) {
      return {
        restrict: 'E',
        scope: {
          component: '='
        },
        templateUrl: 'formio/components/htmlelement-directive.html',
        link: function($scope) {
          var createElement = function() {
            var element = angular.element(
              '<' + $scope.component.tag + '>' + '</' + $scope.component.tag + '>'
            );

            element.html($filter('formioTranslate')($scope.component.content));

            element.attr('class', $scope.component.className);
            angular.forEach($scope.component.attrs, function(attr) {
              if (!attr.attr) return;
              element.attr(attr.attr, attr.value);
            });

            try {
              $scope.html = $sanitize(element.prop('outerHTML'));
              $scope.parseError = null;
            }
            catch (err) {
              // Isolate the message and store it.
              $scope.parseError = err.message
              .split('\n')[0]
              .replace('[$sanitize:badparse]', '');
            }
          };

          createElement();

          $scope.$watch('component', createElement, true);
        }
      };
  }]);

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('htmlelement', {
        title: 'HTML Element',
        template: 'formio/components/htmlelement.html',
        settings: {
          input: false,
          tag: 'p',
          attrs: [],
          className: '',
          content: ''
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/htmlelement.html',
        '<formio-html-element component="component"></div>'
      );

      $templateCache.put('formio/components/htmlelement-directive.html',
        "<div id=\"{{ component.key }}\">\n  <div class=\"alert alert-warning\" ng-if=\"parseError\">{{ parseError }}</div>\n  <div ng-bind-html=\"html\"></div>\n</div>\n"
      );
    }
  ]);
};

},{}],28:[function(_dereq_,module,exports){
"use strict";
var app = angular.module('formio');

// Basic
_dereq_('./components')(app);
_dereq_('./textfield')(app);
_dereq_('./number')(app);
_dereq_('./password')(app);
_dereq_('./textarea')(app);
_dereq_('./checkbox')(app);
_dereq_('./selectboxes')(app);
_dereq_('./select')(app);
_dereq_('./radio')(app);
_dereq_('./htmlelement')(app);
_dereq_('./content')(app);
_dereq_('./button')(app);

// Special
_dereq_('./email')(app);
_dereq_('./phonenumber')(app);
_dereq_('./address')(app);
_dereq_('./datetime')(app);
_dereq_('./currency')(app);
_dereq_('./hidden')(app);
_dereq_('./resource')(app);
_dereq_('./file')(app);
_dereq_('./signature')(app);
_dereq_('./custom')(app);
_dereq_('./datagrid')(app);
_dereq_('./survey')(app);

// Layout
_dereq_('./columns')(app);
_dereq_('./fieldset')(app);
_dereq_('./container')(app);
_dereq_('./page')(app);
_dereq_('./panel')(app);
_dereq_('./table')(app);
_dereq_('./well')(app);

},{"./address":12,"./button":13,"./checkbox":14,"./columns":15,"./components":16,"./container":17,"./content":18,"./currency":19,"./custom":20,"./datagrid":21,"./datetime":22,"./email":23,"./fieldset":24,"./file":25,"./hidden":26,"./htmlelement":27,"./number":29,"./page":30,"./panel":31,"./password":32,"./phonenumber":33,"./radio":34,"./resource":35,"./select":36,"./selectboxes":37,"./signature":38,"./survey":39,"./table":40,"./textarea":41,"./textfield":42,"./well":43}],29:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      var isNumeric = function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      };
      formioComponentsProvider.register('number', {
        title: 'Number',
        template: 'formio/components/number.html',
        settings: {
          input: true,
          tableView: true,
          inputType: 'number',
          label: '',
          key: 'numberField',
          placeholder: '',
          prefix: '',
          suffix: '',
          defaultValue: 0,
          protected: false,
          persistent: true,
          validate: {
            required: false,
            min: '',
            max: '',
            step: 'any',
            integer: '',
            multiple: '',
            custom: ''
          }
        },
        controller: ['$scope', function($scope) {
          // Ensure that values are numbers.
          if ($scope.data.hasOwnProperty($scope.component.key) && isNumeric($scope.data[$scope.component.key])) {
            $scope.data[$scope.component.key] = parseFloat($scope.data[$scope.component.key]);
          }
        }]
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/number.html', FormioUtils.fieldWrap(
        "<input type=\"{{ component.inputType }}\"\nclass=\"form-control\"\nid=\"{{ componentId }}\"\nname=\"{{ componentId }}\"\ntabindex=\"{{ component.tabindex || 0 }}\"\nng-model=\"data[component.key]\"\nng-required=\"component.validate.required\"\nng-disabled=\"readOnly\"\nsafe-multiple-to-single\nmin=\"{{ component.validate.min }}\"\nmax=\"{{ component.validate.max }}\"\nstep=\"{{ component.validate.step }}\"\nplaceholder=\"{{ component.placeholder | formioTranslate }}\"\ncustom-validator=\"component.validate.custom\"\nui-mask=\"{{ component.inputMask }}\"\nui-mask-placeholder=\"\"\nui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],30:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('page', {
        template: 'formio/components/page.html',
        settings: {
          input: false,
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/page.html',
        "<formio-component ng-repeat=\"component in component.components track by $index\" component=\"component\" data=\"data\" formio=\"formio\" formio-form=\"formioForm\" grid-row=\"gridRow\" grid-col=\"gridCol\"></formio-component>\n"
      );
    }
  ]);
};

},{}],31:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('panel', {
        title: 'Panel',
        template: 'formio/components/panel.html',
        group: 'layout',
        settings: {
          input: false,
          title: '',
          theme: 'default',
          components: []
        },
        viewTemplate: 'formio/componentsView/panel.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/panel.html',
        "<div class=\"panel panel-{{ component.theme }}\" id=\"{{ component.key }}\">\n  <div ng-if=\"component.title\" class=\"panel-heading\">\n    <h3 class=\"panel-title\">{{ component.title | formioTranslate }}</h3>\n  </div>\n  <div class=\"panel-body\">\n    <formio-component\n      ng-repeat=\"_component in component.components track by $index\"\n      component=\"_component\"\n      data=\"data\"\n      formio=\"formio\"\n      read-only=\"readOnly\"\n      formio-form=\"formioForm\"\n      grid-row=\"gridRow\"\n      grid-col=\"gridCol\"\n      ng-if=\"show[component.key || ''] && show[_component.key || '']\"\n      show=\"show\"\n    ></formio-component>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/panel.html',
        "<div class=\"panel panel-{{ component.theme }}\" id=\"{{ component.key }}\">\n  <div ng-if=\"component.title\" class=\"panel-heading\">\n    <h3 class=\"panel-title\">{{ component.title }}</h3>\n  </div>\n  <div class=\"panel-body\">\n    <formio-component-view ng-repeat=\"component in component.components track by $index\" component=\"component\" data=\"data\" form=\"form\" ignore=\"ignore\"></formio-component-view>\n  </div>\n</div>\n"
      );
    }
  ]);
};

},{}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('password', {
        title: 'Password',
        template: 'formio/components/textfield.html',
        tableView: function() {
          return '--- PROTECTED ---';
        },
        settings: {
          input: true,
          tableView: false,
          inputType: 'password',
          label: '',
          key: 'passwordField',
          placeholder: '',
          prefix: '',
          suffix: '',
          protected: true,
          persistent: true
        }
      });
    }
  ]);
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('phoneNumber', {
        title: 'Phone Number',
        template: 'formio/components/textfield.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          inputMask: '(999) 999-9999',
          label: '',
          key: 'phonenumberField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          defaultValue: '',
          validate: {
            required: false
          }
        }
      });
    }
  ]);
};

},{}],34:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('radio', {
        title: 'Radio',
        template: 'formio/components/radio.html',
        tableView: function(data, component) {
          for (var i in component.values) {
            if (component.values[i].value === data) {
              return component.values[i].label;
            }
          }
          return data;
        },
        settings: {
          input: true,
          tableView: true,
          inputType: 'radio',
          label: '',
          key: 'radioField',
          values: [],
          defaultValue: '',
          protected: false,
          persistent: true,
          validate: {
            required: false,
            custom: '',
            customPrivate: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/radio.html', FormioUtils.fieldWrap(
        "<ng-form name=\"{{ componentId }}\" ng-model=\"data[component.key]\" custom-validator=\"component.validate.custom\">\n  <div ng-class=\"component.inline ? 'radio-inline' : 'radio'\" ng-repeat=\"v in component.values track by $index\">\n    <label class=\"control-label\" for=\"{{ componentId }}-{{ v.value }}\">\n      <input type=\"{{ component.inputType }}\"\n             id=\"{{ componentId }}-{{ v.value }}\"\n             value=\"{{ v.value }}\"\n             tabindex=\"{{ component.tabindex || 0 }}\"\n             ng-model=\"data[component.key]\"\n             ng-required=\"component.validate.required\"\n             ng-disabled=\"readOnly\">\n\n      {{ v.label | formioTranslate }}\n    </label>\n  </div>\n</ng-form>\n"
      ));
    }
  ]);
};

},{}],35:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('resource', {
        title: 'Resource',
        tableView: function(data, component, $interpolate) {
          if ($interpolate) {
            return $interpolate(component.template)({item: data});
          }

          return data ? data._id : '';
        },
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/resource-multiple.html' : 'formio/components/resource.html';
        },
        controller: ['$scope', 'Formio', function($scope, Formio) {
          var settings = $scope.component;
          var params = settings.params || {};
          $scope.selectItems = [];
          $scope.hasNextPage = false;
          $scope.resourceLoading = false;
          params.limit = 100;
          params.skip = 0;
          if (settings.multiple) {
            settings.defaultValue = [];
          }
          if (settings.resource) {
            var url = '';
            if (settings.project) {
              url += '/project/' + settings.project;
            }
            else if ($scope.formio && $scope.formio.projectUrl) {
              url += $scope.formio.projectUrl;
            }
            url += '/form/' + settings.resource;
            var formio = new Formio(url);

            // Refresh the items.
            $scope.refreshSubmissions = function(input, append) {
              if ($scope.resourceLoading) {
                return;
              }
              $scope.resourceLoading = true;
              // If they wish to return only some fields.
              if (settings.selectFields) {
                params.select = settings.selectFields;
              }
              if (settings.searchFields && input) {
                angular.forEach(settings.searchFields, function(field) {
                  params[field] = input;
                });
              }

              // Load the submissions.
              formio.loadSubmissions({
                params: params
              }).then(function(submissions) {
                submissions = submissions || [];
                if (append) {
                  $scope.selectItems = $scope.selectItems.concat(submissions);
                }
                else {
                  $scope.selectItems = submissions;
                }
                $scope.hasNextPage = (submissions.length >= params.limit) && ($scope.selectItems.length < submissions.serverCount);
              })['finally'](function() {
                $scope.resourceLoading = false;
              });
            };

            // Load more items.
            $scope.loadMoreItems = function($select, $event) {
              $event.stopPropagation();
              $event.preventDefault();
              params.skip += params.limit;
              $scope.refreshSubmissions(null, true);
            };

            $scope.refreshSubmissions();
          }
        }],
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'resourceField',
          placeholder: '',
          resource: '',
          project: '',
          defaultValue: '',
          template: '<span>{{ item.data }}</span>',
          selectFields: '',
          searchFields: '',
          multiple: false,
          protected: false,
          persistent: true,
          validate: {
            required: false
          },
          defaultPermission: ''
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/resource.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate}}</label>\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select ui-select-required safe-multiple-to-single ui-select-open-on-focus ng-model=\"data[component.key]\" ng-disabled=\"readOnly\" ng-required=\"component.validate.required\" id=\"{{ componentId }}\" name=\"{{ componentId }}\" theme=\"bootstrap\" tabindex=\"{{ component.tabindex || 0 }}\">\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate }}\">\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\n  </ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"item in selectItems | filter: $select.search\" refresh=\"refreshSubmissions($select.search)\" refresh-delay=\"250\">\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\n    <button ng-if=\"hasNextPage && ($index == $select.items.length-1)\" class=\"btn btn-success btn-block\" ng-click=\"loadMoreItems($select, $event)\" ng-disabled=\"resourceLoading\">Load more...</button>\n  </ui-select-choices>\n</ui-select>\n<formio-errors></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/resource-multiple.html',
        $templateCache.get('formio/components/resource.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],36:[function(_dereq_,module,exports){
"use strict";
/*eslint max-depth: ["error", 6]*/

module.exports = function(app) {
  app.directive('formioSelectItem', [
    '$compile',
    function($compile) {
      return {
        restrict: 'E',
        scope: {
          template: '=',
          item: '=',
          select: '='
        },
        link: function(scope, element) {
          if (scope.template) {
            element.html($compile(angular.element(scope.template))(scope));
          }
        }
      };
    }
  ]);

  app.directive('uiSelectRequired', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function(value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

  // A directive to have ui-select open on focus
  app.directive('uiSelectOpenOnFocus', ['$timeout', function($timeout) {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function($scope, el, attrs, uiSelect) {
        var autoopen = true;

        angular.element(uiSelect.focusser).on('focus', function() {
          if (autoopen) {
            uiSelect.activate();
          }
        });

        // Disable the auto open when this select element has been activated.
        $scope.$on('uis:activate', function() {
          autoopen = false;
        });

        // Re-enable the auto open after the select element has been closed
        $scope.$on('uis:close', function() {
          autoopen = false;
          $timeout(function() {
            autoopen = true;
          }, 250);
        });
      }
    };
  }]);

  // Configure the Select component.
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('select', {
        title: 'Select',
        template: function($scope) {
          return $scope.component.multiple ? 'formio/components/select-multiple.html' : 'formio/components/select.html';
        },
        tableView: function(data, component, $interpolate) {
          var getItem = function(data) {
            switch (component.dataSrc) {
              case 'values':
                component.data.values.forEach(function(item) {
                  if (item.value === data) {
                    data = item;
                  }
                });
                return data;
              case 'json':
                if (component.valueProperty) {
                  var selectItems;
                  try {
                    selectItems = angular.fromJson(component.data.json);
                  }
                  catch (error) {
                    selectItems = [];
                  }
                  selectItems.forEach(function(item) {
                    if (item[component.valueProperty] === data) {
                      data = item;
                    }
                  });
                }
                return data;
              // TODO: implement url and resource view.
              case 'url':
              case 'resource':
              default:
                return data;
            }
          };
          if (component.multiple && Array.isArray(data)) {
            return data.map(getItem).reduce(function(prev, item) {
              var value;
              if (typeof item === 'object') {
                value = $interpolate(component.template)({item: item});
              }
              else {
                value = item;
              }
              return (prev === '' ? '' : ', ') + value;
            }, '');
          }
          else {
            var item = getItem(data);
            var value;
            if (typeof item === 'object') {
              value = $interpolate(component.template)({item: item});
            }
            else {
              value = item;
            }
            return value;
          }
        },
        controller: ['$rootScope', '$scope', '$http', 'Formio', '$interpolate', function($rootScope, $scope, $http, Formio, $interpolate) {
          var settings = $scope.component;
          var options = {cache: true};
          $scope.nowrap = true;
          $scope.hasNextPage = false;
          $scope.selectItems = [];
          var selectValues = $scope.component.selectValues;
          var valueProp = $scope.component.valueProperty;
          $scope.getSelectItem = function(item) {
            if (!item) {
              return '';
            }
            if (settings.dataSrc === 'values') {
              return item.value;
            }

            // Allow dot notation in the value property.
            if (valueProp.indexOf('.') !== -1) {
              var parts = valueProp.split('.');
              var prop = item;
              for (var i in parts) {
                prop = prop[parts[i]];
              }
              return prop;
            }

            return valueProp ? item[valueProp] : item;
          };

          if (settings.multiple) {
            settings.defaultValue = [];
          }

          $scope.refreshItems = angular.noop;
          $scope.$on('refreshList', function(event, url, input) {
            $scope.refreshItems(input, url);
          });

          // Add a watch if they wish to refresh on selection of another field.
          if (settings.refreshOn) {
            $scope.$watch('data.' + settings.refreshOn, function() {
              $scope.refreshItems();
            });
          }

          switch (settings.dataSrc) {
            case 'values':
              $scope.selectItems = settings.data.values;
              break;
            case 'json':
              try {
                $scope.selectItems = angular.fromJson(settings.data.json);

                if (selectValues) {
                  // Allow dot notation in the selectValue property.
                  if (selectValues.indexOf('.') !== -1) {
                    var parts = selectValues.split('.');
                    var select = $scope.selectItems;
                    for (var i in parts) {
                      select = select[parts[i]];
                    }
                    $scope.selectItems = select;
                  }
                  else {
                    $scope.selectItems = $scope.selectItems[selectValues];
                  }
                }
              }
              catch (error) {
                $scope.selectItems = [];
              }
              break;
            case 'url':
            case 'resource':
              var url = '';
              if (settings.dataSrc === 'url') {
                url = settings.data.url;
                if (url.substr(0, 1) === '/') {
                  url = Formio.getBaseUrl() + settings.data.url;
                }

                // Disable auth for outgoing requests.
                if (!settings.authenticate && url.indexOf(Formio.getBaseUrl()) === -1) {
                  options = {
                    disableJWT: true,
                    headers: {
                      Authorization: undefined,
                      Pragma: undefined,
                      'Cache-Control': undefined
                    }
                  };
                }
              }
              else {
                url = Formio.getBaseUrl();
                if (settings.data.project) {
                  url += '/project/' + settings.data.project;
                }
                url += '/form/' + settings.data.resource + '/submission';
              }

              options.params = {
                limit: 100,
                skip: 0
              };

              $scope.loadMoreItems = function($select, $event) {
                $event.stopPropagation();
                $event.preventDefault();
                options.params.skip += options.params.limit;
                $scope.refreshItems(null, null, true);
              };

              if (url) {
                $scope.selectLoading = false;
                $scope.hasNextPage = true;
                $scope.refreshItems = function(input, newUrl, append) {
                  newUrl = newUrl || url;
                  newUrl = $interpolate(newUrl)({
                    data: $scope.data,
                    formioBase: $rootScope.apiBase || 'https://api.form.io'
                  });
                  if (!newUrl) {
                    return;
                  }

                  // Do not want to call if it is already loading.
                  if ($scope.selectLoading) {
                    return;
                  }

                  // If this is a search, then add that to the filter.
                  if (settings.searchField && input) {
                    newUrl += ((newUrl.indexOf('?') === -1) ? '?' : '&') +
                      encodeURIComponent(settings.searchField) +
                      '=' +
                      encodeURIComponent(input);
                  }

                  // Add the other filter.
                  if (settings.filter) {
                    var filter = $interpolate(settings.filter)({data: $scope.data});
                    newUrl += ((newUrl.indexOf('?') === -1) ? '?' : '&') + filter;
                  }

                  // If they wish to return only some fields.
                  if (settings.selectFields) {
                    options.params.select = settings.selectFields;
                  }

                  // Set the new result.
                  var setResult = function(data) {
                    // coerce the data into an array.
                    if (!(data instanceof Array)) {
                      data = [data];
                    }

                    if (data.length < options.params.limit) {
                      $scope.hasNextPage = false;
                    }
                    if (append) {
                      $scope.selectItems = $scope.selectItems.concat(data);
                    }
                    else {
                      $scope.selectItems = data;
                    }
                  };

                  $scope.selectLoading = true;
                  $http.get(newUrl, options).then(function(result) {
                    var data = result.data;
                    if (data) {
                      // If the selectValue prop is defined, use it.
                      if (selectValues) {
                        setResult(_.get(data, selectValues, []));
                      }
                      // Attempt to default to the formio settings for a resource.
                      else if (data.hasOwnProperty('data')) {
                        setResult(data.data);
                      }
                      else if (data.hasOwnProperty('items')) {
                        setResult(data.items);
                      }
                      // Use the data itself.
                      else {
                        setResult(data);
                      }
                    }
                  })['finally'](function() {
                    $scope.selectLoading = false;
                  });
                };
                $scope.refreshItems();
              }
              break;
            default:
              $scope.selectItems = [];
          }
        }],
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'selectField',
          placeholder: '',
          data: {
            values: [],
            json: '',
            url: '',
            resource: ''
          },
          dataSrc: 'values',
          valueProperty: '',
          defaultValue: '',
          refreshOn: '',
          filter: '',
          authenticate: false,
          template: '<span>{{ item.label }}</span>',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/select.html',
        "<label ng-if=\"component.label && !component.hideLabel\"  for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate }}</label>\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select\n  ui-select-required\n  ui-select-open-on-focus\n  ng-model=\"data[component.key]\"\n  safe-multiple-to-single\n  name=\"{{ componentId }}\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"component.validate.required\"\n  id=\"{{ componentId }}\"\n  theme=\"bootstrap\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n>\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate }}\">\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\n  </ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"getSelectItem(item) as item in selectItems | filter: $select.search\" refresh=\"refreshItems($select.search)\" refresh-delay=\"250\">\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\n    <button ng-if=\"hasNextPage && ($index == $select.items.length-1)\" class=\"btn btn-success btn-block\" ng-click=\"loadMoreItems($select, $event)\" ng-disabled=\"selectLoading\">Load more...</button>\n  </ui-select-choices>\n</ui-select>\n<formio-errors></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/select-multiple.html',
        $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],37:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.directive('formioSelectBoxes', [function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        componentId: '=',
        readOnly: '=',
        model: '=ngModel',
        gridRow: '=',
        gridCol: '='
      },
      templateUrl: 'formio/components/selectboxes-directive.html',
      link: function($scope, el, attrs, ngModel) {
        // Initialize model
        var model = {};
        angular.forEach($scope.component.values, function(v) {
          model[v.value] = ngModel.$viewValue.hasOwnProperty(v.value)
            ? !!ngModel.$viewValue[v.value]
            : false;
        });
        // FA-835 - Update the view model with our defaults.
        // FA-921 - Attempt to load a current model, if present before the defaults.
        ngModel.$setViewValue($scope.model || model);

        ngModel.$setPristine(true);
        ngModel.$isEmpty = function(value) {
          if (typeof value === 'undefined') {
            return true;
          }

          return Object.keys(value).every(function(key) {
            return !value[key];
          });
        };

        $scope.toggleCheckbox = function(value) {
          var _model = angular.copy(ngModel.$viewValue || {});
          _model[value] = !_model[value];
          ngModel.$setViewValue(_model);
        };
      }
    };
  }]);

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('selectboxes', {
        title: 'Select Boxes',
        template: 'formio/components/selectboxes.html',
        tableView: function(data, component) {
          if (!data) return '';

          return Object.keys(data)
          .filter(function(key) {
            return data[key];
          })
          .map(function(data) {
            component.values.forEach(function(item) {
              if (item.value === data) {
                data = item.label;
              }
            });
            return data;
          })
          .join(', ');
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'selectboxesField',
          values: [],
          inline: false,
          protected: false,
          persistent: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/selectboxes-directive.html',
        "<div class=\"select-boxes\">\n  <div ng-class=\"component.inline ? 'checkbox-inline' : 'checkbox'\" ng-repeat=\"v in component.values track by $index\">\n    <label class=\"control-label\" for=\"{{ componentId }}-{{ v.value }}\">\n      <input type=\"checkbox\"\n        id=\"{{ componentId }}-{{ v.value }}\"\n        name=\"{{ componentId }}-{{ v.value }}\"\n        value=\"{{ v.value }}\"\n        tabindex=\"{{ component.tabindex || 0 }}\"\n        ng-disabled=\"readOnly\"\n        ng-click=\"toggleCheckbox(v.value)\"\n        ng-checked=\"model[v.value]\"\n        grid-row=\"gridRow\"\n        grid-col=\"gridCol\"\n      >\n      {{ v.label | formioTranslate }}\n    </label>\n  </div>\n</div>\n"
      );
      $templateCache.put('formio/components/selectboxes.html',
        "<div class=\"select-boxes\">\n  <label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">\n    {{ component.label }}\n  </label>\n  <formio-select-boxes\n    ng-model=\"data[component.key]\"\n    ng-model-options=\"{allowInvalid: true}\"\n    component=\"component\"\n    component-id=\"componentId\"\n    read-only=\"readOnly\"\n    ng-required=\"component.validate.required\"\n    custom-validator=\"component.validate.custom\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n  ></formio-select-boxes>\n  <formio-errors></formio-errors>\n</div>\n"
      );
    }
  ]);
};

},{}],38:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('signature', {
        title: 'Signature',
        template: 'formio/components/signature.html',
        tableView: function(data) {
          return data ? 'Yes' : 'No';
        },
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'signature',
          placeholder: '',
          footer: 'Sign above',
          width: '100%',
          height: '150',
          penColor: 'black',
          backgroundColor: 'rgb(245,245,235)',
          minWidth: '0.5',
          maxWidth: '2.5',
          protected: false,
          persistent: true,
          validate: {
            required: false
          }
        },
        viewTemplate: 'formio/componentsView/signature.html'
      });
    }
  ]);
  app.directive('signature', function() {
    return {
      restrict: 'A',
      scope: {
        component: '='
      },
      require: '?ngModel',
      link: function(scope, element, attrs, ngModel) {
        if (!ngModel) {
          return;
        }

        // Sets the label of component for error display.
        scope.component.label = 'Signature';
        scope.component.hideLabel = true;

        // Sets the dimension of a width or height.
        var setDimension = function(dim) {
          var param = (dim === 'width') ? 'clientWidth' : 'clientHeight';
          if (scope.component[dim].slice(-1) === '%') {
            var percent = parseFloat(scope.component[dim].slice(0, -1)) / 100;
            element[0][dim] = element.parent().eq(0)[0][param] * percent;
          }
          else {
            element[0][dim] = parseInt(scope.component[dim], 10);
            scope.component[dim] = element[0][dim] + 'px';
          }
        };

        // Reset size if element changes visibility.
        scope.$watch('component.display', function(newDisplay) {
          if (newDisplay) {
            setDimension('width');
            setDimension('height');
          }
        });

        // Set the width and height of the canvas.
        setDimension('width');
        setDimension('height');

        // Create the signature pad.
        /* global SignaturePad:false */
        var signaturePad = new SignaturePad(element[0], {
          minWidth: scope.component.minWidth,
          maxWidth: scope.component.maxWidth,
          penColor: scope.component.penColor,
          backgroundColor: scope.component.backgroundColor
        });

        scope.$watch('component.penColor', function(newValue) {
          signaturePad.penColor = newValue;
        });

        scope.$watch('component.backgroundColor', function(newValue) {
          signaturePad.backgroundColor = newValue;
          signaturePad.clear();
        });

        // Clear the signature.
        scope.component.clearSignature = function() {
          signaturePad.clear();
          readSignature();
        };

        // Set some CSS properties.
        element.css({
          'border-radius': '4px',
          'box-shadow': '0 0 5px rgba(0, 0, 0, 0.02) inset',
          'border': '1px solid #f4f4f4'
        });

        function readSignature() {
          if (scope.component.validate.required && signaturePad.isEmpty()) {
            ngModel.$setViewValue('');
          }
          else {
            ngModel.$setViewValue(signaturePad.toDataURL());
          }
        }

        ngModel.$render = function() {
          signaturePad.fromDataURL(ngModel.$viewValue);
        };
        signaturePad.onEnd = function() {
          scope.$evalAsync(readSignature);
        };
      }
    };
  });
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/signature.html', FormioUtils.fieldWrap(
        "<div ng-if=\"readOnly\">\n  <div ng-if=\"data[component.key] === 'YES'\">\n    [ Signature is hidden ]\n  </div>\n  <div ng-if=\"data[component.key] !== 'YES'\">\n    <img class=\"signature\" ng-attr-src=\"{{data[component.key]}}\" src=\"\" />\n  </div>\n</div>\n<div ng-if=\"!readOnly\" style=\"width: {{ component.width }}; height: {{ component.height }};\">\n  <a class=\"btn btn-xs btn-default\" style=\"position:absolute; left: 0; top: 0; z-index: 1000\" ng-click=\"component.clearSignature()\">\n    <span class=\"glyphicon glyphicon-refresh\"></span>\n  </a>\n  <canvas signature component=\"component\" name=\"{{ componentId }}\" ng-model=\"data[component.key]\" ng-required=\"component.validate.required\"></canvas>\n  <div class=\"formio-signature-footer\" style=\"text-align: center;color:#C3C3C3;\" ng-class=\"{'field-required': component.validate.required}\">{{ component.footer | formioTranslate }}</div>\n</div>\n"
      ));

      $templateCache.put('formio/componentsView/signature.html', FormioUtils.fieldWrap(
        "<div ng-if=\"data[component.key] === 'YES'\">\n  [ Signature is hidden ]\n</div>\n<div ng-if=\"data[component.key] !== 'YES'\">\n  <img class=\"signature\" ng-attr-src=\"{{data[component.key]}}\" src=\"\" />\n</div>\n"
      ));
    }
  ]);
};

},{}],39:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('survey', {
        title: 'Survey',
        template: 'formio/components/survey.html',
        group: 'advanced',
        tableView: function(data, component) {
          var view = '<table class="table table-striped table-bordered"><thead>';
          var values = {};
          angular.forEach(component.values, function(v) {
            values[v.value] = v.label;
          });
          angular.forEach(component.questions, function(question) {
            view += '<tr>';
            view += '<th>' + question.label + '</th>';
            view += '<td>' + values[data[question.value]] + '</td>';
            view += '</tr>';
          });
          view += '</tbody></table>';
          return view;
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'survey',
          questions: [],
          values: [],
          defaultValue: '',
          protected: false,
          persistent: true,
          validate: {
            required: false,
            custom: '',
            customPrivate: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/survey.html', FormioUtils.fieldWrap(
        "<table class=\"table table-striped table-bordered\">\n  <thead>\n    <tr>\n      <td></td>\n      <th ng-repeat=\"v in component.values track by $index\" style=\"text-align: center;\">{{ v.label }}</th>\n    </tr>\n  </thead>\n  <tr ng-repeat=\"question in component.questions\">\n    <td>{{ question.label }}</td>\n    <td ng-repeat=\"v in component.values\" style=\"text-align: center;\">\n      <input\n        type=\"radio\"\n        id=\"{{ componentId }}-{{ question.value }}-{{ v.value }}\" name=\"{{ componentId }}-{{ question.value }}-{{ v.value }}\"\n        tabindex=\"{{ component.tabindex || 0 }}\"\n        value=\"{{ v.value }}\"\n        ng-model=\"data[component.key][question.value]\"\n        ng-required=\"component.validate.required\"\n        ng-disabled=\"readOnly\"\n        custom-validator=\"component.validate.custom\"\n      >\n    </td>\n  </tr>\n</table>\n"
      ));
    }
  ]);
};

},{}],40:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('table', {
        title: 'Table',
        template: 'formio/components/table.html',
        group: 'layout',
        settings: {
          input: false,
          numRows: 3,
          numCols: 3,
          rows: [[{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}]],
          header: [],
          caption: '',
          striped: false,
          bordered: false,
          hover: false,
          condensed: false
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      var tableClasses = "{'table-striped': component.striped, ";
      tableClasses += "'table-bordered': component.bordered, ";
      tableClasses += "'table-hover': component.hover, ";
      tableClasses += "'table-condensed': component.condensed}";
      $templateCache.put('formio/components/table.html',
        "<div class=\"table-responsive\" id=\"{{ component.key }}\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table\">\n    <thead ng-if=\"component.header.length\">\n      <th ng-repeat=\"header in component.header track by $index\">{{ header | formioTranslate }}</th>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"row in component.rows track by $index\">\n        <td ng-repeat=\"column in row track by $index\">\n          <formio-component\n            ng-repeat=\"component in column.components track by $index\"\n            component=\"component\"\n            data=\"data\"\n            formio=\"formio\"\n            formio-form=\"formioForm\"\n            grid-row=\"gridRow\"\n            grid-col=\"gridCol\"\n            ng-if=\"show[column.key || ''] && show[component.key || '']\"\n            show=\"show\"\n          ></formio-component>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/table.html',
        "<div class=\"table-responsive\" id=\"{{ component.key }}\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table\">\n    <thead ng-if=\"component.header.length\">\n      <th ng-repeat=\"header in component.header track by $index\">{{ header }}</th>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"row in component.rows track by $index\">\n        <td ng-repeat=\"column in row track by $index\">\n          <formio-component-view ng-repeat=\"component in column.components track by $index\" component=\"component\" data=\"data\" form=\"form\" ignore=\"ignore\"></formio-component-view>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n"
      );
    }
  ]);
};

},{}],41:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: function($scope) {
          if ($scope.component.wysiwyg) {
            $scope.wysiwyg = $scope.component.wysiwyg;
            return 'formio/components/texteditor.html';
          }
          return 'formio/components/textarea.html';
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'textareaField',
          placeholder: '',
          prefix: '',
          suffix: '',
          rows: 3,
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true,
          wysiwyg: false,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/textarea.html', FormioUtils.fieldWrap(
        "<textarea\nclass=\"form-control\"\nng-model=\"data[component.key]\"\nng-disabled=\"readOnly\"\nng-required=\"component.validate.required\"\nsafe-multiple-to-single\nid=\"{{ componentId }}\"\nname=\"{{ componentId }}\"\ntabindex=\"{{ component.tabindex || 0 }}\"\nplaceholder=\"{{ component.placeholder | formioTranslate }}\"\ncustom-validator=\"component.validate.custom\"\nrows=\"{{ component.rows }}\"></textarea>\n"
      ));
      $templateCache.put('formio/components/texteditor.html', FormioUtils.fieldWrap(
        "<textarea\n  class=\"form-control\"\n  ng-model=\"data[component.key]\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"component.validate.required\"\n  ckeditor=\"wysiwyg\"\n  safe-multiple-to-single\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  placeholder=\"{{ component.placeholder }}\"\n  custom-validator=\"component.validate.custom\"\n  rows=\"{{ component.rows }}\"></textarea>\n"
      ));
    }
  ]);
};

},{}],42:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textfield', {
        title: 'Text Field',
        template: 'formio/components/textfield.html',
        icon: 'fa fa-terminal',
        settings: {
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: '',
          key: 'textField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: '',
            customPrivate: false
          },
          conditional: {
            show: null,
            when: null,
            eq: ''
          }
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function(
      $templateCache,
      FormioUtils
    ) {
      $templateCache.put('formio/components/textfield.html', FormioUtils.fieldWrap(
        "<input type=\"{{ component.inputType }}\"\n  class=\"form-control\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-disabled=\"readOnly\"\n  ng-model=\"data[component.key]\"\n  ng-model-options=\"{ debounce: 500 }\"\n  safe-multiple-to-single\n  ng-required=\"component.validate.required\"\n  ng-minlength=\"component.validate.minLength\"\n  ng-maxlength=\"component.validate.maxLength\"\n  ng-pattern=\"component.validate.pattern\"\n  custom-validator=\"component.validate.custom\"\n  placeholder=\"{{ component.placeholder | formioTranslate }}\"\n  ui-mask=\"{{ component.inputMask }}\"\n  ui-mask-placeholder=\"\"\n  ui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],43:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('well', {
        title: 'Well',
        template: 'formio/components/well.html',
        group: 'layout',
        settings: {
          input: false,
          components: []
        },
        viewTemplate: 'formio/componentsView/well.html'
      });
    }
  ]);
  app.run([
    '$templateCache',
    function($templateCache) {
      $templateCache.put('formio/components/well.html',
        "<div class=\"well\" id=\"{{ component.key }}\">\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    formio=\"formio\"\n    read-only=\"readOnly\"\n    formio-form=\"formioForm\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    ng-if=\"show[component.key || ''] && show[_component.key || '']\"\n    show=\"show\"\n  ></formio-component>\n</div>\n"
      );
      $templateCache.put('formio/componentsView/well.html',
        "<div class=\"well\" id=\"{{ component.key }}\">\n  <formio-component-view ng-repeat=\"component in component.components track by $index\" component=\"component\" data=\"data\" form=\"form\" ignore=\"ignore\"></formio-component-view>\n</div>\n"
      );
    }
  ]);
};

},{}],44:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }
      ctrl.$validators.custom = function(modelValue, viewValue) {
        var valid = true;
        /*eslint-disable no-unused-vars */
        var input = modelValue || viewValue;
        /*eslint-enable no-unused-vars */
        var custom = scope.component.validate.custom;
        custom = custom.replace(/({{\s+(.*)\s+}})/, function(match, $1, $2) {
          return scope.data[$2];
        });

        /* jshint evil: true */
        eval(custom);

        if (valid !== true) {
          scope.component.customError = valid;
          return false;
        }

        return true;
      };
    }
  };
};

},{}],45:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      requireComponents: '=?',
      disableComponents: '=?',
      formioOptions: '=?',
      options: '=?'
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils
      ) {
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        // Add the live form parameter to the url.
        if ($scope._src && ($scope._src.indexOf('live=') === -1)) {
          $scope._src += ($scope._src.indexOf('?') === -1) ? '?' : '&';
          $scope._src += 'live=1';
        }

        // Build the display map.
        $scope.show = {
          '': true,
          'undefined': true,
          'null': true
        };
        var boolean = {
          'true': true,
          'false': false
        };

        /**
         * Sweep the current submission, to identify and remove data that has been conditionally hidden.
         *
         * This will iterate over every key in the submission data obj, regardless of the structure.
         */
        var sweepSubmission = function() {
          var show = $scope.show || {
              '': true,
              'undefined': true,
              'null': true
            };
          var submission = $scope.submission.data || {};

          /**
           * Sweep the given component keys and remove any data for the given keys which are being conditionally hidden.
           *
           * @param {Object} components
           *   The list of components to sweep.
           * @param {Boolean} ret
           *   Whether or not you want to know if a modification needs to be made.
           */
          var sweep = function sweep(components, ret) {
            // Skip our unwanted types.
            if (components === null || typeof components === 'undefined') {
              if (ret) {
                return false;
              }
              return;
            }

            // If given a string, then we are looking at the api key of a component.
            if (typeof components === 'string') {
              if (show.hasOwnProperty(components) && show[components] === false) {
                if (ret) {
                  return true;
                }
                return;
              }
            }
            // If given an array, iterate over each element, assuming its not a string itself.
            // If each element is a string, then we aren't looking at a component, but data itself.
            else if (components instanceof Array) {
              var filtered = [];

              components.forEach(function(component) {
                if (typeof component === 'string') {
                  filtered.push(component);
                  return;
                }

                // Recurse into the components of this component.
                var modified = sweep(component, true);
                if (!modified) {
                  filtered.push(component);
                }
              });

              components = filtered;
              return;
            }
            // If given an object, iterate the properties as component keys.
            else if (typeof components === 'object') {
              Object.keys(components).forEach(function(key) {
                // If the key is deleted, delete the whole obj.
                var modifiedKey = sweep(key, true);
                if (modifiedKey) {
                  delete components[key];
                }
                else {
                  // If a child leaf is modified (non key) delete its whole subtree.
                  if (components[key] instanceof Array || typeof components[key] === 'object') {
                    // If the component can have sub-components, recurse.
                    sweep(components[key]);
                  }
                }
              });
              return;
            }

            return;
          };
          return sweep(submission);
        };

        // The list of all conditionals.
        var _conditionals = {};

        // The list of all custom conditionals, segregated because they must be run on every change to data.
        var _customConditionals = {};

        /** Sweep all the components and build the conditionals map.
         *
         * @private
         */
        var _sweepConditionals = function() {
          $scope.form = $scope.form || {};
          $scope.form.components = $scope.form.components || [];
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (!component.hasOwnProperty('key')) {
              return;
            }

            // Show everything by default.
            $scope.show[component.key] = true;

            // We only care about valid/complete conditional settings.
            if (
              component.conditional
              && (component.conditional.show !== null && component.conditional.show !== '')
              && (component.conditional.when !== null && component.conditional.when !== '')
            ) {
              // Default the conditional values.
              component.conditional.show = boolean.hasOwnProperty(component.conditional.show)
                ? boolean[component.conditional.show]
                : true;
              component.conditional.eq = component.conditional.eq || '';

              // Keys should be unique, so don't worry about clobbering an existing duplicate.
              _conditionals[component.key] = component.conditional;

              // Store the components default value for conditional logic, if present.
              if (component.hasOwnProperty('defaultValue')) {
                _conditionals[component.key].defaultValue = component.defaultValue;
              }
            }
            // Custom conditional logic.
            else if (component.customConditional) {
              // Add this customConditional to the conditionals list.
              _customConditionals[component.key] = component.customConditional;
            }

            // Set hidden if specified
            if ($scope.hideComponents) {
              component.hidden = $scope.hideComponents.indexOf(component.key) !== -1;
            }

            // Set required if specified
            if ($scope.requireComponents && component.hasOwnProperty('validate') && $scope.requireComponents.indexOf(component.key) !== -1) {
              component.validate.required = $scope.requireComponents.indexOf(component.key) !== -1;
            }

            // Set disabled if specified
            if ($scope.disableComponents) {
              component.disabled = $scope.disableComponents.indexOf(component.key) !== -1;
            }
          }, true);
        };

        /**
         * Using the conditionals map, invoke the conditionals for each component.
         *
         * @param {String} componentKey
         *   The component to toggle conditional logic for.
         *
         * @private
         */
        var _toggleConditional = function(componentKey, subData) {
          if (_conditionals.hasOwnProperty(componentKey)) {
            var data = Object.assign({}, $scope.submission.data, subData);
            var cond = _conditionals[componentKey];
            var value = FormioUtils.getValue({data: data}, cond.when);

            if (typeof value !== 'undefined' && typeof value !== 'object') {
              // Check if the conditional value is equal to the trigger value
              $scope.show[componentKey] = value.toString() === cond.eq.toString()
                ? boolean[cond.show]
                : !boolean[cond.show];
            }
            // Special check for check boxes component.
            else if (typeof value !== 'undefined' && typeof value === 'object') {
              // Only update the visibility is present, otherwise hide, because it was deleted by the submission sweep.
              if (value.hasOwnProperty(cond.eq)) {
                $scope.show[componentKey] = boolean.hasOwnProperty(value[cond.eq])
                  ? boolean[value[cond.eq]]
                  : true;
              }
              else {
                $scope.show[componentKey] = false;
              }
            }
            // Check against the components default value, if present and the components hasn't been interacted with.
            else if (typeof value === 'undefined' && cond.hasOwnProperty('defaultValue')) {
              $scope.show[componentKey] = cond.defaultValue.toString() === cond.eq.toString()
                ? boolean[cond.show]
                : !boolean[cond.show];
            }
            // If there is no value, we still need to process as not equal.
            else {
              $scope.show[componentKey] = !boolean[cond.show];
            }
          }
          return $scope.show.hasOwnProperty(componentKey) ? $scope.show[componentKey] : null;
        };

        /**
         * Using the custom conditionals map, invoke the conditionals for each component.
         *
         * @param {String} componentKey
         *   The component to toggle conditional logic for.
         *
         * @private
         */
        var _toggleCustomConditional = function(componentKey, subData) {
          if (_customConditionals.hasOwnProperty(componentKey)) {
            var cond = _customConditionals[componentKey];

            try {
              // Create a child block, and expose the submission data.
              var data = Object.assign({}, $scope.submission.data, subData); // eslint-disable-line no-unused-vars
              // Eval the custom conditional and update the show value.
              var show = eval('(function() { ' + cond.toString() + '; return show; })()');
              // Show by default, if an invalid type is given.
              $scope.show[componentKey] = boolean.hasOwnProperty(show.toString()) ? boolean[show] : true;
            }
            catch (e) {
              $scope.show[componentKey] = true;
            }
          }
          return $scope.show.hasOwnProperty(componentKey) ? $scope.show[componentKey] : null;
        };

        $scope.checkConditional = function(componentKey, subData) {
          var conditional = _toggleConditional(componentKey, subData);
          var customConditional = _toggleCustomConditional(componentKey, subData);
          // customConditional will be true if either are true since the value persists in $scope.show.
          return customConditional;
        }

        // On every change to data, trigger the conditionals.
        $scope.$watch(function() {
          return $scope.submission && $scope.submission.data
            ? $scope.submission.data
            : {};
        }, function() {
          // Toggle every conditional.
          var allConditionals = Object.keys(_conditionals);
          (allConditionals || []).forEach(function(componentKey) {
            _toggleConditional(componentKey);
          });

          var allCustomConditionals = Object.keys(_customConditionals);
          (allCustomConditionals || []).forEach(function(componentKey) {
            _toggleCustomConditional(componentKey);
          });

          var allHidden = Object.keys($scope.show);
          (allHidden || []).forEach(function(componentKey) {
            // If a component is hidden, delete its value, so other conditionals are property chain reacted.
            if (!$scope.show[componentKey]) {
              return sweepSubmission();
            }
          });
        }, true);

        var cancelFormLoadEvent = $scope.$on('formLoad', function() {
          _sweepConditionals();
          cancelFormLoadEvent();
        });

        if ($scope.options && $scope.options.watchData) {
          $scope.$watch('submission.data', function() {
            _sweepConditionals();
          }, true);
        }

        if (!$scope._src) {
          $scope.$watch('src', function(src) {
            if (!src) {
              return;
            }
            $scope._src = src;
            $scope.formio = FormioScope.register($scope, $element, {
              form: true,
              submission: true
            });
          });
        }

        // Create the formio object.
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submission: true
        });

        $scope.checkErrors = function(form) {
          if (form.submitting) {
            return true;
          }
          form.$pristine = false;
          for (var key in form) {
            if (form[key] && form[key].hasOwnProperty('$pristine')) {
              form[key].$pristine = false;
            }
          }
          return !form.$valid;
        };

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {
          $scope.formioAlerts = [];
          if ($scope.checkErrors(form)) {
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please fix the following errors before submitting.'
            });
            return;
          }

          form.submitting = true;

          sweepSubmission();

          // Create a sanitized submission object.
          var submissionData = {data: {}};
          if ($scope.submission._id) {
            submissionData._id = $scope.submission._id;
          }
          if ($scope.submission.data._id) {
            submissionData._id = $scope.submission.data._id;
          }

          var grabIds = function(input) {
            if (!input) {
              return [];
            }

            if (!(input instanceof Array)) {
              input = [input];
            }

            var final = [];
            input.forEach(function(element) {
              if (element && element._id) {
                final.push(element._id);
              }
            });

            return final;
          };

          var defaultPermissions = {};
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (component.type === 'resource' && component.key && component.defaultPermission) {
              defaultPermissions[component.key] = component.defaultPermission;
            }
            if ($scope.submission.data.hasOwnProperty(component.key) && $scope.show[component.key] === true) {
              var value = $scope.submission.data[component.key];
              if (component.type === 'number') {
                submissionData.data[component.key] = value ? parseFloat(value) : 0;
              }
              else {
                submissionData.data[component.key] = value;
              }
            }
          }, true);

          angular.forEach($scope.submission.data, function(value, key) {
            if (value && !value.hasOwnProperty('_id')) {
              submissionData.data[key] = value;
            }

            // Setup the submission access.
            var perm = defaultPermissions[key];
            if (perm) {
              submissionData.access = submissionData.access || [];

              // Coerce value into an array for plucking.
              if (!(value instanceof Array)) {
                value = [value];
              }

              // Try to find and update an existing permission.
              var found = false;
              submissionData.access.forEach(function(permission) {
                if (permission.type === perm) {
                  found = true;
                  permission.resources = permission.resources || [];
                  permission.resources.concat(grabIds(value));
                }
              });

              // Add a permission, because one was not found.
              if (!found) {
                submissionData.access.push({
                  type: perm,
                  resources: grabIds(value)
                });
              }
            }
          });

          // Show the submit message and say the form is no longer submitting.
          var onSubmit = function(submission, message) {
            $scope.showAlerts({
              type: 'success',
              message: message
            });
            form.submitting = false;
          };

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            var message = '';
            if ($scope.options && $scope.options.submitMessage) {
              message = $scope.options.submitMessage;
            }
            else {
              message = 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.';
            }
            onSubmit(submission, message);
            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          // Allow the form to be completed externally.
          $scope.$on('submitDone', function(event, submission, message) {
            onSubmit(submission, message);
          });

          // Allow an error to be thrown externally.
          $scope.$on('submitError', function(event, error) {
            FormioScope.onError($scope, $element)(error);
          });

          var submitEvent = $scope.$emit('formSubmit', submissionData);
          if (submitEvent.defaultPrevented) {
            // Listener wants to cancel the form submission
            form.submitting = false;
            return;
          }

          // Make sure to make a copy of the submission data to remove bad characters.
          submissionData = angular.copy(submissionData);

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function(submission) {
              Formio.clearCache();
              onSubmitDone(method, submission);
            }).error(FormioScope.onError($scope, $element))
              .finally(function() {
                form.submitting = false;
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio) {
            // copy to remove angular $$hashKey
            $scope.formio.saveSubmission(submissionData, $scope.formioOptions).then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope, $element)).finally(function() {
              form.submitting = false;
            });
          }
          else {
            $scope.$emit('formSubmission', submissionData);
          }
        };
      }
    ],
    templateUrl: 'formio.html'
  };
};

},{}],46:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      replace: true,
      restrict: 'E',
      require: '?^formio',
      scope: {
        component: '=',
        data: '=',
        formio: '=',
        formioForm: '=',
        readOnly: '=',
        gridRow: '=',
        gridCol: '=',
        show: '='
      },
      templateUrl: 'formio/component.html',
      link: function(scope, el, attrs, formioCtrl) {
        if (formioCtrl) {
          scope.showAlerts = formioCtrl.showAlerts.bind(formioCtrl);
        }
        else {
          scope.showAlerts = function() {
            throw new Error('Cannot call $scope.showAlerts unless this component is inside a formio directive.');
          };
        }
      },
      controller: [
        '$scope',
        '$http',
        '$controller',
        function(
          $scope,
          $http,
          $controller
        ) {
          // Options to match jquery.maskedinput masks
          $scope.uiMaskOptions = {
            maskDefinitions: {
              '9': /\d/,
              'a': /[a-zA-Z]/,
              '*': /[a-zA-Z0-9]/
            },
            clearOnBlur: false,
            eventsToHandle: ['input', 'keyup', 'click', 'focus'],
            silentEvents: ['click', 'focus']
          };

          // Pass through checkConditional since this is an isolate scope.
          $scope.checkConditional = $scope.$parent.checkConditional;

          // Get the settings.
          var component = formioComponents.components[$scope.component.type] || formioComponents.components['custom'];

          // Set the component with the defaults from the component settings.
          angular.forEach(component.settings, function(value, key) {
            if (!$scope.component.hasOwnProperty(key)) {
              $scope.component[key] = angular.copy(value);
            }
          });

          // Add a new field value.
          $scope.addFieldValue = function() {
            var value = $scope.component.hasOwnProperty('defaultValue') ? $scope.component.defaultValue : '';
            $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
            $scope.data[$scope.component.key].push(value);
          };

          // Remove a field value.
          $scope.removeFieldValue = function(index) {
            $scope.data[$scope.component.key].splice(index, 1);
          };

          // Set the template for the component.
          if (typeof component.template === 'function') {
            $scope.template = component.template($scope);
          }
          else {
            $scope.template = component.template;
          }

          // Allow component keys to look like "settings[username]"
          if ($scope.component.key && $scope.component.key.indexOf('[') !== -1) {
            var matches = $scope.component.key.match(/([^\[]+)\[([^]+)\]/);
            if ((matches.length === 3) && $scope.data.hasOwnProperty(matches[1])) {
              $scope.data = $scope.data[matches[1]];
              $scope.component.key = matches[2];
            }
          }

          // If the component has a controller.
          if (component.controller) {
            // Maintain reverse compatibility by executing the old method style.
            if (typeof component.controller === 'function') {
              component.controller($scope.component, $scope, $http, Formio);
            }
            else {
              $controller(component.controller, {$scope: $scope});
            }
          }

          $scope.$watch('component.multiple', function() {
            // Establish a default for data.
            $scope.data = $scope.data || {};
            if ($scope.component.multiple) {
              var value = null;
              if ($scope.data.hasOwnProperty($scope.component.key)) {
                // If a value is present, and its an array, assign it to the value.
                if ($scope.data[$scope.component.key] instanceof Array) {
                  value = $scope.data[$scope.component.key];
                }
                // If a value is present and it is not an array, wrap the value.
                else {
                  value = [$scope.data[$scope.component.key]];
                }
              }
              else if ($scope.component.hasOwnProperty('defaultValue')) {
                // If there is a default value and it is an array, assign it to the value.
                if ($scope.component.defaultValue instanceof Array) {
                  value = $scope.component.defaultValue;
                }
                // If there is a default value and it is not an array, wrap the value.
                else {
                  value = [$scope.component.defaultValue];
                }
              }
              else {
                // Couldn't safely default, make it a simple array. Possibly add a single obj or string later.
                value = [];
              }

              // Use the current data or default.
              $scope.data[$scope.component.key] = value;
            }
            else {
              // Use the current data or default.
              if ($scope.data.hasOwnProperty($scope.component.key)) {
                $scope.data[$scope.component.key] = $scope.data[$scope.component.key];
              }
              // FA-835 - The default values for select boxes are set in the component.
              else if ($scope.component.hasOwnProperty('defaultValue') && $scope.component.type !== 'selectboxes') {
                $scope.data[$scope.component.key] = $scope.component.defaultValue;
              }
            }
          });

          // Set the component name.
          $scope.componentId = $scope.component.key;
          if ($scope.gridRow !== undefined) {
            $scope.componentId += ('-' + $scope.gridRow);
          }
          if ($scope.gridCol !== undefined) {
            $scope.componentId += ('-' + $scope.gridCol);
          }
        }
      ]
    };
  }
];

},{}],47:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'formioComponents',
  function(
    formioComponents
  ) {
    return {
      replace: true,
      restrict: 'E',
      scope: {
        component: '=',
        data: '=',
        form: '=',
        ignore: '=?'
      },
      templateUrl: 'formio/component-view.html',
      controller: [
        '$scope',
        'Formio',
        function(
          $scope,
          Formio
        ) {
          // Set the form url.
          $scope.formUrl = $scope.form ? Formio.getAppUrl() + '/form/' + $scope.form._id.toString() : '';

          // Get the settings.
          var component = formioComponents.components[$scope.component.type] || formioComponents.components['custom'];

          // Set the template for the component.
          if (!component.viewTemplate) {
            $scope.template = 'formio/element-view.html';
          }
          else if (typeof component.viewTemplate === 'function') {
            $scope.template = component.viewTemplate($scope);
          }
          else {
            $scope.template = component.viewTemplate;
          }

          // Set the component name.
          $scope.componentId = $scope.component.key;
          if ($scope.gridRow !== undefined) {
            $scope.componentId += ('-' + $scope.gridRow);
          }
          if ($scope.gridCol !== undefined) {
            $scope.componentId += ('-' + $scope.gridCol);
          }

          // See if we should show this component.
          $scope.shouldShow = !$scope.ignore || ($scope.ignore.indexOf($scope.componentId) === -1);
        }
      ]
    };
  }
];

},{}],48:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      form: '=?',
      submission: '=?',
      src: '=?',
      formAction: '=?',
      resourceName: '=?',
      message: '=?'
    },
    templateUrl: 'formio-delete.html',
    controller: [
      '$scope',
      '$element',
      'FormioScope',
      'Formio',
      '$http',
      function(
        $scope,
        $element,
        FormioScope,
        Formio,
        $http
      ) {
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };
        var resourceName = 'resource';
        var methodName = '';
        var loader = FormioScope.register($scope, $element, {
          form: true,
          submission: true
        });

        if (loader) {
          resourceName = loader.submissionId ? 'submission' : 'form';
          var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
          methodName = 'delete' + resourceTitle;
        }

        // Set the resource name
        $scope._resourceName = $scope.resourceName || resourceName;
        $scope.deleteMessage = $scope.message || 'Are you sure you wish to delete the ' + $scope._resourceName + '?';

        // Create delete capability.
        $scope.onDelete = function() {
          // Rebuild resourceTitle, $scope.resourceName could have changed
          var resourceName = $scope.resourceName || $scope._resourceName;
          var resourceTitle = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
          // Called when the delete is done.
          var onDeleteDone = function(data) {
            $scope.showAlerts({
              type: 'success',
              message: resourceTitle + ' was deleted.'
            });
            Formio.clearCache();
            $scope.$emit('delete', data);
          };

          if ($scope.action) {
            $http.delete($scope.action).success(onDeleteDone).error(FormioScope.onError($scope, $element));
          }
          else if (loader) {
            if (!methodName) return;
            if (typeof loader[methodName] !== 'function') return;
            loader[methodName]().then(onDeleteDone, FormioScope.onError($scope, $element));
          }
        };
        $scope.onCancel = function() {
          $scope.$emit('cancel');
        };
      }
    ]
  };
};

},{}],49:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  '$compile',
  '$templateCache',
  function(
    $compile,
    $templateCache
  ) {
    return {
      scope: false,
      link: function(scope, element) {
        element.replaceWith($compile($templateCache.get(scope.template))(scope));
        scope.$emit('formElementRender', element);
      }
    };
  }
];

},{}],50:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    scope: false,
    restrict: 'E',
    templateUrl: 'formio/errors.html'
  };
};

},{}],51:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      form: '=',
      submission: '=',
      ignore: '=?'
    },
    templateUrl: 'formio/submission.html'
  };
};

},{}],52:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      src: '=?',
      form: '=?',
      submissions: '=?',
      perPage: '=?'
    },
    templateUrl: 'formio/submissions.html',
    controller: [
      '$scope',
      '$element',
      'FormioScope',
      function(
        $scope,
        $element,
        FormioScope
      ) {
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.perPage = $scope.perPage === undefined ? 10 : $scope.perPage;
        $scope.formio = FormioScope.register($scope, $element, {
          form: true,
          submissions: true
        });

        $scope.currentPage = 1;
        $scope.pageChanged = function(page) {
          $scope.skip = (page - 1) * $scope.perPage;
          $scope.updateSubmissions();
        };

        $scope.tableView = function(component) {
          return !component.hasOwnProperty('tableView') || component.tableView;
        };

        $scope.$watch('submissions', function(submissions) {
          if (submissions && submissions.length > 0) {
            $scope.$emit('submissionLoad', $scope.submissions);
          }
        });
      }
    ]
  };
};

},{}],53:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'formio-wizard.html',
    scope: {
      src: '=?',
      formAction: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      formioOptions: '=?',
      storage: '=?'
    },
    link: function(scope, element) {
      // From https://siongui.github.io/2013/05/12/angularjs-get-element-offset-position/
      var offset = function(elm) {
        try {
          return elm.offset();
        }
        catch (e) {
          // Do nothing...
        }
        var rawDom = elm[0];
        var _x = 0;
        var _y = 0;
        var body = document.documentElement || document.body;
        var scrollX = window.pageXOffset || body.scrollLeft;
        var scrollY = window.pageYOffset || body.scrollTop;
        _x = rawDom.getBoundingClientRect().left + scrollX;
        _y = rawDom.getBoundingClientRect().top + scrollY;
        return {
          left: _x,
          top: _y
        };
      };

      scope.wizardLoaded = false;
      scope.wizardTop = offset(element).top;
      if (scope.wizardTop > 50) {
        scope.wizardTop -= 50;
      }
      scope.wizardElement = angular.element('.formio-wizard', element);
    },
    controller: [
      '$scope',
      '$compile',
      '$element',
      'Formio',
      'FormioScope',
      'FormioUtils',
      '$http',
      function(
        $scope,
        $compile,
        $element,
        Formio,
        FormioScope,
        FormioUtils,
        $http
      ) {
        var session = ($scope.storage && !$scope.readOnly) ? localStorage.getItem($scope.storage) : false;
        if (session) {
          session = angular.fromJson(session);
        }

        var getForm = function() {
          var element = $element.find('#formio-wizard-form');
          if (!element.length) {
            return {};
          }
          return element.children().scope().formioForm;
        };

        $scope.formio = null;
        $scope.page = {};
        $scope.pages = [];
        $scope.hasTitles = false;
        $scope.colclass = '';
        if (!$scope.submission || !Object.keys($scope.submission.data).length) {
          $scope.submission = session ? {data: session.data} : {data: {}};
        }
        $scope.currentPage = session ? session.page : 0;

        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function(alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.clear = function() {
          if ($scope.storage && !$scope.readOnly) {
            localStorage.setItem($scope.storage, '');
          }
          $scope.submission = {data: {}};
          $scope.currentPage = 0;
        };

        // Show the current page.
        var showPage = function(scroll) {
          // If the page is past the components length, try to clear first.
          if ($scope.currentPage >= $scope.form.components.length) {
            $scope.clear();
          }

          $scope.wizardLoaded = false;
          if ($scope.storage && !$scope.readOnly) {
            localStorage.setItem($scope.storage, angular.toJson({
              page: $scope.currentPage,
              data: $scope.submission.data
            }));
          }
          $scope.page.components = $scope.form.components[$scope.currentPage].components;
          var pageElement = angular.element(document.createElement('formio'));
          $scope.wizardElement.html($compile(pageElement.attr({
            src: "'" + $scope.src + "'",
            form: 'page',
            submission: 'submission',
            'read-only': 'readOnly',
            'hide-components': 'hideComponents',
            'formio-options': 'formioOptions',
            id: 'formio-wizard-form'
          }))($scope));
          $scope.wizardLoaded = true;
          $scope.formioAlerts = [];
          if (scroll) {
            window.scrollTo(0, $scope.wizardTop);
          }
          $scope.$emit('wizardPage', $scope.currentPage);
        };

        // Check for errors.
        $scope.checkErrors = function() {
          if (!$scope.isValid()) {
            // Change all of the fields to not be pristine.
            angular.forEach($element.find('[name="formioForm"]').children(), function(element) {
              var elementScope = angular.element(element).scope();
              var fieldForm = elementScope.formioForm;
              if (fieldForm[elementScope.component.key]) {
                fieldForm[elementScope.component.key].$pristine = false;
              }
            });
            $scope.formioAlerts = [{
              type: 'danger',
              message: 'Please fix the following errors before proceeding.'
            }];
            return true;
          }
          return false;
        };

        // Submit the submission.
        $scope.submit = function() {
          if ($scope.checkErrors()) {
            return;
          }
          var sub = angular.copy($scope.submission);
          FormioUtils.eachComponent($scope.form.components, function(component) {
            if (sub.data.hasOwnProperty(component.key) && (component.type === 'number')) {
              if (sub.data[component.key]) {
                sub.data[component.key] = parseFloat(sub.data[component.key]);
              }
              else {
                sub.data[component.key] = 0;
              }
            }
          });

          var onDone = function(submission) {
            if ($scope.storage && !$scope.readOnly) {
              localStorage.setItem($scope.storage, '');
            }
            $scope.showAlerts({
              type: 'success',
              message: 'Submission Complete!'
            });
            $scope.$emit('formSubmission', submission);
          };

          // Save to specified action.
          if ($scope.action) {
            var method = sub._id ? 'put' : 'post';
            $http[method]($scope.action, sub).success(function(submission) {
              Formio.clearCache();
              onDone(submission);
            }).error(FormioScope.onError($scope, $element));
          }
          else if ($scope.formio) {
            $scope.formio.saveSubmission(sub).then(onDone).catch(FormioScope.onError($scope, $element));
          }
          else {
            onDone(sub);
          }
        };

        $scope.cancel = function() {
          $scope.clear();
          showPage(true);
        };

        // Move onto the next page.
        $scope.next = function() {
          if ($scope.checkErrors()) {
            return;
          }
          if ($scope.currentPage >= ($scope.form.components.length - 1)) {
            return;
          }
          $scope.currentPage++;
          showPage(true);
          $scope.$emit('wizardNext', $scope.currentPage);
        };

        // Move onto the previous page.
        $scope.prev = function() {
          if ($scope.currentPage < 1) {
            return;
          }
          $scope.currentPage--;
          showPage(true);
          $scope.$emit('wizardPrev', $scope.currentPage);
        };

        $scope.goto = function(page) {
          if (page < 0) {
            return;
          }
          if (page >= $scope.form.components.length) {
            return;
          }
          $scope.currentPage = page;
          showPage(true);
        };

        $scope.isValid = function() {
          return getForm().$valid;
        };

        $scope.$on('wizardGoToPage', function(event, page) {
          $scope.goto(page);
        });

        var updatePages = function() {
          if ($scope.pages.length > 6) {
            $scope.margin = ((1 - ($scope.pages.length * 0.0833333333)) / 2) * 100;
            $scope.colclass = 'col-sm-1';
          }
          else {
            $scope.margin = ((1 - ($scope.pages.length * 0.1666666667)) / 2) * 100;
            $scope.colclass = 'col-sm-2';
          }
        };

        var setForm = function(form) {
          $scope.pages = [];
          angular.forEach(form.components, function(component) {
            // Only include panels for the pages.
            if (component.type === 'panel') {
              if (!$scope.hasTitles && component.title) {
                $scope.hasTitles = true;
              }
              $scope.pages.push(component);
            }
          });

          $scope.form = $scope.form ? angular.merge($scope.form, angular.copy(form)) : angular.copy(form);
          $scope.form.components = $scope.pages;
          $scope.page = angular.copy(form);
          $scope.page.display = 'form';
          $scope.$emit('wizardFormLoad', form);
          updatePages();
          showPage();
        };

        $scope.$watch('form', function(form) {
          if (
            $scope.src ||
            !form ||
            !Object.keys(form).length ||
            !form.components ||
            !form.components.length
          ) {
            return;
          }
          var formUrl = form.project ? '/project/' + form.project : '';
          formUrl += '/form/' + form._id;
          $scope.formio = new Formio(formUrl);
          setForm(form);
        });

        // When the components length changes update the pages.
        $scope.$watch('form.components.length', updatePages);

        // Load the form.
        if ($scope.src) {
          $scope.formio = new Formio($scope.src);
          $scope.formio.loadForm().then(function(form) {
            setForm(form);
          });
        }
        else {
          $scope.src = '';
          $scope.formio = new Formio($scope.src);
        }
      }
    ]
  };
};

},{}],54:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioComponents',
  function(
    Formio,
    formioComponents
  ) {
    return {
      onError: function($scope, $element) {
        return function(error) {
          if ((error.name === 'ValidationError') && $element) {
            $element.find('#form-group-' + error.details[0].path).addClass('has-error');
            var message = 'ValidationError: ' + error.details[0].message;
            $scope.showAlerts({
              type: 'danger',
              message: message
            });
          }
          else {
            if (error instanceof Error) {
              error = error.toString();
            }
            else if (typeof error === 'object') {
              error = JSON.stringify(error);
            }
            $scope.showAlerts({
              type: 'danger',
              message: error
            });
          }
          $scope.$emit('formError', error);
        };
      },
      register: function($scope, $element, options) {
        var loader = null;
        $scope.formLoading = true;
        $scope.form = angular.isDefined($scope.form) ? $scope.form : {};
        $scope.submission = angular.isDefined($scope.submission) ? $scope.submission : {data: {}};
        $scope.submissions = angular.isDefined($scope.submissions) ? $scope.submissions : [];

        // Keep track of the elements rendered.
        var elementsRendered = 0;
        $scope.$on('formElementRender', function() {
          elementsRendered++;
          if (elementsRendered === $scope.form.components.length) {
            setTimeout(function() {
              $scope.$emit('formRender', $scope.form);
            }, 1);
          }
        });

        $scope.setLoading = function(_loading) {
          $scope.formLoading = _loading;
        };

        // Used to set the form action.
        var getAction = function(action) {
          if (!action) return '';
          if (action.substr(0, 1) === '/') {
            action = Formio.getBaseUrl() + action;
          }
          return action;
        };

        // Set the action.
        $scope.action = getAction($scope.formAction);

        // Allow sub components the ability to add new form components to the form.
        var addedData = {};
        $scope.$on('addFormComponent', function(event, component) {
          if (!addedData.hasOwnProperty(component.settings.key)) {
            addedData[component.settings.key] = true;
            var defaultComponent = formioComponents.components[component.type];
            $scope.form.components.push(angular.extend(defaultComponent.settings, component.settings));
          }
        });

        // Set the action if they provided it in the form.
        $scope.$watch('form.action', function(value) {
          if (!value) return;
          var action = getAction(value);
          if (action) {
            $scope.action = action;
          }
        });

        // Trigger a form load event when the components length is more than 0.
        $scope.$watch('form.components.length', function() {
          if (
            !$scope.form ||
            !$scope.form.components ||
            !$scope.form.components.length
          ) {
            return;
          }
          $scope.setLoading(false);
          $scope.$emit('formLoad', $scope.form);
        });

        $scope.updateSubmissions = function() {
          $scope.setLoading(true);
          var params = {};
          if ($scope.perPage) params.limit = $scope.perPage;
          if ($scope.skip) params.skip = $scope.skip;
          loader.loadSubmissions({params: params}).then(function(submissions) {
            angular.merge($scope.submissions, angular.copy(submissions));
            $scope.setLoading(false);
            $scope.$emit('submissionsLoad', submissions);
          }, this.onError($scope));
        }.bind(this);

        if ($scope._src) {
          loader = new Formio($scope._src);
          if (options.form) {
            $scope.setLoading(true);

            // If a form is already provided, then skip the load.
            if ($scope.form && Object.keys($scope.form).length) {
              $scope.setLoading(false);
              $scope.$emit('formLoad', $scope.form);
            }
            else {
              loader.loadForm().then(function(form) {
                angular.merge($scope.form, angular.copy(form));
                $scope.setLoading(false);
                $scope.$emit('formLoad', $scope.form);
              }, this.onError($scope));
            }
          }
          if (options.submission && loader.submissionId) {
            $scope.setLoading(true);

            // If a submission is already provided, then skip the load.
            if ($scope.submission && Object.keys($scope.submission.data).length) {
              $scope.setLoading(false);
              $scope.$emit('submissionLoad', $scope.submission);
            }
            else {
              loader.loadSubmission().then(function(submission) {
                angular.merge($scope.submission, angular.copy(submission));
                $scope.setLoading(false);
                $scope.$emit('submissionLoad', submission);
              }, this.onError($scope));
            }
          }
          if (options.submissions) {
            $scope.updateSubmissions();
          }
        }
        else {
          $scope.formoLoaded = true;
          $scope.formLoading = !$scope.form || (Object.keys($scope.form).length === 0) || !$scope.form.components.length;
          $scope.setLoading($scope.formLoading);

          // Emit the events if these objects are already loaded.
          if (!$scope.formLoading) {
            $scope.$emit('formLoad', $scope.form);
          }
          if ($scope.submission) {
            $scope.$emit('submissionLoad', $scope.submission);
          }
          if ($scope.submissions) {
            $scope.$emit('submissionsLoad', $scope.submissions);
          }
        }

        // Return the loader.
        return loader;
      }
    };
  }
];

},{}],55:[function(_dereq_,module,exports){
"use strict";
var formioUtils = _dereq_('formio-utils');

module.exports = function() {
  return {
    flattenComponents: formioUtils.flattenComponents,
    eachComponent: formioUtils.eachComponent,
    getComponent: formioUtils.getComponent,
    getValue: formioUtils.getValue,
    hideFields: function(form, components) {
      this.eachComponent(form.components, function(component) {
        for (var i in components) {
          if (component.key === components[i]) {
            component.type = 'hidden';
          }
        }
      });
    },
    uniqueName: function(name) {
      var parts = name.toLowerCase().replace(/[^0-9a-z\.]/g, '').split('.');
      var fileName = parts[0];
      var ext = '';
      if (parts.length > 1) {
        ext = '.' + parts[(parts.length - 1)];
      }
      return fileName.substr(0, 10) + '-' + this.guid() + ext;
    },
    guid: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    },
    fieldWrap: function(input) {
      input = input + '<formio-errors></formio-errors>';
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label | formioTranslate }}</label>';
      var requiredInline = '<span ng-if="(component.hideLabel === true || component.label === \'\' || !component.label) && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
          inputLabel +
          '<div class="input-group">' +
            '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
            input +
            requiredInline +
            '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
          '</div>' +
        '</div>' +
        '<div ng-if="component.multiple"><table class="table table-bordered">' +
          inputLabel +
          '<tr ng-repeat="value in data[component.key] track by $index">' +
            '<td>' +
              '<div class="input-group">' +
                '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
                  multiInput +
                  requiredInline +
                '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
              '</div>' +
            '</td>' +
            '<td><a ng-click="removeFieldValue($index)" class="btn btn-default"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> {{ component.addAnother || "Add Another" | formioTranslate }}</a></td>' +
          '</tr>' +
        '</table></div>';
      return template;
    }
  };
};

},{"formio-utils":1}],56:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  '$q',
  '$rootScope',
  'Formio',
  function($q, $rootScope, Formio) {
    var Interceptor = {
      /**
       * Update JWT token received from response.
       */
      response: function(response) {
        var token = response.headers('x-jwt-token');
        if (response.status >= 200 && response.status < 300 && token && token !== '') {
          Formio.setToken(token);
        }
        return response;
      },

      /**
       * Intercept a response error.
       */
      responseError: function(response) {
        if (parseInt(response.status, 10) === 440) {
          response.loggedOut = true;
          Formio.setToken(null);
          $rootScope.$broadcast('formio.sessionExpired', response.body);
        }
        else if (parseInt(response.status, 10) === 401) {
          $rootScope.$broadcast('formio.unauthorized', response.body);
        }
        return $q.reject(response);
      },

      /**
       * Set the token in the request headers.
       */
      request: function(config) {
        if (config.disableJWT) return config;
        var token = Formio.getToken();
        if (token) config.headers['x-jwt-token'] = token;
        return config;
      }
    };

    return Interceptor;
  }
];

},{}],57:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioComponents',
  '$interpolate',
  function(
    Formio,
    formioComponents,
    $interpolate
  ) {
    return function(value, component) {
      if (!value) {
        return '';
      }
      if (!component || !component.input|| !component.type) {
        return value;
      }
      var componentInfo = formioComponents.components[component.type];
      if (!componentInfo.tableView) {
        return value;
      }
      if (component.multiple && (value.length > 0)) {
        var values = [];
        angular.forEach(value, function(arrayValue) {
          values.push(componentInfo.tableView(arrayValue, component, $interpolate, formioComponents));
        });
        return values;
      }
      return componentInfo.tableView(value, component, $interpolate, formioComponents);
    };
  }
];

},{}],58:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return FormioUtils.flattenComponents;
  }
];

},{}],59:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  '$sce',
  function(
    $sce
  ) {
    return function(html) {
      return $sce.trustAsHtml(html);
    };
  }
];

},{}],60:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  function() {
    return function(components) {
      var tableComps = [];
      if (!components || !components.length) {
        return tableComps;
      }
      components.forEach(function(component) {
        if (component.tableView) {
          tableComps.push(component);
        }
      });
      return tableComps;
    };
  }
];

},{}],61:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'formioTableView',
  function(
    formioTableView
  ) {
    return function(value, component) {
      return formioTableView(value, component);
    };
  }
];

},{}],62:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioTableView',
  function(
    Formio,
    formioTableView
  ) {
    return function(data, component) {
      return formioTableView(Formio.fieldData(data, component), component);
    };
  }
];

},{}],63:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  '$filter',
  function(
    $filter
  ) {
    return function(text, key) {
      try {
        var translate = $filter('translate');
        // Allow translating by field key which helps with large blocks of html.
        if (key) {
          var result = translate(key);
          if (result === key) {
            result = translate(text);
          }
          return result;
        }
        else {
          return translate(text);
        }
      }
      catch (e) {
        return text;
      }
    };
  }
];

},{}],64:[function(_dereq_,module,exports){
"use strict";


var app = angular.module('formio', [
  'ngSanitize',
  'ui.bootstrap',
  'ui.bootstrap.datetimepicker',
  'ui.select',
  'ui.mask',
  'angularMoment',
  'ngFileUpload',
  'ngFileSaver'
]);

/**
 * Create the formio providers.
 */
app.provider('Formio', _dereq_('./providers/Formio'));

/**
 * Provides a way to register the Formio scope.
 */
app.factory('FormioScope', _dereq_('./factories/FormioScope'));

app.factory('FormioUtils', _dereq_('./factories/FormioUtils'));

app.factory('formioInterceptor', _dereq_('./factories/formioInterceptor'));

app.factory('formioTableView', _dereq_('./factories/formioTableView'));

app.directive('formio', _dereq_('./directives/formio'));

app.directive('formioDelete', _dereq_('./directives/formioDelete'));

app.directive('formioErrors', _dereq_('./directives/formioErrors'));

app.directive('customValidator', _dereq_('./directives/customValidator'));

app.directive('formioSubmissions', _dereq_('./directives/formioSubmissions'));

app.directive('formioSubmission', _dereq_('./directives/formioSubmission'));

app.directive('formioComponent', _dereq_('./directives/formioComponent'));

app.directive('formioComponentView', _dereq_('./directives/formioComponentView'));

app.directive('formioElement', _dereq_('./directives/formioElement'));

app.directive('formioWizard', _dereq_('./directives/formioWizard'));

/**
 * Filter to flatten form components.
 */
app.filter('flattenComponents', _dereq_('./filters/flattenComponents'));
app.filter('tableComponents', _dereq_('./filters/tableComponents'));
app.filter('tableView', _dereq_('./filters/tableView'));
app.filter('tableFieldView', _dereq_('./filters/tableFieldView'));
app.filter('safehtml', _dereq_('./filters/safehtml'));
app.filter('formioTranslate', _dereq_('./filters/translate'));

app.config([
  '$httpProvider',
  function(
    $httpProvider
  ) {
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }

    // Disable IE caching for GET requests.
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get.Pragma = 'no-cache';
    $httpProvider.interceptors.push('formioInterceptor');
  }
]);

app.run([
  '$templateCache',
  function($templateCache) {
    // The template for the formio forms.
    $templateCache.put('formio.html',
      "<div>\n  <i style=\"font-size: 2em;\" ng-if=\"formLoading\" ng-class=\"{'formio-hidden': !formLoading}\" class=\"formio-loading glyphicon glyphicon-refresh glyphicon-spin\"></i>\n  <formio-wizard ng-if=\"form.display === 'wizard'\" src=\"src\" form=\"form\" submission=\"submission\" form-action=\"formAction\" read-only=\"readOnly\" hide-components=\"hideComponents\" formio-options=\"formioOptions\" storage=\"form.name\"></formio-wizard>\n  <form ng-if=\"!form.display || (form.display === 'form')\" role=\"form\" name=\"formioForm\" ng-submit=\"onSubmit(formioForm)\" novalidate>\n    <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n      {{ alert.message }}\n    </div>\n    <!-- DO NOT PUT \"track by $index\" HERE SINCE DYNAMICALLY ADDING/REMOVING COMPONENTS WILL BREAK -->\n    <formio-component\n      ng-repeat=\"component in form.components\"\n      component=\"component\"\n      data=\"submission.data\"\n      formio-form=\"formioForm\"\n      formio=\"formio\"\n      read-only=\"readOnly || component.disabled\"\n      ng-if=\"show[component.key || '']\"\n      show=\"show\"\n    ></formio-component>\n  </form>\n</div>\n"
    );

    $templateCache.put('formio-wizard.html',
      "<div class=\"formio-wizard-wrapper\">\n  <div class=\"row bs-wizard\" style=\"border-bottom:0;\" ng-class=\"{hasTitles: hasTitles}\">\n    <div ng-class=\"{disabled: ($index > currentPage), active: ($index == currentPage), complete: ($index < currentPage), noTitle: !page.title}\" class=\"{{ colclass }} bs-wizard-step\" ng-repeat=\"page in pages track by $index\">\n      <div class=\"text-center bs-wizard-stepnum\" ng-if=\"page.title\">{{ page.title }}</div>\n      <div class=\"progress\"><div class=\"progress-bar progress-bar-primary\"></div></div>\n      <a ng-click=\"goto($index)\" class=\"bs-wizard-dot bg-primary\"><div class=\"bs-wizard-dot-inner bg-success\"></div></a>\n    </div>\n  </div>\n  <style type=\"text/css\">.bs-wizard > .bs-wizard-step:first-child { margin-left: {{ margin }}%; }</style>\n  <i ng-show=\"!wizardLoaded\" id=\"formio-loading\" style=\"font-size: 2em;\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">{{ alert.message }}</div>\n  <div class=\"formio-wizard\"></div>\n  <ul ng-show=\"wizardLoaded\" class=\"list-inline\">\n    <li><a class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</a></li>\n    <li ng-if=\"currentPage > 0\"><a class=\"btn btn-primary\" ng-click=\"prev()\">Previous</a></li>\n    <li ng-if=\"currentPage < (form.components.length - 1)\">\n      <a class=\"btn btn-primary\" ng-click=\"next()\">Next</a>\n    </li>\n    <li ng-if=\"currentPage >= (form.components.length - 1)\">\n      <a class=\"btn btn-primary\" ng-click=\"submit()\">Submit Form</a>\n    </li>\n  </ul>\n</div>\n"
    );

    $templateCache.put('formio-delete.html',
      "<form role=\"form\">\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n    {{ alert.message }}\n  </div>\n  <h3>{{ deleteMessage }}</h3>\n  <div class=\"btn-toolbar\">\n    <button ng-click=\"onDelete()\" class=\"btn btn-danger\">Yes</button>\n    <button ng-click=\"onCancel()\" class=\"btn btn-default\">No</button>\n  </div>\n</form>\n"
    );

    $templateCache.put('formio/submission.html',
      "<div>\n  <div ng-repeat=\"component in form.components track by $index\">\n    <formio-component-view form=\"form\" component=\"component\" data=\"submission.data\" ignore=\"ignore\"></formio-component-view>\n  </div>\n</div>\n"
    );

    $templateCache.put('formio/submissions.html',
      "<div>\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n    {{ alert.message }}\n  </div>\n  <table class=\"table\">\n    <thead>\n      <tr>\n        <th ng-repeat=\"component in form.components track by $index | flattenComponents\" ng-if=\"tableView(component)\">{{ component.label || component.key }}</th>\n        <th>Submitted</th>\n        <th>Updated</th>\n        <th>Operations</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"submission in submissions track by $index\" class=\"formio-submission\" ng-click=\"$emit('submissionView', submission)\">\n        <td ng-repeat=\"component in form.components track by $index | flattenComponents\" ng-if=\"tableView(component)\">{{ submission.data | tableView:component }}</td>\n        <td>{{ submission.created | amDateFormat:'l, h:mm:ss a' }}</td>\n        <td>{{ submission.modified | amDateFormat:'l, h:mm:ss a' }}</td>\n        <td>\n          <div class=\"button-group\" style=\"display:flex;\">\n            <a ng-click=\"$emit('submissionView', submission); $event.stopPropagation();\" class=\"btn btn-primary btn-xs\"><span class=\"glyphicon glyphicon-eye-open\"></span></a>&nbsp;\n            <a ng-click=\"$emit('submissionEdit', submission); $event.stopPropagation();\" class=\"btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-edit\"></span></a>&nbsp;\n            <a ng-click=\"$emit('submissionDelete', submission); $event.stopPropagation();\" class=\"btn btn-danger btn-xs\"><span class=\"glyphicon glyphicon-remove-circle\"></span></a>\n          </div>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n  <pagination\n    ng-if=\"submissions.serverCount > perPage\"\n    ng-model=\"currentPage\"\n    ng-change=\"pageChanged(currentPage)\"\n    total-items=\"submissions.serverCount\"\n    items-per-page=\"perPage\"\n    direction-links=\"false\"\n    boundary-links=\"true\"\n    first-text=\"&laquo;\"\n    last-text=\"&raquo;\"\n    >\n  </pagination>\n</div>\n"
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      "<div class=\"form-group has-feedback form-field-type-{{ component.type }} formio-component-{{ component.key }} {{component.customClass}}\" id=\"form-group-{{ componentId }}\" ng-class=\"{'has-error': formioForm[componentId].$invalid && !formioForm[componentId].$pristine }\" ng-style=\"component.style\" ng-hide=\"component.hidden\">\n  <formio-element></formio-element>\n</div>\n"
    );

    $templateCache.put('formio/component-view.html',
      "<div name=\"{{ componentId }}\" class=\"form-group has-feedback form-field-type-{{ component.type }} {{component.customClass}} formio-component-{{ component.key }}\" id=\"form-group-{{ componentId }}\" ng-style=\"component.style\" ng-hide=\"component.hidden\">\n  <formio-element ng-if=\"shouldShow\"></formio-element>\n</div>\n"
    );

    $templateCache.put('formio/element-view.html',
      "<div>\n  <div><strong>{{ component.label }}</strong></div>\n  <div ng-bind-html=\"data | tableView:component\"></div>\n</div>\n"
    );

    $templateCache.put('formio/errors.html',
      "<div ng-show=\"formioForm[componentId].$error && !formioForm[componentId].$pristine\">\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.email\">{{ component.label || component.placeholder || component.key }} must be a valid email.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.required\">{{ component.label || component.placeholder || component.key }} is required.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.number\">{{ component.label || component.placeholder || component.key }} must be a number.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.maxlength\">{{ component.label || component.placeholder || component.key }} must be shorter than {{ component.validate.maxLength + 1 }} characters.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.minlength\">{{ component.label || component.placeholder || component.key }} must be longer than {{ component.validate.minLength - 1 }} characters.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.min\">{{ component.label || component.placeholder || component.key }} must be higher than {{ component.validate.min - 1 }}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.max\">{{ component.label || component.placeholder || component.key }} must be lower than {{ component.validate.max + 1 }}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.custom\">{{ component.customError }}</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.pattern\">{{ component.label || component.placeholder || component.key }} does not match the pattern {{ component.validate.pattern }}</p>\n</div>\n"
    );
  }
]);

_dereq_('./components');

},{"./components":28,"./directives/customValidator":44,"./directives/formio":45,"./directives/formioComponent":46,"./directives/formioComponentView":47,"./directives/formioDelete":48,"./directives/formioElement":49,"./directives/formioErrors":50,"./directives/formioSubmission":51,"./directives/formioSubmissions":52,"./directives/formioWizard":53,"./factories/FormioScope":54,"./factories/FormioUtils":55,"./factories/formioInterceptor":56,"./factories/formioTableView":57,"./filters/flattenComponents":58,"./filters/safehtml":59,"./filters/tableComponents":60,"./filters/tableFieldView":61,"./filters/tableView":62,"./filters/translate":63,"./providers/Formio":65}],65:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  // The formio class.
  var Formio = _dereq_('formiojs');

  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: Formio.setBaseUrl,
    getBaseUrl: Formio.getBaseUrl,
    setApiUrl: Formio.setBaseUrl,
    getApiUrl: Formio.getBaseUrl,
    setAppUrl: Formio.setAppUrl,
    getAppUrl: Formio.getAppUrl,
    registerPlugin: Formio.registerPlugin,
    getPlugin: Formio.getPlugin,
    providers: Formio.providers,
    setDomain: function() {
      // Remove this?
    },

    $get: [
      '$rootScope',
      '$q',
      function(
        $rootScope,
        $q
      ) {
        var wrapQPromise = function(promise) {
          return $q.when(promise)
          .catch(function(error) {
            if (error === 'Unauthorized') {
              $rootScope.$broadcast('formio.unauthorized', error);
            }
            else if (error === 'Login Timeout') {
              $rootScope.$broadcast('formio.sessionExpired', error);
            }
            // Propagate error
            throw error;
          });
        };

        Formio.registerPlugin({
          priority: -100,
          // Wrap Formio.request's promises with $q so $apply gets called correctly.
          wrapRequestPromise: wrapQPromise,
          wrapStaticRequestPromise: wrapQPromise
        }, 'ngFormioPromiseWrapper');

        // Broadcast offline events from $rootScope
        Formio.events.onAny(function() {
          var event = 'formio.' + this.event;
          var args = [].splice.call(arguments, 0);
          args.unshift(event);
          $rootScope.$apply(function() {
            $rootScope.$broadcast.apply($rootScope, args);
          });
        });

        // Return the formio interface.
        return Formio;
      }
    ]
  };
};

},{"formiojs":3}]},{},[64])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZm9ybWlvLXV0aWxzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9zcmMvZm9ybWlvLmpzIiwibm9kZV9tb2R1bGVzL2Zvcm1pb2pzL3NyYy9wcm92aWRlcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZm9ybWlvanMvc3JjL3Byb3ZpZGVycy9zdG9yYWdlL2Ryb3Bib3guanMiLCJub2RlX21vZHVsZXMvZm9ybWlvanMvc3JjL3Byb3ZpZGVycy9zdG9yYWdlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Zvcm1pb2pzL3NyYy9wcm92aWRlcnMvc3RvcmFnZS9zMy5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9zcmMvcHJvdmlkZXJzL3N0b3JhZ2UvdXJsLmpzIiwibm9kZV9tb2R1bGVzL25hdGl2ZS1wcm9taXNlLW9ubHkvbGliL25wby5zcmMuanMiLCJub2RlX21vZHVsZXMvc2hhbGxvdy1jb3B5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsInNyYy9jb21wb25lbnRzL2FkZHJlc3MuanMiLCJzcmMvY29tcG9uZW50cy9idXR0b24uanMiLCJzcmMvY29tcG9uZW50cy9jaGVja2JveC5qcyIsInNyYy9jb21wb25lbnRzL2NvbHVtbnMuanMiLCJzcmMvY29tcG9uZW50cy9jb21wb25lbnRzLmpzIiwic3JjL2NvbXBvbmVudHMvY29udGFpbmVyLmpzIiwic3JjL2NvbXBvbmVudHMvY29udGVudC5qcyIsInNyYy9jb21wb25lbnRzL2N1cnJlbmN5LmpzIiwic3JjL2NvbXBvbmVudHMvY3VzdG9tLmpzIiwic3JjL2NvbXBvbmVudHMvZGF0YWdyaWQuanMiLCJzcmMvY29tcG9uZW50cy9kYXRldGltZS5qcyIsInNyYy9jb21wb25lbnRzL2VtYWlsLmpzIiwic3JjL2NvbXBvbmVudHMvZmllbGRzZXQuanMiLCJzcmMvY29tcG9uZW50cy9maWxlLmpzIiwic3JjL2NvbXBvbmVudHMvaGlkZGVuLmpzIiwic3JjL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuanMiLCJzcmMvY29tcG9uZW50cy9pbmRleC5qcyIsInNyYy9jb21wb25lbnRzL251bWJlci5qcyIsInNyYy9jb21wb25lbnRzL3BhZ2UuanMiLCJzcmMvY29tcG9uZW50cy9wYW5lbC5qcyIsInNyYy9jb21wb25lbnRzL3Bhc3N3b3JkLmpzIiwic3JjL2NvbXBvbmVudHMvcGhvbmVudW1iZXIuanMiLCJzcmMvY29tcG9uZW50cy9yYWRpby5qcyIsInNyYy9jb21wb25lbnRzL3Jlc291cmNlLmpzIiwic3JjL2NvbXBvbmVudHMvc2VsZWN0LmpzIiwic3JjL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMuanMiLCJzcmMvY29tcG9uZW50cy9zaWduYXR1cmUuanMiLCJzcmMvY29tcG9uZW50cy9zdXJ2ZXkuanMiLCJzcmMvY29tcG9uZW50cy90YWJsZS5qcyIsInNyYy9jb21wb25lbnRzL3RleHRhcmVhLmpzIiwic3JjL2NvbXBvbmVudHMvdGV4dGZpZWxkLmpzIiwic3JjL2NvbXBvbmVudHMvd2VsbC5qcyIsInNyYy9kaXJlY3RpdmVzL2N1c3RvbVZhbGlkYXRvci5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pby5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudC5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudFZpZXcuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9EZWxldGUuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9FbGVtZW50LmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvU3VibWlzc2lvbi5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvV2l6YXJkLmpzIiwic3JjL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZS5qcyIsInNyYy9mYWN0b3JpZXMvRm9ybWlvVXRpbHMuanMiLCJzcmMvZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yLmpzIiwic3JjL2ZhY3Rvcmllcy9mb3JtaW9UYWJsZVZpZXcuanMiLCJzcmMvZmlsdGVycy9mbGF0dGVuQ29tcG9uZW50cy5qcyIsInNyYy9maWx0ZXJzL3NhZmVodG1sLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVDb21wb25lbnRzLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVGaWVsZFZpZXcuanMiLCJzcmMvZmlsdGVycy90YWJsZVZpZXcuanMiLCJzcmMvZmlsdGVycy90cmFuc2xhdGUuanMiLCJzcmMvZm9ybWlvLmpzIiwic3JjL3Byb3ZpZGVycy9Gb3JtaW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxc0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0dkJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIGEgY29tcG9uZW50IGlzIGEgbGF5b3V0IGNvbXBvbmVudCBvciBub3QuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnRcbiAgICogICBUaGUgY29tcG9uZW50IHRvIGNoZWNrLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICogICBXaGV0aGVyIG9yIG5vdCB0aGUgY29tcG9uZW50IGlzIGEgbGF5b3V0IGNvbXBvbmVudC5cbiAgICovXG4gIGlzTGF5b3V0Q29tcG9uZW50OiBmdW5jdGlvbiBpc0xheW91dENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICByZXR1cm4gKFxuICAgICAgKGNvbXBvbmVudC5jb2x1bW5zICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LmNvbHVtbnMpKSB8fFxuICAgICAgKGNvbXBvbmVudC5yb3dzICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LnJvd3MpKSB8fFxuICAgICAgKGNvbXBvbmVudC5jb21wb25lbnRzICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LmNvbXBvbmVudHMpKVxuICAgICkgPyB0cnVlIDogZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGNvbXBvbmVudCB3aXRoaW4gYSBmb3JtLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50c1xuICAgKiAgIFRoZSBjb21wb25lbnRzIHRvIGl0ZXJhdGUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqICAgVGhlIGl0ZXJhdGlvbiBmdW5jdGlvbiB0byBpbnZva2UgZm9yIGVhY2ggY29tcG9uZW50LlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGluY2x1ZGVBbGxcbiAgICogICBXaGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIGxheW91dCBjb21wb25lbnRzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiAgIFRoZSBjdXJyZW50IGRhdGEgcGF0aCBvZiB0aGUgZWxlbWVudC4gRXhhbXBsZTogZGF0YS51c2VyLmZpcnN0TmFtZVxuICAgKi9cbiAgZWFjaENvbXBvbmVudDogZnVuY3Rpb24gZWFjaENvbXBvbmVudChjb21wb25lbnRzLCBmbiwgaW5jbHVkZUFsbCwgcGF0aCkge1xuICAgIGlmICghY29tcG9uZW50cykgcmV0dXJuO1xuICAgIHBhdGggPSBwYXRoIHx8ICcnO1xuICAgIGNvbXBvbmVudHMuZm9yRWFjaChmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgIHZhciBoYXNDb2x1bW5zID0gY29tcG9uZW50LmNvbHVtbnMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29sdW1ucyk7XG4gICAgICB2YXIgaGFzUm93cyA9IGNvbXBvbmVudC5yb3dzICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LnJvd3MpO1xuICAgICAgdmFyIGhhc0NvbXBzID0gY29tcG9uZW50LmNvbXBvbmVudHMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29tcG9uZW50cyk7XG4gICAgICB2YXIgbm9SZWN1cnNlID0gZmFsc2U7XG4gICAgICB2YXIgbmV3UGF0aCA9IGNvbXBvbmVudC5rZXkgPyAocGF0aCA/IChwYXRoICsgJy4nICsgY29tcG9uZW50LmtleSkgOiBjb21wb25lbnQua2V5KSA6ICcnO1xuXG4gICAgICBpZiAoaW5jbHVkZUFsbCB8fCBjb21wb25lbnQudHJlZSB8fCAoIWhhc0NvbHVtbnMgJiYgIWhhc1Jvd3MgJiYgIWhhc0NvbXBzKSkge1xuICAgICAgICBub1JlY3Vyc2UgPSBmbihjb21wb25lbnQsIG5ld1BhdGgpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3ViUGF0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY29tcG9uZW50LmtleSAmJiAoKGNvbXBvbmVudC50eXBlID09PSAnZGF0YWdyaWQnKSB8fCAoY29tcG9uZW50LnR5cGUgPT09ICdjb250YWluZXInKSkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3UGF0aDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgIH07XG5cbiAgICAgIGlmICghbm9SZWN1cnNlKSB7XG4gICAgICAgIGlmIChoYXNDb2x1bW5zKSB7XG4gICAgICAgICAgY29tcG9uZW50LmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgICAgIGVhY2hDb21wb25lbnQoY29sdW1uLmNvbXBvbmVudHMsIGZuLCBpbmNsdWRlQWxsLCBzdWJQYXRoKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxzZSBpZiAoaGFzUm93cykge1xuICAgICAgICAgIFtdLmNvbmNhdC5hcHBseShbXSwgY29tcG9uZW50LnJvd3MpLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICAgICAgICBlYWNoQ29tcG9uZW50KHJvdy5jb21wb25lbnRzLCBmbiwgaW5jbHVkZUFsbCwgc3ViUGF0aCgpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsc2UgaWYgKGhhc0NvbXBzKSB7XG4gICAgICAgICAgZWFjaENvbXBvbmVudChjb21wb25lbnQuY29tcG9uZW50cywgZm4sIGluY2x1ZGVBbGwsIHN1YlBhdGgoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGEgY29tcG9uZW50IGJ5IGl0cyBrZXlcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudHNcbiAgICogICBUaGUgY29tcG9uZW50cyB0byBpdGVyYXRlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gICAqICAgVGhlIGtleSBvZiB0aGUgY29tcG9uZW50IHRvIGdldC5cbiAgICpcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICogICBUaGUgY29tcG9uZW50IHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4ga2V5LCBvciB1bmRlZmluZWQgaWYgbm90IGZvdW5kLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50OiBmdW5jdGlvbiBnZXRDb21wb25lbnQoY29tcG9uZW50cywga2V5KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBtb2R1bGUuZXhwb3J0cy5lYWNoQ29tcG9uZW50KGNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgaWYgKGNvbXBvbmVudC5rZXkgPT09IGtleSkge1xuICAgICAgICByZXN1bHQgPSBjb21wb25lbnQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogRmxhdHRlbiB0aGUgZm9ybSBjb21wb25lbnRzIGZvciBkYXRhIG1hbmlwdWxhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudHNcbiAgICogICBUaGUgY29tcG9uZW50cyB0byBpdGVyYXRlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGluY2x1ZGVBbGxcbiAgICogICBXaGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIGxheW91dCBjb21wb25lbnRzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKiAgIFRoZSBmbGF0dGVuZWQgY29tcG9uZW50cyBtYXAuXG4gICAqL1xuICBmbGF0dGVuQ29tcG9uZW50czogZnVuY3Rpb24gZmxhdHRlbkNvbXBvbmVudHMoY29tcG9uZW50cywgaW5jbHVkZUFsbCkge1xuICAgIHZhciBmbGF0dGVuZWQgPSB7fTtcbiAgICBtb2R1bGUuZXhwb3J0cy5lYWNoQ29tcG9uZW50KGNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCwgcGF0aCkge1xuICAgICAgZmxhdHRlbmVkW3BhdGhdID0gY29tcG9uZW50O1xuICAgIH0sIGluY2x1ZGVBbGwpO1xuICAgIHJldHVybiBmbGF0dGVuZWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdmFsdWUgZm9yIGEgY29tcG9uZW50IGtleSwgaW4gdGhlIGdpdmVuIHN1Ym1pc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzdWJtaXNzaW9uXG4gICAqICAgQSBzdWJtaXNzaW9uIG9iamVjdCB0byBzZWFyY2guXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAgICogICBBIGZvciBjb21wb25lbnRzIEFQSSBrZXkgdG8gc2VhcmNoIGZvci5cbiAgICovXG4gIGdldFZhbHVlOiBmdW5jdGlvbiBnZXRWYWx1ZShzdWJtaXNzaW9uLCBrZXkpIHtcbiAgICB2YXIgZGF0YSA9IHN1Ym1pc3Npb24uZGF0YSB8fCB7fTtcblxuICAgIHZhciBzZWFyY2ggPSBmdW5jdGlvbiBzZWFyY2goZGF0YSkge1xuICAgICAgdmFyIGk7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNlYXJjaChkYXRhW2ldKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGF0YSk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2tleXNbaV1dID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdmFsdWUgPSBzZWFyY2goZGF0YVtrZXlzW2ldXSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzZWFyY2goZGF0YSk7XG4gIH1cbn07XG4iLCIvKiFcclxuICogRXZlbnRFbWl0dGVyMlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbiAqL1xyXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xyXG5cclxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XHJcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcclxuICB9O1xyXG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XHJcblxyXG4gIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcclxuICAgIGlmICh0aGlzLl9jb25mKSB7XHJcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcclxuICAgIGlmIChjb25mKSB7XHJcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xyXG5cclxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xyXG4gICAgICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCA/IGNvbmYubWF4TGlzdGVuZXJzIDogZGVmYXVsdE1heExpc3RlbmVycztcclxuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xyXG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XHJcblxyXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbG9nUG9zc2libGVNZW1vcnlMZWFrKGNvdW50KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcclxuICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXHJcbiAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxyXG4gICAgICBjb3VudCk7XHJcblxyXG4gICAgaWYgKGNvbnNvbGUudHJhY2Upe1xyXG4gICAgICBjb25zb2xlLnRyYWNlKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XHJcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcclxuICB9XHJcbiAgRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZvciBleHBvcnRpbmcgRXZlbnRFbWl0dGVyIHByb3BlcnR5XHJcblxyXG4gIC8vXHJcbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXHJcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXHJcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xyXG4gIC8vXHJcbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XHJcbiAgICBpZiAoIXRyZWUpIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxyXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcclxuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xyXG4gICAgICAvL1xyXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXHJcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXHJcbiAgICAgIC8vXHJcbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xyXG4gICAgICAgIHJldHVybiBbdHJlZV07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XHJcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbdHJlZV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XHJcbiAgICAgIC8vXHJcbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcclxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXHJcbiAgICAgIC8vXHJcbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XHJcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xyXG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xyXG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcclxuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XHJcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XHJcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcclxuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cclxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XHJcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XHJcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xyXG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcclxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxyXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xyXG4gICAgaWYgKHhUcmVlKSB7XHJcbiAgICAgIC8vXHJcbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXHJcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcclxuICAgICAgLy9cclxuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcclxuICAgIH1cclxuXHJcbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xyXG4gICAgaWYoeHhUcmVlKSB7XHJcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XHJcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcclxuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXHJcbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxyXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XHJcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xyXG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXHJcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcclxuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxyXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcclxuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XHJcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xyXG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcclxuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XHJcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XHJcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbGlzdGVuZXJzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xyXG5cclxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcclxuXHJcbiAgICAvL1xyXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXHJcbiAgICAvL1xyXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcclxuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xyXG5cclxuICAgIHdoaWxlIChuYW1lICE9PSB1bmRlZmluZWQpIHtcclxuXHJcbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xyXG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XHJcblxyXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcclxuXHJcbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcclxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnNdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICF0cmVlLl9saXN0ZW5lcnMud2FybmVkICYmXHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPiAwICYmXHJcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzXHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGxvZ1Bvc3NpYmxlTWVtb3J5TGVhayh0cmVlLl9saXN0ZW5lcnMubGVuZ3RoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxyXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxyXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxyXG4gIC8vXHJcbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXHJcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcclxuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuICAgICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XHJcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xyXG4gICAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgIHRoaXMubWFueShldmVudCwgMSwgZm4pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XHJcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xyXG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XHJcbiAgICAgIH1cclxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XHJcblxyXG4gICAgdGhpcy5vbihldmVudCwgbGlzdGVuZXIpO1xyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XHJcblxyXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XHJcblxyXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcclxuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xyXG4gICAgdmFyIGFyZ3MsbCxpLGo7XHJcbiAgICB2YXIgaGFuZGxlcjtcclxuXHJcbiAgICBpZiAodGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGgpIHtcclxuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xyXG4gICAgICBpZiAoYWwgPiAzKSB7XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XHJcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xyXG4gICAgICAgIHN3aXRjaCAoYWwpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICBoYW5kbGVyID0gW107XHJcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xyXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcclxuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XHJcbiAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XHJcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxyXG4gICAgICAgIC8vIG9mIGVtaXQgY2FsbFxyXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xyXG4gICAgICBpZiAoYWwgPiAzKSB7XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcclxuICAgICAgfVxyXG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcclxuICAgICAgICBzd2l0Y2ggKGFsKSB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcclxuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICEhdGhpcy5fYWxsO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFzeW5jID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcclxuXHJcbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xyXG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xyXG5cclxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XHJcbiAgICB2YXIgYXJncyxsLGksajtcclxuICAgIHZhciBoYW5kbGVyO1xyXG5cclxuICAgIGlmICh0aGlzLl9hbGwpIHtcclxuICAgICAgaWYgKGFsID4gMykge1xyXG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xyXG4gICAgICB9XHJcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgaGFuZGxlciA9IFtdO1xyXG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcclxuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xyXG4gICAgICBzd2l0Y2ggKGFsKSB7XHJcbiAgICAgIGNhc2UgMTpcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMjpcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAzOlxyXG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcclxuICAgICAgaWYgKGFsID4gMykge1xyXG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcclxuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcclxuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcclxuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLm9uQW55KHR5cGUpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxyXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cclxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XHJcblxyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcclxuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXHJcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgLy8gQ2hhbmdlIHRvIGFycmF5LlxyXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXHJcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXHJcbiAgICAgIGlmIChcclxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxyXG4gICAgICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPiAwICYmXHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnNcclxuICAgICAgKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XHJcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrKHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XHJcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5fYWxsKSB7XHJcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXHJcbiAgICB0aGlzLl9hbGwucHVzaChmbik7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xyXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xyXG5cclxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XHJcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cclxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xyXG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcclxuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xyXG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcclxuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XHJcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xyXG5cclxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XHJcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XHJcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XHJcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcclxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxyXG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xyXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3Qocm9vdCkge1xyXG4gICAgICBpZiAocm9vdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocm9vdCk7XHJcbiAgICAgIGZvciAodmFyIGkgaW4ga2V5cykge1xyXG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xyXG4gICAgICAgIHZhciBvYmogPSByb290W2tleV07XHJcbiAgICAgICAgaWYgKChvYmogaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpIHx8IChvYmogPT09IG51bGwpKVxyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290W2tleV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIGRlbGV0ZSByb290W2tleV07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHRoaXMubGlzdGVuZXJUcmVlKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XHJcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XHJcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcclxuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcclxuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbik7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcclxuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKylcclxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lckFueVwiLCBmbnNbaV0pO1xyXG4gICAgICB0aGlzLl9hbGwgPSBbXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XHJcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XHJcblxyXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcclxuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcclxuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHMpIHtcclxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgdmFyIGhhbmRsZXJzID0gW107XHJcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xyXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcclxuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XHJcblxyXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xyXG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcclxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuICAgIHJldHVybiB0aGlzLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICBpZih0aGlzLl9hbGwpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcblxyXG4gIH07XHJcblxyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XHJcbiAgICB9KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgLy8gQ29tbW9uSlNcclxuICAgIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxyXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XHJcbiAgfVxyXG59KCk7XHJcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gSW50ZW50aW9uYWxseSB1c2UgbmF0aXZlLXByb21pc2Utb25seSBoZXJlLi4uIE90aGVyIHByb21pc2UgbGlicmFyaWVzIChlczYtcHJvbWlzZSlcbi8vIGR1Y2stcHVuY2ggdGhlIGdsb2JhbCBQcm9taXNlIGRlZmluaXRpb24gd2hpY2ggbWVzc2VzIHVwIEFuZ3VsYXIgMiBzaW5jZSBpdFxuLy8gYWxzbyBkdWNrLXB1bmNoZXMgdGhlIGdsb2JhbCBQcm9taXNlIGRlZmluaXRpb24uIEZvciBub3csIGtlZXAgbmF0aXZlLXByb21pc2Utb25seS5cbnZhciBQcm9taXNlID0gcmVxdWlyZShcIm5hdGl2ZS1wcm9taXNlLW9ubHlcIik7XG5cbi8vIFJlcXVpcmUgb3RoZXIgbGlicmFyaWVzLlxucmVxdWlyZSgnd2hhdHdnLWZldGNoJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XG52YXIgY29weSA9IHJlcXVpcmUoJ3NoYWxsb3ctY29weScpO1xudmFyIHByb3ZpZGVycyA9IHJlcXVpcmUoJy4vcHJvdmlkZXJzJyk7XG5cbi8vIFRoZSBkZWZhdWx0IGJhc2UgdXJsLlxudmFyIGJhc2VVcmwgPSAnaHR0cHM6Ly9hcGkuZm9ybS5pbyc7XG52YXIgYXBwVXJsID0gYmFzZVVybDtcbnZhciBhcHBVcmxTZXQgPSBmYWxzZTtcblxudmFyIHBsdWdpbnMgPSBbXTtcblxuLy8gVGhlIHRlbXBvcmFyeSBHRVQgcmVxdWVzdCBjYWNoZSBzdG9yYWdlXG52YXIgY2FjaGUgPSB7fTtcblxudmFyIG5vb3AgPSBmdW5jdGlvbigpe307XG52YXIgaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbi8vIFdpbGwgaW52b2tlIGEgZnVuY3Rpb24gb24gYWxsIHBsdWdpbnMuXG4vLyBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gYWxsIHByb21pc2VzXG4vLyByZXR1cm5lZCBieSB0aGUgcGx1Z2lucyBoYXZlIHJlc29sdmVkLlxuLy8gU2hvdWxkIGJlIHVzZWQgd2hlbiB5b3Ugd2FudCBwbHVnaW5zIHRvIHByZXBhcmUgZm9yIGFuIGV2ZW50XG4vLyBidXQgZG9uJ3Qgd2FudCBhbnkgZGF0YSByZXR1cm5lZC5cbnZhciBwbHVnaW5XYWl0ID0gZnVuY3Rpb24ocGx1Z2luRm4pIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHJldHVybiBQcm9taXNlLmFsbChwbHVnaW5zLm1hcChmdW5jdGlvbihwbHVnaW4pIHtcbiAgICByZXR1cm4gKHBsdWdpbltwbHVnaW5Gbl0gfHwgbm9vcCkuYXBwbHkocGx1Z2luLCBhcmdzKTtcbiAgfSkpO1xufTtcblxuLy8gV2lsbCBpbnZva2UgYSBmdW5jdGlvbiBvbiBwbHVnaW5zIGZyb20gaGlnaGVzdCBwcmlvcml0eVxuLy8gdG8gbG93ZXN0IHVudGlsIG9uZSByZXR1cm5zIGEgdmFsdWUuIFJldHVybnMgbnVsbCBpZiBub1xuLy8gcGx1Z2lucyByZXR1cm4gYSB2YWx1ZS5cbi8vIFNob3VsZCBiZSB1c2VkIHdoZW4geW91IHdhbnQganVzdCBvbmUgcGx1Z2luIHRvIGhhbmRsZSB0aGluZ3MuXG52YXIgcGx1Z2luR2V0ID0gZnVuY3Rpb24ocGx1Z2luRm4pIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHZhciBjYWxsUGx1Z2luID0gZnVuY3Rpb24oaW5kZXgsIHBsdWdpbkZuKSB7XG4gICAgdmFyIHBsdWdpbiA9IHBsdWdpbnNbaW5kZXhdO1xuICAgIGlmICghcGx1Z2luKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKHBsdWdpbiAmJiBwbHVnaW5bcGx1Z2luRm5dIHx8IG5vb3ApLmFwcGx5KHBsdWdpbiwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIGlmIChyZXN1bHQgIT09IG51bGwgJiYgcmVzdWx0ICE9PSB1bmRlZmluZWQpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gY2FsbFBsdWdpbi5hcHBseShudWxsLCBbaW5kZXggKyAxXS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuICB9O1xuICByZXR1cm4gY2FsbFBsdWdpbi5hcHBseShudWxsLCBbMF0uY29uY2F0KGFyZ3MpKTtcbn07XG5cbi8vIFdpbGwgaW52b2tlIGEgZnVuY3Rpb24gb24gcGx1Z2lucyBmcm9tIGhpZ2hlc3QgcHJpb3JpdHkgdG9cbi8vIGxvd2VzdCwgYnVpbGRpbmcgYSBwcm9taXNlIGNoYWluIGZyb20gdGhlaXIgcmV0dXJuIHZhbHVlc1xuLy8gU2hvdWxkIGJlIHVzZWQgd2hlbiBhbGwgcGx1Z2lucyBuZWVkIHRvIHByb2Nlc3MgYSBwcm9taXNlJ3Ncbi8vIHN1Y2Nlc3Mgb3IgZmFpbHVyZVxudmFyIHBsdWdpbkFsdGVyID0gZnVuY3Rpb24ocGx1Z2luRm4sIHZhbHVlKSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICByZXR1cm4gcGx1Z2lucy5yZWR1Y2UoZnVuY3Rpb24odmFsdWUsIHBsdWdpbikge1xuICAgICAgcmV0dXJuIChwbHVnaW5bcGx1Z2luRm5dIHx8IGlkZW50aXR5KS5hcHBseShwbHVnaW4sIFt2YWx1ZV0uY29uY2F0KGFyZ3MpKTtcbiAgfSwgdmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFJldHVybnMgcGFydHMgb2YgdGhlIFVSTCB0aGF0IGFyZSBpbXBvcnRhbnQuXG4gKiBJbmRleGVzXG4gKiAgLSAwOiBUaGUgZnVsbCB1cmxcbiAqICAtIDE6IFRoZSBwcm90b2NvbFxuICogIC0gMjogVGhlIGhvc3RuYW1lXG4gKiAgLSAzOiBUaGUgcmVzdFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEByZXR1cm5zIHsqfVxuICovXG52YXIgZ2V0VXJsUGFydHMgPSBmdW5jdGlvbih1cmwpIHtcbiAgdmFyIHJlZ2V4ID0gJ14oaHR0cFtzXT86XFxcXC9cXFxcLyknO1xuICBpZiAoYmFzZVVybCAmJiB1cmwuaW5kZXhPZihiYXNlVXJsKSA9PT0gMCkge1xuICAgIHJlZ2V4ICs9ICcoJyArIGJhc2VVcmwucmVwbGFjZSgvXmh0dHBbc10/OlxcL1xcLy8sICcnKSArICcpJztcbiAgfVxuICBlbHNlIHtcbiAgICByZWdleCArPSAnKFteL10rKSc7XG4gIH1cbiAgcmVnZXggKz0gJygkfFxcXFwvLiopJztcbiAgcmV0dXJuIHVybC5tYXRjaChuZXcgUmVnRXhwKHJlZ2V4KSk7XG59O1xuXG52YXIgc2VyaWFsaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBzdHIgPSBbXTtcbiAgZm9yKHZhciBwIGluIG9iailcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQocCkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbcF0pKTtcbiAgICB9XG4gIHJldHVybiBzdHIuam9pbihcIiZcIik7XG59O1xuXG4vLyBUaGUgZm9ybWlvIGNsYXNzLlxudmFyIEZvcm1pbyA9IGZ1bmN0aW9uKHBhdGgpIHtcblxuICAvLyBFbnN1cmUgd2UgaGF2ZSBhbiBpbnN0YW5jZSBvZiBGb3JtaW8uXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGb3JtaW8pKSB7IHJldHVybiBuZXcgRm9ybWlvKHBhdGgpOyB9XG4gIGlmICghcGF0aCkge1xuICAgIC8vIEFsbG93IHVzZXIgdG8gY3JlYXRlIG5ldyBwcm9qZWN0cyBpZiB0aGlzIHdhcyBpbnN0YW50aWF0ZWQgd2l0aG91dFxuICAgIC8vIGEgdXJsXG4gICAgdGhpcy5wcm9qZWN0VXJsID0gYmFzZVVybCArICcvcHJvamVjdCc7XG4gICAgdGhpcy5wcm9qZWN0c1VybCA9IGJhc2VVcmwgKyAnL3Byb2plY3QnO1xuICAgIHRoaXMucHJvamVjdElkID0gZmFsc2U7XG4gICAgdGhpcy5xdWVyeSA9ICcnO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEluaXRpYWxpemUgb3VyIHZhcmlhYmxlcy5cbiAgdGhpcy5wcm9qZWN0c1VybCA9ICcnO1xuICB0aGlzLnByb2plY3RVcmwgPSAnJztcbiAgdGhpcy5wcm9qZWN0SWQgPSAnJztcbiAgdGhpcy5mb3JtVXJsID0gJyc7XG4gIHRoaXMuZm9ybXNVcmwgPSAnJztcbiAgdGhpcy5mb3JtSWQgPSAnJztcbiAgdGhpcy5zdWJtaXNzaW9uc1VybCA9ICcnO1xuICB0aGlzLnN1Ym1pc3Npb25VcmwgPSAnJztcbiAgdGhpcy5zdWJtaXNzaW9uSWQgPSAnJztcbiAgdGhpcy5hY3Rpb25zVXJsID0gJyc7XG4gIHRoaXMuYWN0aW9uSWQgPSAnJztcbiAgdGhpcy5hY3Rpb25VcmwgPSAnJztcbiAgdGhpcy5xdWVyeSA9ICcnO1xuXG4gIC8vIE5vcm1hbGl6ZSB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICBpZiAoKHBhdGguaW5kZXhPZignaHR0cCcpICE9PSAwKSAmJiAocGF0aC5pbmRleE9mKCcvLycpICE9PSAwKSkge1xuICAgIGJhc2VVcmwgPSBiYXNlVXJsID8gYmFzZVVybCA6IHdpbmRvdy5sb2NhdGlvbi5ocmVmLm1hdGNoKC9odHRwW3NdPzpcXC9cXC9hcGkuLylbMF07XG4gICAgcGF0aCA9IGJhc2VVcmwgKyBwYXRoO1xuICB9XG5cbiAgdmFyIGhvc3RwYXJ0cyA9IGdldFVybFBhcnRzKHBhdGgpO1xuICB2YXIgcGFydHMgPSBbXTtcbiAgdmFyIGhvc3ROYW1lID0gaG9zdHBhcnRzWzFdICsgaG9zdHBhcnRzWzJdO1xuICBwYXRoID0gaG9zdHBhcnRzLmxlbmd0aCA+IDMgPyBob3N0cGFydHNbM10gOiAnJztcbiAgdmFyIHF1ZXJ5cGFydHMgPSBwYXRoLnNwbGl0KCc/Jyk7XG4gIGlmIChxdWVyeXBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICBwYXRoID0gcXVlcnlwYXJ0c1swXTtcbiAgICB0aGlzLnF1ZXJ5ID0gJz8nICsgcXVlcnlwYXJ0c1sxXTtcbiAgfVxuXG4gIC8vIFNlZSBpZiB0aGlzIGlzIGEgZm9ybSBwYXRoLlxuICBpZiAoKHBhdGguc2VhcmNoKC8oXnxcXC8pKGZvcm18cHJvamVjdCkoJHxcXC8pLykgIT09IC0xKSkge1xuXG4gICAgLy8gUmVnaXN0ZXIgYSBzcGVjaWZpYyBwYXRoLlxuICAgIHZhciByZWdpc3RlclBhdGggPSBmdW5jdGlvbihuYW1lLCBiYXNlKSB7XG4gICAgICB0aGlzW25hbWUgKyAnc1VybCddID0gYmFzZSArICcvJyArIG5hbWU7XG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCdcXC8nICsgbmFtZSArICdcXC8oW14vXSspJyk7XG4gICAgICBpZiAocGF0aC5zZWFyY2gocmVnZXgpICE9PSAtMSkge1xuICAgICAgICBwYXJ0cyA9IHBhdGgubWF0Y2gocmVnZXgpO1xuICAgICAgICB0aGlzW25hbWUgKyAnVXJsJ10gPSBwYXJ0cyA/IChiYXNlICsgcGFydHNbMF0pIDogJyc7XG4gICAgICAgIHRoaXNbbmFtZSArICdJZCddID0gKHBhcnRzLmxlbmd0aCA+IDEpID8gcGFydHNbMV0gOiAnJztcbiAgICAgICAgYmFzZSArPSBwYXJ0c1swXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFuIGFycmF5IG9mIGl0ZW1zLlxuICAgIHZhciByZWdpc3Rlckl0ZW1zID0gZnVuY3Rpb24oaXRlbXMsIGJhc2UsIHN0YXRpY0Jhc2UpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gaXRlbXMpIHtcbiAgICAgICAgaWYgKGl0ZW1zLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICByZWdpc3Rlckl0ZW1zKGl0ZW0sIGJhc2UsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdCYXNlID0gcmVnaXN0ZXJQYXRoKGl0ZW0sIGJhc2UpO1xuICAgICAgICAgICAgYmFzZSA9IHN0YXRpY0Jhc2UgPyBiYXNlIDogbmV3QmFzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmVnaXN0ZXJJdGVtcyhbJ3Byb2plY3QnLCAnZm9ybScsIFsnc3VibWlzc2lvbicsICdhY3Rpb24nXV0sIGhvc3ROYW1lKTtcblxuICAgIGlmICghdGhpcy5wcm9qZWN0SWQpIHtcbiAgICAgIGlmIChob3N0cGFydHMubGVuZ3RoID4gMiAmJiBob3N0cGFydHNbMl0uc3BsaXQoJy4nKS5sZW5ndGggPiAyKSB7XG4gICAgICAgIHRoaXMucHJvamVjdFVybCA9IGhvc3ROYW1lO1xuICAgICAgICB0aGlzLnByb2plY3RJZCA9IGhvc3RwYXJ0c1syXS5zcGxpdCgnLicpWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIHtcblxuICAgIC8vIFRoaXMgaXMgYW4gYWxpYXNlZCB1cmwuXG4gICAgdGhpcy5wcm9qZWN0VXJsID0gaG9zdE5hbWU7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSAoaG9zdHBhcnRzLmxlbmd0aCA+IDIpID8gaG9zdHBhcnRzWzJdLnNwbGl0KCcuJylbMF0gOiAnJztcbiAgICB2YXIgc3ViUmVnRXggPSBuZXcgUmVnRXhwKCdcXC8oc3VibWlzc2lvbnxhY3Rpb24pKCR8XFwvLiopJyk7XG4gICAgdmFyIHN1YnMgPSBwYXRoLm1hdGNoKHN1YlJlZ0V4KTtcbiAgICB0aGlzLnBhdGhUeXBlID0gKHN1YnMgJiYgKHN1YnMubGVuZ3RoID4gMSkpID8gc3Vic1sxXSA6ICcnO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2Uoc3ViUmVnRXgsICcnKTtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8kLywgJycpO1xuICAgIHRoaXMuZm9ybXNVcmwgPSBob3N0TmFtZSArICcvZm9ybSc7XG4gICAgdGhpcy5mb3JtVXJsID0gaG9zdE5hbWUgKyBwYXRoO1xuICAgIHRoaXMuZm9ybUlkID0gcGF0aC5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCAnJyk7XG4gICAgdmFyIGl0ZW1zID0gWydzdWJtaXNzaW9uJywgJ2FjdGlvbiddO1xuICAgIGZvciAodmFyIGkgaW4gaXRlbXMpIHtcbiAgICAgIGlmIChpdGVtcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICB0aGlzW2l0ZW0gKyAnc1VybCddID0gaG9zdE5hbWUgKyBwYXRoICsgJy8nICsgaXRlbTtcbiAgICAgICAgaWYgKCh0aGlzLnBhdGhUeXBlID09PSBpdGVtKSAmJiAoc3Vicy5sZW5ndGggPiAyKSAmJiBzdWJzWzJdKSB7XG4gICAgICAgICAgdGhpc1tpdGVtICsgJ0lkJ10gPSBzdWJzWzJdLnJlcGxhY2UoL15cXC8rfFxcLyskL2csICcnKTtcbiAgICAgICAgICB0aGlzW2l0ZW0gKyAnVXJsJ10gPSBob3N0TmFtZSArIHBhdGggKyBzdWJzWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU2V0IHRoZSBhcHAgdXJsIGlmIGl0IGlzIG5vdCBzZXQuXG4gIGlmICghYXBwVXJsU2V0KSB7XG4gICAgYXBwVXJsID0gdGhpcy5wcm9qZWN0VXJsO1xuICB9XG59O1xuXG4vKipcbiAqIExvYWQgYSByZXNvdXJjZS5cbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xudmFyIF9sb2FkID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgX2lkID0gdHlwZSArICdJZCc7XG4gIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xuICByZXR1cm4gZnVuY3Rpb24ocXVlcnksIG9wdHMpIHtcbiAgICBpZiAocXVlcnkgJiYgdHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xuICAgICAgcXVlcnkgPSBzZXJpYWxpemUocXVlcnkucGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICBxdWVyeSA9IHRoaXMucXVlcnkgPyAodGhpcy5xdWVyeSArICcmJyArIHF1ZXJ5KSA6ICgnPycgKyBxdWVyeSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcXVlcnkgPSB0aGlzLnF1ZXJ5O1xuICAgIH1cbiAgICBpZiAoIXRoaXNbX2lkXSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ01pc3NpbmcgJyArIF9pZCk7IH1cbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCB0aGlzW191cmxdICsgcXVlcnksICdnZXQnLCBudWxsLCBvcHRzKTtcbiAgfTtcbn07XG5cbi8qKlxuICogU2F2ZSBhIHJlc291cmNlLlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX3NhdmUgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBfaWQgPSB0eXBlICsgJ0lkJztcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XG4gIHJldHVybiBmdW5jdGlvbihkYXRhLCBvcHRzKSB7XG4gICAgdmFyIG1ldGhvZCA9IHRoaXNbX2lkXSA/ICdwdXQnIDogJ3Bvc3QnO1xuICAgIHZhciByZXFVcmwgPSB0aGlzW19pZF0gPyB0aGlzW191cmxdIDogdGhpc1t0eXBlICsgJ3NVcmwnXTtcbiAgICBjYWNoZSA9IHt9O1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHR5cGUsIHJlcVVybCArIHRoaXMucXVlcnksIG1ldGhvZCwgZGF0YSwgb3B0cyk7XG4gIH07XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIHJlc291cmNlLlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX2RlbGV0ZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIF9pZCA9IHR5cGUgKyAnSWQnO1xuICB2YXIgX3VybCA9IHR5cGUgKyAnVXJsJztcbiAgcmV0dXJuIGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBpZiAoIXRoaXNbX2lkXSkgeyBQcm9taXNlLnJlamVjdCgnTm90aGluZyB0byBkZWxldGUnKTsgfVxuICAgIGNhY2hlID0ge307XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QodHlwZSwgdGhpc1tfdXJsXSwgJ2RlbGV0ZScsIG51bGwsIG9wdHMpO1xuICB9O1xufTtcblxuLyoqXG4gKiBSZXNvdXJjZSBpbmRleCBtZXRob2QuXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfaW5kZXggPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xuICByZXR1cm4gZnVuY3Rpb24ocXVlcnksIG9wdHMpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5IHx8ICcnO1xuICAgIGlmIChxdWVyeSAmJiB0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XG4gICAgICBxdWVyeSA9ICc/JyArIHNlcmlhbGl6ZShxdWVyeS5wYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCB0aGlzW191cmxdICsgcXVlcnksICdnZXQnLCBudWxsLCBvcHRzKTtcbiAgfTtcbn07XG5cbi8vIEFjdGl2YXRlcyBwbHVnaW4gaG9va3MsIG1ha2VzIEZvcm1pby5yZXF1ZXN0IGlmIG5vIHBsdWdpbiBwcm92aWRlcyBhIHJlcXVlc3RcbkZvcm1pby5wcm90b3R5cGUubWFrZVJlcXVlc3QgPSBmdW5jdGlvbih0eXBlLCB1cmwsIG1ldGhvZCwgZGF0YSwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG1ldGhvZCA9IChtZXRob2QgfHwgJ0dFVCcpLnRvVXBwZXJDYXNlKCk7XG4gIGlmKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIHZhciByZXF1ZXN0QXJncyA9IHtcbiAgICBmb3JtaW86IHNlbGYsXG4gICAgdHlwZTogdHlwZSxcbiAgICB1cmw6IHVybCxcbiAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICBkYXRhOiBkYXRhLFxuICAgIG9wdHM6IG9wdHNcbiAgfTtcblxuICB2YXIgcmVxdWVzdCA9IHBsdWdpbldhaXQoJ3ByZVJlcXVlc3QnLCByZXF1ZXN0QXJncylcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBsdWdpbkdldCgncmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gRm9ybWlvLnJlcXVlc3QodXJsLCBtZXRob2QsIGRhdGEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XG59O1xuXG4vLyBEZWZpbmUgc3BlY2lmaWMgQ1JVRCBtZXRob2RzLlxuRm9ybWlvLnByb3RvdHlwZS5sb2FkUHJvamVjdCA9IF9sb2FkKCdwcm9qZWN0Jyk7XG5Gb3JtaW8ucHJvdG90eXBlLnNhdmVQcm9qZWN0ID0gX3NhdmUoJ3Byb2plY3QnKTtcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlUHJvamVjdCA9IF9kZWxldGUoJ3Byb2plY3QnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZEZvcm0gPSBfbG9hZCgnZm9ybScpO1xuRm9ybWlvLnByb3RvdHlwZS5zYXZlRm9ybSA9IF9zYXZlKCdmb3JtJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZUZvcm0gPSBfZGVsZXRlKCdmb3JtJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRGb3JtcyA9IF9pbmRleCgnZm9ybXMnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZFN1Ym1pc3Npb24gPSBfbG9hZCgnc3VibWlzc2lvbicpO1xuRm9ybWlvLnByb3RvdHlwZS5zYXZlU3VibWlzc2lvbiA9IF9zYXZlKCdzdWJtaXNzaW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZVN1Ym1pc3Npb24gPSBfZGVsZXRlKCdzdWJtaXNzaW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRTdWJtaXNzaW9ucyA9IF9pbmRleCgnc3VibWlzc2lvbnMnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZEFjdGlvbiA9IF9sb2FkKCdhY3Rpb24nKTtcbkZvcm1pby5wcm90b3R5cGUuc2F2ZUFjdGlvbiA9IF9zYXZlKCdhY3Rpb24nKTtcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlQWN0aW9uID0gX2RlbGV0ZSgnYWN0aW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRBY3Rpb25zID0gX2luZGV4KCdhY3Rpb25zJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmF2YWlsYWJsZUFjdGlvbnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QoJ2F2YWlsYWJsZUFjdGlvbnMnLCB0aGlzLmZvcm1VcmwgKyAnL2FjdGlvbnMnKTsgfTtcbkZvcm1pby5wcm90b3R5cGUuYWN0aW9uSW5mbyA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QoJ2FjdGlvbkluZm8nLCB0aGlzLmZvcm1VcmwgKyAnL2FjdGlvbnMvJyArIG5hbWUpOyB9O1xuXG5Gb3JtaW8ucHJvdG90eXBlLnVwbG9hZEZpbGUgPSBmdW5jdGlvbihzdG9yYWdlLCBmaWxlLCBmaWxlTmFtZSwgZGlyLCBwcm9ncmVzc0NhbGxiYWNrKSB7XG4gIHZhciByZXF1ZXN0QXJncyA9IHtcbiAgICBwcm92aWRlcjogc3RvcmFnZSxcbiAgICBtZXRob2Q6ICd1cGxvYWQnLFxuICAgIGZpbGU6IGZpbGUsXG4gICAgZmlsZU5hbWU6IGZpbGVOYW1lLFxuICAgIGRpcjogZGlyXG4gIH1cbiAgdmFyIHJlcXVlc3QgPSBwbHVnaW5XYWl0KCdwcmVSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGx1Z2luR2V0KCdmaWxlUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICBpZiAoc3RvcmFnZSAmJiAocmVzdWx0ID09PSBudWxsIHx8IHJlc3VsdCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKHByb3ZpZGVycy5zdG9yYWdlLmhhc093blByb3BlcnR5KHN0b3JhZ2UpKSB7XG4gICAgICAgICAgICAgIHZhciBwcm92aWRlciA9IG5ldyBwcm92aWRlcnMuc3RvcmFnZVtzdG9yYWdlXSh0aGlzKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3ZpZGVyLnVwbG9hZEZpbGUoZmlsZSwgZmlsZU5hbWUsIGRpciwgcHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3coJ1N0b3JhZ2UgcHJvdmlkZXIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQgfHwge3VybDogJyd9O1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwRmlsZVJlcXVlc3RQcm9taXNlJywgcmVxdWVzdCwgcmVxdWVzdEFyZ3MpO1xufVxuXG5Gb3JtaW8ucHJvdG90eXBlLmRvd25sb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgdmFyIHJlcXVlc3RBcmdzID0ge1xuICAgIG1ldGhvZDogJ2Rvd25sb2FkJyxcbiAgICBmaWxlOiBmaWxlXG4gIH07XG5cbiAgdmFyIHJlcXVlc3QgPSBwbHVnaW5XYWl0KCdwcmVSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGx1Z2luR2V0KCdmaWxlUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICBpZiAoZmlsZS5zdG9yYWdlICYmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAocHJvdmlkZXJzLnN0b3JhZ2UuaGFzT3duUHJvcGVydHkoZmlsZS5zdG9yYWdlKSkge1xuICAgICAgICAgICAgICB2YXIgcHJvdmlkZXIgPSBuZXcgcHJvdmlkZXJzLnN0b3JhZ2VbZmlsZS5zdG9yYWdlXSh0aGlzKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3ZpZGVyLmRvd25sb2FkRmlsZShmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdygnU3RvcmFnZSBwcm92aWRlciBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7dXJsOiAnJ307XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICByZXR1cm4gcGx1Z2luQWx0ZXIoJ3dyYXBGaWxlUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XG59XG5cbkZvcm1pby5tYWtlU3RhdGljUmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBkYXRhKSB7XG4gIG1ldGhvZCA9IChtZXRob2QgfHwgJ0dFVCcpLnRvVXBwZXJDYXNlKCk7XG5cbiAgdmFyIHJlcXVlc3RBcmdzID0ge1xuICAgIHVybDogdXJsLFxuICAgIG1ldGhvZDogbWV0aG9kLFxuICAgIGRhdGE6IGRhdGFcbiAgfTtcblxuICB2YXIgcmVxdWVzdCA9IHBsdWdpbldhaXQoJ3ByZVJlcXVlc3QnLCByZXF1ZXN0QXJncylcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBsdWdpbkdldCgnc3RhdGljUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gRm9ybWlvLnJlcXVlc3QodXJsLCBtZXRob2QsIGRhdGEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwU3RhdGljUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XG59O1xuXG4vLyBTdGF0aWMgbWV0aG9kcy5cbkZvcm1pby5sb2FkUHJvamVjdHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICBxdWVyeSA9IHF1ZXJ5IHx8ICcnO1xuICBpZiAodHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xuICAgIHF1ZXJ5ID0gJz8nICsgc2VyaWFsaXplKHF1ZXJ5LnBhcmFtcyk7XG4gIH1cbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QoYmFzZVVybCArICcvcHJvamVjdCcgKyBxdWVyeSk7XG59O1xuXG5Gb3JtaW8ucmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBkYXRhKSB7XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdObyB1cmwgcHJvdmlkZWQnKTtcbiAgfVxuICBtZXRob2QgPSAobWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xuICB2YXIgY2FjaGVLZXkgPSBidG9hKHVybCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIC8vIEdldCB0aGUgY2FjaGVkIHByb21pc2UgdG8gc2F2ZSBtdWx0aXBsZSBsb2Fkcy5cbiAgICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBjYWNoZS5oYXNPd25Qcm9wZXJ0eShjYWNoZUtleSkpIHtcbiAgICAgIHJlc29sdmUoY2FjaGVbY2FjaGVLZXldKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXNvbHZlKG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBTZXQgdXAgYW5kIGZldGNoIHJlcXVlc3RcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7XG4gICAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdG9rZW4gPSBGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgaGVhZGVycy5hcHBlbmQoJ3gtand0LXRva2VuJywgdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyxcbiAgICAgICAgICBtb2RlOiAnY29ycydcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICBvcHRpb25zLmJvZHkgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc29sdmUoZmV0Y2godXJsLCBvcHRpb25zKSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBlcnIubWVzc2FnZSA9ICdDb3VsZCBub3QgY29ubmVjdCB0byBBUEkgc2VydmVyICgnICsgZXJyLm1lc3NhZ2UgKyAnKSc7XG4gICAgICAgIGVyci5uZXR3b3JrRXJyb3IgPSB0cnVlO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIGZldGNoIHJlc3VsdHNcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgdmFyIHRva2VuID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ3gtand0LXRva2VuJyk7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwICYmIHRva2VuICYmIHRva2VuICE9PSAnJykge1xuICAgICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gMjA0IGlzIG5vIGNvbnRlbnQuIERvbid0IHRyeSB0byAuanNvbigpIGl0LlxuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgIT09IC0xID9cbiAgICAgICAgICAgIHJlc3BvbnNlLmpzb24oKSA6IHJlc3BvbnNlLnRleHQoKSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIEFkZCBzb21lIGNvbnRlbnQtcmFuZ2UgbWV0YWRhdGEgdG8gdGhlIHJlc3VsdCBoZXJlXG4gICAgICAgICAgICB2YXIgcmFuZ2UgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1yYW5nZScpO1xuICAgICAgICAgICAgaWYgKHJhbmdlICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2Uuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgaWYocmFuZ2VbMF0gIT09ICcqJykge1xuICAgICAgICAgICAgICAgIHZhciBza2lwTGltaXQgPSByYW5nZVswXS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5za2lwID0gTnVtYmVyKHNraXBMaW1pdFswXSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmxpbWl0ID0gc2tpcExpbWl0WzFdIC0gc2tpcExpbWl0WzBdICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQuc2VydmVyQ291bnQgPSByYW5nZVsxXSA9PT0gJyonID8gcmFuZ2VbMV0gOiBOdW1iZXIocmFuZ2VbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0NDApIHtcbiAgICAgICAgICAgIEZvcm1pby5zZXRUb2tlbihudWxsKTtcbiAgICAgICAgICAgIEZvcm1pby5ldmVudHMuZW1pdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgcmVzcG9uc2UuYm9keSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICBGb3JtaW8uZXZlbnRzLmVtaXQoJ2Zvcm1pby51bmF1dGhvcml6ZWQnLCByZXNwb25zZS5ib2R5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUGFyc2UgYW5kIHJldHVybiB0aGUgZXJyb3IgYXMgYSByZWplY3RlZCBwcm9taXNlIHRvIHJlamVjdCB0aGlzIHByb21pc2VcbiAgICAgICAgICByZXR1cm4gKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgIT09IC0xID9cbiAgICAgICAgICAgIHJlc3BvbnNlLmpzb24oKSA6IHJlc3BvbnNlLnRleHQoKSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgaWYgKGVyciA9PT0gJ0JhZCBUb2tlbicpIHtcbiAgICAgICAgICBGb3JtaW8uc2V0VG9rZW4obnVsbCk7XG4gICAgICAgICAgRm9ybWlvLmV2ZW50cy5lbWl0KCdmb3JtaW8uYmFkVG9rZW4nLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBmYWlsZWQgcHJvbWlzZXMgZnJvbSBjYWNoZVxuICAgICAgICBkZWxldGUgY2FjaGVbY2FjaGVLZXldO1xuICAgICAgICAvLyBQcm9wYWdhdGUgZXJyb3Igc28gY2xpZW50IGNhbiBoYW5kbGUgYWNjb3JkaW5nbHlcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSkpO1xuICAgIH1cbiAgfSlcbiAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgLy8gU2F2ZSB0aGUgY2FjaGVcbiAgICBpZiAobWV0aG9kID09PSAnR0VUJykge1xuICAgICAgY2FjaGVbY2FjaGVLZXldID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgfVxuXG4gICAgLy8gU2hhbGxvdyBjb3B5IHJlc3VsdCBzbyBtb2RpZmljYXRpb25zIGRvbid0IGVuZCB1cCBpbiBjYWNoZVxuICAgIGlmKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgdmFyIHJlc3VsdENvcHkgPSByZXN1bHQubWFwKGNvcHkpO1xuICAgICAgcmVzdWx0Q29weS5za2lwID0gcmVzdWx0LnNraXA7XG4gICAgICByZXN1bHRDb3B5LmxpbWl0ID0gcmVzdWx0LmxpbWl0O1xuICAgICAgcmVzdWx0Q29weS5zZXJ2ZXJDb3VudCA9IHJlc3VsdC5zZXJ2ZXJDb3VudDtcbiAgICAgIHJldHVybiByZXN1bHRDb3B5O1xuICAgIH1cbiAgICByZXR1cm4gY29weShyZXN1bHQpO1xuICB9KTtcbn07XG5cbkZvcm1pby5zZXRUb2tlbiA9IGZ1bmN0aW9uKHRva2VuKSB7XG4gIHRva2VuID0gdG9rZW4gfHwgJyc7XG4gIGlmICh0b2tlbiA9PT0gdGhpcy50b2tlbikgeyByZXR1cm47IH1cbiAgdGhpcy50b2tlbiA9IHRva2VuO1xuICBpZiAoIXRva2VuKSB7XG4gICAgRm9ybWlvLnNldFVzZXIobnVsbCk7XG4gICAgLy8gaU9TIGluIHByaXZhdGUgYnJvd3NlIG1vZGUgd2lsbCB0aHJvdyBhbiBlcnJvciBidXQgd2UgY2FuJ3QgZGV0ZWN0IGFoZWFkIG9mIHRpbWUgdGhhdCB3ZSBhcmUgaW4gcHJpdmF0ZSBtb2RlLlxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1Rva2VuJyk7XG4gICAgfVxuICAgIGNhdGNoKGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICAvLyBpT1MgaW4gcHJpdmF0ZSBicm93c2UgbW9kZSB3aWxsIHRocm93IGFuIGVycm9yIGJ1dCB3ZSBjYW4ndCBkZXRlY3QgYWhlYWQgb2YgdGltZSB0aGF0IHdlIGFyZSBpbiBwcml2YXRlIG1vZGUuXG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb1Rva2VuJywgdG9rZW4pO1xuICB9XG4gIGNhdGNoKGVycikge1xuICAgIC8vIERvIG5vdGhpbmcuXG4gIH1cbiAgRm9ybWlvLmN1cnJlbnRVc2VyKCk7IC8vIFJ1biB0aGlzIHNvIHVzZXIgaXMgdXBkYXRlZCBpZiBudWxsXG59O1xuXG5Gb3JtaW8uZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMudG9rZW4pIHsgcmV0dXJuIHRoaXMudG9rZW47IH1cbiAgdHJ5IHtcbiAgICB2YXIgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVG9rZW4nKSB8fCAnJztcbiAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5Gb3JtaW8uc2V0VXNlciA9IGZ1bmN0aW9uKHVzZXIpIHtcbiAgaWYgKCF1c2VyKSB7XG4gICAgdGhpcy5zZXRUb2tlbihudWxsKTtcbiAgICAvLyBpT1MgaW4gcHJpdmF0ZSBicm93c2UgbW9kZSB3aWxsIHRocm93IGFuIGVycm9yIGJ1dCB3ZSBjYW4ndCBkZXRlY3QgYWhlYWQgb2YgdGltZSB0aGF0IHdlIGFyZSBpbiBwcml2YXRlIG1vZGUuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xuICAgIH1cbiAgICBjYXRjaChlcnIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgLy8gaU9TIGluIHByaXZhdGUgYnJvd3NlIG1vZGUgd2lsbCB0aHJvdyBhbiBlcnJvciBidXQgd2UgY2FuJ3QgZGV0ZWN0IGFoZWFkIG9mIHRpbWUgdGhhdCB3ZSBhcmUgaW4gcHJpdmF0ZSBtb2RlLlxuICB0cnkge1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9Vc2VyJywgSlNPTi5zdHJpbmdpZnkodXNlcikpO1xuICB9XG4gIGNhdGNoKGVycikge1xuICAgIC8vIERvIG5vdGhpbmcuXG4gIH1cbn07XG5cbkZvcm1pby5nZXRVc2VyID0gZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1VzZXInKSB8fCBudWxsKTtcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuRm9ybWlvLnNldEJhc2VVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgYmFzZVVybCA9IHVybDtcbiAgaWYgKCFhcHBVcmxTZXQpIHtcbiAgICBhcHBVcmwgPSB1cmw7XG4gIH1cbn07XG5cbkZvcm1pby5nZXRCYXNlVXJsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBiYXNlVXJsO1xufTtcblxuRm9ybWlvLnNldEFwcFVybCA9IGZ1bmN0aW9uKHVybCkge1xuICBhcHBVcmwgPSB1cmw7XG4gIGFwcFVybFNldCA9IHRydWU7XG59O1xuXG5Gb3JtaW8uZ2V0QXBwVXJsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBhcHBVcmw7XG59O1xuXG5Gb3JtaW8uY2xlYXJDYWNoZSA9IGZ1bmN0aW9uKCkgeyBjYWNoZSA9IHt9OyB9O1xuXG5Gb3JtaW8uY3VycmVudFVzZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHVybCA9IGJhc2VVcmwgKyAnL2N1cnJlbnQnO1xuICB2YXIgdXNlciA9IHRoaXMuZ2V0VXNlcigpO1xuICBpZiAodXNlcikge1xuICAgIHJldHVybiBwbHVnaW5BbHRlcignd3JhcFN0YXRpY1JlcXVlc3RQcm9taXNlJywgUHJvbWlzZS5yZXNvbHZlKHVzZXIpLCB7XG4gICAgICB1cmw6IHVybCxcbiAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICB9KVxuICB9XG4gIHZhciB0b2tlbiA9IHRoaXMuZ2V0VG9rZW4oKTtcbiAgaWYgKCF0b2tlbikge1xuICAgIHJldHVybiBwbHVnaW5BbHRlcignd3JhcFN0YXRpY1JlcXVlc3RQcm9taXNlJywgUHJvbWlzZS5yZXNvbHZlKG51bGwpLCB7XG4gICAgICB1cmw6IHVybCxcbiAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICB9KVxuICB9XG4gIHJldHVybiB0aGlzLm1ha2VTdGF0aWNSZXF1ZXN0KHVybClcbiAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICBGb3JtaW8uc2V0VXNlcihyZXNwb25zZSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9KTtcbn07XG5cbi8vIEtlZXAgdHJhY2sgb2YgdGhlaXIgbG9nb3V0IGNhbGxiYWNrLlxuRm9ybWlvLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgb25Mb2dvdXQgPSBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICB0aGlzLnNldFRva2VuKG51bGwpO1xuICAgIHRoaXMuc2V0VXNlcihudWxsKTtcbiAgICBGb3JtaW8uY2xlYXJDYWNoZSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0uYmluZCh0aGlzKTtcbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QoYmFzZVVybCArICcvbG9nb3V0JykudGhlbihvbkxvZ291dCkuY2F0Y2gob25Mb2dvdXQpO1xufTtcblxuRm9ybWlvLmZpZWxkRGF0YSA9IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICBpZiAoIWRhdGEpIHsgcmV0dXJuICcnOyB9XG4gIGlmICghY29tcG9uZW50IHx8ICFjb21wb25lbnQua2V5KSB7IHJldHVybiBkYXRhOyB9XG4gIGlmIChjb21wb25lbnQua2V5LmluZGV4T2YoJy4nKSAhPT0gLTEpIHtcbiAgICB2YXIgdmFsdWUgPSBkYXRhO1xuICAgIHZhciBwYXJ0cyA9IGNvbXBvbmVudC5rZXkuc3BsaXQoJy4nKTtcbiAgICB2YXIga2V5ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0gcGFydHNbaV07XG5cbiAgICAgIC8vIEhhbmRsZSBuZXN0ZWQgcmVzb3VyY2VzXG4gICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuZGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gUmV0dXJuIGlmIHRoZSBrZXkgaXMgbm90IGZvdW5kIG9uIHRoZSB2YWx1ZS5cbiAgICAgIGlmICghdmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIENvbnZlcnQgb2xkIHNpbmdsZSBmaWVsZCBkYXRhIGluIHN1Ym1pc3Npb25zIHRvIG11bHRpcGxlXG4gICAgICBpZiAoa2V5ID09PSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSAmJiBjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkodmFsdWVba2V5XSkpIHtcbiAgICAgICAgdmFsdWVba2V5XSA9IFt2YWx1ZVtrZXldXTtcbiAgICAgIH1cblxuICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGlzIGtleS5cbiAgICAgIHZhbHVlID0gdmFsdWVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIENvbnZlcnQgb2xkIHNpbmdsZSBmaWVsZCBkYXRhIGluIHN1Ym1pc3Npb25zIHRvIG11bHRpcGxlXG4gICAgaWYgKGNvbXBvbmVudC5tdWx0aXBsZSAmJiAhQXJyYXkuaXNBcnJheShkYXRhW2NvbXBvbmVudC5rZXldKSkge1xuICAgICAgZGF0YVtjb21wb25lbnQua2V5XSA9IFtkYXRhW2NvbXBvbmVudC5rZXldXTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGFbY29tcG9uZW50LmtleV07XG4gIH1cbn07XG5cbkZvcm1pby5wcm92aWRlcnMgPSBwcm92aWRlcnM7XG5cbi8qKlxuICogRXZlbnRFbWl0dGVyIGZvciBGb3JtaW8gZXZlbnRzLlxuICogU2VlIE5vZGUuanMgZG9jdW1lbnRhdGlvbiBmb3IgQVBJIGRvY3VtZW50YXRpb246IGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWxcbiAqL1xuRm9ybWlvLmV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIoe1xuICB3aWxkY2FyZDogZmFsc2UsXG4gIG1heExpc3RlbmVyczogMFxufSk7XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBwbHVnaW4gd2l0aCBGb3JtaW8uanNcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiB0byByZWdpc3Rlci4gU2VlIHBsdWdpbiBkb2N1bWVudGF0aW9uLlxuICogQHBhcmFtIG5hbWUgICBPcHRpb25hbCBuYW1lIHRvIGxhdGVyIHJldHJpZXZlIHBsdWdpbiB3aXRoLlxuICovXG5Gb3JtaW8ucmVnaXN0ZXJQbHVnaW4gPSBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcbiAgcGx1Z2lucy5wdXNoKHBsdWdpbik7XG4gIHBsdWdpbnMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIChiLnByaW9yaXR5IHx8IDApIC0gKGEucHJpb3JpdHkgfHwgMCk7XG4gIH0pO1xuICBwbHVnaW4uX19uYW1lID0gbmFtZTtcbiAgKHBsdWdpbi5pbml0IHx8IG5vb3ApLmNhbGwocGx1Z2luLCBGb3JtaW8pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwbHVnaW4gcmVnaXN0ZXJlZCB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICovXG5Gb3JtaW8uZ2V0UGx1Z2luID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gcGx1Z2lucy5yZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCBwbHVnaW4pIHtcbiAgICBpZiAocmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChwbHVnaW4uX19uYW1lID09PSBuYW1lKSByZXR1cm4gcGx1Z2luO1xuICB9LCBudWxsKTtcbn07XG5cbi8qKlxuICogRGVyZWdpc3RlcnMgYSBwbHVnaW4gd2l0aCBGb3JtaW8uanMuXG4gKiBAcGFyYW0gIHBsdWdpbiBUaGUgaW5zdGFuY2Ugb3IgbmFtZSBvZiB0aGUgcGx1Z2luXG4gKiBAcmV0dXJuIHRydWUgaWYgZGVyZWdpc3RlcmVkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuRm9ybWlvLmRlcmVnaXN0ZXJQbHVnaW4gPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgdmFyIGJlZm9yZUxlbmd0aCA9IHBsdWdpbnMubGVuZ3RoO1xuICBwbHVnaW5zID0gcGx1Z2lucy5maWx0ZXIoZnVuY3Rpb24ocCkge1xuICAgIGlmKHAgIT09IHBsdWdpbiAmJiBwLl9fbmFtZSAhPT0gcGx1Z2luKSByZXR1cm4gdHJ1ZTtcbiAgICAocC5kZXJlZ2lzdGVyIHx8IG5vb3ApLmNhbGwocCwgRm9ybWlvKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gYmVmb3JlTGVuZ3RoICE9PSBwbHVnaW5zLmxlbmd0aDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRm9ybWlvO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0b3JhZ2U6IHJlcXVpcmUoJy4vc3RvcmFnZScpXG59O1xuIiwidmFyIFByb21pc2UgPSByZXF1aXJlKFwibmF0aXZlLXByb21pc2Utb25seVwiKTtcbnZhciBkcm9wYm94ID0gZnVuY3Rpb24oZm9ybWlvKSB7XG4gIHJldHVybiB7XG4gICAgdXBsb2FkRmlsZTogZnVuY3Rpb24oZmlsZSwgZmlsZU5hbWUsIGRpciwgcHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBTZW5kIHRoZSBmaWxlIHdpdGggZGF0YS5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcHJvZ3Jlc3NDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IHByb2dyZXNzQ2FsbGJhY2s7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZmQuYXBwZW5kKCduYW1lJywgZmlsZU5hbWUpO1xuICAgICAgICBmZC5hcHBlbmQoJ2RpcicsIGRpcik7XG4gICAgICAgIGZkLmFwcGVuZCgnZmlsZScsIGZpbGUpO1xuXG4gICAgICAgIC8vIEZpcmUgb24gbmV0d29yayBlcnJvci5cbiAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBlcnIubmV0d29ya0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgcmVzcG9uc2Uuc3RvcmFnZSA9ICdkcm9wYm94JztcbiAgICAgICAgICAgIHJlc3BvbnNlLnNpemUgPSBmaWxlLnNpemU7XG4gICAgICAgICAgICByZXNwb25zZS50eXBlID0gZmlsZS50eXBlO1xuICAgICAgICAgICAgcmVzcG9uc2UudXJsID0gcmVzcG9uc2UucGF0aF9sb3dlcjtcbiAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2UgfHwgJ1VuYWJsZSB0byB1cGxvYWQgZmlsZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB4aHIub25hYm9ydCA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgeGhyLm9wZW4oJ1BPU1QnLCBmb3JtaW8uZm9ybVVybCArICcvc3RvcmFnZS9kcm9wYm94Jyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIHRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1Rva2VuJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBTd2FsbG93IGVycm9yLlxuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LWp3dC10b2tlbicsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICB4aHIuc2VuZChmZCk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRvd25sb2FkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgZmlsZS51cmwgPSBmb3JtaW8uZm9ybVVybCArICcvc3RvcmFnZS9kcm9wYm94P3BhdGhfbG93ZXI9JyArIGZpbGUucGF0aF9sb3dlciArICh0b2tlbiA/ICcmeC1qd3QtdG9rZW49JyArIHRva2VuIDogJycpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmaWxlKTtcbiAgICB9XG4gIH07XG59O1xuXG5kcm9wYm94LnRpdGxlID0gJ0Ryb3Bib3gnO1xuZHJvcGJveC5uYW1lID0gJ2Ryb3Bib3gnO1xubW9kdWxlLmV4cG9ydHMgPSBkcm9wYm94O1xuXG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBkcm9wYm94OiByZXF1aXJlKCcuL2Ryb3Bib3guanMnKSxcbiAgczM6IHJlcXVpcmUoJy4vczMuanMnKSxcbiAgdXJsOiByZXF1aXJlKCcuL3VybC5qcycpLFxufTtcbiIsInZhciBQcm9taXNlID0gcmVxdWlyZShcIm5hdGl2ZS1wcm9taXNlLW9ubHlcIik7XG52YXIgczMgPSBmdW5jdGlvbihmb3JtaW8pIHtcbiAgcmV0dXJuIHtcbiAgICB1cGxvYWRGaWxlOiBmdW5jdGlvbihmaWxlLCBmaWxlTmFtZSwgZGlyLCBwcm9ncmVzc0NhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIFNlbmQgdGhlIHByZSByZXNwb25zZSB0byBzaWduIHRoZSB1cGxvYWQuXG4gICAgICAgIHZhciBwcmUgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICB2YXIgcHJlZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgcHJlZmQuYXBwZW5kKCduYW1lJywgZmlsZU5hbWUpO1xuICAgICAgICBwcmVmZC5hcHBlbmQoJ3NpemUnLCBmaWxlLnNpemUpO1xuICAgICAgICBwcmVmZC5hcHBlbmQoJ3R5cGUnLCBmaWxlLnR5cGUpO1xuXG4gICAgICAgIC8vIFRoaXMgb25seSBmaXJlcyBvbiBhIG5ldHdvcmsgZXJyb3IuXG4gICAgICAgIHByZS5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgZXJyLm5ldHdvcmtFcnJvciA9IHRydWU7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBwcmUub25hYm9ydCA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChwcmUuc3RhdHVzID49IDIwMCAmJiBwcmUuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHByZS5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgIC8vIFNlbmQgdGhlIGZpbGUgd2l0aCBkYXRhLlxuICAgICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb2dyZXNzQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5maWxlTmFtZSA9IGZpbGVOYW1lO1xuICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5rZXkgKz0gZGlyICsgZmlsZU5hbWU7XG5cbiAgICAgICAgICAgIHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICBmZC5hcHBlbmQoa2V5LCByZXNwb25zZS5kYXRhW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmQuYXBwZW5kKCdmaWxlJywgZmlsZSk7XG5cbiAgICAgICAgICAgIC8vIEZpcmUgb24gbmV0d29yayBlcnJvci5cbiAgICAgICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgIGVyci5uZXR3b3JrRXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgc3RvcmFnZTogJ3MzJyxcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgYnVja2V0OiByZXNwb25zZS5idWNrZXQsXG4gICAgICAgICAgICAgICAgICBrZXk6IHJlc3BvbnNlLmRhdGEua2V5LFxuICAgICAgICAgICAgICAgICAgdXJsOiByZXNwb25zZS51cmwgKyByZXNwb25zZS5kYXRhLmtleSxcbiAgICAgICAgICAgICAgICAgIGFjbDogcmVzcG9uc2UuZGF0YS5hY2wsXG4gICAgICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXG4gICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlLnR5cGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlIHx8ICdVbmFibGUgdG8gdXBsb2FkIGZpbGUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgeGhyLm9uYWJvcnQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHhoci5vcGVuKCdQT1NUJywgcmVzcG9uc2UudXJsKTtcblxuICAgICAgICAgICAgeGhyLnNlbmQoZmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChwcmUucmVzcG9uc2UgfHwgJ1VuYWJsZSB0byBzaWduIGZpbGUnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJlLm9wZW4oJ1BPU1QnLCBmb3JtaW8uZm9ybVVybCArICcvc3RvcmFnZS9zMycpO1xuXG4gICAgICAgIHByZS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICBwcmUuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVG9rZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIHN3YWxsb3cgZXJyb3IuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgcHJlLnNldFJlcXVlc3RIZWFkZXIoJ3gtand0LXRva2VuJywgdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICB0eXBlOiBmaWxlLnR5cGVcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkb3dubG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgIGlmIChmaWxlLmFjbCAhPT0gJ3B1YmxpYy1yZWFkJykge1xuICAgICAgICByZXR1cm4gZm9ybWlvLm1ha2VSZXF1ZXN0KCdmaWxlJywgZm9ybWlvLmZvcm1VcmwgKyAnL3N0b3JhZ2UvczM/YnVja2V0PScgKyBmaWxlLmJ1Y2tldCArICcma2V5PScgKyBmaWxlLmtleSwgJ0dFVCcpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmlsZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcblxuczMudGl0bGUgPSAnUzMnO1xuczMubmFtZSA9ICdzMyc7XG5tb2R1bGUuZXhwb3J0cyA9IHMzO1xuIiwidmFyIFByb21pc2UgPSByZXF1aXJlKFwibmF0aXZlLXByb21pc2Utb25seVwiKTtcbnZhciB1cmwgPSBmdW5jdGlvbihmb3JtaW8pIHtcbiAgcmV0dXJuIHtcbiAgICB0aXRsZTogJ1VybCcsXG4gICAgbmFtZTogJ3VybCcsXG4gICAgdXBsb2FkRmlsZTogZnVuY3Rpb24oZmlsZSwgZmlsZU5hbWUsIGRpciwgcHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICBkaXI6IGRpcixcbiAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VuZCB0aGUgZmlsZSB3aXRoIGRhdGEuXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICBpZiAodHlwZW9mIHByb2dyZXNzQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBwcm9ncmVzc0NhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgIGZkLmFwcGVuZChrZXksIGRhdGFba2V5XSk7XG4gICAgICAgIH1cblxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gdGVzdCBpZiB4aHIucmVzcG9uc2UgaXMgZGVjb2RlZCBvciBub3QuXG4gICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgc3RvcmFnZTogJ3VybCcsXG4gICAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgICB1cmw6IHhoci5yZXNwb25zZS51cmwsXG4gICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgdHlwZTogZmlsZS50eXBlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlIHx8ICdVbmFibGUgdG8gdXBsb2FkIGZpbGUnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRmlyZSBvbiBuZXR3b3JrIGVycm9yLlxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlamVjdCh4aHIpO1xuICAgICAgICB9XG5cbiAgICAgICAgeGhyLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoeGhyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5vcGVuKCdQT1NUJywgcmVzcG9uc2UudXJsKTtcbiAgICAgICAgeGhyLnNlbmQoZmQpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkb3dubG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgIC8vIFJldHVybiB0aGUgb3JpZ2luYWwgYXMgdGhlcmUgaXMgbm90aGluZyB0byBkby5cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmlsZSk7XG4gICAgfVxuICB9O1xufTtcblxudXJsLm5hbWUgPSAndXJsJztcbnVybC50aXRsZSA9ICdVcmwnO1xubW9kdWxlLmV4cG9ydHMgPSB1cmw7XG4iLCIvKiEgTmF0aXZlIFByb21pc2UgT25seVxuICAgIHYwLjguMSAoYykgS3lsZSBTaW1wc29uXG4gICAgTUlUIExpY2Vuc2U6IGh0dHA6Ly9nZXRpZnkubWl0LWxpY2Vuc2Uub3JnXG4qL1xuXG4oZnVuY3Rpb24gVU1EKG5hbWUsY29udGV4dCxkZWZpbml0aW9uKXtcblx0Ly8gc3BlY2lhbCBmb3JtIG9mIFVNRCBmb3IgcG9seWZpbGxpbmcgYWNyb3NzIGV2aXJvbm1lbnRzXG5cdGNvbnRleHRbbmFtZV0gPSBjb250ZXh0W25hbWVdIHx8IGRlZmluaXRpb24oKTtcblx0aWYgKHR5cGVvZiBtb2R1bGUgIT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykgeyBtb2R1bGUuZXhwb3J0cyA9IGNvbnRleHRbbmFtZV07IH1cblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgeyBkZWZpbmUoZnVuY3Rpb24gJEFNRCQoKXsgcmV0dXJuIGNvbnRleHRbbmFtZV07IH0pOyB9XG59KShcIlByb21pc2VcIix0eXBlb2YgZ2xvYmFsICE9IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0aGlzLGZ1bmN0aW9uIERFRigpe1xuXHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgYnVpbHRJblByb3AsIGN5Y2xlLCBzY2hlZHVsaW5nX3F1ZXVlLFxuXHRcdFRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcblx0XHR0aW1lciA9ICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9IFwidW5kZWZpbmVkXCIpID9cblx0XHRcdGZ1bmN0aW9uIHRpbWVyKGZuKSB7IHJldHVybiBzZXRJbW1lZGlhdGUoZm4pOyB9IDpcblx0XHRcdHNldFRpbWVvdXRcblx0O1xuXG5cdC8vIGRhbW1pdCwgSUU4LlxuXHR0cnkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSxcInhcIix7fSk7XG5cdFx0YnVpbHRJblByb3AgPSBmdW5jdGlvbiBidWlsdEluUHJvcChvYmosbmFtZSx2YWwsY29uZmlnKSB7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaixuYW1lLHtcblx0XHRcdFx0dmFsdWU6IHZhbCxcblx0XHRcdFx0d3JpdGFibGU6IHRydWUsXG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogY29uZmlnICE9PSBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0fTtcblx0fVxuXHRjYXRjaCAoZXJyKSB7XG5cdFx0YnVpbHRJblByb3AgPSBmdW5jdGlvbiBidWlsdEluUHJvcChvYmosbmFtZSx2YWwpIHtcblx0XHRcdG9ialtuYW1lXSA9IHZhbDtcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fTtcblx0fVxuXG5cdC8vIE5vdGU6IHVzaW5nIGEgcXVldWUgaW5zdGVhZCBvZiBhcnJheSBmb3IgZWZmaWNpZW5jeVxuXHRzY2hlZHVsaW5nX3F1ZXVlID0gKGZ1bmN0aW9uIFF1ZXVlKCkge1xuXHRcdHZhciBmaXJzdCwgbGFzdCwgaXRlbTtcblxuXHRcdGZ1bmN0aW9uIEl0ZW0oZm4sc2VsZikge1xuXHRcdFx0dGhpcy5mbiA9IGZuO1xuXHRcdFx0dGhpcy5zZWxmID0gc2VsZjtcblx0XHRcdHRoaXMubmV4dCA9IHZvaWQgMDtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YWRkOiBmdW5jdGlvbiBhZGQoZm4sc2VsZikge1xuXHRcdFx0XHRpdGVtID0gbmV3IEl0ZW0oZm4sc2VsZik7XG5cdFx0XHRcdGlmIChsYXN0KSB7XG5cdFx0XHRcdFx0bGFzdC5uZXh0ID0gaXRlbTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRmaXJzdCA9IGl0ZW07XG5cdFx0XHRcdH1cblx0XHRcdFx0bGFzdCA9IGl0ZW07XG5cdFx0XHRcdGl0ZW0gPSB2b2lkIDA7XG5cdFx0XHR9LFxuXHRcdFx0ZHJhaW46IGZ1bmN0aW9uIGRyYWluKCkge1xuXHRcdFx0XHR2YXIgZiA9IGZpcnN0O1xuXHRcdFx0XHRmaXJzdCA9IGxhc3QgPSBjeWNsZSA9IHZvaWQgMDtcblxuXHRcdFx0XHR3aGlsZSAoZikge1xuXHRcdFx0XHRcdGYuZm4uY2FsbChmLnNlbGYpO1xuXHRcdFx0XHRcdGYgPSBmLm5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9KSgpO1xuXG5cdGZ1bmN0aW9uIHNjaGVkdWxlKGZuLHNlbGYpIHtcblx0XHRzY2hlZHVsaW5nX3F1ZXVlLmFkZChmbixzZWxmKTtcblx0XHRpZiAoIWN5Y2xlKSB7XG5cdFx0XHRjeWNsZSA9IHRpbWVyKHNjaGVkdWxpbmdfcXVldWUuZHJhaW4pO1xuXHRcdH1cblx0fVxuXG5cdC8vIHByb21pc2UgZHVjayB0eXBpbmdcblx0ZnVuY3Rpb24gaXNUaGVuYWJsZShvKSB7XG5cdFx0dmFyIF90aGVuLCBvX3R5cGUgPSB0eXBlb2YgbztcblxuXHRcdGlmIChvICE9IG51bGwgJiZcblx0XHRcdChcblx0XHRcdFx0b190eXBlID09IFwib2JqZWN0XCIgfHwgb190eXBlID09IFwiZnVuY3Rpb25cIlxuXHRcdFx0KVxuXHRcdCkge1xuXHRcdFx0X3RoZW4gPSBvLnRoZW47XG5cdFx0fVxuXHRcdHJldHVybiB0eXBlb2YgX3RoZW4gPT0gXCJmdW5jdGlvblwiID8gX3RoZW4gOiBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIG5vdGlmeSgpIHtcblx0XHRmb3IgKHZhciBpPTA7IGk8dGhpcy5jaGFpbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0bm90aWZ5SXNvbGF0ZWQoXG5cdFx0XHRcdHRoaXMsXG5cdFx0XHRcdCh0aGlzLnN0YXRlID09PSAxKSA/IHRoaXMuY2hhaW5baV0uc3VjY2VzcyA6IHRoaXMuY2hhaW5baV0uZmFpbHVyZSxcblx0XHRcdFx0dGhpcy5jaGFpbltpXVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0dGhpcy5jaGFpbi5sZW5ndGggPSAwO1xuXHR9XG5cblx0Ly8gTk9URTogVGhpcyBpcyBhIHNlcGFyYXRlIGZ1bmN0aW9uIHRvIGlzb2xhdGVcblx0Ly8gdGhlIGB0cnkuLmNhdGNoYCBzbyB0aGF0IG90aGVyIGNvZGUgY2FuIGJlXG5cdC8vIG9wdGltaXplZCBiZXR0ZXJcblx0ZnVuY3Rpb24gbm90aWZ5SXNvbGF0ZWQoc2VsZixjYixjaGFpbikge1xuXHRcdHZhciByZXQsIF90aGVuO1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoY2IgPT09IGZhbHNlKSB7XG5cdFx0XHRcdGNoYWluLnJlamVjdChzZWxmLm1zZyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aWYgKGNiID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0cmV0ID0gc2VsZi5tc2c7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0ID0gY2IuY2FsbCh2b2lkIDAsc2VsZi5tc2cpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHJldCA9PT0gY2hhaW4ucHJvbWlzZSkge1xuXHRcdFx0XHRcdGNoYWluLnJlamVjdChUeXBlRXJyb3IoXCJQcm9taXNlLWNoYWluIGN5Y2xlXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChfdGhlbiA9IGlzVGhlbmFibGUocmV0KSkge1xuXHRcdFx0XHRcdF90aGVuLmNhbGwocmV0LGNoYWluLnJlc29sdmUsY2hhaW4ucmVqZWN0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjaGFpbi5yZXNvbHZlKHJldCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycikge1xuXHRcdFx0Y2hhaW4ucmVqZWN0KGVycik7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVzb2x2ZShtc2cpIHtcblx0XHR2YXIgX3RoZW4sIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gYWxyZWFkeSB0cmlnZ2VyZWQ/XG5cdFx0aWYgKHNlbGYudHJpZ2dlcmVkKSB7IHJldHVybjsgfVxuXG5cdFx0c2VsZi50cmlnZ2VyZWQgPSB0cnVlO1xuXG5cdFx0Ly8gdW53cmFwXG5cdFx0aWYgKHNlbGYuZGVmKSB7XG5cdFx0XHRzZWxmID0gc2VsZi5kZWY7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGlmIChfdGhlbiA9IGlzVGhlbmFibGUobXNnKSkge1xuXHRcdFx0XHRzY2hlZHVsZShmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHZhciBkZWZfd3JhcHBlciA9IG5ldyBNYWtlRGVmV3JhcHBlcihzZWxmKTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0X3RoZW4uY2FsbChtc2csXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uICRyZXNvbHZlJCgpeyByZXNvbHZlLmFwcGx5KGRlZl93cmFwcGVyLGFyZ3VtZW50cyk7IH0sXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uICRyZWplY3QkKCl7IHJlamVjdC5hcHBseShkZWZfd3JhcHBlcixhcmd1bWVudHMpOyB9XG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0XHRyZWplY3QuY2FsbChkZWZfd3JhcHBlcixlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRzZWxmLm1zZyA9IG1zZztcblx0XHRcdFx0c2VsZi5zdGF0ZSA9IDE7XG5cdFx0XHRcdGlmIChzZWxmLmNoYWluLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRzY2hlZHVsZShub3RpZnksc2VsZik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycikge1xuXHRcdFx0cmVqZWN0LmNhbGwobmV3IE1ha2VEZWZXcmFwcGVyKHNlbGYpLGVycik7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVqZWN0KG1zZykge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIGFscmVhZHkgdHJpZ2dlcmVkP1xuXHRcdGlmIChzZWxmLnRyaWdnZXJlZCkgeyByZXR1cm47IH1cblxuXHRcdHNlbGYudHJpZ2dlcmVkID0gdHJ1ZTtcblxuXHRcdC8vIHVud3JhcFxuXHRcdGlmIChzZWxmLmRlZikge1xuXHRcdFx0c2VsZiA9IHNlbGYuZGVmO1xuXHRcdH1cblxuXHRcdHNlbGYubXNnID0gbXNnO1xuXHRcdHNlbGYuc3RhdGUgPSAyO1xuXHRcdGlmIChzZWxmLmNoYWluLmxlbmd0aCA+IDApIHtcblx0XHRcdHNjaGVkdWxlKG5vdGlmeSxzZWxmKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBpdGVyYXRlUHJvbWlzZXMoQ29uc3RydWN0b3IsYXJyLHJlc29sdmVyLHJlamVjdGVyKSB7XG5cdFx0Zm9yICh2YXIgaWR4PTA7IGlkeDxhcnIubGVuZ3RoOyBpZHgrKykge1xuXHRcdFx0KGZ1bmN0aW9uIElJRkUoaWR4KXtcblx0XHRcdFx0Q29uc3RydWN0b3IucmVzb2x2ZShhcnJbaWR4XSlcblx0XHRcdFx0LnRoZW4oXG5cdFx0XHRcdFx0ZnVuY3Rpb24gJHJlc29sdmVyJChtc2cpe1xuXHRcdFx0XHRcdFx0cmVzb2x2ZXIoaWR4LG1zZyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZWplY3RlclxuXHRcdFx0XHQpO1xuXHRcdFx0fSkoaWR4KTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBNYWtlRGVmV3JhcHBlcihzZWxmKSB7XG5cdFx0dGhpcy5kZWYgPSBzZWxmO1xuXHRcdHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiBNYWtlRGVmKHNlbGYpIHtcblx0XHR0aGlzLnByb21pc2UgPSBzZWxmO1xuXHRcdHRoaXMuc3RhdGUgPSAwO1xuXHRcdHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XG5cdFx0dGhpcy5jaGFpbiA9IFtdO1xuXHRcdHRoaXMubXNnID0gdm9pZCAwO1xuXHR9XG5cblx0ZnVuY3Rpb24gUHJvbWlzZShleGVjdXRvcikge1xuXHRcdGlmICh0eXBlb2YgZXhlY3V0b3IgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fX05QT19fICE9PSAwKSB7XG5cdFx0XHR0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBwcm9taXNlXCIpO1xuXHRcdH1cblxuXHRcdC8vIGluc3RhbmNlIHNoYWRvd2luZyB0aGUgaW5oZXJpdGVkIFwiYnJhbmRcIlxuXHRcdC8vIHRvIHNpZ25hbCBhbiBhbHJlYWR5IFwiaW5pdGlhbGl6ZWRcIiBwcm9taXNlXG5cdFx0dGhpcy5fX05QT19fID0gMTtcblxuXHRcdHZhciBkZWYgPSBuZXcgTWFrZURlZih0aGlzKTtcblxuXHRcdHRoaXNbXCJ0aGVuXCJdID0gZnVuY3Rpb24gdGhlbihzdWNjZXNzLGZhaWx1cmUpIHtcblx0XHRcdHZhciBvID0ge1xuXHRcdFx0XHRzdWNjZXNzOiB0eXBlb2Ygc3VjY2VzcyA9PSBcImZ1bmN0aW9uXCIgPyBzdWNjZXNzIDogdHJ1ZSxcblx0XHRcdFx0ZmFpbHVyZTogdHlwZW9mIGZhaWx1cmUgPT0gXCJmdW5jdGlvblwiID8gZmFpbHVyZSA6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdFx0Ly8gTm90ZTogYHRoZW4oLi4pYCBpdHNlbGYgY2FuIGJlIGJvcnJvd2VkIHRvIGJlIHVzZWQgYWdhaW5zdFxuXHRcdFx0Ly8gYSBkaWZmZXJlbnQgcHJvbWlzZSBjb25zdHJ1Y3RvciBmb3IgbWFraW5nIHRoZSBjaGFpbmVkIHByb21pc2UsXG5cdFx0XHQvLyBieSBzdWJzdGl0dXRpbmcgYSBkaWZmZXJlbnQgYHRoaXNgIGJpbmRpbmcuXG5cdFx0XHRvLnByb21pc2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbiBleHRyYWN0Q2hhaW4ocmVzb2x2ZSxyZWplY3QpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNvbHZlICE9IFwiZnVuY3Rpb25cIiB8fCB0eXBlb2YgcmVqZWN0ICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0by5yZXNvbHZlID0gcmVzb2x2ZTtcblx0XHRcdFx0by5yZWplY3QgPSByZWplY3Q7XG5cdFx0XHR9KTtcblx0XHRcdGRlZi5jaGFpbi5wdXNoKG8pO1xuXG5cdFx0XHRpZiAoZGVmLnN0YXRlICE9PSAwKSB7XG5cdFx0XHRcdHNjaGVkdWxlKG5vdGlmeSxkZWYpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gby5wcm9taXNlO1xuXHRcdH07XG5cdFx0dGhpc1tcImNhdGNoXCJdID0gZnVuY3Rpb24gJGNhdGNoJChmYWlsdXJlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCxmYWlsdXJlKTtcblx0XHR9O1xuXG5cdFx0dHJ5IHtcblx0XHRcdGV4ZWN1dG9yLmNhbGwoXG5cdFx0XHRcdHZvaWQgMCxcblx0XHRcdFx0ZnVuY3Rpb24gcHVibGljUmVzb2x2ZShtc2cpe1xuXHRcdFx0XHRcdHJlc29sdmUuY2FsbChkZWYsbXNnKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24gcHVibGljUmVqZWN0KG1zZykge1xuXHRcdFx0XHRcdHJlamVjdC5jYWxsKGRlZixtc2cpO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyKSB7XG5cdFx0XHRyZWplY3QuY2FsbChkZWYsZXJyKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgUHJvbWlzZVByb3RvdHlwZSA9IGJ1aWx0SW5Qcm9wKHt9LFwiY29uc3RydWN0b3JcIixQcm9taXNlLFxuXHRcdC8qY29uZmlndXJhYmxlPSovZmFsc2Vcblx0KTtcblxuXHQvLyBOb3RlOiBBbmRyb2lkIDQgY2Fubm90IHVzZSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KC4uKWAgaGVyZVxuXHRQcm9taXNlLnByb3RvdHlwZSA9IFByb21pc2VQcm90b3R5cGU7XG5cblx0Ly8gYnVpbHQtaW4gXCJicmFuZFwiIHRvIHNpZ25hbCBhbiBcInVuaW5pdGlhbGl6ZWRcIiBwcm9taXNlXG5cdGJ1aWx0SW5Qcm9wKFByb21pc2VQcm90b3R5cGUsXCJfX05QT19fXCIsMCxcblx0XHQvKmNvbmZpZ3VyYWJsZT0qL2ZhbHNlXG5cdCk7XG5cblx0YnVpbHRJblByb3AoUHJvbWlzZSxcInJlc29sdmVcIixmdW5jdGlvbiBQcm9taXNlJHJlc29sdmUobXNnKSB7XG5cdFx0dmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuXHRcdC8vIHNwZWMgbWFuZGF0ZWQgY2hlY2tzXG5cdFx0Ly8gbm90ZTogYmVzdCBcImlzUHJvbWlzZVwiIGNoZWNrIHRoYXQncyBwcmFjdGljYWwgZm9yIG5vd1xuXHRcdGlmIChtc2cgJiYgdHlwZW9mIG1zZyA9PSBcIm9iamVjdFwiICYmIG1zZy5fX05QT19fID09PSAxKSB7XG5cdFx0XHRyZXR1cm4gbXNnO1xuXHRcdH1cblxuXHRcdHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gZXhlY3V0b3IocmVzb2x2ZSxyZWplY3Qpe1xuXHRcdFx0aWYgKHR5cGVvZiByZXNvbHZlICE9IFwiZnVuY3Rpb25cIiB8fCB0eXBlb2YgcmVqZWN0ICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZShtc2cpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRidWlsdEluUHJvcChQcm9taXNlLFwicmVqZWN0XCIsZnVuY3Rpb24gUHJvbWlzZSRyZWplY3QobXNnKSB7XG5cdFx0cmV0dXJuIG5ldyB0aGlzKGZ1bmN0aW9uIGV4ZWN1dG9yKHJlc29sdmUscmVqZWN0KXtcblx0XHRcdGlmICh0eXBlb2YgcmVzb2x2ZSAhPSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHJlamVjdCAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7XG5cdFx0XHR9XG5cblx0XHRcdHJlamVjdChtc2cpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRidWlsdEluUHJvcChQcm9taXNlLFwiYWxsXCIsZnVuY3Rpb24gUHJvbWlzZSRhbGwoYXJyKSB7XG5cdFx0dmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuXHRcdC8vIHNwZWMgbWFuZGF0ZWQgY2hlY2tzXG5cdFx0aWYgKFRvU3RyaW5nLmNhbGwoYXJyKSAhPSBcIltvYmplY3QgQXJyYXldXCIpIHtcblx0XHRcdHJldHVybiBDb25zdHJ1Y3Rvci5yZWplY3QoVHlwZUVycm9yKFwiTm90IGFuIGFycmF5XCIpKTtcblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBDb25zdHJ1Y3Rvci5yZXNvbHZlKFtdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIGV4ZWN1dG9yKHJlc29sdmUscmVqZWN0KXtcblx0XHRcdGlmICh0eXBlb2YgcmVzb2x2ZSAhPSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHJlamVjdCAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBsZW4gPSBhcnIubGVuZ3RoLCBtc2dzID0gQXJyYXkobGVuKSwgY291bnQgPSAwO1xuXG5cdFx0XHRpdGVyYXRlUHJvbWlzZXMoQ29uc3RydWN0b3IsYXJyLGZ1bmN0aW9uIHJlc29sdmVyKGlkeCxtc2cpIHtcblx0XHRcdFx0bXNnc1tpZHhdID0gbXNnO1xuXHRcdFx0XHRpZiAoKytjb3VudCA9PT0gbGVuKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZShtc2dzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxyZWplY3QpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRidWlsdEluUHJvcChQcm9taXNlLFwicmFjZVwiLGZ1bmN0aW9uIFByb21pc2UkcmFjZShhcnIpIHtcblx0XHR2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG5cdFx0Ly8gc3BlYyBtYW5kYXRlZCBjaGVja3Ncblx0XHRpZiAoVG9TdHJpbmcuY2FsbChhcnIpICE9IFwiW29iamVjdCBBcnJheV1cIikge1xuXHRcdFx0cmV0dXJuIENvbnN0cnVjdG9yLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpO1xuXHRcdH1cblxuXHRcdHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gZXhlY3V0b3IocmVzb2x2ZSxyZWplY3Qpe1xuXHRcdFx0aWYgKHR5cGVvZiByZXNvbHZlICE9IFwiZnVuY3Rpb25cIiB8fCB0eXBlb2YgcmVqZWN0ICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtcblx0XHRcdH1cblxuXHRcdFx0aXRlcmF0ZVByb21pc2VzKENvbnN0cnVjdG9yLGFycixmdW5jdGlvbiByZXNvbHZlcihpZHgsbXNnKXtcblx0XHRcdFx0cmVzb2x2ZShtc2cpO1xuXHRcdFx0fSxyZWplY3QpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXR1cm4gUHJvbWlzZTtcbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHJldHVybiBvYmo7XG4gICAgXG4gICAgdmFyIGNvcHk7XG4gICAgXG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICB2YXIgbGVuID0gb2JqLmxlbmd0aDtcbiAgICAgICAgY29weSA9IEFycmF5KGxlbik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGNvcHlbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyhvYmopO1xuICAgICAgICBjb3B5ID0ge307XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xufTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmICh7fS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICAgIHJldHVybiB7fS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcblxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBsaXN0ID0gdGhpcy5tYXBbbmFtZV1cbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgIGxpc3QgPSBbXVxuICAgICAgdGhpcy5tYXBbbmFtZV0gPSBsaXN0XG4gICAgfVxuICAgIGxpc3QucHVzaCh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgICByZXR1cm4gdmFsdWVzID8gdmFsdWVzWzBdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSB8fCBbXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IFtub3JtYWxpemVWYWx1ZSh2YWx1ZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLm1hcCkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICB0aGlzLm1hcFtuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdmFsdWUsIG5hbWUsIHRoaXMpXG4gICAgICB9LCB0aGlzKVxuICAgIH0sIHRoaXMpXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAvLyBPbmx5IHN1cHBvcnQgQXJyYXlCdWZmZXJzIGZvciBQT1NUIG1ldGhvZC5cbiAgICAgICAgLy8gUmVjZWl2aW5nIEFycmF5QnVmZmVycyBoYXBwZW5zIHZpYSBCbG9icywgaW5zdGVhZC5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZCA6IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBpbnB1dFxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBoZWFkZXJzKHhocikge1xuICAgIHZhciBoZWFkID0gbmV3IEhlYWRlcnMoKVxuICAgIHZhciBwYWlycyA9ICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0XG4gICAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgICAgcmVxdWVzdCA9IGlucHV0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB9XG5cbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdHVzID0gKHhoci5zdGF0dXMgPT09IDEyMjMpID8gMjA0IDogeGhyLnN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzIDwgMTAwIHx8IHN0YXR1cyA+IDU5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgLypqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignYWRkcmVzcycsIHtcbiAgICAgICAgdGl0bGU6ICdBZGRyZXNzJyxcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MtbXVsdGlwbGUuaHRtbCcgOiAnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJGh0dHAnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKSB7XG4gICAgICAgICAgJHNjb3BlLmFkZHJlc3MgPSB7fTtcbiAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gW107XG4gICAgICAgICAgJHNjb3BlLnJlZnJlc2hBZGRyZXNzID0gZnVuY3Rpb24oYWRkcmVzcykge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgYWRkcmVzczogYWRkcmVzcyxcbiAgICAgICAgICAgICAgc2Vuc29yOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICghYWRkcmVzcykge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5tYXAgJiYgJHNjb3BlLmNvbXBvbmVudC5tYXAucmVnaW9uKSB7XG4gICAgICAgICAgICAgIHBhcmFtcy5yZWdpb24gPSAkc2NvcGUuY29tcG9uZW50Lm1hcC5yZWdpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5tYXAgJiYgJHNjb3BlLmNvbXBvbmVudC5tYXAua2V5KSB7XG4gICAgICAgICAgICAgIHBhcmFtcy5rZXkgPSAkc2NvcGUuY29tcG9uZW50Lm1hcC5rZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFxuICAgICAgICAgICAgICAnaHR0cHM6Ly9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2dlb2NvZGUvanNvbicsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkaXNhYmxlSldUOiB0cnVlLFxuICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIFByYWdtYTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gcmVzcG9uc2UuZGF0YS5yZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfV0sXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHJldHVybiBkYXRhID8gZGF0YS5mb3JtYXR0ZWRfYWRkcmVzcyA6ICcnO1xuICAgICAgICB9LFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2FkZHJlc3NGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBtYXA6IHtcbiAgICAgICAgICAgIHJlZ2lvbjogJycsXG4gICAgICAgICAgICBrZXk6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MuaHRtbCcsXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9sYWJlbD5cXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuPHVpLXNlbGVjdCBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgc2FmZS1tdWx0aXBsZS10by1zaW5nbGUgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIiBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiPlxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxcIj57eyRpdGVtLmZvcm1hdHRlZF9hZGRyZXNzIHx8ICRzZWxlY3Quc2VsZWN0ZWQuZm9ybWF0dGVkX2FkZHJlc3N9fTwvdWktc2VsZWN0LW1hdGNoPlxcbiAgPHVpLXNlbGVjdC1jaG9pY2VzIGNsYXNzPVxcXCJ1aS1zZWxlY3QtY2hvaWNlc1xcXCIgcmVwZWF0PVxcXCJhZGRyZXNzIGluIGFkZHJlc3Nlc1xcXCIgcmVmcmVzaD1cXFwicmVmcmVzaEFkZHJlc3MoJHNlbGVjdC5zZWFyY2gpXFxcIiByZWZyZXNoLWRlbGF5PVxcXCI1MDBcXFwiPlxcbiAgICA8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiYWRkcmVzcy5mb3JtYXR0ZWRfYWRkcmVzcyB8IGhpZ2hsaWdodDogJHNlbGVjdC5zZWFyY2hcXFwiPjwvZGl2PlxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXG48L3VpLXNlbGVjdD5cXG48Zm9ybWlvLWVycm9ycz48L2Zvcm1pby1lcnJvcnM+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy1tdWx0aXBsZS5odG1sJyxcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignYnV0dG9uJywge1xuICAgICAgICB0aXRsZTogJ0J1dHRvbicsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnU3VibWl0JyxcbiAgICAgICAgICB0YWJsZVZpZXc6IGZhbHNlLFxuICAgICAgICAgIGtleTogJ3N1Ym1pdCcsXG4gICAgICAgICAgc2l6ZTogJ21kJyxcbiAgICAgICAgICBsZWZ0SWNvbjogJycsXG4gICAgICAgICAgcmlnaHRJY29uOiAnJyxcbiAgICAgICAgICBibG9jazogZmFsc2UsXG4gICAgICAgICAgYWN0aW9uOiAnc3VibWl0JyxcbiAgICAgICAgICBkaXNhYmxlT25JbnZhbGlkOiBmYWxzZSxcbiAgICAgICAgICB0aGVtZTogJ3ByaW1hcnknXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcbiAgICAgICAgICB2YXIgb25DbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc3dpdGNoIChzZXR0aW5ncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc2V0JzpcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ29hdXRoJzpcbiAgICAgICAgICAgICAgICBpZiAoIXNldHRpbmdzLm9hdXRoKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IG11c3QgYXNzaWduIHRoaXMgYnV0dG9uIHRvIGFuIE9BdXRoIGFjdGlvbiBiZWZvcmUgaXQgd2lsbCB3b3JrLidcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5vYXV0aC5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogc2V0dGluZ3Mub2F1dGguZXJyb3JcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5vcGVuT0F1dGgoc2V0dGluZ3Mub2F1dGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICAkc2NvcGUuJG9uKCdidXR0b25DbGljaycsIGZ1bmN0aW9uKGV2ZW50LCBjb21wb25lbnQsIGNvbXBvbmVudElkKSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGNvbXBvbmVudElkJ3MgbWF0Y2ggKGV2ZW4gdGhvdWdoIHRoZXkgYWx3YXlzIHNob3VsZCkuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SWQgIT09ICRzY29wZS5jb21wb25lbnRJZCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvbkNsaWNrKCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAkc2NvcGUub3Blbk9BdXRoID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICByZXNwb25zZV90eXBlOiAnY29kZScsXG4gICAgICAgICAgICAgIGNsaWVudF9pZDogc2V0dGluZ3MuY2xpZW50SWQsXG4gICAgICAgICAgICAgIHJlZGlyZWN0X3VyaTogd2luZG93LmxvY2F0aW9uLm9yaWdpbiB8fCB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgIHN0YXRlOiBzZXR0aW5ncy5zdGF0ZSxcbiAgICAgICAgICAgICAgc2NvcGU6IHNldHRpbmdzLnNjb3BlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyplc2xpbnQtZW5hYmxlIGNhbWVsY2FzZSAqL1xuXG4gICAgICAgICAgICAvLyBNYWtlIGRpc3BsYXkgb3B0aW9uYWwuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGlzcGxheSkge1xuICAgICAgICAgICAgICBwYXJhbXMuZGlzcGxheSA9IHNldHRpbmdzLmRpc3BsYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJhbXMgPSBPYmplY3Qua2V5cyhwYXJhbXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba2V5XSk7XG4gICAgICAgICAgICB9KS5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIHZhciB1cmwgPSBzZXR0aW5ncy5hdXRoVVJJICsgJz8nICsgcGFyYW1zO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBtYWtlIHdpbmRvdyBvcHRpb25zIGZyb20gb2F1dGggc2V0dGluZ3MsIGhhdmUgYmV0dGVyIGRlZmF1bHRzXG4gICAgICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3Blbih1cmwsIHNldHRpbmdzLnByb3ZpZGVyLCAnd2lkdGg9MTAyMCxoZWlnaHQ9NjE4Jyk7XG4gICAgICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgcG9wdXBIb3N0ID0gcG9wdXAubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEhvc3QgPSB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICBpZiAocG9wdXAgJiYgIXBvcHVwLmNsb3NlZCAmJiBwb3B1cEhvc3QgPT09IGN1cnJlbnRIb3N0ICYmIHBvcHVwLmxvY2F0aW9uLnNlYXJjaCkge1xuICAgICAgICAgICAgICAgICAgcG9wdXAuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBwb3B1cC5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHBhcmFtcywgcGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gcGFyYW0uc3BsaXQoJz0nKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW3NwbGl0WzBdXSA9IHNwbGl0WzFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgfSwge30pO1xuICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLmVycm9yX2Rlc2NyaXB0aW9uIHx8IHBhcmFtcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgZm9yIGVycm9yIHJlc3BvbnNlIGhlcmVcbiAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zdGF0ZSAhPT0gcGFyYW1zLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnT0F1dGggc3RhdGUgZG9lcyBub3QgbWF0Y2guIFBsZWFzZSB0cnkgbG9nZ2luZyBpbiBhZ2Fpbi4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvbiA9IHtkYXRhOiB7fSwgb2F1dGg6IHt9fTtcbiAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb24ub2F1dGhbc2V0dGluZ3MucHJvdmlkZXJdID0gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbi5vYXV0aFtzZXR0aW5ncy5wcm92aWRlcl0ucmVkaXJlY3RVUkkgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luIHx8IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtaW9Gb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1pby5zYXZlU3VibWlzc2lvbihzdWJtaXNzaW9uKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBmb3JtIHN1Ym1pc3Npb24uXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pc3Npb24nLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtaW9Gb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8IGVycm9yXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCFwb3B1cCB8fCBwb3B1cC5jbG9zZWQgfHwgcG9wdXAuY2xvc2VkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2J1dHRvbi5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9idXR0b24uaHRtbCcsXG4gICAgICAgIFwiPGJ1dHRvbiB0eXBlPVxcXCJ7e2NvbXBvbmVudC5hY3Rpb24gPT0gJ3N1Ym1pdCcgfHwgY29tcG9uZW50LmFjdGlvbiA9PSAncmVzZXQnID8gY29tcG9uZW50LmFjdGlvbiA6ICdidXR0b24nfX1cXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5nLWNsYXNzPVxcXCJ7J2J0bi1ibG9jayc6IGNvbXBvbmVudC5ibG9ja31cXFwiXFxuICBjbGFzcz1cXFwiYnRuIGJ0bi17eyBjb21wb25lbnQudGhlbWUgfX0gYnRuLXt7IGNvbXBvbmVudC5zaXplIH19XFxcIlxcbiAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5IHx8IGZvcm1pb0Zvcm0uc3VibWl0dGluZyB8fCAoY29tcG9uZW50LmRpc2FibGVPbkludmFsaWQgJiYgZm9ybWlvRm9ybS4kaW52YWxpZClcXFwiXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICBuZy1jbGljaz1cXFwiJGVtaXQoJ2J1dHRvbkNsaWNrJywgY29tcG9uZW50LCBjb21wb25lbnRJZClcXFwiPlxcbiAgPHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5sZWZ0SWNvblxcXCIgY2xhc3M9XFxcInt7IGNvbXBvbmVudC5sZWZ0SWNvbiB9fVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gIDxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQubGVmdEljb24gJiYgY29tcG9uZW50LmxhYmVsXFxcIj4mbmJzcDs8L3NwYW4+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5yaWdodEljb24gJiYgY29tcG9uZW50LmxhYmVsXFxcIj4mbmJzcDs8L3NwYW4+XFxuICA8c3BhbiBuZy1pZj1cXFwiY29tcG9uZW50LnJpZ2h0SWNvblxcXCIgY2xhc3M9XFxcInt7IGNvbXBvbmVudC5yaWdodEljb24gfX1cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgPGkgbmctaWY9XFxcImNvbXBvbmVudC5hY3Rpb24gPT0gJ3N1Ym1pdCcgJiYgZm9ybWlvRm9ybS5zdWJtaXR0aW5nXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoIGdseXBoaWNvbi1zcGluXFxcIj48L2k+XFxuPC9idXR0b24+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2J1dHRvbi5odG1sJyxcbiAgICAgICAgXCJcIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY2hlY2tib3gnLCB7XG4gICAgICAgIHRpdGxlOiAnQ2hlY2sgQm94JyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jaGVja2JveC5odG1sJyxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyAnWWVzJyA6ICdObyc7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgLy8gRkEtODUwIC0gRW5zdXJlIHRoZSBjaGVja2VkIHZhbHVlIGlzIGFsd2F5cyBhIGJvb2xlbiBvYmplY3Qgd2hlbiBsb2FkZWQsIHRoZW4gdW5iaW5kIHRoZSB3YXRjaC5cbiAgICAgICAgICB2YXIgbG9hZENvbXBsZXRlID0gJHNjb3BlLiR3YXRjaCgnZGF0YS4nICsgJHNjb3BlLmNvbXBvbmVudC5rZXksIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGJvb2xlYW4gPSB7XG4gICAgICAgICAgICAgIHRydWU6IHRydWUsXG4gICAgICAgICAgICAgIGZhbHNlOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGF0YSAmJiAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gJiYgISgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gaW5zdGFuY2VvZiBCb29sZWFuKSkge1xuICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBib29sZWFuWyRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XV0gfHwgZmFsc2U7XG4gICAgICAgICAgICAgIGxvYWRDb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdjaGVja2JveCcsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIC8vIFRoaXMgaGlkZXMgdGhlIGRlZmF1bHQgbGFiZWwgbGF5b3V0IHNvIHdlIGNhbiB1c2UgYSBzcGVjaWFsIGlubGluZSBsYWJlbFxuICAgICAgICAgIGhpZGVMYWJlbDogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnY2hlY2tib3hGaWVsZCcsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9jaGVja2JveC5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJjaGVja2JveFxcXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj5cXG4gICAgPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxuICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIj5cXG4gICAge3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxuICA8L2xhYmVsPlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb2x1bW5zJywge1xuICAgICAgICB0aXRsZTogJ0NvbHVtbnMnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgY29sdW1uczogW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy9jb2x1bW5zLmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImNvbC1zbS02XFxcIiBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb21wb25lbnQuY29sdW1ucyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICAgIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbHVtbi5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgICBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCJcXG4gICAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICAgIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICAgIHJlYWQtb25seT1cXFwicmVhZE9ubHlcXFwiXFxuICAgICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgICAgZ3JpZC1jb2w9XFxcImdyaWRDb2xcXFwiXFxuICAgICAgbmctaWY9XFxcInNob3dbY29sdW1uLmtleSB8fCAnJ10gJiYgc2hvd1tjb21wb25lbnQua2V5IHx8ICcnXVxcXCJcXG4gICAgICBzaG93PVxcXCJzaG93XFxcIlxcbiAgICA+PC9mb3JtaW8tY29tcG9uZW50PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImNvbC1zbS02XFxcIiBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb21wb25lbnQuY29sdW1ucyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudC12aWV3IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbHVtbi5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm09XFxcImZvcm1cXFwiIGlnbm9yZT1cXFwiaWdub3JlXFxcIj48L2Zvcm1pby1jb21wb25lbnQtdmlldz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAucHJvdmlkZXIoJ2Zvcm1pb0NvbXBvbmVudHMnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIHZhciBncm91cHMgPSB7XG4gICAgICBfX2NvbXBvbmVudDoge1xuICAgICAgICB0aXRsZTogJ0Jhc2ljIENvbXBvbmVudHMnXG4gICAgICB9LFxuICAgICAgYWR2YW5jZWQ6IHtcbiAgICAgICAgdGl0bGU6ICdTcGVjaWFsIENvbXBvbmVudHMnXG4gICAgICB9LFxuICAgICAgbGF5b3V0OiB7XG4gICAgICAgIHRpdGxlOiAnTGF5b3V0IENvbXBvbmVudHMnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWRkR3JvdXA6IGZ1bmN0aW9uKG5hbWUsIGdyb3VwKSB7XG4gICAgICAgIGdyb3Vwc1tuYW1lXSA9IGdyb3VwO1xuICAgICAgfSxcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbih0eXBlLCBjb21wb25lbnQsIGdyb3VwKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50c1t0eXBlXSkge1xuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0gPSBjb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYW5ndWxhci5leHRlbmQoY29tcG9uZW50c1t0eXBlXSwgY29tcG9uZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdHlwZSBmb3IgdGhpcyBjb21wb25lbnQuXG4gICAgICAgIGlmICghY29tcG9uZW50c1t0eXBlXS5ncm91cCkge1xuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0uZ3JvdXAgPSBncm91cCB8fCAnX19jb21wb25lbnQnO1xuICAgICAgICB9XG4gICAgICAgIGNvbXBvbmVudHNbdHlwZV0uc2V0dGluZ3MudHlwZSA9IHR5cGU7XG4gICAgICB9LFxuICAgICAgJGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50cyxcbiAgICAgICAgICBncm91cHM6IGdyb3Vwc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ3NhZmVNdWx0aXBsZVRvU2luZ2xlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlLCBlbCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgbmdNb2RlbC4kZm9ybWF0dGVycy5wdXNoKGZ1bmN0aW9uKG1vZGVsVmFsdWUpIHtcbiAgICAgICAgICBpZiAoISRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgJiYgQXJyYXkuaXNBcnJheShtb2RlbFZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWVbMF0gfHwgJyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NvbnRhaW5lcicsIHtcbiAgICAgICAgdGl0bGU6ICdDb250YWluZXInLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbnRhaW5lci5odG1sJyxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2NvbnRhaW5lci5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxuICAgICAgICBpY29uOiAnZmEgZmEtZm9sZGVyLW9wZW4nLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRyZWU6IHRydWUsXG4gICAgICAgICAgY29tcG9uZW50czogW10sXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdjb250YWluZXInLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAuY29udHJvbGxlcignZm9ybWlvQ29udGFpbmVyQ29tcG9uZW50JywgW1xuICAgICckc2NvcGUnLFxuICAgIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IHt9O1xuICAgICAgJHNjb3BlLnBhcmVudEtleSA9ICRzY29wZS5jb21wb25lbnQua2V5O1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGFpbmVyLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGRpdiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9Db250YWluZXJDb21wb25lbnRcXFwiIGNsYXNzPVxcXCJmb3JtaW8tY29udGFpbmVyLWNvbXBvbmVudFxcXCI+XFxuICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICBjb21wb25lbnQ9XFxcIl9jb21wb25lbnRcXFwiXFxuICAgIGRhdGE9XFxcImRhdGFbcGFyZW50S2V5XVxcXCJcXG4gICAgZm9ybWlvPVxcXCJmb3JtaW9cXFwiXFxuICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIlxcbiAgICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gICAgZ3JpZC1jb2w9XFxcImdyaWRDb2xcXFwiXFxuICAgIG5nLWlmPVxcXCJzaG93W2NvbXBvbmVudC5rZXkgfHwgJyddICYmIHNob3dbX2NvbXBvbmVudC5rZXkgfHwgJyddXFxcIlxcbiAgICBzaG93PVxcXCJzaG93XFxcIlxcbiAgPjwvZm9ybWlvLWNvbXBvbmVudD5cXG48L2Rpdj5cXG5cIlxuICAgICAgKSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NvbnRlbnQnLCB7XG4gICAgICAgIHRpdGxlOiAnQ29udGVudCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgaHRtbDogJydcbiAgICAgICAgfSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9jb250ZW50Lmh0bWwnLFxuICAgICAgICBcIjxkaXYgbmctYmluZC1odG1sPVxcXCJjb21wb25lbnQuaHRtbCB8IHNhZmVodG1sIHwgZm9ybWlvVHJhbnNsYXRlOmNvbXBvbmVudC5rZXlcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2N1cnJlbmN5SW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBNYXkgYmUgYmV0dGVyIHdheSB0aGFuIGFkZGluZyB0byBwcm90b3R5cGUuXG4gICAgdmFyIHNwbGljZSA9IGZ1bmN0aW9uKHN0cmluZywgaWR4LCByZW0sIHMpIHtcbiAgICAgIHJldHVybiAoc3RyaW5nLnNsaWNlKDAsIGlkeCkgKyBzICsgc3RyaW5nLnNsaWNlKGlkeCArIE1hdGguYWJzKHJlbSkpKTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5iaW5kKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gc2NvcGUuZGF0YVtzY29wZS5jb21wb25lbnQua2V5XTtcblxuICAgICAgICAgIC8vY2xlYXJpbmcgbGVmdCBzaWRlIHplcm9zXG4gICAgICAgICAgd2hpbGUgKGRhdGEuY2hhckF0KDApID09PSAnMCcpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnN1YnN0cigxKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhID0gZGF0YS5yZXBsYWNlKC9bXlxcZC5cXCcsJ10vZywgJycpO1xuXG4gICAgICAgICAgdmFyIHBvaW50ID0gZGF0YS5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgaWYgKHBvaW50ID49IDApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnNsaWNlKDAsIHBvaW50ICsgMyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlY2ltYWxTcGxpdCA9IGRhdGEuc3BsaXQoJy4nKTtcbiAgICAgICAgICB2YXIgaW50UGFydCA9IGRlY2ltYWxTcGxpdFswXTtcbiAgICAgICAgICB2YXIgZGVjUGFydCA9IGRlY2ltYWxTcGxpdFsxXTtcblxuICAgICAgICAgIGludFBhcnQgPSBpbnRQYXJ0LnJlcGxhY2UoL1teXFxkXS9nLCAnJyk7XG4gICAgICAgICAgaWYgKGludFBhcnQubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgdmFyIGludERpdiA9IE1hdGguZmxvb3IoaW50UGFydC5sZW5ndGggLyAzKTtcbiAgICAgICAgICAgIHdoaWxlIChpbnREaXYgPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBsYXN0Q29tbWEgPSBpbnRQYXJ0LmluZGV4T2YoJywnKTtcbiAgICAgICAgICAgICAgaWYgKGxhc3RDb21tYSA8IDApIHtcbiAgICAgICAgICAgICAgICBsYXN0Q29tbWEgPSBpbnRQYXJ0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChsYXN0Q29tbWEgLSAzID4gMCkge1xuICAgICAgICAgICAgICAgIGludFBhcnQgPSBzcGxpY2UoaW50UGFydCwgbGFzdENvbW1hIC0gMywgMCwgJywnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpbnREaXYtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZGVjUGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWNQYXJ0ID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVjUGFydCA9ICcuJyArIGRlY1BhcnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXMgPSBpbnRQYXJ0ICsgZGVjUGFydDtcbiAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzY29wZS5kYXRhW3Njb3BlLmNvbXBvbmVudC5rZXldID0gcmVzO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2N1cnJlbmN5Jywge1xuICAgICAgICB0aXRsZTogJ0N1cnJlbmN5JyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jdXJyZW5jeS5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGlucHV0VHlwZTogJ3RleHQnLFxuICAgICAgICAgIGlucHV0TWFzazogJycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2N1cnJlbmN5RmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG11bHRpcGxlOiAnJyxcbiAgICAgICAgICAgIGN1c3RvbTogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmRpdGlvbmFsOiB7XG4gICAgICAgICAgICBzaG93OiBudWxsLFxuICAgICAgICAgICAgd2hlbjogbnVsbCxcbiAgICAgICAgICAgIGVxOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2N1cnJlbmN5Lmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxuY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXG5pZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxubmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxudGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbm5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbm5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxubmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbnNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxucGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVxcXCJcXG5jdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcbmN1cnJlbmN5LWlucHV0XFxudWktbWFzay1wbGFjZWhvbGRlcj1cXFwiXFxcIlxcbnVpLW9wdGlvbnM9XFxcInVpTWFza09wdGlvbnNcXFwiXFxuPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY3VzdG9tJywge1xuICAgICAgICB0aXRsZTogJ0N1c3RvbScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY3VzdG9tLmh0bWwnLFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgc2V0dGluZ3M6IHt9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2N1c3RvbS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC1kZWZhdWx0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHkgdGV4dC1tdXRlZCB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIEN1c3RvbSBDb21wb25lbnQgKHt7IGNvbXBvbmVudC50eXBlIH19KVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2RhdGFncmlkJywge1xuICAgICAgICB0aXRsZTogJ0RhdGEgR3JpZCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0YWdyaWQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCwgJGludGVycG9sYXRlLCBjb21wb25lbnRJbmZvKSB7XG4gICAgICAgICAgdmFyIHZpZXcgPSAnPHRhYmxlIGNsYXNzPVwidGFibGUgdGFibGUtc3RyaXBlZCB0YWJsZS1ib3JkZXJlZFwiPjx0aGVhZD48dHI+JztcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgdmlldyArPSAnPHRoPicgKyBjb21wb25lbnQubGFiZWwgKyAnPC90aD4nO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZpZXcgKz0gJzwvdHI+PC90aGVhZD4nO1xuICAgICAgICAgIHZpZXcgKz0gJzx0Ym9keT4nO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgICAgIHZpZXcgKz0gJzx0cj4nO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgdmFyIGluZm8gPSBjb21wb25lbnRJbmZvLmNvbXBvbmVudHMuaGFzT3duUHJvcGVydHkoY29tcG9uZW50LnR5cGUpID8gY29tcG9uZW50SW5mby5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXSA6IHt9O1xuICAgICAgICAgICAgICBpZiAoaW5mby50YWJsZVZpZXcpIHtcbiAgICAgICAgICAgICAgICB2aWV3ICs9ICc8dGQ+JyArIGluZm8udGFibGVWaWV3KHJvd1tjb21wb25lbnQua2V5XSB8fCAnJywgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUsIGNvbXBvbmVudEluZm8pICsgJzwvdGQ+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2aWV3ICs9ICc8dGQ+JztcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnByZWZpeCkge1xuICAgICAgICAgICAgICAgICAgdmlldyArPSBjb21wb25lbnQucHJlZml4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2aWV3ICs9IHJvd1tjb21wb25lbnQua2V5XSB8fCAnJztcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnN1ZmZpeCkge1xuICAgICAgICAgICAgICAgICAgdmlldyArPSAnICcgKyBjb21wb25lbnQuc3VmZml4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2aWV3ICs9ICc8L3RkPic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmlldyArPSAnPC90cj4nO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZpZXcgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICAgIHJldHVybiB2aWV3O1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRyZWU6IHRydWUsXG4gICAgICAgICAgY29tcG9uZW50czogW10sXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdkYXRhZ3JpZCcsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9EYXRhR3JpZCcsIFtcbiAgICAnJHNjb3BlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgIC8vIEVuc3VyZSBlYWNoIGRhdGEgZ3JpZCBoYXMgYSB2YWxpZCBkYXRhIG1vZGVsLlxuICAgICAgJHNjb3BlLmRhdGEgPSAkc2NvcGUuZGF0YSB8fCB7fTtcbiAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9ICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSB8fCBbe31dO1xuXG4gICAgICAvLyBQdWxsIG91dCB0aGUgcm93cyBhbmQgY29scyBmb3IgZWFzeSBpdGVyYXRpb24uXG4gICAgICAkc2NvcGUucm93cyA9ICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XTtcbiAgICAgICRzY29wZS5jb2xzID0gJHNjb3BlLmNvbXBvbmVudC5jb21wb25lbnRzO1xuICAgICAgJHNjb3BlLmxvY2FsS2V5cyA9ICRzY29wZS5jb21wb25lbnQuY29tcG9uZW50cy5tYXAoZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIHJldHVybiBjb21wb25lbnQua2V5O1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCBhIHJvdyB0aGUgdG8gZ3JpZC5cbiAgICAgICRzY29wZS5hZGRSb3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KCRzY29wZS5yb3dzKSkge1xuICAgICAgICAgICRzY29wZS5yb3dzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnJvd3MucHVzaCh7fSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBSZW1vdmUgYSByb3cgZnJvbSB0aGUgZ3JpZC5cbiAgICAgICRzY29wZS5yZW1vdmVSb3cgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAkc2NvcGUucm93cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2RhdGFncmlkLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwiZm9ybWlvLWRhdGEtZ3JpZFxcXCIgbmctY29udHJvbGxlcj1cXFwiZm9ybWlvRGF0YUdyaWRcXFwiIG5nLWlmPVxcXCJzaG93W2NvbXBvbmVudC5rZXkgfHwgJyddXFxcIj5cXG4gIDx0YWJsZSBuZy1jbGFzcz1cXFwieyd0YWJsZS1zdHJpcGVkJzogY29tcG9uZW50LnN0cmlwZWQsICd0YWJsZS1ib3JkZXJlZCc6IGNvbXBvbmVudC5ib3JkZXJlZCwgJ3RhYmxlLWhvdmVyJzogY29tcG9uZW50LmhvdmVyLCAndGFibGUtY29uZGVuc2VkJzogY29tcG9uZW50LmNvbmRlbnNlZH1cXFwiIGNsYXNzPVxcXCJ0YWJsZSBkYXRhZ3JpZC10YWJsZVxcXCI+XFxuICAgIDx0cj5cXG4gICAgICA8dGggbmctcmVwZWF0PVxcXCJjb2wgaW4gY29scyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWlmPVxcXCJzaG93W2NvbC5rZXkgfHwgJyddIHx8IGxvY2FsS2V5cy5pbmRleE9mKGNvbC5jb25kaXRpb25hbC53aGVuKSAhPT0gLTFcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29sLnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29sLmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PC90aD5cXG4gICAgPC90cj5cXG4gICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3MgdHJhY2sgYnkgJGluZGV4XFxcIiBuZy1pbml0PVxcXCJyb3dJbmRleCA9ICRpbmRleFxcXCI+XFxuICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29sIGluIGNvbHMgdHJhY2sgYnkgJGluZGV4XFxcIiBuZy1pbml0PVxcXCJjb2wuaGlkZUxhYmVsID0gdHJ1ZTsgY29sSW5kZXggPSAkaW5kZXhcXFwiIGNsYXNzPVxcXCJmb3JtaW8tZGF0YS1ncmlkLXJvd1xcXCI+XFxuICAgICAgICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICAgICAgICBuZy1pZj1cXFwiKGxvY2FsS2V5cy5pbmRleE9mKGNvbC5jb25kaXRpb25hbC53aGVuKSA9PT0gLTEgJiYgc2hvd1tjb2wua2V5IHx8ICcnXSkgfHwgY2hlY2tDb25kaXRpb25hbChjb2wua2V5LCByb3cpXFxcIlxcbiAgICAgICAgICBjb21wb25lbnQ9XFxcImNvbFxcXCJcXG4gICAgICAgICAgZGF0YT1cXFwicm93c1tyb3dJbmRleF1cXFwiXFxuICAgICAgICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICAgICAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgICAgICAgcmVhZC1vbmx5PVxcXCJyZWFkT25seSB8fCBjb2wuZGlzYWJsZWRcXFwiXFxuICAgICAgICAgIGdyaWQtcm93PVxcXCJyb3dJbmRleFxcXCJcXG4gICAgICAgICAgZ3JpZC1jb2w9XFxcImNvbEluZGV4XFxcIlxcbiAgICAgICAgICBzaG93PVxcXCJzaG93XFxcIlxcbiAgICAgICAgPjwvZm9ybWlvLWNvbXBvbmVudD5cXG4gICAgICA8L3RkPlxcbiAgICAgIDx0ZD5cXG4gICAgICAgIDxhIG5nLWNsaWNrPVxcXCJyZW1vdmVSb3cocm93SW5kZXgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5cXG4gICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVxcXCI+PC9zcGFuPlxcbiAgICAgICAgPC9hPlxcbiAgICAgIDwvdGQ+XFxuICAgIDwvdHI+XFxuICA8L3RhYmxlPlxcbiAgPGRpdiBjbGFzcz1cXFwiZGF0YWdyaWQtYWRkXFxcIj5cXG4gICAgPGEgbmctY2xpY2s9XFxcImFkZFJvdygpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiB7eyBjb21wb25lbnQuYWRkQW5vdGhlciB8fCBcXFwiQWRkIEFub3RoZXJcXFwiIHwgZm9ybWlvVHJhbnNsYXRlfX1cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdkYXRldGltZScsIHtcbiAgICAgICAgdGl0bGU6ICdEYXRlIC8gVGltZScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgICByZXR1cm4gJGludGVycG9sYXRlKCc8c3Bhbj57eyBcIicgKyBkYXRhICsgJ1wiIHwgZGF0ZTogXCInICsgY29tcG9uZW50LmZvcm1hdCArICdcIiB9fTwvc3Bhbj4nKSgpO1xuICAgICAgICB9LFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbigkc2NvcGUsICR0aW1lb3V0KSB7XG4gICAgICAgICAgLy8gRW5zdXJlIHRoZSBkYXRlIHZhbHVlIGlzIGFsd2F5cyBhIGRhdGUgb2JqZWN0IHdoZW4gbG9hZGVkLCB0aGVuIHVuYmluZCB0aGUgd2F0Y2guXG4gICAgICAgICAgdmFyIGxvYWRDb21wbGV0ZSA9ICRzY29wZS4kd2F0Y2goJ2RhdGEuJyArICRzY29wZS5jb21wb25lbnQua2V5LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGF0YSAmJiAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gJiYgISgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBuZXcgRGF0ZSgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0pO1xuICAgICAgICAgICAgICBsb2FkQ29tcGxldGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5tYXhEYXRlKSB7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmNvbXBvbmVudC5tYXhEYXRlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoISRzY29wZS5jb21wb25lbnQubWluRGF0ZSkge1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5jb21wb25lbnQubWluRGF0ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkc2NvcGUuYXV0b09wZW4gPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5vbkNsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmF1dG9PcGVuID0gZmFsc2U7XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmF1dG9PcGVuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfV0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdkYXRldGltZUZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgZm9ybWF0OiAneXl5eS1NTS1kZCBISDptbScsXG4gICAgICAgICAgZW5hYmxlRGF0ZTogdHJ1ZSxcbiAgICAgICAgICBlbmFibGVUaW1lOiB0cnVlLFxuICAgICAgICAgIG1pbkRhdGU6IG51bGwsXG4gICAgICAgICAgbWF4RGF0ZTogbnVsbCxcbiAgICAgICAgICBkYXRlcGlja2VyTW9kZTogJ2RheScsXG4gICAgICAgICAgZGF0ZVBpY2tlcjoge1xuICAgICAgICAgICAgc2hvd1dlZWtzOiB0cnVlLFxuICAgICAgICAgICAgc3RhcnRpbmdEYXk6IDAsXG4gICAgICAgICAgICBpbml0RGF0ZTogJycsXG4gICAgICAgICAgICBtaW5Nb2RlOiAnZGF5JyxcbiAgICAgICAgICAgIG1heE1vZGU6ICd5ZWFyJyxcbiAgICAgICAgICAgIHllYXJSYW5nZTogJzIwJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZVBpY2tlcjoge1xuICAgICAgICAgICAgaG91clN0ZXA6IDEsXG4gICAgICAgICAgICBtaW51dGVTdGVwOiAxLFxuICAgICAgICAgICAgc2hvd01lcmlkaWFuOiB0cnVlLFxuICAgICAgICAgICAgcmVhZG9ubHlJbnB1dDogZmFsc2UsXG4gICAgICAgICAgICBtb3VzZXdoZWVsOiB0cnVlLFxuICAgICAgICAgICAgYXJyb3drZXlzOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbTogJydcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJpbnB1dC1ncm91cFxcXCI+XFxuICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXG4gIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgbmctZm9jdXM9XFxcImNhbGVuZGFyT3BlbiA9IGF1dG9PcGVuXFxcIlxcbiAgbmctY2xpY2s9XFxcImNhbGVuZGFyT3BlbiA9IHRydWVcXFwiXFxuICBuZy1pbml0PVxcXCJjYWxlbmRhck9wZW4gPSBmYWxzZVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxuICBpcy1vcGVuPVxcXCJjYWxlbmRhck9wZW5cXFwiXFxuICBkYXRldGltZS1waWNrZXI9XFxcInt7IGNvbXBvbmVudC5mb3JtYXQgfX1cXFwiXFxuICBtaW4tZGF0ZT1cXFwiY29tcG9uZW50Lm1pbkRhdGVcXFwiXFxuICBtYXgtZGF0ZT1cXFwiY29tcG9uZW50Lm1heERhdGVcXFwiXFxuICBkYXRlcGlja2VyLW1vZGU9XFxcImNvbXBvbmVudC5kYXRlcGlja2VyTW9kZVxcXCJcXG4gIHdoZW4tY2xvc2VkPVxcXCJvbkNsb3NlZCgpXFxcIlxcbiAgZW5hYmxlLWRhdGU9XFxcImNvbXBvbmVudC5lbmFibGVEYXRlXFxcIlxcbiAgZW5hYmxlLXRpbWU9XFxcImNvbXBvbmVudC5lbmFibGVUaW1lXFxcIlxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxcIlxcbiAgZGF0ZXBpY2tlci1vcHRpb25zPVxcXCJjb21wb25lbnQuZGF0ZVBpY2tlclxcXCJcXG4gIHRpbWVwaWNrZXItb3B0aW9ucz1cXFwiY29tcG9uZW50LnRpbWVQaWNrZXJcXFwiIC8+XFxuICA8c3BhbiBjbGFzcz1cXFwiaW5wdXQtZ3JvdXAtYnRuXFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgbmctY2xpY2s9XFxcImNhbGVuZGFyT3BlbiA9IHRydWVcXFwiPlxcbiAgICAgIDxpIG5nLWlmPVxcXCJjb21wb25lbnQuZW5hYmxlRGF0ZVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tY2FsZW5kYXJcXFwiPjwvaT5cXG4gICAgICA8aSBuZy1pZj1cXFwiIWNvbXBvbmVudC5lbmFibGVEYXRlXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi10aW1lXFxcIj48L2k+XFxuICAgIDwvYnV0dG9uPlxcbiAgPC9zcGFuPlxcbjwvZGl2PlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2VtYWlsJywge1xuICAgICAgICB0aXRsZTogJ0VtYWlsJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2VtYWlsRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBraWNrYm94OiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2ZpZWxkc2V0Jywge1xuICAgICAgICB0aXRsZTogJ0ZpZWxkIFNldCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZmllbGRzZXQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxlZ2VuZDogJycsXG4gICAgICAgICAgY29tcG9uZW50czogW11cbiAgICAgICAgfSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2ZpZWxkc2V0Lmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2ZpZWxkc2V0Lmh0bWwnLFxuICAgICAgICBcIjxmaWVsZHNldCBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8bGVnZW5kIG5nLWlmPVxcXCJjb21wb25lbnQubGVnZW5kXFxcIj57eyBjb21wb25lbnQubGVnZW5kIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9sZWdlbmQ+XFxuICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICBjb21wb25lbnQ9XFxcIl9jb21wb25lbnRcXFwiXFxuICAgIGRhdGE9XFxcImRhdGFcXFwiXFxuICAgIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgICByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIlxcbiAgICBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCJcXG4gICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICBuZy1pZj1cXFwic2hvd1tjb21wb25lbnQua2V5IHx8ICcnXSAmJiBzaG93W19jb21wb25lbnQua2V5IHx8ICcnXVxcXCJcXG4gICAgc2hvdz1cXFwic2hvd1xcXCJcXG4gID48L2Zvcm1pby1jb21wb25lbnQ+XFxuPC9maWVsZHNldD5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvZmllbGRzZXQuaHRtbCcsXG4gICAgICAgIFwiPGZpZWxkc2V0IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxsZWdlbmQgbmctaWY9XFxcImNvbXBvbmVudC5sZWdlbmRcXFwiPnt7IGNvbXBvbmVudC5sZWdlbmQgfX08L2xlZ2VuZD5cXG4gIDxmb3JtaW8tY29tcG9uZW50LXZpZXcgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVxcXCIgZm9ybT1cXFwiZm9ybVxcXCIgaWdub3JlPVxcXCJpZ25vcmVcXFwiPjwvZm9ybWlvLWNvbXBvbmVudC12aWV3PlxcbjwvZmllbGRzZXQ+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2ZpbGUnLCB7XG4gICAgICAgIHRpdGxlOiAnRmlsZScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZmlsZS5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdmaWxlJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy9maWxlLmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0ZpbGVMaXN0JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpbGVzOiAnPScsXG4gICAgICAgIGZvcm06ICc9JyxcbiAgICAgICAgcmVhZE9ubHk6ICc9J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvZm9ybWlvLWZpbGUtbGlzdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgJyRzY29wZScsXG4gICAgICAgIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAgICRzY29wZS5yZW1vdmVGaWxlID0gZnVuY3Rpb24oZXZlbnQsIGluZGV4KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgICRzY29wZS5maWxlU2l6ZSA9IGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUpIHtcbiAgICAgICAgICAgIHJldHVybiAoYiA9IE1hdGgsIGMgPSBiLmxvZywgZCA9IDEwMjQsIGUgPSBjKGEpIC8gYyhkKSB8IDAsIGEgLyBiLnBvdyhkLCBlKSkudG9GaXhlZCgyKSArICcgJyArIChlID8gJ2tNR1RQRVpZJ1stLWVdICsgJ0InIDogJ0J5dGVzJyk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gIH1dKTtcblxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9GaWxlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpbGU6ICc9JyxcbiAgICAgICAgZm9ybTogJz0nXG4gICAgICB9LFxuICAgICAgdGVtcGxhdGU6ICc8YSBocmVmPVwie3sgZmlsZS51cmwgfX1cIiBuZy1jbGljaz1cImdldEZpbGUoJGV2ZW50KVwiIHRhcmdldD1cIl9ibGFua1wiPnt7IGZpbGUubmFtZSB9fTwvYT4nLFxuICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAnJHdpbmRvdycsXG4gICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgJyRzY29wZScsXG4gICAgICAgICdGb3JtaW8nLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAkd2luZG93LFxuICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgIEZvcm1pb1xuICAgICAgICApIHtcbiAgICAgICAgICAkc2NvcGUuZ2V0RmlsZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkc2NvcGUuZm9ybSA9ICRzY29wZS5mb3JtIHx8ICRyb290U2NvcGUuZmlsZVBhdGg7XG4gICAgICAgICAgICB2YXIgZm9ybWlvID0gbmV3IEZvcm1pbygkc2NvcGUuZm9ybSk7XG4gICAgICAgICAgICBmb3JtaW9cbiAgICAgICAgICAgICAgLmRvd25sb2FkRmlsZSgkc2NvcGUuZmlsZSkudGhlbihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbihmaWxlLnVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSXMgYWxlcnQgdGhlIGJlc3Qgd2F5IHRvIGRvIHRoaXM/XG4gICAgICAgICAgICAgICAgLy8gVXNlciBpcyBleHBlY3RpbmcgYW4gaW1tZWRpYXRlIG5vdGlmaWNhdGlvbiBkdWUgdG8gYXR0ZW1wdGluZyB0byBkb3dubG9hZCBhIGZpbGUuXG4gICAgICAgICAgICAgICAgYWxlcnQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0ltYWdlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpbGU6ICc9JyxcbiAgICAgICAgZm9ybTogJz0nXG4gICAgICB9LFxuICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXNyYz1cInt7IGltYWdlU3JjIH19XCIgYWx0PVwie3sgZmlsZS5uYW1lIH19XCIgLz4nLFxuICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICckc2NvcGUnLFxuICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgRm9ybWlvXG4gICAgICAgICkge1xuICAgICAgICAgICRzY29wZS5mb3JtID0gJHNjb3BlLmZvcm0gfHwgJHJvb3RTY29wZS5maWxlUGF0aDtcbiAgICAgICAgICB2YXIgZm9ybWlvID0gbmV3IEZvcm1pbygkc2NvcGUuZm9ybSk7XG5cbiAgICAgICAgICBmb3JtaW8uZG93bmxvYWRGaWxlKCRzY29wZS5maWxlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICRzY29wZS5pbWFnZVNyYyA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9GaWxlVXBsb2FkJywgW1xuICAgICckc2NvcGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oXG4gICAgICAkc2NvcGUsXG4gICAgICBGb3JtaW9VdGlsc1xuICAgICkge1xuICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzID0ge307XG5cbiAgICAgICRzY29wZS5yZW1vdmVVcGxvYWQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2luZGV4XTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRoaXMgZml4ZXMgbmV3IGZpZWxkcyBoYXZpbmcgYW4gZW1wdHkgc3BhY2UgaW4gdGhlIGFycmF5LlxuICAgICAgaWYgKCRzY29wZS5kYXRhICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9PT0gJycpIHtcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gW107XG4gICAgICB9XG4gICAgICBpZiAoJHNjb3BlLmRhdGEgJiYgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XVswXSA9PT0gJycpIHtcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnNwbGljZSgwLCAxKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLnVwbG9hZCA9IGZ1bmN0aW9uKGZpbGVzKSB7XG4gICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2UgJiYgZmlsZXMgJiYgZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICAvLyBHZXQgYSB1bmlxdWUgbmFtZSBmb3IgdGhpcyBmaWxlIHRvIGtlZXAgZmlsZSBjb2xsaXNpb25zIGZyb20gb2NjdXJyaW5nLlxuICAgICAgICAgICAgdmFyIGZpbGVOYW1lID0gRm9ybWlvVXRpbHMudW5pcXVlTmFtZShmaWxlLm5hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXSA9IHtcbiAgICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgc3RhdHVzOiAnaW5mbycsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTdGFydGluZyB1cGxvYWQnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGRpciA9ICRzY29wZS5jb21wb25lbnQuZGlyIHx8ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pby51cGxvYWRGaWxlKCRzY29wZS5jb21wb25lbnQuc3RvcmFnZSwgZmlsZSwgZmlsZU5hbWUsIGRpciwgZnVuY3Rpb24gcHJvY2Vzc05vdGlmeShldnQpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5zdGF0dXMgPSAncHJvZ3Jlc3MnO1xuICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZU5hbWVdLnByb2dyZXNzID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcbiAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlTmFtZV0ubWVzc2FnZTtcbiAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmlsZUluZm8pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGUgZmlsZSBjb21wb25lbnQgaXMgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgISRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSB8fFxuICAgICAgICAgICAgICAgICAgISgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gaW5zdGFuY2VvZiBBcnJheSlcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0ucHVzaChmaWxlSW5mbyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZU5hbWVdLnN0YXR1cyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5tZXNzYWdlID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5wcm9ncmVzcztcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oXG4gICAgICAkdGVtcGxhdGVDYWNoZVxuICAgICkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9mb3JtaW8tZmlsZS1saXN0Lmh0bWwnLFxuICAgICAgICBcIjx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtc3RyaXBlZCB0YWJsZS1ib3JkZXJlZFxcXCI+XFxuICA8dGhlYWQ+XFxuICAgIDx0cj5cXG4gICAgICA8dGQgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgc3R5bGU9XFxcIndpZHRoOjElO3doaXRlLXNwYWNlOm5vd3JhcDtcXFwiPjwvdGQ+XFxuICAgICAgPHRoPkZpbGUgTmFtZTwvdGg+XFxuICAgICAgPHRoPlNpemU8L3RoPlxcbiAgICA8L3RyPlxcbiAgPC90aGVhZD5cXG4gIDx0Ym9keT5cXG4gICAgPHRyIG5nLXJlcGVhdD1cXFwiZmlsZSBpbiBmaWxlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICAgIDx0ZCBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6MSU7d2hpdGUtc3BhY2U6bm93cmFwO1xcXCI+PGEgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgaHJlZj1cXFwiI1xcXCIgbmctY2xpY2s9XFxcInJlbW92ZUZpbGUoJGV2ZW50LCAkaW5kZXgpXFxcIiBzdHlsZT1cXFwicGFkZGluZzogMnB4IDRweDtcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXNtIGJ0bi1kZWZhdWx0XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiPjwvc3Bhbj48L2E+PC90ZD5cXG4gICAgICA8dGQ+PGZvcm1pby1maWxlIGZpbGU9XFxcImZpbGVcXFwiIGZvcm09XFxcImZvcm1cXFwiPjwvZm9ybWlvLWZpbGU+PC90ZD5cXG4gICAgICA8dGQ+e3sgZmlsZVNpemUoZmlsZS5zaXplKSB9fTwvdGQ+XFxuICAgIDwvdHI+XFxuICA8L3Rib2R5PlxcbjwvdGFibGU+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZmlsZS5odG1sJyxcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9sYWJlbD5cXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuPGRpdiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9GaWxlVXBsb2FkXFxcIj5cXG4gIDxmb3JtaW8tZmlsZS1saXN0IGZpbGVzPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBmb3JtPVxcXCJmb3JtaW8uZm9ybVVybFxcXCI+PC9mb3JtaW8tZmlsZS1saXN0PlxcbiAgPGRpdiBuZy1pZj1cXFwiIXJlYWRPbmx5ICYmIChjb21wb25lbnQubXVsdGlwbGUgfHwgKCFjb21wb25lbnQubXVsdGlwbGUgJiYgIWRhdGFbY29tcG9uZW50LmtleV0ubGVuZ3RoKSlcXFwiPlxcbiAgICA8ZGl2IG5nZi1kcm9wPVxcXCJ1cGxvYWQoJGZpbGVzKVxcXCIgY2xhc3M9XFxcImZpbGVTZWxlY3RvclxcXCIgbmdmLWRyYWctb3Zlci1jbGFzcz1cXFwiJ2ZpbGVEcmFnT3ZlcidcXFwiIG5nZi1tdWx0aXBsZT1cXFwiY29tcG9uZW50Lm11bHRpcGxlXFxcIiBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jbG91ZC11cGxvYWRcXFwiPjwvc3Bhbj5Ecm9wIGZpbGVzIHRvIGF0dGFjaCwgb3IgPGEgc3R5bGU9XFxcImN1cnNvcjogcG9pbnRlcjtcXFwiIG5nZi1zZWxlY3Q9XFxcInVwbG9hZCgkZmlsZXMpXFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIG5nZi1tdWx0aXBsZT1cXFwiY29tcG9uZW50Lm11bHRpcGxlXFxcIj5icm93c2U8L2E+LjwvZGl2PlxcbiAgICA8ZGl2IG5nLWlmPVxcXCIhY29tcG9uZW50LnN0b3JhZ2VcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC13YXJuaW5nXFxcIj5ObyBzdG9yYWdlIGhhcyBiZWVuIHNldCBmb3IgdGhpcyBmaWVsZC4gRmlsZSB1cGxvYWRzIGFyZSBkaXNhYmxlZCB1bnRpbCBzdG9yYWdlIGlzIHNldCB1cC48L2Rpdj5cXG4gICAgPGRpdiBuZ2Ytbm8tZmlsZS1kcm9wPkZpbGUgRHJhZy9Ecm9wIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHRoaXMgYnJvd3NlcjwvZGl2PlxcbiAgPC9kaXY+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiZmlsZVVwbG9hZCBpbiBmaWxlVXBsb2FkcyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWNsYXNzPVxcXCJ7J2hhcy1lcnJvcic6IGZpbGVVcGxvYWQuc3RhdHVzID09PSAnZXJyb3InfVxcXCIgY2xhc3M9XFxcImZpbGVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImZpbGVOYW1lIGNvbnRyb2wtbGFiZWwgY29sLXNtLTEwXFxcIj57eyBmaWxlVXBsb2FkLm5hbWUgfX0gPHNwYW4gbmctY2xpY2s9XFxcInJlbW92ZVVwbG9hZChmaWxlVXBsb2FkLm5hbWUpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiPjwvc3Bhbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJmaWxlU2l6ZSBjb250cm9sLWxhYmVsIGNvbC1zbS0yIHRleHQtcmlnaHRcXFwiPnt7IGZpbGVTaXplKGZpbGVVcGxvYWQuc2l6ZSkgfX08L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyXFxcIj5cXG4gICAgICAgIDxzcGFuIG5nLWlmPVxcXCJmaWxlVXBsb2FkLnN0YXR1cyA9PT0gJ3Byb2dyZXNzJ1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXJcXFwiIHJvbGU9XFxcInByb2dyZXNzYmFyXFxcIiBhcmlhLXZhbHVlbm93PVxcXCJ7e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fVxcXCIgYXJpYS12YWx1ZW1pbj1cXFwiMFxcXCIgYXJpYS12YWx1ZW1heD1cXFwiMTAwXFxcIiBzdHlsZT1cXFwid2lkdGg6e3tmaWxlVXBsb2FkLnByb2dyZXNzfX0lXFxcIj5cXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJzci1vbmx5XFxcIj57e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fSUgQ29tcGxldGU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwiIWZpbGVVcGxvYWQuc3RhdHVzICE9PSAncHJvZ3Jlc3MnXFxcIiBjbGFzcz1cXFwiYmcte3sgZmlsZVVwbG9hZC5zdGF0dXMgfX0gY29udHJvbC1sYWJlbFxcXCI+e3sgZmlsZVVwbG9hZC5tZXNzYWdlIH19PC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2ZpbGUuaHRtbCcsXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9sYWJlbD5cXG48ZGl2IG5nLWNvbnRyb2xsZXI9XFxcImZvcm1pb0ZpbGVVcGxvYWRcXFwiPlxcbiAgPGZvcm1pby1maWxlLWxpc3QgZmlsZXM9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIGZvcm09XFxcImZvcm1VcmxcXFwiIHJlYWQtb25seT1cXFwidHJ1ZVxcXCI+PC9mb3JtaW8tZmlsZS1saXN0PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdoaWRkZW4nLCB7XG4gICAgICAgIHRpdGxlOiAnSGlkZGVuJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9oaWRkZW4uaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBrZXk6ICdoaWRkZW5GaWVsZCcsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvaGlkZGVuLmh0bWwnLFxuICAgICAgICBcIjxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0h0bWxFbGVtZW50JywgW1xuICAgICckc2FuaXRpemUnLFxuICAgICckZmlsdGVyJyxcbiAgICBmdW5jdGlvbigkc2FuaXRpemUsICRmaWx0ZXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgY29tcG9uZW50OiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50cy9odG1sZWxlbWVudC1kaXJlY3RpdmUuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAgIHZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudChcbiAgICAgICAgICAgICAgJzwnICsgJHNjb3BlLmNvbXBvbmVudC50YWcgKyAnPicgKyAnPC8nICsgJHNjb3BlLmNvbXBvbmVudC50YWcgKyAnPidcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgkZmlsdGVyKCdmb3JtaW9UcmFuc2xhdGUnKSgkc2NvcGUuY29tcG9uZW50LmNvbnRlbnQpKTtcblxuICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdjbGFzcycsICRzY29wZS5jb21wb25lbnQuY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50LmF0dHJzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgICAgICAgICAgIGlmICghYXR0ci5hdHRyKSByZXR1cm47XG4gICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihhdHRyLmF0dHIsIGF0dHIudmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICRzY29wZS5odG1sID0gJHNhbml0aXplKGVsZW1lbnQucHJvcCgnb3V0ZXJIVE1MJykpO1xuICAgICAgICAgICAgICAkc2NvcGUucGFyc2VFcnJvciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIC8vIElzb2xhdGUgdGhlIG1lc3NhZ2UgYW5kIHN0b3JlIGl0LlxuICAgICAgICAgICAgICAkc2NvcGUucGFyc2VFcnJvciA9IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgIC5zcGxpdCgnXFxuJylbMF1cbiAgICAgICAgICAgICAgLnJlcGxhY2UoJ1skc2FuaXRpemU6YmFkcGFyc2VdJywgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjcmVhdGVFbGVtZW50KCk7XG5cbiAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjb21wb25lbnQnLCBjcmVhdGVFbGVtZW50LCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdodG1sZWxlbWVudCcsIHtcbiAgICAgICAgdGl0bGU6ICdIVE1MIEVsZW1lbnQnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2h0bWxlbGVtZW50Lmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiBmYWxzZSxcbiAgICAgICAgICB0YWc6ICdwJyxcbiAgICAgICAgICBhdHRyczogW10sXG4gICAgICAgICAgY2xhc3NOYW1lOiAnJyxcbiAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuXG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuaHRtbCcsXG4gICAgICAgICc8Zm9ybWlvLWh0bWwtZWxlbWVudCBjb21wb25lbnQ9XCJjb21wb25lbnRcIj48L2Rpdj4nXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2h0bWxlbGVtZW50LWRpcmVjdGl2ZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcXFwiIG5nLWlmPVxcXCJwYXJzZUVycm9yXFxcIj57eyBwYXJzZUVycm9yIH19PC9kaXY+XFxuICA8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiaHRtbFxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZm9ybWlvJyk7XG5cbi8vIEJhc2ljXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKShhcHApO1xucmVxdWlyZSgnLi90ZXh0ZmllbGQnKShhcHApO1xucmVxdWlyZSgnLi9udW1iZXInKShhcHApO1xucmVxdWlyZSgnLi9wYXNzd29yZCcpKGFwcCk7XG5yZXF1aXJlKCcuL3RleHRhcmVhJykoYXBwKTtcbnJlcXVpcmUoJy4vY2hlY2tib3gnKShhcHApO1xucmVxdWlyZSgnLi9zZWxlY3Rib3hlcycpKGFwcCk7XG5yZXF1aXJlKCcuL3NlbGVjdCcpKGFwcCk7XG5yZXF1aXJlKCcuL3JhZGlvJykoYXBwKTtcbnJlcXVpcmUoJy4vaHRtbGVsZW1lbnQnKShhcHApO1xucmVxdWlyZSgnLi9jb250ZW50JykoYXBwKTtcbnJlcXVpcmUoJy4vYnV0dG9uJykoYXBwKTtcblxuLy8gU3BlY2lhbFxucmVxdWlyZSgnLi9lbWFpbCcpKGFwcCk7XG5yZXF1aXJlKCcuL3Bob25lbnVtYmVyJykoYXBwKTtcbnJlcXVpcmUoJy4vYWRkcmVzcycpKGFwcCk7XG5yZXF1aXJlKCcuL2RhdGV0aW1lJykoYXBwKTtcbnJlcXVpcmUoJy4vY3VycmVuY3knKShhcHApO1xucmVxdWlyZSgnLi9oaWRkZW4nKShhcHApO1xucmVxdWlyZSgnLi9yZXNvdXJjZScpKGFwcCk7XG5yZXF1aXJlKCcuL2ZpbGUnKShhcHApO1xucmVxdWlyZSgnLi9zaWduYXR1cmUnKShhcHApO1xucmVxdWlyZSgnLi9jdXN0b20nKShhcHApO1xucmVxdWlyZSgnLi9kYXRhZ3JpZCcpKGFwcCk7XG5yZXF1aXJlKCcuL3N1cnZleScpKGFwcCk7XG5cbi8vIExheW91dFxucmVxdWlyZSgnLi9jb2x1bW5zJykoYXBwKTtcbnJlcXVpcmUoJy4vZmllbGRzZXQnKShhcHApO1xucmVxdWlyZSgnLi9jb250YWluZXInKShhcHApO1xucmVxdWlyZSgnLi9wYWdlJykoYXBwKTtcbnJlcXVpcmUoJy4vcGFuZWwnKShhcHApO1xucmVxdWlyZSgnLi90YWJsZScpKGFwcCk7XG5yZXF1aXJlKCcuL3dlbGwnKShhcHApO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICB2YXIgaXNOdW1lcmljID0gZnVuY3Rpb24gaXNOdW1lcmljKG4pIHtcbiAgICAgICAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcbiAgICAgIH07XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ251bWJlcicsIHtcbiAgICAgICAgdGl0bGU6ICdOdW1iZXInLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL251bWJlci5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgaW5wdXRUeXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnbnVtYmVyRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAwLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgbWluOiAnJyxcbiAgICAgICAgICAgIG1heDogJycsXG4gICAgICAgICAgICBzdGVwOiAnYW55JyxcbiAgICAgICAgICAgIGludGVnZXI6ICcnLFxuICAgICAgICAgICAgbXVsdGlwbGU6ICcnLFxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICAvLyBFbnN1cmUgdGhhdCB2YWx1ZXMgYXJlIG51bWJlcnMuXG4gICAgICAgICAgaWYgKCRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KCRzY29wZS5jb21wb25lbnQua2V5KSAmJiBpc051bWVyaWMoJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldKSkge1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gcGFyc2VGbG9hdCgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfV1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG5cbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9udW1iZXIuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8aW5wdXQgdHlwZT1cXFwie3sgY29tcG9uZW50LmlucHV0VHlwZSB9fVxcXCJcXG5jbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbmlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG5uYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG50YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxubmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxubmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXG5uZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuc2FmZS1tdWx0aXBsZS10by1zaW5nbGVcXG5taW49XFxcInt7IGNvbXBvbmVudC52YWxpZGF0ZS5taW4gfX1cXFwiXFxubWF4PVxcXCJ7eyBjb21wb25lbnQudmFsaWRhdGUubWF4IH19XFxcIlxcbnN0ZXA9XFxcInt7IGNvbXBvbmVudC52YWxpZGF0ZS5zdGVwIH19XFxcIlxcbnBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGUgfX1cXFwiXFxuY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG51aS1tYXNrPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRNYXNrIH19XFxcIlxcbnVpLW1hc2stcGxhY2Vob2xkZXI9XFxcIlxcXCJcXG51aS1vcHRpb25zPVxcXCJ1aU1hc2tPcHRpb25zXFxcIlxcbj5cXG5cIlxuICAgICAgKSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3BhZ2UnLCB7XG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvcGFnZS5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgY29tcG9uZW50czogW11cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9wYWdlLmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm1pbz1cXFwiZm9ybWlvXFxcIiBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCIgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIj48L2Zvcm1pby1jb21wb25lbnQ+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3BhbmVsJywge1xuICAgICAgICB0aXRsZTogJ1BhbmVsJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9wYW5lbC5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiBmYWxzZSxcbiAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgdGhlbWU6ICdkZWZhdWx0JyxcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxuICAgICAgICB9LFxuICAgICAgICB2aWV3VGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50c1ZpZXcvcGFuZWwuaHRtbCdcbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcGFuZWwuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwte3sgY29tcG9uZW50LnRoZW1lIH19XFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8ZGl2IG5nLWlmPVxcXCJjb21wb25lbnQudGl0bGVcXFwiIGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgY29tcG9uZW50LnRpdGxlIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9oMz5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgIDxmb3JtaW8tY29tcG9uZW50XFxuICAgICAgbmctcmVwZWF0PVxcXCJfY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgICBjb21wb25lbnQ9XFxcIl9jb21wb25lbnRcXFwiXFxuICAgICAgZGF0YT1cXFwiZGF0YVxcXCJcXG4gICAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgICByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICAgIGdyaWQtcm93PVxcXCJncmlkUm93XFxcIlxcbiAgICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICAgIG5nLWlmPVxcXCJzaG93W2NvbXBvbmVudC5rZXkgfHwgJyddICYmIHNob3dbX2NvbXBvbmVudC5rZXkgfHwgJyddXFxcIlxcbiAgICAgIHNob3c9XFxcInNob3dcXFwiXFxuICAgID48L2Zvcm1pby1jb21wb25lbnQ+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvcGFuZWwuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwte3sgY29tcG9uZW50LnRoZW1lIH19XFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8ZGl2IG5nLWlmPVxcXCJjb21wb25lbnQudGl0bGVcXFwiIGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgY29tcG9uZW50LnRpdGxlIH19PC9oMz5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgIDxmb3JtaW8tY29tcG9uZW50LXZpZXcgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVxcXCIgZm9ybT1cXFwiZm9ybVxcXCIgaWdub3JlPVxcXCJpZ25vcmVcXFwiPjwvZm9ybWlvLWNvbXBvbmVudC12aWV3PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdGl0bGU6ICdQYXNzd29yZCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAnLS0tIFBST1RFQ1RFRCAtLS0nO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXG4gICAgICAgICAgaW5wdXRUeXBlOiAncGFzc3dvcmQnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdwYXNzd29yZEZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICBzdWZmaXg6ICcnLFxuICAgICAgICAgIHByb3RlY3RlZDogdHJ1ZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncGhvbmVOdW1iZXInLCB7XG4gICAgICAgIHRpdGxlOiAnUGhvbmUgTnVtYmVyJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dE1hc2s6ICcoOTk5KSA5OTktOTk5OScsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3Bob25lbnVtYmVyRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmFkaW8nLCB7XG4gICAgICAgIHRpdGxlOiAnUmFkaW8nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3JhZGlvLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gY29tcG9uZW50LnZhbHVlcykge1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC52YWx1ZXNbaV0udmFsdWUgPT09IGRhdGEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC52YWx1ZXNbaV0ubGFiZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdyYWRpbycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3JhZGlvRmllbGQnLFxuICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbTogJycsXG4gICAgICAgICAgICBjdXN0b21Qcml2YXRlOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yYWRpby5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxuZy1mb3JtIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCI+XFxuICA8ZGl2IG5nLWNsYXNzPVxcXCJjb21wb25lbnQuaW5saW5lID8gJ3JhZGlvLWlubGluZScgOiAncmFkaW8nXFxcIiBuZy1yZXBlYXQ9XFxcInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICA8bGFiZWwgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50SWQgfX0te3sgdi52YWx1ZSB9fVxcXCI+XFxuICAgICAgPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxuICAgICAgICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgICAgICB2YWx1ZT1cXFwie3sgdi52YWx1ZSB9fVxcXCJcXG4gICAgICAgICAgICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICAgICAgICAgICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gICAgICAgICAgICAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXG4gICAgICAgICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIj5cXG5cXG4gICAgICB7eyB2LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxuICAgIDwvbGFiZWw+XFxuICA8L2Rpdj5cXG48L25nLWZvcm0+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdyZXNvdXJjZScsIHtcbiAgICAgICAgdGl0bGU6ICdSZXNvdXJjZScsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgICBpZiAoJGludGVycG9sYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGRhdGF9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZGF0YSA/IGRhdGEuX2lkIDogJyc7XG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSA/ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS1tdWx0aXBsZS5odG1sJyA6ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgZnVuY3Rpb24oJHNjb3BlLCBGb3JtaW8pIHtcbiAgICAgICAgICB2YXIgc2V0dGluZ3MgPSAkc2NvcGUuY29tcG9uZW50O1xuICAgICAgICAgIHZhciBwYXJhbXMgPSBzZXR0aW5ncy5wYXJhbXMgfHwge307XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnJlc291cmNlTG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgIHBhcmFtcy5saW1pdCA9IDEwMDtcbiAgICAgICAgICBwYXJhbXMuc2tpcCA9IDA7XG4gICAgICAgICAgaWYgKHNldHRpbmdzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZWZhdWx0VmFsdWUgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNldHRpbmdzLnJlc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gJyc7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MucHJvamVjdCkge1xuICAgICAgICAgICAgICB1cmwgKz0gJy9wcm9qZWN0LycgKyBzZXR0aW5ncy5wcm9qZWN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmZvcm1pbyAmJiAkc2NvcGUuZm9ybWlvLnByb2plY3RVcmwpIHtcbiAgICAgICAgICAgICAgdXJsICs9ICRzY29wZS5mb3JtaW8ucHJvamVjdFVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVybCArPSAnL2Zvcm0vJyArIHNldHRpbmdzLnJlc291cmNlO1xuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG5ldyBGb3JtaW8odXJsKTtcblxuICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgaXRlbXMuXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaFN1Ym1pc3Npb25zID0gZnVuY3Rpb24oaW5wdXQsIGFwcGVuZCkge1xuICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc291cmNlTG9hZGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkc2NvcGUucmVzb3VyY2VMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgLy8gSWYgdGhleSB3aXNoIHRvIHJldHVybiBvbmx5IHNvbWUgZmllbGRzLlxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc2VsZWN0RmllbGRzKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnNlbGVjdCA9IHNldHRpbmdzLnNlbGVjdEZpZWxkcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc2VhcmNoRmllbGRzICYmIGlucHV0KSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNldHRpbmdzLnNlYXJjaEZpZWxkcywgZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgIHBhcmFtc1tmaWVsZF0gPSBpbnB1dDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIExvYWQgdGhlIHN1Ym1pc3Npb25zLlxuICAgICAgICAgICAgICBmb3JtaW8ubG9hZFN1Ym1pc3Npb25zKHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbnMgPSBzdWJtaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSAkc2NvcGUuc2VsZWN0SXRlbXMuY29uY2F0KHN1Ym1pc3Npb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBzdWJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gKHN1Ym1pc3Npb25zLmxlbmd0aCA+PSBwYXJhbXMubGltaXQpICYmICgkc2NvcGUuc2VsZWN0SXRlbXMubGVuZ3RoIDwgc3VibWlzc2lvbnMuc2VydmVyQ291bnQpO1xuICAgICAgICAgICAgICB9KVsnZmluYWxseSddKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNvdXJjZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIG1vcmUgaXRlbXMuXG4gICAgICAgICAgICAkc2NvcGUubG9hZE1vcmVJdGVtcyA9IGZ1bmN0aW9uKCRzZWxlY3QsICRldmVudCkge1xuICAgICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBwYXJhbXMuc2tpcCArPSBwYXJhbXMubGltaXQ7XG4gICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoU3VibWlzc2lvbnMobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaFN1Ym1pc3Npb25zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XSxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdyZXNvdXJjZUZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcmVzb3VyY2U6ICcnLFxuICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgdGVtcGxhdGU6ICc8c3Bhbj57eyBpdGVtLmRhdGEgfX08L3NwYW4+JyxcbiAgICAgICAgICBzZWxlY3RGaWVsZHM6ICcnLFxuICAgICAgICAgIHNlYXJjaEZpZWxkczogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZWZhdWx0UGVybWlzc2lvbjogJydcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGV9fTwvbGFiZWw+XFxuPHNwYW4gbmctaWY9XFxcIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbjx1aS1zZWxlY3QgdWktc2VsZWN0LXJlcXVpcmVkIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlIHVpLXNlbGVjdC1vcGVuLW9uLWZvY3VzIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCI+XFxuICA8dWktc2VsZWN0LW1hdGNoIGNsYXNzPVxcXCJ1aS1zZWxlY3QtbWF0Y2hcXFwiIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGUgfX1cXFwiPlxcbiAgICA8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVxcXCJjb21wb25lbnQudGVtcGxhdGVcXFwiIGl0ZW09XFxcIiRpdGVtIHx8ICRzZWxlY3Quc2VsZWN0ZWRcXFwiIHNlbGVjdD1cXFwiJHNlbGVjdFxcXCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+XFxuICA8L3VpLXNlbGVjdC1tYXRjaD5cXG4gIDx1aS1zZWxlY3QtY2hvaWNlcyBjbGFzcz1cXFwidWktc2VsZWN0LWNob2ljZXNcXFwiIHJlcGVhdD1cXFwiaXRlbSBpbiBzZWxlY3RJdGVtcyB8IGZpbHRlcjogJHNlbGVjdC5zZWFyY2hcXFwiIHJlZnJlc2g9XFxcInJlZnJlc2hTdWJtaXNzaW9ucygkc2VsZWN0LnNlYXJjaClcXFwiIHJlZnJlc2gtZGVsYXk9XFxcIjI1MFxcXCI+XFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiaXRlbVxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXG4gICAgPGJ1dHRvbiBuZy1pZj1cXFwiaGFzTmV4dFBhZ2UgJiYgKCRpbmRleCA9PSAkc2VsZWN0Lml0ZW1zLmxlbmd0aC0xKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tc3VjY2VzcyBidG4tYmxvY2tcXFwiIG5nLWNsaWNrPVxcXCJsb2FkTW9yZUl0ZW1zKCRzZWxlY3QsICRldmVudClcXFwiIG5nLWRpc2FibGVkPVxcXCJyZXNvdXJjZUxvYWRpbmdcXFwiPkxvYWQgbW9yZS4uLjwvYnV0dG9uPlxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXG48L3VpLXNlbGVjdD5cXG48Zm9ybWlvLWVycm9ycz48L2Zvcm1pby1lcnJvcnM+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcmVzb3VyY2UtbXVsdGlwbGUuaHRtbCcsXG4gICAgICAgICR0ZW1wbGF0ZUNhY2hlLmdldCgnZm9ybWlvL2NvbXBvbmVudHMvcmVzb3VyY2UuaHRtbCcpLnJlcGxhY2UoJzx1aS1zZWxlY3QnLCAnPHVpLXNlbGVjdCBtdWx0aXBsZScpXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmVzbGludCBtYXgtZGVwdGg6IFtcImVycm9yXCIsIDZdKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvU2VsZWN0SXRlbScsIFtcbiAgICAnJGNvbXBpbGUnLFxuICAgIGZ1bmN0aW9uKCRjb21waWxlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgIHRlbXBsYXRlOiAnPScsXG4gICAgICAgICAgaXRlbTogJz0nLFxuICAgICAgICAgIHNlbGVjdDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgaWYgKHNjb3BlLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBlbGVtZW50Lmh0bWwoJGNvbXBpbGUoYW5ndWxhci5lbGVtZW50KHNjb3BlLnRlbXBsYXRlKSkoc2NvcGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICBdKTtcblxuICBhcHAuZGlyZWN0aXZlKCd1aVNlbGVjdFJlcXVpcmVkJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xuICAgICAgICB2YXIgb2xkSXNFbXB0eSA9IG5nTW9kZWwuJGlzRW1wdHk7XG4gICAgICAgIG5nTW9kZWwuJGlzRW1wdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB8fCBvbGRJc0VtcHR5KHZhbHVlKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcblxuICAvLyBBIGRpcmVjdGl2ZSB0byBoYXZlIHVpLXNlbGVjdCBvcGVuIG9uIGZvY3VzXG4gIGFwcC5kaXJlY3RpdmUoJ3VpU2VsZWN0T3Blbk9uRm9jdXMnLCBbJyR0aW1lb3V0JywgZnVuY3Rpb24oJHRpbWVvdXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ3VpU2VsZWN0JyxcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUsIGVsLCBhdHRycywgdWlTZWxlY3QpIHtcbiAgICAgICAgdmFyIGF1dG9vcGVuID0gdHJ1ZTtcblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQodWlTZWxlY3QuZm9jdXNzZXIpLm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChhdXRvb3Blbikge1xuICAgICAgICAgICAgdWlTZWxlY3QuYWN0aXZhdGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERpc2FibGUgdGhlIGF1dG8gb3BlbiB3aGVuIHRoaXMgc2VsZWN0IGVsZW1lbnQgaGFzIGJlZW4gYWN0aXZhdGVkLlxuICAgICAgICAkc2NvcGUuJG9uKCd1aXM6YWN0aXZhdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdXRvb3BlbiA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1lbmFibGUgdGhlIGF1dG8gb3BlbiBhZnRlciB0aGUgc2VsZWN0IGVsZW1lbnQgaGFzIGJlZW4gY2xvc2VkXG4gICAgICAgICRzY29wZS4kb24oJ3VpczpjbG9zZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9vcGVuID0gZmFsc2U7XG4gICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdXRvb3BlbiA9IHRydWU7XG4gICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG4gIC8vIENvbmZpZ3VyZSB0aGUgU2VsZWN0IGNvbXBvbmVudC5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NlbGVjdCcsIHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QnLFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgPyAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0LW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSkge1xuICAgICAgICAgIHZhciBnZXRJdGVtID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc3dpdGNoIChjb21wb25lbnQuZGF0YVNyYykge1xuICAgICAgICAgICAgICBjYXNlICd2YWx1ZXMnOlxuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5kYXRhLnZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnZhbHVlID09PSBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RJdGVtcztcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbihjb21wb25lbnQuZGF0YS5qc29uKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtW2NvbXBvbmVudC52YWx1ZVByb3BlcnR5XSA9PT0gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgIC8vIFRPRE86IGltcGxlbWVudCB1cmwgYW5kIHJlc291cmNlIHZpZXcuXG4gICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlJzpcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGdldEl0ZW0pLnJlZHVjZShmdW5jdGlvbihwcmV2LCBpdGVtKSB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIChwcmV2ID09PSAnJyA/ICcnIDogJywgJykgKyB2YWx1ZTtcbiAgICAgICAgICAgIH0sICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGdldEl0ZW0oZGF0YSk7XG4gICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBbJyRyb290U2NvcGUnLCAnJHNjb3BlJywgJyRodHRwJywgJ0Zvcm1pbycsICckaW50ZXJwb2xhdGUnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc2NvcGUsICRodHRwLCBGb3JtaW8sICRpbnRlcnBvbGF0ZSkge1xuICAgICAgICAgIHZhciBzZXR0aW5ncyA9ICRzY29wZS5jb21wb25lbnQ7XG4gICAgICAgICAgdmFyIG9wdGlvbnMgPSB7Y2FjaGU6IHRydWV9O1xuICAgICAgICAgICRzY29wZS5ub3dyYXAgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5oYXNOZXh0UGFnZSA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSAkc2NvcGUuY29tcG9uZW50LnNlbGVjdFZhbHVlcztcbiAgICAgICAgICB2YXIgdmFsdWVQcm9wID0gJHNjb3BlLmNvbXBvbmVudC52YWx1ZVByb3BlcnR5O1xuICAgICAgICAgICRzY29wZS5nZXRTZWxlY3RJdGVtID0gZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhU3JjID09PSAndmFsdWVzJykge1xuICAgICAgICAgICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWxsb3cgZG90IG5vdGF0aW9uIGluIHRoZSB2YWx1ZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGlmICh2YWx1ZVByb3AuaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICAgICAgICB2YXIgcGFydHMgPSB2YWx1ZVByb3Auc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgdmFyIHByb3AgPSBpdGVtO1xuICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IHByb3BbcGFydHNbaV1dO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVQcm9wID8gaXRlbVt2YWx1ZVByb3BdIDogaXRlbTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZWZhdWx0VmFsdWUgPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zID0gYW5ndWxhci5ub29wO1xuICAgICAgICAgICRzY29wZS4kb24oJ3JlZnJlc2hMaXN0JywgZnVuY3Rpb24oZXZlbnQsIHVybCwgaW5wdXQpIHtcbiAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMoaW5wdXQsIHVybCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBBZGQgYSB3YXRjaCBpZiB0aGV5IHdpc2ggdG8gcmVmcmVzaCBvbiBzZWxlY3Rpb24gb2YgYW5vdGhlciBmaWVsZC5cbiAgICAgICAgICBpZiAoc2V0dGluZ3MucmVmcmVzaE9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhLicgKyBzZXR0aW5ncy5yZWZyZXNoT24sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzd2l0Y2ggKHNldHRpbmdzLmRhdGFTcmMpIHtcbiAgICAgICAgICAgIGNhc2UgJ3ZhbHVlcyc6XG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IHNldHRpbmdzLmRhdGEudmFsdWVzO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IGFuZ3VsYXIuZnJvbUpzb24oc2V0dGluZ3MuZGF0YS5qc29uKTtcblxuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFsbG93IGRvdCBub3RhdGlvbiBpbiB0aGUgc2VsZWN0VmFsdWUgcHJvcGVydHkuXG4gICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmluZGV4T2YoJy4nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gc2VsZWN0VmFsdWVzLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3QgPSAkc2NvcGUuc2VsZWN0SXRlbXM7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcGFydHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxlY3QgPSBzZWxlY3RbcGFydHNbaV1dO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IHNlbGVjdDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSAkc2NvcGUuc2VsZWN0SXRlbXNbc2VsZWN0VmFsdWVzXTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgY2FzZSAncmVzb3VyY2UnOlxuICAgICAgICAgICAgICB2YXIgdXJsID0gJyc7XG4gICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhU3JjID09PSAndXJsJykge1xuICAgICAgICAgICAgICAgIHVybCA9IHNldHRpbmdzLmRhdGEudXJsO1xuICAgICAgICAgICAgICAgIGlmICh1cmwuc3Vic3RyKDAsIDEpID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgIHVybCA9IEZvcm1pby5nZXRCYXNlVXJsKCkgKyBzZXR0aW5ncy5kYXRhLnVybDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIGF1dGggZm9yIG91dGdvaW5nIHJlcXVlc3RzLlxuICAgICAgICAgICAgICAgIGlmICghc2V0dGluZ3MuYXV0aGVudGljYXRlICYmIHVybC5pbmRleE9mKEZvcm1pby5nZXRCYXNlVXJsKCkpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZUpXVDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICBQcmFnbWE6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1cmwgPSBGb3JtaW8uZ2V0QmFzZVVybCgpO1xuICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhLnByb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgIHVybCArPSAnL3Byb2plY3QvJyArIHNldHRpbmdzLmRhdGEucHJvamVjdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdXJsICs9ICcvZm9ybS8nICsgc2V0dGluZ3MuZGF0YS5yZXNvdXJjZSArICcvc3VibWlzc2lvbic7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBsaW1pdDogMTAwLFxuICAgICAgICAgICAgICAgIHNraXA6IDBcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAkc2NvcGUubG9hZE1vcmVJdGVtcyA9IGZ1bmN0aW9uKCRzZWxlY3QsICRldmVudCkge1xuICAgICAgICAgICAgICAgICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcy5za2lwICs9IG9wdGlvbnMucGFyYW1zLmxpbWl0O1xuICAgICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMobnVsbCwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zID0gZnVuY3Rpb24oaW5wdXQsIG5ld1VybCwgYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICBuZXdVcmwgPSBuZXdVcmwgfHwgdXJsO1xuICAgICAgICAgICAgICAgICAgbmV3VXJsID0gJGludGVycG9sYXRlKG5ld1VybCkoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAkc2NvcGUuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWlvQmFzZTogJHJvb3RTY29wZS5hcGlCYXNlIHx8ICdodHRwczovL2FwaS5mb3JtLmlvJ1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICBpZiAoIW5ld1VybCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIC8vIERvIG5vdCB3YW50IHRvIGNhbGwgaWYgaXQgaXMgYWxyZWFkeSBsb2FkaW5nLlxuICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RMb2FkaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHNlYXJjaCwgdGhlbiBhZGQgdGhhdCB0byB0aGUgZmlsdGVyLlxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnNlYXJjaEZpZWxkICYmIGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1VybCArPSAoKG5ld1VybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgK1xuICAgICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzZXR0aW5ncy5zZWFyY2hGaWVsZCkgK1xuICAgICAgICAgICAgICAgICAgICAgICc9JyArXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBvdGhlciBmaWx0ZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWx0ZXIgPSAkaW50ZXJwb2xhdGUoc2V0dGluZ3MuZmlsdGVyKSh7ZGF0YTogJHNjb3BlLmRhdGF9KTtcbiAgICAgICAgICAgICAgICAgICAgbmV3VXJsICs9ICgobmV3VXJsLmluZGV4T2YoJz8nKSA9PT0gLTEpID8gJz8nIDogJyYnKSArIGZpbHRlcjtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhleSB3aXNoIHRvIHJldHVybiBvbmx5IHNvbWUgZmllbGRzLlxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnNlbGVjdEZpZWxkcykge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcy5zZWxlY3QgPSBzZXR0aW5ncy5zZWxlY3RGaWVsZHM7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgIHZhciBzZXRSZXN1bHQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvZXJjZSB0aGUgZGF0YSBpbnRvIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShkYXRhIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA8IG9wdGlvbnMucGFyYW1zLmxpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcGVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9ICRzY29wZS5zZWxlY3RJdGVtcy5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdExvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgJGh0dHAuZ2V0KG5ld1VybCwgb3B0aW9ucykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0VmFsdWUgcHJvcCBpcyBkZWZpbmVkLCB1c2UgaXQuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVzdWx0KF8uZ2V0KGRhdGEsIHNlbGVjdFZhbHVlcywgW10pKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQXR0ZW1wdCB0byBkZWZhdWx0IHRvIHRoZSBmb3JtaW8gc2V0dGluZ3MgZm9yIGEgcmVzb3VyY2UuXG4gICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZGF0YScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRSZXN1bHQoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaXRlbXMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVzdWx0KGRhdGEuaXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIGRhdGEgaXRzZWxmLlxuICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVzdWx0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSlbJ2ZpbmFsbHknXShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdExvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgfVxuICAgICAgICB9XSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3NlbGVjdEZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgdmFsdWVzOiBbXSxcbiAgICAgICAgICAgIGpzb246ICcnLFxuICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgIHJlc291cmNlOiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0YVNyYzogJ3ZhbHVlcycsXG4gICAgICAgICAgdmFsdWVQcm9wZXJ0eTogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICByZWZyZXNoT246ICcnLFxuICAgICAgICAgIGZpbHRlcjogJycsXG4gICAgICAgICAgYXV0aGVudGljYXRlOiBmYWxzZSxcbiAgICAgICAgICB0ZW1wbGF0ZTogJzxzcGFuPnt7IGl0ZW0ubGFiZWwgfX08L3NwYW4+JyxcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCcsXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiICBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGUgfX08L2xhYmVsPlxcbjxzcGFuIG5nLWlmPVxcXCIhY29tcG9uZW50LmxhYmVsICYmIGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG48dWktc2VsZWN0XFxuICB1aS1zZWxlY3QtcmVxdWlyZWRcXG4gIHVpLXNlbGVjdC1vcGVuLW9uLWZvY3VzXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICB0aGVtZT1cXFwiYm9vdHN0cmFwXFxcIlxcbiAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbj5cXG4gIDx1aS1zZWxlY3QtbWF0Y2ggY2xhc3M9XFxcInVpLXNlbGVjdC1tYXRjaFxcXCIgcGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8IGZvcm1pb1RyYW5zbGF0ZSB9fVxcXCI+XFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiJGl0ZW0gfHwgJHNlbGVjdC5zZWxlY3RlZFxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXG4gIDwvdWktc2VsZWN0LW1hdGNoPlxcbiAgPHVpLXNlbGVjdC1jaG9pY2VzIGNsYXNzPVxcXCJ1aS1zZWxlY3QtY2hvaWNlc1xcXCIgcmVwZWF0PVxcXCJnZXRTZWxlY3RJdGVtKGl0ZW0pIGFzIGl0ZW0gaW4gc2VsZWN0SXRlbXMgfCBmaWx0ZXI6ICRzZWxlY3Quc2VhcmNoXFxcIiByZWZyZXNoPVxcXCJyZWZyZXNoSXRlbXMoJHNlbGVjdC5zZWFyY2gpXFxcIiByZWZyZXNoLWRlbGF5PVxcXCIyNTBcXFwiPlxcbiAgICA8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVxcXCJjb21wb25lbnQudGVtcGxhdGVcXFwiIGl0ZW09XFxcIml0ZW1cXFwiIHNlbGVjdD1cXFwiJHNlbGVjdFxcXCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+XFxuICAgIDxidXR0b24gbmctaWY9XFxcImhhc05leHRQYWdlICYmICgkaW5kZXggPT0gJHNlbGVjdC5pdGVtcy5sZW5ndGgtMSlcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXN1Y2Nlc3MgYnRuLWJsb2NrXFxcIiBuZy1jbGljaz1cXFwibG9hZE1vcmVJdGVtcygkc2VsZWN0LCAkZXZlbnQpXFxcIiBuZy1kaXNhYmxlZD1cXFwic2VsZWN0TG9hZGluZ1xcXCI+TG9hZCBtb3JlLi4uPC9idXR0b24+XFxuICA8L3VpLXNlbGVjdC1jaG9pY2VzPlxcbjwvdWktc2VsZWN0Plxcbjxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLy8gQ2hhbmdlIHRoZSB1aS1zZWxlY3QgdG8gdWktc2VsZWN0IG11bHRpcGxlLlxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QtbXVsdGlwbGUuaHRtbCcsXG4gICAgICAgICR0ZW1wbGF0ZUNhY2hlLmdldCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Lmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1NlbGVjdEJveGVzJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNvbXBvbmVudDogJz0nLFxuICAgICAgICBjb21wb25lbnRJZDogJz0nLFxuICAgICAgICByZWFkT25seTogJz0nLFxuICAgICAgICBtb2RlbDogJz1uZ01vZGVsJyxcbiAgICAgICAgZ3JpZFJvdzogJz0nLFxuICAgICAgICBncmlkQ29sOiAnPSdcbiAgICAgIH0sXG4gICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLWRpcmVjdGl2ZS5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSwgZWwsIGF0dHJzLCBuZ01vZGVsKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgbW9kZWxcbiAgICAgICAgdmFyIG1vZGVsID0ge307XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50LnZhbHVlcywgZnVuY3Rpb24odikge1xuICAgICAgICAgIG1vZGVsW3YudmFsdWVdID0gbmdNb2RlbC4kdmlld1ZhbHVlLmhhc093blByb3BlcnR5KHYudmFsdWUpXG4gICAgICAgICAgICA/ICEhbmdNb2RlbC4kdmlld1ZhbHVlW3YudmFsdWVdXG4gICAgICAgICAgICA6IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gRkEtODM1IC0gVXBkYXRlIHRoZSB2aWV3IG1vZGVsIHdpdGggb3VyIGRlZmF1bHRzLlxuICAgICAgICAvLyBGQS05MjEgLSBBdHRlbXB0IHRvIGxvYWQgYSBjdXJyZW50IG1vZGVsLCBpZiBwcmVzZW50IGJlZm9yZSB0aGUgZGVmYXVsdHMuXG4gICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgkc2NvcGUubW9kZWwgfHwgbW9kZWwpO1xuXG4gICAgICAgIG5nTW9kZWwuJHNldFByaXN0aW5lKHRydWUpO1xuICAgICAgICBuZ01vZGVsLiRpc0VtcHR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiAhdmFsdWVba2V5XTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudG9nZ2xlQ2hlY2tib3ggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHZhciBfbW9kZWwgPSBhbmd1bGFyLmNvcHkobmdNb2RlbC4kdmlld1ZhbHVlIHx8IHt9KTtcbiAgICAgICAgICBfbW9kZWxbdmFsdWVdID0gIV9tb2RlbFt2YWx1ZV07XG4gICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKF9tb2RlbCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdzZWxlY3Rib3hlcycsIHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgQm94ZXMnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGlmICghZGF0YSkgcmV0dXJuICcnO1xuXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpXG4gICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XG4gICAgICAgICAgfSlcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudC52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgIGlmIChpdGVtLnZhbHVlID09PSBkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGl0ZW0ubGFiZWw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuam9pbignLCAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3NlbGVjdGJveGVzRmllbGQnLFxuICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLWRpcmVjdGl2ZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJzZWxlY3QtYm94ZXNcXFwiPlxcbiAgPGRpdiBuZy1jbGFzcz1cXFwiY29tcG9uZW50LmlubGluZSA/ICdjaGVja2JveC1pbmxpbmUnIDogJ2NoZWNrYm94J1xcXCIgbmctcmVwZWF0PVxcXCJ2IGluIGNvbXBvbmVudC52YWx1ZXMgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgPGxhYmVsIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19LXt7IHYudmFsdWUgfX1cXFwiPlxcbiAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCJcXG4gICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX0te3sgdi52YWx1ZSB9fVxcXCJcXG4gICAgICAgIHZhbHVlPVxcXCJ7eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgICAgbmctY2xpY2s9XFxcInRvZ2dsZUNoZWNrYm94KHYudmFsdWUpXFxcIlxcbiAgICAgICAgbmctY2hlY2tlZD1cXFwibW9kZWxbdi52YWx1ZV1cXFwiXFxuICAgICAgICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gICAgICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICAgID5cXG4gICAgICB7eyB2LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxuICAgIDwvbGFiZWw+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwic2VsZWN0LWJveGVzXFxcIj5cXG4gIDxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj5cXG4gICAge3sgY29tcG9uZW50LmxhYmVsIH19XFxuICA8L2xhYmVsPlxcbiAgPGZvcm1pby1zZWxlY3QtYm94ZXNcXG4gICAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICAgIG5nLW1vZGVsLW9wdGlvbnM9XFxcInthbGxvd0ludmFsaWQ6IHRydWV9XFxcIlxcbiAgICBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCJcXG4gICAgY29tcG9uZW50LWlkPVxcXCJjb21wb25lbnRJZFxcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCJcXG4gICAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXG4gICAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgPjwvZm9ybWlvLXNlbGVjdC1ib3hlcz5cXG4gIDxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignc2lnbmF0dXJlJywge1xuICAgICAgICB0aXRsZTogJ1NpZ25hdHVyZScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvc2lnbmF0dXJlLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YSA/ICdZZXMnIDogJ05vJztcbiAgICAgICAgfSxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdzaWduYXR1cmUnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBmb290ZXI6ICdTaWduIGFib3ZlJyxcbiAgICAgICAgICB3aWR0aDogJzEwMCUnLFxuICAgICAgICAgIGhlaWdodDogJzE1MCcsXG4gICAgICAgICAgcGVuQ29sb3I6ICdibGFjaycsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAncmdiKDI0NSwyNDUsMjM1KScsXG4gICAgICAgICAgbWluV2lkdGg6ICcwLjUnLFxuICAgICAgICAgIG1heFdpZHRoOiAnMi41JyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L3NpZ25hdHVyZS5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLmRpcmVjdGl2ZSgnc2lnbmF0dXJlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjb21wb25lbnQ6ICc9J1xuICAgICAgfSxcbiAgICAgIHJlcXVpcmU6ICc/bmdNb2RlbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgaWYgKCFuZ01vZGVsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgbGFiZWwgb2YgY29tcG9uZW50IGZvciBlcnJvciBkaXNwbGF5LlxuICAgICAgICBzY29wZS5jb21wb25lbnQubGFiZWwgPSAnU2lnbmF0dXJlJztcbiAgICAgICAgc2NvcGUuY29tcG9uZW50LmhpZGVMYWJlbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgZGltZW5zaW9uIG9mIGEgd2lkdGggb3IgaGVpZ2h0LlxuICAgICAgICB2YXIgc2V0RGltZW5zaW9uID0gZnVuY3Rpb24oZGltKSB7XG4gICAgICAgICAgdmFyIHBhcmFtID0gKGRpbSA9PT0gJ3dpZHRoJykgPyAnY2xpZW50V2lkdGgnIDogJ2NsaWVudEhlaWdodCc7XG4gICAgICAgICAgaWYgKHNjb3BlLmNvbXBvbmVudFtkaW1dLnNsaWNlKC0xKSA9PT0gJyUnKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9IHBhcnNlRmxvYXQoc2NvcGUuY29tcG9uZW50W2RpbV0uc2xpY2UoMCwgLTEpKSAvIDEwMDtcbiAgICAgICAgICAgIGVsZW1lbnRbMF1bZGltXSA9IGVsZW1lbnQucGFyZW50KCkuZXEoMClbMF1bcGFyYW1dICogcGVyY2VudDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50WzBdW2RpbV0gPSBwYXJzZUludChzY29wZS5jb21wb25lbnRbZGltXSwgMTApO1xuICAgICAgICAgICAgc2NvcGUuY29tcG9uZW50W2RpbV0gPSBlbGVtZW50WzBdW2RpbV0gKyAncHgnO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXNldCBzaXplIGlmIGVsZW1lbnQgY2hhbmdlcyB2aXNpYmlsaXR5LlxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5kaXNwbGF5JywgZnVuY3Rpb24obmV3RGlzcGxheSkge1xuICAgICAgICAgIGlmIChuZXdEaXNwbGF5KSB7XG4gICAgICAgICAgICBzZXREaW1lbnNpb24oJ3dpZHRoJyk7XG4gICAgICAgICAgICBzZXREaW1lbnNpb24oJ2hlaWdodCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBjYW52YXMuXG4gICAgICAgIHNldERpbWVuc2lvbignd2lkdGgnKTtcbiAgICAgICAgc2V0RGltZW5zaW9uKCdoZWlnaHQnKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHNpZ25hdHVyZSBwYWQuXG4gICAgICAgIC8qIGdsb2JhbCBTaWduYXR1cmVQYWQ6ZmFsc2UgKi9cbiAgICAgICAgdmFyIHNpZ25hdHVyZVBhZCA9IG5ldyBTaWduYXR1cmVQYWQoZWxlbWVudFswXSwge1xuICAgICAgICAgIG1pbldpZHRoOiBzY29wZS5jb21wb25lbnQubWluV2lkdGgsXG4gICAgICAgICAgbWF4V2lkdGg6IHNjb3BlLmNvbXBvbmVudC5tYXhXaWR0aCxcbiAgICAgICAgICBwZW5Db2xvcjogc2NvcGUuY29tcG9uZW50LnBlbkNvbG9yLFxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogc2NvcGUuY29tcG9uZW50LmJhY2tncm91bmRDb2xvclxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5wZW5Db2xvcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLnBlbkNvbG9yID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnY29tcG9uZW50LmJhY2tncm91bmRDb2xvcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IG5ld1ZhbHVlO1xuICAgICAgICAgIHNpZ25hdHVyZVBhZC5jbGVhcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhciB0aGUgc2lnbmF0dXJlLlxuICAgICAgICBzY29wZS5jb21wb25lbnQuY2xlYXJTaWduYXR1cmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuY2xlYXIoKTtcbiAgICAgICAgICByZWFkU2lnbmF0dXJlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IHNvbWUgQ1NTIHByb3BlcnRpZXMuXG4gICAgICAgIGVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICc0cHgnLFxuICAgICAgICAgICdib3gtc2hhZG93JzogJzAgMCA1cHggcmdiYSgwLCAwLCAwLCAwLjAyKSBpbnNldCcsXG4gICAgICAgICAgJ2JvcmRlcic6ICcxcHggc29saWQgI2Y0ZjRmNCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZFNpZ25hdHVyZSgpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkICYmIHNpZ25hdHVyZVBhZC5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKHNpZ25hdHVyZVBhZC50b0RhdGFVUkwoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmZyb21EYXRhVVJMKG5nTW9kZWwuJHZpZXdWYWx1ZSk7XG4gICAgICAgIH07XG4gICAgICAgIHNpZ25hdHVyZVBhZC5vbkVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMocmVhZFNpZ25hdHVyZSk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICAgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2lnbmF0dXJlLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGRpdiBuZy1pZj1cXFwicmVhZE9ubHlcXFwiPlxcbiAgPGRpdiBuZy1pZj1cXFwiZGF0YVtjb21wb25lbnQua2V5XSA9PT0gJ1lFUydcXFwiPlxcbiAgICBbIFNpZ25hdHVyZSBpcyBoaWRkZW4gXVxcbiAgPC9kaXY+XFxuICA8ZGl2IG5nLWlmPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldICE9PSAnWUVTJ1xcXCI+XFxuICAgIDxpbWcgY2xhc3M9XFxcInNpZ25hdHVyZVxcXCIgbmctYXR0ci1zcmM9XFxcInt7ZGF0YVtjb21wb25lbnQua2V5XX19XFxcIiBzcmM9XFxcIlxcXCIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgc3R5bGU9XFxcIndpZHRoOiB7eyBjb21wb25lbnQud2lkdGggfX07IGhlaWdodDoge3sgY29tcG9uZW50LmhlaWdodCB9fTtcXFwiPlxcbiAgPGEgY2xhc3M9XFxcImJ0biBidG4teHMgYnRuLWRlZmF1bHRcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTsgbGVmdDogMDsgdG9wOiAwOyB6LWluZGV4OiAxMDAwXFxcIiBuZy1jbGljaz1cXFwiY29tcG9uZW50LmNsZWFyU2lnbmF0dXJlKClcXFwiPlxcbiAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoXFxcIj48L3NwYW4+XFxuICA8L2E+XFxuICA8Y2FudmFzIHNpZ25hdHVyZSBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIj48L2NhbnZhcz5cXG4gIDxkaXYgY2xhc3M9XFxcImZvcm1pby1zaWduYXR1cmUtZm9vdGVyXFxcIiBzdHlsZT1cXFwidGV4dC1hbGlnbjogY2VudGVyO2NvbG9yOiNDM0MzQzM7XFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5mb290ZXIgfCBmb3JtaW9UcmFuc2xhdGUgfX08L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKSk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L3NpZ25hdHVyZS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxkaXYgbmctaWY9XFxcImRhdGFbY29tcG9uZW50LmtleV0gPT09ICdZRVMnXFxcIj5cXG4gIFsgU2lnbmF0dXJlIGlzIGhpZGRlbiBdXFxuPC9kaXY+XFxuPGRpdiBuZy1pZj1cXFwiZGF0YVtjb21wb25lbnQua2V5XSAhPT0gJ1lFUydcXFwiPlxcbiAgPGltZyBjbGFzcz1cXFwic2lnbmF0dXJlXFxcIiBuZy1hdHRyLXNyYz1cXFwie3tkYXRhW2NvbXBvbmVudC5rZXldfX1cXFwiIHNyYz1cXFwiXFxcIiAvPlxcbjwvZGl2PlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdzdXJ2ZXknLCB7XG4gICAgICAgIHRpdGxlOiAnU3VydmV5JyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9zdXJ2ZXkuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIHZhciB2aWV3ID0gJzx0YWJsZSBjbGFzcz1cInRhYmxlIHRhYmxlLXN0cmlwZWQgdGFibGUtYm9yZGVyZWRcIj48dGhlYWQ+JztcbiAgICAgICAgICB2YXIgdmFsdWVzID0ge307XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC52YWx1ZXMsIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHZhbHVlc1t2LnZhbHVlXSA9IHYubGFiZWw7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5xdWVzdGlvbnMsIGZ1bmN0aW9uKHF1ZXN0aW9uKSB7XG4gICAgICAgICAgICB2aWV3ICs9ICc8dHI+JztcbiAgICAgICAgICAgIHZpZXcgKz0gJzx0aD4nICsgcXVlc3Rpb24ubGFiZWwgKyAnPC90aD4nO1xuICAgICAgICAgICAgdmlldyArPSAnPHRkPicgKyB2YWx1ZXNbZGF0YVtxdWVzdGlvbi52YWx1ZV1dICsgJzwvdGQ+JztcbiAgICAgICAgICAgIHZpZXcgKz0gJzwvdHI+JztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2aWV3ICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgICByZXR1cm4gdmlldztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3N1cnZleScsXG4gICAgICAgICAgcXVlc3Rpb25zOiBbXSxcbiAgICAgICAgICB2YWx1ZXM6IFtdLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBjdXN0b206ICcnLFxuICAgICAgICAgICAgY3VzdG9tUHJpdmF0ZTogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc3VydmV5Lmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXFxcIj5cXG4gIDx0aGVhZD5cXG4gICAgPHRyPlxcbiAgICAgIDx0ZD48L3RkPlxcbiAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcXFwiIHN0eWxlPVxcXCJ0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj57eyB2LmxhYmVsIH19PC90aD5cXG4gICAgPC90cj5cXG4gIDwvdGhlYWQ+XFxuICA8dHIgbmctcmVwZWF0PVxcXCJxdWVzdGlvbiBpbiBjb21wb25lbnQucXVlc3Rpb25zXFxcIj5cXG4gICAgPHRkPnt7IHF1ZXN0aW9uLmxhYmVsIH19PC90ZD5cXG4gICAgPHRkIG5nLXJlcGVhdD1cXFwidiBpbiBjb21wb25lbnQudmFsdWVzXFxcIiBzdHlsZT1cXFwidGV4dC1hbGlnbjogY2VudGVyO1xcXCI+XFxuICAgICAgPGlucHV0XFxuICAgICAgICB0eXBlPVxcXCJyYWRpb1xcXCJcXG4gICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyBxdWVzdGlvbi52YWx1ZSB9fS17eyB2LnZhbHVlIH19XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyBxdWVzdGlvbi52YWx1ZSB9fS17eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICAgICAgdmFsdWU9XFxcInt7IHYudmFsdWUgfX1cXFwiXFxuICAgICAgICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVtxdWVzdGlvbi52YWx1ZV1cXFwiXFxuICAgICAgICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcbiAgICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgICAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gICAgICA+XFxuICAgIDwvdGQ+XFxuICA8L3RyPlxcbjwvdGFibGU+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0YWJsZScsIHtcbiAgICAgICAgdGl0bGU6ICdUYWJsZScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGFibGUuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgbnVtUm93czogMyxcbiAgICAgICAgICBudW1Db2xzOiAzLFxuICAgICAgICAgIHJvd3M6IFtbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV0sIFt7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119XSwgW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dXSxcbiAgICAgICAgICBoZWFkZXI6IFtdLFxuICAgICAgICAgIGNhcHRpb246ICcnLFxuICAgICAgICAgIHN0cmlwZWQ6IGZhbHNlLFxuICAgICAgICAgIGJvcmRlcmVkOiBmYWxzZSxcbiAgICAgICAgICBob3ZlcjogZmFsc2UsXG4gICAgICAgICAgY29uZGVuc2VkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICB2YXIgdGFibGVDbGFzc2VzID0gXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgXCI7XG4gICAgICB0YWJsZUNsYXNzZXMgKz0gXCIndGFibGUtYm9yZGVyZWQnOiBjb21wb25lbnQuYm9yZGVyZWQsIFwiO1xuICAgICAgdGFibGVDbGFzc2VzICs9IFwiJ3RhYmxlLWhvdmVyJzogY29tcG9uZW50LmhvdmVyLCBcIjtcbiAgICAgIHRhYmxlQ2xhc3NlcyArPSBcIid0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVwiO1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy90YWJsZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1yZXNwb25zaXZlXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8dGFibGUgbmctY2xhc3M9XFxcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCAndGFibGUtYm9yZGVyZWQnOiBjb21wb25lbnQuYm9yZGVyZWQsICd0YWJsZS1ob3Zlcic6IGNvbXBvbmVudC5ob3ZlciwgJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XFxcIiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgICA8dGhlYWQgbmctaWY9XFxcImNvbXBvbmVudC5oZWFkZXIubGVuZ3RoXFxcIj5cXG4gICAgICA8dGggbmctcmVwZWF0PVxcXCJoZWFkZXIgaW4gY29tcG9uZW50LmhlYWRlciB0cmFjayBieSAkaW5kZXhcXFwiPnt7IGhlYWRlciB8IGZvcm1pb1RyYW5zbGF0ZSB9fTwvdGg+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gY29tcG9uZW50LnJvd3MgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiByb3cgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgICAgPGZvcm1pby1jb21wb25lbnRcXG4gICAgICAgICAgICBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb2x1bW4uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgICAgICAgICAgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiXFxuICAgICAgICAgICAgZGF0YT1cXFwiZGF0YVxcXCJcXG4gICAgICAgICAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgICAgICAgICBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCJcXG4gICAgICAgICAgICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gICAgICAgICAgICBncmlkLWNvbD1cXFwiZ3JpZENvbFxcXCJcXG4gICAgICAgICAgICBuZy1pZj1cXFwic2hvd1tjb2x1bW4ua2V5IHx8ICcnXSAmJiBzaG93W2NvbXBvbmVudC5rZXkgfHwgJyddXFxcIlxcbiAgICAgICAgICAgIHNob3c9XFxcInNob3dcXFwiXFxuICAgICAgICAgID48L2Zvcm1pby1jb21wb25lbnQ+XFxuICAgICAgICA8L3RkPlxcbiAgICAgIDwvdHI+XFxuICAgIDwvdGJvZHk+XFxuICA8L3RhYmxlPlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzVmlldy90YWJsZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1yZXNwb25zaXZlXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8dGFibGUgbmctY2xhc3M9XFxcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCAndGFibGUtYm9yZGVyZWQnOiBjb21wb25lbnQuYm9yZGVyZWQsICd0YWJsZS1ob3Zlcic6IGNvbXBvbmVudC5ob3ZlciwgJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XFxcIiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgICA8dGhlYWQgbmctaWY9XFxcImNvbXBvbmVudC5oZWFkZXIubGVuZ3RoXFxcIj5cXG4gICAgICA8dGggbmctcmVwZWF0PVxcXCJoZWFkZXIgaW4gY29tcG9uZW50LmhlYWRlciB0cmFjayBieSAkaW5kZXhcXFwiPnt7IGhlYWRlciB9fTwvdGg+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gY29tcG9uZW50LnJvd3MgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiByb3cgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgICAgPGZvcm1pby1jb21wb25lbnQtdmlldyBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb2x1bW4uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtPVxcXCJmb3JtXFxcIiBpZ25vcmU9XFxcImlnbm9yZVxcXCI+PC9mb3JtaW8tY29tcG9uZW50LXZpZXc+XFxuICAgICAgICA8L3RkPlxcbiAgICAgIDwvdHI+XFxuICAgIDwvdGJvZHk+XFxuICA8L3RhYmxlPlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0YXJlYScsIHtcbiAgICAgICAgdGl0bGU6ICdUZXh0IEFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQud3lzaXd5Zykge1xuICAgICAgICAgICAgJHNjb3BlLnd5c2l3eWcgPSAkc2NvcGUuY29tcG9uZW50Lnd5c2l3eWc7XG4gICAgICAgICAgICByZXR1cm4gJ2Zvcm1pby9jb21wb25lbnRzL3RleHRlZGl0b3IuaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGFyZWEuaHRtbCc7XG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICd0ZXh0YXJlYUZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICBzdWZmaXg6ICcnLFxuICAgICAgICAgIHJvd3M6IDMsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIHd5c2l3eWc6IGZhbHNlLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBtaW5MZW5ndGg6ICcnLFxuICAgICAgICAgICAgbWF4TGVuZ3RoOiAnJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICcnLFxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLFxuICAgICAgICAgICAgICBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy90ZXh0YXJlYS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjx0ZXh0YXJlYVxcbmNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiXFxubmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxubmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbm5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxuc2FmZS1tdWx0aXBsZS10by1zaW5nbGVcXG5pZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxubmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxudGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbnBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGUgfX1cXFwiXFxuY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG5yb3dzPVxcXCJ7eyBjb21wb25lbnQucm93cyB9fVxcXCI+PC90ZXh0YXJlYT5cXG5cIlxuICAgICAgKSk7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRlZGl0b3IuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8dGV4dGFyZWFcXG4gIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxuICBja2VkaXRvcj1cXFwid3lzaXd5Z1xcXCJcXG4gIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiXFxuICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcbiAgcm93cz1cXFwie3sgY29tcG9uZW50LnJvd3MgfX1cXFwiPjwvdGV4dGFyZWE+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3RleHRmaWVsZCcsIHtcbiAgICAgICAgdGl0bGU6ICdUZXh0IEZpZWxkJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIGljb246ICdmYSBmYS10ZXJtaW5hbCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGlucHV0VHlwZTogJ3RleHQnLFxuICAgICAgICAgIGlucHV0TWFzazogJycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3RleHRGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIHByZWZpeDogJycsXG4gICAgICAgICAgc3VmZml4OiAnJyxcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiAnJyxcbiAgICAgICAgICAgIG1heExlbmd0aDogJycsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnJyxcbiAgICAgICAgICAgIGN1c3RvbTogJycsXG4gICAgICAgICAgICBjdXN0b21Qcml2YXRlOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZGl0aW9uYWw6IHtcbiAgICAgICAgICAgIHNob3c6IG51bGwsXG4gICAgICAgICAgICB3aGVuOiBudWxsLFxuICAgICAgICAgICAgZXE6ICcnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuXG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbihcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLFxuICAgICAgRm9ybWlvVXRpbHNcbiAgICApIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxuICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gIG5nLW1vZGVsLW9wdGlvbnM9XFxcInsgZGVib3VuY2U6IDUwMCB9XFxcIlxcbiAgc2FmZS1tdWx0aXBsZS10by1zaW5nbGVcXG4gIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxuICBuZy1taW5sZW5ndGg9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5taW5MZW5ndGhcXFwiXFxuICBuZy1tYXhsZW5ndGg9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5tYXhMZW5ndGhcXFwiXFxuICBuZy1wYXR0ZXJuPVxcXCJjb21wb25lbnQudmFsaWRhdGUucGF0dGVyblxcXCJcXG4gIGN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxuICBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIHwgZm9ybWlvVHJhbnNsYXRlIH19XFxcIlxcbiAgdWktbWFzaz1cXFwie3sgY29tcG9uZW50LmlucHV0TWFzayB9fVxcXCJcXG4gIHVpLW1hc2stcGxhY2Vob2xkZXI9XFxcIlxcXCJcXG4gIHVpLW9wdGlvbnM9XFxcInVpTWFza09wdGlvbnNcXFwiXFxuPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignd2VsbCcsIHtcbiAgICAgICAgdGl0bGU6ICdXZWxsJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy93ZWxsLmh0bWwnLFxuICAgICAgICBncm91cDogJ2xheW91dCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy93ZWxsLmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3dlbGwuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwid2VsbFxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcbiAgPGZvcm1pby1jb21wb25lbnRcXG4gICAgbmctcmVwZWF0PVxcXCJfY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCJcXG4gICAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICAgIGdyaWQtcm93PVxcXCJncmlkUm93XFxcIlxcbiAgICBncmlkLWNvbD1cXFwiZ3JpZENvbFxcXCJcXG4gICAgbmctaWY9XFxcInNob3dbY29tcG9uZW50LmtleSB8fCAnJ10gJiYgc2hvd1tfY29tcG9uZW50LmtleSB8fCAnJ11cXFwiXFxuICAgIHNob3c9XFxcInNob3dcXFwiXFxuICA+PC9mb3JtaW8tY29tcG9uZW50PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvd2VsbC5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJ3ZWxsXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxuICA8Zm9ybWlvLWNvbXBvbmVudC12aWV3IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm09XFxcImZvcm1cXFwiIGlnbm9yZT1cXFwiaWdub3JlXFxcIj48L2Zvcm1pby1jb21wb25lbnQtdmlldz5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlLCBhdHRycywgY3RybCkge1xuICAgICAgaWYgKFxuICAgICAgICAhc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlIHx8XG4gICAgICAgICFzY29wZS5jb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY3RybC4kdmFsaWRhdG9ycy5jdXN0b20gPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgLyplc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xuICAgICAgICB2YXIgaW5wdXQgPSBtb2RlbFZhbHVlIHx8IHZpZXdWYWx1ZTtcbiAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLXVudXNlZC12YXJzICovXG4gICAgICAgIHZhciBjdXN0b20gPSBzY29wZS5jb21wb25lbnQudmFsaWRhdGUuY3VzdG9tO1xuICAgICAgICBjdXN0b20gPSBjdXN0b20ucmVwbGFjZSgvKHt7XFxzKyguKilcXHMrfX0pLywgZnVuY3Rpb24obWF0Y2gsICQxLCAkMikge1xuICAgICAgICAgIHJldHVybiBzY29wZS5kYXRhWyQyXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoganNoaW50IGV2aWw6IHRydWUgKi9cbiAgICAgICAgZXZhbChjdXN0b20pO1xuXG4gICAgICAgIGlmICh2YWxpZCAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHNjb3BlLmNvbXBvbmVudC5jdXN0b21FcnJvciA9IHZhbGlkO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBzY29wZToge1xuICAgICAgc3JjOiAnPT8nLFxuICAgICAgZm9ybUFjdGlvbjogJz0/JyxcbiAgICAgIGZvcm06ICc9PycsXG4gICAgICBzdWJtaXNzaW9uOiAnPT8nLFxuICAgICAgcmVhZE9ubHk6ICc9PycsXG4gICAgICBoaWRlQ29tcG9uZW50czogJz0/JyxcbiAgICAgIHJlcXVpcmVDb21wb25lbnRzOiAnPT8nLFxuICAgICAgZGlzYWJsZUNvbXBvbmVudHM6ICc9PycsXG4gICAgICBmb3JtaW9PcHRpb25zOiAnPT8nLFxuICAgICAgb3B0aW9uczogJz0/J1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGh0dHAnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICAnRm9ybWlvJyxcbiAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkaHR0cCxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgIEZvcm1pb1Njb3BlLFxuICAgICAgICBGb3JtaW8sXG4gICAgICAgIEZvcm1pb1V0aWxzXG4gICAgICApIHtcbiAgICAgICAgJHNjb3BlLl9zcmMgPSAkc2NvcGUuc3JjIHx8ICcnO1xuICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xuICAgICAgICB0aGlzLnNob3dBbGVydHMgPSAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uKGFsZXJ0cykge1xuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgdGhlIGxpdmUgZm9ybSBwYXJhbWV0ZXIgdG8gdGhlIHVybC5cbiAgICAgICAgaWYgKCRzY29wZS5fc3JjICYmICgkc2NvcGUuX3NyYy5pbmRleE9mKCdsaXZlPScpID09PSAtMSkpIHtcbiAgICAgICAgICAkc2NvcGUuX3NyYyArPSAoJHNjb3BlLl9zcmMuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJic7XG4gICAgICAgICAgJHNjb3BlLl9zcmMgKz0gJ2xpdmU9MSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0aGUgZGlzcGxheSBtYXAuXG4gICAgICAgICRzY29wZS5zaG93ID0ge1xuICAgICAgICAgICcnOiB0cnVlLFxuICAgICAgICAgICd1bmRlZmluZWQnOiB0cnVlLFxuICAgICAgICAgICdudWxsJzogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICB2YXIgYm9vbGVhbiA9IHtcbiAgICAgICAgICAndHJ1ZSc6IHRydWUsXG4gICAgICAgICAgJ2ZhbHNlJzogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3dlZXAgdGhlIGN1cnJlbnQgc3VibWlzc2lvbiwgdG8gaWRlbnRpZnkgYW5kIHJlbW92ZSBkYXRhIHRoYXQgaGFzIGJlZW4gY29uZGl0aW9uYWxseSBoaWRkZW4uXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgd2lsbCBpdGVyYXRlIG92ZXIgZXZlcnkga2V5IGluIHRoZSBzdWJtaXNzaW9uIGRhdGEgb2JqLCByZWdhcmRsZXNzIG9mIHRoZSBzdHJ1Y3R1cmUuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgc3dlZXBTdWJtaXNzaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNob3cgPSAkc2NvcGUuc2hvdyB8fCB7XG4gICAgICAgICAgICAgICcnOiB0cnVlLFxuICAgICAgICAgICAgICAndW5kZWZpbmVkJzogdHJ1ZSxcbiAgICAgICAgICAgICAgJ251bGwnOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBzdWJtaXNzaW9uID0gJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSB8fCB7fTtcblxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIFN3ZWVwIHRoZSBnaXZlbiBjb21wb25lbnQga2V5cyBhbmQgcmVtb3ZlIGFueSBkYXRhIGZvciB0aGUgZ2l2ZW4ga2V5cyB3aGljaCBhcmUgYmVpbmcgY29uZGl0aW9uYWxseSBoaWRkZW4uXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50c1xuICAgICAgICAgICAqICAgVGhlIGxpc3Qgb2YgY29tcG9uZW50cyB0byBzd2VlcC5cbiAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IHJldFxuICAgICAgICAgICAqICAgV2hldGhlciBvciBub3QgeW91IHdhbnQgdG8ga25vdyBpZiBhIG1vZGlmaWNhdGlvbiBuZWVkcyB0byBiZSBtYWRlLlxuICAgICAgICAgICAqL1xuICAgICAgICAgIHZhciBzd2VlcCA9IGZ1bmN0aW9uIHN3ZWVwKGNvbXBvbmVudHMsIHJldCkge1xuICAgICAgICAgICAgLy8gU2tpcCBvdXIgdW53YW50ZWQgdHlwZXMuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50cyA9PT0gbnVsbCB8fCB0eXBlb2YgY29tcG9uZW50cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIGdpdmVuIGEgc3RyaW5nLCB0aGVuIHdlIGFyZSBsb29raW5nIGF0IHRoZSBhcGkga2V5IG9mIGEgY29tcG9uZW50LlxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wb25lbnRzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBpZiAoc2hvdy5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnRzKSAmJiBzaG93W2NvbXBvbmVudHNdID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIGdpdmVuIGFuIGFycmF5LCBpdGVyYXRlIG92ZXIgZWFjaCBlbGVtZW50LCBhc3N1bWluZyBpdHMgbm90IGEgc3RyaW5nIGl0c2VsZi5cbiAgICAgICAgICAgIC8vIElmIGVhY2ggZWxlbWVudCBpcyBhIHN0cmluZywgdGhlbiB3ZSBhcmVuJ3QgbG9va2luZyBhdCBhIGNvbXBvbmVudCwgYnV0IGRhdGEgaXRzZWxmLlxuICAgICAgICAgICAgZWxzZSBpZiAoY29tcG9uZW50cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgIHZhciBmaWx0ZXJlZCA9IFtdO1xuXG4gICAgICAgICAgICAgIGNvbXBvbmVudHMuZm9yRWFjaChmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgIGZpbHRlcmVkLnB1c2goY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZWN1cnNlIGludG8gdGhlIGNvbXBvbmVudHMgb2YgdGhpcyBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVkID0gc3dlZXAoY29tcG9uZW50LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVkKSB7XG4gICAgICAgICAgICAgICAgICBmaWx0ZXJlZC5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICBjb21wb25lbnRzID0gZmlsdGVyZWQ7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIGdpdmVuIGFuIG9iamVjdCwgaXRlcmF0ZSB0aGUgcHJvcGVydGllcyBhcyBjb21wb25lbnQga2V5cy5cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBjb21wb25lbnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjb21wb25lbnRzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgaXMgZGVsZXRlZCwgZGVsZXRlIHRoZSB3aG9sZSBvYmouXG4gICAgICAgICAgICAgICAgdmFyIG1vZGlmaWVkS2V5ID0gc3dlZXAoa2V5LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZWRLZXkpIHtcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb25lbnRzW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgYSBjaGlsZCBsZWFmIGlzIG1vZGlmaWVkIChub24ga2V5KSBkZWxldGUgaXRzIHdob2xlIHN1YnRyZWUuXG4gICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50c1trZXldIGluc3RhbmNlb2YgQXJyYXkgfHwgdHlwZW9mIGNvbXBvbmVudHNba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGNvbXBvbmVudCBjYW4gaGF2ZSBzdWItY29tcG9uZW50cywgcmVjdXJzZS5cbiAgICAgICAgICAgICAgICAgICAgc3dlZXAoY29tcG9uZW50c1trZXldKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBzd2VlcChzdWJtaXNzaW9uKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUaGUgbGlzdCBvZiBhbGwgY29uZGl0aW9uYWxzLlxuICAgICAgICB2YXIgX2NvbmRpdGlvbmFscyA9IHt9O1xuXG4gICAgICAgIC8vIFRoZSBsaXN0IG9mIGFsbCBjdXN0b20gY29uZGl0aW9uYWxzLCBzZWdyZWdhdGVkIGJlY2F1c2UgdGhleSBtdXN0IGJlIHJ1biBvbiBldmVyeSBjaGFuZ2UgdG8gZGF0YS5cbiAgICAgICAgdmFyIF9jdXN0b21Db25kaXRpb25hbHMgPSB7fTtcblxuICAgICAgICAvKiogU3dlZXAgYWxsIHRoZSBjb21wb25lbnRzIGFuZCBidWlsZCB0aGUgY29uZGl0aW9uYWxzIG1hcC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciBfc3dlZXBDb25kaXRpb25hbHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9ICRzY29wZS5mb3JtIHx8IHt9O1xuICAgICAgICAgICRzY29wZS5mb3JtLmNvbXBvbmVudHMgPSAkc2NvcGUuZm9ybS5jb21wb25lbnRzIHx8IFtdO1xuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgna2V5JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTaG93IGV2ZXJ5dGhpbmcgYnkgZGVmYXVsdC5cbiAgICAgICAgICAgICRzY29wZS5zaG93W2NvbXBvbmVudC5rZXldID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHZhbGlkL2NvbXBsZXRlIGNvbmRpdGlvbmFsIHNldHRpbmdzLlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBjb21wb25lbnQuY29uZGl0aW9uYWxcbiAgICAgICAgICAgICAgJiYgKGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ICE9PSBudWxsICYmIGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ICE9PSAnJylcbiAgICAgICAgICAgICAgJiYgKGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuICE9PSBudWxsICYmIGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuICE9PSAnJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAvLyBEZWZhdWx0IHRoZSBjb25kaXRpb25hbCB2YWx1ZXMuXG4gICAgICAgICAgICAgIGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ID0gYm9vbGVhbi5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvdylcbiAgICAgICAgICAgICAgICA/IGJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddXG4gICAgICAgICAgICAgICAgOiB0cnVlO1xuICAgICAgICAgICAgICBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEgPSBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEgfHwgJyc7XG5cbiAgICAgICAgICAgICAgLy8gS2V5cyBzaG91bGQgYmUgdW5pcXVlLCBzbyBkb24ndCB3b3JyeSBhYm91dCBjbG9iYmVyaW5nIGFuIGV4aXN0aW5nIGR1cGxpY2F0ZS5cbiAgICAgICAgICAgICAgX2NvbmRpdGlvbmFsc1tjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudC5jb25kaXRpb25hbDtcblxuICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgY29tcG9uZW50cyBkZWZhdWx0IHZhbHVlIGZvciBjb25kaXRpb25hbCBsb2dpYywgaWYgcHJlc2VudC5cbiAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdFZhbHVlJykpIHtcbiAgICAgICAgICAgICAgICBfY29uZGl0aW9uYWxzW2NvbXBvbmVudC5rZXldLmRlZmF1bHRWYWx1ZSA9IGNvbXBvbmVudC5kZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEN1c3RvbSBjb25kaXRpb25hbCBsb2dpYy5cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbXBvbmVudC5jdXN0b21Db25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAvLyBBZGQgdGhpcyBjdXN0b21Db25kaXRpb25hbCB0byB0aGUgY29uZGl0aW9uYWxzIGxpc3QuXG4gICAgICAgICAgICAgIF9jdXN0b21Db25kaXRpb25hbHNbY29tcG9uZW50LmtleV0gPSBjb21wb25lbnQuY3VzdG9tQ29uZGl0aW9uYWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmhpZGVDb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgIGNvbXBvbmVudC5oaWRkZW4gPSAkc2NvcGUuaGlkZUNvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQua2V5KSAhPT0gLTE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCByZXF1aXJlZCBpZiBzcGVjaWZpZWRcbiAgICAgICAgICAgIGlmICgkc2NvcGUucmVxdWlyZUNvbXBvbmVudHMgJiYgY29tcG9uZW50Lmhhc093blByb3BlcnR5KCd2YWxpZGF0ZScpICYmICRzY29wZS5yZXF1aXJlQ29tcG9uZW50cy5pbmRleE9mKGNvbXBvbmVudC5rZXkpICE9PSAtMSkge1xuICAgICAgICAgICAgICBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWQgPSAkc2NvcGUucmVxdWlyZUNvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQua2V5KSAhPT0gLTE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBkaXNhYmxlZCBpZiBzcGVjaWZpZWRcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgY29tcG9uZW50LmRpc2FibGVkID0gJHNjb3BlLmRpc2FibGVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVc2luZyB0aGUgY29uZGl0aW9uYWxzIG1hcCwgaW52b2tlIHRoZSBjb25kaXRpb25hbHMgZm9yIGVhY2ggY29tcG9uZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50S2V5XG4gICAgICAgICAqICAgVGhlIGNvbXBvbmVudCB0byB0b2dnbGUgY29uZGl0aW9uYWwgbG9naWMgZm9yLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIF90b2dnbGVDb25kaXRpb25hbCA9IGZ1bmN0aW9uKGNvbXBvbmVudEtleSwgc3ViRGF0YSkge1xuICAgICAgICAgIGlmIChfY29uZGl0aW9uYWxzLmhhc093blByb3BlcnR5KGNvbXBvbmVudEtleSkpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSwgc3ViRGF0YSk7XG4gICAgICAgICAgICB2YXIgY29uZCA9IF9jb25kaXRpb25hbHNbY29tcG9uZW50S2V5XTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IEZvcm1pb1V0aWxzLmdldFZhbHVlKHtkYXRhOiBkYXRhfSwgY29uZC53aGVuKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgY29uZGl0aW9uYWwgdmFsdWUgaXMgZXF1YWwgdG8gdGhlIHRyaWdnZXIgdmFsdWVcbiAgICAgICAgICAgICAgJHNjb3BlLnNob3dbY29tcG9uZW50S2V5XSA9IHZhbHVlLnRvU3RyaW5nKCkgPT09IGNvbmQuZXEudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgID8gYm9vbGVhbltjb25kLnNob3ddXG4gICAgICAgICAgICAgICAgOiAhYm9vbGVhbltjb25kLnNob3ddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3BlY2lhbCBjaGVjayBmb3IgY2hlY2sgYm94ZXMgY29tcG9uZW50LlxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIC8vIE9ubHkgdXBkYXRlIHRoZSB2aXNpYmlsaXR5IGlzIHByZXNlbnQsIG90aGVyd2lzZSBoaWRlLCBiZWNhdXNlIGl0IHdhcyBkZWxldGVkIGJ5IHRoZSBzdWJtaXNzaW9uIHN3ZWVwLlxuICAgICAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoY29uZC5lcSkpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnRLZXldID0gYm9vbGVhbi5oYXNPd25Qcm9wZXJ0eSh2YWx1ZVtjb25kLmVxXSlcbiAgICAgICAgICAgICAgICAgID8gYm9vbGVhblt2YWx1ZVtjb25kLmVxXV1cbiAgICAgICAgICAgICAgICAgIDogdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnRLZXldID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGFnYWluc3QgdGhlIGNvbXBvbmVudHMgZGVmYXVsdCB2YWx1ZSwgaWYgcHJlc2VudCBhbmQgdGhlIGNvbXBvbmVudHMgaGFzbid0IGJlZW4gaW50ZXJhY3RlZCB3aXRoLlxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyAmJiBjb25kLmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnRLZXldID0gY29uZC5kZWZhdWx0VmFsdWUudG9TdHJpbmcoKSA9PT0gY29uZC5lcS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgPyBib29sZWFuW2NvbmQuc2hvd11cbiAgICAgICAgICAgICAgICA6ICFib29sZWFuW2NvbmQuc2hvd107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyB2YWx1ZSwgd2Ugc3RpbGwgbmVlZCB0byBwcm9jZXNzIGFzIG5vdCBlcXVhbC5cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnRLZXldID0gIWJvb2xlYW5bY29uZC5zaG93XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICRzY29wZS5zaG93Lmhhc093blByb3BlcnR5KGNvbXBvbmVudEtleSkgPyAkc2NvcGUuc2hvd1tjb21wb25lbnRLZXldIDogbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVXNpbmcgdGhlIGN1c3RvbSBjb25kaXRpb25hbHMgbWFwLCBpbnZva2UgdGhlIGNvbmRpdGlvbmFscyBmb3IgZWFjaCBjb21wb25lbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb21wb25lbnRLZXlcbiAgICAgICAgICogICBUaGUgY29tcG9uZW50IHRvIHRvZ2dsZSBjb25kaXRpb25hbCBsb2dpYyBmb3IuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgX3RvZ2dsZUN1c3RvbUNvbmRpdGlvbmFsID0gZnVuY3Rpb24oY29tcG9uZW50S2V5LCBzdWJEYXRhKSB7XG4gICAgICAgICAgaWYgKF9jdXN0b21Db25kaXRpb25hbHMuaGFzT3duUHJvcGVydHkoY29tcG9uZW50S2V5KSkge1xuICAgICAgICAgICAgdmFyIGNvbmQgPSBfY3VzdG9tQ29uZGl0aW9uYWxzW2NvbXBvbmVudEtleV07XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBhIGNoaWxkIGJsb2NrLCBhbmQgZXhwb3NlIHRoZSBzdWJtaXNzaW9uIGRhdGEuXG4gICAgICAgICAgICAgIHZhciBkYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSwgc3ViRGF0YSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcbiAgICAgICAgICAgICAgLy8gRXZhbCB0aGUgY3VzdG9tIGNvbmRpdGlvbmFsIGFuZCB1cGRhdGUgdGhlIHNob3cgdmFsdWUuXG4gICAgICAgICAgICAgIHZhciBzaG93ID0gZXZhbCgnKGZ1bmN0aW9uKCkgeyAnICsgY29uZC50b1N0cmluZygpICsgJzsgcmV0dXJuIHNob3c7IH0pKCknKTtcbiAgICAgICAgICAgICAgLy8gU2hvdyBieSBkZWZhdWx0LCBpZiBhbiBpbnZhbGlkIHR5cGUgaXMgZ2l2ZW4uXG4gICAgICAgICAgICAgICRzY29wZS5zaG93W2NvbXBvbmVudEtleV0gPSBib29sZWFuLmhhc093blByb3BlcnR5KHNob3cudG9TdHJpbmcoKSkgPyBib29sZWFuW3Nob3ddIDogdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICRzY29wZS5zaG93W2NvbXBvbmVudEtleV0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gJHNjb3BlLnNob3cuaGFzT3duUHJvcGVydHkoY29tcG9uZW50S2V5KSA/ICRzY29wZS5zaG93W2NvbXBvbmVudEtleV0gOiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGVja0NvbmRpdGlvbmFsID0gZnVuY3Rpb24oY29tcG9uZW50S2V5LCBzdWJEYXRhKSB7XG4gICAgICAgICAgdmFyIGNvbmRpdGlvbmFsID0gX3RvZ2dsZUNvbmRpdGlvbmFsKGNvbXBvbmVudEtleSwgc3ViRGF0YSk7XG4gICAgICAgICAgdmFyIGN1c3RvbUNvbmRpdGlvbmFsID0gX3RvZ2dsZUN1c3RvbUNvbmRpdGlvbmFsKGNvbXBvbmVudEtleSwgc3ViRGF0YSk7XG4gICAgICAgICAgLy8gY3VzdG9tQ29uZGl0aW9uYWwgd2lsbCBiZSB0cnVlIGlmIGVpdGhlciBhcmUgdHJ1ZSBzaW5jZSB0aGUgdmFsdWUgcGVyc2lzdHMgaW4gJHNjb3BlLnNob3cuXG4gICAgICAgICAgcmV0dXJuIGN1c3RvbUNvbmRpdGlvbmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT24gZXZlcnkgY2hhbmdlIHRvIGRhdGEsIHRyaWdnZXIgdGhlIGNvbmRpdGlvbmFscy5cbiAgICAgICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLnN1Ym1pc3Npb24gJiYgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVxuICAgICAgICAgICAgPyAkc2NvcGUuc3VibWlzc2lvbi5kYXRhXG4gICAgICAgICAgICA6IHt9O1xuICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBUb2dnbGUgZXZlcnkgY29uZGl0aW9uYWwuXG4gICAgICAgICAgdmFyIGFsbENvbmRpdGlvbmFscyA9IE9iamVjdC5rZXlzKF9jb25kaXRpb25hbHMpO1xuICAgICAgICAgIChhbGxDb25kaXRpb25hbHMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50S2V5KSB7XG4gICAgICAgICAgICBfdG9nZ2xlQ29uZGl0aW9uYWwoY29tcG9uZW50S2V5KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBhbGxDdXN0b21Db25kaXRpb25hbHMgPSBPYmplY3Qua2V5cyhfY3VzdG9tQ29uZGl0aW9uYWxzKTtcbiAgICAgICAgICAoYWxsQ3VzdG9tQ29uZGl0aW9uYWxzIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbXBvbmVudEtleSkge1xuICAgICAgICAgICAgX3RvZ2dsZUN1c3RvbUNvbmRpdGlvbmFsKGNvbXBvbmVudEtleSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgYWxsSGlkZGVuID0gT2JqZWN0LmtleXMoJHNjb3BlLnNob3cpO1xuICAgICAgICAgIChhbGxIaWRkZW4gfHwgW10pLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50S2V5KSB7XG4gICAgICAgICAgICAvLyBJZiBhIGNvbXBvbmVudCBpcyBoaWRkZW4sIGRlbGV0ZSBpdHMgdmFsdWUsIHNvIG90aGVyIGNvbmRpdGlvbmFscyBhcmUgcHJvcGVydHkgY2hhaW4gcmVhY3RlZC5cbiAgICAgICAgICAgIGlmICghJHNjb3BlLnNob3dbY29tcG9uZW50S2V5XSkge1xuICAgICAgICAgICAgICByZXR1cm4gc3dlZXBTdWJtaXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHZhciBjYW5jZWxGb3JtTG9hZEV2ZW50ID0gJHNjb3BlLiRvbignZm9ybUxvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfc3dlZXBDb25kaXRpb25hbHMoKTtcbiAgICAgICAgICBjYW5jZWxGb3JtTG9hZEV2ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkc2NvcGUub3B0aW9ucyAmJiAkc2NvcGUub3B0aW9ucy53YXRjaERhdGEpIHtcbiAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdzdWJtaXNzaW9uLmRhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF9zd2VlcENvbmRpdGlvbmFscygpO1xuICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEkc2NvcGUuX3NyYykge1xuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3NyYycsIGZ1bmN0aW9uKHNyYykge1xuICAgICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLl9zcmMgPSBzcmM7XG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xuICAgICAgICAgICAgICBmb3JtOiB0cnVlLFxuICAgICAgICAgICAgICBzdWJtaXNzaW9uOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZm9ybWlvIG9iamVjdC5cbiAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcbiAgICAgICAgICBmb3JtOiB0cnVlLFxuICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrRXJyb3JzID0gZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgIGlmIChmb3JtLnN1Ym1pdHRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3JtLiRwcmlzdGluZSA9IGZhbHNlO1xuICAgICAgICAgIGZvciAodmFyIGtleSBpbiBmb3JtKSB7XG4gICAgICAgICAgICBpZiAoZm9ybVtrZXldICYmIGZvcm1ba2V5XS5oYXNPd25Qcm9wZXJ0eSgnJHByaXN0aW5lJykpIHtcbiAgICAgICAgICAgICAgZm9ybVtrZXldLiRwcmlzdGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gIWZvcm0uJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENhbGxlZCB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZC5cbiAgICAgICAgJHNjb3BlLm9uU3VibWl0ID0gZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcbiAgICAgICAgICBpZiAoJHNjb3BlLmNoZWNrRXJyb3JzKGZvcm0pKSB7XG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzLnB1c2goe1xuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBmaXggdGhlIGZvbGxvd2luZyBlcnJvcnMgYmVmb3JlIHN1Ym1pdHRpbmcuJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9ybS5zdWJtaXR0aW5nID0gdHJ1ZTtcblxuICAgICAgICAgIHN3ZWVwU3VibWlzc2lvbigpO1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIGEgc2FuaXRpemVkIHN1Ym1pc3Npb24gb2JqZWN0LlxuICAgICAgICAgIHZhciBzdWJtaXNzaW9uRGF0YSA9IHtkYXRhOiB7fX07XG4gICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uLl9pZCkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuX2lkID0gJHNjb3BlLnN1Ym1pc3Npb24uX2lkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uZGF0YS5faWQpIHtcbiAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLl9pZCA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGEuX2lkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBncmFiSWRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIShpbnB1dCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICBpbnB1dCA9IFtpbnB1dF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaW5hbCA9IFtdO1xuICAgICAgICAgICAgaW5wdXQuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGlmIChlbGVtZW50ICYmIGVsZW1lbnQuX2lkKSB7XG4gICAgICAgICAgICAgICAgZmluYWwucHVzaChlbGVtZW50Ll9pZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZmluYWw7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBkZWZhdWx0UGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgICBGb3JtaW9VdGlscy5lYWNoQ29tcG9uZW50KCRzY29wZS5mb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAncmVzb3VyY2UnICYmIGNvbXBvbmVudC5rZXkgJiYgY29tcG9uZW50LmRlZmF1bHRQZXJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgIGRlZmF1bHRQZXJtaXNzaW9uc1tjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5rZXkpICYmICRzY29wZS5zaG93W2NvbXBvbmVudC5rZXldID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5kYXRhW2NvbXBvbmVudC5rZXldID0gdmFsdWUgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtjb21wb25lbnQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICF2YWx1ZS5oYXNPd25Qcm9wZXJ0eSgnX2lkJykpIHtcbiAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldHVwIHRoZSBzdWJtaXNzaW9uIGFjY2Vzcy5cbiAgICAgICAgICAgIHZhciBwZXJtID0gZGVmYXVsdFBlcm1pc3Npb25zW2tleV07XG4gICAgICAgICAgICBpZiAocGVybSkge1xuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgPSBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgfHwgW107XG5cbiAgICAgICAgICAgICAgLy8gQ29lcmNlIHZhbHVlIGludG8gYW4gYXJyYXkgZm9yIHBsdWNraW5nLlxuICAgICAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFRyeSB0byBmaW5kIGFuZCB1cGRhdGUgYW4gZXhpc3RpbmcgcGVybWlzc2lvbi5cbiAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5mb3JFYWNoKGZ1bmN0aW9uKHBlcm1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAocGVybWlzc2lvbi50eXBlID09PSBwZXJtKSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcyA9IHBlcm1pc3Npb24ucmVzb3VyY2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbi5yZXNvdXJjZXMuY29uY2F0KGdyYWJJZHModmFsdWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIC8vIEFkZCBhIHBlcm1pc3Npb24sIGJlY2F1c2Ugb25lIHdhcyBub3QgZm91bmQuXG4gICAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBwZXJtLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBncmFiSWRzKHZhbHVlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBTaG93IHRoZSBzdWJtaXQgbWVzc2FnZSBhbmQgc2F5IHRoZSBmb3JtIGlzIG5vIGxvbmdlciBzdWJtaXR0aW5nLlxuICAgICAgICAgIHZhciBvblN1Ym1pdCA9IGZ1bmN0aW9uKHN1Ym1pc3Npb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiBhIHN1Ym1pc3Npb24gaGFzIGJlZW4gbWFkZS5cbiAgICAgICAgICB2YXIgb25TdWJtaXREb25lID0gZnVuY3Rpb24obWV0aG9kLCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICcnO1xuICAgICAgICAgICAgaWYgKCRzY29wZS5vcHRpb25zICYmICRzY29wZS5vcHRpb25zLnN1Ym1pdE1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9ICRzY29wZS5vcHRpb25zLnN1Ym1pdE1lc3NhZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9ICdTdWJtaXNzaW9uIHdhcyAnICsgKChtZXRob2QgPT09ICdwdXQnKSA/ICd1cGRhdGVkJyA6ICdjcmVhdGVkJykgKyAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvblN1Ym1pdChzdWJtaXNzaW9uLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIGZvcm0gc3VibWlzc2lvbi5cbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pc3Npb24nLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gQWxsb3cgdGhlIGZvcm0gdG8gYmUgY29tcGxldGVkIGV4dGVybmFsbHkuXG4gICAgICAgICAgJHNjb3BlLiRvbignc3VibWl0RG9uZScsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICBvblN1Ym1pdChzdWJtaXNzaW9uLCBtZXNzYWdlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIEFsbG93IGFuIGVycm9yIHRvIGJlIHRocm93biBleHRlcm5hbGx5LlxuICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pdEVycm9yJywgZnVuY3Rpb24oZXZlbnQsIGVycm9yKSB7XG4gICAgICAgICAgICBGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKGVycm9yKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBzdWJtaXRFdmVudCA9ICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pdCcsIHN1Ym1pc3Npb25EYXRhKTtcbiAgICAgICAgICBpZiAoc3VibWl0RXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgLy8gTGlzdGVuZXIgd2FudHMgdG8gY2FuY2VsIHRoZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0byBtYWtlIGEgY29weSBvZiB0aGUgc3VibWlzc2lvbiBkYXRhIHRvIHJlbW92ZSBiYWQgY2hhcmFjdGVycy5cbiAgICAgICAgICBzdWJtaXNzaW9uRGF0YSA9IGFuZ3VsYXIuY29weShzdWJtaXNzaW9uRGF0YSk7XG5cbiAgICAgICAgICAvLyBBbGxvdyBjdXN0b20gYWN0aW9uIHVybHMuXG4gICAgICAgICAgaWYgKCRzY29wZS5hY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBzdWJtaXNzaW9uRGF0YS5faWQgPyAncHV0JyA6ICdwb3N0JztcbiAgICAgICAgICAgICRodHRwW21ldGhvZF0oJHNjb3BlLmFjdGlvbiwgc3VibWlzc2lvbkRhdGEpLnN1Y2Nlc3MoZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICBGb3JtaW8uY2xlYXJDYWNoZSgpO1xuICAgICAgICAgICAgICBvblN1Ym1pdERvbmUobWV0aG9kLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgIH0pLmVycm9yKEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpXG4gICAgICAgICAgICAgIC5maW5hbGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGV5IHdpc2ggdG8gc3VibWl0IHRvIHRoZSBkZWZhdWx0IGxvY2F0aW9uLlxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5mb3JtaW8pIHtcbiAgICAgICAgICAgIC8vIGNvcHkgdG8gcmVtb3ZlIGFuZ3VsYXIgJCRoYXNoS2V5XG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvLnNhdmVTdWJtaXNzaW9uKHN1Ym1pc3Npb25EYXRhLCAkc2NvcGUuZm9ybWlvT3B0aW9ucykudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgIG9uU3VibWl0RG9uZShzdWJtaXNzaW9uLm1ldGhvZCwgc3VibWlzc2lvbik7XG4gICAgICAgICAgICB9LCBGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKS5maW5hbGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pc3Npb24nLCBzdWJtaXNzaW9uRGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIF0sXG4gICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8uaHRtbCdcbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnRm9ybWlvJyxcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxuICBmdW5jdGlvbihcbiAgICBGb3JtaW8sXG4gICAgZm9ybWlvQ29tcG9uZW50c1xuICApIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15mb3JtaW8nLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY29tcG9uZW50OiAnPScsXG4gICAgICAgIGRhdGE6ICc9JyxcbiAgICAgICAgZm9ybWlvOiAnPScsXG4gICAgICAgIGZvcm1pb0Zvcm06ICc9JyxcbiAgICAgICAgcmVhZE9ubHk6ICc9JyxcbiAgICAgICAgZ3JpZFJvdzogJz0nLFxuICAgICAgICBncmlkQ29sOiAnPScsXG4gICAgICAgIHNob3c6ICc9J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudC5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0cnMsIGZvcm1pb0N0cmwpIHtcbiAgICAgICAgaWYgKGZvcm1pb0N0cmwpIHtcbiAgICAgICAgICBzY29wZS5zaG93QWxlcnRzID0gZm9ybWlvQ3RybC5zaG93QWxlcnRzLmJpbmQoZm9ybWlvQ3RybCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgY2FsbCAkc2NvcGUuc2hvd0FsZXJ0cyB1bmxlc3MgdGhpcyBjb21wb25lbnQgaXMgaW5zaWRlIGEgZm9ybWlvIGRpcmVjdGl2ZS4nKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgJyRodHRwJyxcbiAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICRodHRwLFxuICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICkge1xuICAgICAgICAgIC8vIE9wdGlvbnMgdG8gbWF0Y2gganF1ZXJ5Lm1hc2tlZGlucHV0IG1hc2tzXG4gICAgICAgICAgJHNjb3BlLnVpTWFza09wdGlvbnMgPSB7XG4gICAgICAgICAgICBtYXNrRGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgJzknOiAvXFxkLyxcbiAgICAgICAgICAgICAgJ2EnOiAvW2EtekEtWl0vLFxuICAgICAgICAgICAgICAnKic6IC9bYS16QS1aMC05XS9cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhck9uQmx1cjogZmFsc2UsXG4gICAgICAgICAgICBldmVudHNUb0hhbmRsZTogWydpbnB1dCcsICdrZXl1cCcsICdjbGljaycsICdmb2N1cyddLFxuICAgICAgICAgICAgc2lsZW50RXZlbnRzOiBbJ2NsaWNrJywgJ2ZvY3VzJ11cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gUGFzcyB0aHJvdWdoIGNoZWNrQ29uZGl0aW9uYWwgc2luY2UgdGhpcyBpcyBhbiBpc29sYXRlIHNjb3BlLlxuICAgICAgICAgICRzY29wZS5jaGVja0NvbmRpdGlvbmFsID0gJHNjb3BlLiRwYXJlbnQuY2hlY2tDb25kaXRpb25hbDtcblxuICAgICAgICAgIC8vIEdldCB0aGUgc2V0dGluZ3MuXG4gICAgICAgICAgdmFyIGNvbXBvbmVudCA9IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1skc2NvcGUuY29tcG9uZW50LnR5cGVdIHx8IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1snY3VzdG9tJ107XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBkZWZhdWx0cyBmcm9tIHRoZSBjb21wb25lbnQgc2V0dGluZ3MuXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5zZXR0aW5ncywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFtrZXldID0gYW5ndWxhci5jb3B5KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIEFkZCBhIG5ldyBmaWVsZCB2YWx1ZS5cbiAgICAgICAgICAkc2NvcGUuYWRkRmllbGRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLmNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdFZhbHVlJykgPyAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZSA6ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBSZW1vdmUgYSBmaWVsZCB2YWx1ZS5cbiAgICAgICAgICAkc2NvcGUucmVtb3ZlRmllbGRWYWx1ZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSB0ZW1wbGF0ZSBmb3IgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudC50ZW1wbGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgJHNjb3BlLnRlbXBsYXRlID0gY29tcG9uZW50LnRlbXBsYXRlKCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnRlbXBsYXRlID0gY29tcG9uZW50LnRlbXBsYXRlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEFsbG93IGNvbXBvbmVudCBrZXlzIHRvIGxvb2sgbGlrZSBcInNldHRpbmdzW3VzZXJuYW1lXVwiXG4gICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQua2V5ICYmICRzY29wZS5jb21wb25lbnQua2V5LmluZGV4T2YoJ1snKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gJHNjb3BlLmNvbXBvbmVudC5rZXkubWF0Y2goLyhbXlxcW10rKVxcWyhbXl0rKVxcXS8pO1xuICAgICAgICAgICAgaWYgKChtYXRjaGVzLmxlbmd0aCA9PT0gMykgJiYgJHNjb3BlLmRhdGEuaGFzT3duUHJvcGVydHkobWF0Y2hlc1sxXSkpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGEgPSAkc2NvcGUuZGF0YVttYXRjaGVzWzFdXTtcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC5rZXkgPSBtYXRjaGVzWzJdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIGEgY29udHJvbGxlci5cbiAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIC8vIE1haW50YWluIHJldmVyc2UgY29tcGF0aWJpbGl0eSBieSBleGVjdXRpbmcgdGhlIG9sZCBtZXRob2Qgc3R5bGUuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudC5jb250cm9sbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGNvbXBvbmVudC5jb250cm9sbGVyKCRzY29wZS5jb21wb25lbnQsICRzY29wZSwgJGh0dHAsIEZvcm1pbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29tcG9uZW50LmNvbnRyb2xsZXIsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5tdWx0aXBsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gRXN0YWJsaXNoIGEgZGVmYXVsdCBmb3IgZGF0YS5cbiAgICAgICAgICAgICRzY29wZS5kYXRhID0gJHNjb3BlLmRhdGEgfHwge307XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmRhdGEuaGFzT3duUHJvcGVydHkoJHNjb3BlLmNvbXBvbmVudC5rZXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgYSB2YWx1ZSBpcyBwcmVzZW50LCBhbmQgaXRzIGFuIGFycmF5LCBhc3NpZ24gaXQgdG8gdGhlIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgdmFsdWUgPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIGEgdmFsdWUgaXMgcHJlc2VudCBhbmQgaXQgaXMgbm90IGFuIGFycmF5LCB3cmFwIHRoZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlID0gWyRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5jb21wb25lbnQuaGFzT3duUHJvcGVydHkoJ2RlZmF1bHRWYWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIGFuZCBpdCBpcyBhbiBhcnJheSwgYXNzaWduIGl0IHRvIHRoZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgdmFsdWUgPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIGFuZCBpdCBpcyBub3QgYW4gYXJyYXksIHdyYXAgdGhlIHZhbHVlLlxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdmFsdWUgPSBbJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb3VsZG4ndCBzYWZlbHkgZGVmYXVsdCwgbWFrZSBpdCBhIHNpbXBsZSBhcnJheS4gUG9zc2libHkgYWRkIGEgc2luZ2xlIG9iaiBvciBzdHJpbmcgbGF0ZXIuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgY3VycmVudCBkYXRhIG9yIGRlZmF1bHQuXG4gICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgY3VycmVudCBkYXRhIG9yIGRlZmF1bHQuXG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eSgkc2NvcGUuY29tcG9uZW50LmtleSkpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gRkEtODM1IC0gVGhlIGRlZmF1bHQgdmFsdWVzIGZvciBzZWxlY3QgYm94ZXMgYXJlIHNldCBpbiB0aGUgY29tcG9uZW50LlxuICAgICAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSAmJiAkc2NvcGUuY29tcG9uZW50LnR5cGUgIT09ICdzZWxlY3Rib3hlcycpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSBjb21wb25lbnQgbmFtZS5cbiAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgPSAkc2NvcGUuY29tcG9uZW50LmtleTtcbiAgICAgICAgICBpZiAoJHNjb3BlLmdyaWRSb3cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudElkICs9ICgnLScgKyAkc2NvcGUuZ3JpZFJvdyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuZ3JpZENvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgKz0gKCctJyArICRzY29wZS5ncmlkQ29sKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxuICBmdW5jdGlvbihcbiAgICBmb3JtaW9Db21wb25lbnRzXG4gICkge1xuICAgIHJldHVybiB7XG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNvbXBvbmVudDogJz0nLFxuICAgICAgICBkYXRhOiAnPScsXG4gICAgICAgIGZvcm06ICc9JyxcbiAgICAgICAgaWdub3JlOiAnPT8nXG4gICAgICB9LFxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50LXZpZXcuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICckc2NvcGUnLFxuICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgIEZvcm1pb1xuICAgICAgICApIHtcbiAgICAgICAgICAvLyBTZXQgdGhlIGZvcm0gdXJsLlxuICAgICAgICAgICRzY29wZS5mb3JtVXJsID0gJHNjb3BlLmZvcm0gPyBGb3JtaW8uZ2V0QXBwVXJsKCkgKyAnL2Zvcm0vJyArICRzY29wZS5mb3JtLl9pZC50b1N0cmluZygpIDogJyc7XG5cbiAgICAgICAgICAvLyBHZXQgdGhlIHNldHRpbmdzLlxuICAgICAgICAgIHZhciBjb21wb25lbnQgPSBmb3JtaW9Db21wb25lbnRzLmNvbXBvbmVudHNbJHNjb3BlLmNvbXBvbmVudC50eXBlXSB8fCBmb3JtaW9Db21wb25lbnRzLmNvbXBvbmVudHNbJ2N1c3RvbSddO1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSB0ZW1wbGF0ZSBmb3IgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgICBpZiAoIWNvbXBvbmVudC52aWV3VGVtcGxhdGUpIHtcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9ICdmb3JtaW8vZWxlbWVudC12aWV3Lmh0bWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgY29tcG9uZW50LnZpZXdUZW1wbGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgJHNjb3BlLnRlbXBsYXRlID0gY29tcG9uZW50LnZpZXdUZW1wbGF0ZSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC52aWV3VGVtcGxhdGU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2V0IHRoZSBjb21wb25lbnQgbmFtZS5cbiAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgPSAkc2NvcGUuY29tcG9uZW50LmtleTtcbiAgICAgICAgICBpZiAoJHNjb3BlLmdyaWRSb3cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudElkICs9ICgnLScgKyAkc2NvcGUuZ3JpZFJvdyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuZ3JpZENvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgKz0gKCctJyArICRzY29wZS5ncmlkQ29sKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTZWUgaWYgd2Ugc2hvdWxkIHNob3cgdGhpcyBjb21wb25lbnQuXG4gICAgICAgICAgJHNjb3BlLnNob3VsZFNob3cgPSAhJHNjb3BlLmlnbm9yZSB8fCAoJHNjb3BlLmlnbm9yZS5pbmRleE9mKCRzY29wZS5jb21wb25lbnRJZCkgPT09IC0xKTtcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHNjb3BlOiB7XG4gICAgICBmb3JtOiAnPT8nLFxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXG4gICAgICByZXNvdXJjZU5hbWU6ICc9PycsXG4gICAgICBtZXNzYWdlOiAnPT8nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1kZWxldGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGVsZW1lbnQnLFxuICAgICAgJ0Zvcm1pb1Njb3BlJyxcbiAgICAgICdGb3JtaW8nLFxuICAgICAgJyRodHRwJyxcbiAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRlbGVtZW50LFxuICAgICAgICBGb3JtaW9TY29wZSxcbiAgICAgICAgRm9ybWlvLFxuICAgICAgICAkaHR0cFxuICAgICAgKSB7XG4gICAgICAgICRzY29wZS5fc3JjID0gJHNjb3BlLnNyYyB8fCAnJztcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcbiAgICAgICAgJHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbihhbGVydHMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXNvdXJjZU5hbWUgPSAncmVzb3VyY2UnO1xuICAgICAgICB2YXIgbWV0aG9kTmFtZSA9ICcnO1xuICAgICAgICB2YXIgbG9hZGVyID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xuICAgICAgICAgIGZvcm06IHRydWUsXG4gICAgICAgICAgc3VibWlzc2lvbjogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobG9hZGVyKSB7XG4gICAgICAgICAgcmVzb3VyY2VOYW1lID0gbG9hZGVyLnN1Ym1pc3Npb25JZCA/ICdzdWJtaXNzaW9uJyA6ICdmb3JtJztcbiAgICAgICAgICB2YXIgcmVzb3VyY2VUaXRsZSA9IHJlc291cmNlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICBtZXRob2ROYW1lID0gJ2RlbGV0ZScgKyByZXNvdXJjZVRpdGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSByZXNvdXJjZSBuYW1lXG4gICAgICAgICRzY29wZS5fcmVzb3VyY2VOYW1lID0gJHNjb3BlLnJlc291cmNlTmFtZSB8fCByZXNvdXJjZU5hbWU7XG4gICAgICAgICRzY29wZS5kZWxldGVNZXNzYWdlID0gJHNjb3BlLm1lc3NhZ2UgfHwgJ0FyZSB5b3Ugc3VyZSB5b3Ugd2lzaCB0byBkZWxldGUgdGhlICcgKyAkc2NvcGUuX3Jlc291cmNlTmFtZSArICc/JztcblxuICAgICAgICAvLyBDcmVhdGUgZGVsZXRlIGNhcGFiaWxpdHkuXG4gICAgICAgICRzY29wZS5vbkRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIFJlYnVpbGQgcmVzb3VyY2VUaXRsZSwgJHNjb3BlLnJlc291cmNlTmFtZSBjb3VsZCBoYXZlIGNoYW5nZWRcbiAgICAgICAgICB2YXIgcmVzb3VyY2VOYW1lID0gJHNjb3BlLnJlc291cmNlTmFtZSB8fCAkc2NvcGUuX3Jlc291cmNlTmFtZTtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VUaXRsZSA9IHJlc291cmNlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgZGVsZXRlIGlzIGRvbmUuXG4gICAgICAgICAgdmFyIG9uRGVsZXRlRG9uZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiByZXNvdXJjZVRpdGxlICsgJyB3YXMgZGVsZXRlZC4nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2RlbGV0ZScsIGRhdGEpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoJHNjb3BlLmFjdGlvbikge1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKCRzY29wZS5hY3Rpb24pLnN1Y2Nlc3Mob25EZWxldGVEb25lKS5lcnJvcihGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAobG9hZGVyKSB7XG4gICAgICAgICAgICBpZiAoIW1ldGhvZE5hbWUpIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9hZGVyW21ldGhvZE5hbWVdICE9PSAnZnVuY3Rpb24nKSByZXR1cm47XG4gICAgICAgICAgICBsb2FkZXJbbWV0aG9kTmFtZV0oKS50aGVuKG9uRGVsZXRlRG9uZSwgRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUub25DYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2NhbmNlbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIF1cbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJGNvbXBpbGUnLFxuICAnJHRlbXBsYXRlQ2FjaGUnLFxuICBmdW5jdGlvbihcbiAgICAkY29tcGlsZSxcbiAgICAkdGVtcGxhdGVDYWNoZVxuICApIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aCgkY29tcGlsZSgkdGVtcGxhdGVDYWNoZS5nZXQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xuICAgICAgICBzY29wZS4kZW1pdCgnZm9ybUVsZW1lbnRSZW5kZXInLCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiBmYWxzZSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2Vycm9ycy5odG1sJ1xuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgc2NvcGU6IHtcbiAgICAgIGZvcm06ICc9JyxcbiAgICAgIHN1Ym1pc3Npb246ICc9JyxcbiAgICAgIGlnbm9yZTogJz0/J1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vc3VibWlzc2lvbi5odG1sJ1xuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgc2NvcGU6IHtcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm06ICc9PycsXG4gICAgICBzdWJtaXNzaW9uczogJz0/JyxcbiAgICAgIHBlclBhZ2U6ICc9PydcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL3N1Ym1pc3Npb25zLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICckc2NvcGUnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkZWxlbWVudCxcbiAgICAgICAgRm9ybWlvU2NvcGVcbiAgICAgICkge1xuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XG4gICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcbiAgICAgICAgLy8gU2hvd3MgdGhlIGdpdmVuIGFsZXJ0cyAoc2luZ2xlIG9yIGFycmF5KSwgYW5kIGRpc21pc3NlcyBvbGQgYWxlcnRzXG4gICAgICAgIHRoaXMuc2hvd0FsZXJ0cyA9ICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdLmNvbmNhdChhbGVydHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5wZXJQYWdlID0gJHNjb3BlLnBlclBhZ2UgPT09IHVuZGVmaW5lZCA/IDEwIDogJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICRzY29wZS5mb3JtaW8gPSBGb3JtaW9TY29wZS5yZWdpc3Rlcigkc2NvcGUsICRlbGVtZW50LCB7XG4gICAgICAgICAgZm9ybTogdHJ1ZSxcbiAgICAgICAgICBzdWJtaXNzaW9uczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSAxO1xuICAgICAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlKSB7XG4gICAgICAgICAgJHNjb3BlLnNraXAgPSAocGFnZSAtIDEpICogJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnRhYmxlVmlldyA9IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgIHJldHVybiAhY29tcG9uZW50Lmhhc093blByb3BlcnR5KCd0YWJsZVZpZXcnKSB8fCBjb21wb25lbnQudGFibGVWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3N1Ym1pc3Npb25zJywgZnVuY3Rpb24oc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICBpZiAoc3VibWlzc2lvbnMgJiYgc3VibWlzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsICRzY29wZS5zdWJtaXNzaW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICBdXG4gIH07XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby13aXphcmQuaHRtbCcsXG4gICAgc2NvcGU6IHtcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXG4gICAgICBmb3JtOiAnPT8nLFxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcbiAgICAgIHJlYWRPbmx5OiAnPT8nLFxuICAgICAgaGlkZUNvbXBvbmVudHM6ICc9PycsXG4gICAgICBmb3JtaW9PcHRpb25zOiAnPT8nLFxuICAgICAgc3RvcmFnZTogJz0/J1xuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIC8vIEZyb20gaHR0cHM6Ly9zaW9uZ3VpLmdpdGh1Yi5pby8yMDEzLzA1LzEyL2FuZ3VsYXJqcy1nZXQtZWxlbWVudC1vZmZzZXQtcG9zaXRpb24vXG4gICAgICB2YXIgb2Zmc2V0ID0gZnVuY3Rpb24oZWxtKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIGVsbS5vZmZzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIERvIG5vdGhpbmcuLi5cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmF3RG9tID0gZWxtWzBdO1xuICAgICAgICB2YXIgX3ggPSAwO1xuICAgICAgICB2YXIgX3kgPSAwO1xuICAgICAgICB2YXIgYm9keSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fCBkb2N1bWVudC5ib2R5O1xuICAgICAgICB2YXIgc2Nyb2xsWCA9IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBib2R5LnNjcm9sbExlZnQ7XG4gICAgICAgIHZhciBzY3JvbGxZID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGJvZHkuc2Nyb2xsVG9wO1xuICAgICAgICBfeCA9IHJhd0RvbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0ICsgc2Nyb2xsWDtcbiAgICAgICAgX3kgPSByYXdEb20uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgc2Nyb2xsWTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBsZWZ0OiBfeCxcbiAgICAgICAgICB0b3A6IF95XG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICBzY29wZS53aXphcmRMb2FkZWQgPSBmYWxzZTtcbiAgICAgIHNjb3BlLndpemFyZFRvcCA9IG9mZnNldChlbGVtZW50KS50b3A7XG4gICAgICBpZiAoc2NvcGUud2l6YXJkVG9wID4gNTApIHtcbiAgICAgICAgc2NvcGUud2l6YXJkVG9wIC09IDUwO1xuICAgICAgfVxuICAgICAgc2NvcGUud2l6YXJkRWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgnLmZvcm1pby13aXphcmQnLCBlbGVtZW50KTtcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICckc2NvcGUnLFxuICAgICAgJyRjb21waWxlJyxcbiAgICAgICckZWxlbWVudCcsXG4gICAgICAnRm9ybWlvJyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgJyRodHRwJyxcbiAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRjb21waWxlLFxuICAgICAgICAkZWxlbWVudCxcbiAgICAgICAgRm9ybWlvLFxuICAgICAgICBGb3JtaW9TY29wZSxcbiAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICRodHRwXG4gICAgICApIHtcbiAgICAgICAgdmFyIHNlc3Npb24gPSAoJHNjb3BlLnN0b3JhZ2UgJiYgISRzY29wZS5yZWFkT25seSkgPyBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgkc2NvcGUuc3RvcmFnZSkgOiBmYWxzZTtcbiAgICAgICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgICBzZXNzaW9uID0gYW5ndWxhci5mcm9tSnNvbihzZXNzaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBnZXRGb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGVsZW1lbnQgPSAkZWxlbWVudC5maW5kKCcjZm9ybWlvLXdpemFyZC1mb3JtJyk7XG4gICAgICAgICAgaWYgKCFlbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5jaGlsZHJlbigpLnNjb3BlKCkuZm9ybWlvRm9ybTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnBhZ2UgPSB7fTtcbiAgICAgICAgJHNjb3BlLnBhZ2VzID0gW107XG4gICAgICAgICRzY29wZS5oYXNUaXRsZXMgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJyc7XG4gICAgICAgIGlmICghJHNjb3BlLnN1Ym1pc3Npb24gfHwgIU9iamVjdC5rZXlzKCRzY29wZS5zdWJtaXNzaW9uLmRhdGEpLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gc2Vzc2lvbiA/IHtkYXRhOiBzZXNzaW9uLmRhdGF9IDoge2RhdGE6IHt9fTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBzZXNzaW9uID8gc2Vzc2lvbi5wYWdlIDogMDtcblxuICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xuICAgICAgICB0aGlzLnNob3dBbGVydHMgPSAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uKGFsZXJ0cykge1xuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UgJiYgISRzY29wZS5yZWFkT25seSkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSB7ZGF0YToge319O1xuICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2hvdyB0aGUgY3VycmVudCBwYWdlLlxuICAgICAgICB2YXIgc2hvd1BhZ2UgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgcGFnZSBpcyBwYXN0IHRoZSBjb21wb25lbnRzIGxlbmd0aCwgdHJ5IHRvIGNsZWFyIGZpcnN0LlxuICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFBhZ2UgPj0gJHNjb3BlLmZvcm0uY29tcG9uZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICRzY29wZS53aXphcmRMb2FkZWQgPSBmYWxzZTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UgJiYgISRzY29wZS5yZWFkT25seSkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsIGFuZ3VsYXIudG9Kc29uKHtcbiAgICAgICAgICAgICAgcGFnZTogJHNjb3BlLmN1cnJlbnRQYWdlLFxuICAgICAgICAgICAgICBkYXRhOiAkc2NvcGUuc3VibWlzc2lvbi5kYXRhXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5wYWdlLmNvbXBvbmVudHMgPSAkc2NvcGUuZm9ybS5jb21wb25lbnRzWyRzY29wZS5jdXJyZW50UGFnZV0uY29tcG9uZW50cztcbiAgICAgICAgICB2YXIgcGFnZUVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9ybWlvJykpO1xuICAgICAgICAgICRzY29wZS53aXphcmRFbGVtZW50Lmh0bWwoJGNvbXBpbGUocGFnZUVsZW1lbnQuYXR0cih7XG4gICAgICAgICAgICBzcmM6IFwiJ1wiICsgJHNjb3BlLnNyYyArIFwiJ1wiLFxuICAgICAgICAgICAgZm9ybTogJ3BhZ2UnLFxuICAgICAgICAgICAgc3VibWlzc2lvbjogJ3N1Ym1pc3Npb24nLFxuICAgICAgICAgICAgJ3JlYWQtb25seSc6ICdyZWFkT25seScsXG4gICAgICAgICAgICAnaGlkZS1jb21wb25lbnRzJzogJ2hpZGVDb21wb25lbnRzJyxcbiAgICAgICAgICAgICdmb3JtaW8tb3B0aW9ucyc6ICdmb3JtaW9PcHRpb25zJyxcbiAgICAgICAgICAgIGlkOiAnZm9ybWlvLXdpemFyZC1mb3JtJ1xuICAgICAgICAgIH0pKSgkc2NvcGUpKTtcbiAgICAgICAgICAkc2NvcGUud2l6YXJkTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XG4gICAgICAgICAgaWYgKHNjcm9sbCkge1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbFRvKDAsICRzY29wZS53aXphcmRUb3ApO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3dpemFyZFBhZ2UnLCAkc2NvcGUuY3VycmVudFBhZ2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBlcnJvcnMuXG4gICAgICAgICRzY29wZS5jaGVja0Vycm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghJHNjb3BlLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgLy8gQ2hhbmdlIGFsbCBvZiB0aGUgZmllbGRzIHRvIG5vdCBiZSBwcmlzdGluZS5cbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkZWxlbWVudC5maW5kKCdbbmFtZT1cImZvcm1pb0Zvcm1cIl0nKS5jaGlsZHJlbigpLCBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgIHZhciBlbGVtZW50U2NvcGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudCkuc2NvcGUoKTtcbiAgICAgICAgICAgICAgdmFyIGZpZWxkRm9ybSA9IGVsZW1lbnRTY29wZS5mb3JtaW9Gb3JtO1xuICAgICAgICAgICAgICBpZiAoZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XSkge1xuICAgICAgICAgICAgICAgIGZpZWxkRm9ybVtlbGVtZW50U2NvcGUuY29tcG9uZW50LmtleV0uJHByaXN0aW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGZpeCB0aGUgZm9sbG93aW5nIGVycm9ycyBiZWZvcmUgcHJvY2VlZGluZy4nXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU3VibWl0IHRoZSBzdWJtaXNzaW9uLlxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdWIgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLnN1Ym1pc3Npb24pO1xuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICBpZiAoc3ViLmRhdGEuaGFzT3duUHJvcGVydHkoY29tcG9uZW50LmtleSkgJiYgKGNvbXBvbmVudC50eXBlID09PSAnbnVtYmVyJykpIHtcbiAgICAgICAgICAgICAgaWYgKHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldKSB7XG4gICAgICAgICAgICAgICAgc3ViLmRhdGFbY29tcG9uZW50LmtleV0gPSBwYXJzZUZsb2F0KHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWIuZGF0YVtjb21wb25lbnQua2V5XSA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UgJiYgISRzY29wZS5yZWFkT25seSkge1xuICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgkc2NvcGUuc3RvcmFnZSwgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTdWJtaXNzaW9uIENvbXBsZXRlISdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBTYXZlIHRvIHNwZWNpZmllZCBhY3Rpb24uXG4gICAgICAgICAgaWYgKCRzY29wZS5hY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBzdWIuX2lkID8gJ3B1dCcgOiAncG9zdCc7XG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Yikuc3VjY2VzcyhmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICAgIG9uRG9uZShzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgIH0pLmVycm9yKEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuZm9ybWlvKSB7XG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvLnNhdmVTdWJtaXNzaW9uKHN1YikudGhlbihvbkRvbmUpLmNhdGNoKEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9uRG9uZShzdWIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgc2hvd1BhZ2UodHJ1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gTW92ZSBvbnRvIHRoZSBuZXh0IHBhZ2UuXG4gICAgICAgICRzY29wZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFBhZ2UgPj0gKCRzY29wZS5mb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlKys7XG4gICAgICAgICAgc2hvd1BhZ2UodHJ1ZSk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmROZXh0JywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBNb3ZlIG9udG8gdGhlIHByZXZpb3VzIHBhZ2UuXG4gICAgICAgICRzY29wZS5wcmV2ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5jdXJyZW50UGFnZSA8IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlLS07XG4gICAgICAgICAgc2hvd1BhZ2UodHJ1ZSk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmRQcmV2JywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ290byA9IGZ1bmN0aW9uKHBhZ2UpIHtcbiAgICAgICAgICBpZiAocGFnZSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBhZ2UgPj0gJHNjb3BlLmZvcm0uY29tcG9uZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnZTtcbiAgICAgICAgICBzaG93UGFnZSh0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWYWxpZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGb3JtKCkuJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kb24oJ3dpemFyZEdvVG9QYWdlJywgZnVuY3Rpb24oZXZlbnQsIHBhZ2UpIHtcbiAgICAgICAgICAkc2NvcGUuZ290byhwYWdlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVwZGF0ZVBhZ2VzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5wYWdlcy5sZW5ndGggPiA2KSB7XG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjA4MzMzMzMzMzMpKSAvIDIpICogMTAwO1xuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0xJztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjE2NjY2NjY2NjcpKSAvIDIpICogMTAwO1xuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0yJztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNldEZvcm0gPSBmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgJHNjb3BlLnBhZ2VzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgcGFuZWxzIGZvciB0aGUgcGFnZXMuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50LnR5cGUgPT09ICdwYW5lbCcpIHtcbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaGFzVGl0bGVzICYmIGNvbXBvbmVudC50aXRsZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5oYXNUaXRsZXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5wYWdlcy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAkc2NvcGUuZm9ybSA9ICRzY29wZS5mb3JtID8gYW5ndWxhci5tZXJnZSgkc2NvcGUuZm9ybSwgYW5ndWxhci5jb3B5KGZvcm0pKSA6IGFuZ3VsYXIuY29weShmb3JtKTtcbiAgICAgICAgICAkc2NvcGUuZm9ybS5jb21wb25lbnRzID0gJHNjb3BlLnBhZ2VzO1xuICAgICAgICAgICRzY29wZS5wYWdlID0gYW5ndWxhci5jb3B5KGZvcm0pO1xuICAgICAgICAgICRzY29wZS5wYWdlLmRpc3BsYXkgPSAnZm9ybSc7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmRGb3JtTG9hZCcsIGZvcm0pO1xuICAgICAgICAgIHVwZGF0ZVBhZ2VzKCk7XG4gICAgICAgICAgc2hvd1BhZ2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdmb3JtJywgZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICRzY29wZS5zcmMgfHxcbiAgICAgICAgICAgICFmb3JtIHx8XG4gICAgICAgICAgICAhT2JqZWN0LmtleXMoZm9ybSkubGVuZ3RoIHx8XG4gICAgICAgICAgICAhZm9ybS5jb21wb25lbnRzIHx8XG4gICAgICAgICAgICAhZm9ybS5jb21wb25lbnRzLmxlbmd0aFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgZm9ybVVybCA9IGZvcm0ucHJvamVjdCA/ICcvcHJvamVjdC8nICsgZm9ybS5wcm9qZWN0IDogJyc7XG4gICAgICAgICAgZm9ybVVybCArPSAnL2Zvcm0vJyArIGZvcm0uX2lkO1xuICAgICAgICAgICRzY29wZS5mb3JtaW8gPSBuZXcgRm9ybWlvKGZvcm1VcmwpO1xuICAgICAgICAgIHNldEZvcm0oZm9ybSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gdGhlIGNvbXBvbmVudHMgbGVuZ3RoIGNoYW5nZXMgdXBkYXRlIHRoZSBwYWdlcy5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZm9ybS5jb21wb25lbnRzLmxlbmd0aCcsIHVwZGF0ZVBhZ2VzKTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBmb3JtLlxuICAgICAgICBpZiAoJHNjb3BlLnNyYykge1xuICAgICAgICAgICRzY29wZS5mb3JtaW8gPSBuZXcgRm9ybWlvKCRzY29wZS5zcmMpO1xuICAgICAgICAgICRzY29wZS5mb3JtaW8ubG9hZEZvcm0oKS50aGVuKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAgIHNldEZvcm0oZm9ybSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLnNyYyA9ICcnO1xuICAgICAgICAgICRzY29wZS5mb3JtaW8gPSBuZXcgRm9ybWlvKCRzY29wZS5zcmMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgXVxuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW8nLFxuICAnZm9ybWlvQ29tcG9uZW50cycsXG4gIGZ1bmN0aW9uKFxuICAgIEZvcm1pbyxcbiAgICBmb3JtaW9Db21wb25lbnRzXG4gICkge1xuICAgIHJldHVybiB7XG4gICAgICBvbkVycm9yOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIGlmICgoZXJyb3IubmFtZSA9PT0gJ1ZhbGlkYXRpb25FcnJvcicpICYmICRlbGVtZW50KSB7XG4gICAgICAgICAgICAkZWxlbWVudC5maW5kKCcjZm9ybS1ncm91cC0nICsgZXJyb3IuZGV0YWlsc1swXS5wYXRoKS5hZGRDbGFzcygnaGFzLWVycm9yJyk7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdWYWxpZGF0aW9uRXJyb3I6ICcgKyBlcnJvci5kZXRhaWxzWzBdLm1lc3NhZ2U7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIGVycm9yID0gSlNPTi5zdHJpbmdpZnkoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1FcnJvcicsIGVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgbG9hZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLmZvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZCgkc2NvcGUuZm9ybSkgPyAkc2NvcGUuZm9ybSA6IHt9O1xuICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA9IGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5zdWJtaXNzaW9uKSA/ICRzY29wZS5zdWJtaXNzaW9uIDoge2RhdGE6IHt9fTtcbiAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25zID0gYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLnN1Ym1pc3Npb25zKSA/ICRzY29wZS5zdWJtaXNzaW9ucyA6IFtdO1xuXG4gICAgICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGVsZW1lbnRzIHJlbmRlcmVkLlxuICAgICAgICB2YXIgZWxlbWVudHNSZW5kZXJlZCA9IDA7XG4gICAgICAgICRzY29wZS4kb24oJ2Zvcm1FbGVtZW50UmVuZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudHNSZW5kZXJlZCsrO1xuICAgICAgICAgIGlmIChlbGVtZW50c1JlbmRlcmVkID09PSAkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtUmVuZGVyJywgJHNjb3BlLmZvcm0pO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyA9IGZ1bmN0aW9uKF9sb2FkaW5nKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gX2xvYWRpbmc7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlZCB0byBzZXQgdGhlIGZvcm0gYWN0aW9uLlxuICAgICAgICB2YXIgZ2V0QWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgaWYgKCFhY3Rpb24pIHJldHVybiAnJztcbiAgICAgICAgICBpZiAoYWN0aW9uLnN1YnN0cigwLCAxKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSBGb3JtaW8uZ2V0QmFzZVVybCgpICsgYWN0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCB0aGUgYWN0aW9uLlxuICAgICAgICAkc2NvcGUuYWN0aW9uID0gZ2V0QWN0aW9uKCRzY29wZS5mb3JtQWN0aW9uKTtcblxuICAgICAgICAvLyBBbGxvdyBzdWIgY29tcG9uZW50cyB0aGUgYWJpbGl0eSB0byBhZGQgbmV3IGZvcm0gY29tcG9uZW50cyB0byB0aGUgZm9ybS5cbiAgICAgICAgdmFyIGFkZGVkRGF0YSA9IHt9O1xuICAgICAgICAkc2NvcGUuJG9uKCdhZGRGb3JtQ29tcG9uZW50JywgZnVuY3Rpb24oZXZlbnQsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGlmICghYWRkZWREYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5zZXR0aW5ncy5rZXkpKSB7XG4gICAgICAgICAgICBhZGRlZERhdGFbY29tcG9uZW50LnNldHRpbmdzLmtleV0gPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRDb21wb25lbnQgPSBmb3JtaW9Db21wb25lbnRzLmNvbXBvbmVudHNbY29tcG9uZW50LnR5cGVdO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm0uY29tcG9uZW50cy5wdXNoKGFuZ3VsYXIuZXh0ZW5kKGRlZmF1bHRDb21wb25lbnQuc2V0dGluZ3MsIGNvbXBvbmVudC5zZXR0aW5ncykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBhY3Rpb24gaWYgdGhleSBwcm92aWRlZCBpdCBpbiB0aGUgZm9ybS5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZm9ybS5hY3Rpb24nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICB2YXIgYWN0aW9uID0gZ2V0QWN0aW9uKHZhbHVlKTtcbiAgICAgICAgICBpZiAoYWN0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBhIGZvcm0gbG9hZCBldmVudCB3aGVuIHRoZSBjb21wb25lbnRzIGxlbmd0aCBpcyBtb3JlIHRoYW4gMC5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZm9ybS5jb21wb25lbnRzLmxlbmd0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICEkc2NvcGUuZm9ybSB8fFxuICAgICAgICAgICAgISRzY29wZS5mb3JtLmNvbXBvbmVudHMgfHxcbiAgICAgICAgICAgICEkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcodHJ1ZSk7XG4gICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgIGlmICgkc2NvcGUucGVyUGFnZSkgcGFyYW1zLmxpbWl0ID0gJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICAgaWYgKCRzY29wZS5za2lwKSBwYXJhbXMuc2tpcCA9ICRzY29wZS5za2lwO1xuICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbnMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbnMsIGFuZ3VsYXIuY29weShzdWJtaXNzaW9ucykpO1xuICAgICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcoZmFsc2UpO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uc0xvYWQnLCBzdWJtaXNzaW9ucyk7XG4gICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAgICAgaWYgKCRzY29wZS5fc3JjKSB7XG4gICAgICAgICAgbG9hZGVyID0gbmV3IEZvcm1pbygkc2NvcGUuX3NyYyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZm9ybSkge1xuICAgICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIElmIGEgZm9ybSBpcyBhbHJlYWR5IHByb3ZpZGVkLCB0aGVuIHNraXAgdGhlIGxvYWQuXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmZvcm0gJiYgT2JqZWN0LmtleXMoJHNjb3BlLmZvcm0pLmxlbmd0aCkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuZm9ybSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuZm9ybSwgYW5ndWxhci5jb3B5KGZvcm0pKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcbiAgICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9uICYmIGxvYWRlci5zdWJtaXNzaW9uSWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zZXRMb2FkaW5nKHRydWUpO1xuXG4gICAgICAgICAgICAvLyBJZiBhIHN1Ym1pc3Npb24gaXMgYWxyZWFkeSBwcm92aWRlZCwgdGhlbiBza2lwIHRoZSBsb2FkLlxuICAgICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uICYmIE9iamVjdC5rZXlzKCRzY29wZS5zdWJtaXNzaW9uLmRhdGEpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkxvYWQnLCAkc2NvcGUuc3VibWlzc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbiwgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsIHN1Ym1pc3Npb24pO1xuICAgICAgICAgICAgICB9LCB0aGlzLm9uRXJyb3IoJHNjb3BlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRpb25zLnN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU3VibWlzc2lvbnMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1vTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSAhJHNjb3BlLmZvcm0gfHwgKE9iamVjdC5rZXlzKCRzY29wZS5mb3JtKS5sZW5ndGggPT09IDApIHx8ICEkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aDtcbiAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZygkc2NvcGUuZm9ybUxvYWRpbmcpO1xuXG4gICAgICAgICAgLy8gRW1pdCB0aGUgZXZlbnRzIGlmIHRoZXNlIG9iamVjdHMgYXJlIGFscmVhZHkgbG9hZGVkLlxuICAgICAgICAgIGlmICghJHNjb3BlLmZvcm1Mb2FkaW5nKSB7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1Mb2FkJywgJHNjb3BlLmZvcm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkxvYWQnLCAkc2NvcGUuc3VibWlzc2lvbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbnNMb2FkJywgJHNjb3BlLnN1Ym1pc3Npb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGxvYWRlci5cbiAgICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZm9ybWlvVXRpbHMgPSByZXF1aXJlKCdmb3JtaW8tdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBmbGF0dGVuQ29tcG9uZW50czogZm9ybWlvVXRpbHMuZmxhdHRlbkNvbXBvbmVudHMsXG4gICAgZWFjaENvbXBvbmVudDogZm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudCxcbiAgICBnZXRDb21wb25lbnQ6IGZvcm1pb1V0aWxzLmdldENvbXBvbmVudCxcbiAgICBnZXRWYWx1ZTogZm9ybWlvVXRpbHMuZ2V0VmFsdWUsXG4gICAgaGlkZUZpZWxkczogZnVuY3Rpb24oZm9ybSwgY29tcG9uZW50cykge1xuICAgICAgdGhpcy5lYWNoQ29tcG9uZW50KGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gY29tcG9uZW50cykge1xuICAgICAgICAgIGlmIChjb21wb25lbnQua2V5ID09PSBjb21wb25lbnRzW2ldKSB7XG4gICAgICAgICAgICBjb21wb25lbnQudHlwZSA9ICdoaWRkZW4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICB1bmlxdWVOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgcGFydHMgPSBuYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW14wLTlhLXpcXC5dL2csICcnKS5zcGxpdCgnLicpO1xuICAgICAgdmFyIGZpbGVOYW1lID0gcGFydHNbMF07XG4gICAgICB2YXIgZXh0ID0gJyc7XG4gICAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICBleHQgPSAnLicgKyBwYXJ0c1socGFydHMubGVuZ3RoIC0gMSldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZpbGVOYW1lLnN1YnN0cigwLCAxMCkgKyAnLScgKyB0aGlzLmd1aWQoKSArIGV4dDtcbiAgICB9LFxuICAgIGd1aWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkqMTZ8MCwgdiA9IGMgPT09ICd4JyA/IHIgOiAociYweDN8MHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBmaWVsZFdyYXA6IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICBpbnB1dCA9IGlucHV0ICsgJzxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz4nO1xuICAgICAgdmFyIG11bHRpSW5wdXQgPSBpbnB1dC5yZXBsYWNlKCdkYXRhW2NvbXBvbmVudC5rZXldJywgJ2RhdGFbY29tcG9uZW50LmtleV1bJGluZGV4XScpO1xuICAgICAgdmFyIGlucHV0TGFiZWwgPSAnPGxhYmVsIG5nLWlmPVwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXCIgZm9yPVwie3sgY29tcG9uZW50LmtleSB9fVwiIGNsYXNzPVwiY29udHJvbC1sYWJlbFwiIG5nLWNsYXNzPVwie1xcJ2ZpZWxkLXJlcXVpcmVkXFwnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlIH19PC9sYWJlbD4nO1xuICAgICAgdmFyIHJlcXVpcmVkSW5saW5lID0gJzxzcGFuIG5nLWlmPVwiKGNvbXBvbmVudC5oaWRlTGFiZWwgPT09IHRydWUgfHwgY29tcG9uZW50LmxhYmVsID09PSBcXCdcXCcgfHwgIWNvbXBvbmVudC5sYWJlbCkgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXCIgY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+JztcbiAgICAgIHZhciB0ZW1wbGF0ZSA9XG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5tdWx0aXBsZVwiPicgK1xuICAgICAgICAgIGlucHV0TGFiZWwgK1xuICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIj4nICtcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnByZWZpeFwiPnt7IGNvbXBvbmVudC5wcmVmaXggfX08L2Rpdj4nICtcbiAgICAgICAgICAgIGlucHV0ICtcbiAgICAgICAgICAgIHJlcXVpcmVkSW5saW5lICtcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnN1ZmZpeFwiPnt7IGNvbXBvbmVudC5zdWZmaXggfX08L2Rpdj4nICtcbiAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgbmctaWY9XCJjb21wb25lbnQubXVsdGlwbGVcIj48dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1ib3JkZXJlZFwiPicgK1xuICAgICAgICAgIGlucHV0TGFiZWwgK1xuICAgICAgICAgICc8dHIgbmctcmVwZWF0PVwidmFsdWUgaW4gZGF0YVtjb21wb25lbnQua2V5XSB0cmFjayBieSAkaW5kZXhcIj4nICtcbiAgICAgICAgICAgICc8dGQ+JyArXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5wcmVmaXhcIj57eyBjb21wb25lbnQucHJlZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICBtdWx0aUlucHV0ICtcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkSW5saW5lICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICc8L3RkPicgK1xuICAgICAgICAgICAgJzx0ZD48YSBuZy1jbGljaz1cInJlbW92ZUZpZWxkVmFsdWUoJGluZGV4KVwiIGNsYXNzPVwiYnRuIGJ0bi1kZWZhdWx0XCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZS1jaXJjbGVcIj48L3NwYW4+PC9hPjwvdGQ+JyArXG4gICAgICAgICAgJzwvdHI+JyArXG4gICAgICAgICAgJzx0cj4nICtcbiAgICAgICAgICAgICc8dGQgY29sc3Bhbj1cIjJcIj48YSBuZy1jbGljaz1cImFkZEZpZWxkVmFsdWUoKVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+IHt7IGNvbXBvbmVudC5hZGRBbm90aGVyIHx8IFwiQWRkIEFub3RoZXJcIiB8IGZvcm1pb1RyYW5zbGF0ZSB9fTwvYT48L3RkPicgK1xuICAgICAgICAgICc8L3RyPicgK1xuICAgICAgICAnPC90YWJsZT48L2Rpdj4nO1xuICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH1cbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJHEnLFxuICAnJHJvb3RTY29wZScsXG4gICdGb3JtaW8nLFxuICBmdW5jdGlvbigkcSwgJHJvb3RTY29wZSwgRm9ybWlvKSB7XG4gICAgdmFyIEludGVyY2VwdG9yID0ge1xuICAgICAgLyoqXG4gICAgICAgKiBVcGRhdGUgSldUIHRva2VuIHJlY2VpdmVkIGZyb20gcmVzcG9uc2UuXG4gICAgICAgKi9cbiAgICAgIHJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSByZXNwb25zZS5oZWFkZXJzKCd4LWp3dC10b2tlbicpO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDAgJiYgdG9rZW4gJiYgdG9rZW4gIT09ICcnKSB7XG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEludGVyY2VwdCBhIHJlc3BvbnNlIGVycm9yLlxuICAgICAgICovXG4gICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQ0MCkge1xuICAgICAgICAgIHJlc3BvbnNlLmxvZ2dlZE91dCA9IHRydWU7XG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKG51bGwpO1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgcmVzcG9uc2UuYm9keSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQwMSkge1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIHJlc3BvbnNlLmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBTZXQgdGhlIHRva2VuIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuXG4gICAgICAgKi9cbiAgICAgIHJlcXVlc3Q6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnLmRpc2FibGVKV1QpIHJldHVybiBjb25maWc7XG4gICAgICAgIHZhciB0b2tlbiA9IEZvcm1pby5nZXRUb2tlbigpO1xuICAgICAgICBpZiAodG9rZW4pIGNvbmZpZy5oZWFkZXJzWyd4LWp3dC10b2tlbiddID0gdG9rZW47XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBJbnRlcmNlcHRvcjtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW8nLFxuICAnZm9ybWlvQ29tcG9uZW50cycsXG4gICckaW50ZXJwb2xhdGUnLFxuICBmdW5jdGlvbihcbiAgICBGb3JtaW8sXG4gICAgZm9ybWlvQ29tcG9uZW50cyxcbiAgICAkaW50ZXJwb2xhdGVcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBjb21wb25lbnQpIHtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgICAgaWYgKCFjb21wb25lbnQgfHwgIWNvbXBvbmVudC5pbnB1dHx8ICFjb21wb25lbnQudHlwZSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgY29tcG9uZW50SW5mbyA9IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1tjb21wb25lbnQudHlwZV07XG4gICAgICBpZiAoIWNvbXBvbmVudEluZm8udGFibGVWaWV3KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgKHZhbHVlLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbihhcnJheVZhbHVlKSB7XG4gICAgICAgICAgdmFsdWVzLnB1c2goY29tcG9uZW50SW5mby50YWJsZVZpZXcoYXJyYXlWYWx1ZSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUsIGZvcm1pb0NvbXBvbmVudHMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29tcG9uZW50SW5mby50YWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlLCBmb3JtaW9Db21wb25lbnRzKTtcbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ0Zvcm1pb1V0aWxzJyxcbiAgZnVuY3Rpb24oRm9ybWlvVXRpbHMpIHtcbiAgICByZXR1cm4gRm9ybWlvVXRpbHMuZmxhdHRlbkNvbXBvbmVudHM7XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJHNjZScsXG4gIGZ1bmN0aW9uKFxuICAgICRzY2VcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xuICAgIH07XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY29tcG9uZW50cykge1xuICAgICAgdmFyIHRhYmxlQ29tcHMgPSBbXTtcbiAgICAgIGlmICghY29tcG9uZW50cyB8fCAhY29tcG9uZW50cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XG4gICAgICB9XG4gICAgICBjb21wb25lbnRzLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChjb21wb25lbnQudGFibGVWaWV3KSB7XG4gICAgICAgICAgdGFibGVDb21wcy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdmb3JtaW9UYWJsZVZpZXcnLFxuICBmdW5jdGlvbihcbiAgICBmb3JtaW9UYWJsZVZpZXdcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBjb21wb25lbnQpIHtcbiAgICAgIHJldHVybiBmb3JtaW9UYWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCk7XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW8nLFxuICAnZm9ybWlvVGFibGVWaWV3JyxcbiAgZnVuY3Rpb24oXG4gICAgRm9ybWlvLFxuICAgIGZvcm1pb1RhYmxlVmlld1xuICApIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gZm9ybWlvVGFibGVWaWV3KEZvcm1pby5maWVsZERhdGEoZGF0YSwgY29tcG9uZW50KSwgY29tcG9uZW50KTtcbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJyRmaWx0ZXInLFxuICBmdW5jdGlvbihcbiAgICAkZmlsdGVyXG4gICkge1xuICAgIHJldHVybiBmdW5jdGlvbih0ZXh0LCBrZXkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSAkZmlsdGVyKCd0cmFuc2xhdGUnKTtcbiAgICAgICAgLy8gQWxsb3cgdHJhbnNsYXRpbmcgYnkgZmllbGQga2V5IHdoaWNoIGhlbHBzIHdpdGggbGFyZ2UgYmxvY2tzIG9mIGh0bWwuXG4gICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gdHJhbnNsYXRlKGtleSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0ga2V5KSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0cmFuc2xhdGUodGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRyYW5zbGF0ZSh0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZm9ybWlvJywgW1xuICAnbmdTYW5pdGl6ZScsXG4gICd1aS5ib290c3RyYXAnLFxuICAndWkuYm9vdHN0cmFwLmRhdGV0aW1lcGlja2VyJyxcbiAgJ3VpLnNlbGVjdCcsXG4gICd1aS5tYXNrJyxcbiAgJ2FuZ3VsYXJNb21lbnQnLFxuICAnbmdGaWxlVXBsb2FkJyxcbiAgJ25nRmlsZVNhdmVyJ1xuXSk7XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBmb3JtaW8gcHJvdmlkZXJzLlxuICovXG5hcHAucHJvdmlkZXIoJ0Zvcm1pbycsIHJlcXVpcmUoJy4vcHJvdmlkZXJzL0Zvcm1pbycpKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIHdheSB0byByZWdpc3RlciB0aGUgRm9ybWlvIHNjb3BlLlxuICovXG5hcHAuZmFjdG9yeSgnRm9ybWlvU2NvcGUnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZScpKTtcblxuYXBwLmZhY3RvcnkoJ0Zvcm1pb1V0aWxzJywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvRm9ybWlvVXRpbHMnKSk7XG5cbmFwcC5mYWN0b3J5KCdmb3JtaW9JbnRlcmNlcHRvcicsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yJykpO1xuXG5hcHAuZmFjdG9yeSgnZm9ybWlvVGFibGVWaWV3JywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvZm9ybWlvVGFibGVWaWV3JykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW8nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9EZWxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRGVsZXRlJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9FcnJvcnMnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdjdXN0b21WYWxpZGF0b3InLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvY3VzdG9tVmFsaWRhdG9yJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9TdWJtaXNzaW9ucycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9ucycpKTtcblxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvU3VibWlzc2lvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9uJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9Db21wb25lbnQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvQ29tcG9uZW50JykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9Db21wb25lbnRWaWV3JywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudFZpZXcnKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0VsZW1lbnQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRWxlbWVudCcpKTtcblxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvV2l6YXJkJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb1dpemFyZCcpKTtcblxuLyoqXG4gKiBGaWx0ZXIgdG8gZmxhdHRlbiBmb3JtIGNvbXBvbmVudHMuXG4gKi9cbmFwcC5maWx0ZXIoJ2ZsYXR0ZW5Db21wb25lbnRzJywgcmVxdWlyZSgnLi9maWx0ZXJzL2ZsYXR0ZW5Db21wb25lbnRzJykpO1xuYXBwLmZpbHRlcigndGFibGVDb21wb25lbnRzJywgcmVxdWlyZSgnLi9maWx0ZXJzL3RhYmxlQ29tcG9uZW50cycpKTtcbmFwcC5maWx0ZXIoJ3RhYmxlVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZVZpZXcnKSk7XG5hcHAuZmlsdGVyKCd0YWJsZUZpZWxkVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZUZpZWxkVmlldycpKTtcbmFwcC5maWx0ZXIoJ3NhZmVodG1sJywgcmVxdWlyZSgnLi9maWx0ZXJzL3NhZmVodG1sJykpO1xuYXBwLmZpbHRlcignZm9ybWlvVHJhbnNsYXRlJywgcmVxdWlyZSgnLi9maWx0ZXJzL3RyYW5zbGF0ZScpKTtcblxuYXBwLmNvbmZpZyhbXG4gICckaHR0cFByb3ZpZGVyJyxcbiAgZnVuY3Rpb24oXG4gICAgJGh0dHBQcm92aWRlclxuICApIHtcbiAgICBpZiAoISRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQpIHtcbiAgICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBEaXNhYmxlIElFIGNhY2hpbmcgZm9yIEdFVCByZXF1ZXN0cy5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQuUHJhZ21hID0gJ25vLWNhY2hlJztcbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdmb3JtaW9JbnRlcmNlcHRvcicpO1xuICB9XG5dKTtcblxuYXBwLnJ1bihbXG4gICckdGVtcGxhdGVDYWNoZScsXG4gIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgLy8gVGhlIHRlbXBsYXRlIGZvciB0aGUgZm9ybWlvIGZvcm1zLlxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLmh0bWwnLFxuICAgICAgXCI8ZGl2PlxcbiAgPGkgc3R5bGU9XFxcImZvbnQtc2l6ZTogMmVtO1xcXCIgbmctaWY9XFxcImZvcm1Mb2FkaW5nXFxcIiBuZy1jbGFzcz1cXFwieydmb3JtaW8taGlkZGVuJzogIWZvcm1Mb2FkaW5nfVxcXCIgY2xhc3M9XFxcImZvcm1pby1sb2FkaW5nIGdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcbiAgPGZvcm1pby13aXphcmQgbmctaWY9XFxcImZvcm0uZGlzcGxheSA9PT0gJ3dpemFyZCdcXFwiIHNyYz1cXFwic3JjXFxcIiBmb3JtPVxcXCJmb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIiBmb3JtLWFjdGlvbj1cXFwiZm9ybUFjdGlvblxcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCIgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCIgZm9ybWlvLW9wdGlvbnM9XFxcImZvcm1pb09wdGlvbnNcXFwiIHN0b3JhZ2U9XFxcImZvcm0ubmFtZVxcXCI+PC9mb3JtaW8td2l6YXJkPlxcbiAgPGZvcm0gbmctaWY9XFxcIiFmb3JtLmRpc3BsYXkgfHwgKGZvcm0uZGlzcGxheSA9PT0gJ2Zvcm0nKVxcXCIgcm9sZT1cXFwiZm9ybVxcXCIgbmFtZT1cXFwiZm9ybWlvRm9ybVxcXCIgbmctc3VibWl0PVxcXCJvblN1Ym1pdChmb3JtaW9Gb3JtKVxcXCIgbm92YWxpZGF0ZT5cXG4gICAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0cyB0cmFjayBieSAkaW5kZXhcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC17eyBhbGVydC50eXBlIH19XFxcIiByb2xlPVxcXCJhbGVydFxcXCI+XFxuICAgICAge3sgYWxlcnQubWVzc2FnZSB9fVxcbiAgICA8L2Rpdj5cXG4gICAgPCEtLSBETyBOT1QgUFVUIFxcXCJ0cmFjayBieSAkaW5kZXhcXFwiIEhFUkUgU0lOQ0UgRFlOQU1JQ0FMTFkgQURESU5HL1JFTU9WSU5HIENPTVBPTkVOVFMgV0lMTCBCUkVBSyAtLT5cXG4gICAgPGZvcm1pby1jb21wb25lbnRcXG4gICAgICBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHNcXFwiXFxuICAgICAgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiXFxuICAgICAgZGF0YT1cXFwic3VibWlzc2lvbi5kYXRhXFxcIlxcbiAgICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICAgIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgICAgIHJlYWQtb25seT1cXFwicmVhZE9ubHkgfHwgY29tcG9uZW50LmRpc2FibGVkXFxcIlxcbiAgICAgIG5nLWlmPVxcXCJzaG93W2NvbXBvbmVudC5rZXkgfHwgJyddXFxcIlxcbiAgICAgIHNob3c9XFxcInNob3dcXFwiXFxuICAgID48L2Zvcm1pby1jb21wb25lbnQ+XFxuICA8L2Zvcm0+XFxuPC9kaXY+XFxuXCJcbiAgICApO1xuXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8td2l6YXJkLmh0bWwnLFxuICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJmb3JtaW8td2l6YXJkLXdyYXBwZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwicm93IGJzLXdpemFyZFxcXCIgc3R5bGU9XFxcImJvcmRlci1ib3R0b206MDtcXFwiIG5nLWNsYXNzPVxcXCJ7aGFzVGl0bGVzOiBoYXNUaXRsZXN9XFxcIj5cXG4gICAgPGRpdiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAoJGluZGV4ID4gY3VycmVudFBhZ2UpLCBhY3RpdmU6ICgkaW5kZXggPT0gY3VycmVudFBhZ2UpLCBjb21wbGV0ZTogKCRpbmRleCA8IGN1cnJlbnRQYWdlKSwgbm9UaXRsZTogIXBhZ2UudGl0bGV9XFxcIiBjbGFzcz1cXFwie3sgY29sY2xhc3MgfX0gYnMtd2l6YXJkLXN0ZXBcXFwiIG5nLXJlcGVhdD1cXFwicGFnZSBpbiBwYWdlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInRleHQtY2VudGVyIGJzLXdpemFyZC1zdGVwbnVtXFxcIiBuZy1pZj1cXFwicGFnZS50aXRsZVxcXCI+e3sgcGFnZS50aXRsZSB9fTwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj48ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXIgcHJvZ3Jlc3MtYmFyLXByaW1hcnlcXFwiPjwvZGl2PjwvZGl2PlxcbiAgICAgIDxhIG5nLWNsaWNrPVxcXCJnb3RvKCRpbmRleClcXFwiIGNsYXNzPVxcXCJicy13aXphcmQtZG90IGJnLXByaW1hcnlcXFwiPjxkaXYgY2xhc3M9XFxcImJzLXdpemFyZC1kb3QtaW5uZXIgYmctc3VjY2Vzc1xcXCI+PC9kaXY+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbiAgPHN0eWxlIHR5cGU9XFxcInRleHQvY3NzXFxcIj4uYnMtd2l6YXJkID4gLmJzLXdpemFyZC1zdGVwOmZpcnN0LWNoaWxkIHsgbWFyZ2luLWxlZnQ6IHt7IG1hcmdpbiB9fSU7IH08L3N0eWxlPlxcbiAgPGkgbmctc2hvdz1cXFwiIXdpemFyZExvYWRlZFxcXCIgaWQ9XFxcImZvcm1pby1sb2FkaW5nXFxcIiBzdHlsZT1cXFwiZm9udC1zaXplOiAyZW07XFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoIGdseXBoaWNvbi1zcGluXFxcIj48L2k+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj57eyBhbGVydC5tZXNzYWdlIH19PC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJmb3JtaW8td2l6YXJkXFxcIj48L2Rpdj5cXG4gIDx1bCBuZy1zaG93PVxcXCJ3aXphcmRMb2FkZWRcXFwiIGNsYXNzPVxcXCJsaXN0LWlubGluZVxcXCI+XFxuICAgIDxsaT48YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBuZy1jbGljaz1cXFwiY2FuY2VsKClcXFwiPkNhbmNlbDwvYT48L2xpPlxcbiAgICA8bGkgbmctaWY9XFxcImN1cnJlbnRQYWdlID4gMFxcXCI+PGEgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcInByZXYoKVxcXCI+UHJldmlvdXM8L2E+PC9saT5cXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA8IChmb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIG5nLWNsaWNrPVxcXCJuZXh0KClcXFwiPk5leHQ8L2E+XFxuICAgIDwvbGk+XFxuICAgIDxsaSBuZy1pZj1cXFwiY3VycmVudFBhZ2UgPj0gKGZvcm0uY29tcG9uZW50cy5sZW5ndGggLSAxKVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcInN1Ym1pdCgpXFxcIj5TdWJtaXQgRm9ybTwvYT5cXG4gICAgPC9saT5cXG4gIDwvdWw+XFxuPC9kaXY+XFxuXCJcbiAgICApO1xuXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8tZGVsZXRlLmh0bWwnLFxuICAgICAgXCI8Zm9ybSByb2xlPVxcXCJmb3JtXFxcIj5cXG4gIDxkaXYgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBmb3JtaW9BbGVydHMgdHJhY2sgYnkgJGluZGV4XFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVxcXCIgcm9sZT1cXFwiYWxlcnRcXFwiPlxcbiAgICB7eyBhbGVydC5tZXNzYWdlIH19XFxuICA8L2Rpdj5cXG4gIDxoMz57eyBkZWxldGVNZXNzYWdlIH19PC9oMz5cXG4gIDxkaXYgY2xhc3M9XFxcImJ0bi10b29sYmFyXFxcIj5cXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25EZWxldGUoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyXFxcIj5ZZXM8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25DYW5jZWwoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+Tm88L2J1dHRvbj5cXG4gIDwvZGl2PlxcbjwvZm9ybT5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgXCI8ZGl2PlxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgPGZvcm1pby1jb21wb25lbnQtdmlldyBmb3JtPVxcXCJmb3JtXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwic3VibWlzc2lvbi5kYXRhXFxcIiBpZ25vcmU9XFxcImlnbm9yZVxcXCI+PC9mb3JtaW8tY29tcG9uZW50LXZpZXc+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9zdWJtaXNzaW9ucy5odG1sJyxcbiAgICAgIFwiPGRpdj5cXG4gIDxkaXYgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBmb3JtaW9BbGVydHMgdHJhY2sgYnkgJGluZGV4XFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVxcXCIgcm9sZT1cXFwiYWxlcnRcXFwiPlxcbiAgICB7eyBhbGVydC5tZXNzYWdlIH19XFxuICA8L2Rpdj5cXG4gIDx0YWJsZSBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgICA8dGhlYWQ+XFxuICAgICAgPHRyPlxcbiAgICAgICAgPHRoIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXggfCBmbGF0dGVuQ29tcG9uZW50c1xcXCIgbmctaWY9XFxcInRhYmxlVmlldyhjb21wb25lbnQpXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fTwvdGg+XFxuICAgICAgICA8dGg+U3VibWl0dGVkPC90aD5cXG4gICAgICAgIDx0aD5VcGRhdGVkPC90aD5cXG4gICAgICAgIDx0aD5PcGVyYXRpb25zPC90aD5cXG4gICAgICA8L3RyPlxcbiAgICA8L3RoZWFkPlxcbiAgICA8dGJvZHk+XFxuICAgICAgPHRyIG5nLXJlcGVhdD1cXFwic3VibWlzc2lvbiBpbiBzdWJtaXNzaW9ucyB0cmFjayBieSAkaW5kZXhcXFwiIGNsYXNzPVxcXCJmb3JtaW8tc3VibWlzc2lvblxcXCIgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uVmlldycsIHN1Ym1pc3Npb24pXFxcIj5cXG4gICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4IHwgZmxhdHRlbkNvbXBvbmVudHNcXFwiIG5nLWlmPVxcXCJ0YWJsZVZpZXcoY29tcG9uZW50KVxcXCI+e3sgc3VibWlzc2lvbi5kYXRhIHwgdGFibGVWaWV3OmNvbXBvbmVudCB9fTwvdGQ+XFxuICAgICAgICA8dGQ+e3sgc3VibWlzc2lvbi5jcmVhdGVkIHwgYW1EYXRlRm9ybWF0OidsLCBoOm1tOnNzIGEnIH19PC90ZD5cXG4gICAgICAgIDx0ZD57eyBzdWJtaXNzaW9uLm1vZGlmaWVkIHwgYW1EYXRlRm9ybWF0OidsLCBoOm1tOnNzIGEnIH19PC90ZD5cXG4gICAgICAgIDx0ZD5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYnV0dG9uLWdyb3VwXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O1xcXCI+XFxuICAgICAgICAgICAgPGEgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uVmlldycsIHN1Ym1pc3Npb24pOyAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZXllLW9wZW5cXFwiPjwvc3Bhbj48L2E+Jm5ic3A7XFxuICAgICAgICAgICAgPGEgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uRWRpdCcsIHN1Ym1pc3Npb24pOyAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZWRpdFxcXCI+PC9zcGFuPjwvYT4mbmJzcDtcXG4gICAgICAgICAgICA8YSBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25EZWxldGUnLCBzdWJtaXNzaW9uKTsgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xcXCIgY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyIGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVxcXCI+PC9zcGFuPjwvYT5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RkPlxcbiAgICAgIDwvdHI+XFxuICAgIDwvdGJvZHk+XFxuICA8L3RhYmxlPlxcbiAgPHBhZ2luYXRpb25cXG4gICAgbmctaWY9XFxcInN1Ym1pc3Npb25zLnNlcnZlckNvdW50ID4gcGVyUGFnZVxcXCJcXG4gICAgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIlxcbiAgICBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCJcXG4gICAgdG90YWwtaXRlbXM9XFxcInN1Ym1pc3Npb25zLnNlcnZlckNvdW50XFxcIlxcbiAgICBpdGVtcy1wZXItcGFnZT1cXFwicGVyUGFnZVxcXCJcXG4gICAgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCJcXG4gICAgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiXFxuICAgIGZpcnN0LXRleHQ9XFxcIiZsYXF1bztcXFwiXFxuICAgIGxhc3QtdGV4dD1cXFwiJnJhcXVvO1xcXCJcXG4gICAgPlxcbiAgPC9wYWdpbmF0aW9uPlxcbjwvZGl2PlxcblwiXG4gICAgKTtcblxuICAgIC8vIEEgZm9ybWlvIGNvbXBvbmVudCB0ZW1wbGF0ZS5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnQuaHRtbCcsXG4gICAgICBcIjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXAgaGFzLWZlZWRiYWNrIGZvcm0tZmllbGQtdHlwZS17eyBjb21wb25lbnQudHlwZSB9fSBmb3JtaW8tY29tcG9uZW50LXt7IGNvbXBvbmVudC5rZXkgfX0ge3tjb21wb25lbnQuY3VzdG9tQ2xhc3N9fVxcXCIgaWQ9XFxcImZvcm0tZ3JvdXAte3sgY29tcG9uZW50SWQgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7J2hhcy1lcnJvcic6IGZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRpbnZhbGlkICYmICFmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kcHJpc3RpbmUgfVxcXCIgbmctc3R5bGU9XFxcImNvbXBvbmVudC5zdHlsZVxcXCIgbmctaGlkZT1cXFwiY29tcG9uZW50LmhpZGRlblxcXCI+XFxuICA8Zm9ybWlvLWVsZW1lbnQ+PC9mb3JtaW8tZWxlbWVudD5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnQtdmlldy5odG1sJyxcbiAgICAgIFwiPGRpdiBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgaGFzLWZlZWRiYWNrIGZvcm0tZmllbGQtdHlwZS17eyBjb21wb25lbnQudHlwZSB9fSB7e2NvbXBvbmVudC5jdXN0b21DbGFzc319IGZvcm1pby1jb21wb25lbnQte3sgY29tcG9uZW50LmtleSB9fVxcXCIgaWQ9XFxcImZvcm0tZ3JvdXAte3sgY29tcG9uZW50SWQgfX1cXFwiIG5nLXN0eWxlPVxcXCJjb21wb25lbnQuc3R5bGVcXFwiIG5nLWhpZGU9XFxcImNvbXBvbmVudC5oaWRkZW5cXFwiPlxcbiAgPGZvcm1pby1lbGVtZW50IG5nLWlmPVxcXCJzaG91bGRTaG93XFxcIj48L2Zvcm1pby1lbGVtZW50PlxcbjwvZGl2PlxcblwiXG4gICAgKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2VsZW1lbnQtdmlldy5odG1sJyxcbiAgICAgIFwiPGRpdj5cXG4gIDxkaXY+PHN0cm9uZz57eyBjb21wb25lbnQubGFiZWwgfX08L3N0cm9uZz48L2Rpdj5cXG4gIDxkaXYgbmctYmluZC1odG1sPVxcXCJkYXRhIHwgdGFibGVWaWV3OmNvbXBvbmVudFxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICApO1xuXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vZXJyb3JzLmh0bWwnLFxuICAgICAgXCI8ZGl2IG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvciAmJiAhZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJHByaXN0aW5lXFxcIj5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IuZW1haWxcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQucGxhY2Vob2xkZXIgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGEgdmFsaWQgZW1haWwuPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5yZXF1aXJlZFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IGlzIHJlcXVpcmVkLjwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IubnVtYmVyXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LnBsYWNlaG9sZGVyIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBhIG51bWJlci48L3A+XFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGVycm9yLm1heGxlbmd0aFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgc2hvcnRlciB0aGFuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5tYXhMZW5ndGggKyAxIH19IGNoYXJhY3RlcnMuPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5taW5sZW5ndGhcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQucGxhY2Vob2xkZXIgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGxvbmdlciB0aGFuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5taW5MZW5ndGggLSAxIH19IGNoYXJhY3RlcnMuPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5taW5cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQucGxhY2Vob2xkZXIgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGhpZ2hlciB0aGFuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5taW4gLSAxIH19LjwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IubWF4XFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LnBsYWNlaG9sZGVyIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBsb3dlciB0aGFuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5tYXggKyAxIH19LjwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IuY3VzdG9tXFxcIj57eyBjb21wb25lbnQuY3VzdG9tRXJyb3IgfX08L3A+XFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGVycm9yLnBhdHRlcm5cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQucGxhY2Vob2xkZXIgfHwgY29tcG9uZW50LmtleSB9fSBkb2VzIG5vdCBtYXRjaCB0aGUgcGF0dGVybiB7eyBjb21wb25lbnQudmFsaWRhdGUucGF0dGVybiB9fTwvcD5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG4gIH1cbl0pO1xuXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gVGhlIGZvcm1pbyBjbGFzcy5cbiAgdmFyIEZvcm1pbyA9IHJlcXVpcmUoJ2Zvcm1pb2pzJyk7XG5cbiAgLy8gUmV0dXJuIHRoZSBwcm92aWRlciBpbnRlcmZhY2UuXG4gIHJldHVybiB7XG5cbiAgICAvLyBFeHBvc2UgRm9ybWlvIGNvbmZpZ3VyYXRpb24gZnVuY3Rpb25zXG4gICAgc2V0QmFzZVVybDogRm9ybWlvLnNldEJhc2VVcmwsXG4gICAgZ2V0QmFzZVVybDogRm9ybWlvLmdldEJhc2VVcmwsXG4gICAgc2V0QXBpVXJsOiBGb3JtaW8uc2V0QmFzZVVybCxcbiAgICBnZXRBcGlVcmw6IEZvcm1pby5nZXRCYXNlVXJsLFxuICAgIHNldEFwcFVybDogRm9ybWlvLnNldEFwcFVybCxcbiAgICBnZXRBcHBVcmw6IEZvcm1pby5nZXRBcHBVcmwsXG4gICAgcmVnaXN0ZXJQbHVnaW46IEZvcm1pby5yZWdpc3RlclBsdWdpbixcbiAgICBnZXRQbHVnaW46IEZvcm1pby5nZXRQbHVnaW4sXG4gICAgcHJvdmlkZXJzOiBGb3JtaW8ucHJvdmlkZXJzLFxuICAgIHNldERvbWFpbjogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBSZW1vdmUgdGhpcz9cbiAgICB9LFxuXG4gICAgJGdldDogW1xuICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgJyRxJyxcbiAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAkcVxuICAgICAgKSB7XG4gICAgICAgIHZhciB3cmFwUVByb21pc2UgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgICAgcmV0dXJuICRxLndoZW4ocHJvbWlzZSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChlcnJvciA9PT0gJ1VuYXV0aG9yaXplZCcpIHtcbiAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdmb3JtaW8udW5hdXRob3JpemVkJywgZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZXJyb3IgPT09ICdMb2dpbiBUaW1lb3V0Jykge1xuICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Zvcm1pby5zZXNzaW9uRXhwaXJlZCcsIGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFByb3BhZ2F0ZSBlcnJvclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybWlvLnJlZ2lzdGVyUGx1Z2luKHtcbiAgICAgICAgICBwcmlvcml0eTogLTEwMCxcbiAgICAgICAgICAvLyBXcmFwIEZvcm1pby5yZXF1ZXN0J3MgcHJvbWlzZXMgd2l0aCAkcSBzbyAkYXBwbHkgZ2V0cyBjYWxsZWQgY29ycmVjdGx5LlxuICAgICAgICAgIHdyYXBSZXF1ZXN0UHJvbWlzZTogd3JhcFFQcm9taXNlLFxuICAgICAgICAgIHdyYXBTdGF0aWNSZXF1ZXN0UHJvbWlzZTogd3JhcFFQcm9taXNlXG4gICAgICAgIH0sICduZ0Zvcm1pb1Byb21pc2VXcmFwcGVyJyk7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IG9mZmxpbmUgZXZlbnRzIGZyb20gJHJvb3RTY29wZVxuICAgICAgICBGb3JtaW8uZXZlbnRzLm9uQW55KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBldmVudCA9ICdmb3JtaW8uJyArIHRoaXMuZXZlbnQ7XG4gICAgICAgICAgdmFyIGFyZ3MgPSBbXS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgIGFyZ3MudW5zaGlmdChldmVudCk7XG4gICAgICAgICAgJHJvb3RTY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QuYXBwbHkoJHJvb3RTY29wZSwgYXJncyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgZm9ybWlvIGludGVyZmFjZS5cbiAgICAgICAgcmV0dXJuIEZvcm1pbztcbiAgICAgIH1cbiAgICBdXG4gIH07XG59O1xuIl19