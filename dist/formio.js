/*! ng-formio v2.10.4 | https://unpkg.com/ng-formio@2.10.4/LICENSE.txt */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.formio = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
      conf.verboseMemoryLeak && (this.verboseMemoryLeak = conf.verboseMemoryLeak);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    } else {
      this._events.maxListeners = defaultMaxListeners;
    }
  }

  function logPossibleMemoryLeak(count, eventName) {
    var errorMsg = '(node) warning: possible EventEmitter memory ' +
        'leak detected. %d listeners added. ' +
        'Use emitter.setMaxListeners() to increase limit.';

    if(this.verboseMemoryLeak){
      errorMsg += ' Event name: %s.';
      console.error(errorMsg, count, eventName);
    } else {
      console.error(errorMsg, count);
    }

    if (console.trace){
      console.trace();
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    this.verboseMemoryLeak = false;
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
            logPossibleMemoryLeak.call(this, tree._listeners.length, name);
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
        logPossibleMemoryLeak.call(this, this._events[type].length, type);
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

},{}],2:[function(_dereq_,module,exports){
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
   * Checks the conditions for a provided component and data.
   *
   * @param component
   *   The component to check for the condition.
   * @param row
   *   The data within a row
   * @param data
   *   The full submission data.
   *
   * @returns {boolean}
   */
  checkCondition: function(component, row, data) {
    if (component.hasOwnProperty('customConditional') && component.customConditional) {
      try {
        var script = '(function() { var show = true;';
        script += component.customConditional.toString();
        script += '; return show; })()';
        var result = eval(script);
        return result.toString() === 'true';
      }
      catch (e) {
        console.warn('An error occurred in a custom conditional statement for component ' + component.key, e);
        return true;
      }
    }
    else if (component.hasOwnProperty('conditional') && component.conditional && component.conditional.when) {
      var cond = component.conditional;
      var value = null;
      if (row) {
        value = this.getValue({data: row}, cond.when);
      }
      if (data && (value === null || typeof value === 'undefined')) {
        value = this.getValue({data: data}, cond.when);
      }
      if (value === null || typeof value === 'undefined') {
        value = component.hasOwnProperty('defaultValue') ? component.defaultValue : '';
      }
      // Special check for selectboxes component.
      if (typeof value === 'object' && value.hasOwnProperty(cond.eq)) {
        return value[cond.eq].toString() === cond.show.toString();
      }
      return (value.toString() === cond.eq.toString()) === (cond.show.toString() === 'true');
    }

    // Default to show.
    return true;
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

      if (!data) {
        return null;
      }

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
    var method = (this[_id] || data._id) ? 'put' : 'post';
    var reqUrl = this[_id] ? this[_url] : this[type + 'sUrl'];
    if (!this[_id] && data._id && (method === 'put')) {
      reqUrl += '/' + data._id;
    }
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
        return Formio.request(url, method, data, opts.header, opts);
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

Formio.prototype.uploadFile = function(storage, file, fileName, dir, progressCallback, url) {
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
              return provider.uploadFile(file, fileName, dir, progressCallback, url);
            }
            else {
              throw('Storage provider not found');
            }
          }
          return result || {url: ''};
        }.bind(this));
    }.bind(this));

  return pluginAlter('wrapFileRequestPromise', request, requestArgs);
};

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
};

Formio.makeStaticRequest = function(url, method, data, opts) {
  method = (method || 'GET').toUpperCase();
  if(!opts || typeof opts !== 'object') {
    opts = {};
  }
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
        return Formio.request(url, method, data, opts.header, opts);
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

/**
 * Make a formio request, using the current token.
 *
 * @param url
 * @param method
 * @param data
 * @param header
 * @param {Boolean} ignoreCache
 *   Whether or not to use the cache.
 * @returns {*}
 */
Formio.request = function(url, method, data, header, opts) {
  if (!url) {
    return Promise.reject('No url provided');
  }
  method = (method || 'GET').toUpperCase();

  // For reverse compatibility, if they provided the ignoreCache parameter,
  // then change it back to the options format where that is a parameter.
  if (typeof opts === 'boolean') {
    opts = {ignoreCache: opts};
  }
  if(!opts || typeof opts !== 'object') {
    opts = {};
  }

  var cacheKey = btoa(url);

  return new Promise(function(resolve, reject) {
    // Get the cached promise to save multiple loads.
    if (!opts.ignoreCache && method === 'GET' && cache.hasOwnProperty(cacheKey)) {
      return resolve(cache[cacheKey]);
    }

    resolve(new Promise(function(resolve, reject) {
      // Set up and fetch request
      var headers = header || new Headers({
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
      if (!response.ok) {
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

      // Handle fetch results
      var token = response.headers.get('x-jwt-token');
      if (response.status >= 200 && response.status < 300 && token && token !== '') {
        Formio.setToken(token);
      }
      // 204 is no content. Don't try to .json() it.
      if (response.status === 204) {
        return {};
      }
      return (response.headers.get('content-type').indexOf('application/json') !== -1
        ? response.json()
        : response.text()
      ).then(function(result) {
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

        if (!opts.getHeaders) {
          return result;
        }

        var headers = {};
        response.headers.forEach(function(item, key) {
          headers[key] = item;
        });

        return new Promise(function(resolve, reject) {
          resolve({result: result, headers: headers});
        });
      });
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
  return Formio.currentUser(); // Run this so user is updated if null
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

/**
 * Attach an HTML form to Form.io.
 *
 * @param form
 */
Formio.form = function(form, options, done) {
  // Fix the parameters.
  if (!done && typeof options === 'function') {
    done = options;
    options = {};
  }

  done = done || (function() { console.log(arguments); });
  options = options || {};

  // IF they provide a jquery object, then select the element.
  if (form.jquery) { form = form[0]; }
  if (!form) {
    return done('Invalid Form');
  }

  var getAction = function() {
    return options.form || form.getAttribute('action');
  };

  /**
   * Returns the current submission object.
   * @returns {{data: {}}}
   */
  var getSubmission = function() {
    var submission = {data: {}};
    var setValue = function(path, value) {
      var paths = path.replace(/\[|\]\[/g, '.').replace(/\]$/g, '').split('.');
      var current = submission;
      while (path = paths.shift()) {
        if (!paths.length) {
          current[path] = value;
        }
        else {
          if (!current[path]) {
            current[path] = {};
          }
          current = current[path];
        }
      }
    };

    // Get the form data from this form.
    var formData = new FormData(form);
    var entries = formData.entries();
    var entry = null;
    while (entry = entries.next().value) {
      setValue(entry[0], entry[1]);
    }
    return submission;
  };

  // Submits the form.
  var submit = function(event) {
    if (event) {
      event.preventDefault();
    }
    var action = getAction();
    if (!action) {
      return;
    }
    (new Formio(action)).saveSubmission(getSubmission()).then(function(sub) {
      done(null, sub);
    }, done);
  };

  // Attach formio to the provided form.
  if (form.attachEvent) {
    form.attachEvent('submit', submit);
  } else {
    form.addEventListener('submit', submit);
  }

  return {
    submit: submit,
    getAction: getAction,
    getSubmission: getSubmission
  };
};

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

},{"./providers":4,"eventemitter2":1,"native-promise-only":11,"shallow-copy":12,"whatwg-fetch":13}],4:[function(_dereq_,module,exports){
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
        var token = false;
        try {
          token = localStorage.getItem('formioToken');
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
      var token = false;
      try {
        token = localStorage.getItem('formioToken');
      }
      catch (e) {
        // Swallow error.
      }
      file.url = formio.formUrl + '/storage/dropbox?path_lower=' + file.path_lower + (token ? '&x-jwt-token=' + token : '');
      return Promise.resolve(file);
    }
  };
};

dropbox.title = 'Dropbox';
dropbox.name = 'dropbox';
module.exports = dropbox;



},{"native-promise-only":11}],6:[function(_dereq_,module,exports){
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
        var token = false;
        try {
          token = localStorage.getItem('formioToken');
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

},{"native-promise-only":11}],8:[function(_dereq_,module,exports){
var Promise = _dereq_("native-promise-only");
var Formio  = _dereq_("../../formio");
var url = function(formio) {
  return {
    title: 'Url',
    name: 'url',
    uploadFile: function(file, fileName, dir, progressCallback, url) {
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
              url: xhr.responseURL + '/' + fileName,
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

        xhr.open('POST', url);
        xhr.setRequestHeader('x-jwt-token', Formio.getToken());
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

},{"../../formio":3,"native-promise-only":11}],9:[function(_dereq_,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used to compose bitmasks for comparison styles. */
var UNORDERED_COMPARE_FLAG = 1,
    PARTIAL_COMPARE_FLAG = 2;

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array ? array.length : 0,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array ? array.length : 0;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    Uint8Array = root.Uint8Array,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView'),
    Map = getNative(root, 'Map'),
    Promise = getNative(root, 'Promise'),
    Set = getNative(root, 'Set'),
    WeakMap = getNative(root, 'WeakMap'),
    nativeCreate = getNative(Object, 'create');

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values ? values.length : 0;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  this.__data__ = new ListCache(entries);
}

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
}

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  return this.__data__['delete'](key);
}

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var cache = this.__data__;
  if (cache instanceof ListCache) {
    var pairs = cache.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      return this;
    }
    cache = this.__data__ = new MapCache(pairs);
  }
  cache.set(key, value);
  return this;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  // Safari 9 makes `arguments.length` enumerable in strict mode.
  var result = (isArray(value) || isArguments(value))
    ? baseTimes(value.length, String)
    : [];

  var length = result.length,
      skipIndexes = !!length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.forEach` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

/**
 * The base implementation of `_.filter` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function baseFilter(collection, predicate) {
  var result = [];
  baseEach(collection, function(value, index, collection) {
    if (predicate(value, index, collection)) {
      result.push(value);
    }
  });
  return result;
}

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * The base implementation of `getTag`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  return objectToString.call(value);
}

/**
 * The base implementation of `_.hasIn` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {boolean} [bitmask] The bitmask of comparison flags.
 *  The bitmask may be composed of the following flags:
 *     1 - Unordered comparison
 *     2 - Partial comparison
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, customizer, bitmask, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
}

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual`
 *  for more details.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = arrayTag,
      othTag = arrayTag;

  if (!objIsArr) {
    objTag = getTag(object);
    objTag = objTag == argsTag ? objectTag : objTag;
  }
  if (!othIsArr) {
    othTag = getTag(other);
    othTag = othTag == argsTag ? objectTag : othTag;
  }
  var objIsObj = objTag == objectTag && !isHostObject(object),
      othIsObj = othTag == objectTag && !isHostObject(other),
      isSameTag = objTag == othTag;

  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack);
    return (objIsArr || isTypedArray(object))
      ? equalArrays(object, other, equalFunc, customizer, bitmask, stack)
      : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
  }
  if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new Stack);
      return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack);
  return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
}

/**
 * The base implementation of `_.isMatch` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Object} source The object of property values to match.
 * @param {Array} matchData The property names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparisons.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var stack = new Stack;
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === undefined
            ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack)
            : result
          )) {
        return false;
      }
    }
  }
  return true;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
}

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == 'object') {
    return isArray(value)
      ? baseMatchesProperty(value[0], value[1])
      : baseMatches(value);
  }
  return property(value);
}

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (isKey(path) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn(object, path)
      : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
  };
}

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return baseGet(object, path);
  };
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length,
        index = fromRight ? length : -1,
        iterable = Object(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} customizer The function to customize comparisons.
 * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
 *  for more details.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
  var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(array);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var index = -1,
      result = true,
      seen = (bitmask & UNORDERED_COMPARE_FLAG) ? new SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!arraySome(other, function(othValue, othIndex) {
            if (!seen.has(othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
              return seen.add(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, customizer, bitmask, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} customizer The function to customize comparisons.
 * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
 *  for more details.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag:
    case dateTag:
    case numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = mapToArray;

    case setTag:
      var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
      convert || (convert = setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= UNORDERED_COMPARE_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} customizer The function to customize comparisons.
 * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
 *  for more details.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
  var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
      objProps = keys(object),
      objLength = objProps.length,
      othProps = keys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(object);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11,
// for data views in Edge < 14, and promises in Node.js.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = objectToString.call(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : undefined;

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = isKey(path, object) ? [path] : castPath(path);

  var result,
      index = -1,
      length = path.length;

  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result) {
    return result;
  }
  var length = object ? object.length : 0;
  return !!length && isLength(length) && isIndex(key, length) &&
    (isArray(object) || isArguments(object));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

/**
 * A specialized version of `matchesProperty` for source values suitable
 * for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue &&
      (srcValue !== undefined || (key in Object(object)));
  };
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Iterates over elements of `collection`, returning an array of all elements
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * **Note:** Unlike `_.remove`, this method returns a new array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity]
 *  The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 * @see _.reject
 * @example
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': true },
 *   { 'user': 'fred',   'age': 40, 'active': false }
 * ];
 *
 * _.filter(users, function(o) { return !o.active; });
 * // => objects for ['fred']
 *
 * // The `_.matches` iteratee shorthand.
 * _.filter(users, { 'age': 36, 'active': true });
 * // => objects for ['barney']
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.filter(users, ['active', false]);
 * // => objects for ['fred']
 *
 * // The `_.property` iteratee shorthand.
 * _.filter(users, 'active');
 * // => objects for ['barney']
 */
function filter(collection, predicate) {
  var func = isArray(collection) ? arrayFilter : baseFilter;
  return func(collection, baseIteratee(predicate, 3));
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

/**
 * Checks if `path` is a direct or inherited property of `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.hasIn(object, 'a');
 * // => true
 *
 * _.hasIn(object, 'a.b');
 * // => true
 *
 * _.hasIn(object, ['a', 'b']);
 * // => true
 *
 * _.hasIn(object, 'b');
 * // => false
 */
function hasIn(object, path) {
  return object != null && hasPath(object, path, baseHasIn);
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
}

module.exports = filter;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(_dereq_,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(_dereq_,module,exports){
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
},{}],12:[function(_dereq_,module,exports){
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

},{}],13:[function(_dereq_,module,exports){
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

},{}],14:[function(_dereq_,module,exports){
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
          if ($scope.builder) return;
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
          clearOnHide: true,
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
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" ng-class=\"{'field-required': isRequired(component)}\">{{ component.label | formioTranslate:null:builder }}</label>\n<span ng-if=\"!component.label && isRequired(component)\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select ng-model=\"data[component.key]\" safe-multiple-to-single ng-disabled=\"readOnly\" ng-required=\"isRequired(component)\" id=\"{{ componentId }}\" name=\"{{ componentId }}\" tabindex=\"{{ component.tabindex || 0 }}\" theme=\"bootstrap\">\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\">{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"address in addresses\" refresh=\"refreshAddress($select.search)\" refresh-delay=\"500\">\n    <div ng-bind-html=\"address.formatted_address | highlight: $select.search\"></div>\n  </ui-select-choices>\n</ui-select>\n<formio-errors ng-if=\"::!builder\"></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/address-multiple.html',
        $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
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
          if ($scope.builder) return;
          var settings = $scope.component;
          $scope.getButtonType = function() {
            switch (settings.action) {
              case 'submit':
                return 'submit';
              case 'reset':
                return 'reset';
              case 'event':
              case 'oauth':
              default:
                return 'button';
            }
          };

          var onClick = function() {
            switch (settings.action) {
              case 'submit':
                return;
              case 'event':
                $scope.$emit($scope.component.event, $scope.data);
                break;
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
        "<button type=\"{{ getButtonType() }}\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  ng-class=\"{'btn-block': component.block}\"\n  class=\"btn btn-{{ component.theme }} btn-{{ component.size }}\"\n  ng-disabled=\"readOnly || formioForm.submitting || (component.disableOnInvalid && formioForm.$invalid)\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-click=\"$emit('buttonClick', component, componentId)\">\n  <span ng-if=\"component.leftIcon\" class=\"{{ component.leftIcon }}\" aria-hidden=\"true\"></span>\n  <span ng-if=\"component.leftIcon && component.label\">&nbsp;</span>{{ component.label | formioTranslate:null:builder }}<span ng-if=\"component.rightIcon && component.label\">&nbsp;</span>\n  <span ng-if=\"component.rightIcon\" class=\"{{ component.rightIcon }}\" aria-hidden=\"true\"></span>\n   <i ng-if=\"component.action == 'submit' && formioForm.submitting\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\n</button>\n"
      );

      $templateCache.put('formio/componentsView/button.html',
        ""
      );
    }
  ]);
};

},{}],16:[function(_dereq_,module,exports){
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
          if ($scope.builder) return;
          // FA-850 - Ensure the checked value is always a boolean object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            var boolean = {
              true: true,
              false: false
            };
            if ($scope.data && $scope.data.hasOwnProperty($scope.component.key) && !($scope.data[$scope.component.key] instanceof Boolean)) {
              if ($scope.component.validate && $scope.component.validate.required && !$scope.data[$scope.component.key]) {
                delete $scope.data[$scope.component.key];
              }
              else {
                $scope.data[$scope.component.key] = boolean[$scope.data[$scope.component.key]] || false;
              }
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
          datagridLabel: true,
          key: 'checkboxField',
          defaultValue: false,
          protected: false,
          persistent: true,
          clearOnHide: true,
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
        "<div class=\"checkbox\">\n  <label for=\"{{ componentId }}\" ng-class=\"{'field-required': isRequired(component)}\">\n    <input\n      type=\"{{ component.inputType }}\"\n      id=\"{{ componentId }}\"\n      tabindex=\"{{ component.tabindex || 0 }}\"\n      ng-disabled=\"readOnly\"\n      ng-model=\"data[component.key]\"\n      ng-required=\"isRequired(component)\"\n    >\n    <span ng-if=\"!(component.hideLabel && component.datagridLabel === false)\">{{ component.label | formioTranslate:null:builder }}</span>\n  </label>\n</div>\n<div ng-if=\"!!component.description\" class=\"help-block\">\n  <span>{{ component.description }}</span>\n</div>\n"
      );
    }
  ]);
};

},{}],17:[function(_dereq_,module,exports){
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
          key: 'columns',
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
        "<div class=\"row\">\n  <div class=\"col-sm-6\" ng-repeat=\"column in component.columns track by $index\">\n    <formio-component\n      ng-repeat=\"_component in column.components track by $index\"\n      component=\"_component\"\n      data=\"data\"\n      formio=\"formio\"\n      submission=\"submission\"\n      hide-components=\"hideComponents\"\n      ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n      formio-form=\"formioForm\"\n      read-only=\"isDisabled(_component, data)\"\n      grid-row=\"gridRow\"\n      grid-col=\"gridCol\"\n      builder=\"builder\"\n    ></formio-component>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/columns.html',
        "<div class=\"row\">\n  <div class=\"col-sm-6\" ng-repeat=\"column in component.columns track by $index\">\n    <formio-component-view\n      ng-repeat=\"_component in column.components track by $index\"\n      component=\"_component\"\n      data=\"data\"\n      form=\"form\"\n      submission=\"submission\"\n      ignore=\"ignore\"\n      ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n      builder=\"builder\"\n    ></formio-component-view>\n  </div>\n</div>\n"
      );
    }
  ]);
};

},{}],18:[function(_dereq_,module,exports){
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

},{}],19:[function(_dereq_,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('container', {
        title: 'Container',
        template: 'formio/components/container.html',
        viewTemplate: 'formio/componentsView/container.html',
        group: 'advanced',
        icon: 'fa fa-folder-open',
        tableView: function(data, component, $interpolate, componentInfo) {
          var view = '<table class="table table-striped table-bordered"><thead><tr>';
          angular.forEach(component.components, function(component) {
            view += '<th>' + component.label + '</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          view += '<tr>';
          angular.forEach(component.components, function(component) {
            var info = componentInfo.components.hasOwnProperty(component.type) ? componentInfo.components[component.type] : {};
            if (info.tableView) {
              view += '<td>' +
                info.tableView(
                  data && component.key && data.hasOwnProperty(component.key) ? data[component.key] : '',
                  component,
                  $interpolate,
                  componentInfo
                ) + '</td>';
              return;
            }

            view += '<td>';
            if (component.prefix) {
              view += component.prefix;
            }
            view += data && component.key && data.hasOwnProperty(component.key) ? data[component.key] : '';
            if (component.suffix) {
              view += ' ' + component.suffix;
            }
            view += '</td>';
          });
          view += '</tr>';
          view += '</tbody></table>';
          return view;
        },
        settings: {
          input: true,
          tree: true,
          components: [],
          tableView: true,
          label: '',
          key: 'container',
          protected: false,
          persistent: true,
          clearOnHide: true
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
        "<div ng-controller=\"formioContainerComponent\" class=\"formio-container-component\">\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data[parentKey]\"\n    formio=\"formio\"\n    submission=\"submission\"\n    hide-components=\"hideComponents\"\n    ng-if=\"builder ? '::true' : isVisible(_component, data[parentKey])\"\n    formio-form=\"formioForm\"\n    read-only=\"isDisabled(_component, data[parentKey])\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    builder=\"builder\"\n  ></formio-component>\n</div>\n"
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
      formioComponentsProvider.register('content', {
        title: 'Content',
        template: 'formio/components/content.html',
        settings: {
          key: 'content',
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
        "<div ng-bind-html=\"component.html | safehtml | formioTranslate:component.key:builder\" id=\"{{ component.key }}\"></div>\n"
      );
    }
  ]);
};

},{}],21:[function(_dereq_,module,exports){
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
        if (scope.builder) return;
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
          clearOnHide: true,
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
        "<input\n  type=\"{{ component.inputType }}\"\n  class=\"form-control\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-model=\"data[component.key]\"\n  ng-required=\"isRequired(component)\"\n  ng-disabled=\"readOnly\"\n  safe-multiple-to-single\n  placeholder=\"{{ component.placeholder }}\"\n  custom-validator=\"component.validate.custom\"\n  currency-input\n  ui-mask-placeholder=\"\"\n  ui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],22:[function(_dereq_,module,exports){
"use strict";

var GridUtils = _dereq_('../factories/GridUtils')();

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('custom', {
        title: 'Custom',
        template: 'formio/components/custom.html',
        group: 'advanced',
        settings: {},
        tableView: GridUtils.generic
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

},{"../factories/GridUtils":60}],23:[function(_dereq_,module,exports){
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
          persistent: true,
          clearOnHide: true
        }
      });
    }
  ]);
  app.controller('formioDataGrid', [
    '$scope',
    'FormioUtils',
    function($scope, FormioUtils) {
      if ($scope.builder) return;
      // Ensure each data grid has a valid data model.
      $scope.data = $scope.data || {};
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [{}];

      // Determine if any component is visible.
      $scope.anyVisible = function(component) {
        var data = $scope.data[$scope.component.key];
        var visible = false;
        angular.forEach(data, function(rowData) {
          visible = (visible || FormioUtils.isVisible(component, rowData));
        });
        return visible;
      };

      // Pull out the rows and cols for easy iteration.
      $scope.rows = $scope.data[$scope.component.key];
      // If less than minLength, add that many rows.
      if ($scope.component.validate && $scope.component.validate.hasOwnProperty('minLength') && $scope.rows.length < $scope.component.validate.minLength) {
        var toAdd = $scope.component.validate.minLength - $scope.rows.length;
        for (var i = 0; i < toAdd; i++) {
          $scope.rows.push({});
        }
      }
      // If more than maxLength, remove extra rows.
      if ($scope.component.validate && $scope.component.validate.hasOwnProperty('maxLength') && $scope.rows.length < $scope.component.validate.maxLength) {
        $scope.rows = $scope.rows.slice(0, $scope.component.validate.maxLength);
      }
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
        "<div class=\"formio-data-grid\" ng-controller=\"formioDataGrid\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table datagrid-table\">\n    <tr>\n      <th\n        ng-repeat=\"col in cols track by $index\"\n        ng-class=\"{'field-required': col.validate.required}\"\n        ng-if=\"builder ? '::true' : anyVisible(col)\"\n      >{{ col.label | formioTranslate:null:builder }}</th>\n    </tr>\n    <tr ng-repeat=\"row in rows track by $index\" ng-init=\"rowIndex = $index\">\n      <td ng-repeat=\"col in cols track by $index\" ng-init=\"col.hideLabel = true; colIndex = $index\" class=\"formio-data-grid-row\" ng-if=\"builder ? '::true' : anyVisible(col)\">\n        <formio-component\n          component=\"col\"\n          data=\"rows[rowIndex]\"\n          formio-form=\"formioForm\"\n          formio=\"formio\"\n          submission=\"submission\"\n          hide-components=\"hideComponents\"\n          ng-if=\"builder ? '::true' : isVisible(col, row)\"\n          read-only=\"isDisabled(col, row)\"\n          grid-row=\"rowIndex\"\n          grid-col=\"colIndex\"\n          builder=\"builder\"\n        ></formio-component>\n      </td>\n      <td ng-if=\"!component.hasOwnProperty('validate') || !component.validate.hasOwnProperty('minLength') || rows.length > component.validate.minLength\">\n        <a ng-click=\"removeRow(rowIndex)\" class=\"btn btn-default\">\n          <span class=\"glyphicon glyphicon-remove-circle\"></span>\n        </a>\n      </td>\n    </tr>\n  </table>\n  <div class=\"datagrid-add\" ng-if=\"!component.hasOwnProperty('validate') || !component.validate.hasOwnProperty('maxLength') || rows.length < component.validate.maxLength\">\n    <a ng-click=\"addRow()\" class=\"btn btn-primary\">\n      <span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> {{ component.addAnother || \"Add Another\" | formioTranslate:null:builder }}\n    </a>\n  </div>\n</div>\n"
      ));
    }
  ]);
};

},{}],24:[function(_dereq_,module,exports){
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
          if ($scope.builder) return;

          var dateValue = function() {
            // If the date is set, then return the true date value.
            if ($scope.data[$scope.component.key]) {
              return ($scope.data[$scope.component.key] instanceof Date) ? $scope.data[$scope.component.key] : new Date($scope.data[$scope.component.key]);
            }

            // See if a default date is set.
            if ($scope.component.defaultDate) {
              var defaultDate = new Date($scope.component.defaultDate);
              if (!defaultDate || isNaN(defaultDate.getDate())) {
                try {
                  defaultDate = new Date(eval($scope.component.defaultDate));
                }
                catch (e) {
                  defaultDate = '';
                }
              }

              if (defaultDate && !isNaN(defaultDate.getDate())) {
                return defaultDate;
              }
            }

            // Default to empty.
            return '';
          };

          // Ensure the date value is always a date object when loaded, then unbind the watch.
          var loadComplete = $scope.$watch('data.' + $scope.component.key, function() {
            if (!$scope.data) {
              return;
            }
            var valueSet = !!$scope.data[$scope.component.key];
            $scope.data[$scope.component.key] = dateValue();
            if (valueSet) {
              loadComplete();
            }
          });

          // If they have 12 hour time enabled, we need to ensure that we see the meridian in the format.
          if (
            $scope.component.enableTime &&
            $scope.component.timePicker &&
            $scope.component.timePicker.showMeridian &&
            ($scope.component.format.indexOf('mm') !== -1) &&
            ($scope.component.format.indexOf('a') === -1)
          ) {
            $scope.component.format += ' a';
          }

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
          format: 'yyyy-MM-dd HH:mm a',
          enableDate: true,
          enableTime: true,
          defaultDate: '',
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
          clearOnHide: true,
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
        "<div class=\"input-group\">\n  <input\n    type=\"text\"\n    class=\"form-control\"\n    name=\"{{ componentId }}\"\n    id=\"{{ componentId }}\"\n    ng-focus=\"calendarOpen = autoOpen\"\n    ng-click=\"calendarOpen = true\"\n    ng-init=\"calendarOpen = false\"\n    ng-disabled=\"readOnly\"\n    ng-required=\"isRequired(component)\"\n    is-open=\"calendarOpen\"\n    datetime-picker=\"{{ component.format }}\"\n    min-date=\"component.minDate\"\n    max-date=\"component.maxDate\"\n    datepicker-mode=\"component.datepickerMode\"\n    when-closed=\"onClosed()\"\n    custom-validator=\"component.validate.custom\"\n    enable-date=\"component.enableDate\"\n    enable-time=\"component.enableTime\"\n    ng-model=\"data[component.key]\"\n    tabindex=\"{{ component.tabindex || 0 }}\"\n    placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\"\n    datepicker-options=\"component.datePicker\"\n    timepicker-options=\"component.timePicker\"\n  />\n  <span class=\"input-group-btn\">\n    <button type=\"button\" ng-disabled=\"readOnly\" class=\"btn btn-default\" ng-click=\"calendarOpen = true\">\n      <i ng-if=\"component.enableDate\" class=\"glyphicon glyphicon-calendar\"></i>\n      <i ng-if=\"!component.enableDate\" class=\"glyphicon glyphicon-time\"></i>\n    </button>\n  </span>\n</div>\n"
      ));
    }
  ]);
};

},{}],25:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.directive('dayPart', function() {
    return {
      restrict: 'A',
      replace: true,
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
        if (scope.builder) return;
        var limitLength = attrs.characters || 2;
        scope.$watch(attrs.ngModel, function() {
          if (!ngModel.$viewValue) {
            return;
          }
          var render = false;
          if (ngModel.$viewValue.length > limitLength) {
            ngModel.$setViewValue(ngModel.$viewValue.substring(0, limitLength));
            render = true;
          }
          if (isNaN(ngModel.$viewValue)) {
            ngModel.$setViewValue(ngModel.$viewValue.replace(/\D/g,''));
            render = true;
          }
          if (
            parseInt(ngModel.$viewValue) < parseInt(attrs.min) ||
            parseInt(ngModel.$viewValue) > parseInt(attrs.max)
          ) {
            ngModel.$setViewValue(ngModel.$viewValue.substring(0, limitLength - 1));
            render = true;
          }
          if (render) {
            ngModel.$render();
          }
        });
      }
    };
  });
  app.directive('dayInput', function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        componentId: '=',
        readOnly: '=',
        ngModel: '=',
        gridRow: '=',
        gridCol: '=',
        builder: '=?'
      },
      templateUrl: 'formio/components/day-input.html',
      controller: ['$scope', function($scope) {
        if ($scope.builder) return;
        $scope.months = [
          {value: '', label: $scope.component.fields.month.placeholder},
          {value: '01', label: 'January'},
          {value: '02', label: 'February'},
          {value: '03', label: 'March'},
          {value: '04', label: 'April'},
          {value: '05', label: 'May'},
          {value: '06', label: 'June'},
          {value: '07', label: 'July'},
          {value: '08', label: 'August'},
          {value: '09', label: 'September'},
          {value: '10', label: 'October'},
          {value: '11', label: 'November'},
          {value: '12', label: 'December'}
        ];

        $scope.date = {
          day: '',
          month: '',
          year: ''
        };
      }],
      link: function(scope, elem, attrs, ngModel) {
        if (scope.builder) return;
        // Set the scope values based on the current model.
        scope.$watch('ngModel', function() {
          // Only update on load.
          if (ngModel.$viewValue && !ngModel.$dirty) {
            var parts = typeof ngModel.$viewValue === 'string'
              ? ngModel.$viewValue.split('/')
              : ngModel.$viewValue;
            if ((parts instanceof Array) && parts.length === 3) {
              scope.date.day = parts[(scope.component.dayFirst ? 0 : 1)];
              scope.date.month = parts[(scope.component.dayFirst ? 1 : 0)];
              scope.date.year = parts[2];
            }
          }
        });

        var padLeft = function padLeft(nr, n, str) {
          nr = nr.toString();
          if (nr.length > n) {
            return nr.substr(0, n);
          }

          return Array((n - nr.length) + 1).join(str || '0') + nr;
        };

        scope.onChange = function() {
          var day = padLeft(scope.date.day, 2);
          var month = padLeft(scope.date.month, 2);
          var year = padLeft(scope.date.year, 4);
          var value = scope.component.dayFirst ? day : month;
          value += '/';
          value += scope.component.dayFirst ? month : day;
          value += '/' + year;
          ngModel.$setViewValue(value);
        };

        ngModel.$validators.day = function(modelValue, viewValue) {
          var value = modelValue || viewValue;
          var required = scope.component.fields.day.required || scope.component.fields.month.required || scope.component.fields.year.required;

          if (!required) {
            return true;
          }
          if (!value && required) {
            return false;
          }
          var parts = value.split('/');
          if (scope.component.fields.day.required) {
            if (parts[(scope.component.dayFirst ? 0 : 1)] === '00') {
              return false;
            }
          }
          if (scope.component.fields.month.required) {
            if (parts[(scope.component.dayFirst ? 1 : 0)] === '00') {
              return false;
            }
          }
          if (scope.component.fields.year.required) {
            if (parts[2] === '0000') {
              return false;
            }
          }
          return true;
        };
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('day', {
        title: 'Day',
        template: 'formio/components/day.html',
        group: 'advanced',
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'dayField',
          fields: {
            day: {
              type: 'text',
              placeholder: '',
              required: false
            },
            month: {
              type: 'select',
              placeholder: '',
              required: false
            },
            year: {
              type: 'text',
              placeholder: '',
              required: false
            }
          },
          dayFirst: false,
          protected: false,
          persistent: true,
          clearOnHide: true,
          validate: {
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
      $templateCache.put('formio/components/day.html', FormioUtils.fieldWrap(
        "<div class=\"day-input\">\n  <day-input\n    name=\"{{componentId}}\"\n    component-id=\"componentId\"\n    read-only=\"isDisabled(component, data)\"\n    component=\"component\"\n    ng-required=\"isRequired(component)\"\n    custom-validator=\"component.validate.custom\"\n    ng-model=\"data[component.key]\"\n    tabindex=\"{{ component.tabindex || 0 }}\"\n    builder=\"builder\"\n  ></day-input>\n</div>\n"
      ));
      $templateCache.put('formio/components/day-input.html',
        "<div class=\"daySelect form row\">\n  <div class=\"form-group col-xs-3\" ng-if=\"component.dayFirst && !component.fields.day.hide\">\n    <label for=\"{{componentId}}-day\" ng-class=\"{'field-required': component.fields.day.required}\">{{ \"Day\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-day\"\n      ng-model=\"date.day\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.day.placeholder}}\"\n      day-part\n      characters=\"2\"\n      min=\"0\"\n      max=\"31\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n  <div class=\"form-group col-xs-4\" ng-if=\"!component.fields.month.hide\">\n    <label for=\"{{componentId}}-month\" ng-class=\"{'field-required': component.fields.month.required}\">{{ \"Month\" | formioTranslate:null:builder }}</label>\n    <select\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-month\"\n      ng-model=\"date.month\"\n      ng-change=\"onChange()\"\n      ng-disabled=\"readOnly\"\n      ng-options=\"month.value as month.label for month in months\"\n    ></select>\n  </div>\n  <div class=\"form-group col-xs-3\" ng-if=\"!component.dayFirst && !component.fields.day.hide\">\n    <label for=\"{{componentId}}-day\" ng-class=\"{'field-required': component.fields.day.required}\">{{ \"Day\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-day1\"\n      ng-model=\"date.day\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.day.placeholder}}\"\n      day-part\n      characters=\"2\"\n      min=\"0\"\n      max=\"31\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n  <div class=\"form-group col-xs-5\" ng-if=\"!component.fields.year.hide\">\n    <label for=\"{{componentId}}-year\" ng-class=\"{'field-required': component.fields.year.required}\">{{ \"Year\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-year\"\n      ng-model=\"date.year\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.year.placeholder}}\"\n      characters=\"4\"\n      min=\"0\"\n      max=\"2100\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n</div>\n"
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
          clearOnHide: true,
          kickbox: {
            enabled: false
          }
        }
      });
    }
  ]);
};

},{}],27:[function(_dereq_,module,exports){
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
          key: 'fieldset',
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
        "<fieldset id=\"{{ component.key }}\">\n  <legend ng-if=\"component.legend\">{{ component.legend | formioTranslate:null:builder }}</legend>\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    formio=\"formio\"\n    submission=\"submission\"\n    hide-components=\"hideComponents\"\n    ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n    read-only=\"isDisabled(_component, data)\"\n    formio-form=\"formioForm\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    builder=\"builder\"\n  ></formio-component>\n</fieldset>\n"
      );

      $templateCache.put('formio/componentsView/fieldset.html',
        "<fieldset id=\"{{ component.key }}\">\n  <legend ng-if=\"component.legend\">{{ component.legend }}</legend>\n  <formio-component-view\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    submission=\"submission\"\n    form=\"form\"\n    ignore=\"ignore\"\n    ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n    builder=\"builder\"\n  ></formio-component-view>\n</fieldset>\n"
      );
    }
  ]);
};

},{}],28:[function(_dereq_,module,exports){
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
          image: false,
          imageSize: '200',
          placeholder: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true,
          clearOnHide: true
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
          if ($scope.builder) return;
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

  app.directive('formioImageList', [function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        files: '=',
        form: '=',
        width: '=',
        readOnly: '='
      },
      templateUrl: 'formio/components/formio-image-list.html',
      controller: [
        '$scope',
        function($scope) {
          if ($scope.builder) return;
          $scope.removeFile = function(event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
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
          if ($scope.builder) return;
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
        form: '=',
        width: '='
      },
      template: '<img ng-src="{{ imageSrc }}" alt="{{ file.name }}" ng-style="{width: width}" />',
      controller: [
        '$rootScope',
        '$scope',
        'Formio',
        function(
          $rootScope,
          $scope,
          Formio
        ) {
          if ($scope.builder) return;
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
      if ($scope.builder) return;
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
            var formio = null;
            if ($scope.formio) {
              formio = $scope.formio;
            }
            else {
              $scope.fileUploads[fileName].status = 'error';
              $scope.fileUploads[fileName].message = 'File Upload URL not provided.';
            }

            if (formio) {
              formio.uploadFile($scope.component.storage, file, fileName, dir, function processNotify(evt) {
                $scope.fileUploads[fileName].status = 'progress';
                $scope.fileUploads[fileName].progress = parseInt(100.0 * evt.loaded / evt.total);
                delete $scope.fileUploads[fileName].message;
                $scope.$apply();
              }, $scope.component.url)
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
            }
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
      $templateCache.put('formio/components/formio-image-list.html',
        "<div>\n  <span ng-repeat=\"file in files track by $index\" ng-if=\"file\">\n    <formio-image file=\"file\" form=\"form\" width=\"width\"></formio-image>\n    <span ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\">\n      <a href=\"#\" ng-click=\"removeFile($event, $index)\" style=\"padding: 2px 4px;\" class=\"btn btn-sm btn-default\"><span class=\"glyphicon glyphicon-remove\"></span></a>\n    </span>\n  </span>\n</div>\n"
      );

      $templateCache.put('formio/components/formio-file-list.html',
        "<table class=\"table table-striped table-bordered\">\n  <thead>\n    <tr>\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"></td>\n      <th>File Name</th>\n      <th>Size</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat=\"file in files track by $index\">\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"><a ng-if=\"!readOnly\" href=\"#\" ng-click=\"removeFile($event, $index)\" style=\"padding: 2px 4px;\" class=\"btn btn-sm btn-default\"><span class=\"glyphicon glyphicon-remove\"></span></a></td>\n      <td><formio-file file=\"file\" form=\"form\"></formio-file></td>\n      <td>{{ fileSize(file.size) }}</td>\n    </tr>\n  </tbody>\n</table>\n"
      );

      $templateCache.put('formio/components/file.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': isRequired(component)}\">{{ component.label | formioTranslate:null:builder }}</label>\n<span ng-if=\"!component.label && isRequired(component)\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<div ng-controller=\"formioFileUpload\">\n  <formio-file-list files=\"data[component.key]\" form=\"formio.formUrl\" ng-if=\"!component.image\"></formio-file-list>\n  <formio-image-list files=\"data[component.key]\" form=\"formio.formUrl\" width=\"component.imageSize\" ng-if=\"component.image\"></formio-image-list>\n  <div ng-if=\"!readOnly && (component.multiple || (!component.multiple && !data[component.key].length))\">\n    <div ngf-drop=\"upload($files)\" class=\"fileSelector\" ngf-drag-over-class=\"'fileDragOver'\" ngf-multiple=\"component.multiple\" id=\"{{ componentId }}\" name=\"{{ componentId }}\"><span class=\"glyphicon glyphicon-cloud-upload\"></span>Drop files to attach, or <a style=\"cursor: pointer;\" ngf-select=\"upload($files)\" tabindex=\"{{ component.tabindex || 0 }}\" ngf-multiple=\"component.multiple\">browse</a>.</div>\n    <div ng-if=\"!component.storage\" class=\"alert alert-warning\">No storage has been set for this field. File uploads are disabled until storage is set up.</div>\n    <div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>\n  </div>\n  <div ng-repeat=\"fileUpload in fileUploads track by $index\" ng-class=\"{'has-error': fileUpload.status === 'error'}\" class=\"file\">\n    <div class=\"row\">\n      <div class=\"fileName control-label col-sm-10\">{{ fileUpload.name }} <span ng-click=\"removeUpload(fileUpload.name)\" class=\"glyphicon glyphicon-remove\"></span></div>\n      <div class=\"fileSize control-label col-sm-2 text-right\">{{ fileSize(fileUpload.size) }}</div>\n    </div>\n    <div class=\"row\">\n      <div class=\"col-sm-12\">\n        <span ng-if=\"fileUpload.status === 'progress'\">\n          <div class=\"progress\">\n            <div class=\"progress-bar\" role=\"progressbar\" aria-valuenow=\"{{fileUpload.progress}}\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width:{{fileUpload.progress}}%\">\n              <span class=\"sr-only\">{{fileUpload.progress}}% Complete</span>\n            </div>\n          </div>\n        </span>\n        <div ng-if=\"!fileUpload.status !== 'progress'\" class=\"bg-{{ fileUpload.status }} control-label\">{{ fileUpload.message }}</div>\n      </div>\n    </div>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/file.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label | formioTranslate:null:builder }}</label>\n<div ng-controller=\"formioFileUpload\">\n  <formio-file-list files=\"data[component.key]\" form=\"formUrl\" read-only=\"true\" ng-if=\"!component.image\"></formio-file-list>\n  <formio-image-list files=\"data[component.key]\" form=\"formUrl\" read-only=\"true\" width=\"component.imageSize\" ng-if=\"component.image\"></formio-image-list>\n</div>\n"
      );
    }
  ]);
};

},{}],29:[function(_dereq_,module,exports){
"use strict";

var GridUtils = _dereq_('../factories/GridUtils')();

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
        },
        tableView: GridUtils.generic
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

},{"../factories/GridUtils":60}],30:[function(_dereq_,module,exports){
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
          if ($scope.builder) return;
          var displayError = function(msg) {
            $scope.parseError = 'Invalid HTML: ' + msg.toString();
          };

          $scope.$watch('component', function createElement() {
            if (!$scope.component.tag) {
              return displayError('No tag given');
            }

            var element = angular.element('<' + $scope.component.tag + '>' + '</' + $scope.component.tag + '>');
            element.html($filter('formioTranslate')($scope.component.content));

            // Add the css classes if supplied.
            if ($scope.component.className) {
              element.attr('class', $scope.component.className);
            }

            angular.forEach($scope.component.attrs, function(attr) {
              if (!attr.attr) return;
              element.attr(attr.attr, attr.value);
            });

            try {
              $scope.html = $sanitize(element.prop('outerHTML'));
              $scope.parseError = null;

              // If the sanitized html is empty, it was invalid; Create a visible error so we still render something.
              if (!$scope.html) {
                return displayError(element.prop('outerHTML'));
              }
            }
            catch (err) {
              // Isolate the message and store it.
              $scope.parseError = err.message
                .split('\n')[0]
                .replace('[$sanitize:badparse]', '');
            }
          }, true);
        }
      };
  }]);

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('htmlelement', {
        title: 'HTML Element',
        template: 'formio/components/htmlelement.html',
        viewTemplate: 'formio/components/htmlelement.html',
        settings: {
          key: 'html',
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

},{}],31:[function(_dereq_,module,exports){
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
_dereq_('./day')(app);
_dereq_('./currency')(app);
_dereq_('./hidden')(app);
_dereq_('./resource')(app);
_dereq_('./file')(app);
_dereq_('./signature')(app);
_dereq_('./custom')(app);
_dereq_('./container')(app);
_dereq_('./datagrid')(app);
_dereq_('./survey')(app);

// Layout
_dereq_('./columns')(app);
_dereq_('./fieldset')(app);
_dereq_('./page')(app);
_dereq_('./panel')(app);
_dereq_('./table')(app);
_dereq_('./well')(app);

},{"./address":14,"./button":15,"./checkbox":16,"./columns":17,"./components":18,"./container":19,"./content":20,"./currency":21,"./custom":22,"./datagrid":23,"./datetime":24,"./day":25,"./email":26,"./fieldset":27,"./file":28,"./hidden":29,"./htmlelement":30,"./number":32,"./page":33,"./panel":34,"./password":35,"./phonenumber":36,"./radio":37,"./resource":38,"./select":39,"./selectboxes":40,"./signature":41,"./survey":42,"./table":43,"./textarea":44,"./textfield":45,"./well":46}],32:[function(_dereq_,module,exports){
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
          defaultValue: '',
          protected: false,
          persistent: true,
          clearOnHide: true,
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
          if ($scope.builder) return; // FOR-71 - Skip parsing input data.

          // Ensure that values are numbers.
          if (
            $scope.data &&
            $scope.data.hasOwnProperty($scope.component.key) &&
            isNumeric($scope.data[$scope.component.key])
          ) {
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
        "<input\n  type=\"{{ component.inputType }}\"\n  class=\"form-control\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-model=\"data[component.key]\"\n  ng-required=\"isRequired(component)\"\n  ng-disabled=\"readOnly\"\n  safe-multiple-to-single\n  min=\"{{ component.validate.min }}\"\n  max=\"{{ component.validate.max }}\"\n  step=\"{{ component.validate.step }}\"\n  placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\"\n  custom-validator=\"component.validate.custom\"\n  ui-mask=\"{{ component.inputMask }}\"\n  ui-mask-placeholder=\"\"\n  ui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],33:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('page', {
        template: 'formio/components/page.html',
        settings: {
          key: 'page',
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
        "<formio-component\n  ng-repeat=\"_component in component.components track by $index\"\n  component=\"_component\"\n  data=\"data\"\n  formio=\"formio\"\n  submission=\"submission\"\n  hide-components=\"hideComponents\"\n  ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n  read-only=\"isDisabled(_component, data)\"\n  formio-form=\"formioForm\"\n  grid-row=\"gridRow\"\n  grid-col=\"gridCol\"\n  builder=\"builder\"\n></formio-component>\n"
      );
    }
  ]);
};

},{}],34:[function(_dereq_,module,exports){
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
          key: 'panel',
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
        "<div class=\"panel panel-{{ component.theme }}\" id=\"{{ component.key }}\">\n  <div ng-if=\"component.title\" class=\"panel-heading\">\n    <h3 class=\"panel-title\">{{ component.title | formioTranslate:null:builder }}</h3>\n  </div>\n  <div class=\"panel-body\">\n    <formio-component\n      ng-repeat=\"_component in component.components track by $index\"\n      component=\"_component\"\n      data=\"data\"\n      formio=\"formio\"\n      submission=\"submission\"\n      hide-components=\"hideComponents\"\n      ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n      read-only=\"isDisabled(_component, data)\"\n      formio-form=\"formioForm\"\n      grid-row=\"gridRow\"\n      grid-col=\"gridCol\"\n      builder=\"builder\"\n    ></formio-component>\n  </div>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/panel.html',
        "<div class=\"panel panel-{{ component.theme }}\" id=\"{{ component.key }}\">\n  <div ng-if=\"component.title\" class=\"panel-heading\">\n    <h3 class=\"panel-title\">{{ component.title }}</h3>\n  </div>\n  <div class=\"panel-body\">\n    <formio-component-view\n      ng-repeat=\"_component in component.components track by $index\"\n      component=\"_component\"\n      data=\"data\"\n      submission=\"submission\"\n      form=\"form\"\n      ignore=\"ignore\"\n      ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n      builder=\"builder\"\n    ></formio-component-view>\n  </div>\n</div>\n"
      );
    }
  ]);
};

},{}],35:[function(_dereq_,module,exports){
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
          persistent: true,
          clearOnHide: true
        }
      });
    }
  ]);
};

},{}],36:[function(_dereq_,module,exports){
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
          clearOnHide: true,
          validate: {
            required: false
          }
        }
      });
    }
  ]);
};

},{}],37:[function(_dereq_,module,exports){
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
          clearOnHide: true,
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
        "<ng-form name=\"{{ componentId }}\" ng-model=\"data[component.key]\" custom-validator=\"component.validate.custom\">\n  <div ng-class=\"component.inline ? 'radio-inline' : 'radio'\" ng-repeat=\"v in component.values track by $index\">\n    <label class=\"control-label\" for=\"{{ componentId }}-{{ v.value }}\">\n      <input\n        type=\"{{ component.inputType }}\"\n        id=\"{{ componentId }}-{{ v.value }}\"\n        value=\"{{ v.value }}\"\n        tabindex=\"{{ component.tabindex || 0 }}\"\n        ng-model=\"data[component.key]\"\n        ng-required=\"isRequired(component)\"\n        custom-validator=\"component.validate.custom\"\n        ng-disabled=\"readOnly\"\n      >\n      {{ v.label | formioTranslate:null:builder }}\n    </label>\n  </div>\n</ng-form>\n"
      ));
    }
  ]);
};

},{}],38:[function(_dereq_,module,exports){
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
          if ($scope.builder) return;
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
          clearOnHide: true,
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
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': isRequired(component)}\">{{ component.label | formioTranslate:null:builder }}</label>\n<span ng-if=\"!component.label && isRequired(component)\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select ui-select-required safe-multiple-to-single ui-select-open-on-focus ng-model=\"data[component.key]\" ng-disabled=\"readOnly\" ng-required=\"isRequired(component)\" id=\"{{ componentId }}\" name=\"{{ componentId }}\" theme=\"bootstrap\" tabindex=\"{{ component.tabindex || 0 }}\">\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\">\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\n  </ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"item in selectItems | filter: $select.search\" refresh=\"refreshSubmissions($select.search)\" refresh-delay=\"250\">\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\n    <button ng-if=\"hasNextPage && ($index == $select.items.length-1)\" class=\"btn btn-success btn-block\" ng-click=\"loadMoreItems($select, $event)\" ng-disabled=\"resourceLoading\">Load more...</button>\n  </ui-select-choices>\n</ui-select>\n<formio-errors ng-if=\"::!builder\"></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/resource-multiple.html',
        $templateCache.get('formio/components/resource.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],39:[function(_dereq_,module,exports){
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
          if (scope.builder) return;
          if (scope.template) {
            element.append($compile(angular.element(scope.template))(scope));
          }
        }
      };
    }
  ]);

  app.directive('uiSelectRequired', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        if (scope.builder) return;
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function(value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

  // A directive to have ui-select open on focus
  app.directive('uiSelectOpenOnFocus', [function() {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function($scope, el, attrs, uiSelect) {
        if ($scope.builder) return;
        var focuscount = -1;

        angular.element(uiSelect.focusser).on('focus', function() {
          if (focuscount-- < 0) {
            uiSelect.activate();
          }
        });

        // Disable the auto open when this select element has been activated.
        $scope.$on('uis:activate', function() {
          focuscount = 1;
        });

        // Re-enable the auto open after the select element has been closed
        $scope.$on('uis:close', function() {
          focuscount = 1;
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
        controller: [
          '$rootScope',
          '$scope',
          '$http',
          'Formio',
          '$interpolate',
          '$q',
          '$timeout',
          function(
            $rootScope,
            $scope,
            $http,
            Formio,
            $interpolate,
            $q,
            $timeout
          ) {
            // FOR-71 - Skip functionality in the builder view.
            if ($scope.builder) return;
            var settings = $scope.component;
            var options = {};
            $scope.nowrap = true;
            $scope.hasNextPage = false;
            $scope.selectItems = [];

            var initialized = $q.defer();
            initialized.promise.then(function() {
              $scope.$emit('selectLoaded', $scope.component);
            });

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
                  if (prop.hasOwnProperty(parts[i])) {
                    prop = prop[parts[i]];
                  }
                }
                return prop;
              }

              return valueProp ? item[valueProp] : item;
            };

            $scope.refreshItems = function() {
              return $q.resolve([]);
            };
            $scope.$on('refreshList', function(event, url, input) {
              $scope.refreshItems(input, url);
            });

            // Add a watch if they wish to refresh on selection of another field.
            if (settings.refreshOn) {
              var refreshing = false;
              var refreshValue = function() {
                if (refreshing) {
                  return;
                }
                refreshing = true;
                var tempData = $scope.data[settings.key];
                $scope.data[settings.key] = settings.multiple ? [] : '';
                if (!settings.clearOnRefresh) {
                  $timeout(function() {
                    $scope.data[settings.key] = tempData;
                    refreshing = false;
                    $scope.$emit('selectLoaded', $scope.component);
                  });
                }
                else {
                  refreshing = false;
                  $scope.$emit('selectLoaded', $scope.component);
                }
              };

              // Refresh the value.
              var refreshValueWhenReady = function() {
                initialized.promise.then(function() {
                  var refreshPromise = $scope.refreshItems();
                  if (refreshPromise) {
                    refreshPromise.then(refreshValue);
                  }
                  else {
                    refreshValue();
                  }
                });
              };
              if (settings.refreshOn === 'data') {
                $scope.$watch('data', refreshValueWhenReady, true);
                return;
              }

              $scope.$watch('data.' + settings.refreshOn, refreshValueWhenReady);
              $scope.$watch('submission.data.' + settings.refreshOn, refreshValueWhenReady);
            }

            switch (settings.dataSrc) {
              case 'values':
                $scope.selectItems = settings.data.values;
                initialized.resolve();
                break;
              case 'json':
                var items;

                // Set the new result.
                var setResult = function(data, append) {
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

                try {
                  if (typeof $scope.component.data.json === 'string') {
                    items = angular.fromJson($scope.component.data.json);
                  }
                  else if (typeof $scope.component.data.json === 'object') {
                    items = $scope.component.data.json;
                  }
                  else {
                    items = [];
                  }

                  if (selectValues) {
                    // Allow dot notation in the selectValue property.
                    if (selectValues.indexOf('.') !== -1) {
                      var parts = selectValues.split('.');
                      var select = items;
                      for (var i in parts) {
                        select = select[parts[i]];
                      }
                      items = select;
                    }
                    else {
                      items = items[selectValues];
                    }
                  }
                }
                catch (error) {
                  /* eslint-disable no-console */
                  console.warn('Error parsing JSON in ' + $scope.component.key, error);
                  /* eslint-enable no-console */
                  items = [];
                }
                options.params = {
                  limit: $scope.component.limit || 20,
                  skip: 0
                };

                var lastInput;
                $scope.refreshItems = function(input, url, append) {
                  // If they typed in a search, reset skip.
                  if (lastInput !== input) {
                    lastInput = input;
                    options.params.skip = 0;
                  }
                  var selectItems = items;
                  if (input) {
                    selectItems = selectItems.filter(function(item) {
                      // Get the visible string from the interpolated item.
                      var value = $interpolate($scope.component.template)({item: item}).replace(/<(?:.|\n)*?>/gm, '');
                      switch ($scope.component.filter) {
                        case 'startsWith':
                          return value.toLowerCase().indexOf(input.toLowerCase()) !== -1;
                        case 'contains':
                        default:
                          return value.toLowerCase().lastIndexOf(input.toLowerCase(), 0) === 0;
                      }
                    });
                  }
                  selectItems = selectItems.slice(options.params.skip, options.params.skip + options.params.limit);
                  setResult(selectItems, append);
                  return initialized.resolve($scope.selectItems);
                };
                $scope.refreshItems();
                break;
              case 'custom':
                $scope.refreshItems = function() {
                  try {
                    /* eslint-disable no-unused-vars */
                    var data = _.cloneDeep($scope.submission.data);
                    var row = _.cloneDeep($scope.data);
                    /* eslint-enable no-unused-vars */
                    $scope.selectItems = eval('(function(data, row) { var values = [];' + settings.data.custom.toString() + '; return values; })(data, row)');
                  }
                  catch (error) {
                    $scope.selectItems = [];
                  }
                  return initialized.resolve($scope.selectItems);
                };
                $scope.refreshItems();
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
                    options.disableJWT = true;
                    options.headers = options.headers || {};
                    options.headers.Authorization = undefined;
                    options.headers.Pragma = undefined;
                    options.headers['Cache-Control'] = undefined;
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
                  limit: $scope.component.limit || 100,
                  skip: 0
                };

                $scope.loadMoreItems = function($select, $event) {
                  $event.stopPropagation();
                  $event.preventDefault();
                  options.params.skip += options.params.limit;
                  $scope.refreshItems(null, null, true);
                };

                if (url) {
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

                    return $http.get(newUrl, options).then(function(result) {
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
                      return $scope.selectItems;
                    }).finally(function() {
                      initialized.resolve($scope.selectItems);
                    });
                  };
                  $scope.refreshItems();
                }
                break;
              default:
                $scope.selectItems = [];
                initialized.resolve($scope.selectItems);
            }
          }
        ],
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
            resource: '',
            custom: ''
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
          clearOnHide: true,
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
        "<label ng-if=\"component.label && !component.hideLabel\"  for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': isRequired(component)}\">{{ component.label | formioTranslate:null:builder }}</label>\n<span ng-if=\"!component.label && isRequired(component)\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\n<ui-select\n  ui-select-required\n  ui-select-open-on-focus\n  ng-model=\"data[component.key]\"\n  safe-multiple-to-single\n  name=\"{{ componentId }}\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"isRequired(component)\"\n  id=\"{{ componentId }}\"\n  theme=\"bootstrap\"\n  custom-validator=\"component.validate.custom\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n>\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\">\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\n  </ui-select-match>\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"getSelectItem(item) as item in selectItems | filter: $select.search\" refresh=\"refreshItems($select.search)\" refresh-delay=\"250\">\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\n    <button ng-if=\"hasNextPage && ($index == $select.items.length-1)\" class=\"btn btn-success btn-block\" ng-click=\"loadMoreItems($select, $event)\" ng-disabled=\"selectLoading\">Load more...</button>\n  </ui-select-choices>\n</ui-select>\n<div ng-if=\"!!component.description\" class=\"help-block\">\n  <span>{{ component.description }}</span>\n</div>\n<formio-errors ng-if=\"::!builder\"></formio-errors>\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/select-multiple.html',
        $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],40:[function(_dereq_,module,exports){
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
        gridCol: '=',
        builder: '=?'
      },
      templateUrl: 'formio/components/selectboxes-directive.html',
      link: function($scope, el, attrs, ngModel) {
        if ($scope.builder) return;
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
          clearOnHide: true,
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
        "<div class=\"select-boxes\">\n  <div ng-class=\"component.inline ? 'checkbox-inline' : 'checkbox'\" ng-repeat=\"v in component.values track by $index\">\n    <label class=\"control-label\" for=\"{{ componentId }}-{{ v.value }}\">\n      <input type=\"checkbox\"\n        id=\"{{ componentId }}-{{ v.value }}\"\n        name=\"{{ componentId }}-{{ v.value }}\"\n        value=\"{{ v.value }}\"\n        tabindex=\"{{ component.tabindex || 0 }}\"\n        ng-disabled=\"readOnly\"\n        ng-click=\"toggleCheckbox(v.value)\"\n        ng-checked=\"model[v.value]\"\n        grid-row=\"gridRow\"\n        grid-col=\"gridCol\"\n      >\n      {{ v.label | formioTranslate:null:builder }}\n    </label>\n  </div>\n</div>\n"
      );
      $templateCache.put('formio/components/selectboxes.html',
        "<div class=\"select-boxes\">\n  <label ng-if=\"component.label && !component.hideLabel\" for=\"{{ componentId }}\" class=\"control-label\" ng-class=\"{'field-required': isRequired(component)}\">\n    {{ component.label }}\n  </label>\n  <formio-select-boxes\n    name=\"{{componentId}}\"\n    ng-model=\"data[component.key]\"\n    ng-model-options=\"{allowInvalid: true}\"\n    component=\"component\"\n    component-id=\"componentId\"\n    read-only=\"readOnly\"\n    ng-required=\"isRequired(component)\"\n    custom-validator=\"component.validate.custom\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    builder=\"builder\"\n  ></formio-select-boxes>\n  <div ng-if=\"!!component.description\" class=\"help-block\">\n    <span>{{ component.description }}</span>\n  </div>\n  <formio-errors ng-if=\"::!builder\"></formio-errors>\n</div>\n"
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
          clearOnHide: true,
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
        if (scope.builder) return;
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

        // Set the width and height of the canvas.
        // Reset size if element changes visibility.
        scope.$watch('component.display', function() {
          setDimension('width');
          setDimension('height');
        });

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
          if (scope.$parent.isRequired(scope.component) && signaturePad.isEmpty()) {
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
        "<div ng-if=\"readOnly\">\n  <div ng-if=\"data[component.key] === 'YES'\">\n    [ Signature is hidden ]\n  </div>\n  <div ng-if=\"data[component.key] !== 'YES'\">\n    <img class=\"signature\" ng-attr-src=\"{{data[component.key]}}\" src=\"\" />\n  </div>\n</div>\n<div ng-if=\"!readOnly\" style=\"width: {{ component.width }}; height: {{ component.height }};\">\n  <a class=\"btn btn-xs btn-default\" style=\"position:absolute; left: 0; top: 0; z-index: 1000\" ng-click=\"component.clearSignature()\">\n    <span class=\"glyphicon glyphicon-refresh\"></span>\n  </a>\n  <canvas signature component=\"component\" name=\"{{ componentId }}\" ng-model=\"data[component.key]\" ng-required=\"isRequired(component)\"></canvas>\n  <div class=\"formio-signature-footer\" style=\"text-align: center;color:#C3C3C3;\" ng-class=\"{'field-required': isRequired(component)}\">{{ component.footer | formioTranslate:null:builder }}</div>\n</div>\n"
      ));

      $templateCache.put('formio/componentsView/signature.html', FormioUtils.fieldWrap(
        "<div ng-if=\"data[component.key] === 'YES'\">\n  [ Signature is hidden ]\n</div>\n<div ng-if=\"data[component.key] && (data[component.key] !== 'YES')\">\n  <img class=\"signature\" ng-attr-src=\"{{ data[component.key] }}\" src=\"\" />\n</div>\n<div class=\"well text-center\" ng-if=\"!data[component.key] || (data[component.key] === 'NO')\">\n  <strong>No signature provided</strong>\n</div>\n"
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
        controller: ['$scope', '$timeout', function($scope, $timeout) {
          // FOR-71
          if ($scope.builder) return;
          // @todo: Figure out why the survey values are not defaulting correctly.
          var reset = false;
          $scope.$watch('data.' + $scope.component.key, function(value) {
            if (value && !reset) {
              reset = true;
              $scope.data[$scope.component.key] = {};
              $timeout((function(value) {
                return function() {
                  $scope.data[$scope.component.key] = value;
                  $timeout($scope.$apply.bind($scope));
                };
              })(value));
            }
          });
        }],
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
          clearOnHide: true,
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
        "<table class=\"table table-striped table-bordered\">\n  <thead>\n    <tr>\n      <td></td>\n      <th ng-repeat=\"v in component.values track by $index\" style=\"text-align: center;\">{{ v.label }}</th>\n    </tr>\n  </thead>\n  <tr ng-repeat=\"question in component.questions\">\n    <td>{{ question.label }}</td>\n    <td ng-repeat=\"v in component.values\" style=\"text-align: center;\">\n      <input\n        type=\"radio\"\n        id=\"{{ componentId }}-{{ question.value }}-{{ v.value }}\" name=\"{{ componentId }}-{{ question.value }}\"\n        tabindex=\"{{ component.tabindex || 0 }}\"\n        value=\"{{ v.value }}\"\n        ng-model=\"data[component.key][question.value]\"\n        ng-required=\"isRequired(component)\"\n        ng-disabled=\"readOnly\"\n        custom-validator=\"component.validate.custom\"\n      >\n    </td>\n  </tr>\n</table>\n"
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
      formioComponentsProvider.register('table', {
        title: 'Table',
        template: 'formio/components/table.html',
        group: 'layout',
        settings: {
          input: false,
          key: 'table',
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
        "<div class=\"table-responsive\" id=\"{{ component.key }}\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table\">\n    <thead ng-if=\"component.header.length\">\n      <th ng-repeat=\"header in component.header track by $index\">{{ header | formioTranslate:null:builder }}</th>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"row in component.rows track by $index\">\n        <td ng-repeat=\"column in row track by $index\">\n          <formio-component\n            ng-repeat=\"_component in column.components track by $index\"\n            component=\"_component\"\n            data=\"data\"\n            formio=\"formio\"\n            submission=\"submission\"\n            hide-components=\"hideComponents\"\n            ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n            formio-form=\"formioForm\"\n            read-only=\"isDisabled(_component, data)\"\n            grid-row=\"gridRow\"\n            grid-col=\"gridCol\"\n            builder=\"builder\"\n          ></formio-component>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n"
      );

      $templateCache.put('formio/componentsView/table.html',
        "<div class=\"table-responsive\" id=\"{{ component.key }}\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table\">\n    <thead ng-if=\"component.header.length\">\n      <th ng-repeat=\"header in component.header track by $index\">{{ header }}</th>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"row in component.rows track by $index\">\n        <td ng-repeat=\"column in row track by $index\">\n          <formio-component-view\n            ng-repeat=\"_component in column.components track by $index\"\n            component=\"_component\"\n            data=\"data\"\n            form=\"form\"\n            submission=\"submission\"\n            ignore=\"ignore\"\n            ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n            builder=\"builder\"\n          ></formio-component-view>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n"
      );
    }
  ]);
};

},{}],44:[function(_dereq_,module,exports){
"use strict";

module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: function($scope) {
          if (!$scope.readOnly && $scope.component.wysiwyg) {
            var defaults = {
              toolbarGroups:  [
                {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
                {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock']},
                {name: 'links', groups: ['links']},
                {name: 'insert', groups: ['insert']},
                '/',
                {name: 'styles', groups: ['Styles', 'Format', 'Font', 'FontSize']},
                {name: 'colors', groups: ['colors']},
                {name: 'clipboard', groups: ['clipboard', 'undo']},
                {name: 'editing', groups: ['find', 'selection', 'spellchecker', 'editing']},
                {name: 'document', groups: ['mode', 'document', 'doctools']},
                {name: 'others', groups: ['others']},
                {name: 'tools', groups: ['tools']}
              ],
              extraPlugins: 'justify,font',
              removeButtons: 'Cut,Copy,Paste,Underline,Subscript,Superscript,Scayt,About',
              uiColor: '#eeeeee',
              height: '400px',
              width: '100%'
            };
            if ($scope.component.wysiwyg === true) {
              $scope.component.wysiwyg = defaults;
            }
            else {
              $scope.component.wysiwyg = angular.extend(defaults, $scope.component.wysiwyg);
            }
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
          clearOnHide: true,
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
        "<textarea\n  class=\"form-control\"\n  ng-model=\"data[component.key]\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"isRequired(component)\"\n  safe-multiple-to-single\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\"\n  custom-validator=\"component.validate.custom\"\n  rows=\"{{ component.rows }}\"\n></textarea>\n"
      ));
      $templateCache.put('formio/components/texteditor.html', FormioUtils.fieldWrap(
        "<textarea\n  class=\"form-control\"\n  ng-model=\"data[component.key]\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"isRequired(component)\"\n  ckeditor=\"component.wysiwyg\"\n  safe-multiple-to-single\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  placeholder=\"{{ component.placeholder }}\"\n  custom-validator=\"component.validate.custom\"\n  rows=\"{{ component.rows }}\"\n></textarea>\n"
      ));
    }
  ]);
};

},{}],45:[function(_dereq_,module,exports){
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
          clearOnHide: true,
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
        "<input\n  type=\"{{ component.inputType }}\"\n  class=\"form-control\"\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  ng-disabled=\"readOnly\"\n  ng-model=\"data[component.key]\"\n  ng-model-options=\"{ debounce: 500 }\"\n  safe-multiple-to-single\n  ng-required=\"isRequired(component)\"\n  ng-minlength=\"component.validate.minLength\"\n  ng-maxlength=\"component.validate.maxLength\"\n  ng-pattern=\"component.validate.pattern\"\n  custom-validator=\"component.validate.custom\"\n  placeholder=\"{{ component.placeholder | formioTranslate:null:builder }}\"\n  ui-mask=\"{{ component.inputMask }}\"\n  ui-mask-placeholder=\"\"\n  ui-options=\"uiMaskOptions\"\n>\n"
      ));
    }
  ]);
};

},{}],46:[function(_dereq_,module,exports){
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
          key: 'well',
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
        "<div class=\"well\" id=\"{{ component.key }}\">\n  <formio-component\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    formio=\"formio\"\n    submission=\"submission\"\n    hide-components=\"hideComponents\"\n    ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n    read-only=\"isDisabled(_component, data)\"\n    formio-form=\"formioForm\"\n    grid-row=\"gridRow\"\n    grid-col=\"gridCol\"\n    builder=\"builder\"\n  ></formio-component>\n</div>\n"
      );
      $templateCache.put('formio/componentsView/well.html',
        "<div class=\"well\" id=\"{{ component.key }}\">\n  <formio-component-view\n    ng-repeat=\"_component in component.components track by $index\"\n    component=\"_component\"\n    data=\"data\"\n    form=\"form\"\n    submission=\"submission\"\n    ignore=\"ignore\"\n    ng-if=\"builder ? '::true' : isVisible(_component, data)\"\n    builder=\"builder\"\n  ></formio-component-view>\n</div>\n"
      );
    }
  ]);
};

},{}],47:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, ele, attrs, ctrl) {
      if (scope.builder) return;
      if (
        !scope.component.validate ||
        !scope.component.validate.custom
      ) {
        return;
      }

      var _get = function(item, path, def) {
        if (!item) {
          return def || undefined;
        }
        if (!path) {
          return item;
        }

        // If the path is a string, turn it into an array.
        if (typeof path === 'string') {
          path = path.split('.');
        }
        // If the path is an array, take the first element, and recurse its path
        if (path instanceof Array) {
          var current = path.shift();
          if (item.hasOwnProperty(current)) {
            // If there are no more path items, stop here.
            if (path.length === 0) {
              return item[current];
            }

            return _get(item[current], path);
          }

          return undefined;
        }

        return undefined;
      };

      ctrl.$validators.custom = function(modelValue, viewValue) {
        var valid = true;
        /*eslint-disable no-unused-vars */
        var input = modelValue || viewValue;

        // FOR-255 - Enable row data and form data to be visible in the validator.
        var data = scope.submission.data;
        var row = scope.data;
        /*eslint-enable no-unused-vars */

        var custom = scope.component.validate.custom;
        custom = custom.replace(/({{\s{0,}(.*[^\s]){1}\s{0,}}})/g, function(match, $1, $2) {
          return _get(scope.submission.data, $2);
        });

        try {
          /* jshint evil: true */
          eval(custom);
        }
        catch (err) {
          valid = err.message;
        }

        if (valid !== true) {
          scope.component.customError = valid;
          return false;
        }
        return true;
      };
    }
  };
};

},{}],48:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      url: '=?',
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

        var cancelFormLoadEvent = $scope.$on('formLoad', function() {
          cancelFormLoadEvent();
        });

        // FOR-71
        if (!$scope._src && !$scope.builder) {
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

        $scope.isVisible = function(component, row) {
          return FormioUtils.isVisible(
            component,
            row,
            $scope.submission ? $scope.submission.data : null,
            $scope.hideComponents
          );
        };

        $scope.isDisabled = function(component) {
          return $scope.readOnly || component.disabled || (Array.isArray($scope.disableComponents) && $scope.disableComponents.indexOf(component.key) !== -1);
        };

        $scope.isRequired = function(component) {
          return (component.validate && component.validate.required) || (Array.isArray($scope.requireComponents) && $scope.requireComponents.indexOf(component.key) !== -1);
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
            if ($scope.submission.data.hasOwnProperty(component.key)) {
              var value = $scope.submission.data[component.key];
              if (component.type === 'number' && (value !== null)) {
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
            if (message) {
              $scope.showAlerts({
                type: 'success',
                message: message
              });
            }
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
            $http[method]($scope.action, submissionData).then(function(response) {
              Formio.clearCache();
              onSubmitDone(method, response.data);
            }, FormioScope.onError($scope, $element))
              .finally(function() {
                form.submitting = false;
              });
          }

          // If they wish to submit to the default location.
          else if ($scope.formio && !$scope.formio.noSubmit) {
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

},{}],49:[function(_dereq_,module,exports){
"use strict";
module.exports = ['$sce', '$parse', '$compile', function($sce, $parse, $compile) {
  return {
    restrict: 'A',
    compile: function formioBindHtmlCompile(tElement, tAttrs) {
      var formioBindHtmlGetter = $parse(tAttrs.formioBindHtml);
      $compile.$$addBindingClass(tElement);
      return function formioBindHtmlLink(scope, element, attr) {
        $compile.$$addBindingInfo(element, attr.formioBindHtml);
        var value = formioBindHtmlGetter(scope);
        element.html($sce.getTrustedHtml(value) || '');
      };
    }
  };
}];

},{}],50:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioComponents',
  'Lodash',
  function(
    Formio,
    formioComponents,
    _
  ) {
    return {
      replace: true,
      restrict: 'E',
      require: '?^formio',
      scope: {
        component: '=',
        data: '=',
        submission: '=',
        hideComponents: '=',
        formio: '=',
        formioForm: '=',
        readOnly: '=',
        gridRow: '=',
        gridCol: '=',
        builder: '=?'
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
        'FormioUtils',
        function(
          $scope,
          $http,
          $controller,
          FormioUtils
        ) {
          $scope.builder = $scope.builder || false;
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

          // See if this component is visible or not.
          $scope.isVisible = function(component, row) {
            if ($scope.builder) return true;
            return FormioUtils.isVisible(
              component,
              row,
              $scope.submission ? $scope.submission.data : null,
              $scope.hideComponents
            );
          };

          // FOR-245 - Fix reset buttons.
          $scope.resetForm = function() {
            // Manually remove each key so we don't lose a reference to original
            // data in child scopes.
            for (var key in $scope.data) {
              delete $scope.data[key];
            }
          };

          $scope.isDisabled = function(component) {
            return $scope.readOnly || (typeof $scope.$parent.isDisabled === 'function' && $scope.$parent.isDisabled(component));
          };

          $scope.isRequired = $scope.$parent.isRequired;

          // Pass through checkConditional since this is an isolate scope.
          $scope.checkConditional = $scope.$parent.checkConditional;

          // FOR-71 - Dont watch in the builder view.
          // Calculate value when data changes.
          if (!$scope.builder && $scope.component.calculateValue) {
            $scope.$watch('data', function() {
              try {
                $scope.data[$scope.component.key] = eval('(function(data) { var value = [];' + $scope.component.calculateValue.toString() + '; return value; })($scope.data)');
              }
              catch (e) {
                /* eslint-disable no-console */
                console.warn('An error occurred calculating a value for ' + $scope.component.key, e);
                /* eslint-enable no-console */
              }
            }, true);
          }

          // Get the settings.
          var component = formioComponents.components[$scope.component.type] || formioComponents.components['custom'];

          // Set the component with the defaults from the component settings.
          // Dont add the default key, so that components without keys will remain visible by default.
          angular.forEach(component.settings, function(value, key) {
            if (!$scope.component.hasOwnProperty(key) && key !== 'key') {
              $scope.component[key] = angular.copy(value);
            }
          });

          // Add a new field value.
          $scope.addFieldValue = function() {
            var value = '';
            if ($scope.component.hasOwnProperty('customDefaultValue')) {
              try {
                /* eslint-disable no-unused-vars */
                var data = _.cloneDeep($scope.data);
                /* eslint-enable no-unused-vars */
                value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })(data)');
              }
              catch (e) {
                /* eslint-disable no-console */
                console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                /* eslint-enable no-console */
                value = '';
              }
            }
            else if ($scope.component.hasOwnProperty('defaultValue')) {
              // Fix for select components
              if ($scope.component.type === 'select') {
                try {
                  // Allow a key:value search
                  var parts = $scope.component.defaultValue.split(':');
                  var results;
                  // If only one part was specified, search by value
                  /* eslint-disable max-depth */
                  if (parts.length === 1) {
                    results = _.filter($scope.selectItems, {value: parts[0]});

                    // Trim results based on multiple
                    if (!$scope.component.multiple) {
                      value = results.shift();
                    }
                    else {
                      value = results;
                    }
                  }
                  // If two parts were specified, allow for key and value customization.
                  else if (parts.length === 2) {
                    var search = {};
                    search[parts[0]] = parts[1];

                    results = _.filter($scope.selectItems, search);

                    // Trim results based on multiple
                    if (!$scope.component.multiple) {
                      value = results.shift();
                    }
                    else {
                      value = results;
                    }
                  }
                }
                catch (e) {
                  /* eslint-disable no-console */
                  console.log('An issue occurred with the select defaultValue for: ' + $scope.component.key);
                  console.log('Could not find defaultValue (' + $scope.defaultValue + ') in the selectItems');
                  console.log($scope.selectItems);
                  /* eslint-enable no-console */
                }
              }
              else {
                value = $scope.component.defaultValue;
              }
            }
            $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
            $scope.data[$scope.component.key].push(value);
          };

          // Remove a field value.
          $scope.removeFieldValue = function(index) {
            if (!Array.isArray($scope.data[$scope.component.key])) {
              $scope.data[$scope.component.key] = [];
            }
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

          // FOR-71 - Dont watch in the builder view.
          if (!$scope.builder) {
            /**
             * Using the list of default options, split them with the identifier, and use filter to get each item.
             *
             * @param defaultItems
             * @param searchItems
             * @returns {Array}
             */
            var pluckItems = function(defaultItems, searchItems) {
              var temp = [];
              if (!defaultItems || !defaultItems.length) {
                return temp;
              }
              if (typeof defaultItems === 'string') {
                defaultItems = [defaultItems];
              }

              defaultItems.forEach(function(item) {
                var parts = item.split(':');
                if (parts.length === 2) {
                  var result = _.filter(searchItems, function(potential) {
                    if (_.get(potential, parts[0]) === parts[1]) {
                      return true;
                    }
                  });

                  if (result) {
                    temp = temp.concat(result);
                  }
                }
              });

              return temp;
            };

            $scope.$watch('component.multiple', function(mult) {
              // Establish a default for data.
              $scope.data = $scope.data || {};
              var value = null;

              // Use the current data or default.
              if ($scope.data.hasOwnProperty($scope.component.key)) {
                if (!mult) {
                  $scope.data[$scope.component.key] = $scope.data[$scope.component.key];
                  return;
                }

                // If a value is present, and its an array, assign it to the value.
                if ($scope.data[$scope.component.key] instanceof Array) {
                  value = $scope.data[$scope.component.key];
                }
                // If a value is present and it is not an array, wrap the value.
                else {
                  value = $scope.data[$scope.component.key].split(',');
                }

                $scope.data[$scope.component.key] = value;
                return;
              }
              else if ($scope.component.hasOwnProperty('customDefaultValue')) {
                if (!mult) {
                  try {
                    value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })($scope.data)');
                  }
                  catch (e) {
                    /* eslint-disable no-console */
                    console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                    /* eslint-enable no-console */
                    value = '';
                  }
                  $scope.data[$scope.component.key] = value;
                  return;
                }

                try {
                  value = eval('(function(data) { var value = "";' + $scope.component.customDefaultValue.toString() + '; return value; })($scope.data)');
                }
                catch (e) {
                  /* eslint-disable no-console */
                  console.warn('An error occurrend in a custom default value in ' + $scope.component.key, e);
                  /* eslint-enable no-console */
                  value = '';
                }
                $scope.data[$scope.component.key] = value;
                return;
              }
              else if ($scope.component.hasOwnProperty('defaultValue')) {
                // FA-835 - The default values for select boxes are set in the component.
                if ($scope.component.type === 'selectboxes') {
                  return;
                }

                // If there is a default value and it is not an array, wrap the value.
                if (mult && typeof $scope.component.defaultValue === 'string') {
                  value = $scope.component.defaultValue.split(',');
                }
                else {
                  value = $scope.component.defaultValue;
                }

                // If no default is provided, then skip...
                if (!value || !value.length) {
                  return;
                }

                // FOR-193 - Fix default value for the number component.
                // FOR-262 - Fix multiple default value for the number component.
                if ($scope.component.type === 'number') {
                  if (!mult) {
                    // FOR-290 - Fix default values for number components, to allow decimal numbers.
                    if ($scope.component.defaultValue.indexOf('.') !== -1) {
                      $scope.data[$scope.component.key] = parseFloat($scope.component.defaultValue);
                      return;
                    }

                    $scope.data[$scope.component.key] = parseInt($scope.component.defaultValue);
                    return;
                  }

                  $scope.data[$scope.component.key] = value.map(function(item) {
                    try {
                      // FOR-290 - Fix default values for number components, to allow decimal numbers.
                      if (item.indexOf('.') !== -1) {
                        return parseFloat(item);
                      }

                      return parseInt(item);
                    }
                    catch (e) {
                      return 0;
                    }
                  });
                  return;
                }
                // FOR-135 - Add default values for select components.
                else if ($scope.component.type === 'select') {
                  // FOR-337 - Fix default values for select components without multi enabled.
                  if (!mult) {
                    $scope.data[$scope.component.key] = $scope.component.defaultValue;
                    return;
                  }

                  // If using the values input, split the default values, and search the options for each value in the list.
                  if ($scope.component.dataSrc === 'values') {
                    var temp = [];

                    $scope.component.data.values.forEach(function(item) {
                      if (value.indexOf(item.value) !== -1) {
                        temp.push(item);
                      }
                    });

                    $scope.data[$scope.component.key] = temp;
                    return;
                  }
                  // If using json input, split the values and search each key path for the item
                  else if ($scope.component.dataSrc === 'json') {
                    if (typeof $scope.component.data.json === 'string') {
                      try {
                        $scope.component.data.json = JSON.parse($scope.component.data.json);
                      }
                      catch (e) {
                        /* eslint-disable no-console */
                        console.log(e);
                        console.log('Could not parse the given JSON for the select component: ' + $scope.component.key);
                        console.log($scope.component.data.json);
                        /* eslint-enable no-console */
                        $scope.component.data.json = [];
                      }
                    }

                    $scope.data[$scope.component.key] = pluckItems(value, $scope.component.data.json);
                    return;
                  }
                  else if ($scope.component.dataSrc === 'url' || $scope.component.dataSrc === 'resource') {
                    // Wait until loading is done.
                    $scope.$on('selectLoaded', function() {
                      $scope.data[$scope.component.key] = pluckItems(value, $scope.selectItems);
                    });
                  }
                }
                else {
                  if (!mult) {
                    $scope.data[$scope.component.key] = $scope.component.defaultValue;
                    return;
                  }

                  // If there is a default value and it is an array, assign it to the value.
                  if ($scope.component.defaultValue instanceof Array) {
                    $scope.data[$scope.component.key] = $scope.component.defaultValue;
                    return;
                  }

                  // Make the defaultValue a single element array because were multi.
                  $scope.data[$scope.component.key] = [$scope.component.defaultValue];
                  return;
                }
              }

              // Couldn't safely default, don't add a garbage value.
              return;
            });
          }

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

},{}],51:[function(_dereq_,module,exports){
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
        submission: '=',
        ignore: '=?',
        builder: '=?'
      },
      templateUrl: 'formio/component-view.html',
      controller: [
        '$scope',
        'Formio',
        'FormioUtils',
        function(
          $scope,
          Formio,
          FormioUtils
        ) {
          // Set the form url.
          $scope.formUrl = $scope.form ? Formio.getAppUrl() + '/form/' + $scope.form._id.toString() : '';
          $scope.isVisible = function(component, row) {
            return FormioUtils.isVisible(
              component,
              row,
              $scope.submission ? $scope.submission.data : null,
              $scope.hideComponents
            );
          };

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
        }
      ]
    };
  }
];

},{}],52:[function(_dereq_,module,exports){
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
            $http.delete($scope.action).then(onDeleteDone, FormioScope.onError($scope, $element));
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

},{}],53:[function(_dereq_,module,exports){
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

},{}],54:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  return {
    scope: false,
    restrict: 'E',
    templateUrl: 'formio/errors.html'
  };
};

},{}],55:[function(_dereq_,module,exports){
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
    templateUrl: 'formio/submission.html',
    controller: [
      '$scope',
      'FormioUtils',
      function(
        $scope,
        FormioUtils
      ) {
        $scope.isVisible = function(component, row) {
          return FormioUtils.isVisible(
            component,
            row,
            $scope.submission ? $scope.submission.data : null,
            $scope.ignore
          );
        };
      }
    ]
  };
};

},{}],56:[function(_dereq_,module,exports){
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

},{}],57:[function(_dereq_,module,exports){
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
      disableComponents: '=?',
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
      '$timeout',
      function(
        $scope,
        $compile,
        $element,
        Formio,
        FormioScope,
        FormioUtils,
        $http,
        $timeout
      ) {
        var session = ($scope.storage && !$scope.readOnly) ? localStorage.getItem($scope.storage) : false;
        if (session) {
          session = angular.fromJson(session);
        }

        $scope.formio = null;
        $scope.page = {};
        $scope.pages = [];
        $scope.hasTitles = false;
        $scope.colclass = '';
        if (!$scope.submission || !Object.keys($scope.submission).length) {
          $scope.submission = session ? {data: session.data} : {data: {}};
        }
        $scope.currentPage = session ? session.page : 0;
        $scope.formioAlerts = [];

        var getForm = function() {
          var element = $element.find('#formio-wizard-form');
          if (!element.length) {
            return {};
          }
          return element.children().scope().formioForm;
        };

        // Show the current page.
        var showPage = function(scroll) {
          $scope.wizardLoaded = false;
          $scope.page.components = [];
          $scope.page.components.length = 0;
          $timeout(function() {
            // If the page is past the components length, try to clear first.
            if ($scope.currentPage >= $scope.pages.length) {
              $scope.clear();
            }

            if ($scope.storage && !$scope.readOnly) {
              localStorage.setItem($scope.storage, angular.toJson({
                page: $scope.currentPage,
                data: $scope.submission.data
              }));
            }

            $scope.page.components = $scope.pages[$scope.currentPage].components;
            $scope.formioAlerts = [];
            if (scroll) {
              window.scrollTo(0, $scope.wizardTop);
            }
            $scope.wizardLoaded = true;
            $scope.$emit('wizardPage', $scope.currentPage);
            $timeout($scope.$apply.bind($scope));
          });
        };

        if (!$scope.form && $scope.src) {
          (new Formio($scope.src)).loadForm().then(function(form) {
            $scope.form = form;
            if (!$scope.wizardLoaded) {
              showPage();
            }
          });
        }

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
            if (submissionData.data.hasOwnProperty(component.key) && (component.type === 'number')) {
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
            submissionData.data[key] = value;

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
          // Strip out any angular keys.
          submissionData = angular.copy(submissionData);

          var submitEvent = $scope.$emit('formSubmit', submissionData);
          if (submitEvent.defaultPrevented) {
              // Listener wants to cancel the form submission
              return;
          }

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
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).then(function(submission) {
              Formio.clearCache();
              onDone(submission);
            }, FormioScope.onError($scope, $element));
          }
          else if ($scope.formio && !$scope.formio.noSubmit) {
            $scope.formio.saveSubmission(submissionData).then(onDone).catch(FormioScope.onError($scope, $element));
          }
          else {
            onDone(submissionData);
          }
        };

        $scope.cancel = function() {
          $scope.clear();
          showPage(true);
          $scope.$emit('cancel');
        };

        // Move onto the next page.
        $scope.next = function() {
          if ($scope.checkErrors()) {
            return;
          }
          if ($scope.currentPage >= ($scope.pages.length - 1)) {
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
          if (page >= $scope.pages.length) {
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

        var allPages = [];
        var hasConditionalPages = false;
        var setForm = function(form) {
          $scope.pages = [];
          angular.forEach(form.components, function(component) {
            // Only include panels for the pages.
            if (component.type === 'panel') {
              if (!$scope.hasTitles && component.title) {
                $scope.hasTitles = true;
              }
              if (component.customConditional) {
                hasConditionalPages = true;
              }
              else if (component.conditional && component.conditional.when) {
                hasConditionalPages = true;
              }
              // Make sure this page is not in the hide compoenents array.
              if (
                ($scope.hideComponents) &&
                (component.key) &&
                ($scope.hideComponents.indexOf(component.key) !== -1)
              ) {
                return;
              }
              allPages.push(component);
              $scope.pages.push(component);
            }
          });

          // FOR-71
          if (!$scope.builder && hasConditionalPages) {
            $scope.$watch('submission.data', function(data) {
              var newPages = [];
              angular.forEach(allPages, function(page) {
                if (FormioUtils.isVisible(page, null, data)) {
                  newPages.push(page);
                }
              });
              $scope.pages = newPages;
              updatePages();
              setTimeout($scope.$apply.bind($scope), 10);
            }, true);
          }

          $scope.form = $scope.form ? angular.merge($scope.form, angular.copy(form)) : angular.copy(form);
          $scope.page = angular.copy(form);
          $scope.page.display = 'form';
          $scope.$emit('wizardFormLoad', form);
          updatePages();
          showPage();
        };

        // FOR-71
        if (!$scope.builder) {
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
        }

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

},{}],58:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'Formio',
  'formioComponents',
  '$timeout',
  function(
    Formio,
    formioComponents,
    $timeout
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
            $timeout(function() {
              $scope.$emit('formRender', $scope.form);
            });
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
          // If they provide a url to the form, we still need to create it but tell it to not submit.
          if ($scope.url) {
            loader = new Formio($scope.url);
            loader.noSubmit = true;
          }

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

},{}],59:[function(_dereq_,module,exports){
"use strict";
var formioUtils = _dereq_('formio-utils');

module.exports = function() {
  return {
    checkVisible: function(component, row, data) {
      if (!formioUtils.checkCondition(component, row, data)) {
        if (!component.hasOwnProperty('clearOnHide') || component.clearOnHide !== false) {
          if (row && row.hasOwnProperty(component.key)) {
            delete row[component.key];
          }
          if (data && data.hasOwnProperty(component.key)) {
            delete data[component.key];
          }
        }
        return false;
      }
      return true;
    },
    isVisible: function(component, row, data, hide) {
      // If the component is in the hideComponents array, then hide it by default.
      if (hide && Array.isArray(hide) && (hide.indexOf(component.key) !== -1)) {
        return false;
      }

      return this.checkVisible(component, row, data);
    },
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
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': isRequired(component)}">{{ component.label | formioTranslate:null:builder }}</label>';
      var requiredInline = '<span ng-if="(component.hideLabel === true || component.label === \'\' || !component.label) && isRequired(component)" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
          inputLabel +
          '<div class="input-group">' +
            '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
            input +
            requiredInline +
            '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
          '</div>' +
          '<div class="formio-errors">' +
            '<formio-errors ng-if="::!builder"></formio-errors>' +
          '</div>' +
        '</div>' +
        '<div ng-if="!!component.description" class="help-block">' +
          '<span>{{ component.description }}</span>' +
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
              '<div class="formio-errors">' +
                '<formio-errors ng-if="::!builder"></formio-errors>' +
              '</div>' +
            '</td>' +
            '<td><a ng-click="removeFieldValue($index)" class="btn btn-default"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> {{ component.addAnother || "Add Another" | formioTranslate:null:builder }}</a></td>' +
          '</tr>' +
        '</table></div>';
      return template;
    }
  };
};

},{"formio-utils":2}],60:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  var generic = function(data, component) {
    var startTable = function(labels) {
      if (!(labels instanceof Array)) {
        labels = [labels];
      }

      var view = '<table class="table table-striped table-bordered"><thead><tr>';

      labels.forEach(function(item) {
        view += '<th>' + item + '</th>';
      });

      view += '</tr></thead>';
      view += '<tbody>';
      return view;
    };

    var finishTable = function() {
      return '</tbody></table>';
    };

    var makeRow = function(data, noRow) {
      var view = !noRow ? '<tr>' : '';

      if (typeof data === 'string' || typeof data === 'number') {
        view += '<td>' + data + '</td>';
      }
      else if (data === null || data === undefined) {
        view += '<td></td>';
      }
      else if (data instanceof Array) {
        data.forEach(function(item) {
          view += makeRow(item);
        });
      }
      else if (typeof data === 'object' && data !== null && data !== undefined) {
        var labels = Object.keys(data);

        view += '<td>' + startTable(labels);
        labels.forEach(function(key) {
          view += makeRow(data[key], true);
        });
        view += finishTable() + '</td>';
      }

      view += !noRow ? '</tr>' : '';
      return view;
    };

    // Create a template
    var view = '';
    var label;
    if (!label && component && component.label) {
      label = component.label;
    }
    else if (!label && component && component.key) {
      label = component.key;
    }
    else {
      label = '';
    }

    view += startTable(label);
    view += makeRow(data);
    view += finishTable();
    return view;
  };

  return {
    generic: generic
  };
};

},{}],61:[function(_dereq_,module,exports){
"use strict";
var _filter = _dereq_('lodash.filter');
var _get = _dereq_('lodash.get');

module.exports = function() {
  return {
    filter: _filter,
    'get': _get
  };
};

},{"lodash.filter":9,"lodash.get":10}],62:[function(_dereq_,module,exports){
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

},{}],63:[function(_dereq_,module,exports){
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

},{}],64:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return FormioUtils.flattenComponents;
  }
];

},{}],65:[function(_dereq_,module,exports){
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

},{}],66:[function(_dereq_,module,exports){
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

},{}],67:[function(_dereq_,module,exports){
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

},{}],68:[function(_dereq_,module,exports){
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

},{}],69:[function(_dereq_,module,exports){
"use strict";
module.exports = [
  '$filter',
  function(
    $filter
  ) {
    return function(text, key, builder) {
      if (builder) return text;
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

        return translate(text);
      }
      catch (e) {
        return text;
      }
    };
  }
];

},{}],70:[function(_dereq_,module,exports){
"use strict";
_dereq_('./polyfills/polyfills');


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

app.factory('Lodash', _dereq_('./factories/Lodash'));

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

app.directive('formioBindHtml', _dereq_('./directives/formioBindHtml.js'));

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
  '$injector',
  function(
    $httpProvider,
    $injector
  ) {
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }

    // Make sure that ngAnimate doesn't mess up loader.
    try {
      $injector.get('$animateProvider').classNameFilter(/^((?!(fa-spinner|glyphicon-spin)).)*$/);
    }
    /* eslint-disable no-empty */
    catch (err) {}
    /* eslint-enable no-empty */

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
      "<div>\n  <i style=\"font-size: 2em;\" ng-if=\"formLoading\" ng-class=\"{'formio-hidden': !formLoading}\" class=\"formio-loading glyphicon glyphicon-refresh glyphicon-spin\"></i>\n  <formio-wizard ng-if=\"form.display === 'wizard'\" src=\"src\" form=\"form\" submission=\"submission\" form-action=\"formAction\" read-only=\"readOnly\" hide-components=\"hideComponents\" disable-components=\"disableComponents\" formio-options=\"formioOptions\" storage=\"form.name\"></formio-wizard>\n  <form ng-if=\"!form.display || (form.display === 'form')\" role=\"form\" name=\"formioForm\" ng-submit=\"onSubmit(formioForm)\" novalidate>\n    <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\" ng-if=\"::!builder\">\n      {{ alert.message | formioTranslate:null:builder }}\n    </div>\n    <!-- DO NOT PUT \"track by $index\" HERE SINCE DYNAMICALLY ADDING/REMOVING COMPONENTS WILL BREAK -->\n    <formio-component\n      ng-repeat=\"component in form.components track by $index\"\n      component=\"component\"\n      ng-if=\"builder ? '::true' : isVisible(component)\"\n      data=\"submission.data\"\n      formio-form=\"formioForm\"\n      formio=\"formio\"\n      submission=\"submission\"\n      hide-components=\"hideComponents\"\n      read-only=\"isDisabled(component, submission.data)\"\n      builder=\"builder\"\n    ></formio-component>\n  </form>\n</div>\n"
    );

    $templateCache.put('formio-wizard.html',
      "<div class=\"formio-wizard-wrapper\">\n  <div class=\"row bs-wizard\" style=\"border-bottom:0;\" ng-class=\"{hasTitles: hasTitles}\">\n    <div ng-class=\"{disabled: ($index > currentPage), active: ($index == currentPage), complete: ($index < currentPage), noTitle: !page.title}\" class=\"{{ colclass }} bs-wizard-step\" ng-repeat=\"page in pages track by $index\">\n      <div class=\"bs-wizard-stepnum-wrapper\">\n        <div class=\"text-center bs-wizard-stepnum\" ng-if=\"page.title\">{{ page.title }}</div>\n      </div>\n      <div class=\"progress\"><div class=\"progress-bar progress-bar-primary\"></div></div>\n      <a ng-click=\"goto($index)\" class=\"bs-wizard-dot bg-primary\"><div class=\"bs-wizard-dot-inner bg-success\"></div></a>\n    </div>\n  </div>\n  <style type=\"text/css\">.bs-wizard > .bs-wizard-step:first-child { margin-left: {{ margin }}%; }</style>\n  <i ng-show=\"!wizardLoaded\" id=\"formio-loading\" style=\"font-size: 2em;\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">{{ alert.message | formioTranslate:null:builder }}</div>\n  <div class=\"formio-wizard\">\n    <formio\n      ng-if=\"wizardLoaded\"\n      submission=\"submission\"\n      form=\"page\"\n      read-only=\"readOnly\"\n      hide-components=\"hideComponents\"\n      disable-components=\"disableComponents\"\n      formio-options=\"formioOptions\"\n      id=\"formio-wizard-form\"\n    ></formio>\n  </div>\n  <ul ng-show=\"wizardLoaded\" class=\"list-inline\">\n    <li><a class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</a></li>\n    <li ng-if=\"currentPage > 0\"><a class=\"btn btn-primary\" ng-click=\"prev()\">Previous</a></li>\n    <li ng-if=\"currentPage < (pages.length - 1)\">\n      <a class=\"btn btn-primary\" ng-click=\"next()\">Next</a>\n    </li>\n    <li ng-if=\"currentPage >= (pages.length - 1)\">\n      <a class=\"btn btn-primary\" ng-click=\"submit()\">Submit Form</a>\n    </li>\n  </ul>\n</div>\n"
    );

    $templateCache.put('formio-delete.html',
      "<form role=\"form\">\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n    {{ alert.message | formioTranslate:null:builder }}\n  </div>\n  <h3>{{ deleteMessage | formioTranslate:null:builder }}</h3>\n  <div class=\"btn-toolbar\">\n    <button ng-click=\"onDelete()\" class=\"btn btn-danger\">{{ 'Yes' | formioTranslate:null:builder }}</button>\n    <button ng-click=\"onCancel()\" class=\"btn btn-default\">{{ 'No' | formioTranslate:null:builder }}</button>\n  </div>\n</form>\n"
    );

    $templateCache.put('formio/submission.html',
      "<div>\n  <div ng-repeat=\"component in form.components track by $index\" ng-if=\"submission && submission.data\">\n    <formio-component-view\n      form=\"form\"\n      component=\"component\"\n      data=\"submission.data\"\n      ignore=\"ignore\"\n      submission=\"submission\"\n      ng-if=\"builder ? '::true' : isVisible(component)\"\n      builder=\"builder\"\n    ></formio-component-view>\n  </div>\n</div>\n"
    );

    $templateCache.put('formio/submissions.html',
      "<div>\n  <div ng-repeat=\"alert in formioAlerts track by $index\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\n    {{ alert.message | formioTranslate:null:builder }}\n  </div>\n  <table class=\"table\">\n    <thead>\n      <tr>\n        <th ng-repeat=\"component in form.components | flattenComponents track by $index\" ng-if=\"tableView(component)\">{{ component.label || component.key }}</th>\n        <th>Submitted</th>\n        <th>Updated</th>\n        <th>Operations</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"submission in submissions track by $index\" class=\"formio-submission\" ng-click=\"$emit('submissionView', submission)\">\n        <td ng-repeat=\"component in form.components | flattenComponents track by $index\" ng-if=\"tableView(component)\">{{ submission.data | tableView:component }}</td>\n        <td>{{ submission.created | amDateFormat:'l, h:mm:ss a' }}</td>\n        <td>{{ submission.modified | amDateFormat:'l, h:mm:ss a' }}</td>\n        <td>\n          <div class=\"button-group\" style=\"display:flex;\">\n            <a ng-click=\"$emit('submissionView', submission); $event.stopPropagation();\" class=\"btn btn-primary btn-xs\"><span class=\"glyphicon glyphicon-eye-open\"></span></a>&nbsp;\n            <a ng-click=\"$emit('submissionEdit', submission); $event.stopPropagation();\" class=\"btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-edit\"></span></a>&nbsp;\n            <a ng-click=\"$emit('submissionDelete', submission); $event.stopPropagation();\" class=\"btn btn-danger btn-xs\"><span class=\"glyphicon glyphicon-remove-circle\"></span></a>\n          </div>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n  <pagination\n    ng-if=\"submissions.serverCount > perPage\"\n    ng-model=\"currentPage\"\n    ng-change=\"pageChanged(currentPage)\"\n    total-items=\"submissions.serverCount\"\n    items-per-page=\"perPage\"\n    direction-links=\"false\"\n    boundary-links=\"true\"\n    first-text=\"&laquo;\"\n    last-text=\"&raquo;\"\n    >\n  </pagination>\n</div>\n"
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      "<div class=\"form-group form-field-type-{{ component.type }} formio-component-{{ component.key }} {{component.customClass}}\" id=\"form-group-{{ componentId }}\"\n     ng-class=\"{'has-feedback ': (component.hideLabel === true || component.label === '' || !component.label) && component.validate.required,\n             'has-error': formioForm[componentId].$invalid && !formioForm[componentId].$pristine }\"\n     ng-style=\"component.style\"\n     ng-hide=\"component.hidden\">\n  <formio-element></formio-element>\n</div>\n\n"
    );

    $templateCache.put('formio/component-view.html',
      "<div name=\"{{ componentId }}\" class=\"form-group has-feedback form-field-type-{{ component.type }} {{component.customClass}} formio-component-{{ component.key }}\" id=\"form-group-{{ componentId }}\" ng-style=\"component.style\">\n  <formio-element></formio-element>\n</div>\n"
    );

    $templateCache.put('formio/element-view.html',
      "<div>\n  <div ng-if=\"component.label\"><strong>{{ component.label }}</strong></div>\n  <div formio-bind-html=\"data | tableView:component\"></div>\n</div>\n"
    );

    $templateCache.put('formio/errors.html',
      "<div ng-show=\"formioForm[componentId].$error && !formioForm[componentId].$pristine\">\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.email\">{{ component.label || component.placeholder || component.key }} {{'must be a valid email' | formioTranslate:null:builder}}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.required\">{{ component.label || component.placeholder || component.key }} {{'is required' | formioTranslate:null:builder}}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.number\">{{ component.label || component.placeholder || component.key }} {{'must be a number' | formioTranslate:null:builder}}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.maxlength\">{{ component.label || component.placeholder || component.key }} {{'must be shorter than' | formioTranslate:null:builder}} {{ component.validate.maxLength + 1 }} {{'characters' | formioTranslate:null:builder}}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.minlength\">{{ component.label || component.placeholder || component.key }} {{'must be longer than' | formioTranslate:null:builder}} {{ component.validate.minLength - 1 }} {{'characters' | formioTranslate:null:builder}}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.min\">{{ component.label || component.placeholder || component.key }} {{'must be higher than' | formioTranslate:null:builder}} {{ component.validate.min - 1 }}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.max\">{{ component.label || component.placeholder || component.key }} {{'must be lower than' | formioTranslate:null:builder}} {{ component.validate.max + 1 }}.</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.custom\">{{ component.customError | formioTranslate }}</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.pattern\">{{ component.label || component.placeholder || component.key }} {{'does not match the pattern' | formioTranslate:null:builder}} {{ component.validate.pattern }}</p>\n  <p class=\"help-block\" ng-show=\"formioForm[componentId].$error.day\">{{ component.label || component.placeholder || component.key }} {{'must be a valid date' | formioTranslate:null:builder}}.</p>\n</div>\n"
    );
  }
]);

_dereq_('./components');

},{"./components":31,"./directives/customValidator":47,"./directives/formio":48,"./directives/formioBindHtml.js":49,"./directives/formioComponent":50,"./directives/formioComponentView":51,"./directives/formioDelete":52,"./directives/formioElement":53,"./directives/formioErrors":54,"./directives/formioSubmission":55,"./directives/formioSubmissions":56,"./directives/formioWizard":57,"./factories/FormioScope":58,"./factories/FormioUtils":59,"./factories/Lodash":61,"./factories/formioInterceptor":62,"./factories/formioTableView":63,"./filters/flattenComponents":64,"./filters/safehtml":65,"./filters/tableComponents":66,"./filters/tableFieldView":67,"./filters/tableView":68,"./filters/translate":69,"./polyfills/polyfills":72,"./providers/Formio":73}],71:[function(_dereq_,module,exports){
"use strict";
'use strict';

if (typeof Object.assign != 'function') {
  (function() {
    Object.assign = function(target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      /* eslint-disable max-depth */
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      /* eslint-enable max-depth */
      return output;
    };
  })();
}

},{}],72:[function(_dereq_,module,exports){
"use strict";
'use strict';

_dereq_('./Object.assign');

},{"./Object.assign":71}],73:[function(_dereq_,module,exports){
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

},{"formiojs":3}]},{},[70])(70)
});