/*! ng-formio v2.9.8 | https://unpkg.com/ng-formio@2.9.8/LICENSE.txt */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

},{}],3:[function(_dereq_,module,exports){
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

},{}],4:[function(_dereq_,module,exports){
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

},{}],5:[function(_dereq_,module,exports){
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

},{"./providers":6,"eventemitter2":1,"native-promise-only":2,"shallow-copy":3,"whatwg-fetch":4}],6:[function(_dereq_,module,exports){
module.exports = {
  storage: _dereq_('./storage')
};

},{"./storage":8}],7:[function(_dereq_,module,exports){
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



},{"native-promise-only":2}],8:[function(_dereq_,module,exports){
module.exports = {
  dropbox: _dereq_('./dropbox.js'),
  s3: _dereq_('./s3.js'),
  url: _dereq_('./url.js'),
};

},{"./dropbox.js":7,"./s3.js":9,"./url.js":10}],9:[function(_dereq_,module,exports){
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

},{"native-promise-only":2}],10:[function(_dereq_,module,exports){
var Promise = _dereq_("native-promise-only");
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

        xhr.open('POST', url);
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

},{"native-promise-only":2}],11:[function(_dereq_,module,exports){
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

},{}],12:[function(_dereq_,module,exports){
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

},{}],13:[function(_dereq_,module,exports){
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

var GridUtils = _dereq_('../factories/GridUtils')();

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

},{"../factories/GridUtils":60}],20:[function(_dereq_,module,exports){
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
        "<div class=\"formio-data-grid\" ng-controller=\"formioDataGrid\">\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table datagrid-table\">\n    <tr>\n      <th\n        ng-repeat=\"col in cols track by $index\"\n        ng-class=\"{'field-required': col.validate.required}\"\n        ng-if=\"builder ? '::true' : anyVisible(col)\"\n      >{{ col.label | formioTranslate:null:builder }}</th>\n    </tr>\n    <tr ng-repeat=\"row in rows track by $index\" ng-init=\"rowIndex = $index\">\n      <td ng-repeat=\"col in cols track by $index\" ng-init=\"col.hideLabel = true; colIndex = $index\" class=\"formio-data-grid-row\" ng-if=\"builder ? '::true' : anyVisible(col)\">\n        <formio-component\n          component=\"col\"\n          data=\"rows[rowIndex]\"\n          formio-form=\"formioForm\"\n          formio=\"formio\"\n          submission=\"submission\"\n          hide-components=\"hideComponents\"\n          ng-if=\"builder ? '::true' : isVisible(col, row)\"\n          read-only=\"isDisabled(col, row)\"\n          grid-row=\"rowIndex\"\n          grid-col=\"colIndex\"\n          builder=\"builder\"\n        ></formio-component>\n      </td>\n      <td>\n        <a ng-click=\"removeRow(rowIndex)\" class=\"btn btn-default\">\n          <span class=\"glyphicon glyphicon-remove-circle\"></span>\n        </a>\n      </td>\n    </tr>\n  </table>\n  <div class=\"datagrid-add\">\n    <a ng-click=\"addRow()\" class=\"btn btn-primary\">\n      <span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> {{ component.addAnother || \"Add Another\" | formioTranslate:null:builder }}\n    </a>\n  </div>\n</div>\n"
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
            $scope.data[$scope.component.key] = dateValue();
            loadComplete();
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
        $scope.months = [$scope.component.fields.month.placeholder, 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];

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
              scope.date.month = parseInt(parts[(scope.component.dayFirst ? 1 : 0)]).toString();
              scope.date.year = parts[2];
            }
          }
        });

        var padLeft = function padLeft(nr, n, str) {
          return Array(n - String(nr.toString()).length + 1).join(str || '0') + nr.toString();
        };

        scope.onChange = function() {
          ngModel.$setViewValue(padLeft(scope.date.day, 2) + '/' + padLeft(scope.date.month, 2) + '/' + padLeft(scope.date.year, 4));
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
        "<div class=\"daySelect form row\">\n  <div class=\"form-group col-xs-3\" ng-if=\"component.dayFirst && !component.fields.day.hide\">\n    <label for=\"{{componentId}}-day\" ng-class=\"{'field-required': component.fields.day.required}\">{{ \"Day\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-day\"\n      ng-model=\"date.day\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.day.placeholder}}\"\n      day-part\n      characters=\"2\"\n      min=\"0\"\n      max=\"31\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n  <div class=\"form-group col-xs-4\" ng-if=\"!component.fields.month.hide\">\n    <label for=\"{{componentId}}-month\" ng-class=\"{'field-required': component.fields.month.required}\">{{ \"Month\" | formioTranslate:null:builder }}</label>\n    <select\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-month\"\n      ng-model=\"date.month\"\n      ng-change=\"onChange()\"\n      ng-disabled=\"readOnly\"\n    >\n      <option ng-repeat=\"month in months\" value=\"{{$index}}\">{{ month }}</option>\n    </select>\n  </div>\n  <div class=\"form-group col-xs-3\" ng-if=\"!component.dayFirst && !component.fields.day.hide\">\n    <label for=\"{{componentId}}-day\" ng-class=\"{'field-required': component.fields.day.required}\">{{ \"Day\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-day1\"\n      ng-model=\"date.day\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.day.placeholder}}\"\n      day-part\n      characters=\"2\"\n      min=\"0\"\n      max=\"31\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n  <div class=\"form-group col-xs-5\" ng-if=\"!component.fields.year.hide\">\n    <label for=\"{{componentId}}-year\" ng-class=\"{'field-required': component.fields.year.required}\">{{ \"Year\" | formioTranslate:null:builder }}</label>\n    <input\n      class=\"form-control\"\n      type=\"text\"\n      id=\"{{componentId}}-year\"\n      ng-model=\"date.year\"\n      ng-change=\"onChange()\"\n      style=\"padding-right: 10px;\"\n      placeholder=\"{{component.fields.year.placeholder}}\"\n      day-part\n      characters=\"4\"\n      min=\"0\"\n      max=\"2100\"\n      ng-disabled=\"readOnly\"\n    />\n  </div>\n</div>\n"
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
  app.directive('uiSelectOpenOnFocus', ['$timeout', function($timeout) {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function($scope, el, attrs, uiSelect) {
        if ($scope.builder) return;
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
        controller: [
          '$rootScope',
          '$scope',
          '$http',
          'Formio',
          '$interpolate',
          '$q',
          function(
            $rootScope,
            $scope,
            $http,
            Formio,
            $interpolate,
            $q
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

            $scope.refreshItems = angular.noop;
            $scope.$on('refreshList', function(event, url, input) {
              $scope.refreshItems(input, url);
            });

            // Add a watch if they wish to refresh on selection of another field.
            var refreshWatch, refreshWatchRow;
            if (settings.refreshOn) {
              // Remove the old watch.
              var refreshing = false;
              if (refreshWatch) refreshWatch();
              if (refreshWatchRow) refreshWatchRow();

              // Refresh the data.
              var refreshValue = function() {
                if (refreshing) {
                  return;
                }
                refreshing = true;
                var tempData = $scope.data[settings.key];
                $scope.data[settings.key] = settings.multiple ? [] : '';
                if (!settings.clearOnRefresh) {
                  setTimeout(function() {
                    $scope.data[settings.key] = tempData;
                    refreshing = false;
                    $scope.$emit('selectLoaded', $scope.component);
                  }, 10);
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
                refreshWatch = $scope.$watch('data', refreshValueWhenReady, true);
                return;
              }

              refreshWatchRow = $scope.$watch('data.' + settings.refreshOn, refreshValueWhenReady);
              refreshWatch = $scope.$watch('submission.data.' + settings.refreshOn, refreshValueWhenReady);
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
                };
                $scope.refreshItems();

                initialized.resolve();
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
                  initialized.resolve();
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
                    })['finally'](function() {
                      $scope.selectLoading = false;
                      initialized.resolve();
                    });
                  };
                  $scope.refreshItems();
                }
                break;
              default:
                $scope.selectItems = [];
                initialized.resolve();
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
        "<textarea\n  class=\"form-control\"\n  ng-model=\"data[component.key]\"\n  ng-disabled=\"readOnly\"\n  ng-required=\"isRequired(component)\"\n  ckeditor=\"wysiwyg\"\n  safe-multiple-to-single\n  id=\"{{ componentId }}\"\n  name=\"{{ componentId }}\"\n  tabindex=\"{{ component.tabindex || 0 }}\"\n  placeholder=\"{{ component.placeholder }}\"\n  custom-validator=\"component.validate.custom\"\n  rows=\"{{ component.rows }}\"\n></textarea>\n"
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
                  // If using the values input, split the default values, and search the options for each value in the list.
                  if ($scope.component.dataSrc === 'values') {
                    var temp = [];

                    $scope.component.data.values.forEach(function(item) {
                      if (value && value.indexOf(item.value) !== -1) {
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

},{"formio-utils":11}],60:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
  var generic = function(data, component, $interpolate, componentInfo) {
    var startTable = function(labels) {
      if (!(labels instanceof Array)) {
        labels = [labels]
      }

      var view = '<table class="table table-striped table-bordered"><thead><tr>';

      labels.forEach(function(item) {
        view += '<th>' + item + '</th>';
      });

      view += '</tr></thead>';
      view += '<tbody>';
      return view;
    };

    var makeRow = function(data) {
      var view = '<tr>';

      if (typeof data === 'string' || typeof data === 'number') {
        view += '<td>' + data + '</td>';
      }
      else if (data instanceof Array) {
        data.forEach(function(item) {
          view += makeRow(item);
        });
      }
      else if (typeof data === 'object') {
        var labels = Object.keys(data);

        view += startTable(labels);
        labels.forEach(function(key) {
          view += makeRow(data[key]);
        });
        view += finishTable();
      }

      view += '</tr>';
      return view;
    };

    var finishTable = function() {
      return '</tbody></table>';
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

},{"lodash.filter":12,"lodash.get":13}],62:[function(_dereq_,module,exports){
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
      "<div class=\"form-group has-feedback form-field-type-{{ component.type }} formio-component-{{ component.key }} {{component.customClass}}\" id=\"form-group-{{ componentId }}\" ng-class=\"{'has-error': formioForm[componentId].$invalid && !formioForm[componentId].$pristine }\" ng-style=\"component.style\" ng-hide=\"component.hidden\">\n  <formio-element></formio-element>\n</div>\n"
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

},{"formiojs":5}]},{},[70])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9mb3JtaW8uanMvbm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjIvbGliL2V2ZW50ZW1pdHRlcjIuanMiLCIuLi9mb3JtaW8uanMvbm9kZV9tb2R1bGVzL25hdGl2ZS1wcm9taXNlLW9ubHkvbGliL25wby5zcmMuanMiLCIuLi9mb3JtaW8uanMvbm9kZV9tb2R1bGVzL3NoYWxsb3ctY29weS9pbmRleC5qcyIsIi4uL2Zvcm1pby5qcy9ub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwiLi4vZm9ybWlvLmpzL3NyYy9mb3JtaW8uanMiLCIuLi9mb3JtaW8uanMvc3JjL3Byb3ZpZGVycy9pbmRleC5qcyIsIi4uL2Zvcm1pby5qcy9zcmMvcHJvdmlkZXJzL3N0b3JhZ2UvZHJvcGJveC5qcyIsIi4uL2Zvcm1pby5qcy9zcmMvcHJvdmlkZXJzL3N0b3JhZ2UvaW5kZXguanMiLCIuLi9mb3JtaW8uanMvc3JjL3Byb3ZpZGVycy9zdG9yYWdlL3MzLmpzIiwiLi4vZm9ybWlvLmpzL3NyYy9wcm92aWRlcnMvc3RvcmFnZS91cmwuanMiLCJub2RlX21vZHVsZXMvZm9ybWlvLXV0aWxzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guZmlsdGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5nZXQvaW5kZXguanMiLCJzcmMvY29tcG9uZW50cy9hZGRyZXNzLmpzIiwic3JjL2NvbXBvbmVudHMvYnV0dG9uLmpzIiwic3JjL2NvbXBvbmVudHMvY2hlY2tib3guanMiLCJzcmMvY29tcG9uZW50cy9jb2x1bW5zLmpzIiwic3JjL2NvbXBvbmVudHMvY29tcG9uZW50cy5qcyIsInNyYy9jb21wb25lbnRzL2NvbnRhaW5lci5qcyIsInNyYy9jb21wb25lbnRzL2NvbnRlbnQuanMiLCJzcmMvY29tcG9uZW50cy9jdXJyZW5jeS5qcyIsInNyYy9jb21wb25lbnRzL2N1c3RvbS5qcyIsInNyYy9jb21wb25lbnRzL2RhdGFncmlkLmpzIiwic3JjL2NvbXBvbmVudHMvZGF0ZXRpbWUuanMiLCJzcmMvY29tcG9uZW50cy9kYXkuanMiLCJzcmMvY29tcG9uZW50cy9lbWFpbC5qcyIsInNyYy9jb21wb25lbnRzL2ZpZWxkc2V0LmpzIiwic3JjL2NvbXBvbmVudHMvZmlsZS5qcyIsInNyYy9jb21wb25lbnRzL2hpZGRlbi5qcyIsInNyYy9jb21wb25lbnRzL2h0bWxlbGVtZW50LmpzIiwic3JjL2NvbXBvbmVudHMvaW5kZXguanMiLCJzcmMvY29tcG9uZW50cy9udW1iZXIuanMiLCJzcmMvY29tcG9uZW50cy9wYWdlLmpzIiwic3JjL2NvbXBvbmVudHMvcGFuZWwuanMiLCJzcmMvY29tcG9uZW50cy9wYXNzd29yZC5qcyIsInNyYy9jb21wb25lbnRzL3Bob25lbnVtYmVyLmpzIiwic3JjL2NvbXBvbmVudHMvcmFkaW8uanMiLCJzcmMvY29tcG9uZW50cy9yZXNvdXJjZS5qcyIsInNyYy9jb21wb25lbnRzL3NlbGVjdC5qcyIsInNyYy9jb21wb25lbnRzL3NlbGVjdGJveGVzLmpzIiwic3JjL2NvbXBvbmVudHMvc2lnbmF0dXJlLmpzIiwic3JjL2NvbXBvbmVudHMvc3VydmV5LmpzIiwic3JjL2NvbXBvbmVudHMvdGFibGUuanMiLCJzcmMvY29tcG9uZW50cy90ZXh0YXJlYS5qcyIsInNyYy9jb21wb25lbnRzL3RleHRmaWVsZC5qcyIsInNyYy9jb21wb25lbnRzL3dlbGwuanMiLCJzcmMvZGlyZWN0aXZlcy9jdXN0b21WYWxpZGF0b3IuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW8uanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9CaW5kSHRtbC5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudC5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudFZpZXcuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9EZWxldGUuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9FbGVtZW50LmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvU3VibWlzc2lvbi5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvV2l6YXJkLmpzIiwic3JjL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZS5qcyIsInNyYy9mYWN0b3JpZXMvRm9ybWlvVXRpbHMuanMiLCJzcmMvZmFjdG9yaWVzL0dyaWRVdGlscy5qcyIsInNyYy9mYWN0b3JpZXMvTG9kYXNoLmpzIiwic3JjL2ZhY3Rvcmllcy9mb3JtaW9JbnRlcmNlcHRvci5qcyIsInNyYy9mYWN0b3JpZXMvZm9ybWlvVGFibGVWaWV3LmpzIiwic3JjL2ZpbHRlcnMvZmxhdHRlbkNvbXBvbmVudHMuanMiLCJzcmMvZmlsdGVycy9zYWZlaHRtbC5qcyIsInNyYy9maWx0ZXJzL3RhYmxlQ29tcG9uZW50cy5qcyIsInNyYy9maWx0ZXJzL3RhYmxlRmllbGRWaWV3LmpzIiwic3JjL2ZpbHRlcnMvdGFibGVWaWV3LmpzIiwic3JjL2ZpbHRlcnMvdHJhbnNsYXRlLmpzIiwic3JjL2Zvcm1pby5qcyIsInNyYy9wb2x5ZmlsbHMvT2JqZWN0LmFzc2lnbi5qcyIsInNyYy9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzIiwic3JjL3Byb3ZpZGVycy9Gb3JtaW8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2x0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2gzQkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOXpFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbjZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcclxuICogRXZlbnRFbWl0dGVyMlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbiAqL1xyXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xyXG5cclxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XHJcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcclxuICB9O1xyXG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XHJcblxyXG4gIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcclxuICAgIGlmICh0aGlzLl9jb25mKSB7XHJcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcclxuICAgIGlmIChjb25mKSB7XHJcbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xyXG5cclxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xyXG4gICAgICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCA/IGNvbmYubWF4TGlzdGVuZXJzIDogZGVmYXVsdE1heExpc3RlbmVycztcclxuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xyXG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XHJcbiAgICAgIGNvbmYudmVyYm9zZU1lbW9yeUxlYWsgJiYgKHRoaXMudmVyYm9zZU1lbW9yeUxlYWsgPSBjb25mLnZlcmJvc2VNZW1vcnlMZWFrKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XHJcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBsb2dQb3NzaWJsZU1lbW9yeUxlYWsoY291bnQsIGV2ZW50TmFtZSkge1xyXG4gICAgdmFyIGVycm9yTXNnID0gJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xyXG4gICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xyXG4gICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nO1xyXG5cclxuICAgIGlmKHRoaXMudmVyYm9zZU1lbW9yeUxlYWspe1xyXG4gICAgICBlcnJvck1zZyArPSAnIEV2ZW50IG5hbWU6ICVzLic7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3JNc2csIGNvdW50LCBldmVudE5hbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5lcnJvcihlcnJvck1zZywgY291bnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb25zb2xlLnRyYWNlKXtcclxuICAgICAgY29uc29sZS50cmFjZSgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xyXG4gICAgdGhpcy52ZXJib3NlTWVtb3J5TGVhayA9IGZhbHNlO1xyXG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XHJcbiAgfVxyXG4gIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmb3IgZXhwb3J0aW5nIEV2ZW50RW1pdHRlciBwcm9wZXJ0eVxyXG5cclxuICAvL1xyXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxyXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxyXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcclxuICAvL1xyXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xyXG4gICAgaWYgKCF0cmVlKSB7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcclxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XHJcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcclxuICAgICAgLy9cclxuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xyXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxyXG4gICAgICAvL1xyXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcclxuICAgICAgICByZXR1cm4gW3RyZWVdO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xyXG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW3RyZWVdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xyXG4gICAgICAvL1xyXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XHJcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxyXG4gICAgICAvL1xyXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xyXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcclxuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcclxuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XHJcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xyXG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xyXG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXHJcbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xyXG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xyXG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcclxuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cclxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcclxuICAgICAgfVxyXG5cclxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcclxuICAgIH1cclxuXHJcbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcclxuICAgIGlmICh4VHJlZSkge1xyXG4gICAgICAvL1xyXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxyXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXHJcbiAgICAgIC8vXHJcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XHJcbiAgICB9XHJcblxyXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcclxuICAgIGlmKHh4VHJlZSkge1xyXG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xyXG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxyXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cclxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xyXG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcclxuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xyXG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxyXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cclxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XHJcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xyXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcclxuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXHJcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xyXG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xyXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxpc3RlbmVycztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcclxuXHJcbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XHJcblxyXG4gICAgLy9cclxuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxyXG4gICAgLy9cclxuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xyXG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XHJcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcclxuXHJcbiAgICB3aGlsZSAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcclxuICAgICAgICB0cmVlW25hbWVdID0ge307XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xyXG5cclxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XHJcblxyXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzXTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XHJcblxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAhdHJlZS5fbGlzdGVuZXJzLndhcm5lZCAmJlxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID4gMCAmJlxyXG4gICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVyc1xyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBsb2dQb3NzaWJsZU1lbW9yeUxlYWsuY2FsbCh0aGlzLCB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoLCBuYW1lKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxyXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxyXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxyXG4gIC8vXHJcbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXHJcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcclxuICAgIGlmIChuICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuICAgICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XHJcbiAgICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xyXG4gICAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgIHRoaXMubWFueShldmVudCwgMSwgZm4pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XHJcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xyXG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XHJcbiAgICAgIH1cclxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XHJcblxyXG4gICAgdGhpcy5vbihldmVudCwgbGlzdGVuZXIpO1xyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XHJcblxyXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XHJcblxyXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcclxuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgYWwgPSBhcmd1bWVudHMubGVuZ3RoO1xyXG4gICAgdmFyIGFyZ3MsbCxpLGo7XHJcbiAgICB2YXIgaGFuZGxlcjtcclxuXHJcbiAgICBpZiAodGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGgpIHtcclxuICAgICAgaGFuZGxlciA9IHRoaXMuX2FsbC5zbGljZSgpO1xyXG4gICAgICBpZiAoYWwgPiAzKSB7XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCk7XHJcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGFsOyBqKyspIGFyZ3Nbal0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoaSA9IDAsIGwgPSBoYW5kbGVyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xyXG4gICAgICAgIHN3aXRjaCAoYWwpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgIGhhbmRsZXJbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICBoYW5kbGVyID0gW107XHJcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xyXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcclxuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGFsIC0gMSk7XHJcbiAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyKSB7XHJcbiAgICAgICAgLy8gbmVlZCB0byBtYWtlIGNvcHkgb2YgaGFuZGxlcnMgYmVjYXVzZSBsaXN0IGNhbiBjaGFuZ2UgaW4gdGhlIG1pZGRsZVxyXG4gICAgICAgIC8vIG9mIGVtaXQgY2FsbFxyXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLnNsaWNlKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmxlbmd0aCkge1xyXG4gICAgICBpZiAoYWwgPiAzKSB7XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcclxuICAgICAgfVxyXG4gICAgICBmb3IgKGkgPSAwLCBsID0gaGFuZGxlci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcclxuICAgICAgICBzd2l0Y2ggKGFsKSB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICBoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcclxuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICEhdGhpcy5fYWxsO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdEFzeW5jID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcclxuXHJcbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xyXG4gICAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoW2ZhbHNlXSk7IH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJvbWlzZXM9IFtdO1xyXG5cclxuICAgIHZhciBhbCA9IGFyZ3VtZW50cy5sZW5ndGg7XHJcbiAgICB2YXIgYXJncyxsLGksajtcclxuICAgIHZhciBoYW5kbGVyO1xyXG5cclxuICAgIGlmICh0aGlzLl9hbGwpIHtcclxuICAgICAgaWYgKGFsID4gMykge1xyXG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2pdID0gYXJndW1lbnRzW2pdO1xyXG4gICAgICB9XHJcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSkpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLl9hbGxbaV0uY2FsbCh0aGlzLCB0eXBlLCBhcmd1bWVudHNbMV0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5fYWxsW2ldLmNhbGwodGhpcywgdHlwZSwgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgaGFuZGxlciA9IFtdO1xyXG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcclxuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xyXG4gICAgICBzd2l0Y2ggKGFsKSB7XHJcbiAgICAgIGNhc2UgMTpcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMjpcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAzOlxyXG4gICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShhbCAtIDEpO1xyXG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBhbDsgaisrKSBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcclxuICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXIuYXBwbHkodGhpcywgYXJncykpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5sZW5ndGgpIHtcclxuICAgICAgaWYgKGFsID4gMykge1xyXG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoYWwgLSAxKTtcclxuICAgICAgICBmb3IgKGogPSAxOyBqIDwgYWw7IGorKykgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChpID0gMCwgbCA9IGhhbmRsZXIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChhbCkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMpKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHByb21pc2VzLnB1c2goaGFuZGxlcltpXS5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaChoYW5kbGVyW2ldLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGhhbmRsZXJbaV0uYXBwbHkodGhpcywgYXJncykpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICghdGhpcy5fYWxsICYmIHR5cGUgPT09ICdlcnJvcicpIHtcclxuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGFyZ3VtZW50c1sxXSk7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcclxuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aGlzLm9uQW55KHR5cGUpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxyXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cclxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XHJcblxyXG4gICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcclxuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXHJcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgLy8gQ2hhbmdlIHRvIGFycmF5LlxyXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXHJcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXHJcbiAgICAgIGlmIChcclxuICAgICAgICAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCAmJlxyXG4gICAgICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPiAwICYmXHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnNcclxuICAgICAgKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XHJcbiAgICAgICAgbG9nUG9zc2libGVNZW1vcnlMZWFrLmNhbGwodGhpcywgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCwgdHlwZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcclxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLl9hbGwpIHtcclxuICAgICAgdGhpcy5fYWxsID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cclxuICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XHJcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XHJcblxyXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcclxuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxyXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xyXG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XHJcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xyXG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcclxuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XHJcblxyXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcclxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcclxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcclxuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLCB0eXBlLCBsaXN0ZW5lcik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxyXG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XHJcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XHJcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlHYXJiYWdlQ29sbGVjdChyb290KSB7XHJcbiAgICAgIGlmIChyb290ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb290KTtcclxuICAgICAgZm9yICh2YXIgaSBpbiBrZXlzKSB7XHJcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgdmFyIG9iaiA9IHJvb3Rba2V5XTtcclxuICAgICAgICBpZiAoKG9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB8fCAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikgfHwgKG9iaiA9PT0gbnVsbCkpXHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICByZWN1cnNpdmVseUdhcmJhZ2VDb2xsZWN0KHJvb3Rba2V5XSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgZGVsZXRlIHJvb3Rba2V5XTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJlY3Vyc2l2ZWx5R2FyYmFnZUNvbGxlY3QodGhpcy5saXN0ZW5lclRyZWUpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH07XHJcblxyXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcclxuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcclxuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcclxuICAgICAgZm5zID0gdGhpcy5fYWxsO1xyXG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xyXG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuKTtcclxuICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm5zID0gdGhpcy5fYWxsO1xyXG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKVxyXG4gICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyQW55XCIsIGZuc1tpXSk7XHJcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcclxuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xyXG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xyXG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50cykge1xyXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICBpZiAodGhpcy53aWxkY2FyZCkge1xyXG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcclxuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XHJcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xyXG4gICAgICByZXR1cm4gaGFuZGxlcnM7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XHJcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xyXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XHJcbiAgfTtcclxuXHJcbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xyXG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcclxuICB9O1xyXG5cclxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIGlmKHRoaXMuX2FsbCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcclxuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAvLyBDb21tb25KU1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXHJcbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcclxuICB9XHJcbn0oKTtcclxuIiwiLyohIE5hdGl2ZSBQcm9taXNlIE9ubHlcbiAgICB2MC44LjEgKGMpIEt5bGUgU2ltcHNvblxuICAgIE1JVCBMaWNlbnNlOiBodHRwOi8vZ2V0aWZ5Lm1pdC1saWNlbnNlLm9yZ1xuKi9cblxuKGZ1bmN0aW9uIFVNRChuYW1lLGNvbnRleHQsZGVmaW5pdGlvbil7XG5cdC8vIHNwZWNpYWwgZm9ybSBvZiBVTUQgZm9yIHBvbHlmaWxsaW5nIGFjcm9zcyBldmlyb25tZW50c1xuXHRjb250ZXh0W25hbWVdID0gY29udGV4dFtuYW1lXSB8fCBkZWZpbml0aW9uKCk7XG5cdGlmICh0eXBlb2YgbW9kdWxlICE9IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHsgbW9kdWxlLmV4cG9ydHMgPSBjb250ZXh0W25hbWVdOyB9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHsgZGVmaW5lKGZ1bmN0aW9uICRBTUQkKCl7IHJldHVybiBjb250ZXh0W25hbWVdOyB9KTsgfVxufSkoXCJQcm9taXNlXCIsdHlwZW9mIGdsb2JhbCAhPSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdGhpcyxmdW5jdGlvbiBERUYoKXtcblx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0dmFyIGJ1aWx0SW5Qcm9wLCBjeWNsZSwgc2NoZWR1bGluZ19xdWV1ZSxcblx0XHRUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0dGltZXIgPSAodHlwZW9mIHNldEltbWVkaWF0ZSAhPSBcInVuZGVmaW5lZFwiKSA/XG5cdFx0XHRmdW5jdGlvbiB0aW1lcihmbikgeyByZXR1cm4gc2V0SW1tZWRpYXRlKGZuKTsgfSA6XG5cdFx0XHRzZXRUaW1lb3V0XG5cdDtcblxuXHQvLyBkYW1taXQsIElFOC5cblx0dHJ5IHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJ4XCIse30pO1xuXHRcdGJ1aWx0SW5Qcm9wID0gZnVuY3Rpb24gYnVpbHRJblByb3Aob2JqLG5hbWUsdmFsLGNvbmZpZykge1xuXHRcdFx0cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosbmFtZSx7XG5cdFx0XHRcdHZhbHVlOiB2YWwsXG5cdFx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IGNvbmZpZyAhPT0gZmFsc2Vcblx0XHRcdH0pO1xuXHRcdH07XG5cdH1cblx0Y2F0Y2ggKGVycikge1xuXHRcdGJ1aWx0SW5Qcm9wID0gZnVuY3Rpb24gYnVpbHRJblByb3Aob2JqLG5hbWUsdmFsKSB7XG5cdFx0XHRvYmpbbmFtZV0gPSB2YWw7XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH07XG5cdH1cblxuXHQvLyBOb3RlOiB1c2luZyBhIHF1ZXVlIGluc3RlYWQgb2YgYXJyYXkgZm9yIGVmZmljaWVuY3lcblx0c2NoZWR1bGluZ19xdWV1ZSA9IChmdW5jdGlvbiBRdWV1ZSgpIHtcblx0XHR2YXIgZmlyc3QsIGxhc3QsIGl0ZW07XG5cblx0XHRmdW5jdGlvbiBJdGVtKGZuLHNlbGYpIHtcblx0XHRcdHRoaXMuZm4gPSBmbjtcblx0XHRcdHRoaXMuc2VsZiA9IHNlbGY7XG5cdFx0XHR0aGlzLm5leHQgPSB2b2lkIDA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFkZDogZnVuY3Rpb24gYWRkKGZuLHNlbGYpIHtcblx0XHRcdFx0aXRlbSA9IG5ldyBJdGVtKGZuLHNlbGYpO1xuXHRcdFx0XHRpZiAobGFzdCkge1xuXHRcdFx0XHRcdGxhc3QubmV4dCA9IGl0ZW07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Zmlyc3QgPSBpdGVtO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxhc3QgPSBpdGVtO1xuXHRcdFx0XHRpdGVtID0gdm9pZCAwO1xuXHRcdFx0fSxcblx0XHRcdGRyYWluOiBmdW5jdGlvbiBkcmFpbigpIHtcblx0XHRcdFx0dmFyIGYgPSBmaXJzdDtcblx0XHRcdFx0Zmlyc3QgPSBsYXN0ID0gY3ljbGUgPSB2b2lkIDA7XG5cblx0XHRcdFx0d2hpbGUgKGYpIHtcblx0XHRcdFx0XHRmLmZuLmNhbGwoZi5zZWxmKTtcblx0XHRcdFx0XHRmID0gZi5uZXh0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSkoKTtcblxuXHRmdW5jdGlvbiBzY2hlZHVsZShmbixzZWxmKSB7XG5cdFx0c2NoZWR1bGluZ19xdWV1ZS5hZGQoZm4sc2VsZik7XG5cdFx0aWYgKCFjeWNsZSkge1xuXHRcdFx0Y3ljbGUgPSB0aW1lcihzY2hlZHVsaW5nX3F1ZXVlLmRyYWluKTtcblx0XHR9XG5cdH1cblxuXHQvLyBwcm9taXNlIGR1Y2sgdHlwaW5nXG5cdGZ1bmN0aW9uIGlzVGhlbmFibGUobykge1xuXHRcdHZhciBfdGhlbiwgb190eXBlID0gdHlwZW9mIG87XG5cblx0XHRpZiAobyAhPSBudWxsICYmXG5cdFx0XHQoXG5cdFx0XHRcdG9fdHlwZSA9PSBcIm9iamVjdFwiIHx8IG9fdHlwZSA9PSBcImZ1bmN0aW9uXCJcblx0XHRcdClcblx0XHQpIHtcblx0XHRcdF90aGVuID0gby50aGVuO1xuXHRcdH1cblx0XHRyZXR1cm4gdHlwZW9mIF90aGVuID09IFwiZnVuY3Rpb25cIiA/IF90aGVuIDogZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiBub3RpZnkoKSB7XG5cdFx0Zm9yICh2YXIgaT0wOyBpPHRoaXMuY2hhaW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdG5vdGlmeUlzb2xhdGVkKFxuXHRcdFx0XHR0aGlzLFxuXHRcdFx0XHQodGhpcy5zdGF0ZSA9PT0gMSkgPyB0aGlzLmNoYWluW2ldLnN1Y2Nlc3MgOiB0aGlzLmNoYWluW2ldLmZhaWx1cmUsXG5cdFx0XHRcdHRoaXMuY2hhaW5baV1cblx0XHRcdCk7XG5cdFx0fVxuXHRcdHRoaXMuY2hhaW4ubGVuZ3RoID0gMDtcblx0fVxuXG5cdC8vIE5PVEU6IFRoaXMgaXMgYSBzZXBhcmF0ZSBmdW5jdGlvbiB0byBpc29sYXRlXG5cdC8vIHRoZSBgdHJ5Li5jYXRjaGAgc28gdGhhdCBvdGhlciBjb2RlIGNhbiBiZVxuXHQvLyBvcHRpbWl6ZWQgYmV0dGVyXG5cdGZ1bmN0aW9uIG5vdGlmeUlzb2xhdGVkKHNlbGYsY2IsY2hhaW4pIHtcblx0XHR2YXIgcmV0LCBfdGhlbjtcblx0XHR0cnkge1xuXHRcdFx0aWYgKGNiID09PSBmYWxzZSkge1xuXHRcdFx0XHRjaGFpbi5yZWplY3Qoc2VsZi5tc2cpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGlmIChjYiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHJldCA9IHNlbGYubXNnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldCA9IGNiLmNhbGwodm9pZCAwLHNlbGYubXNnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChyZXQgPT09IGNoYWluLnByb21pc2UpIHtcblx0XHRcdFx0XHRjaGFpbi5yZWplY3QoVHlwZUVycm9yKFwiUHJvbWlzZS1jaGFpbiBjeWNsZVwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoX3RoZW4gPSBpc1RoZW5hYmxlKHJldCkpIHtcblx0XHRcdFx0XHRfdGhlbi5jYWxsKHJldCxjaGFpbi5yZXNvbHZlLGNoYWluLnJlamVjdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y2hhaW4ucmVzb2x2ZShyZXQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnIpIHtcblx0XHRcdGNoYWluLnJlamVjdChlcnIpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlc29sdmUobXNnKSB7XG5cdFx0dmFyIF90aGVuLCBzZWxmID0gdGhpcztcblxuXHRcdC8vIGFscmVhZHkgdHJpZ2dlcmVkP1xuXHRcdGlmIChzZWxmLnRyaWdnZXJlZCkgeyByZXR1cm47IH1cblxuXHRcdHNlbGYudHJpZ2dlcmVkID0gdHJ1ZTtcblxuXHRcdC8vIHVud3JhcFxuXHRcdGlmIChzZWxmLmRlZikge1xuXHRcdFx0c2VsZiA9IHNlbGYuZGVmO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRpZiAoX3RoZW4gPSBpc1RoZW5hYmxlKG1zZykpIHtcblx0XHRcdFx0c2NoZWR1bGUoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR2YXIgZGVmX3dyYXBwZXIgPSBuZXcgTWFrZURlZldyYXBwZXIoc2VsZik7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdF90aGVuLmNhbGwobXNnLFxuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAkcmVzb2x2ZSQoKXsgcmVzb2x2ZS5hcHBseShkZWZfd3JhcHBlcixhcmd1bWVudHMpOyB9LFxuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAkcmVqZWN0JCgpeyByZWplY3QuYXBwbHkoZGVmX3dyYXBwZXIsYXJndW1lbnRzKTsgfVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdFx0cmVqZWN0LmNhbGwoZGVmX3dyYXBwZXIsZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0c2VsZi5tc2cgPSBtc2c7XG5cdFx0XHRcdHNlbGYuc3RhdGUgPSAxO1xuXHRcdFx0XHRpZiAoc2VsZi5jaGFpbi5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0c2NoZWR1bGUobm90aWZ5LHNlbGYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnIpIHtcblx0XHRcdHJlamVjdC5jYWxsKG5ldyBNYWtlRGVmV3JhcHBlcihzZWxmKSxlcnIpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlamVjdChtc2cpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBhbHJlYWR5IHRyaWdnZXJlZD9cblx0XHRpZiAoc2VsZi50cmlnZ2VyZWQpIHsgcmV0dXJuOyB9XG5cblx0XHRzZWxmLnRyaWdnZXJlZCA9IHRydWU7XG5cblx0XHQvLyB1bndyYXBcblx0XHRpZiAoc2VsZi5kZWYpIHtcblx0XHRcdHNlbGYgPSBzZWxmLmRlZjtcblx0XHR9XG5cblx0XHRzZWxmLm1zZyA9IG1zZztcblx0XHRzZWxmLnN0YXRlID0gMjtcblx0XHRpZiAoc2VsZi5jaGFpbi5sZW5ndGggPiAwKSB7XG5cdFx0XHRzY2hlZHVsZShub3RpZnksc2VsZik7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaXRlcmF0ZVByb21pc2VzKENvbnN0cnVjdG9yLGFycixyZXNvbHZlcixyZWplY3Rlcikge1xuXHRcdGZvciAodmFyIGlkeD0wOyBpZHg8YXJyLmxlbmd0aDsgaWR4KyspIHtcblx0XHRcdChmdW5jdGlvbiBJSUZFKGlkeCl7XG5cdFx0XHRcdENvbnN0cnVjdG9yLnJlc29sdmUoYXJyW2lkeF0pXG5cdFx0XHRcdC50aGVuKFxuXHRcdFx0XHRcdGZ1bmN0aW9uICRyZXNvbHZlciQobXNnKXtcblx0XHRcdFx0XHRcdHJlc29sdmVyKGlkeCxtc2cpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0cmVqZWN0ZXJcblx0XHRcdFx0KTtcblx0XHRcdH0pKGlkeCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gTWFrZURlZldyYXBwZXIoc2VsZikge1xuXHRcdHRoaXMuZGVmID0gc2VsZjtcblx0XHR0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gTWFrZURlZihzZWxmKSB7XG5cdFx0dGhpcy5wcm9taXNlID0gc2VsZjtcblx0XHR0aGlzLnN0YXRlID0gMDtcblx0XHR0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xuXHRcdHRoaXMuY2hhaW4gPSBbXTtcblx0XHR0aGlzLm1zZyA9IHZvaWQgMDtcblx0fVxuXG5cdGZ1bmN0aW9uIFByb21pc2UoZXhlY3V0b3IpIHtcblx0XHRpZiAodHlwZW9mIGV4ZWN1dG9yICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX19OUE9fXyAhPT0gMCkge1xuXHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgcHJvbWlzZVwiKTtcblx0XHR9XG5cblx0XHQvLyBpbnN0YW5jZSBzaGFkb3dpbmcgdGhlIGluaGVyaXRlZCBcImJyYW5kXCJcblx0XHQvLyB0byBzaWduYWwgYW4gYWxyZWFkeSBcImluaXRpYWxpemVkXCIgcHJvbWlzZVxuXHRcdHRoaXMuX19OUE9fXyA9IDE7XG5cblx0XHR2YXIgZGVmID0gbmV3IE1ha2VEZWYodGhpcyk7XG5cblx0XHR0aGlzW1widGhlblwiXSA9IGZ1bmN0aW9uIHRoZW4oc3VjY2VzcyxmYWlsdXJlKSB7XG5cdFx0XHR2YXIgbyA9IHtcblx0XHRcdFx0c3VjY2VzczogdHlwZW9mIHN1Y2Nlc3MgPT0gXCJmdW5jdGlvblwiID8gc3VjY2VzcyA6IHRydWUsXG5cdFx0XHRcdGZhaWx1cmU6IHR5cGVvZiBmYWlsdXJlID09IFwiZnVuY3Rpb25cIiA/IGZhaWx1cmUgOiBmYWxzZVxuXHRcdFx0fTtcblx0XHRcdC8vIE5vdGU6IGB0aGVuKC4uKWAgaXRzZWxmIGNhbiBiZSBib3Jyb3dlZCB0byBiZSB1c2VkIGFnYWluc3Rcblx0XHRcdC8vIGEgZGlmZmVyZW50IHByb21pc2UgY29uc3RydWN0b3IgZm9yIG1ha2luZyB0aGUgY2hhaW5lZCBwcm9taXNlLFxuXHRcdFx0Ly8gYnkgc3Vic3RpdHV0aW5nIGEgZGlmZmVyZW50IGB0aGlzYCBiaW5kaW5nLlxuXHRcdFx0by5wcm9taXNlID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZnVuY3Rpb24gZXh0cmFjdENoYWluKHJlc29sdmUscmVqZWN0KSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzb2x2ZSAhPSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHJlamVjdCAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG8ucmVzb2x2ZSA9IHJlc29sdmU7XG5cdFx0XHRcdG8ucmVqZWN0ID0gcmVqZWN0O1xuXHRcdFx0fSk7XG5cdFx0XHRkZWYuY2hhaW4ucHVzaChvKTtcblxuXHRcdFx0aWYgKGRlZi5zdGF0ZSAhPT0gMCkge1xuXHRcdFx0XHRzY2hlZHVsZShub3RpZnksZGVmKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG8ucHJvbWlzZTtcblx0XHR9O1xuXHRcdHRoaXNbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uICRjYXRjaCQoZmFpbHVyZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsZmFpbHVyZSk7XG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cdFx0XHRleGVjdXRvci5jYWxsKFxuXHRcdFx0XHR2b2lkIDAsXG5cdFx0XHRcdGZ1bmN0aW9uIHB1YmxpY1Jlc29sdmUobXNnKXtcblx0XHRcdFx0XHRyZXNvbHZlLmNhbGwoZGVmLG1zZyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uIHB1YmxpY1JlamVjdChtc2cpIHtcblx0XHRcdFx0XHRyZWplY3QuY2FsbChkZWYsbXNnKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycikge1xuXHRcdFx0cmVqZWN0LmNhbGwoZGVmLGVycik7XG5cdFx0fVxuXHR9XG5cblx0dmFyIFByb21pc2VQcm90b3R5cGUgPSBidWlsdEluUHJvcCh7fSxcImNvbnN0cnVjdG9yXCIsUHJvbWlzZSxcblx0XHQvKmNvbmZpZ3VyYWJsZT0qL2ZhbHNlXG5cdCk7XG5cblx0Ly8gTm90ZTogQW5kcm9pZCA0IGNhbm5vdCB1c2UgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSguLilgIGhlcmVcblx0UHJvbWlzZS5wcm90b3R5cGUgPSBQcm9taXNlUHJvdG90eXBlO1xuXG5cdC8vIGJ1aWx0LWluIFwiYnJhbmRcIiB0byBzaWduYWwgYW4gXCJ1bmluaXRpYWxpemVkXCIgcHJvbWlzZVxuXHRidWlsdEluUHJvcChQcm9taXNlUHJvdG90eXBlLFwiX19OUE9fX1wiLDAsXG5cdFx0Lypjb25maWd1cmFibGU9Ki9mYWxzZVxuXHQpO1xuXG5cdGJ1aWx0SW5Qcm9wKFByb21pc2UsXCJyZXNvbHZlXCIsZnVuY3Rpb24gUHJvbWlzZSRyZXNvbHZlKG1zZykge1xuXHRcdHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cblx0XHQvLyBzcGVjIG1hbmRhdGVkIGNoZWNrc1xuXHRcdC8vIG5vdGU6IGJlc3QgXCJpc1Byb21pc2VcIiBjaGVjayB0aGF0J3MgcHJhY3RpY2FsIGZvciBub3dcblx0XHRpZiAobXNnICYmIHR5cGVvZiBtc2cgPT0gXCJvYmplY3RcIiAmJiBtc2cuX19OUE9fXyA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIG1zZztcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIGV4ZWN1dG9yKHJlc29sdmUscmVqZWN0KXtcblx0XHRcdGlmICh0eXBlb2YgcmVzb2x2ZSAhPSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHJlamVjdCAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7XG5cdFx0XHR9XG5cblx0XHRcdHJlc29sdmUobXNnKTtcblx0XHR9KTtcblx0fSk7XG5cblx0YnVpbHRJblByb3AoUHJvbWlzZSxcInJlamVjdFwiLGZ1bmN0aW9uIFByb21pc2UkcmVqZWN0KG1zZykge1xuXHRcdHJldHVybiBuZXcgdGhpcyhmdW5jdGlvbiBleGVjdXRvcihyZXNvbHZlLHJlamVjdCl7XG5cdFx0XHRpZiAodHlwZW9mIHJlc29sdmUgIT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiByZWplY3QgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdHRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZWplY3QobXNnKTtcblx0XHR9KTtcblx0fSk7XG5cblx0YnVpbHRJblByb3AoUHJvbWlzZSxcImFsbFwiLGZ1bmN0aW9uIFByb21pc2UkYWxsKGFycikge1xuXHRcdHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cblx0XHQvLyBzcGVjIG1hbmRhdGVkIGNoZWNrc1xuXHRcdGlmIChUb1N0cmluZy5jYWxsKGFycikgIT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG5cdFx0XHRyZXR1cm4gQ29uc3RydWN0b3IucmVqZWN0KFR5cGVFcnJvcihcIk5vdCBhbiBhcnJheVwiKSk7XG5cdFx0fVxuXHRcdGlmIChhcnIubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gQ29uc3RydWN0b3IucmVzb2x2ZShbXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBDb25zdHJ1Y3RvcihmdW5jdGlvbiBleGVjdXRvcihyZXNvbHZlLHJlamVjdCl7XG5cdFx0XHRpZiAodHlwZW9mIHJlc29sdmUgIT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiByZWplY3QgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdHRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbGVuID0gYXJyLmxlbmd0aCwgbXNncyA9IEFycmF5KGxlbiksIGNvdW50ID0gMDtcblxuXHRcdFx0aXRlcmF0ZVByb21pc2VzKENvbnN0cnVjdG9yLGFycixmdW5jdGlvbiByZXNvbHZlcihpZHgsbXNnKSB7XG5cdFx0XHRcdG1zZ3NbaWR4XSA9IG1zZztcblx0XHRcdFx0aWYgKCsrY291bnQgPT09IGxlbikge1xuXHRcdFx0XHRcdHJlc29sdmUobXNncyk7XG5cdFx0XHRcdH1cblx0XHRcdH0scmVqZWN0KTtcblx0XHR9KTtcblx0fSk7XG5cblx0YnVpbHRJblByb3AoUHJvbWlzZSxcInJhY2VcIixmdW5jdGlvbiBQcm9taXNlJHJhY2UoYXJyKSB7XG5cdFx0dmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuXHRcdC8vIHNwZWMgbWFuZGF0ZWQgY2hlY2tzXG5cdFx0aWYgKFRvU3RyaW5nLmNhbGwoYXJyKSAhPSBcIltvYmplY3QgQXJyYXldXCIpIHtcblx0XHRcdHJldHVybiBDb25zdHJ1Y3Rvci5yZWplY3QoVHlwZUVycm9yKFwiTm90IGFuIGFycmF5XCIpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIGV4ZWN1dG9yKHJlc29sdmUscmVqZWN0KXtcblx0XHRcdGlmICh0eXBlb2YgcmVzb2x2ZSAhPSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHJlamVjdCAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0dGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7XG5cdFx0XHR9XG5cblx0XHRcdGl0ZXJhdGVQcm9taXNlcyhDb25zdHJ1Y3RvcixhcnIsZnVuY3Rpb24gcmVzb2x2ZXIoaWR4LG1zZyl7XG5cdFx0XHRcdHJlc29sdmUobXNnKTtcblx0XHRcdH0scmVqZWN0KTtcblx0XHR9KTtcblx0fSk7XG5cblx0cmV0dXJuIFByb21pc2U7XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuICAgIFxuICAgIHZhciBjb3B5O1xuICAgIFxuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG4gICAgICAgIGNvcHkgPSBBcnJheShsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBjb3B5W2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IG9iamVjdEtleXMob2JqKTtcbiAgICAgICAgY29weSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29weTtcbn07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoe30uaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgICByZXR1cm4ge30udG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdGhpcy5tYXBbbmFtZV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHZhbHVlLCBuYW1lLCB0aGlzKVxuICAgICAgfSwgdGhpcylcbiAgICB9LCB0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgLy8gT25seSBzdXBwb3J0IEFycmF5QnVmZmVycyBmb3IgUE9TVCBtZXRob2QuXG4gICAgICAgIC8vIFJlY2VpdmluZyBBcnJheUJ1ZmZlcnMgaGFwcGVucyB2aWEgQmxvYnMsIGluc3RlYWQuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG4gICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpKSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gaW5wdXRcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzID8gb3B0aW9ucy5oZWFkZXJzIDogbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdFxuICAgICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpICYmICFpbml0KSB7XG4gICAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgfVxuXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXR1cyA9ICh4aHIuc3RhdHVzID09PSAxMjIzKSA/IDIwNCA6IHhoci5zdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1cyA8IDEwMCB8fCBzdGF0dXMgPiA1OTkpIHtcbiAgICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBJbnRlbnRpb25hbGx5IHVzZSBuYXRpdmUtcHJvbWlzZS1vbmx5IGhlcmUuLi4gT3RoZXIgcHJvbWlzZSBsaWJyYXJpZXMgKGVzNi1wcm9taXNlKVxuLy8gZHVjay1wdW5jaCB0aGUgZ2xvYmFsIFByb21pc2UgZGVmaW5pdGlvbiB3aGljaCBtZXNzZXMgdXAgQW5ndWxhciAyIHNpbmNlIGl0XG4vLyBhbHNvIGR1Y2stcHVuY2hlcyB0aGUgZ2xvYmFsIFByb21pc2UgZGVmaW5pdGlvbi4gRm9yIG5vdywga2VlcCBuYXRpdmUtcHJvbWlzZS1vbmx5LlxudmFyIFByb21pc2UgPSByZXF1aXJlKFwibmF0aXZlLXByb21pc2Utb25seVwiKTtcblxuLy8gUmVxdWlyZSBvdGhlciBsaWJyYXJpZXMuXG5yZXF1aXJlKCd3aGF0d2ctZmV0Y2gnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIyJykuRXZlbnRFbWl0dGVyMjtcbnZhciBjb3B5ID0gcmVxdWlyZSgnc2hhbGxvdy1jb3B5Jyk7XG52YXIgcHJvdmlkZXJzID0gcmVxdWlyZSgnLi9wcm92aWRlcnMnKTtcblxuLy8gVGhlIGRlZmF1bHQgYmFzZSB1cmwuXG52YXIgYmFzZVVybCA9ICdodHRwczovL2FwaS5mb3JtLmlvJztcbnZhciBhcHBVcmwgPSBiYXNlVXJsO1xudmFyIGFwcFVybFNldCA9IGZhbHNlO1xuXG52YXIgcGx1Z2lucyA9IFtdO1xuXG4vLyBUaGUgdGVtcG9yYXJ5IEdFVCByZXF1ZXN0IGNhY2hlIHN0b3JhZ2VcbnZhciBjYWNoZSA9IHt9O1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCl7fTtcbnZhciBpZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuLy8gV2lsbCBpbnZva2UgYSBmdW5jdGlvbiBvbiBhbGwgcGx1Z2lucy5cbi8vIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBhbGwgcHJvbWlzZXNcbi8vIHJldHVybmVkIGJ5IHRoZSBwbHVnaW5zIGhhdmUgcmVzb2x2ZWQuXG4vLyBTaG91bGQgYmUgdXNlZCB3aGVuIHlvdSB3YW50IHBsdWdpbnMgdG8gcHJlcGFyZSBmb3IgYW4gZXZlbnRcbi8vIGJ1dCBkb24ndCB3YW50IGFueSBkYXRhIHJldHVybmVkLlxudmFyIHBsdWdpbldhaXQgPSBmdW5jdGlvbihwbHVnaW5Gbikge1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHBsdWdpbnMubWFwKGZ1bmN0aW9uKHBsdWdpbikge1xuICAgIHJldHVybiAocGx1Z2luW3BsdWdpbkZuXSB8fCBub29wKS5hcHBseShwbHVnaW4sIGFyZ3MpO1xuICB9KSk7XG59O1xuXG4vLyBXaWxsIGludm9rZSBhIGZ1bmN0aW9uIG9uIHBsdWdpbnMgZnJvbSBoaWdoZXN0IHByaW9yaXR5XG4vLyB0byBsb3dlc3QgdW50aWwgb25lIHJldHVybnMgYSB2YWx1ZS4gUmV0dXJucyBudWxsIGlmIG5vXG4vLyBwbHVnaW5zIHJldHVybiBhIHZhbHVlLlxuLy8gU2hvdWxkIGJlIHVzZWQgd2hlbiB5b3Ugd2FudCBqdXN0IG9uZSBwbHVnaW4gdG8gaGFuZGxlIHRoaW5ncy5cbnZhciBwbHVnaW5HZXQgPSBmdW5jdGlvbihwbHVnaW5Gbikge1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgdmFyIGNhbGxQbHVnaW4gPSBmdW5jdGlvbihpbmRleCwgcGx1Z2luRm4pIHtcbiAgICB2YXIgcGx1Z2luID0gcGx1Z2luc1tpbmRleF07XG4gICAgaWYgKCFwbHVnaW4pIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgocGx1Z2luICYmIHBsdWdpbltwbHVnaW5Gbl0gfHwgbm9vcCkuYXBwbHkocGx1Z2luLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgaWYgKHJlc3VsdCAhPT0gbnVsbCAmJiByZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBjYWxsUGx1Z2luLmFwcGx5KG51bGwsIFtpbmRleCArIDFdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiBjYWxsUGx1Z2luLmFwcGx5KG51bGwsIFswXS5jb25jYXQoYXJncykpO1xufTtcblxuLy8gV2lsbCBpbnZva2UgYSBmdW5jdGlvbiBvbiBwbHVnaW5zIGZyb20gaGlnaGVzdCBwcmlvcml0eSB0b1xuLy8gbG93ZXN0LCBidWlsZGluZyBhIHByb21pc2UgY2hhaW4gZnJvbSB0aGVpciByZXR1cm4gdmFsdWVzXG4vLyBTaG91bGQgYmUgdXNlZCB3aGVuIGFsbCBwbHVnaW5zIG5lZWQgdG8gcHJvY2VzcyBhIHByb21pc2Unc1xuLy8gc3VjY2VzcyBvciBmYWlsdXJlXG52YXIgcGx1Z2luQWx0ZXIgPSBmdW5jdGlvbihwbHVnaW5GbiwgdmFsdWUpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gIHJldHVybiBwbHVnaW5zLnJlZHVjZShmdW5jdGlvbih2YWx1ZSwgcGx1Z2luKSB7XG4gICAgICByZXR1cm4gKHBsdWdpbltwbHVnaW5Gbl0gfHwgaWRlbnRpdHkpLmFwcGx5KHBsdWdpbiwgW3ZhbHVlXS5jb25jYXQoYXJncykpO1xuICB9LCB2YWx1ZSk7XG59O1xuXG5cbi8qKlxuICogUmV0dXJucyBwYXJ0cyBvZiB0aGUgVVJMIHRoYXQgYXJlIGltcG9ydGFudC5cbiAqIEluZGV4ZXNcbiAqICAtIDA6IFRoZSBmdWxsIHVybFxuICogIC0gMTogVGhlIHByb3RvY29sXG4gKiAgLSAyOiBUaGUgaG9zdG5hbWVcbiAqICAtIDM6IFRoZSByZXN0XG4gKlxuICogQHBhcmFtIHVybFxuICogQHJldHVybnMgeyp9XG4gKi9cbnZhciBnZXRVcmxQYXJ0cyA9IGZ1bmN0aW9uKHVybCkge1xuICB2YXIgcmVnZXggPSAnXihodHRwW3NdPzpcXFxcL1xcXFwvKSc7XG4gIGlmIChiYXNlVXJsICYmIHVybC5pbmRleE9mKGJhc2VVcmwpID09PSAwKSB7XG4gICAgcmVnZXggKz0gJygnICsgYmFzZVVybC5yZXBsYWNlKC9eaHR0cFtzXT86XFwvXFwvLywgJycpICsgJyknO1xuICB9XG4gIGVsc2Uge1xuICAgIHJlZ2V4ICs9ICcoW14vXSspJztcbiAgfVxuICByZWdleCArPSAnKCR8XFxcXC8uKiknO1xuICByZXR1cm4gdXJsLm1hdGNoKG5ldyBSZWdFeHAocmVnZXgpKTtcbn07XG5cbnZhciBzZXJpYWxpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIHN0ciA9IFtdO1xuICBmb3IodmFyIHAgaW4gb2JqKVxuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChwKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG9ialtwXSkpO1xuICAgIH1cbiAgcmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcbn07XG5cbi8vIFRoZSBmb3JtaW8gY2xhc3MuXG52YXIgRm9ybWlvID0gZnVuY3Rpb24ocGF0aCkge1xuXG4gIC8vIEVuc3VyZSB3ZSBoYXZlIGFuIGluc3RhbmNlIG9mIEZvcm1pby5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZvcm1pbykpIHsgcmV0dXJuIG5ldyBGb3JtaW8ocGF0aCk7IH1cbiAgaWYgKCFwYXRoKSB7XG4gICAgLy8gQWxsb3cgdXNlciB0byBjcmVhdGUgbmV3IHByb2plY3RzIGlmIHRoaXMgd2FzIGluc3RhbnRpYXRlZCB3aXRob3V0XG4gICAgLy8gYSB1cmxcbiAgICB0aGlzLnByb2plY3RVcmwgPSBiYXNlVXJsICsgJy9wcm9qZWN0JztcbiAgICB0aGlzLnByb2plY3RzVXJsID0gYmFzZVVybCArICcvcHJvamVjdCc7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSBmYWxzZTtcbiAgICB0aGlzLnF1ZXJ5ID0gJyc7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSW5pdGlhbGl6ZSBvdXIgdmFyaWFibGVzLlxuICB0aGlzLnByb2plY3RzVXJsID0gJyc7XG4gIHRoaXMucHJvamVjdFVybCA9ICcnO1xuICB0aGlzLnByb2plY3RJZCA9ICcnO1xuICB0aGlzLmZvcm1VcmwgPSAnJztcbiAgdGhpcy5mb3Jtc1VybCA9ICcnO1xuICB0aGlzLmZvcm1JZCA9ICcnO1xuICB0aGlzLnN1Ym1pc3Npb25zVXJsID0gJyc7XG4gIHRoaXMuc3VibWlzc2lvblVybCA9ICcnO1xuICB0aGlzLnN1Ym1pc3Npb25JZCA9ICcnO1xuICB0aGlzLmFjdGlvbnNVcmwgPSAnJztcbiAgdGhpcy5hY3Rpb25JZCA9ICcnO1xuICB0aGlzLmFjdGlvblVybCA9ICcnO1xuICB0aGlzLnF1ZXJ5ID0gJyc7XG5cbiAgLy8gTm9ybWFsaXplIHRvIGFuIGFic29sdXRlIHBhdGguXG4gIGlmICgocGF0aC5pbmRleE9mKCdodHRwJykgIT09IDApICYmIChwYXRoLmluZGV4T2YoJy8vJykgIT09IDApKSB7XG4gICAgYmFzZVVybCA9IGJhc2VVcmwgPyBiYXNlVXJsIDogd2luZG93LmxvY2F0aW9uLmhyZWYubWF0Y2goL2h0dHBbc10/OlxcL1xcL2FwaS4vKVswXTtcbiAgICBwYXRoID0gYmFzZVVybCArIHBhdGg7XG4gIH1cblxuICB2YXIgaG9zdHBhcnRzID0gZ2V0VXJsUGFydHMocGF0aCk7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgaG9zdE5hbWUgPSBob3N0cGFydHNbMV0gKyBob3N0cGFydHNbMl07XG4gIHBhdGggPSBob3N0cGFydHMubGVuZ3RoID4gMyA/IGhvc3RwYXJ0c1szXSA6ICcnO1xuICB2YXIgcXVlcnlwYXJ0cyA9IHBhdGguc3BsaXQoJz8nKTtcbiAgaWYgKHF1ZXJ5cGFydHMubGVuZ3RoID4gMSkge1xuICAgIHBhdGggPSBxdWVyeXBhcnRzWzBdO1xuICAgIHRoaXMucXVlcnkgPSAnPycgKyBxdWVyeXBhcnRzWzFdO1xuICB9XG5cbiAgLy8gU2VlIGlmIHRoaXMgaXMgYSBmb3JtIHBhdGguXG4gIGlmICgocGF0aC5zZWFyY2goLyhefFxcLykoZm9ybXxwcm9qZWN0KSgkfFxcLykvKSAhPT0gLTEpKSB7XG5cbiAgICAvLyBSZWdpc3RlciBhIHNwZWNpZmljIHBhdGguXG4gICAgdmFyIHJlZ2lzdGVyUGF0aCA9IGZ1bmN0aW9uKG5hbWUsIGJhc2UpIHtcbiAgICAgIHRoaXNbbmFtZSArICdzVXJsJ10gPSBiYXNlICsgJy8nICsgbmFtZTtcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ1xcLycgKyBuYW1lICsgJ1xcLyhbXi9dKyknKTtcbiAgICAgIGlmIChwYXRoLnNlYXJjaChyZWdleCkgIT09IC0xKSB7XG4gICAgICAgIHBhcnRzID0gcGF0aC5tYXRjaChyZWdleCk7XG4gICAgICAgIHRoaXNbbmFtZSArICdVcmwnXSA9IHBhcnRzID8gKGJhc2UgKyBwYXJ0c1swXSkgOiAnJztcbiAgICAgICAgdGhpc1tuYW1lICsgJ0lkJ10gPSAocGFydHMubGVuZ3RoID4gMSkgPyBwYXJ0c1sxXSA6ICcnO1xuICAgICAgICBiYXNlICs9IHBhcnRzWzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2U7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYW4gYXJyYXkgb2YgaXRlbXMuXG4gICAgdmFyIHJlZ2lzdGVySXRlbXMgPSBmdW5jdGlvbihpdGVtcywgYmFzZSwgc3RhdGljQmFzZSkge1xuICAgICAgZm9yICh2YXIgaSBpbiBpdGVtcykge1xuICAgICAgICBpZiAoaXRlbXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVySXRlbXMoaXRlbSwgYmFzZSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0Jhc2UgPSByZWdpc3RlclBhdGgoaXRlbSwgYmFzZSk7XG4gICAgICAgICAgICBiYXNlID0gc3RhdGljQmFzZSA/IGJhc2UgOiBuZXdCYXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZWdpc3Rlckl0ZW1zKFsncHJvamVjdCcsICdmb3JtJywgWydzdWJtaXNzaW9uJywgJ2FjdGlvbiddXSwgaG9zdE5hbWUpO1xuXG4gICAgaWYgKCF0aGlzLnByb2plY3RJZCkge1xuICAgICAgaWYgKGhvc3RwYXJ0cy5sZW5ndGggPiAyICYmIGhvc3RwYXJ0c1syXS5zcGxpdCgnLicpLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0VXJsID0gaG9zdE5hbWU7XG4gICAgICAgIHRoaXMucHJvamVjdElkID0gaG9zdHBhcnRzWzJdLnNwbGl0KCcuJylbMF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuXG4gICAgLy8gVGhpcyBpcyBhbiBhbGlhc2VkIHVybC5cbiAgICB0aGlzLnByb2plY3RVcmwgPSBob3N0TmFtZTtcbiAgICB0aGlzLnByb2plY3RJZCA9IChob3N0cGFydHMubGVuZ3RoID4gMikgPyBob3N0cGFydHNbMl0uc3BsaXQoJy4nKVswXSA6ICcnO1xuICAgIHZhciBzdWJSZWdFeCA9IG5ldyBSZWdFeHAoJ1xcLyhzdWJtaXNzaW9ufGFjdGlvbikoJHxcXC8uKiknKTtcbiAgICB2YXIgc3VicyA9IHBhdGgubWF0Y2goc3ViUmVnRXgpO1xuICAgIHRoaXMucGF0aFR5cGUgPSAoc3VicyAmJiAoc3Vicy5sZW5ndGggPiAxKSkgPyBzdWJzWzFdIDogJyc7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZShzdWJSZWdFeCwgJycpO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG4gICAgdGhpcy5mb3Jtc1VybCA9IGhvc3ROYW1lICsgJy9mb3JtJztcbiAgICB0aGlzLmZvcm1VcmwgPSBob3N0TmFtZSArIHBhdGg7XG4gICAgdGhpcy5mb3JtSWQgPSBwYXRoLnJlcGxhY2UoL15cXC8rfFxcLyskL2csICcnKTtcbiAgICB2YXIgaXRlbXMgPSBbJ3N1Ym1pc3Npb24nLCAnYWN0aW9uJ107XG4gICAgZm9yICh2YXIgaSBpbiBpdGVtcykge1xuICAgICAgaWYgKGl0ZW1zLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIHRoaXNbaXRlbSArICdzVXJsJ10gPSBob3N0TmFtZSArIHBhdGggKyAnLycgKyBpdGVtO1xuICAgICAgICBpZiAoKHRoaXMucGF0aFR5cGUgPT09IGl0ZW0pICYmIChzdWJzLmxlbmd0aCA+IDIpICYmIHN1YnNbMl0pIHtcbiAgICAgICAgICB0aGlzW2l0ZW0gKyAnSWQnXSA9IHN1YnNbMl0ucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgJycpO1xuICAgICAgICAgIHRoaXNbaXRlbSArICdVcmwnXSA9IGhvc3ROYW1lICsgcGF0aCArIHN1YnNbMF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTZXQgdGhlIGFwcCB1cmwgaWYgaXQgaXMgbm90IHNldC5cbiAgaWYgKCFhcHBVcmxTZXQpIHtcbiAgICBhcHBVcmwgPSB0aGlzLnByb2plY3RVcmw7XG4gIH1cbn07XG5cbi8qKlxuICogTG9hZCBhIHJlc291cmNlLlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX2xvYWQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBfaWQgPSB0eXBlICsgJ0lkJztcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XG4gIHJldHVybiBmdW5jdGlvbihxdWVyeSwgb3B0cykge1xuICAgIGlmIChxdWVyeSAmJiB0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XG4gICAgICBxdWVyeSA9IHNlcmlhbGl6ZShxdWVyeS5wYXJhbXMpO1xuICAgIH1cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHF1ZXJ5ID0gdGhpcy5xdWVyeSA/ICh0aGlzLnF1ZXJ5ICsgJyYnICsgcXVlcnkpIDogKCc/JyArIHF1ZXJ5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBxdWVyeSA9IHRoaXMucXVlcnk7XG4gICAgfVxuICAgIGlmICghdGhpc1tfaWRdKSB7IHJldHVybiBQcm9taXNlLnJlamVjdCgnTWlzc2luZyAnICsgX2lkKTsgfVxuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHR5cGUsIHRoaXNbX3VybF0gKyBxdWVyeSwgJ2dldCcsIG51bGwsIG9wdHMpO1xuICB9O1xufTtcblxuLyoqXG4gKiBTYXZlIGEgcmVzb3VyY2UuXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfc2F2ZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIF9pZCA9IHR5cGUgKyAnSWQnO1xuICB2YXIgX3VybCA9IHR5cGUgKyAnVXJsJztcbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEsIG9wdHMpIHtcbiAgICB2YXIgbWV0aG9kID0gKHRoaXNbX2lkXSB8fCBkYXRhLl9pZCkgPyAncHV0JyA6ICdwb3N0JztcbiAgICB2YXIgcmVxVXJsID0gdGhpc1tfaWRdID8gdGhpc1tfdXJsXSA6IHRoaXNbdHlwZSArICdzVXJsJ107XG4gICAgaWYgKCF0aGlzW19pZF0gJiYgZGF0YS5faWQgJiYgKG1ldGhvZCA9PT0gJ3B1dCcpKSB7XG4gICAgICByZXFVcmwgKz0gJy8nICsgZGF0YS5faWQ7XG4gICAgfVxuICAgIGNhY2hlID0ge307XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QodHlwZSwgcmVxVXJsICsgdGhpcy5xdWVyeSwgbWV0aG9kLCBkYXRhLCBvcHRzKTtcbiAgfTtcbn07XG5cbi8qKlxuICogRGVsZXRlIGEgcmVzb3VyY2UuXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfZGVsZXRlID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgX2lkID0gdHlwZSArICdJZCc7XG4gIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xuICByZXR1cm4gZnVuY3Rpb24ob3B0cykge1xuICAgIGlmICghdGhpc1tfaWRdKSB7IFByb21pc2UucmVqZWN0KCdOb3RoaW5nIHRvIGRlbGV0ZScpOyB9XG4gICAgY2FjaGUgPSB7fTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCB0aGlzW191cmxdLCAnZGVsZXRlJywgbnVsbCwgb3B0cyk7XG4gIH07XG59O1xuXG4vKipcbiAqIFJlc291cmNlIGluZGV4IG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xudmFyIF9pbmRleCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XG4gIHJldHVybiBmdW5jdGlvbihxdWVyeSwgb3B0cykge1xuICAgIHF1ZXJ5ID0gcXVlcnkgfHwgJyc7XG4gICAgaWYgKHF1ZXJ5ICYmIHR5cGVvZiBxdWVyeSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHF1ZXJ5ID0gJz8nICsgc2VyaWFsaXplKHF1ZXJ5LnBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHR5cGUsIHRoaXNbX3VybF0gKyBxdWVyeSwgJ2dldCcsIG51bGwsIG9wdHMpO1xuICB9O1xufTtcblxuLy8gQWN0aXZhdGVzIHBsdWdpbiBob29rcywgbWFrZXMgRm9ybWlvLnJlcXVlc3QgaWYgbm8gcGx1Z2luIHByb3ZpZGVzIGEgcmVxdWVzdFxuRm9ybWlvLnByb3RvdHlwZS5tYWtlUmVxdWVzdCA9IGZ1bmN0aW9uKHR5cGUsIHVybCwgbWV0aG9kLCBkYXRhLCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgbWV0aG9kID0gKG1ldGhvZCB8fCAnR0VUJykudG9VcHBlckNhc2UoKTtcbiAgaWYoIW9wdHMgfHwgdHlwZW9mIG9wdHMgIT09ICdvYmplY3QnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgdmFyIHJlcXVlc3RBcmdzID0ge1xuICAgIGZvcm1pbzogc2VsZixcbiAgICB0eXBlOiB0eXBlLFxuICAgIHVybDogdXJsLFxuICAgIG1ldGhvZDogbWV0aG9kLFxuICAgIGRhdGE6IGRhdGEsXG4gICAgb3B0czogb3B0c1xuICB9O1xuXG4gIHZhciByZXF1ZXN0ID0gcGx1Z2luV2FpdCgncHJlUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAudGhlbihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcGx1Z2luR2V0KCdyZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBGb3JtaW8ucmVxdWVzdCh1cmwsIG1ldGhvZCwgZGF0YSwgb3B0cy5oZWFkZXIsIG9wdHMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XG59O1xuXG4vLyBEZWZpbmUgc3BlY2lmaWMgQ1JVRCBtZXRob2RzLlxuRm9ybWlvLnByb3RvdHlwZS5sb2FkUHJvamVjdCA9IF9sb2FkKCdwcm9qZWN0Jyk7XG5Gb3JtaW8ucHJvdG90eXBlLnNhdmVQcm9qZWN0ID0gX3NhdmUoJ3Byb2plY3QnKTtcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlUHJvamVjdCA9IF9kZWxldGUoJ3Byb2plY3QnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZEZvcm0gPSBfbG9hZCgnZm9ybScpO1xuRm9ybWlvLnByb3RvdHlwZS5zYXZlRm9ybSA9IF9zYXZlKCdmb3JtJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZUZvcm0gPSBfZGVsZXRlKCdmb3JtJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRGb3JtcyA9IF9pbmRleCgnZm9ybXMnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZFN1Ym1pc3Npb24gPSBfbG9hZCgnc3VibWlzc2lvbicpO1xuRm9ybWlvLnByb3RvdHlwZS5zYXZlU3VibWlzc2lvbiA9IF9zYXZlKCdzdWJtaXNzaW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZVN1Ym1pc3Npb24gPSBfZGVsZXRlKCdzdWJtaXNzaW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRTdWJtaXNzaW9ucyA9IF9pbmRleCgnc3VibWlzc2lvbnMnKTtcbkZvcm1pby5wcm90b3R5cGUubG9hZEFjdGlvbiA9IF9sb2FkKCdhY3Rpb24nKTtcbkZvcm1pby5wcm90b3R5cGUuc2F2ZUFjdGlvbiA9IF9zYXZlKCdhY3Rpb24nKTtcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlQWN0aW9uID0gX2RlbGV0ZSgnYWN0aW9uJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRBY3Rpb25zID0gX2luZGV4KCdhY3Rpb25zJyk7XG5Gb3JtaW8ucHJvdG90eXBlLmF2YWlsYWJsZUFjdGlvbnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QoJ2F2YWlsYWJsZUFjdGlvbnMnLCB0aGlzLmZvcm1VcmwgKyAnL2FjdGlvbnMnKTsgfTtcbkZvcm1pby5wcm90b3R5cGUuYWN0aW9uSW5mbyA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QoJ2FjdGlvbkluZm8nLCB0aGlzLmZvcm1VcmwgKyAnL2FjdGlvbnMvJyArIG5hbWUpOyB9O1xuXG5Gb3JtaW8ucHJvdG90eXBlLnVwbG9hZEZpbGUgPSBmdW5jdGlvbihzdG9yYWdlLCBmaWxlLCBmaWxlTmFtZSwgZGlyLCBwcm9ncmVzc0NhbGxiYWNrLCB1cmwpIHtcbiAgdmFyIHJlcXVlc3RBcmdzID0ge1xuICAgIHByb3ZpZGVyOiBzdG9yYWdlLFxuICAgIG1ldGhvZDogJ3VwbG9hZCcsXG4gICAgZmlsZTogZmlsZSxcbiAgICBmaWxlTmFtZTogZmlsZU5hbWUsXG4gICAgZGlyOiBkaXJcbiAgfVxuICB2YXIgcmVxdWVzdCA9IHBsdWdpbldhaXQoJ3ByZVJlcXVlc3QnLCByZXF1ZXN0QXJncylcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwbHVnaW5HZXQoJ2ZpbGVSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgIGlmIChzdG9yYWdlICYmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAocHJvdmlkZXJzLnN0b3JhZ2UuaGFzT3duUHJvcGVydHkoc3RvcmFnZSkpIHtcbiAgICAgICAgICAgICAgdmFyIHByb3ZpZGVyID0gbmV3IHByb3ZpZGVycy5zdG9yYWdlW3N0b3JhZ2VdKHRoaXMpO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvdmlkZXIudXBsb2FkRmlsZShmaWxlLCBmaWxlTmFtZSwgZGlyLCBwcm9ncmVzc0NhbGxiYWNrLCB1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93KCdTdG9yYWdlIHByb3ZpZGVyIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHt1cmw6ICcnfTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gIHJldHVybiBwbHVnaW5BbHRlcignd3JhcEZpbGVSZXF1ZXN0UHJvbWlzZScsIHJlcXVlc3QsIHJlcXVlc3RBcmdzKTtcbn07XG5cbkZvcm1pby5wcm90b3R5cGUuZG93bmxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgcmVxdWVzdEFyZ3MgPSB7XG4gICAgbWV0aG9kOiAnZG93bmxvYWQnLFxuICAgIGZpbGU6IGZpbGVcbiAgfTtcblxuICB2YXIgcmVxdWVzdCA9IHBsdWdpbldhaXQoJ3ByZVJlcXVlc3QnLCByZXF1ZXN0QXJncylcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwbHVnaW5HZXQoJ2ZpbGVSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgIGlmIChmaWxlLnN0b3JhZ2UgJiYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChwcm92aWRlcnMuc3RvcmFnZS5oYXNPd25Qcm9wZXJ0eShmaWxlLnN0b3JhZ2UpKSB7XG4gICAgICAgICAgICAgIHZhciBwcm92aWRlciA9IG5ldyBwcm92aWRlcnMuc3RvcmFnZVtmaWxlLnN0b3JhZ2VdKHRoaXMpO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvdmlkZXIuZG93bmxvYWRGaWxlKGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93KCdTdG9yYWdlIHByb3ZpZGVyIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHt1cmw6ICcnfTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gIHJldHVybiBwbHVnaW5BbHRlcignd3JhcEZpbGVSZXF1ZXN0UHJvbWlzZScsIHJlcXVlc3QsIHJlcXVlc3RBcmdzKTtcbn07XG5cbkZvcm1pby5tYWtlU3RhdGljUmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBkYXRhLCBvcHRzKSB7XG4gIG1ldGhvZCA9IChtZXRob2QgfHwgJ0dFVCcpLnRvVXBwZXJDYXNlKCk7XG4gIGlmKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuICB2YXIgcmVxdWVzdEFyZ3MgPSB7XG4gICAgdXJsOiB1cmwsXG4gICAgbWV0aG9kOiBtZXRob2QsXG4gICAgZGF0YTogZGF0YVxuICB9O1xuXG4gIHZhciByZXF1ZXN0ID0gcGx1Z2luV2FpdCgncHJlUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxuICAudGhlbihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcGx1Z2luR2V0KCdzdGF0aWNSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBGb3JtaW8ucmVxdWVzdCh1cmwsIG1ldGhvZCwgZGF0YSwgb3B0cy5oZWFkZXIsIG9wdHMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwU3RhdGljUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XG59O1xuXG4vLyBTdGF0aWMgbWV0aG9kcy5cbkZvcm1pby5sb2FkUHJvamVjdHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICBxdWVyeSA9IHF1ZXJ5IHx8ICcnO1xuICBpZiAodHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xuICAgIHF1ZXJ5ID0gJz8nICsgc2VyaWFsaXplKHF1ZXJ5LnBhcmFtcyk7XG4gIH1cbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QoYmFzZVVybCArICcvcHJvamVjdCcgKyBxdWVyeSk7XG59O1xuXG4vKipcbiAqIE1ha2UgYSBmb3JtaW8gcmVxdWVzdCwgdXNpbmcgdGhlIGN1cnJlbnQgdG9rZW4uXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIG1ldGhvZFxuICogQHBhcmFtIGRhdGFcbiAqIEBwYXJhbSBoZWFkZXJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaWdub3JlQ2FjaGVcbiAqICAgV2hldGhlciBvciBub3QgdG8gdXNlIHRoZSBjYWNoZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Gb3JtaW8ucmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBkYXRhLCBoZWFkZXIsIG9wdHMpIHtcbiAgaWYgKCF1cmwpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ05vIHVybCBwcm92aWRlZCcpO1xuICB9XG4gIG1ldGhvZCA9IChtZXRob2QgfHwgJ0dFVCcpLnRvVXBwZXJDYXNlKCk7XG5cbiAgLy8gRm9yIHJldmVyc2UgY29tcGF0aWJpbGl0eSwgaWYgdGhleSBwcm92aWRlZCB0aGUgaWdub3JlQ2FjaGUgcGFyYW1ldGVyLFxuICAvLyB0aGVuIGNoYW5nZSBpdCBiYWNrIHRvIHRoZSBvcHRpb25zIGZvcm1hdCB3aGVyZSB0aGF0IGlzIGEgcGFyYW1ldGVyLlxuICBpZiAodHlwZW9mIG9wdHMgPT09ICdib29sZWFuJykge1xuICAgIG9wdHMgPSB7aWdub3JlQ2FjaGU6IG9wdHN9O1xuICB9XG4gIGlmKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIHZhciBjYWNoZUtleSA9IGJ0b2EodXJsKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gR2V0IHRoZSBjYWNoZWQgcHJvbWlzZSB0byBzYXZlIG11bHRpcGxlIGxvYWRzLlxuICAgIGlmICghb3B0cy5pZ25vcmVDYWNoZSAmJiBtZXRob2QgPT09ICdHRVQnICYmIGNhY2hlLmhhc093blByb3BlcnR5KGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHJlc29sdmUoY2FjaGVbY2FjaGVLZXldKTtcbiAgICB9XG5cbiAgICByZXNvbHZlKG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgLy8gU2V0IHVwIGFuZCBmZXRjaCByZXF1ZXN0XG4gICAgICB2YXIgaGVhZGVycyA9IGhlYWRlciB8fCBuZXcgSGVhZGVycyh7XG4gICAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnXG4gICAgICAgIH0pO1xuICAgICAgdmFyIHRva2VuID0gRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoJ3gtand0LXRva2VuJywgdG9rZW4pO1xuICAgICAgfVxuXG4gICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIGhlYWRlcnM6IGhlYWRlcnMsXG4gICAgICAgIG1vZGU6ICdjb3JzJ1xuICAgICAgfTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKGZldGNoKHVybCwgb3B0aW9ucykpO1xuICAgIH0pXG4gICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgZXJyLm1lc3NhZ2UgPSAnQ291bGQgbm90IGNvbm5lY3QgdG8gQVBJIHNlcnZlciAoJyArIGVyci5tZXNzYWdlICsgJyknO1xuICAgICAgZXJyLm5ldHdvcmtFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0NDApIHtcbiAgICAgICAgICBGb3JtaW8uc2V0VG9rZW4obnVsbCk7XG4gICAgICAgICAgRm9ybWlvLmV2ZW50cy5lbWl0KCdmb3JtaW8uc2Vzc2lvbkV4cGlyZWQnLCByZXNwb25zZS5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgIEZvcm1pby5ldmVudHMuZW1pdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIHJlc3BvbnNlLmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCByZXR1cm4gdGhlIGVycm9yIGFzIGEgcmVqZWN0ZWQgcHJvbWlzZSB0byByZWplY3QgdGhpcyBwcm9taXNlXG4gICAgICAgIHJldHVybiAocmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTEgP1xuICAgICAgICAgIHJlc3BvbnNlLmpzb24oKSA6IHJlc3BvbnNlLnRleHQoKSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gSGFuZGxlIGZldGNoIHJlc3VsdHNcbiAgICAgIHZhciB0b2tlbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCd4LWp3dC10b2tlbicpO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwICYmIHRva2VuICYmIHRva2VuICE9PSAnJykge1xuICAgICAgICBGb3JtaW8uc2V0VG9rZW4odG9rZW4pO1xuICAgICAgfVxuICAgICAgLy8gMjA0IGlzIG5vIGNvbnRlbnQuIERvbid0IHRyeSB0byAuanNvbigpIGl0LlxuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjA0KSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAocmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTFcbiAgICAgICAgPyByZXNwb25zZS5qc29uKClcbiAgICAgICAgOiByZXNwb25zZS50ZXh0KClcbiAgICAgICkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgLy8gQWRkIHNvbWUgY29udGVudC1yYW5nZSBtZXRhZGF0YSB0byB0aGUgcmVzdWx0IGhlcmVcbiAgICAgICAgdmFyIHJhbmdlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtcmFuZ2UnKTtcbiAgICAgICAgaWYgKHJhbmdlICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmFuZ2UgPSByYW5nZS5zcGxpdCgnLycpO1xuICAgICAgICAgIGlmKHJhbmdlWzBdICE9PSAnKicpIHtcbiAgICAgICAgICAgIHZhciBza2lwTGltaXQgPSByYW5nZVswXS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgcmVzdWx0LnNraXAgPSBOdW1iZXIoc2tpcExpbWl0WzBdKTtcbiAgICAgICAgICAgIHJlc3VsdC5saW1pdCA9IHNraXBMaW1pdFsxXSAtIHNraXBMaW1pdFswXSArIDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdC5zZXJ2ZXJDb3VudCA9IHJhbmdlWzFdID09PSAnKicgPyByYW5nZVsxXSA6IE51bWJlcihyYW5nZVsxXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdHMuZ2V0SGVhZGVycykge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaGVhZGVycyA9IHt9O1xuICAgICAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaXRlbSwga2V5KSB7XG4gICAgICAgICAgaGVhZGVyc1trZXldID0gaXRlbTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIHJlc29sdmUoe3Jlc3VsdDogcmVzdWx0LCBoZWFkZXJzOiBoZWFkZXJzfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSlcbiAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyID09PSAnQmFkIFRva2VuJykge1xuICAgICAgICBGb3JtaW8uc2V0VG9rZW4obnVsbCk7XG4gICAgICAgIEZvcm1pby5ldmVudHMuZW1pdCgnZm9ybWlvLmJhZFRva2VuJywgZXJyKTtcbiAgICAgIH1cbiAgICAgIC8vIFJlbW92ZSBmYWlsZWQgcHJvbWlzZXMgZnJvbSBjYWNoZVxuICAgICAgZGVsZXRlIGNhY2hlW2NhY2hlS2V5XTtcbiAgICAgIC8vIFByb3BhZ2F0ZSBlcnJvciBzbyBjbGllbnQgY2FuIGhhbmRsZSBhY2NvcmRpbmdseVxuICAgICAgdGhyb3cgZXJyO1xuICAgIH0pKTtcbiAgfSlcbiAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgLy8gU2F2ZSB0aGUgY2FjaGVcbiAgICBpZiAobWV0aG9kID09PSAnR0VUJykge1xuICAgICAgY2FjaGVbY2FjaGVLZXldID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgfVxuXG4gICAgLy8gU2hhbGxvdyBjb3B5IHJlc3VsdCBzbyBtb2RpZmljYXRpb25zIGRvbid0IGVuZCB1cCBpbiBjYWNoZVxuICAgIGlmKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgdmFyIHJlc3VsdENvcHkgPSByZXN1bHQubWFwKGNvcHkpO1xuICAgICAgcmVzdWx0Q29weS5za2lwID0gcmVzdWx0LnNraXA7XG4gICAgICByZXN1bHRDb3B5LmxpbWl0ID0gcmVzdWx0LmxpbWl0O1xuICAgICAgcmVzdWx0Q29weS5zZXJ2ZXJDb3VudCA9IHJlc3VsdC5zZXJ2ZXJDb3VudDtcbiAgICAgIHJldHVybiByZXN1bHRDb3B5O1xuICAgIH1cbiAgICByZXR1cm4gY29weShyZXN1bHQpO1xuICB9KTtcbn07XG5cbkZvcm1pby5zZXRUb2tlbiA9IGZ1bmN0aW9uKHRva2VuKSB7XG4gIHRva2VuID0gdG9rZW4gfHwgJyc7XG4gIGlmICh0b2tlbiA9PT0gdGhpcy50b2tlbikgeyByZXR1cm47IH1cbiAgdGhpcy50b2tlbiA9IHRva2VuO1xuICBpZiAoIXRva2VuKSB7XG4gICAgRm9ybWlvLnNldFVzZXIobnVsbCk7XG4gICAgLy8gaU9TIGluIHByaXZhdGUgYnJvd3NlIG1vZGUgd2lsbCB0aHJvdyBhbiBlcnJvciBidXQgd2UgY2FuJ3QgZGV0ZWN0IGFoZWFkIG9mIHRpbWUgdGhhdCB3ZSBhcmUgaW4gcHJpdmF0ZSBtb2RlLlxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1Rva2VuJyk7XG4gICAgfVxuICAgIGNhdGNoKGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICAvLyBpT1MgaW4gcHJpdmF0ZSBicm93c2UgbW9kZSB3aWxsIHRocm93IGFuIGVycm9yIGJ1dCB3ZSBjYW4ndCBkZXRlY3QgYWhlYWQgb2YgdGltZSB0aGF0IHdlIGFyZSBpbiBwcml2YXRlIG1vZGUuXG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb1Rva2VuJywgdG9rZW4pO1xuICB9XG4gIGNhdGNoKGVycikge1xuICAgIC8vIERvIG5vdGhpbmcuXG4gIH1cbiAgcmV0dXJuIEZvcm1pby5jdXJyZW50VXNlcigpOyAvLyBSdW4gdGhpcyBzbyB1c2VyIGlzIHVwZGF0ZWQgaWYgbnVsbFxufTtcblxuRm9ybWlvLmdldFRva2VuID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnRva2VuKSB7IHJldHVybiB0aGlzLnRva2VuOyB9XG4gIHRyeSB7XG4gICAgdmFyIHRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1Rva2VuJykgfHwgJyc7XG4gICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIHJldHVybiB0b2tlbjtcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIHJldHVybiAnJztcbiAgfVxufTtcblxuRm9ybWlvLnNldFVzZXIgPSBmdW5jdGlvbih1c2VyKSB7XG4gIGlmICghdXNlcikge1xuICAgIHRoaXMuc2V0VG9rZW4obnVsbCk7XG4gICAgLy8gaU9TIGluIHByaXZhdGUgYnJvd3NlIG1vZGUgd2lsbCB0aHJvdyBhbiBlcnJvciBidXQgd2UgY2FuJ3QgZGV0ZWN0IGFoZWFkIG9mIHRpbWUgdGhhdCB3ZSBhcmUgaW4gcHJpdmF0ZSBtb2RlLlxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1VzZXInKTtcbiAgICB9XG4gICAgY2F0Y2goZXJyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIC8vIGlPUyBpbiBwcml2YXRlIGJyb3dzZSBtb2RlIHdpbGwgdGhyb3cgYW4gZXJyb3IgYnV0IHdlIGNhbid0IGRldGVjdCBhaGVhZCBvZiB0aW1lIHRoYXQgd2UgYXJlIGluIHByaXZhdGUgbW9kZS5cbiAgdHJ5IHtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvVXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcbiAgfVxuICBjYXRjaChlcnIpIHtcbiAgICAvLyBEbyBub3RoaW5nLlxuICB9XG59O1xuXG5Gb3JtaW8uZ2V0VXNlciA9IGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Vc2VyJykgfHwgbnVsbCk7XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbkZvcm1pby5zZXRCYXNlVXJsID0gZnVuY3Rpb24odXJsKSB7XG4gIGJhc2VVcmwgPSB1cmw7XG4gIGlmICghYXBwVXJsU2V0KSB7XG4gICAgYXBwVXJsID0gdXJsO1xuICB9XG59O1xuXG5Gb3JtaW8uZ2V0QmFzZVVybCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gYmFzZVVybDtcbn07XG5cbkZvcm1pby5zZXRBcHBVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgYXBwVXJsID0gdXJsO1xuICBhcHBVcmxTZXQgPSB0cnVlO1xufTtcblxuRm9ybWlvLmdldEFwcFVybCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gYXBwVXJsO1xufTtcblxuRm9ybWlvLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbigpIHsgY2FjaGUgPSB7fTsgfTtcblxuLyoqXG4gKiBBdHRhY2ggYW4gSFRNTCBmb3JtIHRvIEZvcm0uaW8uXG4gKlxuICogQHBhcmFtIGZvcm1cbiAqL1xuRm9ybWlvLmZvcm0gPSBmdW5jdGlvbihmb3JtLCBvcHRpb25zLCBkb25lKSB7XG4gIC8vIEZpeCB0aGUgcGFyYW1ldGVycy5cbiAgaWYgKCFkb25lICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZG9uZSA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgZG9uZSA9IGRvbmUgfHwgKGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZyhhcmd1bWVudHMpOyB9KTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gSUYgdGhleSBwcm92aWRlIGEganF1ZXJ5IG9iamVjdCwgdGhlbiBzZWxlY3QgdGhlIGVsZW1lbnQuXG4gIGlmIChmb3JtLmpxdWVyeSkgeyBmb3JtID0gZm9ybVswXTsgfVxuICBpZiAoIWZvcm0pIHtcbiAgICByZXR1cm4gZG9uZSgnSW52YWxpZCBGb3JtJyk7XG4gIH1cblxuICB2YXIgZ2V0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm9ybSB8fCBmb3JtLmdldEF0dHJpYnV0ZSgnYWN0aW9uJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgc3VibWlzc2lvbiBvYmplY3QuXG4gICAqIEByZXR1cm5zIHt7ZGF0YToge319fVxuICAgKi9cbiAgdmFyIGdldFN1Ym1pc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3VibWlzc2lvbiA9IHtkYXRhOiB7fX07XG4gICAgdmFyIHNldFZhbHVlID0gZnVuY3Rpb24ocGF0aCwgdmFsdWUpIHtcbiAgICAgIHZhciBwYXRocyA9IHBhdGgucmVwbGFjZSgvXFxbfFxcXVxcWy9nLCAnLicpLnJlcGxhY2UoL1xcXSQvZywgJycpLnNwbGl0KCcuJyk7XG4gICAgICB2YXIgY3VycmVudCA9IHN1Ym1pc3Npb247XG4gICAgICB3aGlsZSAocGF0aCA9IHBhdGhzLnNoaWZ0KCkpIHtcbiAgICAgICAgaWYgKCFwYXRocy5sZW5ndGgpIHtcbiAgICAgICAgICBjdXJyZW50W3BhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKCFjdXJyZW50W3BhdGhdKSB7XG4gICAgICAgICAgICBjdXJyZW50W3BhdGhdID0ge307XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhdGhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIEdldCB0aGUgZm9ybSBkYXRhIGZyb20gdGhpcyBmb3JtLlxuICAgIHZhciBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YShmb3JtKTtcbiAgICB2YXIgZW50cmllcyA9IGZvcm1EYXRhLmVudHJpZXMoKTtcbiAgICB2YXIgZW50cnkgPSBudWxsO1xuICAgIHdoaWxlIChlbnRyeSA9IGVudHJpZXMubmV4dCgpLnZhbHVlKSB7XG4gICAgICBzZXRWYWx1ZShlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gc3VibWlzc2lvbjtcbiAgfTtcblxuICAvLyBTdWJtaXRzIHRoZSBmb3JtLlxuICB2YXIgc3VibWl0ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICAgIHZhciBhY3Rpb24gPSBnZXRBY3Rpb24oKTtcbiAgICBpZiAoIWFjdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAobmV3IEZvcm1pbyhhY3Rpb24pKS5zYXZlU3VibWlzc2lvbihnZXRTdWJtaXNzaW9uKCkpLnRoZW4oZnVuY3Rpb24oc3ViKSB7XG4gICAgICBkb25lKG51bGwsIHN1Yik7XG4gICAgfSwgZG9uZSk7XG4gIH07XG5cbiAgLy8gQXR0YWNoIGZvcm1pbyB0byB0aGUgcHJvdmlkZWQgZm9ybS5cbiAgaWYgKGZvcm0uYXR0YWNoRXZlbnQpIHtcbiAgICBmb3JtLmF0dGFjaEV2ZW50KCdzdWJtaXQnLCBzdWJtaXQpO1xuICB9IGVsc2Uge1xuICAgIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0Jywgc3VibWl0KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3VibWl0OiBzdWJtaXQsXG4gICAgZ2V0QWN0aW9uOiBnZXRBY3Rpb24sXG4gICAgZ2V0U3VibWlzc2lvbjogZ2V0U3VibWlzc2lvblxuICB9O1xufTtcblxuRm9ybWlvLmN1cnJlbnRVc2VyID0gZnVuY3Rpb24oKSB7XG4gIHZhciB1cmwgPSBiYXNlVXJsICsgJy9jdXJyZW50JztcbiAgdmFyIHVzZXIgPSB0aGlzLmdldFVzZXIoKTtcbiAgaWYgKHVzZXIpIHtcbiAgICByZXR1cm4gcGx1Z2luQWx0ZXIoJ3dyYXBTdGF0aWNSZXF1ZXN0UHJvbWlzZScsIFByb21pc2UucmVzb2x2ZSh1c2VyKSwge1xuICAgICAgdXJsOiB1cmwsXG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfSlcbiAgfVxuICB2YXIgdG9rZW4gPSB0aGlzLmdldFRva2VuKCk7XG4gIGlmICghdG9rZW4pIHtcbiAgICByZXR1cm4gcGx1Z2luQWx0ZXIoJ3dyYXBTdGF0aWNSZXF1ZXN0UHJvbWlzZScsIFByb21pc2UucmVzb2x2ZShudWxsKSwge1xuICAgICAgdXJsOiB1cmwsXG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfSlcbiAgfVxuICByZXR1cm4gdGhpcy5tYWtlU3RhdGljUmVxdWVzdCh1cmwpXG4gIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgRm9ybWlvLnNldFVzZXIocmVzcG9uc2UpO1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSk7XG59O1xuXG4vLyBLZWVwIHRyYWNrIG9mIHRoZWlyIGxvZ291dCBjYWxsYmFjay5cbkZvcm1pby5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG9uTG9nb3V0ID0gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgdGhpcy5zZXRUb2tlbihudWxsKTtcbiAgICB0aGlzLnNldFVzZXIobnVsbCk7XG4gICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LmJpbmQodGhpcyk7XG4gIHJldHVybiB0aGlzLm1ha2VTdGF0aWNSZXF1ZXN0KGJhc2VVcmwgKyAnL2xvZ291dCcpLnRoZW4ob25Mb2dvdXQpLmNhdGNoKG9uTG9nb3V0KTtcbn07XG5cbkZvcm1pby5maWVsZERhdGEgPSBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQpIHtcbiAgaWYgKCFkYXRhKSB7IHJldHVybiAnJzsgfVxuICBpZiAoIWNvbXBvbmVudCB8fCAhY29tcG9uZW50LmtleSkgeyByZXR1cm4gZGF0YTsgfVxuICBpZiAoY29tcG9uZW50LmtleS5pbmRleE9mKCcuJykgIT09IC0xKSB7XG4gICAgdmFyIHZhbHVlID0gZGF0YTtcbiAgICB2YXIgcGFydHMgPSBjb21wb25lbnQua2V5LnNwbGl0KCcuJyk7XG4gICAgdmFyIGtleSA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGtleSA9IHBhcnRzW2ldO1xuXG4gICAgICAvLyBIYW5kbGUgbmVzdGVkIHJlc291cmNlc1xuICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KCdfaWQnKSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLmRhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldHVybiBpZiB0aGUga2V5IGlzIG5vdCBmb3VuZCBvbiB0aGUgdmFsdWUuXG4gICAgICBpZiAoIXZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IG9sZCBzaW5nbGUgZmllbGQgZGF0YSBpbiBzdWJtaXNzaW9ucyB0byBtdWx0aXBsZVxuICAgICAgaWYgKGtleSA9PT0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0gJiYgY29tcG9uZW50Lm11bHRpcGxlICYmICFBcnJheS5pc0FycmF5KHZhbHVlW2tleV0pKSB7XG4gICAgICAgIHZhbHVlW2tleV0gPSBbdmFsdWVba2V5XV07XG4gICAgICB9XG5cbiAgICAgIC8vIFNldCB0aGUgdmFsdWUgb2YgdGhpcyBrZXkuXG4gICAgICB2YWx1ZSA9IHZhbHVlW2tleV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBDb252ZXJ0IG9sZCBzaW5nbGUgZmllbGQgZGF0YSBpbiBzdWJtaXNzaW9ucyB0byBtdWx0aXBsZVxuICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkoZGF0YVtjb21wb25lbnQua2V5XSkpIHtcbiAgICAgIGRhdGFbY29tcG9uZW50LmtleV0gPSBbZGF0YVtjb21wb25lbnQua2V5XV07XG4gICAgfVxuICAgIHJldHVybiBkYXRhW2NvbXBvbmVudC5rZXldO1xuICB9XG59O1xuXG5Gb3JtaW8ucHJvdmlkZXJzID0gcHJvdmlkZXJzO1xuXG4vKipcbiAqIEV2ZW50RW1pdHRlciBmb3IgRm9ybWlvIGV2ZW50cy5cbiAqIFNlZSBOb2RlLmpzIGRvY3VtZW50YXRpb24gZm9yIEFQSSBkb2N1bWVudGF0aW9uOiBodHRwczovL25vZGVqcy5vcmcvYXBpL2V2ZW50cy5odG1sXG4gKi9cbkZvcm1pby5ldmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyKHtcbiAgd2lsZGNhcmQ6IGZhbHNlLFxuICBtYXhMaXN0ZW5lcnM6IDBcbn0pO1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgcGx1Z2luIHdpdGggRm9ybWlvLmpzXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gdG8gcmVnaXN0ZXIuIFNlZSBwbHVnaW4gZG9jdW1lbnRhdGlvbi5cbiAqIEBwYXJhbSBuYW1lICAgT3B0aW9uYWwgbmFtZSB0byBsYXRlciByZXRyaWV2ZSBwbHVnaW4gd2l0aC5cbiAqL1xuRm9ybWlvLnJlZ2lzdGVyUGx1Z2luID0gZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XG4gIHBsdWdpbnMucHVzaChwbHVnaW4pO1xuICBwbHVnaW5zLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiAoYi5wcmlvcml0eSB8fCAwKSAtIChhLnByaW9yaXR5IHx8IDApO1xuICB9KTtcbiAgcGx1Z2luLl9fbmFtZSA9IG5hbWU7XG4gIChwbHVnaW4uaW5pdCB8fCBub29wKS5jYWxsKHBsdWdpbiwgRm9ybWlvKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGx1Z2luIHJlZ2lzdGVyZWQgd2l0aCB0aGUgZ2l2ZW4gbmFtZS5cbiAqL1xuRm9ybWlvLmdldFBsdWdpbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHBsdWdpbnMucmVkdWNlKGZ1bmN0aW9uKHJlc3VsdCwgcGx1Z2luKSB7XG4gICAgaWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAocGx1Z2luLl9fbmFtZSA9PT0gbmFtZSkgcmV0dXJuIHBsdWdpbjtcbiAgfSwgbnVsbCk7XG59O1xuXG4vKipcbiAqIERlcmVnaXN0ZXJzIGEgcGx1Z2luIHdpdGggRm9ybWlvLmpzLlxuICogQHBhcmFtICBwbHVnaW4gVGhlIGluc3RhbmNlIG9yIG5hbWUgb2YgdGhlIHBsdWdpblxuICogQHJldHVybiB0cnVlIGlmIGRlcmVnaXN0ZXJlZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbkZvcm1pby5kZXJlZ2lzdGVyUGx1Z2luID0gZnVuY3Rpb24ocGx1Z2luKSB7XG4gIHZhciBiZWZvcmVMZW5ndGggPSBwbHVnaW5zLmxlbmd0aDtcbiAgcGx1Z2lucyA9IHBsdWdpbnMuZmlsdGVyKGZ1bmN0aW9uKHApIHtcbiAgICBpZihwICE9PSBwbHVnaW4gJiYgcC5fX25hbWUgIT09IHBsdWdpbikgcmV0dXJuIHRydWU7XG4gICAgKHAuZGVyZWdpc3RlciB8fCBub29wKS5jYWxsKHAsIEZvcm1pbyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIGJlZm9yZUxlbmd0aCAhPT0gcGx1Z2lucy5sZW5ndGg7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvcm1pbztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBzdG9yYWdlOiByZXF1aXJlKCcuL3N0b3JhZ2UnKVxufTtcbiIsInZhciBQcm9taXNlID0gcmVxdWlyZShcIm5hdGl2ZS1wcm9taXNlLW9ubHlcIik7XG52YXIgZHJvcGJveCA9IGZ1bmN0aW9uKGZvcm1pbykge1xuICByZXR1cm4ge1xuICAgIHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUsIGZpbGVOYW1lLCBkaXIsIHByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gU2VuZCB0aGUgZmlsZSB3aXRoIGRhdGEuXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICBpZiAodHlwZW9mIHByb2dyZXNzQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBwcm9ncmVzc0NhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGZkLmFwcGVuZCgnbmFtZScsIGZpbGVOYW1lKTtcbiAgICAgICAgZmQuYXBwZW5kKCdkaXInLCBkaXIpO1xuICAgICAgICBmZC5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcblxuICAgICAgICAvLyBGaXJlIG9uIG5ldHdvcmsgZXJyb3IuXG4gICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgZXJyLm5ldHdvcmtFcnJvciA9IHRydWU7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIHZhciByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLnN0b3JhZ2UgPSAnZHJvcGJveCc7XG4gICAgICAgICAgICByZXNwb25zZS5zaXplID0gZmlsZS5zaXplO1xuICAgICAgICAgICAgcmVzcG9uc2UudHlwZSA9IGZpbGUudHlwZTtcbiAgICAgICAgICAgIHJlc3BvbnNlLnVybCA9IHJlc3BvbnNlLnBhdGhfbG93ZXI7XG4gICAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlIHx8ICdVbmFibGUgdG8gdXBsb2FkIGZpbGUnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgeGhyLm9uYWJvcnQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5vcGVuKCdQT1NUJywgZm9ybWlvLmZvcm1VcmwgKyAnL3N0b3JhZ2UvZHJvcGJveCcpO1xuICAgICAgICB2YXIgdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gU3dhbGxvdyBlcnJvci5cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1qd3QtdG9rZW4nLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgeGhyLnNlbmQoZmQpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkb3dubG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgIHZhciB0b2tlbiA9IGZhbHNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVG9rZW4nKTtcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIC8vIFN3YWxsb3cgZXJyb3IuXG4gICAgICB9XG4gICAgICBmaWxlLnVybCA9IGZvcm1pby5mb3JtVXJsICsgJy9zdG9yYWdlL2Ryb3Bib3g/cGF0aF9sb3dlcj0nICsgZmlsZS5wYXRoX2xvd2VyICsgKHRva2VuID8gJyZ4LWp3dC10b2tlbj0nICsgdG9rZW4gOiAnJyk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZpbGUpO1xuICAgIH1cbiAgfTtcbn07XG5cbmRyb3Bib3gudGl0bGUgPSAnRHJvcGJveCc7XG5kcm9wYm94Lm5hbWUgPSAnZHJvcGJveCc7XG5tb2R1bGUuZXhwb3J0cyA9IGRyb3Bib3g7XG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRyb3Bib3g6IHJlcXVpcmUoJy4vZHJvcGJveC5qcycpLFxuICBzMzogcmVxdWlyZSgnLi9zMy5qcycpLFxuICB1cmw6IHJlcXVpcmUoJy4vdXJsLmpzJyksXG59O1xuIiwidmFyIFByb21pc2UgPSByZXF1aXJlKFwibmF0aXZlLXByb21pc2Utb25seVwiKTtcbnZhciBzMyA9IGZ1bmN0aW9uKGZvcm1pbykge1xuICByZXR1cm4ge1xuICAgIHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUsIGZpbGVOYW1lLCBkaXIsIHByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gU2VuZCB0aGUgcHJlIHJlc3BvbnNlIHRvIHNpZ24gdGhlIHVwbG9hZC5cbiAgICAgICAgdmFyIHByZSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHZhciBwcmVmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICBwcmVmZC5hcHBlbmQoJ25hbWUnLCBmaWxlTmFtZSk7XG4gICAgICAgIHByZWZkLmFwcGVuZCgnc2l6ZScsIGZpbGUuc2l6ZSk7XG4gICAgICAgIHByZWZkLmFwcGVuZCgndHlwZScsIGZpbGUudHlwZSk7XG5cbiAgICAgICAgLy8gVGhpcyBvbmx5IGZpcmVzIG9uIGEgbmV0d29yayBlcnJvci5cbiAgICAgICAgcHJlLm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBlcnIubmV0d29ya0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZS5vbmFib3J0ID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBwcmUub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHByZS5zdGF0dXMgPj0gMjAwICYmIHByZS5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIHZhciByZXNwb25zZSA9IEpTT04ucGFyc2UocHJlLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgLy8gU2VuZCB0aGUgZmlsZSB3aXRoIGRhdGEuXG4gICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvZ3Jlc3NDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBwcm9ncmVzc0NhbGxiYWNrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNwb25zZS5kYXRhLmZpbGVOYW1lID0gZmlsZU5hbWU7XG4gICAgICAgICAgICByZXNwb25zZS5kYXRhLmtleSArPSBkaXIgKyBmaWxlTmFtZTtcblxuICAgICAgICAgICAgdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgICAgICBmb3IodmFyIGtleSBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgIGZkLmFwcGVuZChrZXksIHJlc3BvbnNlLmRhdGFba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmZC5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcblxuICAgICAgICAgICAgLy8gRmlyZSBvbiBuZXR3b3JrIGVycm9yLlxuICAgICAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgZXJyLm5ldHdvcmtFcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICBzdG9yYWdlOiAnczMnLFxuICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICAgICAgICBidWNrZXQ6IHJlc3BvbnNlLmJ1Y2tldCxcbiAgICAgICAgICAgICAgICAgIGtleTogcmVzcG9uc2UuZGF0YS5rZXksXG4gICAgICAgICAgICAgICAgICB1cmw6IHJlc3BvbnNlLnVybCArIHJlc3BvbnNlLmRhdGEua2V5LFxuICAgICAgICAgICAgICAgICAgYWNsOiByZXNwb25zZS5kYXRhLmFjbCxcbiAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGUudHlwZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2UgfHwgJ1VuYWJsZSB0byB1cGxvYWQgZmlsZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB4aHIub25hYm9ydCA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgeGhyLm9wZW4oJ1BPU1QnLCByZXNwb25zZS51cmwpO1xuXG4gICAgICAgICAgICB4aHIuc2VuZChmZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHByZS5yZXNwb25zZSB8fCAnVW5hYmxlIHRvIHNpZ24gZmlsZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcmUub3BlbignUE9TVCcsIGZvcm1pby5mb3JtVXJsICsgJy9zdG9yYWdlL3MzJyk7XG5cbiAgICAgICAgcHJlLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHByZS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgICB2YXIgdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gc3dhbGxvdyBlcnJvci5cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICBwcmUuc2V0UmVxdWVzdEhlYWRlcigneC1qd3QtdG9rZW4nLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwcmUuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgc2l6ZTogZmlsZS5zaXplLFxuICAgICAgICAgIHR5cGU6IGZpbGUudHlwZVxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRvd25sb2FkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgaWYgKGZpbGUuYWNsICE9PSAncHVibGljLXJlYWQnKSB7XG4gICAgICAgIHJldHVybiBmb3JtaW8ubWFrZVJlcXVlc3QoJ2ZpbGUnLCBmb3JtaW8uZm9ybVVybCArICcvc3RvcmFnZS9zMz9idWNrZXQ9JyArIGZpbGUuYnVja2V0ICsgJyZrZXk9JyArIGZpbGUua2V5LCAnR0VUJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuXG5zMy50aXRsZSA9ICdTMyc7XG5zMy5uYW1lID0gJ3MzJztcbm1vZHVsZS5leHBvcnRzID0gczM7XG4iLCJ2YXIgUHJvbWlzZSA9IHJlcXVpcmUoXCJuYXRpdmUtcHJvbWlzZS1vbmx5XCIpO1xudmFyIHVybCA9IGZ1bmN0aW9uKGZvcm1pbykge1xuICByZXR1cm4ge1xuICAgIHRpdGxlOiAnVXJsJyxcbiAgICBuYW1lOiAndXJsJyxcbiAgICB1cGxvYWRGaWxlOiBmdW5jdGlvbihmaWxlLCBmaWxlTmFtZSwgZGlyLCBwcm9ncmVzc0NhbGxiYWNrLCB1cmwpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgZGlyOiBkaXIsXG4gICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgZmlsZTogZmlsZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNlbmQgdGhlIGZpbGUgd2l0aCBkYXRhLlxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBwcm9ncmVzc0NhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICBmZC5hcHBlbmQoa2V5LCBkYXRhW2tleV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIHRlc3QgaWYgeGhyLnJlc3BvbnNlIGlzIGRlY29kZWQgb3Igbm90LlxuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgIHN0b3JhZ2U6ICd1cmwnLFxuICAgICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgdXJsOiB4aHIucmVzcG9uc2UudXJsLFxuICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXG4gICAgICAgICAgICAgIHR5cGU6IGZpbGUudHlwZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZSB8fCAnVW5hYmxlIHRvIHVwbG9hZCBmaWxlJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZpcmUgb24gbmV0d29yayBlcnJvci5cbiAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoeGhyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVqZWN0KHhocik7XG4gICAgICAgIH1cblxuICAgICAgICB4aHIub3BlbignUE9TVCcsIHVybCk7XG4gICAgICAgIHhoci5zZW5kKGZkKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZG93bmxvYWRGaWxlOiBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAvLyBSZXR1cm4gdGhlIG9yaWdpbmFsIGFzIHRoZXJlIGlzIG5vdGhpbmcgdG8gZG8uXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZpbGUpO1xuICAgIH1cbiAgfTtcbn07XG5cbnVybC5uYW1lID0gJ3VybCc7XG51cmwudGl0bGUgPSAnVXJsJztcbm1vZHVsZS5leHBvcnRzID0gdXJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYSBjb21wb25lbnQgaXMgYSBsYXlvdXQgY29tcG9uZW50IG9yIG5vdC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudFxuICAgKiAgIFRoZSBjb21wb25lbnQgdG8gY2hlY2suXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiAgIFdoZXRoZXIgb3Igbm90IHRoZSBjb21wb25lbnQgaXMgYSBsYXlvdXQgY29tcG9uZW50LlxuICAgKi9cbiAgaXNMYXlvdXRDb21wb25lbnQ6IGZ1bmN0aW9uIGlzTGF5b3V0Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgIHJldHVybiAoXG4gICAgICAoY29tcG9uZW50LmNvbHVtbnMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29sdW1ucykpIHx8XG4gICAgICAoY29tcG9uZW50LnJvd3MgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQucm93cykpIHx8XG4gICAgICAoY29tcG9uZW50LmNvbXBvbmVudHMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29tcG9uZW50cykpXG4gICAgKSA/IHRydWUgOiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogSXRlcmF0ZSB0aHJvdWdoIGVhY2ggY29tcG9uZW50IHdpdGhpbiBhIGZvcm0uXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnRzXG4gICAqICAgVGhlIGNvbXBvbmVudHMgdG8gaXRlcmF0ZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICogICBUaGUgaXRlcmF0aW9uIGZ1bmN0aW9uIHRvIGludm9rZSBmb3IgZWFjaCBjb21wb25lbnQuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5jbHVkZUFsbFxuICAgKiAgIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgbGF5b3V0IGNvbXBvbmVudHMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqICAgVGhlIGN1cnJlbnQgZGF0YSBwYXRoIG9mIHRoZSBlbGVtZW50LiBFeGFtcGxlOiBkYXRhLnVzZXIuZmlyc3ROYW1lXG4gICAqL1xuICBlYWNoQ29tcG9uZW50OiBmdW5jdGlvbiBlYWNoQ29tcG9uZW50KGNvbXBvbmVudHMsIGZuLCBpbmNsdWRlQWxsLCBwYXRoKSB7XG4gICAgaWYgKCFjb21wb25lbnRzKSByZXR1cm47XG4gICAgcGF0aCA9IHBhdGggfHwgJyc7XG4gICAgY29tcG9uZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgdmFyIGhhc0NvbHVtbnMgPSBjb21wb25lbnQuY29sdW1ucyAmJiBBcnJheS5pc0FycmF5KGNvbXBvbmVudC5jb2x1bW5zKTtcbiAgICAgIHZhciBoYXNSb3dzID0gY29tcG9uZW50LnJvd3MgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQucm93cyk7XG4gICAgICB2YXIgaGFzQ29tcHMgPSBjb21wb25lbnQuY29tcG9uZW50cyAmJiBBcnJheS5pc0FycmF5KGNvbXBvbmVudC5jb21wb25lbnRzKTtcbiAgICAgIHZhciBub1JlY3Vyc2UgPSBmYWxzZTtcbiAgICAgIHZhciBuZXdQYXRoID0gY29tcG9uZW50LmtleSA/IChwYXRoID8gKHBhdGggKyAnLicgKyBjb21wb25lbnQua2V5KSA6IGNvbXBvbmVudC5rZXkpIDogJyc7XG5cbiAgICAgIGlmIChpbmNsdWRlQWxsIHx8IGNvbXBvbmVudC50cmVlIHx8ICghaGFzQ29sdW1ucyAmJiAhaGFzUm93cyAmJiAhaGFzQ29tcHMpKSB7XG4gICAgICAgIG5vUmVjdXJzZSA9IGZuKGNvbXBvbmVudCwgbmV3UGF0aCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzdWJQYXRoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChjb21wb25lbnQua2V5ICYmICgoY29tcG9uZW50LnR5cGUgPT09ICdkYXRhZ3JpZCcpIHx8IChjb21wb25lbnQudHlwZSA9PT0gJ2NvbnRhaW5lcicpKSkge1xuICAgICAgICAgIHJldHVybiBuZXdQYXRoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgfTtcblxuICAgICAgaWYgKCFub1JlY3Vyc2UpIHtcbiAgICAgICAgaWYgKGhhc0NvbHVtbnMpIHtcbiAgICAgICAgICBjb21wb25lbnQuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgICAgZWFjaENvbXBvbmVudChjb2x1bW4uY29tcG9uZW50cywgZm4sIGluY2x1ZGVBbGwsIHN1YlBhdGgoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbHNlIGlmIChoYXNSb3dzKSB7XG4gICAgICAgICAgW10uY29uY2F0LmFwcGx5KFtdLCBjb21wb25lbnQucm93cykuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgICAgIGVhY2hDb21wb25lbnQocm93LmNvbXBvbmVudHMsIGZuLCBpbmNsdWRlQWxsLCBzdWJQYXRoKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxzZSBpZiAoaGFzQ29tcHMpIHtcbiAgICAgICAgICBlYWNoQ29tcG9uZW50KGNvbXBvbmVudC5jb21wb25lbnRzLCBmbiwgaW5jbHVkZUFsbCwgc3ViUGF0aCgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb21wb25lbnQgYnkgaXRzIGtleVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50c1xuICAgKiAgIFRoZSBjb21wb25lbnRzIHRvIGl0ZXJhdGUuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAgICogICBUaGUga2V5IG9mIHRoZSBjb21wb25lbnQgdG8gZ2V0LlxuICAgKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKiAgIFRoZSBjb21wb25lbnQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBrZXksIG9yIHVuZGVmaW5lZCBpZiBub3QgZm91bmQuXG4gICAqL1xuICBnZXRDb21wb25lbnQ6IGZ1bmN0aW9uIGdldENvbXBvbmVudChjb21wb25lbnRzLCBrZXkpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIG1vZHVsZS5leHBvcnRzLmVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0ga2V5KSB7XG4gICAgICAgIHJlc3VsdCA9IGNvbXBvbmVudDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBmb3JtIGNvbXBvbmVudHMgZm9yIGRhdGEgbWFuaXB1bGF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50c1xuICAgKiAgIFRoZSBjb21wb25lbnRzIHRvIGl0ZXJhdGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5jbHVkZUFsbFxuICAgKiAgIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgbGF5b3V0IGNvbXBvbmVudHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqICAgVGhlIGZsYXR0ZW5lZCBjb21wb25lbnRzIG1hcC5cbiAgICovXG4gIGZsYXR0ZW5Db21wb25lbnRzOiBmdW5jdGlvbiBmbGF0dGVuQ29tcG9uZW50cyhjb21wb25lbnRzLCBpbmNsdWRlQWxsKSB7XG4gICAgdmFyIGZsYXR0ZW5lZCA9IHt9O1xuICAgIG1vZHVsZS5leHBvcnRzLmVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50LCBwYXRoKSB7XG4gICAgICBmbGF0dGVuZWRbcGF0aF0gPSBjb21wb25lbnQ7XG4gICAgfSwgaW5jbHVkZUFsbCk7XG4gICAgcmV0dXJuIGZsYXR0ZW5lZDtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjb25kaXRpb25zIGZvciBhIHByb3ZpZGVkIGNvbXBvbmVudCBhbmQgZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudFxuICAgKiAgIFRoZSBjb21wb25lbnQgdG8gY2hlY2sgZm9yIHRoZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSByb3dcbiAgICogICBUaGUgZGF0YSB3aXRoaW4gYSByb3dcbiAgICogQHBhcmFtIGRhdGFcbiAgICogICBUaGUgZnVsbCBzdWJtaXNzaW9uIGRhdGEuXG4gICAqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgY2hlY2tDb25kaXRpb246IGZ1bmN0aW9uKGNvbXBvbmVudCwgcm93LCBkYXRhKSB7XG4gICAgaWYgKGNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgnY3VzdG9tQ29uZGl0aW9uYWwnKSAmJiBjb21wb25lbnQuY3VzdG9tQ29uZGl0aW9uYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBzY3JpcHQgPSAnKGZ1bmN0aW9uKCkgeyB2YXIgc2hvdyA9IHRydWU7JztcbiAgICAgICAgc2NyaXB0ICs9IGNvbXBvbmVudC5jdXN0b21Db25kaXRpb25hbC50b1N0cmluZygpO1xuICAgICAgICBzY3JpcHQgKz0gJzsgcmV0dXJuIHNob3c7IH0pKCknO1xuICAgICAgICB2YXIgcmVzdWx0ID0gZXZhbChzY3JpcHQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LnRvU3RyaW5nKCkgPT09ICd0cnVlJztcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignQW4gZXJyb3Igb2NjdXJyZWQgaW4gYSBjdXN0b20gY29uZGl0aW9uYWwgc3RhdGVtZW50IGZvciBjb21wb25lbnQgJyArIGNvbXBvbmVudC5rZXksIGUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdjb25kaXRpb25hbCcpICYmIGNvbXBvbmVudC5jb25kaXRpb25hbCAmJiBjb21wb25lbnQuY29uZGl0aW9uYWwud2hlbikge1xuICAgICAgdmFyIGNvbmQgPSBjb21wb25lbnQuY29uZGl0aW9uYWw7XG4gICAgICB2YXIgdmFsdWUgPSBudWxsO1xuICAgICAgaWYgKHJvdykge1xuICAgICAgICB2YWx1ZSA9IHRoaXMuZ2V0VmFsdWUoe2RhdGE6IHJvd30sIGNvbmQud2hlbik7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YSAmJiAodmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJykpIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzLmdldFZhbHVlKHtkYXRhOiBkYXRhfSwgY29uZC53aGVuKTtcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhbHVlID0gY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSA/IGNvbXBvbmVudC5kZWZhdWx0VmFsdWUgOiAnJztcbiAgICAgIH1cbiAgICAgIC8vIFNwZWNpYWwgY2hlY2sgZm9yIHNlbGVjdGJveGVzIGNvbXBvbmVudC5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlLmhhc093blByb3BlcnR5KGNvbmQuZXEpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVtjb25kLmVxXS50b1N0cmluZygpID09PSBjb25kLnNob3cudG9TdHJpbmcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAodmFsdWUudG9TdHJpbmcoKSA9PT0gY29uZC5lcS50b1N0cmluZygpKSA9PT0gKGNvbmQuc2hvdy50b1N0cmluZygpID09PSAndHJ1ZScpO1xuICAgIH1cblxuICAgIC8vIERlZmF1bHQgdG8gc2hvdy5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSB2YWx1ZSBmb3IgYSBjb21wb25lbnQga2V5LCBpbiB0aGUgZ2l2ZW4gc3VibWlzc2lvbi5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHN1Ym1pc3Npb25cbiAgICogICBBIHN1Ym1pc3Npb24gb2JqZWN0IHRvIHNlYXJjaC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICAgKiAgIEEgZm9yIGNvbXBvbmVudHMgQVBJIGtleSB0byBzZWFyY2ggZm9yLlxuICAgKi9cbiAgZ2V0VmFsdWU6IGZ1bmN0aW9uIGdldFZhbHVlKHN1Ym1pc3Npb24sIGtleSkge1xuICAgIHZhciBkYXRhID0gc3VibWlzc2lvbi5kYXRhIHx8IHt9O1xuXG4gICAgdmFyIHNlYXJjaCA9IGZ1bmN0aW9uIHNlYXJjaChkYXRhKSB7XG4gICAgICB2YXIgaTtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdmFsdWUgPSBzZWFyY2goZGF0YVtpXSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtrZXlzW2ldXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2VhcmNoKGRhdGFba2V5c1tpXV0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc2VhcmNoKGRhdGEpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBsb2Rhc2ggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzIDxodHRwczovL2pxdWVyeS5vcmcvPlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBzaXplIHRvIGVuYWJsZSBsYXJnZSBhcnJheSBvcHRpbWl6YXRpb25zLiAqL1xudmFyIExBUkdFX0FSUkFZX1NJWkUgPSAyMDA7XG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiogVXNlZCB0byBzdGFuZC1pbiBmb3IgYHVuZGVmaW5lZGAgaGFzaCB2YWx1ZXMuICovXG52YXIgSEFTSF9VTkRFRklORUQgPSAnX19sb2Rhc2hfaGFzaF91bmRlZmluZWRfXyc7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgYml0bWFza3MgZm9yIGNvbXBhcmlzb24gc3R5bGVzLiAqL1xudmFyIFVOT1JERVJFRF9DT01QQVJFX0ZMQUcgPSAxLFxuICAgIFBBUlRJQUxfQ09NUEFSRV9GTEFHID0gMjtcblxuLyoqIFVzZWQgYXMgcmVmZXJlbmNlcyBmb3IgdmFyaW91cyBgTnVtYmVyYCBjb25zdGFudHMuICovXG52YXIgSU5GSU5JVFkgPSAxIC8gMCxcbiAgICBNQVhfU0FGRV9JTlRFR0VSID0gOTAwNzE5OTI1NDc0MDk5MTtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFyZ3NUYWcgPSAnW29iamVjdCBBcmd1bWVudHNdJyxcbiAgICBhcnJheVRhZyA9ICdbb2JqZWN0IEFycmF5XScsXG4gICAgYm9vbFRhZyA9ICdbb2JqZWN0IEJvb2xlYW5dJyxcbiAgICBkYXRlVGFnID0gJ1tvYmplY3QgRGF0ZV0nLFxuICAgIGVycm9yVGFnID0gJ1tvYmplY3QgRXJyb3JdJyxcbiAgICBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBnZW5UYWcgPSAnW29iamVjdCBHZW5lcmF0b3JGdW5jdGlvbl0nLFxuICAgIG1hcFRhZyA9ICdbb2JqZWN0IE1hcF0nLFxuICAgIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nLFxuICAgIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgIHByb21pc2VUYWcgPSAnW29iamVjdCBQcm9taXNlXScsXG4gICAgcmVnZXhwVGFnID0gJ1tvYmplY3QgUmVnRXhwXScsXG4gICAgc2V0VGFnID0gJ1tvYmplY3QgU2V0XScsXG4gICAgc3RyaW5nVGFnID0gJ1tvYmplY3QgU3RyaW5nXScsXG4gICAgc3ltYm9sVGFnID0gJ1tvYmplY3QgU3ltYm9sXScsXG4gICAgd2Vha01hcFRhZyA9ICdbb2JqZWN0IFdlYWtNYXBdJztcblxudmFyIGFycmF5QnVmZmVyVGFnID0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJyxcbiAgICBkYXRhVmlld1RhZyA9ICdbb2JqZWN0IERhdGFWaWV3XScsXG4gICAgZmxvYXQzMlRhZyA9ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgIGZsb2F0NjRUYWcgPSAnW29iamVjdCBGbG9hdDY0QXJyYXldJyxcbiAgICBpbnQ4VGFnID0gJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgaW50MTZUYWcgPSAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgaW50MzJUYWcgPSAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgdWludDhUYWcgPSAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgdWludDhDbGFtcGVkVGFnID0gJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICB1aW50MTZUYWcgPSAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgIHVpbnQzMlRhZyA9ICdbb2JqZWN0IFVpbnQzMkFycmF5XSc7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIHByb3BlcnR5IG5hbWVzIHdpdGhpbiBwcm9wZXJ0eSBwYXRocy4gKi9cbnZhciByZUlzRGVlcFByb3AgPSAvXFwufFxcWyg/OlteW1xcXV0qfChbXCInXSkoPzooPyFcXDEpW15cXFxcXXxcXFxcLikqP1xcMSlcXF0vLFxuICAgIHJlSXNQbGFpblByb3AgPSAvXlxcdyokLyxcbiAgICByZUxlYWRpbmdEb3QgPSAvXlxcLi8sXG4gICAgcmVQcm9wTmFtZSA9IC9bXi5bXFxdXSt8XFxbKD86KC0/XFxkKyg/OlxcLlxcZCspPyl8KFtcIiddKSgoPzooPyFcXDIpW15cXFxcXXxcXFxcLikqPylcXDIpXFxdfCg/PSg/OlxcLnxcXFtcXF0pKD86XFwufFxcW1xcXXwkKSkvZztcblxuLyoqXG4gKiBVc2VkIHRvIG1hdGNoIGBSZWdFeHBgXG4gKiBbc3ludGF4IGNoYXJhY3RlcnNdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLXBhdHRlcm5zKS5cbiAqL1xudmFyIHJlUmVnRXhwQ2hhciA9IC9bXFxcXF4kLiorPygpW1xcXXt9fF0vZztcblxuLyoqIFVzZWQgdG8gbWF0Y2ggYmFja3NsYXNoZXMgaW4gcHJvcGVydHkgcGF0aHMuICovXG52YXIgcmVFc2NhcGVDaGFyID0gL1xcXFwoXFxcXCk/L2c7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBob3N0IGNvbnN0cnVjdG9ycyAoU2FmYXJpKS4gKi9cbnZhciByZUlzSG9zdEN0b3IgPSAvXlxcW29iamVjdCAuKz9Db25zdHJ1Y3RvclxcXSQvO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgdW5zaWduZWQgaW50ZWdlciB2YWx1ZXMuICovXG52YXIgcmVJc1VpbnQgPSAvXig/OjB8WzEtOV1cXGQqKSQvO1xuXG4vKiogVXNlZCB0byBpZGVudGlmeSBgdG9TdHJpbmdUYWdgIHZhbHVlcyBvZiB0eXBlZCBhcnJheXMuICovXG52YXIgdHlwZWRBcnJheVRhZ3MgPSB7fTtcbnR5cGVkQXJyYXlUYWdzW2Zsb2F0MzJUYWddID0gdHlwZWRBcnJheVRhZ3NbZmxvYXQ2NFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbaW50OFRhZ10gPSB0eXBlZEFycmF5VGFnc1tpbnQxNlRhZ10gPVxudHlwZWRBcnJheVRhZ3NbaW50MzJUYWddID0gdHlwZWRBcnJheVRhZ3NbdWludDhUYWddID1cbnR5cGVkQXJyYXlUYWdzW3VpbnQ4Q2xhbXBlZFRhZ10gPSB0eXBlZEFycmF5VGFnc1t1aW50MTZUYWddID1cbnR5cGVkQXJyYXlUYWdzW3VpbnQzMlRhZ10gPSB0cnVlO1xudHlwZWRBcnJheVRhZ3NbYXJnc1RhZ10gPSB0eXBlZEFycmF5VGFnc1thcnJheVRhZ10gPVxudHlwZWRBcnJheVRhZ3NbYXJyYXlCdWZmZXJUYWddID0gdHlwZWRBcnJheVRhZ3NbYm9vbFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbZGF0YVZpZXdUYWddID0gdHlwZWRBcnJheVRhZ3NbZGF0ZVRhZ10gPVxudHlwZWRBcnJheVRhZ3NbZXJyb3JUYWddID0gdHlwZWRBcnJheVRhZ3NbZnVuY1RhZ10gPVxudHlwZWRBcnJheVRhZ3NbbWFwVGFnXSA9IHR5cGVkQXJyYXlUYWdzW251bWJlclRhZ10gPVxudHlwZWRBcnJheVRhZ3Nbb2JqZWN0VGFnXSA9IHR5cGVkQXJyYXlUYWdzW3JlZ2V4cFRhZ10gPVxudHlwZWRBcnJheVRhZ3Nbc2V0VGFnXSA9IHR5cGVkQXJyYXlUYWdzW3N0cmluZ1RhZ10gPVxudHlwZWRBcnJheVRhZ3Nbd2Vha01hcFRhZ10gPSBmYWxzZTtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLk9iamVjdCA9PT0gT2JqZWN0ICYmIGdsb2JhbDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBzZWxmYC4gKi9cbnZhciBmcmVlU2VsZiA9IHR5cGVvZiBzZWxmID09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5PYmplY3QgPT09IE9iamVjdCAmJiBzZWxmO1xuXG4vKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbnZhciByb290ID0gZnJlZUdsb2JhbCB8fCBmcmVlU2VsZiB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgLiAqL1xudmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG52YXIgZnJlZU1vZHVsZSA9IGZyZWVFeHBvcnRzICYmIHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4vKiogRGV0ZWN0IHRoZSBwb3B1bGFyIENvbW1vbkpTIGV4dGVuc2lvbiBgbW9kdWxlLmV4cG9ydHNgLiAqL1xudmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHM7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgcHJvY2Vzc2AgZnJvbSBOb2RlLmpzLiAqL1xudmFyIGZyZWVQcm9jZXNzID0gbW9kdWxlRXhwb3J0cyAmJiBmcmVlR2xvYmFsLnByb2Nlc3M7XG5cbi8qKiBVc2VkIHRvIGFjY2VzcyBmYXN0ZXIgTm9kZS5qcyBoZWxwZXJzLiAqL1xudmFyIG5vZGVVdGlsID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiBmcmVlUHJvY2VzcyAmJiBmcmVlUHJvY2Vzcy5iaW5kaW5nKCd1dGlsJyk7XG4gIH0gY2F0Y2ggKGUpIHt9XG59KCkpO1xuXG4vKiBOb2RlLmpzIGhlbHBlciByZWZlcmVuY2VzLiAqL1xudmFyIG5vZGVJc1R5cGVkQXJyYXkgPSBub2RlVXRpbCAmJiBub2RlVXRpbC5pc1R5cGVkQXJyYXk7XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLmZpbHRlcmAgZm9yIGFycmF5cyB3aXRob3V0IHN1cHBvcnQgZm9yXG4gKiBpdGVyYXRlZSBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBbYXJyYXldIFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGZpbHRlcmVkIGFycmF5LlxuICovXG5mdW5jdGlvbiBhcnJheUZpbHRlcihhcnJheSwgcHJlZGljYXRlKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwLFxuICAgICAgcmVzSW5kZXggPSAwLFxuICAgICAgcmVzdWx0ID0gW107XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgcmVzdWx0W3Jlc0luZGV4KytdID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLnNvbWVgIGZvciBhcnJheXMgd2l0aG91dCBzdXBwb3J0IGZvciBpdGVyYXRlZVxuICogc2hvcnRoYW5kcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gW2FycmF5XSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW55IGVsZW1lbnQgcGFzc2VzIHRoZSBwcmVkaWNhdGUgY2hlY2ssXG4gKiAgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBhcnJheVNvbWUoYXJyYXksIHByZWRpY2F0ZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGlmIChwcmVkaWNhdGUoYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYWNjZXNzb3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnRpbWVzYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHNcbiAqIG9yIG1heCBhcnJheSBsZW5ndGggY2hlY2tzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIGludm9rZSBgaXRlcmF0ZWVgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcmVzdWx0cy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRpbWVzKG4sIGl0ZXJhdGVlKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobik7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBuKSB7XG4gICAgcmVzdWx0W2luZGV4XSA9IGl0ZXJhdGVlKGluZGV4KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnVuYXJ5YCB3aXRob3V0IHN1cHBvcnQgZm9yIHN0b3JpbmcgbWV0YWRhdGEuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGNhcCBhcmd1bWVudHMgZm9yLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgY2FwcGVkIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBiYXNlVW5hcnkoZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuYyh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKlxuICogR2V0cyB0aGUgdmFsdWUgYXQgYGtleWAgb2YgYG9iamVjdGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0XSBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgcHJvcGVydHkgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGdldFZhbHVlKG9iamVjdCwga2V5KSB7XG4gIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgaG9zdCBvYmplY3QgaW4gSUUgPCA5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgaG9zdCBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNIb3N0T2JqZWN0KHZhbHVlKSB7XG4gIC8vIE1hbnkgaG9zdCBvYmplY3RzIGFyZSBgT2JqZWN0YCBvYmplY3RzIHRoYXQgY2FuIGNvZXJjZSB0byBzdHJpbmdzXG4gIC8vIGRlc3BpdGUgaGF2aW5nIGltcHJvcGVybHkgZGVmaW5lZCBgdG9TdHJpbmdgIG1ldGhvZHMuXG4gIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgaWYgKHZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHZhbHVlLnRvU3RyaW5nICE9ICdmdW5jdGlvbicpIHtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gISEodmFsdWUgKyAnJyk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGBtYXBgIHRvIGl0cyBrZXktdmFsdWUgcGFpcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBtYXAgVGhlIG1hcCB0byBjb252ZXJ0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBrZXktdmFsdWUgcGFpcnMuXG4gKi9cbmZ1bmN0aW9uIG1hcFRvQXJyYXkobWFwKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobWFwLnNpemUpO1xuXG4gIG1hcC5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICByZXN1bHRbKytpbmRleF0gPSBba2V5LCB2YWx1ZV07XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB1bmFyeSBmdW5jdGlvbiB0aGF0IGludm9rZXMgYGZ1bmNgIHdpdGggaXRzIGFyZ3VtZW50IHRyYW5zZm9ybWVkLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB3cmFwLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdHJhbnNmb3JtIFRoZSBhcmd1bWVudCB0cmFuc2Zvcm0uXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gb3ZlckFyZyhmdW5jLCB0cmFuc2Zvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiBmdW5jKHRyYW5zZm9ybShhcmcpKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgc2V0YCB0byBhbiBhcnJheSBvZiBpdHMgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gc2V0IFRoZSBzZXQgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBzZXRUb0FycmF5KHNldCkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KHNldC5zaXplKTtcblxuICBzZXQuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJlc3VsdFsrK2luZGV4XSA9IHZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsXG4gICAgZnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlLFxuICAgIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IG92ZXJyZWFjaGluZyBjb3JlLWpzIHNoaW1zLiAqL1xudmFyIGNvcmVKc0RhdGEgPSByb290WydfX2NvcmUtanNfc2hhcmVkX18nXTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IG1ldGhvZHMgbWFzcXVlcmFkaW5nIGFzIG5hdGl2ZS4gKi9cbnZhciBtYXNrU3JjS2V5ID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgdWlkID0gL1teLl0rJC8uZXhlYyhjb3JlSnNEYXRhICYmIGNvcmVKc0RhdGEua2V5cyAmJiBjb3JlSnNEYXRhLmtleXMuSUVfUFJPVE8gfHwgJycpO1xuICByZXR1cm4gdWlkID8gKCdTeW1ib2woc3JjKV8xLicgKyB1aWQpIDogJyc7XG59KCkpO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBkZWNvbXBpbGVkIHNvdXJjZSBvZiBmdW5jdGlvbnMuICovXG52YXIgZnVuY1RvU3RyaW5nID0gZnVuY1Byb3RvLnRvU3RyaW5nO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgb2JqZWN0VG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZS4gKi9cbnZhciByZUlzTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIGZ1bmNUb1N0cmluZy5jYWxsKGhhc093blByb3BlcnR5KS5yZXBsYWNlKHJlUmVnRXhwQ2hhciwgJ1xcXFwkJicpXG4gIC5yZXBsYWNlKC9oYXNPd25Qcm9wZXJ0eXwoZnVuY3Rpb24pLio/KD89XFxcXFxcKCl8IGZvciAuKz8oPz1cXFxcXFxdKS9nLCAnJDEuKj8nKSArICckJ1xuKTtcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgU3ltYm9sID0gcm9vdC5TeW1ib2wsXG4gICAgVWludDhBcnJheSA9IHJvb3QuVWludDhBcnJheSxcbiAgICBwcm9wZXJ0eUlzRW51bWVyYWJsZSA9IG9iamVjdFByb3RvLnByb3BlcnR5SXNFbnVtZXJhYmxlLFxuICAgIHNwbGljZSA9IGFycmF5UHJvdG8uc3BsaWNlO1xuXG4vKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlS2V5cyA9IG92ZXJBcmcoT2JqZWN0LmtleXMsIE9iamVjdCk7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIHRoYXQgYXJlIHZlcmlmaWVkIHRvIGJlIG5hdGl2ZS4gKi9cbnZhciBEYXRhVmlldyA9IGdldE5hdGl2ZShyb290LCAnRGF0YVZpZXcnKSxcbiAgICBNYXAgPSBnZXROYXRpdmUocm9vdCwgJ01hcCcpLFxuICAgIFByb21pc2UgPSBnZXROYXRpdmUocm9vdCwgJ1Byb21pc2UnKSxcbiAgICBTZXQgPSBnZXROYXRpdmUocm9vdCwgJ1NldCcpLFxuICAgIFdlYWtNYXAgPSBnZXROYXRpdmUocm9vdCwgJ1dlYWtNYXAnKSxcbiAgICBuYXRpdmVDcmVhdGUgPSBnZXROYXRpdmUoT2JqZWN0LCAnY3JlYXRlJyk7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBtYXBzLCBzZXRzLCBhbmQgd2Vha21hcHMuICovXG52YXIgZGF0YVZpZXdDdG9yU3RyaW5nID0gdG9Tb3VyY2UoRGF0YVZpZXcpLFxuICAgIG1hcEN0b3JTdHJpbmcgPSB0b1NvdXJjZShNYXApLFxuICAgIHByb21pc2VDdG9yU3RyaW5nID0gdG9Tb3VyY2UoUHJvbWlzZSksXG4gICAgc2V0Q3RvclN0cmluZyA9IHRvU291cmNlKFNldCksXG4gICAgd2Vha01hcEN0b3JTdHJpbmcgPSB0b1NvdXJjZShXZWFrTWFwKTtcblxuLyoqIFVzZWQgdG8gY29udmVydCBzeW1ib2xzIHRvIHByaW1pdGl2ZXMgYW5kIHN0cmluZ3MuICovXG52YXIgc3ltYm9sUHJvdG8gPSBTeW1ib2wgPyBTeW1ib2wucHJvdG90eXBlIDogdW5kZWZpbmVkLFxuICAgIHN5bWJvbFZhbHVlT2YgPSBzeW1ib2xQcm90byA/IHN5bWJvbFByb3RvLnZhbHVlT2YgOiB1bmRlZmluZWQsXG4gICAgc3ltYm9sVG9TdHJpbmcgPSBzeW1ib2xQcm90byA/IHN5bWJvbFByb3RvLnRvU3RyaW5nIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBoYXNoIG9iamVjdC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBbZW50cmllc10gVGhlIGtleS12YWx1ZSBwYWlycyB0byBjYWNoZS5cbiAqL1xuZnVuY3Rpb24gSGFzaChlbnRyaWVzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gZW50cmllcyA/IGVudHJpZXMubGVuZ3RoIDogMDtcblxuICB0aGlzLmNsZWFyKCk7XG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgdmFyIGVudHJ5ID0gZW50cmllc1tpbmRleF07XG4gICAgdGhpcy5zZXQoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGtleS12YWx1ZSBlbnRyaWVzIGZyb20gdGhlIGhhc2guXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGNsZWFyXG4gKiBAbWVtYmVyT2YgSGFzaFxuICovXG5mdW5jdGlvbiBoYXNoQ2xlYXIoKSB7XG4gIHRoaXMuX19kYXRhX18gPSBuYXRpdmVDcmVhdGUgPyBuYXRpdmVDcmVhdGUobnVsbCkgOiB7fTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGBrZXlgIGFuZCBpdHMgdmFsdWUgZnJvbSB0aGUgaGFzaC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZGVsZXRlXG4gKiBAbWVtYmVyT2YgSGFzaFxuICogQHBhcmFtIHtPYmplY3R9IGhhc2ggVGhlIGhhc2ggdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGVudHJ5IHdhcyByZW1vdmVkLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGhhc2hEZWxldGUoa2V5KSB7XG4gIHJldHVybiB0aGlzLmhhcyhrZXkpICYmIGRlbGV0ZSB0aGlzLl9fZGF0YV9fW2tleV07XG59XG5cbi8qKlxuICogR2V0cyB0aGUgaGFzaCB2YWx1ZSBmb3IgYGtleWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGdldFxuICogQG1lbWJlck9mIEhhc2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGVudHJ5IHZhbHVlLlxuICovXG5mdW5jdGlvbiBoYXNoR2V0KGtleSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX187XG4gIGlmIChuYXRpdmVDcmVhdGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gZGF0YVtrZXldO1xuICAgIHJldHVybiByZXN1bHQgPT09IEhBU0hfVU5ERUZJTkVEID8gdW5kZWZpbmVkIDogcmVzdWx0O1xuICB9XG4gIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIGtleSkgPyBkYXRhW2tleV0gOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgaGFzaCB2YWx1ZSBmb3IgYGtleWAgZXhpc3RzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBoYXNcbiAqIEBtZW1iZXJPZiBIYXNoXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGVudHJ5IHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGFuIGVudHJ5IGZvciBga2V5YCBleGlzdHMsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaGFzaEhhcyhrZXkpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLl9fZGF0YV9fO1xuICByZXR1cm4gbmF0aXZlQ3JlYXRlID8gZGF0YVtrZXldICE9PSB1bmRlZmluZWQgOiBoYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIGtleSk7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgaGFzaCBga2V5YCB0byBgdmFsdWVgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBzZXRcbiAqIEBtZW1iZXJPZiBIYXNoXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHNldC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGhhc2ggaW5zdGFuY2UuXG4gKi9cbmZ1bmN0aW9uIGhhc2hTZXQoa2V5LCB2YWx1ZSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX187XG4gIGRhdGFba2V5XSA9IChuYXRpdmVDcmVhdGUgJiYgdmFsdWUgPT09IHVuZGVmaW5lZCkgPyBIQVNIX1VOREVGSU5FRCA6IHZhbHVlO1xuICByZXR1cm4gdGhpcztcbn1cblxuLy8gQWRkIG1ldGhvZHMgdG8gYEhhc2hgLlxuSGFzaC5wcm90b3R5cGUuY2xlYXIgPSBoYXNoQ2xlYXI7XG5IYXNoLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBoYXNoRGVsZXRlO1xuSGFzaC5wcm90b3R5cGUuZ2V0ID0gaGFzaEdldDtcbkhhc2gucHJvdG90eXBlLmhhcyA9IGhhc2hIYXM7XG5IYXNoLnByb3RvdHlwZS5zZXQgPSBoYXNoU2V0O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gbGlzdCBjYWNoZSBvYmplY3QuXG4gKlxuICogQHByaXZhdGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtBcnJheX0gW2VudHJpZXNdIFRoZSBrZXktdmFsdWUgcGFpcnMgdG8gY2FjaGUuXG4gKi9cbmZ1bmN0aW9uIExpc3RDYWNoZShlbnRyaWVzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gZW50cmllcyA/IGVudHJpZXMubGVuZ3RoIDogMDtcblxuICB0aGlzLmNsZWFyKCk7XG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgdmFyIGVudHJ5ID0gZW50cmllc1tpbmRleF07XG4gICAgdGhpcy5zZXQoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGtleS12YWx1ZSBlbnRyaWVzIGZyb20gdGhlIGxpc3QgY2FjaGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGNsZWFyXG4gKiBAbWVtYmVyT2YgTGlzdENhY2hlXG4gKi9cbmZ1bmN0aW9uIGxpc3RDYWNoZUNsZWFyKCkge1xuICB0aGlzLl9fZGF0YV9fID0gW107XG59XG5cbi8qKlxuICogUmVtb3ZlcyBga2V5YCBhbmQgaXRzIHZhbHVlIGZyb20gdGhlIGxpc3QgY2FjaGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGRlbGV0ZVxuICogQG1lbWJlck9mIExpc3RDYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGVudHJ5IHdhcyByZW1vdmVkLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGxpc3RDYWNoZURlbGV0ZShrZXkpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLl9fZGF0YV9fLFxuICAgICAgaW5kZXggPSBhc3NvY0luZGV4T2YoZGF0YSwga2V5KTtcblxuICBpZiAoaW5kZXggPCAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBsYXN0SW5kZXggPSBkYXRhLmxlbmd0aCAtIDE7XG4gIGlmIChpbmRleCA9PSBsYXN0SW5kZXgpIHtcbiAgICBkYXRhLnBvcCgpO1xuICB9IGVsc2Uge1xuICAgIHNwbGljZS5jYWxsKGRhdGEsIGluZGV4LCAxKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBsaXN0IGNhY2hlIHZhbHVlIGZvciBga2V5YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZ2V0XG4gKiBAbWVtYmVyT2YgTGlzdENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIGdldC5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBlbnRyeSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gbGlzdENhY2hlR2V0KGtleSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX18sXG4gICAgICBpbmRleCA9IGFzc29jSW5kZXhPZihkYXRhLCBrZXkpO1xuXG4gIHJldHVybiBpbmRleCA8IDAgPyB1bmRlZmluZWQgOiBkYXRhW2luZGV4XVsxXTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBsaXN0IGNhY2hlIHZhbHVlIGZvciBga2V5YCBleGlzdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhc1xuICogQG1lbWJlck9mIExpc3RDYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBlbnRyeSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbiBlbnRyeSBmb3IgYGtleWAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGxpc3RDYWNoZUhhcyhrZXkpIHtcbiAgcmV0dXJuIGFzc29jSW5kZXhPZih0aGlzLl9fZGF0YV9fLCBrZXkpID4gLTE7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgbGlzdCBjYWNoZSBga2V5YCB0byBgdmFsdWVgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBzZXRcbiAqIEBtZW1iZXJPZiBMaXN0Q2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gc2V0LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0LlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbGlzdCBjYWNoZSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gbGlzdENhY2hlU2V0KGtleSwgdmFsdWUpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLl9fZGF0YV9fLFxuICAgICAgaW5kZXggPSBhc3NvY0luZGV4T2YoZGF0YSwga2V5KTtcblxuICBpZiAoaW5kZXggPCAwKSB7XG4gICAgZGF0YS5wdXNoKFtrZXksIHZhbHVlXSk7XG4gIH0gZWxzZSB7XG4gICAgZGF0YVtpbmRleF1bMV0gPSB2YWx1ZTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gQWRkIG1ldGhvZHMgdG8gYExpc3RDYWNoZWAuXG5MaXN0Q2FjaGUucHJvdG90eXBlLmNsZWFyID0gbGlzdENhY2hlQ2xlYXI7XG5MaXN0Q2FjaGUucHJvdG90eXBlWydkZWxldGUnXSA9IGxpc3RDYWNoZURlbGV0ZTtcbkxpc3RDYWNoZS5wcm90b3R5cGUuZ2V0ID0gbGlzdENhY2hlR2V0O1xuTGlzdENhY2hlLnByb3RvdHlwZS5oYXMgPSBsaXN0Q2FjaGVIYXM7XG5MaXN0Q2FjaGUucHJvdG90eXBlLnNldCA9IGxpc3RDYWNoZVNldDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgbWFwIGNhY2hlIG9iamVjdCB0byBzdG9yZSBrZXktdmFsdWUgcGFpcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtBcnJheX0gW2VudHJpZXNdIFRoZSBrZXktdmFsdWUgcGFpcnMgdG8gY2FjaGUuXG4gKi9cbmZ1bmN0aW9uIE1hcENhY2hlKGVudHJpZXMpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBlbnRyaWVzID8gZW50cmllcy5sZW5ndGggOiAwO1xuXG4gIHRoaXMuY2xlYXIoKTtcbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB2YXIgZW50cnkgPSBlbnRyaWVzW2luZGV4XTtcbiAgICB0aGlzLnNldChlbnRyeVswXSwgZW50cnlbMV0pO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwga2V5LXZhbHVlIGVudHJpZXMgZnJvbSB0aGUgbWFwLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBjbGVhclxuICogQG1lbWJlck9mIE1hcENhY2hlXG4gKi9cbmZ1bmN0aW9uIG1hcENhY2hlQ2xlYXIoKSB7XG4gIHRoaXMuX19kYXRhX18gPSB7XG4gICAgJ2hhc2gnOiBuZXcgSGFzaCxcbiAgICAnbWFwJzogbmV3IChNYXAgfHwgTGlzdENhY2hlKSxcbiAgICAnc3RyaW5nJzogbmV3IEhhc2hcbiAgfTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGBrZXlgIGFuZCBpdHMgdmFsdWUgZnJvbSB0aGUgbWFwLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBkZWxldGVcbiAqIEBtZW1iZXJPZiBNYXBDYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGVudHJ5IHdhcyByZW1vdmVkLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIG1hcENhY2hlRGVsZXRlKGtleSkge1xuICByZXR1cm4gZ2V0TWFwRGF0YSh0aGlzLCBrZXkpWydkZWxldGUnXShrZXkpO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIG1hcCB2YWx1ZSBmb3IgYGtleWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGdldFxuICogQG1lbWJlck9mIE1hcENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIGdldC5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBlbnRyeSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gbWFwQ2FjaGVHZXQoa2V5KSB7XG4gIHJldHVybiBnZXRNYXBEYXRhKHRoaXMsIGtleSkuZ2V0KGtleSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgbWFwIHZhbHVlIGZvciBga2V5YCBleGlzdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhc1xuICogQG1lbWJlck9mIE1hcENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGVudHJ5IHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGFuIGVudHJ5IGZvciBga2V5YCBleGlzdHMsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gbWFwQ2FjaGVIYXMoa2V5KSB7XG4gIHJldHVybiBnZXRNYXBEYXRhKHRoaXMsIGtleSkuaGFzKGtleSk7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgbWFwIGBrZXlgIHRvIGB2YWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIHNldFxuICogQG1lbWJlck9mIE1hcENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHNldC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG1hcCBjYWNoZSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gbWFwQ2FjaGVTZXQoa2V5LCB2YWx1ZSkge1xuICBnZXRNYXBEYXRhKHRoaXMsIGtleSkuc2V0KGtleSwgdmFsdWUpO1xuICByZXR1cm4gdGhpcztcbn1cblxuLy8gQWRkIG1ldGhvZHMgdG8gYE1hcENhY2hlYC5cbk1hcENhY2hlLnByb3RvdHlwZS5jbGVhciA9IG1hcENhY2hlQ2xlYXI7XG5NYXBDYWNoZS5wcm90b3R5cGVbJ2RlbGV0ZSddID0gbWFwQ2FjaGVEZWxldGU7XG5NYXBDYWNoZS5wcm90b3R5cGUuZ2V0ID0gbWFwQ2FjaGVHZXQ7XG5NYXBDYWNoZS5wcm90b3R5cGUuaGFzID0gbWFwQ2FjaGVIYXM7XG5NYXBDYWNoZS5wcm90b3R5cGUuc2V0ID0gbWFwQ2FjaGVTZXQ7XG5cbi8qKlxuICpcbiAqIENyZWF0ZXMgYW4gYXJyYXkgY2FjaGUgb2JqZWN0IHRvIHN0b3JlIHVuaXF1ZSB2YWx1ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlc10gVGhlIHZhbHVlcyB0byBjYWNoZS5cbiAqL1xuZnVuY3Rpb24gU2V0Q2FjaGUodmFsdWVzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gdmFsdWVzID8gdmFsdWVzLmxlbmd0aCA6IDA7XG5cbiAgdGhpcy5fX2RhdGFfXyA9IG5ldyBNYXBDYWNoZTtcbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB0aGlzLmFkZCh2YWx1ZXNbaW5kZXhdKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZHMgYHZhbHVlYCB0byB0aGUgYXJyYXkgY2FjaGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGFkZFxuICogQG1lbWJlck9mIFNldENhY2hlXG4gKiBAYWxpYXMgcHVzaFxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2FjaGUuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBjYWNoZSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gc2V0Q2FjaGVBZGQodmFsdWUpIHtcbiAgdGhpcy5fX2RhdGFfXy5zZXQodmFsdWUsIEhBU0hfVU5ERUZJTkVEKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgaW4gdGhlIGFycmF5IGNhY2hlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBoYXNcbiAqIEBtZW1iZXJPZiBTZXRDYWNoZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgZm91bmQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gc2V0Q2FjaGVIYXModmFsdWUpIHtcbiAgcmV0dXJuIHRoaXMuX19kYXRhX18uaGFzKHZhbHVlKTtcbn1cblxuLy8gQWRkIG1ldGhvZHMgdG8gYFNldENhY2hlYC5cblNldENhY2hlLnByb3RvdHlwZS5hZGQgPSBTZXRDYWNoZS5wcm90b3R5cGUucHVzaCA9IHNldENhY2hlQWRkO1xuU2V0Q2FjaGUucHJvdG90eXBlLmhhcyA9IHNldENhY2hlSGFzO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdGFjayBjYWNoZSBvYmplY3QgdG8gc3RvcmUga2V5LXZhbHVlIHBhaXJzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7QXJyYXl9IFtlbnRyaWVzXSBUaGUga2V5LXZhbHVlIHBhaXJzIHRvIGNhY2hlLlxuICovXG5mdW5jdGlvbiBTdGFjayhlbnRyaWVzKSB7XG4gIHRoaXMuX19kYXRhX18gPSBuZXcgTGlzdENhY2hlKGVudHJpZXMpO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGtleS12YWx1ZSBlbnRyaWVzIGZyb20gdGhlIHN0YWNrLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBjbGVhclxuICogQG1lbWJlck9mIFN0YWNrXG4gKi9cbmZ1bmN0aW9uIHN0YWNrQ2xlYXIoKSB7XG4gIHRoaXMuX19kYXRhX18gPSBuZXcgTGlzdENhY2hlO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYGtleWAgYW5kIGl0cyB2YWx1ZSBmcm9tIHRoZSBzdGFjay5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZGVsZXRlXG4gKiBAbWVtYmVyT2YgU3RhY2tcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gcmVtb3ZlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBlbnRyeSB3YXMgcmVtb3ZlZCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBzdGFja0RlbGV0ZShrZXkpIHtcbiAgcmV0dXJuIHRoaXMuX19kYXRhX19bJ2RlbGV0ZSddKGtleSk7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgc3RhY2sgdmFsdWUgZm9yIGBrZXlgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBnZXRcbiAqIEBtZW1iZXJPZiBTdGFja1xuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZW50cnkgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHN0YWNrR2V0KGtleSkge1xuICByZXR1cm4gdGhpcy5fX2RhdGFfXy5nZXQoa2V5KTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBzdGFjayB2YWx1ZSBmb3IgYGtleWAgZXhpc3RzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBoYXNcbiAqIEBtZW1iZXJPZiBTdGFja1xuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBlbnRyeSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbiBlbnRyeSBmb3IgYGtleWAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIHN0YWNrSGFzKGtleSkge1xuICByZXR1cm4gdGhpcy5fX2RhdGFfXy5oYXMoa2V5KTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGFjayBga2V5YCB0byBgdmFsdWVgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBzZXRcbiAqIEBtZW1iZXJPZiBTdGFja1xuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBzZXQuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZXQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBzdGFjayBjYWNoZSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gc3RhY2tTZXQoa2V5LCB2YWx1ZSkge1xuICB2YXIgY2FjaGUgPSB0aGlzLl9fZGF0YV9fO1xuICBpZiAoY2FjaGUgaW5zdGFuY2VvZiBMaXN0Q2FjaGUpIHtcbiAgICB2YXIgcGFpcnMgPSBjYWNoZS5fX2RhdGFfXztcbiAgICBpZiAoIU1hcCB8fCAocGFpcnMubGVuZ3RoIDwgTEFSR0VfQVJSQVlfU0laRSAtIDEpKSB7XG4gICAgICBwYWlycy5wdXNoKFtrZXksIHZhbHVlXSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgY2FjaGUgPSB0aGlzLl9fZGF0YV9fID0gbmV3IE1hcENhY2hlKHBhaXJzKTtcbiAgfVxuICBjYWNoZS5zZXQoa2V5LCB2YWx1ZSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBBZGQgbWV0aG9kcyB0byBgU3RhY2tgLlxuU3RhY2sucHJvdG90eXBlLmNsZWFyID0gc3RhY2tDbGVhcjtcblN0YWNrLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBzdGFja0RlbGV0ZTtcblN0YWNrLnByb3RvdHlwZS5nZXQgPSBzdGFja0dldDtcblN0YWNrLnByb3RvdHlwZS5oYXMgPSBzdGFja0hhcztcblN0YWNrLnByb3RvdHlwZS5zZXQgPSBzdGFja1NldDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycmF5IG9mIHRoZSBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIHRoZSBhcnJheS1saWtlIGB2YWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtib29sZWFufSBpbmhlcml0ZWQgU3BlY2lmeSByZXR1cm5pbmcgaW5oZXJpdGVkIHByb3BlcnR5IG5hbWVzLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqL1xuZnVuY3Rpb24gYXJyYXlMaWtlS2V5cyh2YWx1ZSwgaW5oZXJpdGVkKSB7XG4gIC8vIFNhZmFyaSA4LjEgbWFrZXMgYGFyZ3VtZW50cy5jYWxsZWVgIGVudW1lcmFibGUgaW4gc3RyaWN0IG1vZGUuXG4gIC8vIFNhZmFyaSA5IG1ha2VzIGBhcmd1bWVudHMubGVuZ3RoYCBlbnVtZXJhYmxlIGluIHN0cmljdCBtb2RlLlxuICB2YXIgcmVzdWx0ID0gKGlzQXJyYXkodmFsdWUpIHx8IGlzQXJndW1lbnRzKHZhbHVlKSlcbiAgICA/IGJhc2VUaW1lcyh2YWx1ZS5sZW5ndGgsIFN0cmluZylcbiAgICA6IFtdO1xuXG4gIHZhciBsZW5ndGggPSByZXN1bHQubGVuZ3RoLFxuICAgICAgc2tpcEluZGV4ZXMgPSAhIWxlbmd0aDtcblxuICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICBpZiAoKGluaGVyaXRlZCB8fCBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSAmJlxuICAgICAgICAhKHNraXBJbmRleGVzICYmIChrZXkgPT0gJ2xlbmd0aCcgfHwgaXNJbmRleChrZXksIGxlbmd0aCkpKSkge1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgYGtleWAgaXMgZm91bmQgaW4gYGFycmF5YCBvZiBrZXktdmFsdWUgcGFpcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICogQHBhcmFtIHsqfSBrZXkgVGhlIGtleSB0byBzZWFyY2ggZm9yLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUsIGVsc2UgYC0xYC5cbiAqL1xuZnVuY3Rpb24gYXNzb2NJbmRleE9mKGFycmF5LCBrZXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgaWYgKGVxKGFycmF5W2xlbmd0aF1bMF0sIGtleSkpIHtcbiAgICAgIHJldHVybiBsZW5ndGg7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5mb3JFYWNoYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl8T2JqZWN0fSBSZXR1cm5zIGBjb2xsZWN0aW9uYC5cbiAqL1xudmFyIGJhc2VFYWNoID0gY3JlYXRlQmFzZUVhY2goYmFzZUZvck93bik7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZmlsdGVyYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgZmlsdGVyZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGaWx0ZXIoY29sbGVjdGlvbiwgcHJlZGljYXRlKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgYmFzZUVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pKSB7XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgYmFzZUZvck93bmAgd2hpY2ggaXRlcmF0ZXMgb3ZlciBgb2JqZWN0YFxuICogcHJvcGVydGllcyByZXR1cm5lZCBieSBga2V5c0Z1bmNgIGFuZCBpbnZva2VzIGBpdGVyYXRlZWAgZm9yIGVhY2ggcHJvcGVydHkuXG4gKiBJdGVyYXRlZSBmdW5jdGlvbnMgbWF5IGV4aXQgaXRlcmF0aW9uIGVhcmx5IGJ5IGV4cGxpY2l0bHkgcmV0dXJuaW5nIGBmYWxzZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHBhcmFtIHtGdW5jdGlvbn0ga2V5c0Z1bmMgVGhlIGZ1bmN0aW9uIHRvIGdldCB0aGUga2V5cyBvZiBgb2JqZWN0YC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKi9cbnZhciBiYXNlRm9yID0gY3JlYXRlQmFzZUZvcigpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZvck93bmAgd2l0aG91dCBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGb3JPd24ob2JqZWN0LCBpdGVyYXRlZSkge1xuICByZXR1cm4gb2JqZWN0ICYmIGJhc2VGb3Iob2JqZWN0LCBpdGVyYXRlZSwga2V5cyk7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZ2V0YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZmF1bHQgdmFsdWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gcGF0aCBUaGUgcGF0aCBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc29sdmVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBiYXNlR2V0KG9iamVjdCwgcGF0aCkge1xuICBwYXRoID0gaXNLZXkocGF0aCwgb2JqZWN0KSA/IFtwYXRoXSA6IGNhc3RQYXRoKHBhdGgpO1xuXG4gIHZhciBpbmRleCA9IDAsXG4gICAgICBsZW5ndGggPSBwYXRoLmxlbmd0aDtcblxuICB3aGlsZSAob2JqZWN0ICE9IG51bGwgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICBvYmplY3QgPSBvYmplY3RbdG9LZXkocGF0aFtpbmRleCsrXSldO1xuICB9XG4gIHJldHVybiAoaW5kZXggJiYgaW5kZXggPT0gbGVuZ3RoKSA/IG9iamVjdCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgZ2V0VGFnYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBgdG9TdHJpbmdUYWdgLlxuICovXG5mdW5jdGlvbiBiYXNlR2V0VGFnKHZhbHVlKSB7XG4gIHJldHVybiBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5oYXNJbmAgd2l0aG91dCBzdXBwb3J0IGZvciBkZWVwIHBhdGhzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gW29iamVjdF0gVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBrZXkgVGhlIGtleSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBga2V5YCBleGlzdHMsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUhhc0luKG9iamVjdCwga2V5KSB7XG4gIHJldHVybiBvYmplY3QgIT0gbnVsbCAmJiBrZXkgaW4gT2JqZWN0KG9iamVjdCk7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNFcXVhbGAgd2hpY2ggc3VwcG9ydHMgcGFydGlhbCBjb21wYXJpc29uc1xuICogYW5kIHRyYWNrcyB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7Kn0gb3RoZXIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9taXplcl0gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBjb21wYXJpc29ucy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2JpdG1hc2tdIFRoZSBiaXRtYXNrIG9mIGNvbXBhcmlzb24gZmxhZ3MuXG4gKiAgVGhlIGJpdG1hc2sgbWF5IGJlIGNvbXBvc2VkIG9mIHRoZSBmb2xsb3dpbmcgZmxhZ3M6XG4gKiAgICAgMSAtIFVub3JkZXJlZCBjb21wYXJpc29uXG4gKiAgICAgMiAtIFBhcnRpYWwgY29tcGFyaXNvblxuICogQHBhcmFtIHtPYmplY3R9IFtzdGFja10gVHJhY2tzIHRyYXZlcnNlZCBgdmFsdWVgIGFuZCBgb3RoZXJgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBiYXNlSXNFcXVhbCh2YWx1ZSwgb3RoZXIsIGN1c3RvbWl6ZXIsIGJpdG1hc2ssIHN0YWNrKSB7XG4gIGlmICh2YWx1ZSA9PT0gb3RoZXIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAodmFsdWUgPT0gbnVsbCB8fCBvdGhlciA9PSBudWxsIHx8ICghaXNPYmplY3QodmFsdWUpICYmICFpc09iamVjdExpa2Uob3RoZXIpKSkge1xuICAgIHJldHVybiB2YWx1ZSAhPT0gdmFsdWUgJiYgb3RoZXIgIT09IG90aGVyO1xuICB9XG4gIHJldHVybiBiYXNlSXNFcXVhbERlZXAodmFsdWUsIG90aGVyLCBiYXNlSXNFcXVhbCwgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spO1xufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZUlzRXF1YWxgIGZvciBhcnJheXMgYW5kIG9iamVjdHMgd2hpY2ggcGVyZm9ybXNcbiAqIGRlZXAgY29tcGFyaXNvbnMgYW5kIHRyYWNrcyB0cmF2ZXJzZWQgb2JqZWN0cyBlbmFibGluZyBvYmplY3RzIHdpdGggY2lyY3VsYXJcbiAqIHJlZmVyZW5jZXMgdG8gYmUgY29tcGFyZWQuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBjb21wYXJlLlxuICogQHBhcmFtIHtPYmplY3R9IG90aGVyIFRoZSBvdGhlciBvYmplY3QgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGVxdWFsRnVuYyBUaGUgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGVxdWl2YWxlbnRzIG9mIHZhbHVlcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmlzb25zLlxuICogQHBhcmFtIHtudW1iZXJ9IFtiaXRtYXNrXSBUaGUgYml0bWFzayBvZiBjb21wYXJpc29uIGZsYWdzLiBTZWUgYGJhc2VJc0VxdWFsYFxuICogIGZvciBtb3JlIGRldGFpbHMuXG4gKiBAcGFyYW0ge09iamVjdH0gW3N0YWNrXSBUcmFja3MgdHJhdmVyc2VkIGBvYmplY3RgIGFuZCBgb3RoZXJgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdHMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzRXF1YWxEZWVwKG9iamVjdCwgb3RoZXIsIGVxdWFsRnVuYywgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spIHtcbiAgdmFyIG9iaklzQXJyID0gaXNBcnJheShvYmplY3QpLFxuICAgICAgb3RoSXNBcnIgPSBpc0FycmF5KG90aGVyKSxcbiAgICAgIG9ialRhZyA9IGFycmF5VGFnLFxuICAgICAgb3RoVGFnID0gYXJyYXlUYWc7XG5cbiAgaWYgKCFvYmpJc0Fycikge1xuICAgIG9ialRhZyA9IGdldFRhZyhvYmplY3QpO1xuICAgIG9ialRhZyA9IG9ialRhZyA9PSBhcmdzVGFnID8gb2JqZWN0VGFnIDogb2JqVGFnO1xuICB9XG4gIGlmICghb3RoSXNBcnIpIHtcbiAgICBvdGhUYWcgPSBnZXRUYWcob3RoZXIpO1xuICAgIG90aFRhZyA9IG90aFRhZyA9PSBhcmdzVGFnID8gb2JqZWN0VGFnIDogb3RoVGFnO1xuICB9XG4gIHZhciBvYmpJc09iaiA9IG9ialRhZyA9PSBvYmplY3RUYWcgJiYgIWlzSG9zdE9iamVjdChvYmplY3QpLFxuICAgICAgb3RoSXNPYmogPSBvdGhUYWcgPT0gb2JqZWN0VGFnICYmICFpc0hvc3RPYmplY3Qob3RoZXIpLFxuICAgICAgaXNTYW1lVGFnID0gb2JqVGFnID09IG90aFRhZztcblxuICBpZiAoaXNTYW1lVGFnICYmICFvYmpJc09iaikge1xuICAgIHN0YWNrIHx8IChzdGFjayA9IG5ldyBTdGFjayk7XG4gICAgcmV0dXJuIChvYmpJc0FyciB8fCBpc1R5cGVkQXJyYXkob2JqZWN0KSlcbiAgICAgID8gZXF1YWxBcnJheXMob2JqZWN0LCBvdGhlciwgZXF1YWxGdW5jLCBjdXN0b21pemVyLCBiaXRtYXNrLCBzdGFjaylcbiAgICAgIDogZXF1YWxCeVRhZyhvYmplY3QsIG90aGVyLCBvYmpUYWcsIGVxdWFsRnVuYywgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spO1xuICB9XG4gIGlmICghKGJpdG1hc2sgJiBQQVJUSUFMX0NPTVBBUkVfRkxBRykpIHtcbiAgICB2YXIgb2JqSXNXcmFwcGVkID0gb2JqSXNPYmogJiYgaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsICdfX3dyYXBwZWRfXycpLFxuICAgICAgICBvdGhJc1dyYXBwZWQgPSBvdGhJc09iaiAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG90aGVyLCAnX193cmFwcGVkX18nKTtcblxuICAgIGlmIChvYmpJc1dyYXBwZWQgfHwgb3RoSXNXcmFwcGVkKSB7XG4gICAgICB2YXIgb2JqVW53cmFwcGVkID0gb2JqSXNXcmFwcGVkID8gb2JqZWN0LnZhbHVlKCkgOiBvYmplY3QsXG4gICAgICAgICAgb3RoVW53cmFwcGVkID0gb3RoSXNXcmFwcGVkID8gb3RoZXIudmFsdWUoKSA6IG90aGVyO1xuXG4gICAgICBzdGFjayB8fCAoc3RhY2sgPSBuZXcgU3RhY2spO1xuICAgICAgcmV0dXJuIGVxdWFsRnVuYyhvYmpVbndyYXBwZWQsIG90aFVud3JhcHBlZCwgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spO1xuICAgIH1cbiAgfVxuICBpZiAoIWlzU2FtZVRhZykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBzdGFjayB8fCAoc3RhY2sgPSBuZXcgU3RhY2spO1xuICByZXR1cm4gZXF1YWxPYmplY3RzKG9iamVjdCwgb3RoZXIsIGVxdWFsRnVuYywgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spO1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmlzTWF0Y2hgIHdpdGhvdXQgc3VwcG9ydCBmb3IgaXRlcmF0ZWUgc2hvcnRoYW5kcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3Qgb2YgcHJvcGVydHkgdmFsdWVzIHRvIG1hdGNoLlxuICogQHBhcmFtIHtBcnJheX0gbWF0Y2hEYXRhIFRoZSBwcm9wZXJ0eSBuYW1lcywgdmFsdWVzLCBhbmQgY29tcGFyZSBmbGFncyB0byBtYXRjaC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmlzb25zLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGBvYmplY3RgIGlzIGEgbWF0Y2gsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzTWF0Y2gob2JqZWN0LCBzb3VyY2UsIG1hdGNoRGF0YSwgY3VzdG9taXplcikge1xuICB2YXIgaW5kZXggPSBtYXRjaERhdGEubGVuZ3RoLFxuICAgICAgbGVuZ3RoID0gaW5kZXgsXG4gICAgICBub0N1c3RvbWl6ZXIgPSAhY3VzdG9taXplcjtcblxuICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICByZXR1cm4gIWxlbmd0aDtcbiAgfVxuICBvYmplY3QgPSBPYmplY3Qob2JqZWN0KTtcbiAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICB2YXIgZGF0YSA9IG1hdGNoRGF0YVtpbmRleF07XG4gICAgaWYgKChub0N1c3RvbWl6ZXIgJiYgZGF0YVsyXSlcbiAgICAgICAgICA/IGRhdGFbMV0gIT09IG9iamVjdFtkYXRhWzBdXVxuICAgICAgICAgIDogIShkYXRhWzBdIGluIG9iamVjdClcbiAgICAgICAgKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgZGF0YSA9IG1hdGNoRGF0YVtpbmRleF07XG4gICAgdmFyIGtleSA9IGRhdGFbMF0sXG4gICAgICAgIG9ialZhbHVlID0gb2JqZWN0W2tleV0sXG4gICAgICAgIHNyY1ZhbHVlID0gZGF0YVsxXTtcblxuICAgIGlmIChub0N1c3RvbWl6ZXIgJiYgZGF0YVsyXSkge1xuICAgICAgaWYgKG9ialZhbHVlID09PSB1bmRlZmluZWQgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdGFjayA9IG5ldyBTdGFjaztcbiAgICAgIGlmIChjdXN0b21pemVyKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBjdXN0b21pemVyKG9ialZhbHVlLCBzcmNWYWx1ZSwga2V5LCBvYmplY3QsIHNvdXJjZSwgc3RhY2spO1xuICAgICAgfVxuICAgICAgaWYgKCEocmVzdWx0ID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYmFzZUlzRXF1YWwoc3JjVmFsdWUsIG9ialZhbHVlLCBjdXN0b21pemVyLCBVTk9SREVSRURfQ09NUEFSRV9GTEFHIHwgUEFSVElBTF9DT01QQVJFX0ZMQUcsIHN0YWNrKVxuICAgICAgICAgICAgOiByZXN1bHRcbiAgICAgICAgICApKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNOYXRpdmVgIHdpdGhvdXQgYmFkIHNoaW0gY2hlY2tzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLFxuICogIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzTmF0aXZlKHZhbHVlKSB7XG4gIGlmICghaXNPYmplY3QodmFsdWUpIHx8IGlzTWFza2VkKHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgcGF0dGVybiA9IChpc0Z1bmN0aW9uKHZhbHVlKSB8fCBpc0hvc3RPYmplY3QodmFsdWUpKSA/IHJlSXNOYXRpdmUgOiByZUlzSG9zdEN0b3I7XG4gIHJldHVybiBwYXR0ZXJuLnRlc3QodG9Tb3VyY2UodmFsdWUpKTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pc1R5cGVkQXJyYXlgIHdpdGhvdXQgTm9kZS5qcyBvcHRpbWl6YXRpb25zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdHlwZWQgYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzVHlwZWRBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJlxuICAgIGlzTGVuZ3RoKHZhbHVlLmxlbmd0aCkgJiYgISF0eXBlZEFycmF5VGFnc1tvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKV07XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXRlcmF0ZWVgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IFt2YWx1ZT1fLmlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhbiBpdGVyYXRlZS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgaXRlcmF0ZWUuXG4gKi9cbmZ1bmN0aW9uIGJhc2VJdGVyYXRlZSh2YWx1ZSkge1xuICAvLyBEb24ndCBzdG9yZSB0aGUgYHR5cGVvZmAgcmVzdWx0IGluIGEgdmFyaWFibGUgdG8gYXZvaWQgYSBKSVQgYnVnIGluIFNhZmFyaSA5LlxuICAvLyBTZWUgaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE1NjAzNCBmb3IgbW9yZSBkZXRhaWxzLlxuICBpZiAodHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICByZXR1cm4gaWRlbnRpdHk7XG4gIH1cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBpc0FycmF5KHZhbHVlKVxuICAgICAgPyBiYXNlTWF0Y2hlc1Byb3BlcnR5KHZhbHVlWzBdLCB2YWx1ZVsxXSlcbiAgICAgIDogYmFzZU1hdGNoZXModmFsdWUpO1xuICB9XG4gIHJldHVybiBwcm9wZXJ0eSh2YWx1ZSk7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ua2V5c2Agd2hpY2ggZG9lc24ndCB0cmVhdCBzcGFyc2UgYXJyYXlzIGFzIGRlbnNlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICovXG5mdW5jdGlvbiBiYXNlS2V5cyhvYmplY3QpIHtcbiAgaWYgKCFpc1Byb3RvdHlwZShvYmplY3QpKSB7XG4gICAgcmV0dXJuIG5hdGl2ZUtleXMob2JqZWN0KTtcbiAgfVxuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIGtleSBpbiBPYmplY3Qob2JqZWN0KSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSAmJiBrZXkgIT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5tYXRjaGVzYCB3aGljaCBkb2Vzbid0IGNsb25lIGBzb3VyY2VgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3Qgb2YgcHJvcGVydHkgdmFsdWVzIHRvIG1hdGNoLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgc3BlYyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZU1hdGNoZXMoc291cmNlKSB7XG4gIHZhciBtYXRjaERhdGEgPSBnZXRNYXRjaERhdGEoc291cmNlKTtcbiAgaWYgKG1hdGNoRGF0YS5sZW5ndGggPT0gMSAmJiBtYXRjaERhdGFbMF1bMl0pIHtcbiAgICByZXR1cm4gbWF0Y2hlc1N0cmljdENvbXBhcmFibGUobWF0Y2hEYXRhWzBdWzBdLCBtYXRjaERhdGFbMF1bMV0pO1xuICB9XG4gIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0ID09PSBzb3VyY2UgfHwgYmFzZUlzTWF0Y2gob2JqZWN0LCBzb3VyY2UsIG1hdGNoRGF0YSk7XG4gIH07XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ubWF0Y2hlc1Byb3BlcnR5YCB3aGljaCBkb2Vzbid0IGNsb25lIGBzcmNWYWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcGFyYW0geyp9IHNyY1ZhbHVlIFRoZSB2YWx1ZSB0byBtYXRjaC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHNwZWMgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VNYXRjaGVzUHJvcGVydHkocGF0aCwgc3JjVmFsdWUpIHtcbiAgaWYgKGlzS2V5KHBhdGgpICYmIGlzU3RyaWN0Q29tcGFyYWJsZShzcmNWYWx1ZSkpIHtcbiAgICByZXR1cm4gbWF0Y2hlc1N0cmljdENvbXBhcmFibGUodG9LZXkocGF0aCksIHNyY1ZhbHVlKTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgdmFyIG9ialZhbHVlID0gZ2V0KG9iamVjdCwgcGF0aCk7XG4gICAgcmV0dXJuIChvYmpWYWx1ZSA9PT0gdW5kZWZpbmVkICYmIG9ialZhbHVlID09PSBzcmNWYWx1ZSlcbiAgICAgID8gaGFzSW4ob2JqZWN0LCBwYXRoKVxuICAgICAgOiBiYXNlSXNFcXVhbChzcmNWYWx1ZSwgb2JqVmFsdWUsIHVuZGVmaW5lZCwgVU5PUkRFUkVEX0NPTVBBUkVfRkxBRyB8IFBBUlRJQUxfQ09NUEFSRV9GTEFHKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYGJhc2VQcm9wZXJ0eWAgd2hpY2ggc3VwcG9ydHMgZGVlcCBwYXRocy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGFjY2Vzc29yIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBiYXNlUHJvcGVydHlEZWVwKHBhdGgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBiYXNlR2V0KG9iamVjdCwgcGF0aCk7XG4gIH07XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8udG9TdHJpbmdgIHdoaWNoIGRvZXNuJ3QgY29udmVydCBudWxsaXNoXG4gKiB2YWx1ZXMgdG8gZW1wdHkgc3RyaW5ncy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIC8vIEV4aXQgZWFybHkgZm9yIHN0cmluZ3MgdG8gYXZvaWQgYSBwZXJmb3JtYW5jZSBoaXQgaW4gc29tZSBlbnZpcm9ubWVudHMuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBzeW1ib2xUb1N0cmluZyA/IHN5bWJvbFRvU3RyaW5nLmNhbGwodmFsdWUpIDogJyc7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICh2YWx1ZSArICcnKTtcbiAgcmV0dXJuIChyZXN1bHQgPT0gJzAnICYmICgxIC8gdmFsdWUpID09IC1JTkZJTklUWSkgPyAnLTAnIDogcmVzdWx0O1xufVxuXG4vKipcbiAqIENhc3RzIGB2YWx1ZWAgdG8gYSBwYXRoIGFycmF5IGlmIGl0J3Mgbm90IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgY2FzdCBwcm9wZXJ0eSBwYXRoIGFycmF5LlxuICovXG5mdW5jdGlvbiBjYXN0UGF0aCh2YWx1ZSkge1xuICByZXR1cm4gaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IHN0cmluZ1RvUGF0aCh2YWx1ZSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBiYXNlRWFjaGAgb3IgYGJhc2VFYWNoUmlnaHRgIGZ1bmN0aW9uLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlYWNoRnVuYyBUaGUgZnVuY3Rpb24gdG8gaXRlcmF0ZSBvdmVyIGEgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQmFzZUVhY2goZWFjaEZ1bmMsIGZyb21SaWdodCkge1xuICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgaXRlcmF0ZWUpIHtcbiAgICBpZiAoY29sbGVjdGlvbiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5TGlrZShjb2xsZWN0aW9uKSkge1xuICAgICAgcmV0dXJuIGVhY2hGdW5jKGNvbGxlY3Rpb24sIGl0ZXJhdGVlKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IGNvbGxlY3Rpb24ubGVuZ3RoLFxuICAgICAgICBpbmRleCA9IGZyb21SaWdodCA/IGxlbmd0aCA6IC0xLFxuICAgICAgICBpdGVyYWJsZSA9IE9iamVjdChjb2xsZWN0aW9uKTtcblxuICAgIHdoaWxlICgoZnJvbVJpZ2h0ID8gaW5kZXgtLSA6ICsraW5kZXggPCBsZW5ndGgpKSB7XG4gICAgICBpZiAoaXRlcmF0ZWUoaXRlcmFibGVbaW5kZXhdLCBpbmRleCwgaXRlcmFibGUpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZnVuY3Rpb24gZm9yIG1ldGhvZHMgbGlrZSBgXy5mb3JJbmAgYW5kIGBfLmZvck93bmAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQmFzZUZvcihmcm9tUmlnaHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCwgaXRlcmF0ZWUsIGtleXNGdW5jKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGl0ZXJhYmxlID0gT2JqZWN0KG9iamVjdCksXG4gICAgICAgIHByb3BzID0ga2V5c0Z1bmMob2JqZWN0KSxcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbZnJvbVJpZ2h0ID8gbGVuZ3RoIDogKytpbmRleF07XG4gICAgICBpZiAoaXRlcmF0ZWUoaXRlcmFibGVba2V5XSwga2V5LCBpdGVyYWJsZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9O1xufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZUlzRXF1YWxEZWVwYCBmb3IgYXJyYXlzIHdpdGggc3VwcG9ydCBmb3JcbiAqIHBhcnRpYWwgZGVlcCBjb21wYXJpc29ucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge0FycmF5fSBvdGhlciBUaGUgb3RoZXIgYXJyYXkgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGVxdWFsRnVuYyBUaGUgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGVxdWl2YWxlbnRzIG9mIHZhbHVlcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGN1c3RvbWl6ZXIgVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBjb21wYXJpc29ucy5cbiAqIEBwYXJhbSB7bnVtYmVyfSBiaXRtYXNrIFRoZSBiaXRtYXNrIG9mIGNvbXBhcmlzb24gZmxhZ3MuIFNlZSBgYmFzZUlzRXF1YWxgXG4gKiAgZm9yIG1vcmUgZGV0YWlscy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzdGFjayBUcmFja3MgdHJhdmVyc2VkIGBhcnJheWAgYW5kIGBvdGhlcmAgb2JqZWN0cy5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYXJyYXlzIGFyZSBlcXVpdmFsZW50LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGVxdWFsQXJyYXlzKGFycmF5LCBvdGhlciwgZXF1YWxGdW5jLCBjdXN0b21pemVyLCBiaXRtYXNrLCBzdGFjaykge1xuICB2YXIgaXNQYXJ0aWFsID0gYml0bWFzayAmIFBBUlRJQUxfQ09NUEFSRV9GTEFHLFxuICAgICAgYXJyTGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgb3RoTGVuZ3RoID0gb3RoZXIubGVuZ3RoO1xuXG4gIGlmIChhcnJMZW5ndGggIT0gb3RoTGVuZ3RoICYmICEoaXNQYXJ0aWFsICYmIG90aExlbmd0aCA+IGFyckxlbmd0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gQXNzdW1lIGN5Y2xpYyB2YWx1ZXMgYXJlIGVxdWFsLlxuICB2YXIgc3RhY2tlZCA9IHN0YWNrLmdldChhcnJheSk7XG4gIGlmIChzdGFja2VkICYmIHN0YWNrLmdldChvdGhlcikpIHtcbiAgICByZXR1cm4gc3RhY2tlZCA9PSBvdGhlcjtcbiAgfVxuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIHJlc3VsdCA9IHRydWUsXG4gICAgICBzZWVuID0gKGJpdG1hc2sgJiBVTk9SREVSRURfQ09NUEFSRV9GTEFHKSA/IG5ldyBTZXRDYWNoZSA6IHVuZGVmaW5lZDtcblxuICBzdGFjay5zZXQoYXJyYXksIG90aGVyKTtcbiAgc3RhY2suc2V0KG90aGVyLCBhcnJheSk7XG5cbiAgLy8gSWdub3JlIG5vbi1pbmRleCBwcm9wZXJ0aWVzLlxuICB3aGlsZSAoKytpbmRleCA8IGFyckxlbmd0aCkge1xuICAgIHZhciBhcnJWYWx1ZSA9IGFycmF5W2luZGV4XSxcbiAgICAgICAgb3RoVmFsdWUgPSBvdGhlcltpbmRleF07XG5cbiAgICBpZiAoY3VzdG9taXplcikge1xuICAgICAgdmFyIGNvbXBhcmVkID0gaXNQYXJ0aWFsXG4gICAgICAgID8gY3VzdG9taXplcihvdGhWYWx1ZSwgYXJyVmFsdWUsIGluZGV4LCBvdGhlciwgYXJyYXksIHN0YWNrKVxuICAgICAgICA6IGN1c3RvbWl6ZXIoYXJyVmFsdWUsIG90aFZhbHVlLCBpbmRleCwgYXJyYXksIG90aGVyLCBzdGFjayk7XG4gICAgfVxuICAgIGlmIChjb21wYXJlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoY29tcGFyZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIGFycmF5cyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpLlxuICAgIGlmIChzZWVuKSB7XG4gICAgICBpZiAoIWFycmF5U29tZShvdGhlciwgZnVuY3Rpb24ob3RoVmFsdWUsIG90aEluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIXNlZW4uaGFzKG90aEluZGV4KSAmJlxuICAgICAgICAgICAgICAgIChhcnJWYWx1ZSA9PT0gb3RoVmFsdWUgfHwgZXF1YWxGdW5jKGFyclZhbHVlLCBvdGhWYWx1ZSwgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spKSkge1xuICAgICAgICAgICAgICByZXR1cm4gc2Vlbi5hZGQob3RoSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCEoXG4gICAgICAgICAgYXJyVmFsdWUgPT09IG90aFZhbHVlIHx8XG4gICAgICAgICAgICBlcXVhbEZ1bmMoYXJyVmFsdWUsIG90aFZhbHVlLCBjdXN0b21pemVyLCBiaXRtYXNrLCBzdGFjaylcbiAgICAgICAgKSkge1xuICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgc3RhY2tbJ2RlbGV0ZSddKGFycmF5KTtcbiAgc3RhY2tbJ2RlbGV0ZSddKG90aGVyKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYGJhc2VJc0VxdWFsRGVlcGAgZm9yIGNvbXBhcmluZyBvYmplY3RzIG9mXG4gKiB0aGUgc2FtZSBgdG9TdHJpbmdUYWdgLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIG9ubHkgc3VwcG9ydHMgY29tcGFyaW5nIHZhbHVlcyB3aXRoIHRhZ3Mgb2ZcbiAqIGBCb29sZWFuYCwgYERhdGVgLCBgRXJyb3JgLCBgTnVtYmVyYCwgYFJlZ0V4cGAsIG9yIGBTdHJpbmdgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBUaGUgb3RoZXIgb2JqZWN0IHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnIFRoZSBgdG9TdHJpbmdUYWdgIG9mIHRoZSBvYmplY3RzIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlcXVhbEZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRldGVybWluZSBlcXVpdmFsZW50cyBvZiB2YWx1ZXMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjdXN0b21pemVyIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY29tcGFyaXNvbnMuXG4gKiBAcGFyYW0ge251bWJlcn0gYml0bWFzayBUaGUgYml0bWFzayBvZiBjb21wYXJpc29uIGZsYWdzLiBTZWUgYGJhc2VJc0VxdWFsYFxuICogIGZvciBtb3JlIGRldGFpbHMuXG4gKiBAcGFyYW0ge09iamVjdH0gc3RhY2sgVHJhY2tzIHRyYXZlcnNlZCBgb2JqZWN0YCBhbmQgYG90aGVyYCBvYmplY3RzLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBvYmplY3RzIGFyZSBlcXVpdmFsZW50LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGVxdWFsQnlUYWcob2JqZWN0LCBvdGhlciwgdGFnLCBlcXVhbEZ1bmMsIGN1c3RvbWl6ZXIsIGJpdG1hc2ssIHN0YWNrKSB7XG4gIHN3aXRjaCAodGFnKSB7XG4gICAgY2FzZSBkYXRhVmlld1RhZzpcbiAgICAgIGlmICgob2JqZWN0LmJ5dGVMZW5ndGggIT0gb3RoZXIuYnl0ZUxlbmd0aCkgfHxcbiAgICAgICAgICAob2JqZWN0LmJ5dGVPZmZzZXQgIT0gb3RoZXIuYnl0ZU9mZnNldCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgb2JqZWN0ID0gb2JqZWN0LmJ1ZmZlcjtcbiAgICAgIG90aGVyID0gb3RoZXIuYnVmZmVyO1xuXG4gICAgY2FzZSBhcnJheUJ1ZmZlclRhZzpcbiAgICAgIGlmICgob2JqZWN0LmJ5dGVMZW5ndGggIT0gb3RoZXIuYnl0ZUxlbmd0aCkgfHxcbiAgICAgICAgICAhZXF1YWxGdW5jKG5ldyBVaW50OEFycmF5KG9iamVjdCksIG5ldyBVaW50OEFycmF5KG90aGVyKSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBjYXNlIGJvb2xUYWc6XG4gICAgY2FzZSBkYXRlVGFnOlxuICAgIGNhc2UgbnVtYmVyVGFnOlxuICAgICAgLy8gQ29lcmNlIGJvb2xlYW5zIHRvIGAxYCBvciBgMGAgYW5kIGRhdGVzIHRvIG1pbGxpc2Vjb25kcy5cbiAgICAgIC8vIEludmFsaWQgZGF0ZXMgYXJlIGNvZXJjZWQgdG8gYE5hTmAuXG4gICAgICByZXR1cm4gZXEoK29iamVjdCwgK290aGVyKTtcblxuICAgIGNhc2UgZXJyb3JUYWc6XG4gICAgICByZXR1cm4gb2JqZWN0Lm5hbWUgPT0gb3RoZXIubmFtZSAmJiBvYmplY3QubWVzc2FnZSA9PSBvdGhlci5tZXNzYWdlO1xuXG4gICAgY2FzZSByZWdleHBUYWc6XG4gICAgY2FzZSBzdHJpbmdUYWc6XG4gICAgICAvLyBDb2VyY2UgcmVnZXhlcyB0byBzdHJpbmdzIGFuZCB0cmVhdCBzdHJpbmdzLCBwcmltaXRpdmVzIGFuZCBvYmplY3RzLFxuICAgICAgLy8gYXMgZXF1YWwuIFNlZSBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtcmVnZXhwLnByb3RvdHlwZS50b3N0cmluZ1xuICAgICAgLy8gZm9yIG1vcmUgZGV0YWlscy5cbiAgICAgIHJldHVybiBvYmplY3QgPT0gKG90aGVyICsgJycpO1xuXG4gICAgY2FzZSBtYXBUYWc6XG4gICAgICB2YXIgY29udmVydCA9IG1hcFRvQXJyYXk7XG5cbiAgICBjYXNlIHNldFRhZzpcbiAgICAgIHZhciBpc1BhcnRpYWwgPSBiaXRtYXNrICYgUEFSVElBTF9DT01QQVJFX0ZMQUc7XG4gICAgICBjb252ZXJ0IHx8IChjb252ZXJ0ID0gc2V0VG9BcnJheSk7XG5cbiAgICAgIGlmIChvYmplY3Quc2l6ZSAhPSBvdGhlci5zaXplICYmICFpc1BhcnRpYWwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gQXNzdW1lIGN5Y2xpYyB2YWx1ZXMgYXJlIGVxdWFsLlxuICAgICAgdmFyIHN0YWNrZWQgPSBzdGFjay5nZXQob2JqZWN0KTtcbiAgICAgIGlmIChzdGFja2VkKSB7XG4gICAgICAgIHJldHVybiBzdGFja2VkID09IG90aGVyO1xuICAgICAgfVxuICAgICAgYml0bWFzayB8PSBVTk9SREVSRURfQ09NUEFSRV9GTEFHO1xuXG4gICAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKS5cbiAgICAgIHN0YWNrLnNldChvYmplY3QsIG90aGVyKTtcbiAgICAgIHZhciByZXN1bHQgPSBlcXVhbEFycmF5cyhjb252ZXJ0KG9iamVjdCksIGNvbnZlcnQob3RoZXIpLCBlcXVhbEZ1bmMsIGN1c3RvbWl6ZXIsIGJpdG1hc2ssIHN0YWNrKTtcbiAgICAgIHN0YWNrWydkZWxldGUnXShvYmplY3QpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcblxuICAgIGNhc2Ugc3ltYm9sVGFnOlxuICAgICAgaWYgKHN5bWJvbFZhbHVlT2YpIHtcbiAgICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlT2YuY2FsbChvYmplY3QpID09IHN5bWJvbFZhbHVlT2YuY2FsbChvdGhlcik7XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZUlzRXF1YWxEZWVwYCBmb3Igb2JqZWN0cyB3aXRoIHN1cHBvcnQgZm9yXG4gKiBwYXJ0aWFsIGRlZXAgY29tcGFyaXNvbnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBjb21wYXJlLlxuICogQHBhcmFtIHtPYmplY3R9IG90aGVyIFRoZSBvdGhlciBvYmplY3QgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGVxdWFsRnVuYyBUaGUgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGVxdWl2YWxlbnRzIG9mIHZhbHVlcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGN1c3RvbWl6ZXIgVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBjb21wYXJpc29ucy5cbiAqIEBwYXJhbSB7bnVtYmVyfSBiaXRtYXNrIFRoZSBiaXRtYXNrIG9mIGNvbXBhcmlzb24gZmxhZ3MuIFNlZSBgYmFzZUlzRXF1YWxgXG4gKiAgZm9yIG1vcmUgZGV0YWlscy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzdGFjayBUcmFja3MgdHJhdmVyc2VkIGBvYmplY3RgIGFuZCBgb3RoZXJgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdHMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gZXF1YWxPYmplY3RzKG9iamVjdCwgb3RoZXIsIGVxdWFsRnVuYywgY3VzdG9taXplciwgYml0bWFzaywgc3RhY2spIHtcbiAgdmFyIGlzUGFydGlhbCA9IGJpdG1hc2sgJiBQQVJUSUFMX0NPTVBBUkVfRkxBRyxcbiAgICAgIG9ialByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgb2JqTGVuZ3RoID0gb2JqUHJvcHMubGVuZ3RoLFxuICAgICAgb3RoUHJvcHMgPSBrZXlzKG90aGVyKSxcbiAgICAgIG90aExlbmd0aCA9IG90aFByb3BzLmxlbmd0aDtcblxuICBpZiAob2JqTGVuZ3RoICE9IG90aExlbmd0aCAmJiAhaXNQYXJ0aWFsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBpbmRleCA9IG9iakxlbmd0aDtcbiAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICB2YXIga2V5ID0gb2JqUHJvcHNbaW5kZXhdO1xuICAgIGlmICghKGlzUGFydGlhbCA/IGtleSBpbiBvdGhlciA6IGhhc093blByb3BlcnR5LmNhbGwob3RoZXIsIGtleSkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIC8vIEFzc3VtZSBjeWNsaWMgdmFsdWVzIGFyZSBlcXVhbC5cbiAgdmFyIHN0YWNrZWQgPSBzdGFjay5nZXQob2JqZWN0KTtcbiAgaWYgKHN0YWNrZWQgJiYgc3RhY2suZ2V0KG90aGVyKSkge1xuICAgIHJldHVybiBzdGFja2VkID09IG90aGVyO1xuICB9XG4gIHZhciByZXN1bHQgPSB0cnVlO1xuICBzdGFjay5zZXQob2JqZWN0LCBvdGhlcik7XG4gIHN0YWNrLnNldChvdGhlciwgb2JqZWN0KTtcblxuICB2YXIgc2tpcEN0b3IgPSBpc1BhcnRpYWw7XG4gIHdoaWxlICgrK2luZGV4IDwgb2JqTGVuZ3RoKSB7XG4gICAga2V5ID0gb2JqUHJvcHNbaW5kZXhdO1xuICAgIHZhciBvYmpWYWx1ZSA9IG9iamVjdFtrZXldLFxuICAgICAgICBvdGhWYWx1ZSA9IG90aGVyW2tleV07XG5cbiAgICBpZiAoY3VzdG9taXplcikge1xuICAgICAgdmFyIGNvbXBhcmVkID0gaXNQYXJ0aWFsXG4gICAgICAgID8gY3VzdG9taXplcihvdGhWYWx1ZSwgb2JqVmFsdWUsIGtleSwgb3RoZXIsIG9iamVjdCwgc3RhY2spXG4gICAgICAgIDogY3VzdG9taXplcihvYmpWYWx1ZSwgb3RoVmFsdWUsIGtleSwgb2JqZWN0LCBvdGhlciwgc3RhY2spO1xuICAgIH1cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKS5cbiAgICBpZiAoIShjb21wYXJlZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyAob2JqVmFsdWUgPT09IG90aFZhbHVlIHx8IGVxdWFsRnVuYyhvYmpWYWx1ZSwgb3RoVmFsdWUsIGN1c3RvbWl6ZXIsIGJpdG1hc2ssIHN0YWNrKSlcbiAgICAgICAgICA6IGNvbXBhcmVkXG4gICAgICAgICkpIHtcbiAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHNraXBDdG9yIHx8IChza2lwQ3RvciA9IGtleSA9PSAnY29uc3RydWN0b3InKTtcbiAgfVxuICBpZiAocmVzdWx0ICYmICFza2lwQ3Rvcikge1xuICAgIHZhciBvYmpDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICBvdGhDdG9yID0gb3RoZXIuY29uc3RydWN0b3I7XG5cbiAgICAvLyBOb24gYE9iamVjdGAgb2JqZWN0IGluc3RhbmNlcyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVhbC5cbiAgICBpZiAob2JqQ3RvciAhPSBvdGhDdG9yICYmXG4gICAgICAgICgnY29uc3RydWN0b3InIGluIG9iamVjdCAmJiAnY29uc3RydWN0b3InIGluIG90aGVyKSAmJlxuICAgICAgICAhKHR5cGVvZiBvYmpDdG9yID09ICdmdW5jdGlvbicgJiYgb2JqQ3RvciBpbnN0YW5jZW9mIG9iakN0b3IgJiZcbiAgICAgICAgICB0eXBlb2Ygb3RoQ3RvciA9PSAnZnVuY3Rpb24nICYmIG90aEN0b3IgaW5zdGFuY2VvZiBvdGhDdG9yKSkge1xuICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICB9XG4gIHN0YWNrWydkZWxldGUnXShvYmplY3QpO1xuICBzdGFja1snZGVsZXRlJ10ob3RoZXIpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGRhdGEgZm9yIGBtYXBgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gbWFwIFRoZSBtYXAgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSByZWZlcmVuY2Uga2V5LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1hcCBkYXRhLlxuICovXG5mdW5jdGlvbiBnZXRNYXBEYXRhKG1hcCwga2V5KSB7XG4gIHZhciBkYXRhID0gbWFwLl9fZGF0YV9fO1xuICByZXR1cm4gaXNLZXlhYmxlKGtleSlcbiAgICA/IGRhdGFbdHlwZW9mIGtleSA9PSAnc3RyaW5nJyA/ICdzdHJpbmcnIDogJ2hhc2gnXVxuICAgIDogZGF0YS5tYXA7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgcHJvcGVydHkgbmFtZXMsIHZhbHVlcywgYW5kIGNvbXBhcmUgZmxhZ3Mgb2YgYG9iamVjdGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbWF0Y2ggZGF0YSBvZiBgb2JqZWN0YC5cbiAqL1xuZnVuY3Rpb24gZ2V0TWF0Y2hEYXRhKG9iamVjdCkge1xuICB2YXIgcmVzdWx0ID0ga2V5cyhvYmplY3QpLFxuICAgICAgbGVuZ3RoID0gcmVzdWx0Lmxlbmd0aDtcblxuICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICB2YXIga2V5ID0gcmVzdWx0W2xlbmd0aF0sXG4gICAgICAgIHZhbHVlID0gb2JqZWN0W2tleV07XG5cbiAgICByZXN1bHRbbGVuZ3RoXSA9IFtrZXksIHZhbHVlLCBpc1N0cmljdENvbXBhcmFibGUodmFsdWUpXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEdldHMgdGhlIG5hdGl2ZSBmdW5jdGlvbiBhdCBga2V5YCBvZiBgb2JqZWN0YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBtZXRob2QgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZ1bmN0aW9uIGlmIGl0J3MgbmF0aXZlLCBlbHNlIGB1bmRlZmluZWRgLlxuICovXG5mdW5jdGlvbiBnZXROYXRpdmUob2JqZWN0LCBrZXkpIHtcbiAgdmFyIHZhbHVlID0gZ2V0VmFsdWUob2JqZWN0LCBrZXkpO1xuICByZXR1cm4gYmFzZUlzTmF0aXZlKHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGB0b1N0cmluZ1RhZ2Agb2YgYHZhbHVlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBgdG9TdHJpbmdUYWdgLlxuICovXG52YXIgZ2V0VGFnID0gYmFzZUdldFRhZztcblxuLy8gRmFsbGJhY2sgZm9yIGRhdGEgdmlld3MsIG1hcHMsIHNldHMsIGFuZCB3ZWFrIG1hcHMgaW4gSUUgMTEsXG4vLyBmb3IgZGF0YSB2aWV3cyBpbiBFZGdlIDwgMTQsIGFuZCBwcm9taXNlcyBpbiBOb2RlLmpzLlxuaWYgKChEYXRhVmlldyAmJiBnZXRUYWcobmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcigxKSkpICE9IGRhdGFWaWV3VGFnKSB8fFxuICAgIChNYXAgJiYgZ2V0VGFnKG5ldyBNYXApICE9IG1hcFRhZykgfHxcbiAgICAoUHJvbWlzZSAmJiBnZXRUYWcoUHJvbWlzZS5yZXNvbHZlKCkpICE9IHByb21pc2VUYWcpIHx8XG4gICAgKFNldCAmJiBnZXRUYWcobmV3IFNldCkgIT0gc2V0VGFnKSB8fFxuICAgIChXZWFrTWFwICYmIGdldFRhZyhuZXcgV2Vha01hcCkgIT0gd2Vha01hcFRhZykpIHtcbiAgZ2V0VGFnID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgcmVzdWx0ID0gb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSksXG4gICAgICAgIEN0b3IgPSByZXN1bHQgPT0gb2JqZWN0VGFnID8gdmFsdWUuY29uc3RydWN0b3IgOiB1bmRlZmluZWQsXG4gICAgICAgIGN0b3JTdHJpbmcgPSBDdG9yID8gdG9Tb3VyY2UoQ3RvcikgOiB1bmRlZmluZWQ7XG5cbiAgICBpZiAoY3RvclN0cmluZykge1xuICAgICAgc3dpdGNoIChjdG9yU3RyaW5nKSB7XG4gICAgICAgIGNhc2UgZGF0YVZpZXdDdG9yU3RyaW5nOiByZXR1cm4gZGF0YVZpZXdUYWc7XG4gICAgICAgIGNhc2UgbWFwQ3RvclN0cmluZzogcmV0dXJuIG1hcFRhZztcbiAgICAgICAgY2FzZSBwcm9taXNlQ3RvclN0cmluZzogcmV0dXJuIHByb21pc2VUYWc7XG4gICAgICAgIGNhc2Ugc2V0Q3RvclN0cmluZzogcmV0dXJuIHNldFRhZztcbiAgICAgICAgY2FzZSB3ZWFrTWFwQ3RvclN0cmluZzogcmV0dXJuIHdlYWtNYXBUYWc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBwYXRoYCBleGlzdHMgb24gYG9iamVjdGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGNoZWNrLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaGFzRnVuYyBUaGUgZnVuY3Rpb24gdG8gY2hlY2sgcHJvcGVydGllcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgcGF0aGAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGhhc1BhdGgob2JqZWN0LCBwYXRoLCBoYXNGdW5jKSB7XG4gIHBhdGggPSBpc0tleShwYXRoLCBvYmplY3QpID8gW3BhdGhdIDogY2FzdFBhdGgocGF0aCk7XG5cbiAgdmFyIHJlc3VsdCxcbiAgICAgIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBwYXRoLmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHZhciBrZXkgPSB0b0tleShwYXRoW2luZGV4XSk7XG4gICAgaWYgKCEocmVzdWx0ID0gb2JqZWN0ICE9IG51bGwgJiYgaGFzRnVuYyhvYmplY3QsIGtleSkpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgb2JqZWN0ID0gb2JqZWN0W2tleV07XG4gIH1cbiAgaWYgKHJlc3VsdCkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdmFyIGxlbmd0aCA9IG9iamVjdCA/IG9iamVjdC5sZW5ndGggOiAwO1xuICByZXR1cm4gISFsZW5ndGggJiYgaXNMZW5ndGgobGVuZ3RoKSAmJiBpc0luZGV4KGtleSwgbGVuZ3RoKSAmJlxuICAgIChpc0FycmF5KG9iamVjdCkgfHwgaXNBcmd1bWVudHMob2JqZWN0KSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGluZGV4LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoPU1BWF9TQUZFX0lOVEVHRVJdIFRoZSB1cHBlciBib3VuZHMgb2YgYSB2YWxpZCBpbmRleC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgaW5kZXgsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNJbmRleCh2YWx1ZSwgbGVuZ3RoKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCA9PSBudWxsID8gTUFYX1NBRkVfSU5URUdFUiA6IGxlbmd0aDtcbiAgcmV0dXJuICEhbGVuZ3RoICYmXG4gICAgKHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCByZUlzVWludC50ZXN0KHZhbHVlKSkgJiZcbiAgICAodmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8IGxlbmd0aCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBwcm9wZXJ0eSBuYW1lIGFuZCBub3QgYSBwcm9wZXJ0eSBwYXRoLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0XSBUaGUgb2JqZWN0IHRvIHF1ZXJ5IGtleXMgb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHByb3BlcnR5IG5hbWUsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNLZXkodmFsdWUsIG9iamVjdCkge1xuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIGlmICh0eXBlID09ICdudW1iZXInIHx8IHR5cGUgPT0gJ3N5bWJvbCcgfHwgdHlwZSA9PSAnYm9vbGVhbicgfHxcbiAgICAgIHZhbHVlID09IG51bGwgfHwgaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIHJlSXNQbGFpblByb3AudGVzdCh2YWx1ZSkgfHwgIXJlSXNEZWVwUHJvcC50ZXN0KHZhbHVlKSB8fFxuICAgIChvYmplY3QgIT0gbnVsbCAmJiB2YWx1ZSBpbiBPYmplY3Qob2JqZWN0KSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgc3VpdGFibGUgZm9yIHVzZSBhcyB1bmlxdWUgb2JqZWN0IGtleS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBzdWl0YWJsZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0tleWFibGUodmFsdWUpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAodHlwZSA9PSAnc3RyaW5nJyB8fCB0eXBlID09ICdudW1iZXInIHx8IHR5cGUgPT0gJ3N5bWJvbCcgfHwgdHlwZSA9PSAnYm9vbGVhbicpXG4gICAgPyAodmFsdWUgIT09ICdfX3Byb3RvX18nKVxuICAgIDogKHZhbHVlID09PSBudWxsKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYGZ1bmNgIGhhcyBpdHMgc291cmNlIG1hc2tlZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYGZ1bmNgIGlzIG1hc2tlZCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc01hc2tlZChmdW5jKSB7XG4gIHJldHVybiAhIW1hc2tTcmNLZXkgJiYgKG1hc2tTcmNLZXkgaW4gZnVuYyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgbGlrZWx5IGEgcHJvdG90eXBlIG9iamVjdC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHByb3RvdHlwZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc1Byb3RvdHlwZSh2YWx1ZSkge1xuICB2YXIgQ3RvciA9IHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yLFxuICAgICAgcHJvdG8gPSAodHlwZW9mIEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBDdG9yLnByb3RvdHlwZSkgfHwgb2JqZWN0UHJvdG87XG5cbiAgcmV0dXJuIHZhbHVlID09PSBwcm90bztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBzdWl0YWJsZSBmb3Igc3RyaWN0IGVxdWFsaXR5IGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlmIHN1aXRhYmxlIGZvciBzdHJpY3RcbiAqICBlcXVhbGl0eSBjb21wYXJpc29ucywgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc1N0cmljdENvbXBhcmFibGUodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSB2YWx1ZSAmJiAhaXNPYmplY3QodmFsdWUpO1xufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgbWF0Y2hlc1Byb3BlcnR5YCBmb3Igc291cmNlIHZhbHVlcyBzdWl0YWJsZVxuICogZm9yIHN0cmljdCBlcXVhbGl0eSBjb21wYXJpc29ucywgaS5lLiBgPT09YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcGFyYW0geyp9IHNyY1ZhbHVlIFRoZSB2YWx1ZSB0byBtYXRjaC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHNwZWMgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG1hdGNoZXNTdHJpY3RDb21wYXJhYmxlKGtleSwgc3JjVmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0W2tleV0gPT09IHNyY1ZhbHVlICYmXG4gICAgICAoc3JjVmFsdWUgIT09IHVuZGVmaW5lZCB8fCAoa2V5IGluIE9iamVjdChvYmplY3QpKSk7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydHMgYHN0cmluZ2AgdG8gYSBwcm9wZXJ0eSBwYXRoIGFycmF5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgcHJvcGVydHkgcGF0aCBhcnJheS5cbiAqL1xudmFyIHN0cmluZ1RvUGF0aCA9IG1lbW9pemUoZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHN0cmluZyA9IHRvU3RyaW5nKHN0cmluZyk7XG5cbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBpZiAocmVMZWFkaW5nRG90LnRlc3Qoc3RyaW5nKSkge1xuICAgIHJlc3VsdC5wdXNoKCcnKTtcbiAgfVxuICBzdHJpbmcucmVwbGFjZShyZVByb3BOYW1lLCBmdW5jdGlvbihtYXRjaCwgbnVtYmVyLCBxdW90ZSwgc3RyaW5nKSB7XG4gICAgcmVzdWx0LnB1c2gocXVvdGUgPyBzdHJpbmcucmVwbGFjZShyZUVzY2FwZUNoYXIsICckMScpIDogKG51bWJlciB8fCBtYXRjaCkpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn0pO1xuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcga2V5IGlmIGl0J3Mgbm90IGEgc3RyaW5nIG9yIHN5bWJvbC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtzdHJpbmd8c3ltYm9sfSBSZXR1cm5zIHRoZSBrZXkuXG4gKi9cbmZ1bmN0aW9uIHRvS2V5KHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycgfHwgaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHZhciByZXN1bHQgPSAodmFsdWUgKyAnJyk7XG4gIHJldHVybiAocmVzdWx0ID09ICcwJyAmJiAoMSAvIHZhbHVlKSA9PSAtSU5GSU5JVFkpID8gJy0wJyA6IHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgZnVuY2AgdG8gaXRzIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc291cmNlIGNvZGUuXG4gKi9cbmZ1bmN0aW9uIHRvU291cmNlKGZ1bmMpIHtcbiAgaWYgKGZ1bmMgIT0gbnVsbCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZnVuY1RvU3RyaW5nLmNhbGwoZnVuYyk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIChmdW5jICsgJycpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbiAgcmV0dXJuICcnO1xufVxuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgZWxlbWVudHMgb2YgYGNvbGxlY3Rpb25gLCByZXR1cm5pbmcgYW4gYXJyYXkgb2YgYWxsIGVsZW1lbnRzXG4gKiBgcHJlZGljYXRlYCByZXR1cm5zIHRydXRoeSBmb3IuIFRoZSBwcmVkaWNhdGUgaXMgaW52b2tlZCB3aXRoIHRocmVlXG4gKiBhcmd1bWVudHM6ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAqXG4gKiAqKk5vdGU6KiogVW5saWtlIGBfLnJlbW92ZWAsIHRoaXMgbWV0aG9kIHJldHVybnMgYSBuZXcgYXJyYXkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwcmVkaWNhdGU9Xy5pZGVudGl0eV1cbiAqICBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgZmlsdGVyZWQgYXJyYXkuXG4gKiBAc2VlIF8ucmVqZWN0XG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciB1c2VycyA9IFtcbiAqICAgeyAndXNlcic6ICdiYXJuZXknLCAnYWdlJzogMzYsICdhY3RpdmUnOiB0cnVlIH0sXG4gKiAgIHsgJ3VzZXInOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAnYWN0aXZlJzogZmFsc2UgfVxuICogXTtcbiAqXG4gKiBfLmZpbHRlcih1c2VycywgZnVuY3Rpb24obykgeyByZXR1cm4gIW8uYWN0aXZlOyB9KTtcbiAqIC8vID0+IG9iamVjdHMgZm9yIFsnZnJlZCddXG4gKlxuICogLy8gVGhlIGBfLm1hdGNoZXNgIGl0ZXJhdGVlIHNob3J0aGFuZC5cbiAqIF8uZmlsdGVyKHVzZXJzLCB7ICdhZ2UnOiAzNiwgJ2FjdGl2ZSc6IHRydWUgfSk7XG4gKiAvLyA9PiBvYmplY3RzIGZvciBbJ2Jhcm5leSddXG4gKlxuICogLy8gVGhlIGBfLm1hdGNoZXNQcm9wZXJ0eWAgaXRlcmF0ZWUgc2hvcnRoYW5kLlxuICogXy5maWx0ZXIodXNlcnMsIFsnYWN0aXZlJywgZmFsc2VdKTtcbiAqIC8vID0+IG9iamVjdHMgZm9yIFsnZnJlZCddXG4gKlxuICogLy8gVGhlIGBfLnByb3BlcnR5YCBpdGVyYXRlZSBzaG9ydGhhbmQuXG4gKiBfLmZpbHRlcih1c2VycywgJ2FjdGl2ZScpO1xuICogLy8gPT4gb2JqZWN0cyBmb3IgWydiYXJuZXknXVxuICovXG5mdW5jdGlvbiBmaWx0ZXIoY29sbGVjdGlvbiwgcHJlZGljYXRlKSB7XG4gIHZhciBmdW5jID0gaXNBcnJheShjb2xsZWN0aW9uKSA/IGFycmF5RmlsdGVyIDogYmFzZUZpbHRlcjtcbiAgcmV0dXJuIGZ1bmMoY29sbGVjdGlvbiwgYmFzZUl0ZXJhdGVlKHByZWRpY2F0ZSwgMykpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IG1lbW9pemVzIHRoZSByZXN1bHQgb2YgYGZ1bmNgLiBJZiBgcmVzb2x2ZXJgIGlzXG4gKiBwcm92aWRlZCwgaXQgZGV0ZXJtaW5lcyB0aGUgY2FjaGUga2V5IGZvciBzdG9yaW5nIHRoZSByZXN1bHQgYmFzZWQgb24gdGhlXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uLiBCeSBkZWZhdWx0LCB0aGUgZmlyc3QgYXJndW1lbnRcbiAqIHByb3ZpZGVkIHRvIHRoZSBtZW1vaXplZCBmdW5jdGlvbiBpcyB1c2VkIGFzIHRoZSBtYXAgY2FjaGUga2V5LiBUaGUgYGZ1bmNgXG4gKiBpcyBpbnZva2VkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZSBtZW1vaXplZCBmdW5jdGlvbi5cbiAqXG4gKiAqKk5vdGU6KiogVGhlIGNhY2hlIGlzIGV4cG9zZWQgYXMgdGhlIGBjYWNoZWAgcHJvcGVydHkgb24gdGhlIG1lbW9pemVkXG4gKiBmdW5jdGlvbi4gSXRzIGNyZWF0aW9uIG1heSBiZSBjdXN0b21pemVkIGJ5IHJlcGxhY2luZyB0aGUgYF8ubWVtb2l6ZS5DYWNoZWBcbiAqIGNvbnN0cnVjdG9yIHdpdGggb25lIHdob3NlIGluc3RhbmNlcyBpbXBsZW1lbnQgdGhlXG4gKiBbYE1hcGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLXByb3BlcnRpZXMtb2YtdGhlLW1hcC1wcm90b3R5cGUtb2JqZWN0KVxuICogbWV0aG9kIGludGVyZmFjZSBvZiBgZGVsZXRlYCwgYGdldGAsIGBoYXNgLCBhbmQgYHNldGAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBoYXZlIGl0cyBvdXRwdXQgbWVtb2l6ZWQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVzb2x2ZXJdIFRoZSBmdW5jdGlvbiB0byByZXNvbHZlIHRoZSBjYWNoZSBrZXkuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBtZW1vaXplZCBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdCA9IHsgJ2EnOiAxLCAnYic6IDIgfTtcbiAqIHZhciBvdGhlciA9IHsgJ2MnOiAzLCAnZCc6IDQgfTtcbiAqXG4gKiB2YXIgdmFsdWVzID0gXy5tZW1vaXplKF8udmFsdWVzKTtcbiAqIHZhbHVlcyhvYmplY3QpO1xuICogLy8gPT4gWzEsIDJdXG4gKlxuICogdmFsdWVzKG90aGVyKTtcbiAqIC8vID0+IFszLCA0XVxuICpcbiAqIG9iamVjdC5hID0gMjtcbiAqIHZhbHVlcyhvYmplY3QpO1xuICogLy8gPT4gWzEsIDJdXG4gKlxuICogLy8gTW9kaWZ5IHRoZSByZXN1bHQgY2FjaGUuXG4gKiB2YWx1ZXMuY2FjaGUuc2V0KG9iamVjdCwgWydhJywgJ2InXSk7XG4gKiB2YWx1ZXMob2JqZWN0KTtcbiAqIC8vID0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBSZXBsYWNlIGBfLm1lbW9pemUuQ2FjaGVgLlxuICogXy5tZW1vaXplLkNhY2hlID0gV2Vha01hcDtcbiAqL1xuZnVuY3Rpb24gbWVtb2l6ZShmdW5jLCByZXNvbHZlcikge1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJyB8fCAocmVzb2x2ZXIgJiYgdHlwZW9mIHJlc29sdmVyICE9ICdmdW5jdGlvbicpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICBrZXkgPSByZXNvbHZlciA/IHJlc29sdmVyLmFwcGx5KHRoaXMsIGFyZ3MpIDogYXJnc1swXSxcbiAgICAgICAgY2FjaGUgPSBtZW1vaXplZC5jYWNoZTtcblxuICAgIGlmIChjYWNoZS5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIGNhY2hlLmdldChrZXkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICBtZW1vaXplZC5jYWNoZSA9IGNhY2hlLnNldChrZXksIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgbWVtb2l6ZWQuY2FjaGUgPSBuZXcgKG1lbW9pemUuQ2FjaGUgfHwgTWFwQ2FjaGUpO1xuICByZXR1cm4gbWVtb2l6ZWQ7XG59XG5cbi8vIEFzc2lnbiBjYWNoZSB0byBgXy5tZW1vaXplYC5cbm1lbW9pemUuQ2FjaGUgPSBNYXBDYWNoZTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhXG4gKiBbYFNhbWVWYWx1ZVplcm9gXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1zYW1ldmFsdWV6ZXJvKVxuICogY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlIGVxdWl2YWxlbnQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNvbXBhcmUuXG4gKiBAcGFyYW0geyp9IG90aGVyIFRoZSBvdGhlciB2YWx1ZSB0byBjb21wYXJlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdCA9IHsgJ2EnOiAxIH07XG4gKiB2YXIgb3RoZXIgPSB7ICdhJzogMSB9O1xuICpcbiAqIF8uZXEob2JqZWN0LCBvYmplY3QpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uZXEob2JqZWN0LCBvdGhlcik7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uZXEoJ2EnLCAnYScpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uZXEoJ2EnLCBPYmplY3QoJ2EnKSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uZXEoTmFOLCBOYU4pO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBlcSh2YWx1ZSwgb3RoZXIpIHtcbiAgcmV0dXJuIHZhbHVlID09PSBvdGhlciB8fCAodmFsdWUgIT09IHZhbHVlICYmIG90aGVyICE9PSBvdGhlcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgbGlrZWx5IGFuIGBhcmd1bWVudHNgIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBgYXJndW1lbnRzYCBvYmplY3QsXG4gKiAgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJndW1lbnRzKGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJndW1lbnRzOyB9KCkpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcmd1bWVudHMoWzEsIDIsIDNdKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gIC8vIFNhZmFyaSA4LjEgbWFrZXMgYGFyZ3VtZW50cy5jYWxsZWVgIGVudW1lcmFibGUgaW4gc3RyaWN0IG1vZGUuXG4gIHJldHVybiBpc0FycmF5TGlrZU9iamVjdCh2YWx1ZSkgJiYgaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2NhbGxlZScpICYmXG4gICAgKCFwcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHZhbHVlLCAnY2FsbGVlJykgfHwgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gYXJnc1RhZyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhbiBgQXJyYXlgIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJyYXkoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXkoZG9jdW1lbnQuYm9keS5jaGlsZHJlbik7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNBcnJheSgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNBcnJheShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UuIEEgdmFsdWUgaXMgY29uc2lkZXJlZCBhcnJheS1saWtlIGlmIGl0J3NcbiAqIG5vdCBhIGZ1bmN0aW9uIGFuZCBoYXMgYSBgdmFsdWUubGVuZ3RoYCB0aGF0J3MgYW4gaW50ZWdlciBncmVhdGVyIHRoYW4gb3JcbiAqIGVxdWFsIHRvIGAwYCBhbmQgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIGBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUmAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5TGlrZShkb2N1bWVudC5ib2R5LmNoaWxkcmVuKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKCdhYmMnKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmICFpc0Z1bmN0aW9uKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmlzQXJyYXlMaWtlYCBleGNlcHQgdGhhdCBpdCBhbHNvIGNoZWNrcyBpZiBgdmFsdWVgXG4gKiBpcyBhbiBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYXJyYXktbGlrZSBvYmplY3QsXG4gKiAgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5TGlrZU9iamVjdChkb2N1bWVudC5ib2R5LmNoaWxkcmVuKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlT2JqZWN0KCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0FycmF5TGlrZU9iamVjdChfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2VPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNBcnJheUxpa2UodmFsdWUpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgRnVuY3Rpb25gIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNGdW5jdGlvbihfKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oL2FiYy8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICAvLyBUaGUgdXNlIG9mIGBPYmplY3QjdG9TdHJpbmdgIGF2b2lkcyBpc3N1ZXMgd2l0aCB0aGUgYHR5cGVvZmAgb3BlcmF0b3JcbiAgLy8gaW4gU2FmYXJpIDgtOSB3aGljaCByZXR1cm5zICdvYmplY3QnIGZvciB0eXBlZCBhcnJheSBhbmQgb3RoZXIgY29uc3RydWN0b3JzLlxuICB2YXIgdGFnID0gaXNPYmplY3QodmFsdWUpID8gb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgOiAnJztcbiAgcmV0dXJuIHRhZyA9PSBmdW5jVGFnIHx8IHRhZyA9PSBnZW5UYWc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBtZXRob2QgaXMgbG9vc2VseSBiYXNlZCBvblxuICogW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzTGVuZ3RoKDMpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNMZW5ndGgoTnVtYmVyLk1JTl9WQUxVRSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNMZW5ndGgoSW5maW5pdHkpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzTGVuZ3RoKCczJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmXG4gICAgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZVxuICogW2xhbmd1YWdlIHR5cGVdKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1lY21hc2NyaXB0LWxhbmd1YWdlLXR5cGVzKVxuICogb2YgYE9iamVjdGAuIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChfLm5vb3ApO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZSh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBTeW1ib2xgIHByaW1pdGl2ZSBvciBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBzeW1ib2wsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1N5bWJvbChTeW1ib2wuaXRlcmF0b3IpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNTeW1ib2woJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTeW1ib2wodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3ltYm9sJyB8fFxuICAgIChpc09iamVjdExpa2UodmFsdWUpICYmIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpID09IHN5bWJvbFRhZyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIHR5cGVkIGFycmF5LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMy4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdHlwZWQgYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1R5cGVkQXJyYXkobmV3IFVpbnQ4QXJyYXkpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNUeXBlZEFycmF5KFtdKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnZhciBpc1R5cGVkQXJyYXkgPSBub2RlSXNUeXBlZEFycmF5ID8gYmFzZVVuYXJ5KG5vZGVJc1R5cGVkQXJyYXkpIDogYmFzZUlzVHlwZWRBcnJheTtcblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nLiBBbiBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWQgZm9yIGBudWxsYFxuICogYW5kIGB1bmRlZmluZWRgIHZhbHVlcy4gVGhlIHNpZ24gb2YgYC0wYCBpcyBwcmVzZXJ2ZWQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9TdHJpbmcobnVsbCk7XG4gKiAvLyA9PiAnJ1xuICpcbiAqIF8udG9TdHJpbmcoLTApO1xuICogLy8gPT4gJy0wJ1xuICpcbiAqIF8udG9TdHJpbmcoWzEsIDIsIDNdKTtcbiAqIC8vID0+ICcxLDIsMydcbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6IGJhc2VUb1N0cmluZyh2YWx1ZSk7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgdmFsdWUgYXQgYHBhdGhgIG9mIGBvYmplY3RgLiBJZiB0aGUgcmVzb2x2ZWQgdmFsdWUgaXNcbiAqIGB1bmRlZmluZWRgLCB0aGUgYGRlZmF1bHRWYWx1ZWAgaXMgcmV0dXJuZWQgaW4gaXRzIHBsYWNlLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMy43LjBcbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcGFyYW0geyp9IFtkZWZhdWx0VmFsdWVdIFRoZSB2YWx1ZSByZXR1cm5lZCBmb3IgYHVuZGVmaW5lZGAgcmVzb2x2ZWQgdmFsdWVzLlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc29sdmVkIHZhbHVlLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IFt7ICdiJzogeyAnYyc6IDMgfSB9XSB9O1xuICpcbiAqIF8uZ2V0KG9iamVjdCwgJ2FbMF0uYi5jJyk7XG4gKiAvLyA9PiAzXG4gKlxuICogXy5nZXQob2JqZWN0LCBbJ2EnLCAnMCcsICdiJywgJ2MnXSk7XG4gKiAvLyA9PiAzXG4gKlxuICogXy5nZXQob2JqZWN0LCAnYS5iLmMnLCAnZGVmYXVsdCcpO1xuICogLy8gPT4gJ2RlZmF1bHQnXG4gKi9cbmZ1bmN0aW9uIGdldChvYmplY3QsIHBhdGgsIGRlZmF1bHRWYWx1ZSkge1xuICB2YXIgcmVzdWx0ID0gb2JqZWN0ID09IG51bGwgPyB1bmRlZmluZWQgOiBiYXNlR2V0KG9iamVjdCwgcGF0aCk7XG4gIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IGRlZmF1bHRWYWx1ZSA6IHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIGlzIGEgZGlyZWN0IG9yIGluaGVyaXRlZCBwcm9wZXJ0eSBvZiBgb2JqZWN0YC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgT2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gcGF0aCBUaGUgcGF0aCB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgcGF0aGAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSBfLmNyZWF0ZSh7ICdhJzogXy5jcmVhdGUoeyAnYic6IDIgfSkgfSk7XG4gKlxuICogXy5oYXNJbihvYmplY3QsICdhJyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5oYXNJbihvYmplY3QsICdhLmInKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmhhc0luKG9iamVjdCwgWydhJywgJ2InXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5oYXNJbihvYmplY3QsICdiJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBoYXNJbihvYmplY3QsIHBhdGgpIHtcbiAgcmV0dXJuIG9iamVjdCAhPSBudWxsICYmIGhhc1BhdGgob2JqZWN0LCBwYXRoLCBiYXNlSGFzSW4pO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGBvYmplY3RgLlxuICpcbiAqICoqTm90ZToqKiBOb24tb2JqZWN0IHZhbHVlcyBhcmUgY29lcmNlZCB0byBvYmplY3RzLiBTZWUgdGhlXG4gKiBbRVMgc3BlY10oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LmtleXMpXG4gKiBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBzaW5jZSAwLjEuMFxuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGZ1bmN0aW9uIEZvbygpIHtcbiAqICAgdGhpcy5hID0gMTtcbiAqICAgdGhpcy5iID0gMjtcbiAqIH1cbiAqXG4gKiBGb28ucHJvdG90eXBlLmMgPSAzO1xuICpcbiAqIF8ua2V5cyhuZXcgRm9vKTtcbiAqIC8vID0+IFsnYScsICdiJ10gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAqXG4gKiBfLmtleXMoJ2hpJyk7XG4gKiAvLyA9PiBbJzAnLCAnMSddXG4gKi9cbmZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5TGlrZShvYmplY3QpID8gYXJyYXlMaWtlS2V5cyhvYmplY3QpIDogYmFzZUtleXMob2JqZWN0KTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBpdCByZWNlaXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHsqfSB2YWx1ZSBBbnkgdmFsdWUuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IDEgfTtcbiAqXG4gKiBjb25zb2xlLmxvZyhfLmlkZW50aXR5KG9iamVjdCkgPT09IG9iamVjdCk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSB2YWx1ZSBhdCBgcGF0aGAgb2YgYSBnaXZlbiBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAyLjQuMFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBhY2Nlc3NvciBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdHMgPSBbXG4gKiAgIHsgJ2EnOiB7ICdiJzogMiB9IH0sXG4gKiAgIHsgJ2EnOiB7ICdiJzogMSB9IH1cbiAqIF07XG4gKlxuICogXy5tYXAob2JqZWN0cywgXy5wcm9wZXJ0eSgnYS5iJykpO1xuICogLy8gPT4gWzIsIDFdXG4gKlxuICogXy5tYXAoXy5zb3J0Qnkob2JqZWN0cywgXy5wcm9wZXJ0eShbJ2EnLCAnYiddKSksICdhLmInKTtcbiAqIC8vID0+IFsxLCAyXVxuICovXG5mdW5jdGlvbiBwcm9wZXJ0eShwYXRoKSB7XG4gIHJldHVybiBpc0tleShwYXRoKSA/IGJhc2VQcm9wZXJ0eSh0b0tleShwYXRoKSkgOiBiYXNlUHJvcGVydHlEZWVwKHBhdGgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZpbHRlcjtcbiIsIi8qKlxuICogbG9kYXNoIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgalF1ZXJ5IEZvdW5kYXRpb24gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyA8aHR0cHM6Ly9qcXVlcnkub3JnLz5cbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqL1xuXG4vKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xudmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuLyoqIFVzZWQgdG8gc3RhbmQtaW4gZm9yIGB1bmRlZmluZWRgIGhhc2ggdmFsdWVzLiAqL1xudmFyIEhBU0hfVU5ERUZJTkVEID0gJ19fbG9kYXNoX2hhc2hfdW5kZWZpbmVkX18nO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBJTkZJTklUWSA9IDEgLyAwO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgZ2VuVGFnID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJyxcbiAgICBzeW1ib2xUYWcgPSAnW29iamVjdCBTeW1ib2xdJztcblxuLyoqIFVzZWQgdG8gbWF0Y2ggcHJvcGVydHkgbmFtZXMgd2l0aGluIHByb3BlcnR5IHBhdGhzLiAqL1xudmFyIHJlSXNEZWVwUHJvcCA9IC9cXC58XFxbKD86W15bXFxdXSp8KFtcIiddKSg/Oig/IVxcMSlbXlxcXFxdfFxcXFwuKSo/XFwxKVxcXS8sXG4gICAgcmVJc1BsYWluUHJvcCA9IC9eXFx3KiQvLFxuICAgIHJlTGVhZGluZ0RvdCA9IC9eXFwuLyxcbiAgICByZVByb3BOYW1lID0gL1teLltcXF1dK3xcXFsoPzooLT9cXGQrKD86XFwuXFxkKyk/KXwoW1wiJ10pKCg/Oig/IVxcMilbXlxcXFxdfFxcXFwuKSo/KVxcMilcXF18KD89KD86XFwufFxcW1xcXSkoPzpcXC58XFxbXFxdfCQpKS9nO1xuXG4vKipcbiAqIFVzZWQgdG8gbWF0Y2ggYFJlZ0V4cGBcbiAqIFtzeW50YXggY2hhcmFjdGVyc10oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtcGF0dGVybnMpLlxuICovXG52YXIgcmVSZWdFeHBDaGFyID0gL1tcXFxcXiQuKis/KClbXFxde318XS9nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBiYWNrc2xhc2hlcyBpbiBwcm9wZXJ0eSBwYXRocy4gKi9cbnZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGhvc3QgY29uc3RydWN0b3JzIChTYWZhcmkpLiAqL1xudmFyIHJlSXNIb3N0Q3RvciA9IC9eXFxbb2JqZWN0IC4rP0NvbnN0cnVjdG9yXFxdJC87XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG52YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5PYmplY3QgPT09IE9iamVjdCAmJiBnbG9iYWw7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZSBhdCBga2V5YCBvZiBgb2JqZWN0YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3RdIFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gZ2V0VmFsdWUob2JqZWN0LCBrZXkpIHtcbiAgcmV0dXJuIG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0W2tleV07XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBob3N0IG9iamVjdCBpbiBJRSA8IDkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBob3N0IG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0hvc3RPYmplY3QodmFsdWUpIHtcbiAgLy8gTWFueSBob3N0IG9iamVjdHMgYXJlIGBPYmplY3RgIG9iamVjdHMgdGhhdCBjYW4gY29lcmNlIHRvIHN0cmluZ3NcbiAgLy8gZGVzcGl0ZSBoYXZpbmcgaW1wcm9wZXJseSBkZWZpbmVkIGB0b1N0cmluZ2AgbWV0aG9kcy5cbiAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICBpZiAodmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUudG9TdHJpbmcgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSAhISh2YWx1ZSArICcnKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBVc2VkIGZvciBidWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBhcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLFxuICAgIGZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZSxcbiAgICBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvdmVycmVhY2hpbmcgY29yZS1qcyBzaGltcy4gKi9cbnZhciBjb3JlSnNEYXRhID0gcm9vdFsnX19jb3JlLWpzX3NoYXJlZF9fJ107XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBtZXRob2RzIG1hc3F1ZXJhZGluZyBhcyBuYXRpdmUuICovXG52YXIgbWFza1NyY0tleSA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHVpZCA9IC9bXi5dKyQvLmV4ZWMoY29yZUpzRGF0YSAmJiBjb3JlSnNEYXRhLmtleXMgJiYgY29yZUpzRGF0YS5rZXlzLklFX1BST1RPIHx8ICcnKTtcbiAgcmV0dXJuIHVpZCA/ICgnU3ltYm9sKHNyYylfMS4nICsgdWlkKSA6ICcnO1xufSgpKTtcblxuLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgZGVjb21waWxlZCBzb3VyY2Ugb2YgZnVuY3Rpb25zLiAqL1xudmFyIGZ1bmNUb1N0cmluZyA9IGZ1bmNQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBpZiBhIG1ldGhvZCBpcyBuYXRpdmUuICovXG52YXIgcmVJc05hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICBmdW5jVG9TdHJpbmcuY2FsbChoYXNPd25Qcm9wZXJ0eSkucmVwbGFjZShyZVJlZ0V4cENoYXIsICdcXFxcJCYnKVxuICAucmVwbGFjZSgvaGFzT3duUHJvcGVydHl8KGZ1bmN0aW9uKS4qPyg/PVxcXFxcXCgpfCBmb3IgLis/KD89XFxcXFxcXSkvZywgJyQxLio/JykgKyAnJCdcbik7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIFN5bWJvbCA9IHJvb3QuU3ltYm9sLFxuICAgIHNwbGljZSA9IGFycmF5UHJvdG8uc3BsaWNlO1xuXG4vKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB0aGF0IGFyZSB2ZXJpZmllZCB0byBiZSBuYXRpdmUuICovXG52YXIgTWFwID0gZ2V0TmF0aXZlKHJvb3QsICdNYXAnKSxcbiAgICBuYXRpdmVDcmVhdGUgPSBnZXROYXRpdmUoT2JqZWN0LCAnY3JlYXRlJyk7XG5cbi8qKiBVc2VkIHRvIGNvbnZlcnQgc3ltYm9scyB0byBwcmltaXRpdmVzIGFuZCBzdHJpbmdzLiAqL1xudmFyIHN5bWJvbFByb3RvID0gU3ltYm9sID8gU3ltYm9sLnByb3RvdHlwZSA6IHVuZGVmaW5lZCxcbiAgICBzeW1ib2xUb1N0cmluZyA9IHN5bWJvbFByb3RvID8gc3ltYm9sUHJvdG8udG9TdHJpbmcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGhhc2ggb2JqZWN0LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7QXJyYXl9IFtlbnRyaWVzXSBUaGUga2V5LXZhbHVlIHBhaXJzIHRvIGNhY2hlLlxuICovXG5mdW5jdGlvbiBIYXNoKGVudHJpZXMpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBlbnRyaWVzID8gZW50cmllcy5sZW5ndGggOiAwO1xuXG4gIHRoaXMuY2xlYXIoKTtcbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB2YXIgZW50cnkgPSBlbnRyaWVzW2luZGV4XTtcbiAgICB0aGlzLnNldChlbnRyeVswXSwgZW50cnlbMV0pO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwga2V5LXZhbHVlIGVudHJpZXMgZnJvbSB0aGUgaGFzaC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgY2xlYXJcbiAqIEBtZW1iZXJPZiBIYXNoXG4gKi9cbmZ1bmN0aW9uIGhhc2hDbGVhcigpIHtcbiAgdGhpcy5fX2RhdGFfXyA9IG5hdGl2ZUNyZWF0ZSA/IG5hdGl2ZUNyZWF0ZShudWxsKSA6IHt9O1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYGtleWAgYW5kIGl0cyB2YWx1ZSBmcm9tIHRoZSBoYXNoLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBkZWxldGVcbiAqIEBtZW1iZXJPZiBIYXNoXG4gKiBAcGFyYW0ge09iamVjdH0gaGFzaCBUaGUgaGFzaCB0byBtb2RpZnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgZW50cnkgd2FzIHJlbW92ZWQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaGFzaERlbGV0ZShrZXkpIHtcbiAgcmV0dXJuIHRoaXMuaGFzKGtleSkgJiYgZGVsZXRlIHRoaXMuX19kYXRhX19ba2V5XTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBoYXNoIHZhbHVlIGZvciBga2V5YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZ2V0XG4gKiBAbWVtYmVyT2YgSGFzaFxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZW50cnkgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGhhc2hHZXQoa2V5KSB7XG4gIHZhciBkYXRhID0gdGhpcy5fX2RhdGFfXztcbiAgaWYgKG5hdGl2ZUNyZWF0ZSkge1xuICAgIHZhciByZXN1bHQgPSBkYXRhW2tleV07XG4gICAgcmV0dXJuIHJlc3VsdCA9PT0gSEFTSF9VTkRFRklORUQgPyB1bmRlZmluZWQgOiByZXN1bHQ7XG4gIH1cbiAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwoZGF0YSwga2V5KSA/IGRhdGFba2V5XSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBoYXNoIHZhbHVlIGZvciBga2V5YCBleGlzdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhc1xuICogQG1lbWJlck9mIEhhc2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgZW50cnkgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW4gZW50cnkgZm9yIGBrZXlgIGV4aXN0cywgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBoYXNoSGFzKGtleSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX187XG4gIHJldHVybiBuYXRpdmVDcmVhdGUgPyBkYXRhW2tleV0gIT09IHVuZGVmaW5lZCA6IGhhc093blByb3BlcnR5LmNhbGwoZGF0YSwga2V5KTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBoYXNoIGBrZXlgIHRvIGB2YWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIHNldFxuICogQG1lbWJlck9mIEhhc2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gc2V0LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0LlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgaGFzaCBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gaGFzaFNldChrZXksIHZhbHVlKSB7XG4gIHZhciBkYXRhID0gdGhpcy5fX2RhdGFfXztcbiAgZGF0YVtrZXldID0gKG5hdGl2ZUNyZWF0ZSAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSA/IEhBU0hfVU5ERUZJTkVEIDogdmFsdWU7XG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBBZGQgbWV0aG9kcyB0byBgSGFzaGAuXG5IYXNoLnByb3RvdHlwZS5jbGVhciA9IGhhc2hDbGVhcjtcbkhhc2gucHJvdG90eXBlWydkZWxldGUnXSA9IGhhc2hEZWxldGU7XG5IYXNoLnByb3RvdHlwZS5nZXQgPSBoYXNoR2V0O1xuSGFzaC5wcm90b3R5cGUuaGFzID0gaGFzaEhhcztcbkhhc2gucHJvdG90eXBlLnNldCA9IGhhc2hTZXQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBsaXN0IGNhY2hlIG9iamVjdC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBbZW50cmllc10gVGhlIGtleS12YWx1ZSBwYWlycyB0byBjYWNoZS5cbiAqL1xuZnVuY3Rpb24gTGlzdENhY2hlKGVudHJpZXMpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBlbnRyaWVzID8gZW50cmllcy5sZW5ndGggOiAwO1xuXG4gIHRoaXMuY2xlYXIoKTtcbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICB2YXIgZW50cnkgPSBlbnRyaWVzW2luZGV4XTtcbiAgICB0aGlzLnNldChlbnRyeVswXSwgZW50cnlbMV0pO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwga2V5LXZhbHVlIGVudHJpZXMgZnJvbSB0aGUgbGlzdCBjYWNoZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgY2xlYXJcbiAqIEBtZW1iZXJPZiBMaXN0Q2FjaGVcbiAqL1xuZnVuY3Rpb24gbGlzdENhY2hlQ2xlYXIoKSB7XG4gIHRoaXMuX19kYXRhX18gPSBbXTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGBrZXlgIGFuZCBpdHMgdmFsdWUgZnJvbSB0aGUgbGlzdCBjYWNoZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZGVsZXRlXG4gKiBAbWVtYmVyT2YgTGlzdENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgZW50cnkgd2FzIHJlbW92ZWQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gbGlzdENhY2hlRGVsZXRlKGtleSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX18sXG4gICAgICBpbmRleCA9IGFzc29jSW5kZXhPZihkYXRhLCBrZXkpO1xuXG4gIGlmIChpbmRleCA8IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGxhc3RJbmRleCA9IGRhdGEubGVuZ3RoIC0gMTtcbiAgaWYgKGluZGV4ID09IGxhc3RJbmRleCkge1xuICAgIGRhdGEucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgc3BsaWNlLmNhbGwoZGF0YSwgaW5kZXgsIDEpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGxpc3QgY2FjaGUgdmFsdWUgZm9yIGBrZXlgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBnZXRcbiAqIEBtZW1iZXJPZiBMaXN0Q2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGVudHJ5IHZhbHVlLlxuICovXG5mdW5jdGlvbiBsaXN0Q2FjaGVHZXQoa2V5KSB7XG4gIHZhciBkYXRhID0gdGhpcy5fX2RhdGFfXyxcbiAgICAgIGluZGV4ID0gYXNzb2NJbmRleE9mKGRhdGEsIGtleSk7XG5cbiAgcmV0dXJuIGluZGV4IDwgMCA/IHVuZGVmaW5lZCA6IGRhdGFbaW5kZXhdWzFdO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIGxpc3QgY2FjaGUgdmFsdWUgZm9yIGBrZXlgIGV4aXN0cy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgaGFzXG4gKiBAbWVtYmVyT2YgTGlzdENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGVudHJ5IHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGFuIGVudHJ5IGZvciBga2V5YCBleGlzdHMsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gbGlzdENhY2hlSGFzKGtleSkge1xuICByZXR1cm4gYXNzb2NJbmRleE9mKHRoaXMuX19kYXRhX18sIGtleSkgPiAtMTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBsaXN0IGNhY2hlIGBrZXlgIHRvIGB2YWx1ZWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIHNldFxuICogQG1lbWJlck9mIExpc3RDYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBzZXQuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZXQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBsaXN0IGNhY2hlIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBsaXN0Q2FjaGVTZXQoa2V5LCB2YWx1ZSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX19kYXRhX18sXG4gICAgICBpbmRleCA9IGFzc29jSW5kZXhPZihkYXRhLCBrZXkpO1xuXG4gIGlmIChpbmRleCA8IDApIHtcbiAgICBkYXRhLnB1c2goW2tleSwgdmFsdWVdKTtcbiAgfSBlbHNlIHtcbiAgICBkYXRhW2luZGV4XVsxXSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBBZGQgbWV0aG9kcyB0byBgTGlzdENhY2hlYC5cbkxpc3RDYWNoZS5wcm90b3R5cGUuY2xlYXIgPSBsaXN0Q2FjaGVDbGVhcjtcbkxpc3RDYWNoZS5wcm90b3R5cGVbJ2RlbGV0ZSddID0gbGlzdENhY2hlRGVsZXRlO1xuTGlzdENhY2hlLnByb3RvdHlwZS5nZXQgPSBsaXN0Q2FjaGVHZXQ7XG5MaXN0Q2FjaGUucHJvdG90eXBlLmhhcyA9IGxpc3RDYWNoZUhhcztcbkxpc3RDYWNoZS5wcm90b3R5cGUuc2V0ID0gbGlzdENhY2hlU2V0O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBtYXAgY2FjaGUgb2JqZWN0IHRvIHN0b3JlIGtleS12YWx1ZSBwYWlycy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBbZW50cmllc10gVGhlIGtleS12YWx1ZSBwYWlycyB0byBjYWNoZS5cbiAqL1xuZnVuY3Rpb24gTWFwQ2FjaGUoZW50cmllcykge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGVudHJpZXMgPyBlbnRyaWVzLmxlbmd0aCA6IDA7XG5cbiAgdGhpcy5jbGVhcigpO1xuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHZhciBlbnRyeSA9IGVudHJpZXNbaW5kZXhdO1xuICAgIHRoaXMuc2V0KGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBrZXktdmFsdWUgZW50cmllcyBmcm9tIHRoZSBtYXAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGNsZWFyXG4gKiBAbWVtYmVyT2YgTWFwQ2FjaGVcbiAqL1xuZnVuY3Rpb24gbWFwQ2FjaGVDbGVhcigpIHtcbiAgdGhpcy5fX2RhdGFfXyA9IHtcbiAgICAnaGFzaCc6IG5ldyBIYXNoLFxuICAgICdtYXAnOiBuZXcgKE1hcCB8fCBMaXN0Q2FjaGUpLFxuICAgICdzdHJpbmcnOiBuZXcgSGFzaFxuICB9O1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYGtleWAgYW5kIGl0cyB2YWx1ZSBmcm9tIHRoZSBtYXAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGRlbGV0ZVxuICogQG1lbWJlck9mIE1hcENhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgZW50cnkgd2FzIHJlbW92ZWQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gbWFwQ2FjaGVEZWxldGUoa2V5KSB7XG4gIHJldHVybiBnZXRNYXBEYXRhKHRoaXMsIGtleSlbJ2RlbGV0ZSddKGtleSk7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgbWFwIHZhbHVlIGZvciBga2V5YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZ2V0XG4gKiBAbWVtYmVyT2YgTWFwQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGVudHJ5IHZhbHVlLlxuICovXG5mdW5jdGlvbiBtYXBDYWNoZUdldChrZXkpIHtcbiAgcmV0dXJuIGdldE1hcERhdGEodGhpcywga2V5KS5nZXQoa2V5KTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBtYXAgdmFsdWUgZm9yIGBrZXlgIGV4aXN0cy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgaGFzXG4gKiBAbWVtYmVyT2YgTWFwQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgZW50cnkgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW4gZW50cnkgZm9yIGBrZXlgIGV4aXN0cywgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBtYXBDYWNoZUhhcyhrZXkpIHtcbiAgcmV0dXJuIGdldE1hcERhdGEodGhpcywga2V5KS5oYXMoa2V5KTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBtYXAgYGtleWAgdG8gYHZhbHVlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgc2V0XG4gKiBAbWVtYmVyT2YgTWFwQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gc2V0LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0LlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbWFwIGNhY2hlIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBtYXBDYWNoZVNldChrZXksIHZhbHVlKSB7XG4gIGdldE1hcERhdGEodGhpcywga2V5KS5zZXQoa2V5LCB2YWx1ZSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBBZGQgbWV0aG9kcyB0byBgTWFwQ2FjaGVgLlxuTWFwQ2FjaGUucHJvdG90eXBlLmNsZWFyID0gbWFwQ2FjaGVDbGVhcjtcbk1hcENhY2hlLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBtYXBDYWNoZURlbGV0ZTtcbk1hcENhY2hlLnByb3RvdHlwZS5nZXQgPSBtYXBDYWNoZUdldDtcbk1hcENhY2hlLnByb3RvdHlwZS5oYXMgPSBtYXBDYWNoZUhhcztcbk1hcENhY2hlLnByb3RvdHlwZS5zZXQgPSBtYXBDYWNoZVNldDtcblxuLyoqXG4gKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgYGtleWAgaXMgZm91bmQgaW4gYGFycmF5YCBvZiBrZXktdmFsdWUgcGFpcnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICogQHBhcmFtIHsqfSBrZXkgVGhlIGtleSB0byBzZWFyY2ggZm9yLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUsIGVsc2UgYC0xYC5cbiAqL1xuZnVuY3Rpb24gYXNzb2NJbmRleE9mKGFycmF5LCBrZXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgaWYgKGVxKGFycmF5W2xlbmd0aF1bMF0sIGtleSkpIHtcbiAgICAgIHJldHVybiBsZW5ndGg7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5nZXRgIHdpdGhvdXQgc3VwcG9ydCBmb3IgZGVmYXVsdCB2YWx1ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgcmVzb2x2ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGJhc2VHZXQob2JqZWN0LCBwYXRoKSB7XG4gIHBhdGggPSBpc0tleShwYXRoLCBvYmplY3QpID8gW3BhdGhdIDogY2FzdFBhdGgocGF0aCk7XG5cbiAgdmFyIGluZGV4ID0gMCxcbiAgICAgIGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuXG4gIHdoaWxlIChvYmplY3QgIT0gbnVsbCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgIG9iamVjdCA9IG9iamVjdFt0b0tleShwYXRoW2luZGV4KytdKV07XG4gIH1cbiAgcmV0dXJuIChpbmRleCAmJiBpbmRleCA9PSBsZW5ndGgpID8gb2JqZWN0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmlzTmF0aXZlYCB3aXRob3V0IGJhZCBzaGltIGNoZWNrcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbixcbiAqICBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VJc05hdGl2ZSh2YWx1ZSkge1xuICBpZiAoIWlzT2JqZWN0KHZhbHVlKSB8fCBpc01hc2tlZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIHBhdHRlcm4gPSAoaXNGdW5jdGlvbih2YWx1ZSkgfHwgaXNIb3N0T2JqZWN0KHZhbHVlKSkgPyByZUlzTmF0aXZlIDogcmVJc0hvc3RDdG9yO1xuICByZXR1cm4gcGF0dGVybi50ZXN0KHRvU291cmNlKHZhbHVlKSk7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8udG9TdHJpbmdgIHdoaWNoIGRvZXNuJ3QgY29udmVydCBudWxsaXNoXG4gKiB2YWx1ZXMgdG8gZW1wdHkgc3RyaW5ncy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIC8vIEV4aXQgZWFybHkgZm9yIHN0cmluZ3MgdG8gYXZvaWQgYSBwZXJmb3JtYW5jZSBoaXQgaW4gc29tZSBlbnZpcm9ubWVudHMuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBzeW1ib2xUb1N0cmluZyA/IHN5bWJvbFRvU3RyaW5nLmNhbGwodmFsdWUpIDogJyc7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICh2YWx1ZSArICcnKTtcbiAgcmV0dXJuIChyZXN1bHQgPT0gJzAnICYmICgxIC8gdmFsdWUpID09IC1JTkZJTklUWSkgPyAnLTAnIDogcmVzdWx0O1xufVxuXG4vKipcbiAqIENhc3RzIGB2YWx1ZWAgdG8gYSBwYXRoIGFycmF5IGlmIGl0J3Mgbm90IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgY2FzdCBwcm9wZXJ0eSBwYXRoIGFycmF5LlxuICovXG5mdW5jdGlvbiBjYXN0UGF0aCh2YWx1ZSkge1xuICByZXR1cm4gaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IHN0cmluZ1RvUGF0aCh2YWx1ZSk7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgZGF0YSBmb3IgYG1hcGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBtYXAgVGhlIG1hcCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIHJlZmVyZW5jZSBrZXkuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgbWFwIGRhdGEuXG4gKi9cbmZ1bmN0aW9uIGdldE1hcERhdGEobWFwLCBrZXkpIHtcbiAgdmFyIGRhdGEgPSBtYXAuX19kYXRhX187XG4gIHJldHVybiBpc0tleWFibGUoa2V5KVxuICAgID8gZGF0YVt0eXBlb2Yga2V5ID09ICdzdHJpbmcnID8gJ3N0cmluZycgOiAnaGFzaCddXG4gICAgOiBkYXRhLm1hcDtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBuYXRpdmUgZnVuY3Rpb24gYXQgYGtleWAgb2YgYG9iamVjdGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgbWV0aG9kIHRvIGdldC5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBmdW5jdGlvbiBpZiBpdCdzIG5hdGl2ZSwgZWxzZSBgdW5kZWZpbmVkYC5cbiAqL1xuZnVuY3Rpb24gZ2V0TmF0aXZlKG9iamVjdCwga2V5KSB7XG4gIHZhciB2YWx1ZSA9IGdldFZhbHVlKG9iamVjdCwga2V5KTtcbiAgcmV0dXJuIGJhc2VJc05hdGl2ZSh2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHByb3BlcnR5IG5hbWUgYW5kIG5vdCBhIHByb3BlcnR5IHBhdGguXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3RdIFRoZSBvYmplY3QgdG8gcXVlcnkga2V5cyBvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgcHJvcGVydHkgbmFtZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0tleSh2YWx1ZSwgb2JqZWN0KSB7XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgaWYgKHR5cGUgPT0gJ251bWJlcicgfHwgdHlwZSA9PSAnc3ltYm9sJyB8fCB0eXBlID09ICdib29sZWFuJyB8fFxuICAgICAgdmFsdWUgPT0gbnVsbCB8fCBpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gcmVJc1BsYWluUHJvcC50ZXN0KHZhbHVlKSB8fCAhcmVJc0RlZXBQcm9wLnRlc3QodmFsdWUpIHx8XG4gICAgKG9iamVjdCAhPSBudWxsICYmIHZhbHVlIGluIE9iamVjdChvYmplY3QpKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBzdWl0YWJsZSBmb3IgdXNlIGFzIHVuaXF1ZSBvYmplY3Qga2V5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIHN1aXRhYmxlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzS2V5YWJsZSh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICh0eXBlID09ICdzdHJpbmcnIHx8IHR5cGUgPT0gJ251bWJlcicgfHwgdHlwZSA9PSAnc3ltYm9sJyB8fCB0eXBlID09ICdib29sZWFuJylcbiAgICA/ICh2YWx1ZSAhPT0gJ19fcHJvdG9fXycpXG4gICAgOiAodmFsdWUgPT09IG51bGwpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgZnVuY2AgaGFzIGl0cyBzb3VyY2UgbWFza2VkLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgZnVuY2AgaXMgbWFza2VkLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTWFza2VkKGZ1bmMpIHtcbiAgcmV0dXJuICEhbWFza1NyY0tleSAmJiAobWFza1NyY0tleSBpbiBmdW5jKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgc3RyaW5nYCB0byBhIHByb3BlcnR5IHBhdGggYXJyYXkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjb252ZXJ0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBwcm9wZXJ0eSBwYXRoIGFycmF5LlxuICovXG52YXIgc3RyaW5nVG9QYXRoID0gbWVtb2l6ZShmdW5jdGlvbihzdHJpbmcpIHtcbiAgc3RyaW5nID0gdG9TdHJpbmcoc3RyaW5nKTtcblxuICB2YXIgcmVzdWx0ID0gW107XG4gIGlmIChyZUxlYWRpbmdEb3QudGVzdChzdHJpbmcpKSB7XG4gICAgcmVzdWx0LnB1c2goJycpO1xuICB9XG4gIHN0cmluZy5yZXBsYWNlKHJlUHJvcE5hbWUsIGZ1bmN0aW9uKG1hdGNoLCBudW1iZXIsIHF1b3RlLCBzdHJpbmcpIHtcbiAgICByZXN1bHQucHVzaChxdW90ZSA/IHN0cmluZy5yZXBsYWNlKHJlRXNjYXBlQ2hhciwgJyQxJykgOiAobnVtYmVyIHx8IG1hdGNoKSk7XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufSk7XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBrZXkgaWYgaXQncyBub3QgYSBzdHJpbmcgb3Igc3ltYm9sLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBpbnNwZWN0LlxuICogQHJldHVybnMge3N0cmluZ3xzeW1ib2x9IFJldHVybnMgdGhlIGtleS5cbiAqL1xuZnVuY3Rpb24gdG9LZXkodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJyB8fCBpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICh2YWx1ZSArICcnKTtcbiAgcmV0dXJuIChyZXN1bHQgPT0gJzAnICYmICgxIC8gdmFsdWUpID09IC1JTkZJTklUWSkgPyAnLTAnIDogcmVzdWx0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGBmdW5jYCB0byBpdHMgc291cmNlIGNvZGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBzb3VyY2UgY29kZS5cbiAqL1xuZnVuY3Rpb24gdG9Tb3VyY2UoZnVuYykge1xuICBpZiAoZnVuYyAhPSBudWxsKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmdW5jVG9TdHJpbmcuY2FsbChmdW5jKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gKGZ1bmMgKyAnJyk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxuICByZXR1cm4gJyc7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgbWVtb2l6ZXMgdGhlIHJlc3VsdCBvZiBgZnVuY2AuIElmIGByZXNvbHZlcmAgaXNcbiAqIHByb3ZpZGVkLCBpdCBkZXRlcm1pbmVzIHRoZSBjYWNoZSBrZXkgZm9yIHN0b3JpbmcgdGhlIHJlc3VsdCBiYXNlZCBvbiB0aGVcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCB0byB0aGUgbWVtb2l6ZWQgZnVuY3Rpb24uIEJ5IGRlZmF1bHQsIHRoZSBmaXJzdCBhcmd1bWVudFxuICogcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uIGlzIHVzZWQgYXMgdGhlIG1hcCBjYWNoZSBrZXkuIFRoZSBgZnVuY2BcbiAqIGlzIGludm9rZWQgd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIG1lbW9pemVkIGZ1bmN0aW9uLlxuICpcbiAqICoqTm90ZToqKiBUaGUgY2FjaGUgaXMgZXhwb3NlZCBhcyB0aGUgYGNhY2hlYCBwcm9wZXJ0eSBvbiB0aGUgbWVtb2l6ZWRcbiAqIGZ1bmN0aW9uLiBJdHMgY3JlYXRpb24gbWF5IGJlIGN1c3RvbWl6ZWQgYnkgcmVwbGFjaW5nIHRoZSBgXy5tZW1vaXplLkNhY2hlYFxuICogY29uc3RydWN0b3Igd2l0aCBvbmUgd2hvc2UgaW5zdGFuY2VzIGltcGxlbWVudCB0aGVcbiAqIFtgTWFwYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtcHJvcGVydGllcy1vZi10aGUtbWFwLXByb3RvdHlwZS1vYmplY3QpXG4gKiBtZXRob2QgaW50ZXJmYWNlIG9mIGBkZWxldGVgLCBgZ2V0YCwgYGhhc2AsIGFuZCBgc2V0YC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIG91dHB1dCBtZW1vaXplZC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZXNvbHZlcl0gVGhlIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGhlIGNhY2hlIGtleS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IG1lbW9pemVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IDEsICdiJzogMiB9O1xuICogdmFyIG90aGVyID0geyAnYyc6IDMsICdkJzogNCB9O1xuICpcbiAqIHZhciB2YWx1ZXMgPSBfLm1lbW9pemUoXy52YWx1ZXMpO1xuICogdmFsdWVzKG9iamVjdCk7XG4gKiAvLyA9PiBbMSwgMl1cbiAqXG4gKiB2YWx1ZXMob3RoZXIpO1xuICogLy8gPT4gWzMsIDRdXG4gKlxuICogb2JqZWN0LmEgPSAyO1xuICogdmFsdWVzKG9iamVjdCk7XG4gKiAvLyA9PiBbMSwgMl1cbiAqXG4gKiAvLyBNb2RpZnkgdGhlIHJlc3VsdCBjYWNoZS5cbiAqIHZhbHVlcy5jYWNoZS5zZXQob2JqZWN0LCBbJ2EnLCAnYiddKTtcbiAqIHZhbHVlcyhvYmplY3QpO1xuICogLy8gPT4gWydhJywgJ2InXVxuICpcbiAqIC8vIFJlcGxhY2UgYF8ubWVtb2l6ZS5DYWNoZWAuXG4gKiBfLm1lbW9pemUuQ2FjaGUgPSBXZWFrTWFwO1xuICovXG5mdW5jdGlvbiBtZW1vaXplKGZ1bmMsIHJlc29sdmVyKSB7XG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nIHx8IChyZXNvbHZlciAmJiB0eXBlb2YgcmVzb2x2ZXIgIT0gJ2Z1bmN0aW9uJykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XG4gIH1cbiAgdmFyIG1lbW9pemVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgIGtleSA9IHJlc29sdmVyID8gcmVzb2x2ZXIuYXBwbHkodGhpcywgYXJncykgOiBhcmdzWzBdLFxuICAgICAgICBjYWNoZSA9IG1lbW9pemVkLmNhY2hlO1xuXG4gICAgaWYgKGNhY2hlLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gY2FjaGUuZ2V0KGtleSk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIG1lbW9pemVkLmNhY2hlID0gY2FjaGUuc2V0KGtleSwgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICBtZW1vaXplZC5jYWNoZSA9IG5ldyAobWVtb2l6ZS5DYWNoZSB8fCBNYXBDYWNoZSk7XG4gIHJldHVybiBtZW1vaXplZDtcbn1cblxuLy8gQXNzaWduIGNhY2hlIHRvIGBfLm1lbW9pemVgLlxubWVtb2l6ZS5DYWNoZSA9IE1hcENhY2hlO1xuXG4vKipcbiAqIFBlcmZvcm1zIGFcbiAqIFtgU2FtZVZhbHVlWmVyb2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLXNhbWV2YWx1ZXplcm8pXG4gKiBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSB7Kn0gb3RoZXIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IDEgfTtcbiAqIHZhciBvdGhlciA9IHsgJ2EnOiAxIH07XG4gKlxuICogXy5lcShvYmplY3QsIG9iamVjdCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5lcShvYmplY3QsIG90aGVyKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5lcSgnYScsICdhJyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5lcSgnYScsIE9iamVjdCgnYScpKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5lcShOYU4sIE5hTik7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGVxKHZhbHVlLCBvdGhlcikge1xuICByZXR1cm4gdmFsdWUgPT09IG90aGVyIHx8ICh2YWx1ZSAhPT0gdmFsdWUgJiYgb3RoZXIgIT09IG90aGVyKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGFuIGBBcnJheWAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIGFycmF5LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheShkb2N1bWVudC5ib2R5LmNoaWxkcmVuKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0FycmF5KCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0FycmF5KF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNGdW5jdGlvbigvYWJjLyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIFRoZSB1c2Ugb2YgYE9iamVjdCN0b1N0cmluZ2AgYXZvaWRzIGlzc3VlcyB3aXRoIHRoZSBgdHlwZW9mYCBvcGVyYXRvclxuICAvLyBpbiBTYWZhcmkgOC05IHdoaWNoIHJldHVybnMgJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGFuZCBvdGhlciBjb25zdHJ1Y3RvcnMuXG4gIHZhciB0YWcgPSBpc09iamVjdCh2YWx1ZSkgPyBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA6ICcnO1xuICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGVcbiAqIFtsYW5ndWFnZSB0eXBlXShodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtZWNtYXNjcmlwdC1sYW5ndWFnZS10eXBlcylcbiAqIG9mIGBPYmplY3RgLiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoXy5ub29wKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuIEEgdmFsdWUgaXMgb2JqZWN0LWxpa2UgaWYgaXQncyBub3QgYG51bGxgXG4gKiBhbmQgaGFzIGEgYHR5cGVvZmAgcmVzdWx0IG9mIFwib2JqZWN0XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdExpa2Uoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc09iamVjdExpa2UobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgc3ltYm9sLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTeW1ib2woU3ltYm9sLml0ZXJhdG9yKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzU3ltYm9sKCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N5bWJvbCcgfHxcbiAgICAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBzeW1ib2xUYWcpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZCBmb3IgYG51bGxgXG4gKiBhbmQgYHVuZGVmaW5lZGAgdmFsdWVzLiBUaGUgc2lnbiBvZiBgLTBgIGlzIHByZXNlcnZlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50b1N0cmluZyhudWxsKTtcbiAqIC8vID0+ICcnXG4gKlxuICogXy50b1N0cmluZygtMCk7XG4gKiAvLyA9PiAnLTAnXG4gKlxuICogXy50b1N0cmluZyhbMSwgMiwgM10pO1xuICogLy8gPT4gJzEsMiwzJ1xuICovXG5mdW5jdGlvbiB0b1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/ICcnIDogYmFzZVRvU3RyaW5nKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZSBhdCBgcGF0aGAgb2YgYG9iamVjdGAuIElmIHRoZSByZXNvbHZlZCB2YWx1ZSBpc1xuICogYHVuZGVmaW5lZGAsIHRoZSBgZGVmYXVsdFZhbHVlYCBpcyByZXR1cm5lZCBpbiBpdHMgcGxhY2UuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAzLjcuMFxuICogQGNhdGVnb3J5IE9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAqIEBwYXJhbSB7Kn0gW2RlZmF1bHRWYWx1ZV0gVGhlIHZhbHVlIHJldHVybmVkIGZvciBgdW5kZWZpbmVkYCByZXNvbHZlZCB2YWx1ZXMuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgcmVzb2x2ZWQgdmFsdWUuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICdhJzogW3sgJ2InOiB7ICdjJzogMyB9IH1dIH07XG4gKlxuICogXy5nZXQob2JqZWN0LCAnYVswXS5iLmMnKTtcbiAqIC8vID0+IDNcbiAqXG4gKiBfLmdldChvYmplY3QsIFsnYScsICcwJywgJ2InLCAnYyddKTtcbiAqIC8vID0+IDNcbiAqXG4gKiBfLmdldChvYmplY3QsICdhLmIuYycsICdkZWZhdWx0Jyk7XG4gKiAvLyA9PiAnZGVmYXVsdCdcbiAqL1xuZnVuY3Rpb24gZ2V0KG9iamVjdCwgcGF0aCwgZGVmYXVsdFZhbHVlKSB7XG4gIHZhciByZXN1bHQgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IGJhc2VHZXQob2JqZWN0LCBwYXRoKTtcbiAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkID8gZGVmYXVsdFZhbHVlIDogcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICAvKmpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdhZGRyZXNzJywge1xuICAgICAgICB0aXRsZTogJ0FkZHJlc3MnLFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgPyAnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy1tdWx0aXBsZS5odG1sJyA6ICdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnO1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckaHR0cCcsIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHApIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICAkc2NvcGUuYWRkcmVzcyA9IHt9O1xuICAgICAgICAgICRzY29wZS5hZGRyZXNzZXMgPSBbXTtcbiAgICAgICAgICAkc2NvcGUucmVmcmVzaEFkZHJlc3MgPSBmdW5jdGlvbihhZGRyZXNzKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgICAgICAgICAgICBzZW5zb3I6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKCFhZGRyZXNzKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50Lm1hcCAmJiAkc2NvcGUuY29tcG9uZW50Lm1hcC5yZWdpb24pIHtcbiAgICAgICAgICAgICAgcGFyYW1zLnJlZ2lvbiA9ICRzY29wZS5jb21wb25lbnQubWFwLnJlZ2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50Lm1hcCAmJiAkc2NvcGUuY29tcG9uZW50Lm1hcC5rZXkpIHtcbiAgICAgICAgICAgICAgcGFyYW1zLmtleSA9ICRzY29wZS5jb21wb25lbnQubWFwLmtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoXG4gICAgICAgICAgICAgICdodHRwczovL21hcHMuZ29vZ2xlYXBpcy5jb20vbWFwcy9hcGkvZ2VvY29kZS9qc29uJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGRpc2FibGVKV1Q6IHRydWUsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgUHJhZ21hOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICRzY29wZS5hZGRyZXNzZXMgPSByZXNwb25zZS5kYXRhLnJlc3VsdHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XSxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyBkYXRhLmZvcm1hdHRlZF9hZGRyZXNzIDogJyc7XG4gICAgICAgIH0sXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnYWRkcmVzc0ZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIG1hcDoge1xuICAgICAgICAgICAgcmVnaW9uOiAnJyxcbiAgICAgICAgICAgIGtleTogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy5odG1sJyxcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBpc1JlcXVpcmVkKGNvbXBvbmVudCl9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9sYWJlbD5cXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuPHVpLXNlbGVjdCBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgc2FmZS1tdWx0aXBsZS10by1zaW5nbGUgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIiBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIiBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiPlxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fVxcXCI+e3skaXRlbS5mb3JtYXR0ZWRfYWRkcmVzcyB8fCAkc2VsZWN0LnNlbGVjdGVkLmZvcm1hdHRlZF9hZGRyZXNzfX08L3VpLXNlbGVjdC1tYXRjaD5cXG4gIDx1aS1zZWxlY3QtY2hvaWNlcyBjbGFzcz1cXFwidWktc2VsZWN0LWNob2ljZXNcXFwiIHJlcGVhdD1cXFwiYWRkcmVzcyBpbiBhZGRyZXNzZXNcXFwiIHJlZnJlc2g9XFxcInJlZnJlc2hBZGRyZXNzKCRzZWxlY3Quc2VhcmNoKVxcXCIgcmVmcmVzaC1kZWxheT1cXFwiNTAwXFxcIj5cXG4gICAgPGRpdiBuZy1iaW5kLWh0bWw9XFxcImFkZHJlc3MuZm9ybWF0dGVkX2FkZHJlc3MgfCBoaWdobGlnaHQ6ICRzZWxlY3Quc2VhcmNoXFxcIj48L2Rpdj5cXG4gIDwvdWktc2VsZWN0LWNob2ljZXM+XFxuPC91aS1zZWxlY3Q+XFxuPGZvcm1pby1lcnJvcnMgbmctaWY9XFxcIjo6IWJ1aWxkZXJcXFwiPjwvZm9ybWlvLWVycm9ycz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLy8gQ2hhbmdlIHRoZSB1aS1zZWxlY3QgdG8gdWktc2VsZWN0IG11bHRpcGxlLlxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLW11bHRpcGxlLmh0bWwnLFxuICAgICAgICAkdGVtcGxhdGVDYWNoZS5nZXQoJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MuaHRtbCcpLnJlcGxhY2UoJzx1aS1zZWxlY3QnLCAnPHVpLXNlbGVjdCBtdWx0aXBsZScpXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdidXR0b24nLCB7XG4gICAgICAgIHRpdGxlOiAnQnV0dG9uJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9idXR0b24uaHRtbCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICdTdWJtaXQnLFxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXG4gICAgICAgICAga2V5OiAnc3VibWl0JyxcbiAgICAgICAgICBzaXplOiAnbWQnLFxuICAgICAgICAgIGxlZnRJY29uOiAnJyxcbiAgICAgICAgICByaWdodEljb246ICcnLFxuICAgICAgICAgIGJsb2NrOiBmYWxzZSxcbiAgICAgICAgICBhY3Rpb246ICdzdWJtaXQnLFxuICAgICAgICAgIGRpc2FibGVPbkludmFsaWQ6IGZhbHNlLFxuICAgICAgICAgIHRoZW1lOiAncHJpbWFyeSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICB2YXIgc2V0dGluZ3MgPSAkc2NvcGUuY29tcG9uZW50O1xuICAgICAgICAgICRzY29wZS5nZXRCdXR0b25UeXBlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHNldHRpbmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnc3VibWl0JztcbiAgICAgICAgICAgICAgY2FzZSAncmVzZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAncmVzZXQnO1xuICAgICAgICAgICAgICBjYXNlICdldmVudCc6XG4gICAgICAgICAgICAgIGNhc2UgJ29hdXRoJzpcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2J1dHRvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBvbkNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHNldHRpbmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgY2FzZSAnZXZlbnQnOlxuICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgkc2NvcGUuY29tcG9uZW50LmV2ZW50LCAkc2NvcGUuZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc2V0JzpcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ29hdXRoJzpcbiAgICAgICAgICAgICAgICBpZiAoIXNldHRpbmdzLm9hdXRoKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IG11c3QgYXNzaWduIHRoaXMgYnV0dG9uIHRvIGFuIE9BdXRoIGFjdGlvbiBiZWZvcmUgaXQgd2lsbCB3b3JrLidcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5vYXV0aC5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogc2V0dGluZ3Mub2F1dGguZXJyb3JcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5vcGVuT0F1dGgoc2V0dGluZ3Mub2F1dGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICAkc2NvcGUuJG9uKCdidXR0b25DbGljaycsIGZ1bmN0aW9uKGV2ZW50LCBjb21wb25lbnQsIGNvbXBvbmVudElkKSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGNvbXBvbmVudElkJ3MgbWF0Y2ggKGV2ZW4gdGhvdWdoIHRoZXkgYWx3YXlzIHNob3VsZCkuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SWQgIT09ICRzY29wZS5jb21wb25lbnRJZCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvbkNsaWNrKCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAkc2NvcGUub3Blbk9BdXRoID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICByZXNwb25zZV90eXBlOiAnY29kZScsXG4gICAgICAgICAgICAgIGNsaWVudF9pZDogc2V0dGluZ3MuY2xpZW50SWQsXG4gICAgICAgICAgICAgIHJlZGlyZWN0X3VyaTogd2luZG93LmxvY2F0aW9uLm9yaWdpbiB8fCB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgIHN0YXRlOiBzZXR0aW5ncy5zdGF0ZSxcbiAgICAgICAgICAgICAgc2NvcGU6IHNldHRpbmdzLnNjb3BlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLyplc2xpbnQtZW5hYmxlIGNhbWVsY2FzZSAqL1xuXG4gICAgICAgICAgICAvLyBNYWtlIGRpc3BsYXkgb3B0aW9uYWwuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGlzcGxheSkge1xuICAgICAgICAgICAgICBwYXJhbXMuZGlzcGxheSA9IHNldHRpbmdzLmRpc3BsYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJhbXMgPSBPYmplY3Qua2V5cyhwYXJhbXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba2V5XSk7XG4gICAgICAgICAgICB9KS5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIHZhciB1cmwgPSBzZXR0aW5ncy5hdXRoVVJJICsgJz8nICsgcGFyYW1zO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBtYWtlIHdpbmRvdyBvcHRpb25zIGZyb20gb2F1dGggc2V0dGluZ3MsIGhhdmUgYmV0dGVyIGRlZmF1bHRzXG4gICAgICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3Blbih1cmwsIHNldHRpbmdzLnByb3ZpZGVyLCAnd2lkdGg9MTAyMCxoZWlnaHQ9NjE4Jyk7XG4gICAgICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgcG9wdXBIb3N0ID0gcG9wdXAubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEhvc3QgPSB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICBpZiAocG9wdXAgJiYgIXBvcHVwLmNsb3NlZCAmJiBwb3B1cEhvc3QgPT09IGN1cnJlbnRIb3N0ICYmIHBvcHVwLmxvY2F0aW9uLnNlYXJjaCkge1xuICAgICAgICAgICAgICAgICAgcG9wdXAuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBwb3B1cC5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHBhcmFtcywgcGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwbGl0ID0gcGFyYW0uc3BsaXQoJz0nKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW3NwbGl0WzBdXSA9IHNwbGl0WzFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgfSwge30pO1xuICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLmVycm9yX2Rlc2NyaXB0aW9uIHx8IHBhcmFtcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgZm9yIGVycm9yIHJlc3BvbnNlIGhlcmVcbiAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zdGF0ZSAhPT0gcGFyYW1zLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnT0F1dGggc3RhdGUgZG9lcyBub3QgbWF0Y2guIFBsZWFzZSB0cnkgbG9nZ2luZyBpbiBhZ2Fpbi4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvbiA9IHtkYXRhOiB7fSwgb2F1dGg6IHt9fTtcbiAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb24ub2F1dGhbc2V0dGluZ3MucHJvdmlkZXJdID0gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbi5vYXV0aFtzZXR0aW5ncy5wcm92aWRlcl0ucmVkaXJlY3RVUkkgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luIHx8IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtaW9Gb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1pby5zYXZlU3VibWlzc2lvbihzdWJtaXNzaW9uKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBmb3JtIHN1Ym1pc3Npb24uXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pc3Npb24nLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtaW9Gb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8IGVycm9yXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCFwb3B1cCB8fCBwb3B1cC5jbG9zZWQgfHwgcG9wdXAuY2xvc2VkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2J1dHRvbi5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9idXR0b24uaHRtbCcsXG4gICAgICAgIFwiPGJ1dHRvbiB0eXBlPVxcXCJ7eyBnZXRCdXR0b25UeXBlKCkgfX1cXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5nLWNsYXNzPVxcXCJ7J2J0bi1ibG9jayc6IGNvbXBvbmVudC5ibG9ja31cXFwiXFxuICBjbGFzcz1cXFwiYnRuIGJ0bi17eyBjb21wb25lbnQudGhlbWUgfX0gYnRuLXt7IGNvbXBvbmVudC5zaXplIH19XFxcIlxcbiAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5IHx8IGZvcm1pb0Zvcm0uc3VibWl0dGluZyB8fCAoY29tcG9uZW50LmRpc2FibGVPbkludmFsaWQgJiYgZm9ybWlvRm9ybS4kaW52YWxpZClcXFwiXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICBuZy1jbGljaz1cXFwiJGVtaXQoJ2J1dHRvbkNsaWNrJywgY29tcG9uZW50LCBjb21wb25lbnRJZClcXFwiPlxcbiAgPHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5sZWZ0SWNvblxcXCIgY2xhc3M9XFxcInt7IGNvbXBvbmVudC5sZWZ0SWNvbiB9fVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gIDxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQubGVmdEljb24gJiYgY29tcG9uZW50LmxhYmVsXFxcIj4mbmJzcDs8L3NwYW4+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQucmlnaHRJY29uICYmIGNvbXBvbmVudC5sYWJlbFxcXCI+Jm5ic3A7PC9zcGFuPlxcbiAgPHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5yaWdodEljb25cXFwiIGNsYXNzPVxcXCJ7eyBjb21wb25lbnQucmlnaHRJY29uIH19XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgIDxpIG5nLWlmPVxcXCJjb21wb25lbnQuYWN0aW9uID09ICdzdWJtaXQnICYmIGZvcm1pb0Zvcm0uc3VibWl0dGluZ1xcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcbjwvYnV0dG9uPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzVmlldy9idXR0b24uaHRtbCcsXG4gICAgICAgIFwiXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NoZWNrYm94Jywge1xuICAgICAgICB0aXRsZTogJ0NoZWNrIEJveCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY2hlY2tib3guaHRtbCcsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHJldHVybiBkYXRhID8gJ1llcycgOiAnTm8nO1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAgIGlmICgkc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuICAgICAgICAgIC8vIEZBLTg1MCAtIEVuc3VyZSB0aGUgY2hlY2tlZCB2YWx1ZSBpcyBhbHdheXMgYSBib29sZWFuIG9iamVjdCB3aGVuIGxvYWRlZCwgdGhlbiB1bmJpbmQgdGhlIHdhdGNoLlxuICAgICAgICAgIHZhciBsb2FkQ29tcGxldGUgPSAkc2NvcGUuJHdhdGNoKCdkYXRhLicgKyAkc2NvcGUuY29tcG9uZW50LmtleSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYm9vbGVhbiA9IHtcbiAgICAgICAgICAgICAgdHJ1ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgZmFsc2U6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKCRzY29wZS5kYXRhICYmICRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KCRzY29wZS5jb21wb25lbnQua2V5KSAmJiAhKCRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSBpbnN0YW5jZW9mIEJvb2xlYW4pKSB7XG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlICYmICRzY29wZS5jb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWQgJiYgISRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gYm9vbGVhblskc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV1dIHx8IGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxvYWRDb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdjaGVja2JveCcsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIC8vIFRoaXMgaGlkZXMgdGhlIGRlZmF1bHQgbGFiZWwgbGF5b3V0IHNvIHdlIGNhbiB1c2UgYSBzcGVjaWFsIGlubGluZSBsYWJlbFxuICAgICAgICAgIGhpZGVMYWJlbDogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAgZGF0YWdyaWRMYWJlbDogdHJ1ZSxcbiAgICAgICAgICBrZXk6ICdjaGVja2JveEZpZWxkJyxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NoZWNrYm94Lmh0bWwnLFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImNoZWNrYm94XFxcIj5cXG4gIDxsYWJlbCBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGlzUmVxdWlyZWQoY29tcG9uZW50KX1cXFwiPlxcbiAgICA8aW5wdXRcXG4gICAgICB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcbiAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gICAgICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgICAgIG5nLXJlcXVpcmVkPVxcXCJpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiXFxuICAgID5cXG4gICAgPHNwYW4gbmctaWY9XFxcIiEoY29tcG9uZW50LmhpZGVMYWJlbCAmJiBjb21wb25lbnQuZGF0YWdyaWRMYWJlbCA9PT0gZmFsc2UpXFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9zcGFuPlxcbiAgPC9sYWJlbD5cXG48L2Rpdj5cXG48ZGl2IG5nLWlmPVxcXCIhIWNvbXBvbmVudC5kZXNjcmlwdGlvblxcXCIgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiPlxcbiAgPHNwYW4+e3sgY29tcG9uZW50LmRlc2NyaXB0aW9uIH19PC9zcGFuPlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb2x1bW5zJywge1xuICAgICAgICB0aXRsZTogJ0NvbHVtbnMnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAga2V5OiAnY29sdW1ucycsXG4gICAgICAgICAgY29sdW1uczogW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy9jb2x1bW5zLmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImNvbC1zbS02XFxcIiBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb21wb25lbnQuY29sdW1ucyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICAgIG5nLXJlcGVhdD1cXFwiX2NvbXBvbmVudCBpbiBjb2x1bW4uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgICAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgICAgIGRhdGE9XFxcImRhdGFcXFwiXFxuICAgICAgZm9ybWlvPVxcXCJmb3JtaW9cXFwiXFxuICAgICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgICBoaWRlLWNvbXBvbmVudHM9XFxcImhpZGVDb21wb25lbnRzXFxcIlxcbiAgICAgIG5nLWlmPVxcXCJidWlsZGVyID8gJzo6dHJ1ZScgOiBpc1Zpc2libGUoX2NvbXBvbmVudCwgZGF0YSlcXFwiXFxuICAgICAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICAgICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICAgIGdyaWQtcm93PVxcXCJncmlkUm93XFxcIlxcbiAgICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICAgIGJ1aWxkZXI9XFxcImJ1aWxkZXJcXFwiXFxuICAgID48L2Zvcm1pby1jb21wb25lbnQ+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvY29sdW1ucy5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTZcXFwiIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbXBvbmVudC5jb2x1bW5zIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxuICAgIDxmb3JtaW8tY29tcG9uZW50LXZpZXdcXG4gICAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICAgIGNvbXBvbmVudD1cXFwiX2NvbXBvbmVudFxcXCJcXG4gICAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICAgIGZvcm09XFxcImZvcm1cXFwiXFxuICAgICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgICBpZ25vcmU9XFxcImlnbm9yZVxcXCJcXG4gICAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICAgIGJ1aWxkZXI9XFxcImJ1aWxkZXJcXFwiXFxuICAgID48L2Zvcm1pby1jb21wb25lbnQtdmlldz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAucHJvdmlkZXIoJ2Zvcm1pb0NvbXBvbmVudHMnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIHZhciBncm91cHMgPSB7XG4gICAgICBfX2NvbXBvbmVudDoge1xuICAgICAgICB0aXRsZTogJ0Jhc2ljIENvbXBvbmVudHMnXG4gICAgICB9LFxuICAgICAgYWR2YW5jZWQ6IHtcbiAgICAgICAgdGl0bGU6ICdTcGVjaWFsIENvbXBvbmVudHMnXG4gICAgICB9LFxuICAgICAgbGF5b3V0OiB7XG4gICAgICAgIHRpdGxlOiAnTGF5b3V0IENvbXBvbmVudHMnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWRkR3JvdXA6IGZ1bmN0aW9uKG5hbWUsIGdyb3VwKSB7XG4gICAgICAgIGdyb3Vwc1tuYW1lXSA9IGdyb3VwO1xuICAgICAgfSxcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbih0eXBlLCBjb21wb25lbnQsIGdyb3VwKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50c1t0eXBlXSkge1xuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0gPSBjb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYW5ndWxhci5leHRlbmQoY29tcG9uZW50c1t0eXBlXSwgY29tcG9uZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdHlwZSBmb3IgdGhpcyBjb21wb25lbnQuXG4gICAgICAgIGlmICghY29tcG9uZW50c1t0eXBlXS5ncm91cCkge1xuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0uZ3JvdXAgPSBncm91cCB8fCAnX19jb21wb25lbnQnO1xuICAgICAgICB9XG4gICAgICAgIGNvbXBvbmVudHNbdHlwZV0uc2V0dGluZ3MudHlwZSA9IHR5cGU7XG4gICAgICB9LFxuICAgICAgJGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50cyxcbiAgICAgICAgICBncm91cHM6IGdyb3Vwc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ3NhZmVNdWx0aXBsZVRvU2luZ2xlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlLCBlbCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgbmdNb2RlbC4kZm9ybWF0dGVycy5wdXNoKGZ1bmN0aW9uKG1vZGVsVmFsdWUpIHtcbiAgICAgICAgICBpZiAoISRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgJiYgQXJyYXkuaXNBcnJheShtb2RlbFZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWVbMF0gfHwgJyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEdyaWRVdGlscyA9IHJlcXVpcmUoJy4uL2ZhY3Rvcmllcy9HcmlkVXRpbHMnKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY29udGFpbmVyJywge1xuICAgICAgICB0aXRsZTogJ0NvbnRhaW5lcicsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvY29udGFpbmVyLmh0bWwnLFxuICAgICAgICB2aWV3VGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50c1ZpZXcvY29udGFpbmVyLmh0bWwnLFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgaWNvbjogJ2ZhIGZhLWZvbGRlci1vcGVuJyxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSwgY29tcG9uZW50SW5mbykge1xuICAgICAgICAgIHZhciB2aWV3ID0gJzx0YWJsZSBjbGFzcz1cInRhYmxlIHRhYmxlLXN0cmlwZWQgdGFibGUtYm9yZGVyZWRcIj48dGhlYWQ+PHRyPic7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICAgIHZpZXcgKz0gJzx0aD4nICsgY29tcG9uZW50LmxhYmVsICsgJzwvdGg+JztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2aWV3ICs9ICc8L3RyPjwvdGhlYWQ+JztcbiAgICAgICAgICB2aWV3ICs9ICc8dGJvZHk+JztcbiAgICAgICAgICB2aWV3ICs9ICc8dHI+JztcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgdmFyIGluZm8gPSBjb21wb25lbnRJbmZvLmNvbXBvbmVudHMuaGFzT3duUHJvcGVydHkoY29tcG9uZW50LnR5cGUpID8gY29tcG9uZW50SW5mby5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXSA6IHt9O1xuICAgICAgICAgICAgaWYgKGluZm8udGFibGVWaWV3KSB7XG4gICAgICAgICAgICAgIHZpZXcgKz0gJzx0ZD4nICtcbiAgICAgICAgICAgICAgICBpbmZvLnRhYmxlVmlldyhcbiAgICAgICAgICAgICAgICAgIGRhdGEgJiYgY29tcG9uZW50LmtleSAmJiBkYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5rZXkpID8gZGF0YVtjb21wb25lbnQua2V5XSA6ICcnLFxuICAgICAgICAgICAgICAgICAgY29tcG9uZW50LFxuICAgICAgICAgICAgICAgICAgJGludGVycG9sYXRlLFxuICAgICAgICAgICAgICAgICAgY29tcG9uZW50SW5mb1xuICAgICAgICAgICAgICAgICkgKyAnPC90ZD4nO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZpZXcgKz0gJzx0ZD4nO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5wcmVmaXgpIHtcbiAgICAgICAgICAgICAgdmlldyArPSBjb21wb25lbnQucHJlZml4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmlldyArPSBkYXRhICYmIGNvbXBvbmVudC5rZXkgJiYgZGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSA/IGRhdGFbY29tcG9uZW50LmtleV0gOiAnJztcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuc3VmZml4KSB7XG4gICAgICAgICAgICAgIHZpZXcgKz0gJyAnICsgY29tcG9uZW50LnN1ZmZpeDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZpZXcgKz0gJzwvdGQ+JztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2aWV3ICs9ICc8L3RyPic7XG4gICAgICAgICAgdmlldyArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgICAgcmV0dXJuIHZpZXc7XG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdHJlZTogdHJ1ZSxcbiAgICAgICAgICBjb21wb25lbnRzOiBbXSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2NvbnRhaW5lcicsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGNsZWFyT25IaWRlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9Db250YWluZXJDb21wb25lbnQnLCBbXG4gICAgJyRzY29wZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gfHwge307XG4gICAgICAkc2NvcGUucGFyZW50S2V5ID0gJHNjb3BlLmNvbXBvbmVudC5rZXk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9jb250YWluZXIuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8ZGl2IG5nLWNvbnRyb2xsZXI9XFxcImZvcm1pb0NvbnRhaW5lckNvbXBvbmVudFxcXCIgY2xhc3M9XFxcImZvcm1pby1jb250YWluZXItY29tcG9uZW50XFxcIj5cXG4gIDxmb3JtaW8tY29tcG9uZW50XFxuICAgIG5nLXJlcGVhdD1cXFwiX2NvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgIGNvbXBvbmVudD1cXFwiX2NvbXBvbmVudFxcXCJcXG4gICAgZGF0YT1cXFwiZGF0YVtwYXJlbnRLZXldXFxcIlxcbiAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCJcXG4gICAgbmctaWY9XFxcImJ1aWxkZXIgPyAnOjp0cnVlJyA6IGlzVmlzaWJsZShfY29tcG9uZW50LCBkYXRhW3BhcmVudEtleV0pXFxcIlxcbiAgICBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKF9jb21wb25lbnQsIGRhdGFbcGFyZW50S2V5XSlcXFwiXFxuICAgIGdyaWQtcm93PVxcXCJncmlkUm93XFxcIlxcbiAgICBncmlkLWNvbD1cXFwiZ3JpZENvbFxcXCJcXG4gICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gID48L2Zvcm1pby1jb21wb25lbnQ+XFxuPC9kaXY+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb250ZW50Jywge1xuICAgICAgICB0aXRsZTogJ0NvbnRlbnQnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbnRlbnQuaHRtbCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAga2V5OiAnY29udGVudCcsXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIGh0bWw6ICcnXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbnRlbnQuaHRtbCdcbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcbiAgICAgICAgXCI8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiY29tcG9uZW50Lmh0bWwgfCBzYWZlaHRtbCB8IGZvcm1pb1RyYW5zbGF0ZTpjb21wb25lbnQua2V5OmJ1aWxkZXJcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2N1cnJlbmN5SW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBNYXkgYmUgYmV0dGVyIHdheSB0aGFuIGFkZGluZyB0byBwcm90b3R5cGUuXG4gICAgdmFyIHNwbGljZSA9IGZ1bmN0aW9uKHN0cmluZywgaWR4LCByZW0sIHMpIHtcbiAgICAgIHJldHVybiAoc3RyaW5nLnNsaWNlKDAsIGlkeCkgKyBzICsgc3RyaW5nLnNsaWNlKGlkeCArIE1hdGguYWJzKHJlbSkpKTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgZWxlbWVudC5iaW5kKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gc2NvcGUuZGF0YVtzY29wZS5jb21wb25lbnQua2V5XTtcblxuICAgICAgICAgIC8vY2xlYXJpbmcgbGVmdCBzaWRlIHplcm9zXG4gICAgICAgICAgd2hpbGUgKGRhdGEuY2hhckF0KDApID09PSAnMCcpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnN1YnN0cigxKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhID0gZGF0YS5yZXBsYWNlKC9bXlxcZC5cXCcsJ10vZywgJycpO1xuXG4gICAgICAgICAgdmFyIHBvaW50ID0gZGF0YS5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgaWYgKHBvaW50ID49IDApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnNsaWNlKDAsIHBvaW50ICsgMyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlY2ltYWxTcGxpdCA9IGRhdGEuc3BsaXQoJy4nKTtcbiAgICAgICAgICB2YXIgaW50UGFydCA9IGRlY2ltYWxTcGxpdFswXTtcbiAgICAgICAgICB2YXIgZGVjUGFydCA9IGRlY2ltYWxTcGxpdFsxXTtcblxuICAgICAgICAgIGludFBhcnQgPSBpbnRQYXJ0LnJlcGxhY2UoL1teXFxkXS9nLCAnJyk7XG4gICAgICAgICAgaWYgKGludFBhcnQubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgdmFyIGludERpdiA9IE1hdGguZmxvb3IoaW50UGFydC5sZW5ndGggLyAzKTtcbiAgICAgICAgICAgIHdoaWxlIChpbnREaXYgPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBsYXN0Q29tbWEgPSBpbnRQYXJ0LmluZGV4T2YoJywnKTtcbiAgICAgICAgICAgICAgaWYgKGxhc3RDb21tYSA8IDApIHtcbiAgICAgICAgICAgICAgICBsYXN0Q29tbWEgPSBpbnRQYXJ0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChsYXN0Q29tbWEgLSAzID4gMCkge1xuICAgICAgICAgICAgICAgIGludFBhcnQgPSBzcGxpY2UoaW50UGFydCwgbGFzdENvbW1hIC0gMywgMCwgJywnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpbnREaXYtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZGVjUGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWNQYXJ0ID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVjUGFydCA9ICcuJyArIGRlY1BhcnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXMgPSBpbnRQYXJ0ICsgZGVjUGFydDtcbiAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzY29wZS5kYXRhW3Njb3BlLmNvbXBvbmVudC5rZXldID0gcmVzO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2N1cnJlbmN5Jywge1xuICAgICAgICB0aXRsZTogJ0N1cnJlbmN5JyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jdXJyZW5jeS5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGlucHV0VHlwZTogJ3RleHQnLFxuICAgICAgICAgIGlucHV0TWFzazogJycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2N1cnJlbmN5RmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG11bHRpcGxlOiAnJyxcbiAgICAgICAgICAgIGN1c3RvbTogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmRpdGlvbmFsOiB7XG4gICAgICAgICAgICBzaG93OiBudWxsLFxuICAgICAgICAgICAgd2hlbjogbnVsbCxcbiAgICAgICAgICAgIGVxOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2N1cnJlbmN5Lmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPGlucHV0XFxuICB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcbiAgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXG4gIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIlxcbiAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgc2FmZS1tdWx0aXBsZS10by1zaW5nbGVcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiXFxuICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcbiAgY3VycmVuY3ktaW5wdXRcXG4gIHVpLW1hc2stcGxhY2Vob2xkZXI9XFxcIlxcXCJcXG4gIHVpLW9wdGlvbnM9XFxcInVpTWFza09wdGlvbnNcXFwiXFxuPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgR3JpZFV0aWxzID0gcmVxdWlyZSgnLi4vZmFjdG9yaWVzL0dyaWRVdGlscycpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjdXN0b20nLCB7XG4gICAgICAgIHRpdGxlOiAnQ3VzdG9tJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jdXN0b20uaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge30sXG4gICAgICAgIHRhYmxlVmlldzogR3JpZFV0aWxzLmdlbmVyaWNcbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY3VzdG9tLmh0bWwnLFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLWRlZmF1bHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keSB0ZXh0LW11dGVkIHRleHQtY2VudGVyXFxcIj5cXG4gICAgQ3VzdG9tIENvbXBvbmVudCAoe3sgY29tcG9uZW50LnR5cGUgfX0pXFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZGF0YWdyaWQnLCB7XG4gICAgICAgIHRpdGxlOiAnRGF0YSBHcmlkJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9kYXRhZ3JpZC5odG1sJyxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUsIGNvbXBvbmVudEluZm8pIHtcbiAgICAgICAgICB2YXIgdmlldyA9ICc8dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXCI+PHRoZWFkPjx0cj4nO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21wb25lbnQuY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICB2aWV3ICs9ICc8dGg+JyArIGNvbXBvbmVudC5sYWJlbCArICc8L3RoPic7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmlldyArPSAnPC90cj48L3RoZWFkPic7XG4gICAgICAgICAgdmlldyArPSAnPHRib2R5Pic7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgICAgICAgdmlldyArPSAnPHRyPic7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICB2YXIgaW5mbyA9IGNvbXBvbmVudEluZm8uY29tcG9uZW50cy5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQudHlwZSkgPyBjb21wb25lbnRJbmZvLmNvbXBvbmVudHNbY29tcG9uZW50LnR5cGVdIDoge307XG4gICAgICAgICAgICAgIGlmIChpbmZvLnRhYmxlVmlldykge1xuICAgICAgICAgICAgICAgIHZpZXcgKz0gJzx0ZD4nICsgaW5mby50YWJsZVZpZXcocm93W2NvbXBvbmVudC5rZXldIHx8ICcnLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSwgY29tcG9uZW50SW5mbykgKyAnPC90ZD4nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXcgKz0gJzx0ZD4nO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICB2aWV3ICs9IGNvbXBvbmVudC5wcmVmaXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZpZXcgKz0gcm93W2NvbXBvbmVudC5rZXldIHx8ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuc3VmZml4KSB7XG4gICAgICAgICAgICAgICAgICB2aWV3ICs9ICcgJyArIGNvbXBvbmVudC5zdWZmaXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZpZXcgKz0gJzwvdGQ+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2aWV3ICs9ICc8L3RyPic7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmlldyArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgICAgcmV0dXJuIHZpZXc7XG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdHJlZTogdHJ1ZSxcbiAgICAgICAgICBjb21wb25lbnRzOiBbXSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2RhdGFncmlkJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLmNvbnRyb2xsZXIoJ2Zvcm1pb0RhdGFHcmlkJywgW1xuICAgICckc2NvcGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCBGb3JtaW9VdGlscykge1xuICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAvLyBFbnN1cmUgZWFjaCBkYXRhIGdyaWQgaGFzIGEgdmFsaWQgZGF0YSBtb2RlbC5cbiAgICAgICRzY29wZS5kYXRhID0gJHNjb3BlLmRhdGEgfHwge307XG4gICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gfHwgW3t9XTtcblxuICAgICAgLy8gRGV0ZXJtaW5lIGlmIGFueSBjb21wb25lbnQgaXMgdmlzaWJsZS5cbiAgICAgICRzY29wZS5hbnlWaXNpYmxlID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIHZhciBkYXRhID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldO1xuICAgICAgICB2YXIgdmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgZnVuY3Rpb24ocm93RGF0YSkge1xuICAgICAgICAgIHZpc2libGUgPSAodmlzaWJsZSB8fCBGb3JtaW9VdGlscy5pc1Zpc2libGUoY29tcG9uZW50LCByb3dEYXRhKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmlzaWJsZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFB1bGwgb3V0IHRoZSByb3dzIGFuZCBjb2xzIGZvciBlYXN5IGl0ZXJhdGlvbi5cbiAgICAgICRzY29wZS5yb3dzID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldO1xuICAgICAgJHNjb3BlLmNvbHMgPSAkc2NvcGUuY29tcG9uZW50LmNvbXBvbmVudHM7XG4gICAgICAkc2NvcGUubG9jYWxLZXlzID0gJHNjb3BlLmNvbXBvbmVudC5jb21wb25lbnRzLm1hcChmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudC5rZXk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIGEgcm93IHRoZSB0byBncmlkLlxuICAgICAgJHNjb3BlLmFkZFJvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoJHNjb3BlLnJvd3MpKSB7XG4gICAgICAgICAgJHNjb3BlLnJvd3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUucm93cy5wdXNoKHt9KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFJlbW92ZSBhIHJvdyBmcm9tIHRoZSBncmlkLlxuICAgICAgJHNjb3BlLnJlbW92ZVJvdyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICRzY29wZS5yb3dzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9O1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF0YWdyaWQuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJmb3JtaW8tZGF0YS1ncmlkXFxcIiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9EYXRhR3JpZFxcXCI+XFxuICA8dGFibGUgbmctY2xhc3M9XFxcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCAndGFibGUtYm9yZGVyZWQnOiBjb21wb25lbnQuYm9yZGVyZWQsICd0YWJsZS1ob3Zlcic6IGNvbXBvbmVudC5ob3ZlciwgJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XFxcIiBjbGFzcz1cXFwidGFibGUgZGF0YWdyaWQtdGFibGVcXFwiPlxcbiAgICA8dHI+XFxuICAgICAgPHRoXFxuICAgICAgICBuZy1yZXBlYXQ9XFxcImNvbCBpbiBjb2xzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgICAgIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29sLnZhbGlkYXRlLnJlcXVpcmVkfVxcXCJcXG4gICAgICAgIG5nLWlmPVxcXCJidWlsZGVyID8gJzo6dHJ1ZScgOiBhbnlWaXNpYmxlKGNvbClcXFwiXFxuICAgICAgPnt7IGNvbC5sYWJlbCB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L3RoPlxcbiAgICA8L3RyPlxcbiAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93cyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWluaXQ9XFxcInJvd0luZGV4ID0gJGluZGV4XFxcIj5cXG4gICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2wgaW4gY29scyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWluaXQ9XFxcImNvbC5oaWRlTGFiZWwgPSB0cnVlOyBjb2xJbmRleCA9ICRpbmRleFxcXCIgY2xhc3M9XFxcImZvcm1pby1kYXRhLWdyaWQtcm93XFxcIiBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogYW55VmlzaWJsZShjb2wpXFxcIj5cXG4gICAgICAgIDxmb3JtaW8tY29tcG9uZW50XFxuICAgICAgICAgIGNvbXBvbmVudD1cXFwiY29sXFxcIlxcbiAgICAgICAgICBkYXRhPVxcXCJyb3dzW3Jvd0luZGV4XVxcXCJcXG4gICAgICAgICAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICAgICAgICAgIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgICAgICAgICBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIlxcbiAgICAgICAgICBoaWRlLWNvbXBvbmVudHM9XFxcImhpZGVDb21wb25lbnRzXFxcIlxcbiAgICAgICAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKGNvbCwgcm93KVxcXCJcXG4gICAgICAgICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKGNvbCwgcm93KVxcXCJcXG4gICAgICAgICAgZ3JpZC1yb3c9XFxcInJvd0luZGV4XFxcIlxcbiAgICAgICAgICBncmlkLWNvbD1cXFwiY29sSW5kZXhcXFwiXFxuICAgICAgICAgIGJ1aWxkZXI9XFxcImJ1aWxkZXJcXFwiXFxuICAgICAgICA+PC9mb3JtaW8tY29tcG9uZW50PlxcbiAgICAgIDwvdGQ+XFxuICAgICAgPHRkPlxcbiAgICAgICAgPGEgbmctY2xpY2s9XFxcInJlbW92ZVJvdyhyb3dJbmRleClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiPlxcbiAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUtY2lyY2xlXFxcIj48L3NwYW4+XFxuICAgICAgICA8L2E+XFxuICAgICAgPC90ZD5cXG4gICAgPC90cj5cXG4gIDwvdGFibGU+XFxuICA8ZGl2IGNsYXNzPVxcXCJkYXRhZ3JpZC1hZGRcXFwiPlxcbiAgICA8YSBuZy1jbGljaz1cXFwiYWRkUm93KClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+IHt7IGNvbXBvbmVudC5hZGRBbm90aGVyIHx8IFxcXCJBZGQgQW5vdGhlclxcXCIgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZGF0ZXRpbWUnLCB7XG4gICAgICAgIHRpdGxlOiAnRGF0ZSAvIFRpbWUnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2RhdGV0aW1lLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKSB7XG4gICAgICAgICAgcmV0dXJuICRpbnRlcnBvbGF0ZSgnPHNwYW4+e3sgXCInICsgZGF0YSArICdcIiB8IGRhdGU6IFwiJyArIGNvbXBvbmVudC5mb3JtYXQgKyAnXCIgfX08L3NwYW4+JykoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyR0aW1lb3V0JywgZnVuY3Rpb24oJHNjb3BlLCAkdGltZW91dCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuXG4gICAgICAgICAgdmFyIGRhdGVWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIGRhdGUgaXMgc2V0LCB0aGVuIHJldHVybiB0aGUgdHJ1ZSBkYXRlIHZhbHVlLlxuICAgICAgICAgICAgaWYgKCRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSkge1xuICAgICAgICAgICAgICByZXR1cm4gKCRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSBpbnN0YW5jZW9mIERhdGUpID8gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIDogbmV3IERhdGUoJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2VlIGlmIGEgZGVmYXVsdCBkYXRlIGlzIHNldC5cbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmRlZmF1bHREYXRlKSB7XG4gICAgICAgICAgICAgIHZhciBkZWZhdWx0RGF0ZSA9IG5ldyBEYXRlKCRzY29wZS5jb21wb25lbnQuZGVmYXVsdERhdGUpO1xuICAgICAgICAgICAgICBpZiAoIWRlZmF1bHREYXRlIHx8IGlzTmFOKGRlZmF1bHREYXRlLmdldERhdGUoKSkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZGVmYXVsdERhdGUgPSBuZXcgRGF0ZShldmFsKCRzY29wZS5jb21wb25lbnQuZGVmYXVsdERhdGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHREYXRlID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKGRlZmF1bHREYXRlICYmICFpc05hTihkZWZhdWx0RGF0ZS5nZXREYXRlKCkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHREYXRlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gZW1wdHkuXG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIEVuc3VyZSB0aGUgZGF0ZSB2YWx1ZSBpcyBhbHdheXMgYSBkYXRlIG9iamVjdCB3aGVuIGxvYWRlZCwgdGhlbiB1bmJpbmQgdGhlIHdhdGNoLlxuICAgICAgICAgIHZhciBsb2FkQ29tcGxldGUgPSAkc2NvcGUuJHdhdGNoKCdkYXRhLicgKyAkc2NvcGUuY29tcG9uZW50LmtleSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5kYXRhKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IGRhdGVWYWx1ZSgpO1xuICAgICAgICAgICAgbG9hZENvbXBsZXRlKCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBJZiB0aGV5IGhhdmUgMTIgaG91ciB0aW1lIGVuYWJsZWQsIHdlIG5lZWQgdG8gZW5zdXJlIHRoYXQgd2Ugc2VlIHRoZSBtZXJpZGlhbiBpbiB0aGUgZm9ybWF0LlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQuZW5hYmxlVGltZSAmJlxuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudC50aW1lUGlja2VyICYmXG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LnRpbWVQaWNrZXIuc2hvd01lcmlkaWFuICYmXG4gICAgICAgICAgICAoJHNjb3BlLmNvbXBvbmVudC5mb3JtYXQuaW5kZXhPZignbW0nKSAhPT0gLTEpICYmXG4gICAgICAgICAgICAoJHNjb3BlLmNvbXBvbmVudC5mb3JtYXQuaW5kZXhPZignYScpID09PSAtMSlcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQuZm9ybWF0ICs9ICcgYSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50Lm1heERhdGUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuY29tcG9uZW50Lm1heERhdGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5taW5EYXRlKSB7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmNvbXBvbmVudC5taW5EYXRlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICRzY29wZS5hdXRvT3BlbiA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLm9uQ2xvc2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUuYXV0b09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkc2NvcGUuYXV0b09wZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2RhdGV0aW1lRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBmb3JtYXQ6ICd5eXl5LU1NLWRkIEhIOm1tIGEnLFxuICAgICAgICAgIGVuYWJsZURhdGU6IHRydWUsXG4gICAgICAgICAgZW5hYmxlVGltZTogdHJ1ZSxcbiAgICAgICAgICBkZWZhdWx0RGF0ZTogJycsXG4gICAgICAgICAgbWluRGF0ZTogbnVsbCxcbiAgICAgICAgICBtYXhEYXRlOiBudWxsLFxuICAgICAgICAgIGRhdGVwaWNrZXJNb2RlOiAnZGF5JyxcbiAgICAgICAgICBkYXRlUGlja2VyOiB7XG4gICAgICAgICAgICBzaG93V2Vla3M6IHRydWUsXG4gICAgICAgICAgICBzdGFydGluZ0RheTogMCxcbiAgICAgICAgICAgIGluaXREYXRlOiAnJyxcbiAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknLFxuICAgICAgICAgICAgbWF4TW9kZTogJ3llYXInLFxuICAgICAgICAgICAgeWVhclJhbmdlOiAnMjAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aW1lUGlja2VyOiB7XG4gICAgICAgICAgICBob3VyU3RlcDogMSxcbiAgICAgICAgICAgIG1pbnV0ZVN0ZXA6IDEsXG4gICAgICAgICAgICBzaG93TWVyaWRpYW46IHRydWUsXG4gICAgICAgICAgICByZWFkb25seUlucHV0OiBmYWxzZSxcbiAgICAgICAgICAgIG1vdXNld2hlZWw6IHRydWUsXG4gICAgICAgICAgICBhcnJvd2tleXM6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9kYXRldGltZS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWdyb3VwXFxcIj5cXG4gIDxpbnB1dFxcbiAgICB0eXBlPVxcXCJ0ZXh0XFxcIlxcbiAgICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gICAgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgICBuZy1mb2N1cz1cXFwiY2FsZW5kYXJPcGVuID0gYXV0b09wZW5cXFwiXFxuICAgIG5nLWNsaWNrPVxcXCJjYWxlbmRhck9wZW4gPSB0cnVlXFxcIlxcbiAgICBuZy1pbml0PVxcXCJjYWxlbmRhck9wZW4gPSBmYWxzZVxcXCJcXG4gICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIlxcbiAgICBpcy1vcGVuPVxcXCJjYWxlbmRhck9wZW5cXFwiXFxuICAgIGRhdGV0aW1lLXBpY2tlcj1cXFwie3sgY29tcG9uZW50LmZvcm1hdCB9fVxcXCJcXG4gICAgbWluLWRhdGU9XFxcImNvbXBvbmVudC5taW5EYXRlXFxcIlxcbiAgICBtYXgtZGF0ZT1cXFwiY29tcG9uZW50Lm1heERhdGVcXFwiXFxuICAgIGRhdGVwaWNrZXItbW9kZT1cXFwiY29tcG9uZW50LmRhdGVwaWNrZXJNb2RlXFxcIlxcbiAgICB3aGVuLWNsb3NlZD1cXFwib25DbG9zZWQoKVxcXCJcXG4gICAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gICAgZW5hYmxlLWRhdGU9XFxcImNvbXBvbmVudC5lbmFibGVEYXRlXFxcIlxcbiAgICBlbmFibGUtdGltZT1cXFwiY29tcG9uZW50LmVuYWJsZVRpbWVcXFwiXFxuICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICAgIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxcIlxcbiAgICBkYXRlcGlja2VyLW9wdGlvbnM9XFxcImNvbXBvbmVudC5kYXRlUGlja2VyXFxcIlxcbiAgICB0aW1lcGlja2VyLW9wdGlvbnM9XFxcImNvbXBvbmVudC50aW1lUGlja2VyXFxcIlxcbiAgLz5cXG4gIDxzcGFuIGNsYXNzPVxcXCJpbnB1dC1ncm91cC1idG5cXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBuZy1jbGljaz1cXFwiY2FsZW5kYXJPcGVuID0gdHJ1ZVxcXCI+XFxuICAgICAgPGkgbmctaWY9XFxcImNvbXBvbmVudC5lbmFibGVEYXRlXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jYWxlbmRhclxcXCI+PC9pPlxcbiAgICAgIDxpIG5nLWlmPVxcXCIhY29tcG9uZW50LmVuYWJsZURhdGVcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXRpbWVcXFwiPjwvaT5cXG4gICAgPC9idXR0b24+XFxuICA8L3NwYW4+XFxuPC9kaXY+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2RheVBhcnQnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbSwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgaWYgKHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgdmFyIGxpbWl0TGVuZ3RoID0gYXR0cnMuY2hhcmFjdGVycyB8fCAyO1xuICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMubmdNb2RlbCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCFuZ01vZGVsLiR2aWV3VmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlbmRlciA9IGZhbHNlO1xuICAgICAgICAgIGlmIChuZ01vZGVsLiR2aWV3VmFsdWUubGVuZ3RoID4gbGltaXRMZW5ndGgpIHtcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZ01vZGVsLiR2aWV3VmFsdWUuc3Vic3RyaW5nKDAsIGxpbWl0TGVuZ3RoKSk7XG4gICAgICAgICAgICByZW5kZXIgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNOYU4obmdNb2RlbC4kdmlld1ZhbHVlKSkge1xuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG5nTW9kZWwuJHZpZXdWYWx1ZS5yZXBsYWNlKC9cXEQvZywnJykpO1xuICAgICAgICAgICAgcmVuZGVyID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgcGFyc2VJbnQobmdNb2RlbC4kdmlld1ZhbHVlKSA8IHBhcnNlSW50KGF0dHJzLm1pbikgfHxcbiAgICAgICAgICAgIHBhcnNlSW50KG5nTW9kZWwuJHZpZXdWYWx1ZSkgPiBwYXJzZUludChhdHRycy5tYXgpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobmdNb2RlbC4kdmlld1ZhbHVlLnN1YnN0cmluZygwLCBsaW1pdExlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgIHJlbmRlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZW5kZXIpIHtcbiAgICAgICAgICAgIG5nTW9kZWwuJHJlbmRlcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4gIGFwcC5kaXJlY3RpdmUoJ2RheUlucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY29tcG9uZW50OiAnPScsXG4gICAgICAgIGNvbXBvbmVudElkOiAnPScsXG4gICAgICAgIHJlYWRPbmx5OiAnPScsXG4gICAgICAgIG5nTW9kZWw6ICc9JyxcbiAgICAgICAgZ3JpZFJvdzogJz0nLFxuICAgICAgICBncmlkQ29sOiAnPScsXG4gICAgICAgIGJ1aWxkZXI6ICc9PydcbiAgICAgIH0sXG4gICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9jb21wb25lbnRzL2RheS1pbnB1dC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgIGlmICgkc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuICAgICAgICAkc2NvcGUubW9udGhzID0gWyRzY29wZS5jb21wb25lbnQuZmllbGRzLm1vbnRoLnBsYWNlaG9sZGVyLCAnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsXG4gICAgICAgICAgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XG5cbiAgICAgICAgJHNjb3BlLmRhdGUgPSB7XG4gICAgICAgICAgZGF5OiAnJyxcbiAgICAgICAgICBtb250aDogJycsXG4gICAgICAgICAgeWVhcjogJydcbiAgICAgICAgfTtcbiAgICAgIH1dLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW0sIGF0dHJzLCBuZ01vZGVsKSB7XG4gICAgICAgIGlmIChzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgIC8vIFNldCB0aGUgc2NvcGUgdmFsdWVzIGJhc2VkIG9uIHRoZSBjdXJyZW50IG1vZGVsLlxuICAgICAgICBzY29wZS4kd2F0Y2goJ25nTW9kZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBPbmx5IHVwZGF0ZSBvbiBsb2FkLlxuICAgICAgICAgIGlmIChuZ01vZGVsLiR2aWV3VmFsdWUgJiYgIW5nTW9kZWwuJGRpcnR5KSB7XG4gICAgICAgICAgICB2YXIgcGFydHMgPSB0eXBlb2YgbmdNb2RlbC4kdmlld1ZhbHVlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICA/IG5nTW9kZWwuJHZpZXdWYWx1ZS5zcGxpdCgnLycpXG4gICAgICAgICAgICAgIDogbmdNb2RlbC4kdmlld1ZhbHVlO1xuICAgICAgICAgICAgaWYgKChwYXJ0cyBpbnN0YW5jZW9mIEFycmF5KSAmJiBwYXJ0cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0ZS5kYXkgPSBwYXJ0c1soc2NvcGUuY29tcG9uZW50LmRheUZpcnN0ID8gMCA6IDEpXTtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0ZS5tb250aCA9IHBhcnNlSW50KHBhcnRzWyhzY29wZS5jb21wb25lbnQuZGF5Rmlyc3QgPyAxIDogMCldKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICBzY29wZS5kYXRlLnllYXIgPSBwYXJ0c1syXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBwYWRMZWZ0ID0gZnVuY3Rpb24gcGFkTGVmdChuciwgbiwgc3RyKSB7XG4gICAgICAgICAgcmV0dXJuIEFycmF5KG4gLSBTdHJpbmcobnIudG9TdHJpbmcoKSkubGVuZ3RoICsgMSkuam9pbihzdHIgfHwgJzAnKSArIG5yLnRvU3RyaW5nKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUub25DaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUocGFkTGVmdChzY29wZS5kYXRlLmRheSwgMikgKyAnLycgKyBwYWRMZWZ0KHNjb3BlLmRhdGUubW9udGgsIDIpICsgJy8nICsgcGFkTGVmdChzY29wZS5kYXRlLnllYXIsIDQpKTtcbiAgICAgICAgfTtcblxuICAgICAgICBuZ01vZGVsLiR2YWxpZGF0b3JzLmRheSA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IG1vZGVsVmFsdWUgfHwgdmlld1ZhbHVlO1xuICAgICAgICAgIHZhciByZXF1aXJlZCA9IHNjb3BlLmNvbXBvbmVudC5maWVsZHMuZGF5LnJlcXVpcmVkIHx8IHNjb3BlLmNvbXBvbmVudC5maWVsZHMubW9udGgucmVxdWlyZWQgfHwgc2NvcGUuY29tcG9uZW50LmZpZWxkcy55ZWFyLnJlcXVpcmVkO1xuXG4gICAgICAgICAgaWYgKCFyZXF1aXJlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghdmFsdWUgJiYgcmVxdWlyZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHBhcnRzID0gdmFsdWUuc3BsaXQoJy8nKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY29tcG9uZW50LmZpZWxkcy5kYXkucmVxdWlyZWQpIHtcbiAgICAgICAgICAgIGlmIChwYXJ0c1soc2NvcGUuY29tcG9uZW50LmRheUZpcnN0ID8gMCA6IDEpXSA9PT0gJzAwJykge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzY29wZS5jb21wb25lbnQuZmllbGRzLm1vbnRoLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICBpZiAocGFydHNbKHNjb3BlLmNvbXBvbmVudC5kYXlGaXJzdCA/IDEgOiAwKV0gPT09ICcwMCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc2NvcGUuY29tcG9uZW50LmZpZWxkcy55ZWFyLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICBpZiAocGFydHNbMl0gPT09ICcwMDAwJykge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZGF5Jywge1xuICAgICAgICB0aXRsZTogJ0RheScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF5Lmh0bWwnLFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2RheUZpZWxkJyxcbiAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgIGRheToge1xuICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbW9udGg6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3NlbGVjdCcsXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWVhcjoge1xuICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXlGaXJzdDogZmFsc2UsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGNsZWFyT25IaWRlOiB0cnVlLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICBjdXN0b206ICcnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2RheS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImRheS1pbnB1dFxcXCI+XFxuICA8ZGF5LWlucHV0XFxuICAgIG5hbWU9XFxcInt7Y29tcG9uZW50SWR9fVxcXCJcXG4gICAgY29tcG9uZW50LWlkPVxcXCJjb21wb25lbnRJZFxcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKGNvbXBvbmVudCwgZGF0YSlcXFwiXFxuICAgIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIlxcbiAgICBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIlxcbiAgICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcbiAgICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgPjwvZGF5LWlucHV0PlxcbjwvZGl2PlxcblwiXG4gICAgICApKTtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF5LWlucHV0Lmh0bWwnLFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImRheVNlbGVjdCBmb3JtIHJvd1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwIGNvbC14cy0zXFxcIiBuZy1pZj1cXFwiY29tcG9uZW50LmRheUZpcnN0ICYmICFjb21wb25lbnQuZmllbGRzLmRheS5oaWRlXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwie3tjb21wb25lbnRJZH19LWRheVxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQuZmllbGRzLmRheS5yZXF1aXJlZH1cXFwiPnt7IFxcXCJEYXlcXFwiIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvbGFiZWw+XFxuICAgIDxpbnB1dFxcbiAgICAgIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiXFxuICAgICAgdHlwZT1cXFwidGV4dFxcXCJcXG4gICAgICBpZD1cXFwie3tjb21wb25lbnRJZH19LWRheVxcXCJcXG4gICAgICBuZy1tb2RlbD1cXFwiZGF0ZS5kYXlcXFwiXFxuICAgICAgbmctY2hhbmdlPVxcXCJvbkNoYW5nZSgpXFxcIlxcbiAgICAgIHN0eWxlPVxcXCJwYWRkaW5nLXJpZ2h0OiAxMHB4O1xcXCJcXG4gICAgICBwbGFjZWhvbGRlcj1cXFwie3tjb21wb25lbnQuZmllbGRzLmRheS5wbGFjZWhvbGRlcn19XFxcIlxcbiAgICAgIGRheS1wYXJ0XFxuICAgICAgY2hhcmFjdGVycz1cXFwiMlxcXCJcXG4gICAgICBtaW49XFxcIjBcXFwiXFxuICAgICAgbWF4PVxcXCIzMVxcXCJcXG4gICAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICAgIC8+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXAgY29sLXhzLTRcXFwiIG5nLWlmPVxcXCIhY29tcG9uZW50LmZpZWxkcy5tb250aC5oaWRlXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwie3tjb21wb25lbnRJZH19LW1vbnRoXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC5maWVsZHMubW9udGgucmVxdWlyZWR9XFxcIj57eyBcXFwiTW9udGhcXFwiIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvbGFiZWw+XFxuICAgIDxzZWxlY3RcXG4gICAgICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgICAgIHR5cGU9XFxcInRleHRcXFwiXFxuICAgICAgaWQ9XFxcInt7Y29tcG9uZW50SWR9fS1tb250aFxcXCJcXG4gICAgICBuZy1tb2RlbD1cXFwiZGF0ZS5tb250aFxcXCJcXG4gICAgICBuZy1jaGFuZ2U9XFxcIm9uQ2hhbmdlKClcXFwiXFxuICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICA+XFxuICAgICAgPG9wdGlvbiBuZy1yZXBlYXQ9XFxcIm1vbnRoIGluIG1vbnRoc1xcXCIgdmFsdWU9XFxcInt7JGluZGV4fX1cXFwiPnt7IG1vbnRoIH19PC9vcHRpb24+XFxuICAgIDwvc2VsZWN0PlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwIGNvbC14cy0zXFxcIiBuZy1pZj1cXFwiIWNvbXBvbmVudC5kYXlGaXJzdCAmJiAhY29tcG9uZW50LmZpZWxkcy5kYXkuaGlkZVxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcInt7Y29tcG9uZW50SWR9fS1kYXlcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LmZpZWxkcy5kYXkucmVxdWlyZWR9XFxcIj57eyBcXFwiRGF5XFxcIiB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2xhYmVsPlxcbiAgICA8aW5wdXRcXG4gICAgICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgICAgIHR5cGU9XFxcInRleHRcXFwiXFxuICAgICAgaWQ9XFxcInt7Y29tcG9uZW50SWR9fS1kYXkxXFxcIlxcbiAgICAgIG5nLW1vZGVsPVxcXCJkYXRlLmRheVxcXCJcXG4gICAgICBuZy1jaGFuZ2U9XFxcIm9uQ2hhbmdlKClcXFwiXFxuICAgICAgc3R5bGU9XFxcInBhZGRpbmctcmlnaHQ6IDEwcHg7XFxcIlxcbiAgICAgIHBsYWNlaG9sZGVyPVxcXCJ7e2NvbXBvbmVudC5maWVsZHMuZGF5LnBsYWNlaG9sZGVyfX1cXFwiXFxuICAgICAgZGF5LXBhcnRcXG4gICAgICBjaGFyYWN0ZXJzPVxcXCIyXFxcIlxcbiAgICAgIG1pbj1cXFwiMFxcXCJcXG4gICAgICBtYXg9XFxcIjMxXFxcIlxcbiAgICAgIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gICAgLz5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cCBjb2wteHMtNVxcXCIgbmctaWY9XFxcIiFjb21wb25lbnQuZmllbGRzLnllYXIuaGlkZVxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcInt7Y29tcG9uZW50SWR9fS15ZWFyXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC5maWVsZHMueWVhci5yZXF1aXJlZH1cXFwiPnt7IFxcXCJZZWFyXFxcIiB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2xhYmVsPlxcbiAgICA8aW5wdXRcXG4gICAgICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgICAgIHR5cGU9XFxcInRleHRcXFwiXFxuICAgICAgaWQ9XFxcInt7Y29tcG9uZW50SWR9fS15ZWFyXFxcIlxcbiAgICAgIG5nLW1vZGVsPVxcXCJkYXRlLnllYXJcXFwiXFxuICAgICAgbmctY2hhbmdlPVxcXCJvbkNoYW5nZSgpXFxcIlxcbiAgICAgIHN0eWxlPVxcXCJwYWRkaW5nLXJpZ2h0OiAxMHB4O1xcXCJcXG4gICAgICBwbGFjZWhvbGRlcj1cXFwie3tjb21wb25lbnQuZmllbGRzLnllYXIucGxhY2Vob2xkZXJ9fVxcXCJcXG4gICAgICBkYXktcGFydFxcbiAgICAgIGNoYXJhY3RlcnM9XFxcIjRcXFwiXFxuICAgICAgbWluPVxcXCIwXFxcIlxcbiAgICAgIG1heD1cXFwiMjEwMFxcXCJcXG4gICAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICAgIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2VtYWlsJywge1xuICAgICAgICB0aXRsZTogJ0VtYWlsJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ2VtYWlsRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZSxcbiAgICAgICAgICBraWNrYm94OiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2ZpZWxkc2V0Jywge1xuICAgICAgICB0aXRsZTogJ0ZpZWxkIFNldCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZmllbGRzZXQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBrZXk6ICdmaWVsZHNldCcsXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsZWdlbmQ6ICcnLFxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy9maWVsZHNldC5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9maWVsZHNldC5odG1sJyxcbiAgICAgICAgXCI8ZmllbGRzZXQgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcbiAgPGxlZ2VuZCBuZy1pZj1cXFwiY29tcG9uZW50LmxlZ2VuZFxcXCI+e3sgY29tcG9uZW50LmxlZ2VuZCB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2xlZ2VuZD5cXG4gIDxmb3JtaW8tY29tcG9uZW50XFxuICAgIG5nLXJlcGVhdD1cXFwiX2NvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgIGNvbXBvbmVudD1cXFwiX2NvbXBvbmVudFxcXCJcXG4gICAgZGF0YT1cXFwiZGF0YVxcXCJcXG4gICAgZm9ybWlvPVxcXCJmb3JtaW9cXFwiXFxuICAgIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiXFxuICAgIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiXFxuICAgIG5nLWlmPVxcXCJidWlsZGVyID8gJzo6dHJ1ZScgOiBpc1Zpc2libGUoX2NvbXBvbmVudCwgZGF0YSlcXFwiXFxuICAgIHJlYWQtb25seT1cXFwiaXNEaXNhYmxlZChfY29tcG9uZW50LCBkYXRhKVxcXCJcXG4gICAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICAgIGdyaWQtcm93PVxcXCJncmlkUm93XFxcIlxcbiAgICBncmlkLWNvbD1cXFwiZ3JpZENvbFxcXCJcXG4gICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gID48L2Zvcm1pby1jb21wb25lbnQ+XFxuPC9maWVsZHNldD5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvZmllbGRzZXQuaHRtbCcsXG4gICAgICAgIFwiPGZpZWxkc2V0IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxsZWdlbmQgbmctaWY9XFxcImNvbXBvbmVudC5sZWdlbmRcXFwiPnt7IGNvbXBvbmVudC5sZWdlbmQgfX08L2xlZ2VuZD5cXG4gIDxmb3JtaW8tY29tcG9uZW50LXZpZXdcXG4gICAgbmctcmVwZWF0PVxcXCJfY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIlxcbiAgICBmb3JtPVxcXCJmb3JtXFxcIlxcbiAgICBpZ25vcmU9XFxcImlnbm9yZVxcXCJcXG4gICAgbmctaWY9XFxcImJ1aWxkZXIgPyAnOjp0cnVlJyA6IGlzVmlzaWJsZShfY29tcG9uZW50LCBkYXRhKVxcXCJcXG4gICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gID48L2Zvcm1pby1jb21wb25lbnQtdmlldz5cXG48L2ZpZWxkc2V0PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdmaWxlJywge1xuICAgICAgICB0aXRsZTogJ0ZpbGUnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2ZpbGUuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnZmlsZScsXG4gICAgICAgICAgaW1hZ2U6IGZhbHNlLFxuICAgICAgICAgIGltYWdlU2l6ZTogJzIwMCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB2aWV3VGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50c1ZpZXcvZmlsZS5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9GaWxlTGlzdCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWxlczogJz0nLFxuICAgICAgICBmb3JtOiAnPScsXG4gICAgICAgIHJlYWRPbmx5OiAnPSdcbiAgICAgIH0sXG4gICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9jb21wb25lbnRzL2Zvcm1pby1maWxlLWxpc3QuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICckc2NvcGUnLFxuICAgICAgICBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICAkc2NvcGUucmVtb3ZlRmlsZSA9IGZ1bmN0aW9uKGV2ZW50LCBpbmRleCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5maWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAkc2NvcGUuZmlsZVNpemUgPSBmdW5jdGlvbihhLCBiLCBjLCBkLCBlKSB7XG4gICAgICAgICAgICByZXR1cm4gKGIgPSBNYXRoLCBjID0gYi5sb2csIGQgPSAxMDI0LCBlID0gYyhhKSAvIGMoZCkgfCAwLCBhIC8gYi5wb3coZCwgZSkpLnRvRml4ZWQoMikgKyAnICcgKyAoZSA/ICdrTUdUUEVaWSdbLS1lXSArICdCJyA6ICdCeXRlcycpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9XSk7XG5cbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvSW1hZ2VMaXN0JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpbGVzOiAnPScsXG4gICAgICAgIGZvcm06ICc9JyxcbiAgICAgICAgd2lkdGg6ICc9JyxcbiAgICAgICAgcmVhZE9ubHk6ICc9J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvZm9ybWlvLWltYWdlLWxpc3QuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICckc2NvcGUnLFxuICAgICAgICBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICAkc2NvcGUucmVtb3ZlRmlsZSA9IGZ1bmN0aW9uKGV2ZW50LCBpbmRleCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzY29wZS5maWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9XSk7XG5cbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRmlsZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWxlOiAnPScsXG4gICAgICAgIGZvcm06ICc9J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlOiAnPGEgaHJlZj1cInt7IGZpbGUudXJsIH19XCIgbmctY2xpY2s9XCJnZXRGaWxlKCRldmVudClcIiB0YXJnZXQ9XCJfYmxhbmtcIj57eyBmaWxlLm5hbWUgfX08L2E+JyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgJyR3aW5kb3cnLFxuICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICckc2NvcGUnLFxuICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHdpbmRvdyxcbiAgICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICBGb3JtaW9cbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgICAgJHNjb3BlLmdldEZpbGUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm0gPSAkc2NvcGUuZm9ybSB8fCAkcm9vdFNjb3BlLmZpbGVQYXRoO1xuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLmZvcm0pO1xuICAgICAgICAgICAgZm9ybWlvXG4gICAgICAgICAgICAgIC5kb3dubG9hZEZpbGUoJHNjb3BlLmZpbGUpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oZmlsZS51cmwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIElzIGFsZXJ0IHRoZSBiZXN0IHdheSB0byBkbyB0aGlzP1xuICAgICAgICAgICAgICAgIC8vIFVzZXIgaXMgZXhwZWN0aW5nIGFuIGltbWVkaWF0ZSBub3RpZmljYXRpb24gZHVlIHRvIGF0dGVtcHRpbmcgdG8gZG93bmxvYWQgYSBmaWxlLlxuICAgICAgICAgICAgICAgIGFsZXJ0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gIH1dKTtcblxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9JbWFnZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWxlOiAnPScsXG4gICAgICAgIGZvcm06ICc9JyxcbiAgICAgICAgd2lkdGg6ICc9J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1zcmM9XCJ7eyBpbWFnZVNyYyB9fVwiIGFsdD1cInt7IGZpbGUubmFtZSB9fVwiIG5nLXN0eWxlPVwie3dpZHRoOiB3aWR0aH1cIiAvPicsXG4gICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgJyRzY29wZScsXG4gICAgICAgICdGb3JtaW8nLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICBGb3JtaW9cbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgICAgJHNjb3BlLmZvcm0gPSAkc2NvcGUuZm9ybSB8fCAkcm9vdFNjb3BlLmZpbGVQYXRoO1xuICAgICAgICAgIHZhciBmb3JtaW8gPSBuZXcgRm9ybWlvKCRzY29wZS5mb3JtKTtcbiAgICAgICAgICBmb3JtaW8uZG93bmxvYWRGaWxlKCRzY29wZS5maWxlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICRzY29wZS5pbWFnZVNyYyA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9GaWxlVXBsb2FkJywgW1xuICAgICckc2NvcGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oXG4gICAgICAkc2NvcGUsXG4gICAgICBGb3JtaW9VdGlsc1xuICAgICkge1xuICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAkc2NvcGUuZmlsZVVwbG9hZHMgPSB7fTtcbiAgICAgICRzY29wZS5yZW1vdmVVcGxvYWQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2luZGV4XTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRoaXMgZml4ZXMgbmV3IGZpZWxkcyBoYXZpbmcgYW4gZW1wdHkgc3BhY2UgaW4gdGhlIGFycmF5LlxuICAgICAgaWYgKCRzY29wZS5kYXRhICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9PT0gJycpIHtcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gW107XG4gICAgICB9XG4gICAgICBpZiAoJHNjb3BlLmRhdGEgJiYgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XVswXSA9PT0gJycpIHtcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnNwbGljZSgwLCAxKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLnVwbG9hZCA9IGZ1bmN0aW9uKGZpbGVzKSB7XG4gICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2UgJiYgZmlsZXMgJiYgZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICAvLyBHZXQgYSB1bmlxdWUgbmFtZSBmb3IgdGhpcyBmaWxlIHRvIGtlZXAgZmlsZSBjb2xsaXNpb25zIGZyb20gb2NjdXJyaW5nLlxuICAgICAgICAgICAgdmFyIGZpbGVOYW1lID0gRm9ybWlvVXRpbHMudW5pcXVlTmFtZShmaWxlLm5hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXSA9IHtcbiAgICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgc3RhdHVzOiAnaW5mbycsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTdGFydGluZyB1cGxvYWQnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGRpciA9ICRzY29wZS5jb21wb25lbnQuZGlyIHx8ICcnO1xuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG51bGw7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmZvcm1pbykge1xuICAgICAgICAgICAgICBmb3JtaW8gPSAkc2NvcGUuZm9ybWlvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlTmFtZV0uc3RhdHVzID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5tZXNzYWdlID0gJ0ZpbGUgVXBsb2FkIFVSTCBub3QgcHJvdmlkZWQuJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvcm1pbykge1xuICAgICAgICAgICAgICBmb3JtaW8udXBsb2FkRmlsZSgkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2UsIGZpbGUsIGZpbGVOYW1lLCBkaXIsIGZ1bmN0aW9uIHByb2Nlc3NOb3RpZnkoZXZ0KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5zdGF0dXMgPSAncHJvZ3Jlc3MnO1xuICAgICAgICAgICAgICAgICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlTmFtZV0ucHJvZ3Jlc3MgPSBwYXJzZUludCgxMDAuMCAqIGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZU5hbWVdLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICB9LCAkc2NvcGUuY29tcG9uZW50LnVybClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlSW5mbykge1xuICAgICAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlTmFtZV07XG4gICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGUgZmlsZSBjb21wb25lbnQgaXMgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICEkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gfHxcbiAgICAgICAgICAgICAgICAgICAgISgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gaW5zdGFuY2VvZiBBcnJheSlcbiAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5wdXNoKGZpbGVJbmZvKTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGVOYW1lXS5tZXNzYWdlID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZU5hbWVdLnByb2dyZXNzO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oXG4gICAgICAkdGVtcGxhdGVDYWNoZVxuICAgICkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9mb3JtaW8taW1hZ2UtbGlzdC5odG1sJyxcbiAgICAgICAgXCI8ZGl2PlxcbiAgPHNwYW4gbmctcmVwZWF0PVxcXCJmaWxlIGluIGZpbGVzIHRyYWNrIGJ5ICRpbmRleFxcXCIgbmctaWY9XFxcImZpbGVcXFwiPlxcbiAgICA8Zm9ybWlvLWltYWdlIGZpbGU9XFxcImZpbGVcXFwiIGZvcm09XFxcImZvcm1cXFwiIHdpZHRoPVxcXCJ3aWR0aFxcXCI+PC9mb3JtaW8taW1hZ2U+XFxuICAgIDxzcGFuIG5nLWlmPVxcXCIhcmVhZE9ubHlcXFwiIHN0eWxlPVxcXCJ3aWR0aDoxJTt3aGl0ZS1zcGFjZTpub3dyYXA7XFxcIj5cXG4gICAgICA8YSBocmVmPVxcXCIjXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlRmlsZSgkZXZlbnQsICRpbmRleClcXFwiIHN0eWxlPVxcXCJwYWRkaW5nOiAycHggNHB4O1xcXCIgY2xhc3M9XFxcImJ0biBidG4tc20gYnRuLWRlZmF1bHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZVxcXCI+PC9zcGFuPjwvYT5cXG4gICAgPC9zcGFuPlxcbiAgPC9zcGFuPlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2Zvcm1pby1maWxlLWxpc3QuaHRtbCcsXG4gICAgICAgIFwiPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXFxcIj5cXG4gIDx0aGVhZD5cXG4gICAgPHRyPlxcbiAgICAgIDx0ZCBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6MSU7d2hpdGUtc3BhY2U6bm93cmFwO1xcXCI+PC90ZD5cXG4gICAgICA8dGg+RmlsZSBOYW1lPC90aD5cXG4gICAgICA8dGg+U2l6ZTwvdGg+XFxuICAgIDwvdHI+XFxuICA8L3RoZWFkPlxcbiAgPHRib2R5PlxcbiAgICA8dHIgbmctcmVwZWF0PVxcXCJmaWxlIGluIGZpbGVzIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxuICAgICAgPHRkIG5nLWlmPVxcXCIhcmVhZE9ubHlcXFwiIHN0eWxlPVxcXCJ3aWR0aDoxJTt3aGl0ZS1zcGFjZTpub3dyYXA7XFxcIj48YSBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBocmVmPVxcXCIjXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlRmlsZSgkZXZlbnQsICRpbmRleClcXFwiIHN0eWxlPVxcXCJwYWRkaW5nOiAycHggNHB4O1xcXCIgY2xhc3M9XFxcImJ0biBidG4tc20gYnRuLWRlZmF1bHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZVxcXCI+PC9zcGFuPjwvYT48L3RkPlxcbiAgICAgIDx0ZD48Zm9ybWlvLWZpbGUgZmlsZT1cXFwiZmlsZVxcXCIgZm9ybT1cXFwiZm9ybVxcXCI+PC9mb3JtaW8tZmlsZT48L3RkPlxcbiAgICAgIDx0ZD57eyBmaWxlU2l6ZShmaWxlLnNpemUpIH19PC90ZD5cXG4gICAgPC90cj5cXG4gIDwvdGJvZHk+XFxuPC90YWJsZT5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9maWxlLmh0bWwnLFxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBpc1JlcXVpcmVkKGNvbXBvbmVudCl9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9sYWJlbD5cXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuPGRpdiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9GaWxlVXBsb2FkXFxcIj5cXG4gIDxmb3JtaW8tZmlsZS1saXN0IGZpbGVzPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBmb3JtPVxcXCJmb3JtaW8uZm9ybVVybFxcXCIgbmctaWY9XFxcIiFjb21wb25lbnQuaW1hZ2VcXFwiPjwvZm9ybWlvLWZpbGUtbGlzdD5cXG4gIDxmb3JtaW8taW1hZ2UtbGlzdCBmaWxlcz1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgZm9ybT1cXFwiZm9ybWlvLmZvcm1VcmxcXFwiIHdpZHRoPVxcXCJjb21wb25lbnQuaW1hZ2VTaXplXFxcIiBuZy1pZj1cXFwiY29tcG9uZW50LmltYWdlXFxcIj48L2Zvcm1pby1pbWFnZS1saXN0PlxcbiAgPGRpdiBuZy1pZj1cXFwiIXJlYWRPbmx5ICYmIChjb21wb25lbnQubXVsdGlwbGUgfHwgKCFjb21wb25lbnQubXVsdGlwbGUgJiYgIWRhdGFbY29tcG9uZW50LmtleV0ubGVuZ3RoKSlcXFwiPlxcbiAgICA8ZGl2IG5nZi1kcm9wPVxcXCJ1cGxvYWQoJGZpbGVzKVxcXCIgY2xhc3M9XFxcImZpbGVTZWxlY3RvclxcXCIgbmdmLWRyYWctb3Zlci1jbGFzcz1cXFwiJ2ZpbGVEcmFnT3ZlcidcXFwiIG5nZi1tdWx0aXBsZT1cXFwiY29tcG9uZW50Lm11bHRpcGxlXFxcIiBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jbG91ZC11cGxvYWRcXFwiPjwvc3Bhbj5Ecm9wIGZpbGVzIHRvIGF0dGFjaCwgb3IgPGEgc3R5bGU9XFxcImN1cnNvcjogcG9pbnRlcjtcXFwiIG5nZi1zZWxlY3Q9XFxcInVwbG9hZCgkZmlsZXMpXFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIG5nZi1tdWx0aXBsZT1cXFwiY29tcG9uZW50Lm11bHRpcGxlXFxcIj5icm93c2U8L2E+LjwvZGl2PlxcbiAgICA8ZGl2IG5nLWlmPVxcXCIhY29tcG9uZW50LnN0b3JhZ2VcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC13YXJuaW5nXFxcIj5ObyBzdG9yYWdlIGhhcyBiZWVuIHNldCBmb3IgdGhpcyBmaWVsZC4gRmlsZSB1cGxvYWRzIGFyZSBkaXNhYmxlZCB1bnRpbCBzdG9yYWdlIGlzIHNldCB1cC48L2Rpdj5cXG4gICAgPGRpdiBuZ2Ytbm8tZmlsZS1kcm9wPkZpbGUgRHJhZy9Ecm9wIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHRoaXMgYnJvd3NlcjwvZGl2PlxcbiAgPC9kaXY+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiZmlsZVVwbG9hZCBpbiBmaWxlVXBsb2FkcyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWNsYXNzPVxcXCJ7J2hhcy1lcnJvcic6IGZpbGVVcGxvYWQuc3RhdHVzID09PSAnZXJyb3InfVxcXCIgY2xhc3M9XFxcImZpbGVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImZpbGVOYW1lIGNvbnRyb2wtbGFiZWwgY29sLXNtLTEwXFxcIj57eyBmaWxlVXBsb2FkLm5hbWUgfX0gPHNwYW4gbmctY2xpY2s9XFxcInJlbW92ZVVwbG9hZChmaWxlVXBsb2FkLm5hbWUpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiPjwvc3Bhbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJmaWxlU2l6ZSBjb250cm9sLWxhYmVsIGNvbC1zbS0yIHRleHQtcmlnaHRcXFwiPnt7IGZpbGVTaXplKGZpbGVVcGxvYWQuc2l6ZSkgfX08L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyXFxcIj5cXG4gICAgICAgIDxzcGFuIG5nLWlmPVxcXCJmaWxlVXBsb2FkLnN0YXR1cyA9PT0gJ3Byb2dyZXNzJ1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXJcXFwiIHJvbGU9XFxcInByb2dyZXNzYmFyXFxcIiBhcmlhLXZhbHVlbm93PVxcXCJ7e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fVxcXCIgYXJpYS12YWx1ZW1pbj1cXFwiMFxcXCIgYXJpYS12YWx1ZW1heD1cXFwiMTAwXFxcIiBzdHlsZT1cXFwid2lkdGg6e3tmaWxlVXBsb2FkLnByb2dyZXNzfX0lXFxcIj5cXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJzci1vbmx5XFxcIj57e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fSUgQ29tcGxldGU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwiIWZpbGVVcGxvYWQuc3RhdHVzICE9PSAncHJvZ3Jlc3MnXFxcIiBjbGFzcz1cXFwiYmcte3sgZmlsZVVwbG9hZC5zdGF0dXMgfX0gY29udHJvbC1sYWJlbFxcXCI+e3sgZmlsZVVwbG9hZC5tZXNzYWdlIH19PC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L2ZpbGUuaHRtbCcsXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvbGFiZWw+XFxuPGRpdiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9GaWxlVXBsb2FkXFxcIj5cXG4gIDxmb3JtaW8tZmlsZS1saXN0IGZpbGVzPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBmb3JtPVxcXCJmb3JtVXJsXFxcIiByZWFkLW9ubHk9XFxcInRydWVcXFwiIG5nLWlmPVxcXCIhY29tcG9uZW50LmltYWdlXFxcIj48L2Zvcm1pby1maWxlLWxpc3Q+XFxuICA8Zm9ybWlvLWltYWdlLWxpc3QgZmlsZXM9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIGZvcm09XFxcImZvcm1VcmxcXFwiIHJlYWQtb25seT1cXFwidHJ1ZVxcXCIgd2lkdGg9XFxcImNvbXBvbmVudC5pbWFnZVNpemVcXFwiIG5nLWlmPVxcXCJjb21wb25lbnQuaW1hZ2VcXFwiPjwvZm9ybWlvLWltYWdlLWxpc3Q+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEdyaWRVdGlscyA9IHJlcXVpcmUoJy4uL2ZhY3Rvcmllcy9HcmlkVXRpbHMnKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignaGlkZGVuJywge1xuICAgICAgICB0aXRsZTogJ0hpZGRlbicsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvaGlkZGVuLmh0bWwnLFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAga2V5OiAnaGlkZGVuRmllbGQnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB0YWJsZVZpZXc6IEdyaWRVdGlscy5nZW5lcmljXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2hpZGRlbi5odG1sJyxcbiAgICAgICAgXCI8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCI+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9IdG1sRWxlbWVudCcsIFtcbiAgICAnJHNhbml0aXplJyxcbiAgICAnJGZpbHRlcicsXG4gICAgZnVuY3Rpb24oJHNhbml0aXplLCAkZmlsdGVyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgIGNvbXBvbmVudDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQtZGlyZWN0aXZlLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICB2YXIgZGlzcGxheUVycm9yID0gZnVuY3Rpb24obXNnKSB7XG4gICAgICAgICAgICAkc2NvcGUucGFyc2VFcnJvciA9ICdJbnZhbGlkIEhUTUw6ICcgKyBtc2cudG9TdHJpbmcoKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY29tcG9uZW50JywgZnVuY3Rpb24gY3JlYXRlRWxlbWVudCgpIHtcbiAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC50YWcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRpc3BsYXlFcnJvcignTm8gdGFnIGdpdmVuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCc8JyArICRzY29wZS5jb21wb25lbnQudGFnICsgJz4nICsgJzwvJyArICRzY29wZS5jb21wb25lbnQudGFnICsgJz4nKTtcbiAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgkZmlsdGVyKCdmb3JtaW9UcmFuc2xhdGUnKSgkc2NvcGUuY29tcG9uZW50LmNvbnRlbnQpKTtcblxuICAgICAgICAgICAgLy8gQWRkIHRoZSBjc3MgY2xhc3NlcyBpZiBzdXBwbGllZC5cbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmNsYXNzTmFtZSkge1xuICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ2NsYXNzJywgJHNjb3BlLmNvbXBvbmVudC5jbGFzc05hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudC5hdHRycywgZnVuY3Rpb24oYXR0cikge1xuICAgICAgICAgICAgICBpZiAoIWF0dHIuYXR0cikgcmV0dXJuO1xuICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoYXR0ci5hdHRyLCBhdHRyLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAkc2NvcGUuaHRtbCA9ICRzYW5pdGl6ZShlbGVtZW50LnByb3AoJ291dGVySFRNTCcpKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnBhcnNlRXJyb3IgPSBudWxsO1xuXG4gICAgICAgICAgICAgIC8vIElmIHRoZSBzYW5pdGl6ZWQgaHRtbCBpcyBlbXB0eSwgaXQgd2FzIGludmFsaWQ7IENyZWF0ZSBhIHZpc2libGUgZXJyb3Igc28gd2Ugc3RpbGwgcmVuZGVyIHNvbWV0aGluZy5cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaHRtbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkaXNwbGF5RXJyb3IoZWxlbWVudC5wcm9wKCdvdXRlckhUTUwnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgLy8gSXNvbGF0ZSB0aGUgbWVzc2FnZSBhbmQgc3RvcmUgaXQuXG4gICAgICAgICAgICAgICRzY29wZS5wYXJzZUVycm9yID0gZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAuc3BsaXQoJ1xcbicpWzBdXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ1skc2FuaXRpemU6YmFkcGFyc2VdJywgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9O1xuICB9XSk7XG5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2h0bWxlbGVtZW50Jywge1xuICAgICAgICB0aXRsZTogJ0hUTUwgRWxlbWVudCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuaHRtbCcsXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2h0bWxlbGVtZW50Lmh0bWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGtleTogJ2h0bWwnLFxuICAgICAgICAgIGlucHV0OiBmYWxzZSxcbiAgICAgICAgICB0YWc6ICdwJyxcbiAgICAgICAgICBhdHRyczogW10sXG4gICAgICAgICAgY2xhc3NOYW1lOiAnJyxcbiAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuXG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuaHRtbCcsXG4gICAgICAgICc8Zm9ybWlvLWh0bWwtZWxlbWVudCBjb21wb25lbnQ9XCJjb21wb25lbnRcIj48L2Rpdj4nXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2h0bWxlbGVtZW50LWRpcmVjdGl2ZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcXFwiIG5nLWlmPVxcXCJwYXJzZUVycm9yXFxcIj57eyBwYXJzZUVycm9yIH19PC9kaXY+XFxuICA8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiaHRtbFxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZm9ybWlvJyk7XG5cbi8vIEJhc2ljXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKShhcHApO1xucmVxdWlyZSgnLi90ZXh0ZmllbGQnKShhcHApO1xucmVxdWlyZSgnLi9udW1iZXInKShhcHApO1xucmVxdWlyZSgnLi9wYXNzd29yZCcpKGFwcCk7XG5yZXF1aXJlKCcuL3RleHRhcmVhJykoYXBwKTtcbnJlcXVpcmUoJy4vY2hlY2tib3gnKShhcHApO1xucmVxdWlyZSgnLi9zZWxlY3Rib3hlcycpKGFwcCk7XG5yZXF1aXJlKCcuL3NlbGVjdCcpKGFwcCk7XG5yZXF1aXJlKCcuL3JhZGlvJykoYXBwKTtcbnJlcXVpcmUoJy4vaHRtbGVsZW1lbnQnKShhcHApO1xucmVxdWlyZSgnLi9jb250ZW50JykoYXBwKTtcbnJlcXVpcmUoJy4vYnV0dG9uJykoYXBwKTtcblxuLy8gU3BlY2lhbFxucmVxdWlyZSgnLi9lbWFpbCcpKGFwcCk7XG5yZXF1aXJlKCcuL3Bob25lbnVtYmVyJykoYXBwKTtcbnJlcXVpcmUoJy4vYWRkcmVzcycpKGFwcCk7XG5yZXF1aXJlKCcuL2RhdGV0aW1lJykoYXBwKTtcbnJlcXVpcmUoJy4vZGF5JykoYXBwKTtcbnJlcXVpcmUoJy4vY3VycmVuY3knKShhcHApO1xucmVxdWlyZSgnLi9oaWRkZW4nKShhcHApO1xucmVxdWlyZSgnLi9yZXNvdXJjZScpKGFwcCk7XG5yZXF1aXJlKCcuL2ZpbGUnKShhcHApO1xucmVxdWlyZSgnLi9zaWduYXR1cmUnKShhcHApO1xucmVxdWlyZSgnLi9jdXN0b20nKShhcHApO1xucmVxdWlyZSgnLi9jb250YWluZXInKShhcHApO1xucmVxdWlyZSgnLi9kYXRhZ3JpZCcpKGFwcCk7XG5yZXF1aXJlKCcuL3N1cnZleScpKGFwcCk7XG5cbi8vIExheW91dFxucmVxdWlyZSgnLi9jb2x1bW5zJykoYXBwKTtcbnJlcXVpcmUoJy4vZmllbGRzZXQnKShhcHApO1xucmVxdWlyZSgnLi9wYWdlJykoYXBwKTtcbnJlcXVpcmUoJy4vcGFuZWwnKShhcHApO1xucmVxdWlyZSgnLi90YWJsZScpKGFwcCk7XG5yZXF1aXJlKCcuL3dlbGwnKShhcHApO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICB2YXIgaXNOdW1lcmljID0gZnVuY3Rpb24gaXNOdW1lcmljKG4pIHtcbiAgICAgICAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcbiAgICAgIH07XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ251bWJlcicsIHtcbiAgICAgICAgdGl0bGU6ICdOdW1iZXInLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL251bWJlci5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgaW5wdXRUeXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICBsYWJlbDogJycsXG4gICAgICAgICAga2V5OiAnbnVtYmVyRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbjogJycsXG4gICAgICAgICAgICBtYXg6ICcnLFxuICAgICAgICAgICAgc3RlcDogJ2FueScsXG4gICAgICAgICAgICBpbnRlZ2VyOiAnJyxcbiAgICAgICAgICAgIG11bHRpcGxlOiAnJyxcbiAgICAgICAgICAgIGN1c3RvbTogJydcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47IC8vIEZPUi03MSAtIFNraXAgcGFyc2luZyBpbnB1dCBkYXRhLlxuXG4gICAgICAgICAgLy8gRW5zdXJlIHRoYXQgdmFsdWVzIGFyZSBudW1iZXJzLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICRzY29wZS5kYXRhICYmXG4gICAgICAgICAgICAkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eSgkc2NvcGUuY29tcG9uZW50LmtleSkgJiZcbiAgICAgICAgICAgIGlzTnVtZXJpYygkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0pXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBwYXJzZUZsb2F0KCRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL251bWJlci5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxpbnB1dFxcbiAgdHlwZT1cXFwie3sgY29tcG9uZW50LmlucHV0VHlwZSB9fVxcXCJcXG4gIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4gIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxuICBtaW49XFxcInt7IGNvbXBvbmVudC52YWxpZGF0ZS5taW4gfX1cXFwiXFxuICBtYXg9XFxcInt7IGNvbXBvbmVudC52YWxpZGF0ZS5tYXggfX1cXFwiXFxuICBzdGVwPVxcXCJ7eyBjb21wb25lbnQudmFsaWRhdGUuc3RlcCB9fVxcXCJcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxcIlxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gIHVpLW1hc2s9XFxcInt7IGNvbXBvbmVudC5pbnB1dE1hc2sgfX1cXFwiXFxuICB1aS1tYXNrLXBsYWNlaG9sZGVyPVxcXCJcXFwiXFxuICB1aS1vcHRpb25zPVxcXCJ1aU1hc2tPcHRpb25zXFxcIlxcbj5cXG5cIlxuICAgICAgKSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3BhZ2UnLCB7XG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvcGFnZS5odG1sJyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBrZXk6ICdwYWdlJyxcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXG4gICAgICAgICAgY29tcG9uZW50czogW11cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9wYWdlLmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tY29tcG9uZW50XFxuICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgZGF0YT1cXFwiZGF0YVxcXCJcXG4gIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiXFxuICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4+PC9mb3JtaW8tY29tcG9uZW50PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYW5lbCcsIHtcbiAgICAgICAgdGl0bGU6ICdQYW5lbCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvcGFuZWwuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBrZXk6ICdwYW5lbCcsXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICB0aGVtZTogJ2RlZmF1bHQnLFxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy9wYW5lbC5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9wYW5lbC5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC17eyBjb21wb25lbnQudGhlbWUgfX1cXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxkaXYgbmctaWY9XFxcImNvbXBvbmVudC50aXRsZVxcXCIgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyBjb21wb25lbnQudGl0bGUgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9oMz5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgIDxmb3JtaW8tY29tcG9uZW50XFxuICAgICAgbmctcmVwZWF0PVxcXCJfY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgICBjb21wb25lbnQ9XFxcIl9jb21wb25lbnRcXFwiXFxuICAgICAgZGF0YT1cXFwiZGF0YVxcXCJcXG4gICAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgICBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIlxcbiAgICAgIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiXFxuICAgICAgbmctaWY9XFxcImJ1aWxkZXIgPyAnOjp0cnVlJyA6IGlzVmlzaWJsZShfY29tcG9uZW50LCBkYXRhKVxcXCJcXG4gICAgICByZWFkLW9ubHk9XFxcImlzRGlzYWJsZWQoX2NvbXBvbmVudCwgZGF0YSlcXFwiXFxuICAgICAgZm9ybWlvLWZvcm09XFxcImZvcm1pb0Zvcm1cXFwiXFxuICAgICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgICAgZ3JpZC1jb2w9XFxcImdyaWRDb2xcXFwiXFxuICAgICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gICAgPjwvZm9ybWlvLWNvbXBvbmVudD5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzVmlldy9wYW5lbC5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC17eyBjb21wb25lbnQudGhlbWUgfX1cXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDxkaXYgbmctaWY9XFxcImNvbXBvbmVudC50aXRsZVxcXCIgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyBjb21wb25lbnQudGl0bGUgfX08L2gzPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgPGZvcm1pby1jb21wb25lbnQtdmlld1xcbiAgICAgIG5nLXJlcGVhdD1cXFwiX2NvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgICAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgICAgIGRhdGE9XFxcImRhdGFcXFwiXFxuICAgICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgICBmb3JtPVxcXCJmb3JtXFxcIlxcbiAgICAgIGlnbm9yZT1cXFwiaWdub3JlXFxcIlxcbiAgICAgIG5nLWlmPVxcXCJidWlsZGVyID8gJzo6dHJ1ZScgOiBpc1Zpc2libGUoX2NvbXBvbmVudCwgZGF0YSlcXFwiXFxuICAgICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gICAgPjwvZm9ybWlvLWNvbXBvbmVudC12aWV3PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdGl0bGU6ICdQYXNzd29yZCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAnLS0tIFBST1RFQ1RFRCAtLS0nO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXG4gICAgICAgICAgaW5wdXRUeXBlOiAncGFzc3dvcmQnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdwYXNzd29yZEZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgICBzdWZmaXg6ICcnLFxuICAgICAgICAgIHByb3RlY3RlZDogdHJ1ZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGNsZWFyT25IaWRlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncGhvbmVOdW1iZXInLCB7XG4gICAgICAgIHRpdGxlOiAnUGhvbmUgTnVtYmVyJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dE1hc2s6ICcoOTk5KSA5OTktOTk5OScsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3Bob25lbnVtYmVyRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmFkaW8nLCB7XG4gICAgICAgIHRpdGxlOiAnUmFkaW8nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3JhZGlvLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gY29tcG9uZW50LnZhbHVlcykge1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC52YWx1ZXNbaV0udmFsdWUgPT09IGRhdGEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC52YWx1ZXNbaV0ubGFiZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9LFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICdyYWRpbycsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3JhZGlvRmllbGQnLFxuICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbTogJycsXG4gICAgICAgICAgICBjdXN0b21Qcml2YXRlOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yYWRpby5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxuZy1mb3JtIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCI+XFxuICA8ZGl2IG5nLWNsYXNzPVxcXCJjb21wb25lbnQuaW5saW5lID8gJ3JhZGlvLWlubGluZScgOiAncmFkaW8nXFxcIiBuZy1yZXBlYXQ9XFxcInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcbiAgICA8bGFiZWwgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50SWQgfX0te3sgdi52YWx1ZSB9fVxcXCI+XFxuICAgICAgPGlucHV0XFxuICAgICAgICB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcbiAgICAgICAgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19LXt7IHYudmFsdWUgfX1cXFwiXFxuICAgICAgICB2YWx1ZT1cXFwie3sgdi52YWx1ZSB9fVxcXCJcXG4gICAgICAgIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4gICAgICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgICAgICAgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCJcXG4gICAgICAgIGN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxuICAgICAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICAgICAgPlxcbiAgICAgIHt7IHYubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxuICAgIDwvbGFiZWw+XFxuICA8L2Rpdj5cXG48L25nLWZvcm0+XFxuXCJcbiAgICAgICkpO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdyZXNvdXJjZScsIHtcbiAgICAgICAgdGl0bGU6ICdSZXNvdXJjZScsXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgICBpZiAoJGludGVycG9sYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGRhdGF9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZGF0YSA/IGRhdGEuX2lkIDogJyc7XG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSA/ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS1tdWx0aXBsZS5odG1sJyA6ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgZnVuY3Rpb24oJHNjb3BlLCBGb3JtaW8pIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgICB2YXIgc2V0dGluZ3MgPSAkc2NvcGUuY29tcG9uZW50O1xuICAgICAgICAgIHZhciBwYXJhbXMgPSBzZXR0aW5ncy5wYXJhbXMgfHwge307XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnJlc291cmNlTG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgIHBhcmFtcy5saW1pdCA9IDEwMDtcbiAgICAgICAgICBwYXJhbXMuc2tpcCA9IDA7XG4gICAgICAgICAgaWYgKHNldHRpbmdzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZWZhdWx0VmFsdWUgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNldHRpbmdzLnJlc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gJyc7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MucHJvamVjdCkge1xuICAgICAgICAgICAgICB1cmwgKz0gJy9wcm9qZWN0LycgKyBzZXR0aW5ncy5wcm9qZWN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmZvcm1pbyAmJiAkc2NvcGUuZm9ybWlvLnByb2plY3RVcmwpIHtcbiAgICAgICAgICAgICAgdXJsICs9ICRzY29wZS5mb3JtaW8ucHJvamVjdFVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVybCArPSAnL2Zvcm0vJyArIHNldHRpbmdzLnJlc291cmNlO1xuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG5ldyBGb3JtaW8odXJsKTtcblxuICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgaXRlbXMuXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaFN1Ym1pc3Npb25zID0gZnVuY3Rpb24oaW5wdXQsIGFwcGVuZCkge1xuICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc291cmNlTG9hZGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkc2NvcGUucmVzb3VyY2VMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgLy8gSWYgdGhleSB3aXNoIHRvIHJldHVybiBvbmx5IHNvbWUgZmllbGRzLlxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc2VsZWN0RmllbGRzKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnNlbGVjdCA9IHNldHRpbmdzLnNlbGVjdEZpZWxkcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc2VhcmNoRmllbGRzICYmIGlucHV0KSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNldHRpbmdzLnNlYXJjaEZpZWxkcywgZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgIHBhcmFtc1tmaWVsZF0gPSBpbnB1dDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIExvYWQgdGhlIHN1Ym1pc3Npb25zLlxuICAgICAgICAgICAgICBmb3JtaW8ubG9hZFN1Ym1pc3Npb25zKHtcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbnMgPSBzdWJtaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSAkc2NvcGUuc2VsZWN0SXRlbXMuY29uY2F0KHN1Ym1pc3Npb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBzdWJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gKHN1Ym1pc3Npb25zLmxlbmd0aCA+PSBwYXJhbXMubGltaXQpICYmICgkc2NvcGUuc2VsZWN0SXRlbXMubGVuZ3RoIDwgc3VibWlzc2lvbnMuc2VydmVyQ291bnQpO1xuICAgICAgICAgICAgICB9KVsnZmluYWxseSddKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNvdXJjZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIG1vcmUgaXRlbXMuXG4gICAgICAgICAgICAkc2NvcGUubG9hZE1vcmVJdGVtcyA9IGZ1bmN0aW9uKCRzZWxlY3QsICRldmVudCkge1xuICAgICAgICAgICAgICAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBwYXJhbXMuc2tpcCArPSBwYXJhbXMubGltaXQ7XG4gICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoU3VibWlzc2lvbnMobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaFN1Ym1pc3Npb25zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XSxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdyZXNvdXJjZUZpZWxkJyxcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXG4gICAgICAgICAgcmVzb3VyY2U6ICcnLFxuICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgdGVtcGxhdGU6ICc8c3Bhbj57eyBpdGVtLmRhdGEgfX08L3NwYW4+JyxcbiAgICAgICAgICBzZWxlY3RGaWVsZHM6ICcnLFxuICAgICAgICAgIHNlYXJjaEZpZWxkczogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZWZhdWx0UGVybWlzc2lvbjogJydcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBpc1JlcXVpcmVkKGNvbXBvbmVudCl9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9sYWJlbD5cXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuPHVpLXNlbGVjdCB1aS1zZWxlY3QtcmVxdWlyZWQgc2FmZS1tdWx0aXBsZS10by1zaW5nbGUgdWktc2VsZWN0LW9wZW4tb24tZm9jdXMgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCIgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgdGhlbWU9XFxcImJvb3RzdHJhcFxcXCIgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIj5cXG4gIDx1aS1zZWxlY3QtbWF0Y2ggY2xhc3M9XFxcInVpLXNlbGVjdC1tYXRjaFxcXCIgcGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX1cXFwiPlxcbiAgICA8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVxcXCJjb21wb25lbnQudGVtcGxhdGVcXFwiIGl0ZW09XFxcIiRpdGVtIHx8ICRzZWxlY3Quc2VsZWN0ZWRcXFwiIHNlbGVjdD1cXFwiJHNlbGVjdFxcXCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+XFxuICA8L3VpLXNlbGVjdC1tYXRjaD5cXG4gIDx1aS1zZWxlY3QtY2hvaWNlcyBjbGFzcz1cXFwidWktc2VsZWN0LWNob2ljZXNcXFwiIHJlcGVhdD1cXFwiaXRlbSBpbiBzZWxlY3RJdGVtcyB8IGZpbHRlcjogJHNlbGVjdC5zZWFyY2hcXFwiIHJlZnJlc2g9XFxcInJlZnJlc2hTdWJtaXNzaW9ucygkc2VsZWN0LnNlYXJjaClcXFwiIHJlZnJlc2gtZGVsYXk9XFxcIjI1MFxcXCI+XFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiaXRlbVxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXG4gICAgPGJ1dHRvbiBuZy1pZj1cXFwiaGFzTmV4dFBhZ2UgJiYgKCRpbmRleCA9PSAkc2VsZWN0Lml0ZW1zLmxlbmd0aC0xKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tc3VjY2VzcyBidG4tYmxvY2tcXFwiIG5nLWNsaWNrPVxcXCJsb2FkTW9yZUl0ZW1zKCRzZWxlY3QsICRldmVudClcXFwiIG5nLWRpc2FibGVkPVxcXCJyZXNvdXJjZUxvYWRpbmdcXFwiPkxvYWQgbW9yZS4uLjwvYnV0dG9uPlxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXG48L3VpLXNlbGVjdD5cXG48Zm9ybWlvLWVycm9ycyBuZy1pZj1cXFwiOjohYnVpbGRlclxcXCI+PC9mb3JtaW8tZXJyb3JzPlxcblwiXG4gICAgICApO1xuXG4gICAgICAvLyBDaGFuZ2UgdGhlIHVpLXNlbGVjdCB0byB1aS1zZWxlY3QgbXVsdGlwbGUuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLW11bHRpcGxlLmh0bWwnLFxuICAgICAgICAkdGVtcGxhdGVDYWNoZS5nZXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuLyplc2xpbnQgbWF4LWRlcHRoOiBbXCJlcnJvclwiLCA2XSovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1NlbGVjdEl0ZW0nLCBbXG4gICAgJyRjb21waWxlJyxcbiAgICBmdW5jdGlvbigkY29tcGlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJz0nLFxuICAgICAgICAgIGl0ZW06ICc9JyxcbiAgICAgICAgICBzZWxlY3Q6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgIGlmIChzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgICAgaWYgKHNjb3BlLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBlbGVtZW50LmFwcGVuZCgkY29tcGlsZShhbmd1bGFyLmVsZW1lbnQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pO1xuXG4gIGFwcC5kaXJlY3RpdmUoJ3VpU2VsZWN0UmVxdWlyZWQnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XG4gICAgICAgIGlmIChzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgIHZhciBvbGRJc0VtcHR5ID0gbmdNb2RlbC4kaXNFbXB0eTtcbiAgICAgICAgbmdNb2RlbC4kaXNFbXB0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHx8IG9sZElzRW1wdHkodmFsdWUpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4gIC8vIEEgZGlyZWN0aXZlIHRvIGhhdmUgdWktc2VsZWN0IG9wZW4gb24gZm9jdXNcbiAgYXBwLmRpcmVjdGl2ZSgndWlTZWxlY3RPcGVuT25Gb2N1cycsIFsnJHRpbWVvdXQnLCBmdW5jdGlvbigkdGltZW91dCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlOiAndWlTZWxlY3QnLFxuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSwgZWwsIGF0dHJzLCB1aVNlbGVjdCkge1xuICAgICAgICBpZiAoJHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgdmFyIGF1dG9vcGVuID0gdHJ1ZTtcblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQodWlTZWxlY3QuZm9jdXNzZXIpLm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChhdXRvb3Blbikge1xuICAgICAgICAgICAgdWlTZWxlY3QuYWN0aXZhdGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERpc2FibGUgdGhlIGF1dG8gb3BlbiB3aGVuIHRoaXMgc2VsZWN0IGVsZW1lbnQgaGFzIGJlZW4gYWN0aXZhdGVkLlxuICAgICAgICAkc2NvcGUuJG9uKCd1aXM6YWN0aXZhdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdXRvb3BlbiA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1lbmFibGUgdGhlIGF1dG8gb3BlbiBhZnRlciB0aGUgc2VsZWN0IGVsZW1lbnQgaGFzIGJlZW4gY2xvc2VkXG4gICAgICAgICRzY29wZS4kb24oJ3VpczpjbG9zZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGF1dG9vcGVuID0gZmFsc2U7XG4gICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdXRvb3BlbiA9IHRydWU7XG4gICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG4gIC8vIENvbmZpZ3VyZSB0aGUgU2VsZWN0IGNvbXBvbmVudC5cbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NlbGVjdCcsIHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QnLFxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgPyAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0LW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSkge1xuICAgICAgICAgIHZhciBnZXRJdGVtID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc3dpdGNoIChjb21wb25lbnQuZGF0YVNyYykge1xuICAgICAgICAgICAgICBjYXNlICd2YWx1ZXMnOlxuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5kYXRhLnZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnZhbHVlID09PSBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RJdGVtcztcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbihjb21wb25lbnQuZGF0YS5qc29uKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtW2NvbXBvbmVudC52YWx1ZVByb3BlcnR5XSA9PT0gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgIC8vIFRPRE86IGltcGxlbWVudCB1cmwgYW5kIHJlc291cmNlIHZpZXcuXG4gICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlJzpcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGdldEl0ZW0pLnJlZHVjZShmdW5jdGlvbihwcmV2LCBpdGVtKSB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIChwcmV2ID09PSAnJyA/ICcnIDogJywgJykgKyB2YWx1ZTtcbiAgICAgICAgICAgIH0sICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGdldEl0ZW0oZGF0YSk7XG4gICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICckaHR0cCcsXG4gICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgJyRpbnRlcnBvbGF0ZScsXG4gICAgICAgICAgJyRxJyxcbiAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAkaHR0cCxcbiAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICRpbnRlcnBvbGF0ZSxcbiAgICAgICAgICAgICRxXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBGT1ItNzEgLSBTa2lwIGZ1bmN0aW9uYWxpdHkgaW4gdGhlIGJ1aWxkZXIgdmlldy5cbiAgICAgICAgICAgIGlmICgkc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgICAkc2NvcGUubm93cmFwID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5oYXNOZXh0UGFnZSA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgICB2YXIgaW5pdGlhbGl6ZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgaW5pdGlhbGl6ZWQucHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3NlbGVjdExvYWRlZCcsICRzY29wZS5jb21wb25lbnQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSAkc2NvcGUuY29tcG9uZW50LnNlbGVjdFZhbHVlcztcbiAgICAgICAgICAgIHZhciB2YWx1ZVByb3AgPSAkc2NvcGUuY29tcG9uZW50LnZhbHVlUHJvcGVydHk7XG4gICAgICAgICAgICAkc2NvcGUuZ2V0U2VsZWN0SXRlbSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhU3JjID09PSAndmFsdWVzJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQWxsb3cgZG90IG5vdGF0aW9uIGluIHRoZSB2YWx1ZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgICAgaWYgKHZhbHVlUHJvcC5pbmRleE9mKCcuJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gdmFsdWVQcm9wLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgdmFyIHByb3AgPSBpdGVtO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcGFydHMpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwcm9wLmhhc093blByb3BlcnR5KHBhcnRzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwYXJ0c1tpXV07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlUHJvcCA/IGl0ZW1bdmFsdWVQcm9wXSA6IGl0ZW07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zID0gYW5ndWxhci5ub29wO1xuICAgICAgICAgICAgJHNjb3BlLiRvbigncmVmcmVzaExpc3QnLCBmdW5jdGlvbihldmVudCwgdXJsLCBpbnB1dCkge1xuICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zKGlucHV0LCB1cmwpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBhIHdhdGNoIGlmIHRoZXkgd2lzaCB0byByZWZyZXNoIG9uIHNlbGVjdGlvbiBvZiBhbm90aGVyIGZpZWxkLlxuICAgICAgICAgICAgdmFyIHJlZnJlc2hXYXRjaCwgcmVmcmVzaFdhdGNoUm93O1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzLnJlZnJlc2hPbikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIG9sZCB3YXRjaC5cbiAgICAgICAgICAgICAgdmFyIHJlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgaWYgKHJlZnJlc2hXYXRjaCkgcmVmcmVzaFdhdGNoKCk7XG4gICAgICAgICAgICAgIGlmIChyZWZyZXNoV2F0Y2hSb3cpIHJlZnJlc2hXYXRjaFJvdygpO1xuXG4gICAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIGRhdGEuXG4gICAgICAgICAgICAgIHZhciByZWZyZXNoVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVmcmVzaGluZykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWZyZXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcERhdGEgPSAkc2NvcGUuZGF0YVtzZXR0aW5ncy5rZXldO1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhW3NldHRpbmdzLmtleV0gPSBzZXR0aW5ncy5tdWx0aXBsZSA/IFtdIDogJyc7XG4gICAgICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5jbGVhck9uUmVmcmVzaCkge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbc2V0dGluZ3Mua2V5XSA9IHRlbXBEYXRhO1xuICAgICAgICAgICAgICAgICAgICByZWZyZXNoaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc2VsZWN0TG9hZGVkJywgJHNjb3BlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzZWxlY3RMb2FkZWQnLCAkc2NvcGUuY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgdmFsdWUuXG4gICAgICAgICAgICAgIHZhciByZWZyZXNoVmFsdWVXaGVuUmVhZHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZC5wcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVmcmVzaFByb21pc2UgPSAkc2NvcGUucmVmcmVzaEl0ZW1zKCk7XG4gICAgICAgICAgICAgICAgICBpZiAocmVmcmVzaFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVmcmVzaFByb21pc2UudGhlbihyZWZyZXNoVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZnJlc2hWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MucmVmcmVzaE9uID09PSAnZGF0YScpIHtcbiAgICAgICAgICAgICAgICByZWZyZXNoV2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdkYXRhJywgcmVmcmVzaFZhbHVlV2hlblJlYWR5LCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByZWZyZXNoV2F0Y2hSb3cgPSAkc2NvcGUuJHdhdGNoKCdkYXRhLicgKyBzZXR0aW5ncy5yZWZyZXNoT24sIHJlZnJlc2hWYWx1ZVdoZW5SZWFkeSk7XG4gICAgICAgICAgICAgIHJlZnJlc2hXYXRjaCA9ICRzY29wZS4kd2F0Y2goJ3N1Ym1pc3Npb24uZGF0YS4nICsgc2V0dGluZ3MucmVmcmVzaE9uLCByZWZyZXNoVmFsdWVXaGVuUmVhZHkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKHNldHRpbmdzLmRhdGFTcmMpIHtcbiAgICAgICAgICAgICAgY2FzZSAndmFsdWVzJzpcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBzZXR0aW5ncy5kYXRhLnZhbHVlcztcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgICAgIHZhciBpdGVtcztcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IHJlc3VsdC5cbiAgICAgICAgICAgICAgICB2YXIgc2V0UmVzdWx0ID0gZnVuY3Rpb24oZGF0YSwgYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICAvLyBjb2VyY2UgdGhlIGRhdGEgaW50byBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgIGlmICghKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoIDwgb3B0aW9ucy5wYXJhbXMubGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9ICRzY29wZS5zZWxlY3RJdGVtcy5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmNvbXBvbmVudC5kYXRhLmpzb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbigkc2NvcGUuY29tcG9uZW50LmRhdGEuanNvbik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgJHNjb3BlLmNvbXBvbmVudC5kYXRhLmpzb24gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gJHNjb3BlLmNvbXBvbmVudC5kYXRhLmpzb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBkb3Qgbm90YXRpb24gaW4gdGhlIHNlbGVjdFZhbHVlIHByb3BlcnR5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmluZGV4T2YoJy4nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSBzZWxlY3RWYWx1ZXMuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ID0gaXRlbXM7XG4gICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBwYXJ0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ID0gc2VsZWN0W3BhcnRzW2ldXTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBzZWxlY3Q7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtc1tzZWxlY3RWYWx1ZXNdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdFcnJvciBwYXJzaW5nIEpTT04gaW4gJyArICRzY29wZS5jb21wb25lbnQua2V5LCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wdGlvbnMucGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgbGltaXQ6ICRzY29wZS5jb21wb25lbnQubGltaXQgfHwgMjAsXG4gICAgICAgICAgICAgICAgICBza2lwOiAwXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHZhciBsYXN0SW5wdXQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcyA9IGZ1bmN0aW9uKGlucHV0LCB1cmwsIGFwcGVuZCkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhleSB0eXBlZCBpbiBhIHNlYXJjaCwgcmVzZXQgc2tpcC5cbiAgICAgICAgICAgICAgICAgIGlmIChsYXN0SW5wdXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbnB1dCA9IGlucHV0O1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcy5za2lwID0gMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RJdGVtcyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zID0gc2VsZWN0SXRlbXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHZpc2libGUgc3RyaW5nIGZyb20gdGhlIGludGVycG9sYXRlZCBpdGVtLlxuICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRpbnRlcnBvbGF0ZSgkc2NvcGUuY29tcG9uZW50LnRlbXBsYXRlKSh7aXRlbTogaXRlbX0pLnJlcGxhY2UoLzwoPzoufFxcbikqPz4vZ20sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKCRzY29wZS5jb21wb25lbnQuZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzdGFydHNXaXRoJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihpbnB1dC50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdjb250YWlucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUudG9Mb3dlckNhc2UoKS5sYXN0SW5kZXhPZihpbnB1dC50b0xvd2VyQ2FzZSgpLCAwKSA9PT0gMDtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbXMgPSBzZWxlY3RJdGVtcy5zbGljZShvcHRpb25zLnBhcmFtcy5za2lwLCBvcHRpb25zLnBhcmFtcy5za2lwICsgb3B0aW9ucy5wYXJhbXMubGltaXQpO1xuICAgICAgICAgICAgICAgICAgc2V0UmVzdWx0KHNlbGVjdEl0ZW1zLCBhcHBlbmQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcygpO1xuXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gXy5jbG9uZURlZXAoJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3cgPSBfLmNsb25lRGVlcCgkc2NvcGUuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW51c2VkLXZhcnMgKi9cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gZXZhbCgnKGZ1bmN0aW9uKGRhdGEsIHJvdykgeyB2YXIgdmFsdWVzID0gW107JyArIHNldHRpbmdzLmRhdGEuY3VzdG9tLnRvU3RyaW5nKCkgKyAnOyByZXR1cm4gdmFsdWVzOyB9KShkYXRhLCByb3cpJyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpbml0aWFsaXplZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlJzpcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhdGFTcmMgPT09ICd1cmwnKSB7XG4gICAgICAgICAgICAgICAgICB1cmwgPSBzZXR0aW5ncy5kYXRhLnVybDtcbiAgICAgICAgICAgICAgICAgIGlmICh1cmwuc3Vic3RyKDAsIDEpID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gRm9ybWlvLmdldEJhc2VVcmwoKSArIHNldHRpbmdzLmRhdGEudXJsO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIGF1dGggZm9yIG91dGdvaW5nIHJlcXVlc3RzLlxuICAgICAgICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5hdXRoZW50aWNhdGUgJiYgdXJsLmluZGV4T2YoRm9ybWlvLmdldEJhc2VVcmwoKSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGlzYWJsZUpXVCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVycy5QcmFnbWEgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHVybCA9IEZvcm1pby5nZXRCYXNlVXJsKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGF0YS5wcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHVybCArPSAnL3Byb2plY3QvJyArIHNldHRpbmdzLmRhdGEucHJvamVjdDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHVybCArPSAnL2Zvcm0vJyArIHNldHRpbmdzLmRhdGEucmVzb3VyY2UgKyAnL3N1Ym1pc3Npb24nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9wdGlvbnMucGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgbGltaXQ6ICRzY29wZS5jb21wb25lbnQubGltaXQgfHwgMTAwLFxuICAgICAgICAgICAgICAgICAgc2tpcDogMFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZE1vcmVJdGVtcyA9IGZ1bmN0aW9uKCRzZWxlY3QsICRldmVudCkge1xuICAgICAgICAgICAgICAgICAgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcy5za2lwICs9IG9wdGlvbnMucGFyYW1zLmxpbWl0O1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcyhudWxsLCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdExvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5oYXNOZXh0UGFnZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zID0gZnVuY3Rpb24oaW5wdXQsIG5ld1VybCwgYXBwZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1VybCA9IG5ld1VybCB8fCB1cmw7XG4gICAgICAgICAgICAgICAgICAgIG5ld1VybCA9ICRpbnRlcnBvbGF0ZShuZXdVcmwpKHtcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhOiAkc2NvcGUuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICBmb3JtaW9CYXNlOiAkcm9vdFNjb3BlLmFwaUJhc2UgfHwgJ2h0dHBzOi8vYXBpLmZvcm0uaW8nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ld1VybCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdCB3YW50IHRvIGNhbGwgaWYgaXQgaXMgYWxyZWFkeSBsb2FkaW5nLlxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdExvYWRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2VhcmNoLCB0aGVuIGFkZCB0aGF0IHRvIHRoZSBmaWx0ZXIuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWFyY2hGaWVsZCAmJiBpbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgIG5ld1VybCArPSAoKG5ld1VybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdzLnNlYXJjaEZpZWxkKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPScgK1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgb3RoZXIgZmlsdGVyLlxuICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbHRlciA9ICRpbnRlcnBvbGF0ZShzZXR0aW5ncy5maWx0ZXIpKHtkYXRhOiAkc2NvcGUuZGF0YX0pO1xuICAgICAgICAgICAgICAgICAgICAgIG5ld1VybCArPSAoKG5ld1VybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgKyBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGV5IHdpc2ggdG8gcmV0dXJuIG9ubHkgc29tZSBmaWVsZHMuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWxlY3RGaWVsZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnBhcmFtcy5zZWxlY3QgPSBzZXR0aW5ncy5zZWxlY3RGaWVsZHM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyByZXN1bHQuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZXRSZXN1bHQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY29lcmNlIHRoZSBkYXRhIGludG8gYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCEoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5sZW5ndGggPCBvcHRpb25zLnBhcmFtcy5saW1pdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChhcHBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9ICRzY29wZS5zZWxlY3RJdGVtcy5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdExvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KG5ld1VybCwgb3B0aW9ucykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0VmFsdWUgcHJvcCBpcyBkZWZpbmVkLCB1c2UgaXQuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldFJlc3VsdChfLmdldChkYXRhLCBzZWxlY3RWYWx1ZXMsIFtdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBdHRlbXB0IHRvIGRlZmF1bHQgdG8gdGhlIGZvcm1pbyBzZXR0aW5ncyBmb3IgYSByZXNvdXJjZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2RhdGEnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSZXN1bHQoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2l0ZW1zJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVzdWx0KGRhdGEuaXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBkYXRhIGl0c2VsZi5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSZXN1bHQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVsnZmluYWxseSddKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgIGluaXRpYWxpemVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdzZWxlY3RGaWVsZCcsXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgICBqc29uOiAnJyxcbiAgICAgICAgICAgIHVybDogJycsXG4gICAgICAgICAgICByZXNvdXJjZTogJycsXG4gICAgICAgICAgICBjdXN0b206ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRhU3JjOiAndmFsdWVzJyxcbiAgICAgICAgICB2YWx1ZVByb3BlcnR5OiAnJyxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxuICAgICAgICAgIHJlZnJlc2hPbjogJycsXG4gICAgICAgICAgZmlsdGVyOiAnJyxcbiAgICAgICAgICBhdXRoZW50aWNhdGU6IGZhbHNlLFxuICAgICAgICAgIHRlbXBsYXRlOiAnPHNwYW4+e3sgaXRlbS5sYWJlbCB9fTwvc3Bhbj4nLFxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICBjbGVhck9uSGlkZTogdHJ1ZSxcbiAgICAgICAgICB2YWxpZGF0ZToge1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC5odG1sJyxcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgIGZvcj1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGlzUmVxdWlyZWQoY29tcG9uZW50KX1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2xhYmVsPlxcbjxzcGFuIG5nLWlmPVxcXCIhY29tcG9uZW50LmxhYmVsICYmIGlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG48dWktc2VsZWN0XFxuICB1aS1zZWxlY3QtcmVxdWlyZWRcXG4gIHVpLXNlbGVjdC1vcGVuLW9uLWZvY3VzXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXG4gIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIG5nLXJlcXVpcmVkPVxcXCJpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICB0aGVtZT1cXFwiYm9vdHN0cmFwXFxcIlxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4+XFxuICA8dWktc2VsZWN0LW1hdGNoIGNsYXNzPVxcXCJ1aS1zZWxlY3QtbWF0Y2hcXFwiIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxcIj5cXG4gICAgPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cXFwiY29tcG9uZW50LnRlbXBsYXRlXFxcIiBpdGVtPVxcXCIkaXRlbSB8fCAkc2VsZWN0LnNlbGVjdGVkXFxcIiBzZWxlY3Q9XFxcIiRzZWxlY3RcXFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPlxcbiAgPC91aS1zZWxlY3QtbWF0Y2g+XFxuICA8dWktc2VsZWN0LWNob2ljZXMgY2xhc3M9XFxcInVpLXNlbGVjdC1jaG9pY2VzXFxcIiByZXBlYXQ9XFxcImdldFNlbGVjdEl0ZW0oaXRlbSkgYXMgaXRlbSBpbiBzZWxlY3RJdGVtcyB8IGZpbHRlcjogJHNlbGVjdC5zZWFyY2hcXFwiIHJlZnJlc2g9XFxcInJlZnJlc2hJdGVtcygkc2VsZWN0LnNlYXJjaClcXFwiIHJlZnJlc2gtZGVsYXk9XFxcIjI1MFxcXCI+XFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiaXRlbVxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXG4gICAgPGJ1dHRvbiBuZy1pZj1cXFwiaGFzTmV4dFBhZ2UgJiYgKCRpbmRleCA9PSAkc2VsZWN0Lml0ZW1zLmxlbmd0aC0xKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tc3VjY2VzcyBidG4tYmxvY2tcXFwiIG5nLWNsaWNrPVxcXCJsb2FkTW9yZUl0ZW1zKCRzZWxlY3QsICRldmVudClcXFwiIG5nLWRpc2FibGVkPVxcXCJzZWxlY3RMb2FkaW5nXFxcIj5Mb2FkIG1vcmUuLi48L2J1dHRvbj5cXG4gIDwvdWktc2VsZWN0LWNob2ljZXM+XFxuPC91aS1zZWxlY3Q+XFxuPGRpdiBuZy1pZj1cXFwiISFjb21wb25lbnQuZGVzY3JpcHRpb25cXFwiIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIj5cXG4gIDxzcGFuPnt7IGNvbXBvbmVudC5kZXNjcmlwdGlvbiB9fTwvc3Bhbj5cXG48L2Rpdj5cXG48Zm9ybWlvLWVycm9ycyBuZy1pZj1cXFwiOjohYnVpbGRlclxcXCI+PC9mb3JtaW8tZXJyb3JzPlxcblwiXG4gICAgICApO1xuXG4gICAgICAvLyBDaGFuZ2UgdGhlIHVpLXNlbGVjdCB0byB1aS1zZWxlY3QgbXVsdGlwbGUuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC1tdWx0aXBsZS5odG1sJyxcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCcpLnJlcGxhY2UoJzx1aS1zZWxlY3QnLCAnPHVpLXNlbGVjdCBtdWx0aXBsZScpXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvU2VsZWN0Qm94ZXMnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY29tcG9uZW50OiAnPScsXG4gICAgICAgIGNvbXBvbmVudElkOiAnPScsXG4gICAgICAgIHJlYWRPbmx5OiAnPScsXG4gICAgICAgIG1vZGVsOiAnPW5nTW9kZWwnLFxuICAgICAgICBncmlkUm93OiAnPScsXG4gICAgICAgIGdyaWRDb2w6ICc9JyxcbiAgICAgICAgYnVpbGRlcjogJz0/J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMtZGlyZWN0aXZlLmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlLCBlbCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm47XG4gICAgICAgIC8vIEluaXRpYWxpemUgbW9kZWxcbiAgICAgICAgdmFyIG1vZGVsID0ge307XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50LnZhbHVlcywgZnVuY3Rpb24odikge1xuICAgICAgICAgIG1vZGVsW3YudmFsdWVdID0gbmdNb2RlbC4kdmlld1ZhbHVlLmhhc093blByb3BlcnR5KHYudmFsdWUpXG4gICAgICAgICAgICA/ICEhbmdNb2RlbC4kdmlld1ZhbHVlW3YudmFsdWVdXG4gICAgICAgICAgICA6IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gRkEtODM1IC0gVXBkYXRlIHRoZSB2aWV3IG1vZGVsIHdpdGggb3VyIGRlZmF1bHRzLlxuICAgICAgICAvLyBGQS05MjEgLSBBdHRlbXB0IHRvIGxvYWQgYSBjdXJyZW50IG1vZGVsLCBpZiBwcmVzZW50IGJlZm9yZSB0aGUgZGVmYXVsdHMuXG4gICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgkc2NvcGUubW9kZWwgfHwgbW9kZWwpO1xuXG4gICAgICAgIG5nTW9kZWwuJHNldFByaXN0aW5lKHRydWUpO1xuICAgICAgICBuZ01vZGVsLiRpc0VtcHR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiAhdmFsdWVba2V5XTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudG9nZ2xlQ2hlY2tib3ggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHZhciBfbW9kZWwgPSBhbmd1bGFyLmNvcHkobmdNb2RlbC4kdmlld1ZhbHVlIHx8IHt9KTtcbiAgICAgICAgICBfbW9kZWxbdmFsdWVdID0gIV9tb2RlbFt2YWx1ZV07XG4gICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKF9tb2RlbCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdzZWxlY3Rib3hlcycsIHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgQm94ZXMnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGlmICghZGF0YSkgcmV0dXJuICcnO1xuXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpXG4gICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XG4gICAgICAgICAgfSlcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudC52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgIGlmIChpdGVtLnZhbHVlID09PSBkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGl0ZW0ubGFiZWw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuam9pbignLCAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3NlbGVjdGJveGVzRmllbGQnLFxuICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLWRpcmVjdGl2ZS5odG1sJyxcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJzZWxlY3QtYm94ZXNcXFwiPlxcbiAgPGRpdiBuZy1jbGFzcz1cXFwiY29tcG9uZW50LmlubGluZSA/ICdjaGVja2JveC1pbmxpbmUnIDogJ2NoZWNrYm94J1xcXCIgbmctcmVwZWF0PVxcXCJ2IGluIGNvbXBvbmVudC52YWx1ZXMgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgPGxhYmVsIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudElkIH19LXt7IHYudmFsdWUgfX1cXFwiPlxcbiAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCJcXG4gICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX0te3sgdi52YWx1ZSB9fVxcXCJcXG4gICAgICAgIHZhbHVlPVxcXCJ7eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgICAgICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgICAgbmctY2xpY2s9XFxcInRvZ2dsZUNoZWNrYm94KHYudmFsdWUpXFxcIlxcbiAgICAgICAgbmctY2hlY2tlZD1cXFwibW9kZWxbdi52YWx1ZV1cXFwiXFxuICAgICAgICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gICAgICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICAgID5cXG4gICAgICB7eyB2LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fVxcbiAgICA8L2xhYmVsPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLmh0bWwnLFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcInNlbGVjdC1ib3hlc1xcXCI+XFxuICA8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogaXNSZXF1aXJlZChjb21wb25lbnQpfVxcXCI+XFxuICAgIHt7IGNvbXBvbmVudC5sYWJlbCB9fVxcbiAgPC9sYWJlbD5cXG4gIDxmb3JtaW8tc2VsZWN0LWJveGVzXFxuICAgIG5hbWU9XFxcInt7Y29tcG9uZW50SWR9fVxcXCJcXG4gICAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICAgIG5nLW1vZGVsLW9wdGlvbnM9XFxcInthbGxvd0ludmFsaWQ6IHRydWV9XFxcIlxcbiAgICBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCJcXG4gICAgY29tcG9uZW50LWlkPVxcXCJjb21wb25lbnRJZFxcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCJcXG4gICAgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCJcXG4gICAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgPjwvZm9ybWlvLXNlbGVjdC1ib3hlcz5cXG4gIDxkaXYgbmctaWY9XFxcIiEhY29tcG9uZW50LmRlc2NyaXB0aW9uXFxcIiBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCI+XFxuICAgIDxzcGFuPnt7IGNvbXBvbmVudC5kZXNjcmlwdGlvbiB9fTwvc3Bhbj5cXG4gIDwvZGl2PlxcbiAgPGZvcm1pby1lcnJvcnMgbmctaWY9XFxcIjo6IWJ1aWxkZXJcXFwiPjwvZm9ybWlvLWVycm9ycz5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignc2lnbmF0dXJlJywge1xuICAgICAgICB0aXRsZTogJ1NpZ25hdHVyZScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvc2lnbmF0dXJlLmh0bWwnLFxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YSA/ICdZZXMnIDogJ05vJztcbiAgICAgICAgfSxcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IHRydWUsXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICdzaWduYXR1cmUnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBmb290ZXI6ICdTaWduIGFib3ZlJyxcbiAgICAgICAgICB3aWR0aDogJzEwMCUnLFxuICAgICAgICAgIGhlaWdodDogJzE1MCcsXG4gICAgICAgICAgcGVuQ29sb3I6ICdibGFjaycsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAncmdiKDI0NSwyNDUsMjM1KScsXG4gICAgICAgICAgbWluV2lkdGg6ICcwLjUnLFxuICAgICAgICAgIG1heFdpZHRoOiAnMi41JyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdmlld1RlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHNWaWV3L3NpZ25hdHVyZS5odG1sJ1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiAgYXBwLmRpcmVjdGl2ZSgnc2lnbmF0dXJlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjb21wb25lbnQ6ICc9J1xuICAgICAgfSxcbiAgICAgIHJlcXVpcmU6ICc/bmdNb2RlbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgaWYgKHNjb3BlLmJ1aWxkZXIpIHJldHVybjtcbiAgICAgICAgaWYgKCFuZ01vZGVsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgbGFiZWwgb2YgY29tcG9uZW50IGZvciBlcnJvciBkaXNwbGF5LlxuICAgICAgICBzY29wZS5jb21wb25lbnQubGFiZWwgPSAnU2lnbmF0dXJlJztcbiAgICAgICAgc2NvcGUuY29tcG9uZW50LmhpZGVMYWJlbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgZGltZW5zaW9uIG9mIGEgd2lkdGggb3IgaGVpZ2h0LlxuICAgICAgICB2YXIgc2V0RGltZW5zaW9uID0gZnVuY3Rpb24oZGltKSB7XG4gICAgICAgICAgdmFyIHBhcmFtID0gKGRpbSA9PT0gJ3dpZHRoJykgPyAnY2xpZW50V2lkdGgnIDogJ2NsaWVudEhlaWdodCc7XG4gICAgICAgICAgaWYgKHNjb3BlLmNvbXBvbmVudFtkaW1dLnNsaWNlKC0xKSA9PT0gJyUnKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9IHBhcnNlRmxvYXQoc2NvcGUuY29tcG9uZW50W2RpbV0uc2xpY2UoMCwgLTEpKSAvIDEwMDtcbiAgICAgICAgICAgIGVsZW1lbnRbMF1bZGltXSA9IGVsZW1lbnQucGFyZW50KCkuZXEoMClbMF1bcGFyYW1dICogcGVyY2VudDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50WzBdW2RpbV0gPSBwYXJzZUludChzY29wZS5jb21wb25lbnRbZGltXSwgMTApO1xuICAgICAgICAgICAgc2NvcGUuY29tcG9uZW50W2RpbV0gPSBlbGVtZW50WzBdW2RpbV0gKyAncHgnO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGNhbnZhcy5cbiAgICAgICAgLy8gUmVzZXQgc2l6ZSBpZiBlbGVtZW50IGNoYW5nZXMgdmlzaWJpbGl0eS5cbiAgICAgICAgc2NvcGUuJHdhdGNoKCdjb21wb25lbnQuZGlzcGxheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNldERpbWVuc2lvbignd2lkdGgnKTtcbiAgICAgICAgICBzZXREaW1lbnNpb24oJ2hlaWdodCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHNpZ25hdHVyZSBwYWQuXG4gICAgICAgIC8qIGdsb2JhbCBTaWduYXR1cmVQYWQ6ZmFsc2UgKi9cbiAgICAgICAgdmFyIHNpZ25hdHVyZVBhZCA9IG5ldyBTaWduYXR1cmVQYWQoZWxlbWVudFswXSwge1xuICAgICAgICAgIG1pbldpZHRoOiBzY29wZS5jb21wb25lbnQubWluV2lkdGgsXG4gICAgICAgICAgbWF4V2lkdGg6IHNjb3BlLmNvbXBvbmVudC5tYXhXaWR0aCxcbiAgICAgICAgICBwZW5Db2xvcjogc2NvcGUuY29tcG9uZW50LnBlbkNvbG9yLFxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogc2NvcGUuY29tcG9uZW50LmJhY2tncm91bmRDb2xvclxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5wZW5Db2xvcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLnBlbkNvbG9yID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnY29tcG9uZW50LmJhY2tncm91bmRDb2xvcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IG5ld1ZhbHVlO1xuICAgICAgICAgIHNpZ25hdHVyZVBhZC5jbGVhcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhciB0aGUgc2lnbmF0dXJlLlxuICAgICAgICBzY29wZS5jb21wb25lbnQuY2xlYXJTaWduYXR1cmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuY2xlYXIoKTtcbiAgICAgICAgICByZWFkU2lnbmF0dXJlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IHNvbWUgQ1NTIHByb3BlcnRpZXMuXG4gICAgICAgIGVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICc0cHgnLFxuICAgICAgICAgICdib3gtc2hhZG93JzogJzAgMCA1cHggcmdiYSgwLCAwLCAwLCAwLjAyKSBpbnNldCcsXG4gICAgICAgICAgJ2JvcmRlcic6ICcxcHggc29saWQgI2Y0ZjRmNCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZFNpZ25hdHVyZSgpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuJHBhcmVudC5pc1JlcXVpcmVkKHNjb3BlLmNvbXBvbmVudCkgJiYgc2lnbmF0dXJlUGFkLmlzRW1wdHkoKSkge1xuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoc2lnbmF0dXJlUGFkLnRvRGF0YVVSTCgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzaWduYXR1cmVQYWQuZnJvbURhdGFVUkwobmdNb2RlbC4kdmlld1ZhbHVlKTtcbiAgICAgICAgfTtcbiAgICAgICAgc2lnbmF0dXJlUGFkLm9uRW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuJGV2YWxBc3luYyhyZWFkU2lnbmF0dXJlKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiAgYXBwLnJ1bihbXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAnRm9ybWlvVXRpbHMnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLFxuICAgICAgICAgICAgICBGb3JtaW9VdGlscykge1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zaWduYXR1cmUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcbiAgICAgICAgXCI8ZGl2IG5nLWlmPVxcXCJyZWFkT25seVxcXCI+XFxuICA8ZGl2IG5nLWlmPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldID09PSAnWUVTJ1xcXCI+XFxuICAgIFsgU2lnbmF0dXJlIGlzIGhpZGRlbiBdXFxuICA8L2Rpdj5cXG4gIDxkaXYgbmctaWY9XFxcImRhdGFbY29tcG9uZW50LmtleV0gIT09ICdZRVMnXFxcIj5cXG4gICAgPGltZyBjbGFzcz1cXFwic2lnbmF0dXJlXFxcIiBuZy1hdHRyLXNyYz1cXFwie3tkYXRhW2NvbXBvbmVudC5rZXldfX1cXFwiIHNyYz1cXFwiXFxcIiAvPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6IHt7IGNvbXBvbmVudC53aWR0aCB9fTsgaGVpZ2h0OiB7eyBjb21wb25lbnQuaGVpZ2h0IH19O1xcXCI+XFxuICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi14cyBidG4tZGVmYXVsdFxcXCIgc3R5bGU9XFxcInBvc2l0aW9uOmFic29sdXRlOyBsZWZ0OiAwOyB0b3A6IDA7IHotaW5kZXg6IDEwMDBcXFwiIG5nLWNsaWNrPVxcXCJjb21wb25lbnQuY2xlYXJTaWduYXR1cmUoKVxcXCI+XFxuICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcXFwiPjwvc3Bhbj5cXG4gIDwvYT5cXG4gIDxjYW52YXMgc2lnbmF0dXJlIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCIgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIG5nLXJlcXVpcmVkPVxcXCJpc1JlcXVpcmVkKGNvbXBvbmVudClcXFwiPjwvY2FudmFzPlxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybWlvLXNpZ25hdHVyZS1mb290ZXJcXFwiIHN0eWxlPVxcXCJ0ZXh0LWFsaWduOiBjZW50ZXI7Y29sb3I6I0MzQzNDMztcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogaXNSZXF1aXJlZChjb21wb25lbnQpfVxcXCI+e3sgY29tcG9uZW50LmZvb3RlciB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICAgKSk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L3NpZ25hdHVyZS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxkaXYgbmctaWY9XFxcImRhdGFbY29tcG9uZW50LmtleV0gPT09ICdZRVMnXFxcIj5cXG4gIFsgU2lnbmF0dXJlIGlzIGhpZGRlbiBdXFxuPC9kaXY+XFxuPGRpdiBuZy1pZj1cXFwiZGF0YVtjb21wb25lbnQua2V5XSAmJiAoZGF0YVtjb21wb25lbnQua2V5XSAhPT0gJ1lFUycpXFxcIj5cXG4gIDxpbWcgY2xhc3M9XFxcInNpZ25hdHVyZVxcXCIgbmctYXR0ci1zcmM9XFxcInt7IGRhdGFbY29tcG9uZW50LmtleV0gfX1cXFwiIHNyYz1cXFwiXFxcIiAvPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcIndlbGwgdGV4dC1jZW50ZXJcXFwiIG5nLWlmPVxcXCIhZGF0YVtjb21wb25lbnQua2V5XSB8fCAoZGF0YVtjb21wb25lbnQua2V5XSA9PT0gJ05PJylcXFwiPlxcbiAgPHN0cm9uZz5ObyBzaWduYXR1cmUgcHJvdmlkZWQ8L3N0cm9uZz5cXG48L2Rpdj5cXG5cIlxuICAgICAgKSk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignc3VydmV5Jywge1xuICAgICAgICB0aXRsZTogJ1N1cnZleScsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvc3VydmV5Lmh0bWwnLFxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQpIHtcbiAgICAgICAgICB2YXIgdmlldyA9ICc8dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXCI+PHRoZWFkPic7XG4gICAgICAgICAgdmFyIHZhbHVlcyA9IHt9O1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21wb25lbnQudmFsdWVzLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICB2YWx1ZXNbdi52YWx1ZV0gPSB2LmxhYmVsO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21wb25lbnQucXVlc3Rpb25zLCBmdW5jdGlvbihxdWVzdGlvbikge1xuICAgICAgICAgICAgdmlldyArPSAnPHRyPic7XG4gICAgICAgICAgICB2aWV3ICs9ICc8dGg+JyArIHF1ZXN0aW9uLmxhYmVsICsgJzwvdGg+JztcbiAgICAgICAgICAgIHZpZXcgKz0gJzx0ZD4nICsgdmFsdWVzW2RhdGFbcXVlc3Rpb24udmFsdWVdXSArICc8L3RkPic7XG4gICAgICAgICAgICB2aWV3ICs9ICc8L3RyPic7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmlldyArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgICAgcmV0dXJuIHZpZXc7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyR0aW1lb3V0JywgZnVuY3Rpb24oJHNjb3BlLCAkdGltZW91dCkge1xuICAgICAgICAgIC8vIEZPUi03MVxuICAgICAgICAgIGlmICgkc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuICAgICAgICAgIC8vIEB0b2RvOiBGaWd1cmUgb3V0IHdoeSB0aGUgc3VydmV5IHZhbHVlcyBhcmUgbm90IGRlZmF1bHRpbmcgY29ycmVjdGx5LlxuICAgICAgICAgIHZhciByZXNldCA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGEuJyArICRzY29wZS5jb21wb25lbnQua2V5LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICFyZXNldCkge1xuICAgICAgICAgICAgICByZXNldCA9IHRydWU7XG4gICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHt9O1xuICAgICAgICAgICAgICAkdGltZW91dCgoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICR0aW1lb3V0KCRzY29wZS4kYXBwbHkuYmluZCgkc2NvcGUpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9KSh2YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3N1cnZleScsXG4gICAgICAgICAgcXVlc3Rpb25zOiBbXSxcbiAgICAgICAgICB2YWx1ZXM6IFtdLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgIGNsZWFyT25IaWRlOiB0cnVlLFxuICAgICAgICAgIHZhbGlkYXRlOiB7XG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgICBjdXN0b206ICcnLFxuICAgICAgICAgICAgY3VzdG9tUHJpdmF0ZTogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc3VydmV5Lmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXFxcIj5cXG4gIDx0aGVhZD5cXG4gICAgPHRyPlxcbiAgICAgIDx0ZD48L3RkPlxcbiAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcXFwiIHN0eWxlPVxcXCJ0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj57eyB2LmxhYmVsIH19PC90aD5cXG4gICAgPC90cj5cXG4gIDwvdGhlYWQ+XFxuICA8dHIgbmctcmVwZWF0PVxcXCJxdWVzdGlvbiBpbiBjb21wb25lbnQucXVlc3Rpb25zXFxcIj5cXG4gICAgPHRkPnt7IHF1ZXN0aW9uLmxhYmVsIH19PC90ZD5cXG4gICAgPHRkIG5nLXJlcGVhdD1cXFwidiBpbiBjb21wb25lbnQudmFsdWVzXFxcIiBzdHlsZT1cXFwidGV4dC1hbGlnbjogY2VudGVyO1xcXCI+XFxuICAgICAgPGlucHV0XFxuICAgICAgICB0eXBlPVxcXCJyYWRpb1xcXCJcXG4gICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyBxdWVzdGlvbi52YWx1ZSB9fS17eyB2LnZhbHVlIH19XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fS17eyBxdWVzdGlvbi52YWx1ZSB9fVxcXCJcXG4gICAgICAgIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4gICAgICAgIHZhbHVlPVxcXCJ7eyB2LnZhbHVlIH19XFxcIlxcbiAgICAgICAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1bcXVlc3Rpb24udmFsdWVdXFxcIlxcbiAgICAgICAgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCJcXG4gICAgICAgIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gICAgICAgIGN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxuICAgICAgPlxcbiAgICA8L3RkPlxcbiAgPC90cj5cXG48L3RhYmxlPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigndGFibGUnLCB7XG4gICAgICAgIHRpdGxlOiAnVGFibGUnLFxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RhYmxlLmh0bWwnLFxuICAgICAgICBncm91cDogJ2xheW91dCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIGtleTogJ3RhYmxlJyxcbiAgICAgICAgICBudW1Sb3dzOiAzLFxuICAgICAgICAgIG51bUNvbHM6IDMsXG4gICAgICAgICAgcm93czogW1t7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119XSwgW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dLCBbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV1dLFxuICAgICAgICAgIGhlYWRlcjogW10sXG4gICAgICAgICAgY2FwdGlvbjogJycsXG4gICAgICAgICAgc3RyaXBlZDogZmFsc2UsXG4gICAgICAgICAgYm9yZGVyZWQ6IGZhbHNlLFxuICAgICAgICAgIGhvdmVyOiBmYWxzZSxcbiAgICAgICAgICBjb25kZW5zZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4gIGFwcC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAgIHZhciB0YWJsZUNsYXNzZXMgPSBcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCBcIjtcbiAgICAgIHRhYmxlQ2xhc3NlcyArPSBcIid0YWJsZS1ib3JkZXJlZCc6IGNvbXBvbmVudC5ib3JkZXJlZCwgXCI7XG4gICAgICB0YWJsZUNsYXNzZXMgKz0gXCIndGFibGUtaG92ZXInOiBjb21wb25lbnQuaG92ZXIsIFwiO1xuICAgICAgdGFibGVDbGFzc2VzICs9IFwiJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XCI7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RhYmxlLmh0bWwnLFxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcInRhYmxlLXJlc3BvbnNpdmVcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXG4gIDx0YWJsZSBuZy1jbGFzcz1cXFwieyd0YWJsZS1zdHJpcGVkJzogY29tcG9uZW50LnN0cmlwZWQsICd0YWJsZS1ib3JkZXJlZCc6IGNvbXBvbmVudC5ib3JkZXJlZCwgJ3RhYmxlLWhvdmVyJzogY29tcG9uZW50LmhvdmVyLCAndGFibGUtY29uZGVuc2VkJzogY29tcG9uZW50LmNvbmRlbnNlZH1cXFwiIGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDx0aGVhZCBuZy1pZj1cXFwiY29tcG9uZW50LmhlYWRlci5sZW5ndGhcXFwiPlxcbiAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcImhlYWRlciBpbiBjb21wb25lbnQuaGVhZGVyIHRyYWNrIGJ5ICRpbmRleFxcXCI+e3sgaGVhZGVyIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvdGg+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gY29tcG9uZW50LnJvd3MgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiByb3cgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICAgICAgPGZvcm1pby1jb21wb25lbnRcXG4gICAgICAgICAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICAgICAgICAgIGNvbXBvbmVudD1cXFwiX2NvbXBvbmVudFxcXCJcXG4gICAgICAgICAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICAgICAgICAgIGZvcm1pbz1cXFwiZm9ybWlvXFxcIlxcbiAgICAgICAgICAgIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiXFxuICAgICAgICAgICAgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCJcXG4gICAgICAgICAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICAgICAgICAgIGZvcm1pby1mb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIlxcbiAgICAgICAgICAgIHJlYWQtb25seT1cXFwiaXNEaXNhYmxlZChfY29tcG9uZW50LCBkYXRhKVxcXCJcXG4gICAgICAgICAgICBncmlkLXJvdz1cXFwiZ3JpZFJvd1xcXCJcXG4gICAgICAgICAgICBncmlkLWNvbD1cXFwiZ3JpZENvbFxcXCJcXG4gICAgICAgICAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgICAgICAgICA+PC9mb3JtaW8tY29tcG9uZW50PlxcbiAgICAgICAgPC90ZD5cXG4gICAgICA8L3RyPlxcbiAgICA8L3Rib2R5PlxcbiAgPC90YWJsZT5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50c1ZpZXcvdGFibGUuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwidGFibGUtcmVzcG9uc2l2ZVxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcbiAgPHRhYmxlIG5nLWNsYXNzPVxcXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgJ3RhYmxlLWJvcmRlcmVkJzogY29tcG9uZW50LmJvcmRlcmVkLCAndGFibGUtaG92ZXInOiBjb21wb25lbnQuaG92ZXIsICd0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVxcXCIgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gICAgPHRoZWFkIG5nLWlmPVxcXCJjb21wb25lbnQuaGVhZGVyLmxlbmd0aFxcXCI+XFxuICAgICAgPHRoIG5nLXJlcGVhdD1cXFwiaGVhZGVyIGluIGNvbXBvbmVudC5oZWFkZXIgdHJhY2sgYnkgJGluZGV4XFxcIj57eyBoZWFkZXIgfX08L3RoPlxcbiAgICA8L3RoZWFkPlxcbiAgICA8dGJvZHk+XFxuICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIGNvbXBvbmVudC5yb3dzIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxuICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gcm93IHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxuICAgICAgICAgIDxmb3JtaW8tY29tcG9uZW50LXZpZXdcXG4gICAgICAgICAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICAgICAgICAgIGNvbXBvbmVudD1cXFwiX2NvbXBvbmVudFxcXCJcXG4gICAgICAgICAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICAgICAgICAgIGZvcm09XFxcImZvcm1cXFwiXFxuICAgICAgICAgICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgICAgICAgICBpZ25vcmU9XFxcImlnbm9yZVxcXCJcXG4gICAgICAgICAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICAgICAgICAgIGJ1aWxkZXI9XFxcImJ1aWxkZXJcXFwiXFxuICAgICAgICAgID48L2Zvcm1pby1jb21wb25lbnQtdmlldz5cXG4gICAgICAgIDwvdGQ+XFxuICAgICAgPC90cj5cXG4gICAgPC90Ym9keT5cXG4gIDwvdGFibGU+XFxuPC9kaXY+XFxuXCJcbiAgICAgICk7XG4gICAgfVxuICBdKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcbiAgYXBwLmNvbmZpZyhbXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3RleHRhcmVhJywge1xuICAgICAgICB0aXRsZTogJ1RleHQgQXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC53eXNpd3lnKSB7XG4gICAgICAgICAgICAkc2NvcGUud3lzaXd5ZyA9ICRzY29wZS5jb21wb25lbnQud3lzaXd5ZztcbiAgICAgICAgICAgIHJldHVybiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGVkaXRvci5odG1sJztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICdmb3JtaW8vY29tcG9uZW50cy90ZXh0YXJlYS5odG1sJztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXG4gICAgICAgICAgbGFiZWw6ICcnLFxuICAgICAgICAgIGtleTogJ3RleHRhcmVhRmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgcm93czogMyxcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgd3lzaXd5ZzogZmFsc2UsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogJycsXG4gICAgICAgICAgICBtYXhMZW5ndGg6ICcnLFxuICAgICAgICAgICAgcGF0dGVybjogJycsXG4gICAgICAgICAgICBjdXN0b206ICcnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAgIEZvcm1pb1V0aWxzKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRhcmVhLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPHRleHRhcmVhXFxuICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIlxcbiAgc2FmZS1tdWx0aXBsZS10by1zaW5nbGVcXG4gIGlkPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcbiAgcGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX1cXFwiXFxuICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcbiAgcm93cz1cXFwie3sgY29tcG9uZW50LnJvd3MgfX1cXFwiXFxuPjwvdGV4dGFyZWE+XFxuXCJcbiAgICAgICkpO1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZWRpdG9yLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXG4gICAgICAgIFwiPHRleHRhcmVhXFxuICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxuICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxuICBuZy1yZXF1aXJlZD1cXFwiaXNSZXF1aXJlZChjb21wb25lbnQpXFxcIlxcbiAgY2tlZGl0b3I9XFxcInd5c2l3eWdcXFwiXFxuICBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZVxcbiAgaWQ9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIlxcbiAgbmFtZT1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxuICBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIlxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gIHJvd3M9XFxcInt7IGNvbXBvbmVudC5yb3dzIH19XFxcIlxcbj48L3RleHRhcmVhPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG4gIGFwcC5jb25maWcoW1xuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0ZmllbGQnLCB7XG4gICAgICAgIHRpdGxlOiAnVGV4dCBGaWVsZCcsXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxuICAgICAgICBpY29uOiAnZmEgZmEtdGVybWluYWwnLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcbiAgICAgICAgICBpbnB1dFR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICBpbnB1dE1hc2s6ICcnLFxuICAgICAgICAgIGxhYmVsOiAnJyxcbiAgICAgICAgICBrZXk6ICd0ZXh0RmllbGQnLFxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcbiAgICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICAgIHN1ZmZpeDogJycsXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgY2xlYXJPbkhpZGU6IHRydWUsXG4gICAgICAgICAgdmFsaWRhdGU6IHtcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogJycsXG4gICAgICAgICAgICBtYXhMZW5ndGg6ICcnLFxuICAgICAgICAgICAgcGF0dGVybjogJycsXG4gICAgICAgICAgICBjdXN0b206ICcnLFxuICAgICAgICAgICAgY3VzdG9tUHJpdmF0ZTogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmRpdGlvbmFsOiB7XG4gICAgICAgICAgICBzaG93OiBudWxsLFxuICAgICAgICAgICAgd2hlbjogbnVsbCxcbiAgICAgICAgICAgIGVxOiAnJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICBdKTtcblxuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICdGb3JtaW9VdGlscycsXG4gICAgZnVuY3Rpb24oXG4gICAgICAkdGVtcGxhdGVDYWNoZSxcbiAgICAgIEZvcm1pb1V0aWxzXG4gICAgKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxuICAgICAgICBcIjxpbnB1dFxcbiAgdHlwZT1cXFwie3sgY29tcG9uZW50LmlucHV0VHlwZSB9fVxcXCJcXG4gIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiXFxuICBpZD1cXFwie3sgY29tcG9uZW50SWQgfX1cXFwiXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnRJZCB9fVxcXCJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXG4gIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcbiAgbmctbW9kZWwtb3B0aW9ucz1cXFwieyBkZWJvdW5jZTogNTAwIH1cXFwiXFxuICBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZVxcbiAgbmctcmVxdWlyZWQ9XFxcImlzUmVxdWlyZWQoY29tcG9uZW50KVxcXCJcXG4gIG5nLW1pbmxlbmd0aD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLm1pbkxlbmd0aFxcXCJcXG4gIG5nLW1heGxlbmd0aD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLm1heExlbmd0aFxcXCJcXG4gIG5nLXBhdHRlcm49XFxcImNvbXBvbmVudC52YWxpZGF0ZS5wYXR0ZXJuXFxcIlxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxcIlxcbiAgdWktbWFzaz1cXFwie3sgY29tcG9uZW50LmlucHV0TWFzayB9fVxcXCJcXG4gIHVpLW1hc2stcGxhY2Vob2xkZXI9XFxcIlxcXCJcXG4gIHVpLW9wdGlvbnM9XFxcInVpTWFza09wdGlvbnNcXFwiXFxuPlxcblwiXG4gICAgICApKTtcbiAgICB9XG4gIF0pO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuICBhcHAuY29uZmlnKFtcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignd2VsbCcsIHtcbiAgICAgICAgdGl0bGU6ICdXZWxsJyxcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy93ZWxsLmh0bWwnLFxuICAgICAgICBncm91cDogJ2xheW91dCcsXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAga2V5OiAnd2VsbCcsXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHZpZXdUZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzVmlldy93ZWxsLmh0bWwnXG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuICBhcHAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3dlbGwuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwid2VsbFxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcbiAgPGZvcm1pby1jb21wb25lbnRcXG4gICAgbmctcmVwZWF0PVxcXCJfY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCJcXG4gICAgY29tcG9uZW50PVxcXCJfY29tcG9uZW50XFxcIlxcbiAgICBkYXRhPVxcXCJkYXRhXFxcIlxcbiAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCJcXG4gICAgbmctaWY9XFxcImJ1aWxkZXIgPyAnOjp0cnVlJyA6IGlzVmlzaWJsZShfY29tcG9uZW50LCBkYXRhKVxcXCJcXG4gICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCJcXG4gICAgZ3JpZC1yb3c9XFxcImdyaWRSb3dcXFwiXFxuICAgIGdyaWQtY29sPVxcXCJncmlkQ29sXFxcIlxcbiAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgPjwvZm9ybWlvLWNvbXBvbmVudD5cXG48L2Rpdj5cXG5cIlxuICAgICAgKTtcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHNWaWV3L3dlbGwuaHRtbCcsXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwid2VsbFxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcbiAgPGZvcm1pby1jb21wb25lbnQtdmlld1xcbiAgICBuZy1yZXBlYXQ9XFxcIl9jb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIlxcbiAgICBjb21wb25lbnQ9XFxcIl9jb21wb25lbnRcXFwiXFxuICAgIGRhdGE9XFxcImRhdGFcXFwiXFxuICAgIGZvcm09XFxcImZvcm1cXFwiXFxuICAgIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiXFxuICAgIGlnbm9yZT1cXFwiaWdub3JlXFxcIlxcbiAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKF9jb21wb25lbnQsIGRhdGEpXFxcIlxcbiAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgPjwvZm9ybWlvLWNvbXBvbmVudC12aWV3PlxcbjwvZGl2PlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGUsIGF0dHJzLCBjdHJsKSB7XG4gICAgICBpZiAoc2NvcGUuYnVpbGRlcikgcmV0dXJuO1xuICAgICAgaWYgKFxuICAgICAgICAhc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlIHx8XG4gICAgICAgICFzY29wZS5jb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgX2dldCA9IGZ1bmN0aW9uKGl0ZW0sIHBhdGgsIGRlZikge1xuICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gZGVmIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBwYXRoIGlzIGEgc3RyaW5nLCB0dXJuIGl0IGludG8gYW4gYXJyYXkuXG4gICAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHRoZSBwYXRoIGlzIGFuIGFycmF5LCB0YWtlIHRoZSBmaXJzdCBlbGVtZW50LCBhbmQgcmVjdXJzZSBpdHMgcGF0aFxuICAgICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgaWYgKGl0ZW0uaGFzT3duUHJvcGVydHkoY3VycmVudCkpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBtb3JlIHBhdGggaXRlbXMsIHN0b3AgaGVyZS5cbiAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gaXRlbVtjdXJyZW50XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIF9nZXQoaXRlbVtjdXJyZW50XSwgcGF0aCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9O1xuXG4gICAgICBjdHJsLiR2YWxpZGF0b3JzLmN1c3RvbSA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuICAgICAgICB2YXIgdmFsaWQgPSB0cnVlO1xuICAgICAgICAvKmVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG4gICAgICAgIHZhciBpbnB1dCA9IG1vZGVsVmFsdWUgfHwgdmlld1ZhbHVlO1xuXG4gICAgICAgIC8vIEZPUi0yNTUgLSBFbmFibGUgcm93IGRhdGEgYW5kIGZvcm0gZGF0YSB0byBiZSB2aXNpYmxlIGluIHRoZSB2YWxpZGF0b3IuXG4gICAgICAgIHZhciBkYXRhID0gc2NvcGUuc3VibWlzc2lvbi5kYXRhO1xuICAgICAgICB2YXIgcm93ID0gc2NvcGUuZGF0YTtcbiAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLXVudXNlZC12YXJzICovXG5cbiAgICAgICAgdmFyIGN1c3RvbSA9IHNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b207XG4gICAgICAgIGN1c3RvbSA9IGN1c3RvbS5yZXBsYWNlKC8oe3tcXHN7MCx9KC4qW15cXHNdKXsxfVxcc3swLH19fSkvZywgZnVuY3Rpb24obWF0Y2gsICQxLCAkMikge1xuICAgICAgICAgIHJldHVybiBfZ2V0KHNjb3BlLnN1Ym1pc3Npb24uZGF0YSwgJDIpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8qIGpzaGludCBldmlsOiB0cnVlICovXG4gICAgICAgICAgZXZhbChjdXN0b20pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB2YWxpZCA9IGVyci5tZXNzYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbGlkICE9PSB0cnVlKSB7XG4gICAgICAgICAgc2NvcGUuY29tcG9uZW50LmN1c3RvbUVycm9yID0gdmFsaWQ7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBzY29wZToge1xuICAgICAgc3JjOiAnPT8nLFxuICAgICAgdXJsOiAnPT8nLFxuICAgICAgZm9ybUFjdGlvbjogJz0/JyxcbiAgICAgIGZvcm06ICc9PycsXG4gICAgICBzdWJtaXNzaW9uOiAnPT8nLFxuICAgICAgcmVhZE9ubHk6ICc9PycsXG4gICAgICBoaWRlQ29tcG9uZW50czogJz0/JyxcbiAgICAgIHJlcXVpcmVDb21wb25lbnRzOiAnPT8nLFxuICAgICAgZGlzYWJsZUNvbXBvbmVudHM6ICc9PycsXG4gICAgICBmb3JtaW9PcHRpb25zOiAnPT8nLFxuICAgICAgb3B0aW9uczogJz0/J1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGh0dHAnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICAnRm9ybWlvJyxcbiAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkaHR0cCxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgIEZvcm1pb1Njb3BlLFxuICAgICAgICBGb3JtaW8sXG4gICAgICAgIEZvcm1pb1V0aWxzXG4gICAgICApIHtcbiAgICAgICAgJHNjb3BlLl9zcmMgPSAkc2NvcGUuc3JjIHx8ICcnO1xuICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xuICAgICAgICB0aGlzLnNob3dBbGVydHMgPSAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uKGFsZXJ0cykge1xuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgdGhlIGxpdmUgZm9ybSBwYXJhbWV0ZXIgdG8gdGhlIHVybC5cbiAgICAgICAgaWYgKCRzY29wZS5fc3JjICYmICgkc2NvcGUuX3NyYy5pbmRleE9mKCdsaXZlPScpID09PSAtMSkpIHtcbiAgICAgICAgICAkc2NvcGUuX3NyYyArPSAoJHNjb3BlLl9zcmMuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJic7XG4gICAgICAgICAgJHNjb3BlLl9zcmMgKz0gJ2xpdmU9MSc7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2FuY2VsRm9ybUxvYWRFdmVudCA9ICRzY29wZS4kb24oJ2Zvcm1Mb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FuY2VsRm9ybUxvYWRFdmVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGT1ItNzFcbiAgICAgICAgaWYgKCEkc2NvcGUuX3NyYyAmJiAhJHNjb3BlLmJ1aWxkZXIpIHtcbiAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdzcmMnLCBmdW5jdGlvbihzcmMpIHtcbiAgICAgICAgICAgIGlmICghc3JjKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5fc3JjID0gc3JjO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgZm9ybTogdHJ1ZSxcbiAgICAgICAgICAgICAgc3VibWlzc2lvbjogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGZvcm1pbyBvYmplY3QuXG4gICAgICAgICRzY29wZS5mb3JtaW8gPSBGb3JtaW9TY29wZS5yZWdpc3Rlcigkc2NvcGUsICRlbGVtZW50LCB7XG4gICAgICAgICAgZm9ybTogdHJ1ZSxcbiAgICAgICAgICBzdWJtaXNzaW9uOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5jaGVja0Vycm9ycyA9IGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICBpZiAoZm9ybS5zdWJtaXR0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9ybS4kcHJpc3RpbmUgPSBmYWxzZTtcbiAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZm9ybSkge1xuICAgICAgICAgICAgaWYgKGZvcm1ba2V5XSAmJiBmb3JtW2tleV0uaGFzT3duUHJvcGVydHkoJyRwcmlzdGluZScpKSB7XG4gICAgICAgICAgICAgIGZvcm1ba2V5XS4kcHJpc3RpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICFmb3JtLiR2YWxpZDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWaXNpYmxlID0gZnVuY3Rpb24oY29tcG9uZW50LCByb3cpIHtcbiAgICAgICAgICByZXR1cm4gRm9ybWlvVXRpbHMuaXNWaXNpYmxlKFxuICAgICAgICAgICAgY29tcG9uZW50LFxuICAgICAgICAgICAgcm93LFxuICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPyAkc2NvcGUuc3VibWlzc2lvbi5kYXRhIDogbnVsbCxcbiAgICAgICAgICAgICRzY29wZS5oaWRlQ29tcG9uZW50c1xuICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLnJlYWRPbmx5IHx8IGNvbXBvbmVudC5kaXNhYmxlZCB8fCAoQXJyYXkuaXNBcnJheSgkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMpICYmICRzY29wZS5kaXNhYmxlQ29tcG9uZW50cy5pbmRleE9mKGNvbXBvbmVudC5rZXkpICE9PSAtMSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmlzUmVxdWlyZWQgPSBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICByZXR1cm4gKGNvbXBvbmVudC52YWxpZGF0ZSAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWQpIHx8IChBcnJheS5pc0FycmF5KCRzY29wZS5yZXF1aXJlQ29tcG9uZW50cykgJiYgJHNjb3BlLnJlcXVpcmVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWQuXG4gICAgICAgICRzY29wZS5vblN1Ym1pdCA9IGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycyhmb3JtKSkge1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZml4IHRoZSBmb2xsb3dpbmcgZXJyb3JzIGJlZm9yZSBzdWJtaXR0aW5nLidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IHRydWU7XG5cbiAgICAgICAgICAvLyBDcmVhdGUgYSBzYW5pdGl6ZWQgc3VibWlzc2lvbiBvYmplY3QuXG4gICAgICAgICAgdmFyIHN1Ym1pc3Npb25EYXRhID0ge2RhdGE6IHt9fTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uX2lkKSB7XG4gICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5faWQgPSAkc2NvcGUuc3VibWlzc2lvbi5faWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLl9pZCkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuX2lkID0gJHNjb3BlLnN1Ym1pc3Npb24uZGF0YS5faWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGdyYWJJZHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgaWYgKCFpbnB1dCkge1xuICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghKGlucHV0IGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgIGlucHV0ID0gW2lucHV0XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpbmFsID0gW107XG4gICAgICAgICAgICBpbnB1dC5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgJiYgZWxlbWVudC5faWQpIHtcbiAgICAgICAgICAgICAgICBmaW5hbC5wdXNoKGVsZW1lbnQuX2lkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBmaW5hbDtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIGRlZmF1bHRQZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50LnR5cGUgPT09ICdyZXNvdXJjZScgJiYgY29tcG9uZW50LmtleSAmJiBjb21wb25lbnQuZGVmYXVsdFBlcm1pc3Npb24pIHtcbiAgICAgICAgICAgICAgZGVmYXVsdFBlcm1pc3Npb25zW2NvbXBvbmVudC5rZXldID0gY29tcG9uZW50LmRlZmF1bHRQZXJtaXNzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uLmRhdGEuaGFzT3duUHJvcGVydHkoY29tcG9uZW50LmtleSkpIHtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVtjb21wb25lbnQua2V5XTtcbiAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAnbnVtYmVyJyAmJiAodmFsdWUgIT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtjb21wb25lbnQua2V5XSA9IHZhbHVlID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmRhdGFbY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5zdWJtaXNzaW9uLmRhdGEsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhdmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XG4gICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmRhdGFba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXR1cCB0aGUgc3VibWlzc2lvbiBhY2Nlc3MuXG4gICAgICAgICAgICB2YXIgcGVybSA9IGRlZmF1bHRQZXJtaXNzaW9uc1trZXldO1xuICAgICAgICAgICAgaWYgKHBlcm0pIHtcbiAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuYWNjZXNzID0gc3VibWlzc2lvbkRhdGEuYWNjZXNzIHx8IFtdO1xuXG4gICAgICAgICAgICAgIC8vIENvZXJjZSB2YWx1ZSBpbnRvIGFuIGFycmF5IGZvciBwbHVja2luZy5cbiAgICAgICAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBUcnkgdG8gZmluZCBhbmQgdXBkYXRlIGFuIGV4aXN0aW5nIHBlcm1pc3Npb24uXG4gICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MuZm9yRWFjaChmdW5jdGlvbihwZXJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBlcm1pc3Npb24udHlwZSA9PT0gcGVybSkge1xuICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbi5yZXNvdXJjZXMgPSBwZXJtaXNzaW9uLnJlc291cmNlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgIHBlcm1pc3Npb24ucmVzb3VyY2VzLmNvbmNhdChncmFiSWRzKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAvLyBBZGQgYSBwZXJtaXNzaW9uLCBiZWNhdXNlIG9uZSB3YXMgbm90IGZvdW5kLlxuICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuYWNjZXNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgdHlwZTogcGVybSxcbiAgICAgICAgICAgICAgICAgIHJlc291cmNlczogZ3JhYklkcyh2YWx1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gU2hvdyB0aGUgc3VibWl0IG1lc3NhZ2UgYW5kIHNheSB0aGUgZm9ybSBpcyBubyBsb25nZXIgc3VibWl0dGluZy5cbiAgICAgICAgICB2YXIgb25TdWJtaXQgPSBmdW5jdGlvbihzdWJtaXNzaW9uLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gQ2FsbGVkIHdoZW4gYSBzdWJtaXNzaW9uIGhhcyBiZWVuIG1hZGUuXG4gICAgICAgICAgdmFyIG9uU3VibWl0RG9uZSA9IGZ1bmN0aW9uKG1ldGhvZCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSAnJztcbiAgICAgICAgICAgIGlmICgkc2NvcGUub3B0aW9ucyAmJiAkc2NvcGUub3B0aW9ucy5zdWJtaXRNZXNzYWdlKSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPSAkc2NvcGUub3B0aW9ucy5zdWJtaXRNZXNzYWdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPSAnU3VibWlzc2lvbiB3YXMgJyArICgobWV0aG9kID09PSAncHV0JykgPyAndXBkYXRlZCcgOiAnY3JlYXRlZCcpICsgJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb25TdWJtaXQoc3VibWlzc2lvbiwgbWVzc2FnZSk7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBmb3JtIHN1Ym1pc3Npb24uXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbik7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIEFsbG93IHRoZSBmb3JtIHRvIGJlIGNvbXBsZXRlZCBleHRlcm5hbGx5LlxuICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pdERvbmUnLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbiwgbWVzc2FnZSkge1xuICAgICAgICAgICAgb25TdWJtaXQoc3VibWlzc2lvbiwgbWVzc2FnZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBBbGxvdyBhbiBlcnJvciB0byBiZSB0aHJvd24gZXh0ZXJuYWxseS5cbiAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXRFcnJvcicsIGZ1bmN0aW9uKGV2ZW50LCBlcnJvcikge1xuICAgICAgICAgICAgRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KShlcnJvcik7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgc3VibWl0RXZlbnQgPSAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXQnLCBzdWJtaXNzaW9uRGF0YSk7XG4gICAgICAgICAgaWYgKHN1Ym1pdEV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgIC8vIExpc3RlbmVyIHdhbnRzIHRvIGNhbmNlbCB0aGUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNYWtlIHN1cmUgdG8gbWFrZSBhIGNvcHkgb2YgdGhlIHN1Ym1pc3Npb24gZGF0YSB0byByZW1vdmUgYmFkIGNoYXJhY3RlcnMuXG4gICAgICAgICAgc3VibWlzc2lvbkRhdGEgPSBhbmd1bGFyLmNvcHkoc3VibWlzc2lvbkRhdGEpO1xuXG4gICAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGFjdGlvbiB1cmxzLlxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gc3VibWlzc2lvbkRhdGEuX2lkID8gJ3B1dCcgOiAncG9zdCc7XG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Ym1pc3Npb25EYXRhKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICAgIG9uU3VibWl0RG9uZShtZXRob2QsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSwgRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSlcbiAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZm9ybS5zdWJtaXR0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoZXkgd2lzaCB0byBzdWJtaXQgdG8gdGhlIGRlZmF1bHQgbG9jYXRpb24uXG4gICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmZvcm1pbyAmJiAhJHNjb3BlLmZvcm1pby5ub1N1Ym1pdCkge1xuICAgICAgICAgICAgLy8gY29weSB0byByZW1vdmUgYW5ndWxhciAkJGhhc2hLZXlcbiAgICAgICAgICAgICRzY29wZS5mb3JtaW8uc2F2ZVN1Ym1pc3Npb24oc3VibWlzc2lvbkRhdGEsICRzY29wZS5mb3JtaW9PcHRpb25zKS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgb25TdWJtaXREb25lKHN1Ym1pc3Npb24ubWV0aG9kLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICAgIH0sIEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpLmZpbmFsbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb25EYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgXSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby5odG1sJ1xuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbJyRzY2UnLCAnJHBhcnNlJywgJyRjb21waWxlJywgZnVuY3Rpb24oJHNjZSwgJHBhcnNlLCAkY29tcGlsZSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29tcGlsZTogZnVuY3Rpb24gZm9ybWlvQmluZEh0bWxDb21waWxlKHRFbGVtZW50LCB0QXR0cnMpIHtcbiAgICAgIHZhciBmb3JtaW9CaW5kSHRtbEdldHRlciA9ICRwYXJzZSh0QXR0cnMuZm9ybWlvQmluZEh0bWwpO1xuICAgICAgJGNvbXBpbGUuJCRhZGRCaW5kaW5nQ2xhc3ModEVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGZvcm1pb0JpbmRIdG1sTGluayhzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgICAkY29tcGlsZS4kJGFkZEJpbmRpbmdJbmZvKGVsZW1lbnQsIGF0dHIuZm9ybWlvQmluZEh0bWwpO1xuICAgICAgICB2YXIgdmFsdWUgPSBmb3JtaW9CaW5kSHRtbEdldHRlcihzY29wZSk7XG4gICAgICAgIGVsZW1lbnQuaHRtbCgkc2NlLmdldFRydXN0ZWRIdG1sKHZhbHVlKSB8fCAnJyk7XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn1dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ0Zvcm1pbycsXG4gICdmb3JtaW9Db21wb25lbnRzJyxcbiAgJ0xvZGFzaCcsXG4gIGZ1bmN0aW9uKFxuICAgIEZvcm1pbyxcbiAgICBmb3JtaW9Db21wb25lbnRzLFxuICAgIF9cbiAgKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eZm9ybWlvJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNvbXBvbmVudDogJz0nLFxuICAgICAgICBkYXRhOiAnPScsXG4gICAgICAgIHN1Ym1pc3Npb246ICc9JyxcbiAgICAgICAgaGlkZUNvbXBvbmVudHM6ICc9JyxcbiAgICAgICAgZm9ybWlvOiAnPScsXG4gICAgICAgIGZvcm1pb0Zvcm06ICc9JyxcbiAgICAgICAgcmVhZE9ubHk6ICc9JyxcbiAgICAgICAgZ3JpZFJvdzogJz0nLFxuICAgICAgICBncmlkQ29sOiAnPScsXG4gICAgICAgIGJ1aWxkZXI6ICc9PydcbiAgICAgIH0sXG4gICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9jb21wb25lbnQuaHRtbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHJzLCBmb3JtaW9DdHJsKSB7XG4gICAgICAgIGlmIChmb3JtaW9DdHJsKSB7XG4gICAgICAgICAgc2NvcGUuc2hvd0FsZXJ0cyA9IGZvcm1pb0N0cmwuc2hvd0FsZXJ0cy5iaW5kKGZvcm1pb0N0cmwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNhbGwgJHNjb3BlLnNob3dBbGVydHMgdW5sZXNzIHRoaXMgY29tcG9uZW50IGlzIGluc2lkZSBhIGZvcm1pbyBkaXJlY3RpdmUuJyk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgJyRzY29wZScsXG4gICAgICAgICckaHR0cCcsXG4gICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAkaHR0cCxcbiAgICAgICAgICAkY29udHJvbGxlcixcbiAgICAgICAgICBGb3JtaW9VdGlsc1xuICAgICAgICApIHtcbiAgICAgICAgICAkc2NvcGUuYnVpbGRlciA9ICRzY29wZS5idWlsZGVyIHx8IGZhbHNlO1xuICAgICAgICAgIC8vIE9wdGlvbnMgdG8gbWF0Y2gganF1ZXJ5Lm1hc2tlZGlucHV0IG1hc2tzXG4gICAgICAgICAgJHNjb3BlLnVpTWFza09wdGlvbnMgPSB7XG4gICAgICAgICAgICBtYXNrRGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgJzknOiAvXFxkLyxcbiAgICAgICAgICAgICAgJ2EnOiAvW2EtekEtWl0vLFxuICAgICAgICAgICAgICAnKic6IC9bYS16QS1aMC05XS9cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhck9uQmx1cjogZmFsc2UsXG4gICAgICAgICAgICBldmVudHNUb0hhbmRsZTogWydpbnB1dCcsICdrZXl1cCcsICdjbGljaycsICdmb2N1cyddLFxuICAgICAgICAgICAgc2lsZW50RXZlbnRzOiBbJ2NsaWNrJywgJ2ZvY3VzJ11cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gU2VlIGlmIHRoaXMgY29tcG9uZW50IGlzIHZpc2libGUgb3Igbm90LlxuICAgICAgICAgICRzY29wZS5pc1Zpc2libGUgPSBmdW5jdGlvbihjb21wb25lbnQsIHJvdykge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5idWlsZGVyKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBGb3JtaW9VdGlscy5pc1Zpc2libGUoXG4gICAgICAgICAgICAgIGNvbXBvbmVudCxcbiAgICAgICAgICAgICAgcm93LFxuICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA/ICRzY29wZS5zdWJtaXNzaW9uLmRhdGEgOiBudWxsLFxuICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIEZPUi0yNDUgLSBGaXggcmVzZXQgYnV0dG9ucy5cbiAgICAgICAgICAkc2NvcGUucmVzZXRGb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBNYW51YWxseSByZW1vdmUgZWFjaCBrZXkgc28gd2UgZG9uJ3QgbG9zZSBhIHJlZmVyZW5jZSB0byBvcmlnaW5hbFxuICAgICAgICAgICAgLy8gZGF0YSBpbiBjaGlsZCBzY29wZXMuXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gJHNjb3BlLmRhdGEpIHtcbiAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgICRzY29wZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLnJlYWRPbmx5IHx8ICh0eXBlb2YgJHNjb3BlLiRwYXJlbnQuaXNEaXNhYmxlZCA9PT0gJ2Z1bmN0aW9uJyAmJiAkc2NvcGUuJHBhcmVudC5pc0Rpc2FibGVkKGNvbXBvbmVudCkpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAkc2NvcGUuaXNSZXF1aXJlZCA9ICRzY29wZS4kcGFyZW50LmlzUmVxdWlyZWQ7XG5cbiAgICAgICAgICAvLyBQYXNzIHRocm91Z2ggY2hlY2tDb25kaXRpb25hbCBzaW5jZSB0aGlzIGlzIGFuIGlzb2xhdGUgc2NvcGUuXG4gICAgICAgICAgJHNjb3BlLmNoZWNrQ29uZGl0aW9uYWwgPSAkc2NvcGUuJHBhcmVudC5jaGVja0NvbmRpdGlvbmFsO1xuXG4gICAgICAgICAgLy8gRk9SLTcxIC0gRG9udCB3YXRjaCBpbiB0aGUgYnVpbGRlciB2aWV3LlxuICAgICAgICAgIC8vIENhbGN1bGF0ZSB2YWx1ZSB3aGVuIGRhdGEgY2hhbmdlcy5cbiAgICAgICAgICBpZiAoISRzY29wZS5idWlsZGVyICYmICRzY29wZS5jb21wb25lbnQuY2FsY3VsYXRlVmFsdWUpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBldmFsKCcoZnVuY3Rpb24oZGF0YSkgeyB2YXIgdmFsdWUgPSBbXTsnICsgJHNjb3BlLmNvbXBvbmVudC5jYWxjdWxhdGVWYWx1ZS50b1N0cmluZygpICsgJzsgcmV0dXJuIHZhbHVlOyB9KSgkc2NvcGUuZGF0YSknKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0FuIGVycm9yIG9jY3VycmVkIGNhbGN1bGF0aW5nIGEgdmFsdWUgZm9yICcgKyAkc2NvcGUuY29tcG9uZW50LmtleSwgZSk7XG4gICAgICAgICAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEdldCB0aGUgc2V0dGluZ3MuXG4gICAgICAgICAgdmFyIGNvbXBvbmVudCA9IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1skc2NvcGUuY29tcG9uZW50LnR5cGVdIHx8IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1snY3VzdG9tJ107XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBkZWZhdWx0cyBmcm9tIHRoZSBjb21wb25lbnQgc2V0dGluZ3MuXG4gICAgICAgICAgLy8gRG9udCBhZGQgdGhlIGRlZmF1bHQga2V5LCBzbyB0aGF0IGNvbXBvbmVudHMgd2l0aG91dCBrZXlzIHdpbGwgcmVtYWluIHZpc2libGUgYnkgZGVmYXVsdC5cbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LnNldHRpbmdzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5jb21wb25lbnQuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBrZXkgIT09ICdrZXknKSB7XG4gICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRba2V5XSA9IGFuZ3VsYXIuY29weSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBBZGQgYSBuZXcgZmllbGQgdmFsdWUuXG4gICAgICAgICAgJHNjb3BlLmFkZEZpZWxkVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9ICcnO1xuICAgICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQuaGFzT3duUHJvcGVydHkoJ2N1c3RvbURlZmF1bHRWYWx1ZScpKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF8uY2xvbmVEZWVwKCRzY29wZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVudXNlZC12YXJzICovXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBldmFsKCcoZnVuY3Rpb24oZGF0YSkgeyB2YXIgdmFsdWUgPSBcIlwiOycgKyAkc2NvcGUuY29tcG9uZW50LmN1c3RvbURlZmF1bHRWYWx1ZS50b1N0cmluZygpICsgJzsgcmV0dXJuIHZhbHVlOyB9KShkYXRhKScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQW4gZXJyb3Igb2NjdXJyZW5kIGluIGEgY3VzdG9tIGRlZmF1bHQgdmFsdWUgaW4gJyArICRzY29wZS5jb21wb25lbnQua2V5LCBlKTtcbiAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSkge1xuICAgICAgICAgICAgICAvLyBGaXggZm9yIHNlbGVjdCBjb21wb25lbnRzXG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LnR5cGUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIC8vIEFsbG93IGEga2V5OnZhbHVlIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWUuc3BsaXQoJzonKTtcbiAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICAgICAgICAgICAgLy8gSWYgb25seSBvbmUgcGFydCB3YXMgc3BlY2lmaWVkLCBzZWFyY2ggYnkgdmFsdWVcbiAgICAgICAgICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG1heC1kZXB0aCAqL1xuICAgICAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzID0gXy5maWx0ZXIoJHNjb3BlLnNlbGVjdEl0ZW1zLCB7dmFsdWU6IHBhcnRzWzBdfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpbSByZXN1bHRzIGJhc2VkIG9uIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0cy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gSWYgdHdvIHBhcnRzIHdlcmUgc3BlY2lmaWVkLCBhbGxvdyBmb3Iga2V5IGFuZCB2YWx1ZSBjdXN0b21pemF0aW9uLlxuICAgICAgICAgICAgICAgICAgZWxzZSBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWFyY2ggPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoW3BhcnRzWzBdXSA9IHBhcnRzWzFdO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBfLmZpbHRlcigkc2NvcGUuc2VsZWN0SXRlbXMsIHNlYXJjaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpbSByZXN1bHRzIGJhc2VkIG9uIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0cy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0FuIGlzc3VlIG9jY3VycmVkIHdpdGggdGhlIHNlbGVjdCBkZWZhdWx0VmFsdWUgZm9yOiAnICsgJHNjb3BlLmNvbXBvbmVudC5rZXkpO1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBmaW5kIGRlZmF1bHRWYWx1ZSAoJyArICRzY29wZS5kZWZhdWx0VmFsdWUgKyAnKSBpbiB0aGUgc2VsZWN0SXRlbXMnKTtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zZWxlY3RJdGVtcyk7XG4gICAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBSZW1vdmUgYSBmaWVsZCB2YWx1ZS5cbiAgICAgICAgICAkc2NvcGUucmVtb3ZlRmllbGRWYWx1ZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldKSkge1xuICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIHRlbXBsYXRlIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LnRlbXBsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAkc2NvcGUudGVtcGxhdGUgPSBjb21wb25lbnQudGVtcGxhdGUoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUudGVtcGxhdGUgPSBjb21wb25lbnQudGVtcGxhdGU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQWxsb3cgY29tcG9uZW50IGtleXMgdG8gbG9vayBsaWtlIFwic2V0dGluZ3NbdXNlcm5hbWVdXCJcbiAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5rZXkgJiYgJHNjb3BlLmNvbXBvbmVudC5rZXkuaW5kZXhPZignWycpICE9PSAtMSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAkc2NvcGUuY29tcG9uZW50LmtleS5tYXRjaCgvKFteXFxbXSspXFxbKFteXSspXFxdLyk7XG4gICAgICAgICAgICBpZiAoKG1hdGNoZXMubGVuZ3RoID09PSAzKSAmJiAkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eShtYXRjaGVzWzFdKSkge1xuICAgICAgICAgICAgICAkc2NvcGUuZGF0YSA9ICRzY29wZS5kYXRhW21hdGNoZXNbMV1dO1xuICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleSA9IG1hdGNoZXNbMl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgYSBjb250cm9sbGVyLlxuICAgICAgICAgIGlmIChjb21wb25lbnQuY29udHJvbGxlcikge1xuICAgICAgICAgICAgLy8gTWFpbnRhaW4gcmV2ZXJzZSBjb21wYXRpYmlsaXR5IGJ5IGV4ZWN1dGluZyB0aGUgb2xkIG1ldGhvZCBzdHlsZS5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LmNvbnRyb2xsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRyb2xsZXIoJHNjb3BlLmNvbXBvbmVudCwgJHNjb3BlLCAkaHR0cCwgRm9ybWlvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAkY29udHJvbGxlcihjb21wb25lbnQuY29udHJvbGxlciwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRk9SLTcxIC0gRG9udCB3YXRjaCBpbiB0aGUgYnVpbGRlciB2aWV3LlxuICAgICAgICAgIGlmICghJHNjb3BlLmJ1aWxkZXIpIHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVXNpbmcgdGhlIGxpc3Qgb2YgZGVmYXVsdCBvcHRpb25zLCBzcGxpdCB0aGVtIHdpdGggdGhlIGlkZW50aWZpZXIsIGFuZCB1c2UgZmlsdGVyIHRvIGdldCBlYWNoIGl0ZW0uXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQHBhcmFtIGRlZmF1bHRJdGVtc1xuICAgICAgICAgICAgICogQHBhcmFtIHNlYXJjaEl0ZW1zXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhciBwbHVja0l0ZW1zID0gZnVuY3Rpb24oZGVmYXVsdEl0ZW1zLCBzZWFyY2hJdGVtcykge1xuICAgICAgICAgICAgICB2YXIgdGVtcCA9IFtdO1xuICAgICAgICAgICAgICBpZiAoIWRlZmF1bHRJdGVtcyB8fCAhZGVmYXVsdEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0ZW1wO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgZGVmYXVsdEl0ZW1zID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGRlZmF1bHRJdGVtcyA9IFtkZWZhdWx0SXRlbXNdO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgZGVmYXVsdEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0cyA9IGl0ZW0uc3BsaXQoJzonKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gXy5maWx0ZXIoc2VhcmNoSXRlbXMsIGZ1bmN0aW9uKHBvdGVudGlhbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5nZXQocG90ZW50aWFsLCBwYXJ0c1swXSkgPT09IHBhcnRzWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXAgPSB0ZW1wLmNvbmNhdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHRlbXA7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjb21wb25lbnQubXVsdGlwbGUnLCBmdW5jdGlvbihtdWx0KSB7XG4gICAgICAgICAgICAgIC8vIEVzdGFibGlzaCBhIGRlZmF1bHQgZm9yIGRhdGEuXG4gICAgICAgICAgICAgICRzY29wZS5kYXRhID0gJHNjb3BlLmRhdGEgfHwge307XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IG51bGw7XG5cbiAgICAgICAgICAgICAgLy8gVXNlIHRoZSBjdXJyZW50IGRhdGEgb3IgZGVmYXVsdC5cbiAgICAgICAgICAgICAgaWYgKCRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KCRzY29wZS5jb21wb25lbnQua2V5KSkge1xuICAgICAgICAgICAgICAgIGlmICghbXVsdCkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIGEgdmFsdWUgaXMgcHJlc2VudCwgYW5kIGl0cyBhbiBhcnJheSwgYXNzaWduIGl0IHRvIHRoZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiBhIHZhbHVlIGlzIHByZXNlbnQgYW5kIGl0IGlzIG5vdCBhbiBhcnJheSwgd3JhcCB0aGUgdmFsdWUuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9ICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdjdXN0b21EZWZhdWx0VmFsdWUnKSkge1xuICAgICAgICAgICAgICAgIGlmICghbXVsdCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBldmFsKCcoZnVuY3Rpb24oZGF0YSkgeyB2YXIgdmFsdWUgPSBcIlwiOycgKyAkc2NvcGUuY29tcG9uZW50LmN1c3RvbURlZmF1bHRWYWx1ZS50b1N0cmluZygpICsgJzsgcmV0dXJuIHZhbHVlOyB9KSgkc2NvcGUuZGF0YSknKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdBbiBlcnJvciBvY2N1cnJlbmQgaW4gYSBjdXN0b20gZGVmYXVsdCB2YWx1ZSBpbiAnICsgJHNjb3BlLmNvbXBvbmVudC5rZXksIGUpO1xuICAgICAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9IGV2YWwoJyhmdW5jdGlvbihkYXRhKSB7IHZhciB2YWx1ZSA9IFwiXCI7JyArICRzY29wZS5jb21wb25lbnQuY3VzdG9tRGVmYXVsdFZhbHVlLnRvU3RyaW5nKCkgKyAnOyByZXR1cm4gdmFsdWU7IH0pKCRzY29wZS5kYXRhKScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdBbiBlcnJvciBvY2N1cnJlbmQgaW4gYSBjdXN0b20gZGVmYXVsdCB2YWx1ZSBpbiAnICsgJHNjb3BlLmNvbXBvbmVudC5rZXksIGUpO1xuICAgICAgICAgICAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdFZhbHVlJykpIHtcbiAgICAgICAgICAgICAgICAvLyBGQS04MzUgLSBUaGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHNlbGVjdCBib3hlcyBhcmUgc2V0IGluIHRoZSBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQudHlwZSA9PT0gJ3NlbGVjdGJveGVzJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBhbmQgaXQgaXMgbm90IGFuIGFycmF5LCB3cmFwIHRoZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAobXVsdCAmJiB0eXBlb2YgJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9ICRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdmFsdWUgPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGT1ItMTkzIC0gRml4IGRlZmF1bHQgdmFsdWUgZm9yIHRoZSBudW1iZXIgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgIC8vIEZPUi0yNjIgLSBGaXggbXVsdGlwbGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhlIG51bWJlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghbXVsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGT1ItMjkwIC0gRml4IGRlZmF1bHQgdmFsdWVzIGZvciBudW1iZXIgY29tcG9uZW50cywgdG8gYWxsb3cgZGVjaW1hbCBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWUuaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHBhcnNlRmxvYXQoJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHBhcnNlSW50KCRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB2YWx1ZS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZPUi0yOTAgLSBGaXggZGVmYXVsdCB2YWx1ZXMgZm9yIG51bWJlciBjb21wb25lbnRzLCB0byBhbGxvdyBkZWNpbWFsIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBGT1ItMTM1IC0gQWRkIGRlZmF1bHQgdmFsdWVzIGZvciBzZWxlY3QgY29tcG9uZW50cy5cbiAgICAgICAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuY29tcG9uZW50LnR5cGUgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB1c2luZyB0aGUgdmFsdWVzIGlucHV0LCBzcGxpdCB0aGUgZGVmYXVsdCB2YWx1ZXMsIGFuZCBzZWFyY2ggdGhlIG9wdGlvbnMgZm9yIGVhY2ggdmFsdWUgaW4gdGhlIGxpc3QuXG4gICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5kYXRhU3JjID09PSAndmFsdWVzJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcCA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQuZGF0YS52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLmluZGV4T2YoaXRlbS52YWx1ZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB0ZW1wO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBJZiB1c2luZyBqc29uIGlucHV0LCBzcGxpdCB0aGUgdmFsdWVzIGFuZCBzZWFyY2ggZWFjaCBrZXkgcGF0aCBmb3IgdGhlIGl0ZW1cbiAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5jb21wb25lbnQuZGF0YVNyYyA9PT0gJ2pzb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmNvbXBvbmVudC5kYXRhLmpzb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb21wb25lbnQuZGF0YS5qc29uID0gSlNPTi5wYXJzZSgkc2NvcGUuY29tcG9uZW50LmRhdGEuanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgcGFyc2UgdGhlIGdpdmVuIEpTT04gZm9yIHRoZSBzZWxlY3QgY29tcG9uZW50OiAnICsgJHNjb3BlLmNvbXBvbmVudC5rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmNvbXBvbmVudC5kYXRhLmpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmRhdGEuanNvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHBsdWNrSXRlbXModmFsdWUsICRzY29wZS5jb21wb25lbnQuZGF0YS5qc29uKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmNvbXBvbmVudC5kYXRhU3JjID09PSAndXJsJyB8fCAkc2NvcGUuY29tcG9uZW50LmRhdGFTcmMgPT09ICdyZXNvdXJjZScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2FpdCB1bnRpbCBsb2FkaW5nIGlzIGRvbmUuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3NlbGVjdExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IHBsdWNrSXRlbXModmFsdWUsICRzY29wZS5zZWxlY3RJdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmICghbXVsdCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgYW5kIGl0IGlzIGFuIGFycmF5LCBhc3NpZ24gaXQgdG8gdGhlIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gTWFrZSB0aGUgZGVmYXVsdFZhbHVlIGEgc2luZ2xlIGVsZW1lbnQgYXJyYXkgYmVjYXVzZSB3ZXJlIG11bHRpLlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gWyRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlXTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDb3VsZG4ndCBzYWZlbHkgZGVmYXVsdCwgZG9uJ3QgYWRkIGEgZ2FyYmFnZSB2YWx1ZS5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2V0IHRoZSBjb21wb25lbnQgbmFtZS5cbiAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgPSAkc2NvcGUuY29tcG9uZW50LmtleTtcbiAgICAgICAgICBpZiAoJHNjb3BlLmdyaWRSb3cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudElkICs9ICgnLScgKyAkc2NvcGUuZ3JpZFJvdyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuZ3JpZENvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgKz0gKCctJyArICRzY29wZS5ncmlkQ29sKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxuICBmdW5jdGlvbihcbiAgICBmb3JtaW9Db21wb25lbnRzXG4gICkge1xuICAgIHJldHVybiB7XG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNvbXBvbmVudDogJz0nLFxuICAgICAgICBkYXRhOiAnPScsXG4gICAgICAgIGZvcm06ICc9JyxcbiAgICAgICAgc3VibWlzc2lvbjogJz0nLFxuICAgICAgICBpZ25vcmU6ICc9PycsXG4gICAgICAgIGJ1aWxkZXI6ICc9PydcbiAgICAgIH0sXG4gICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9jb21wb25lbnQtdmlldy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgJyRzY29wZScsXG4gICAgICAgICdGb3JtaW8nLFxuICAgICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgRm9ybWlvLFxuICAgICAgICAgIEZvcm1pb1V0aWxzXG4gICAgICAgICkge1xuICAgICAgICAgIC8vIFNldCB0aGUgZm9ybSB1cmwuXG4gICAgICAgICAgJHNjb3BlLmZvcm1VcmwgPSAkc2NvcGUuZm9ybSA/IEZvcm1pby5nZXRBcHBVcmwoKSArICcvZm9ybS8nICsgJHNjb3BlLmZvcm0uX2lkLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgICAkc2NvcGUuaXNWaXNpYmxlID0gZnVuY3Rpb24oY29tcG9uZW50LCByb3cpIHtcbiAgICAgICAgICAgIHJldHVybiBGb3JtaW9VdGlscy5pc1Zpc2libGUoXG4gICAgICAgICAgICAgIGNvbXBvbmVudCxcbiAgICAgICAgICAgICAgcm93LFxuICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA/ICRzY29wZS5zdWJtaXNzaW9uLmRhdGEgOiBudWxsLFxuICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIEdldCB0aGUgc2V0dGluZ3MuXG4gICAgICAgICAgdmFyIGNvbXBvbmVudCA9IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1skc2NvcGUuY29tcG9uZW50LnR5cGVdIHx8IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1snY3VzdG9tJ107XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIHRlbXBsYXRlIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIGlmICghY29tcG9uZW50LnZpZXdUZW1wbGF0ZSkge1xuICAgICAgICAgICAgJHNjb3BlLnRlbXBsYXRlID0gJ2Zvcm1pby9lbGVtZW50LXZpZXcuaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBjb21wb25lbnQudmlld1RlbXBsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAkc2NvcGUudGVtcGxhdGUgPSBjb21wb25lbnQudmlld1RlbXBsYXRlKCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnRlbXBsYXRlID0gY29tcG9uZW50LnZpZXdUZW1wbGF0ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCBuYW1lLlxuICAgICAgICAgICRzY29wZS5jb21wb25lbnRJZCA9ICRzY29wZS5jb21wb25lbnQua2V5O1xuICAgICAgICAgIGlmICgkc2NvcGUuZ3JpZFJvdyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50SWQgKz0gKCctJyArICRzY29wZS5ncmlkUm93KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRzY29wZS5ncmlkQ29sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICRzY29wZS5jb21wb25lbnRJZCArPSAoJy0nICsgJHNjb3BlLmdyaWRDb2wpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHNjb3BlOiB7XG4gICAgICBmb3JtOiAnPT8nLFxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXG4gICAgICByZXNvdXJjZU5hbWU6ICc9PycsXG4gICAgICBtZXNzYWdlOiAnPT8nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1kZWxldGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGVsZW1lbnQnLFxuICAgICAgJ0Zvcm1pb1Njb3BlJyxcbiAgICAgICdGb3JtaW8nLFxuICAgICAgJyRodHRwJyxcbiAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRlbGVtZW50LFxuICAgICAgICBGb3JtaW9TY29wZSxcbiAgICAgICAgRm9ybWlvLFxuICAgICAgICAkaHR0cFxuICAgICAgKSB7XG4gICAgICAgICRzY29wZS5fc3JjID0gJHNjb3BlLnNyYyB8fCAnJztcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcbiAgICAgICAgJHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbihhbGVydHMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXNvdXJjZU5hbWUgPSAncmVzb3VyY2UnO1xuICAgICAgICB2YXIgbWV0aG9kTmFtZSA9ICcnO1xuICAgICAgICB2YXIgbG9hZGVyID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xuICAgICAgICAgIGZvcm06IHRydWUsXG4gICAgICAgICAgc3VibWlzc2lvbjogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobG9hZGVyKSB7XG4gICAgICAgICAgcmVzb3VyY2VOYW1lID0gbG9hZGVyLnN1Ym1pc3Npb25JZCA/ICdzdWJtaXNzaW9uJyA6ICdmb3JtJztcbiAgICAgICAgICB2YXIgcmVzb3VyY2VUaXRsZSA9IHJlc291cmNlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICBtZXRob2ROYW1lID0gJ2RlbGV0ZScgKyByZXNvdXJjZVRpdGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSByZXNvdXJjZSBuYW1lXG4gICAgICAgICRzY29wZS5fcmVzb3VyY2VOYW1lID0gJHNjb3BlLnJlc291cmNlTmFtZSB8fCByZXNvdXJjZU5hbWU7XG4gICAgICAgICRzY29wZS5kZWxldGVNZXNzYWdlID0gJHNjb3BlLm1lc3NhZ2UgfHwgJ0FyZSB5b3Ugc3VyZSB5b3Ugd2lzaCB0byBkZWxldGUgdGhlICcgKyAkc2NvcGUuX3Jlc291cmNlTmFtZSArICc/JztcblxuICAgICAgICAvLyBDcmVhdGUgZGVsZXRlIGNhcGFiaWxpdHkuXG4gICAgICAgICRzY29wZS5vbkRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIFJlYnVpbGQgcmVzb3VyY2VUaXRsZSwgJHNjb3BlLnJlc291cmNlTmFtZSBjb3VsZCBoYXZlIGNoYW5nZWRcbiAgICAgICAgICB2YXIgcmVzb3VyY2VOYW1lID0gJHNjb3BlLnJlc291cmNlTmFtZSB8fCAkc2NvcGUuX3Jlc291cmNlTmFtZTtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VUaXRsZSA9IHJlc291cmNlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgZGVsZXRlIGlzIGRvbmUuXG4gICAgICAgICAgdmFyIG9uRGVsZXRlRG9uZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiByZXNvdXJjZVRpdGxlICsgJyB3YXMgZGVsZXRlZC4nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2RlbGV0ZScsIGRhdGEpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoJHNjb3BlLmFjdGlvbikge1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKCRzY29wZS5hY3Rpb24pLnRoZW4ob25EZWxldGVEb25lLCBGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAobG9hZGVyKSB7XG4gICAgICAgICAgICBpZiAoIW1ldGhvZE5hbWUpIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9hZGVyW21ldGhvZE5hbWVdICE9PSAnZnVuY3Rpb24nKSByZXR1cm47XG4gICAgICAgICAgICBsb2FkZXJbbWV0aG9kTmFtZV0oKS50aGVuKG9uRGVsZXRlRG9uZSwgRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUub25DYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2NhbmNlbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIF1cbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJGNvbXBpbGUnLFxuICAnJHRlbXBsYXRlQ2FjaGUnLFxuICBmdW5jdGlvbihcbiAgICAkY29tcGlsZSxcbiAgICAkdGVtcGxhdGVDYWNoZVxuICApIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aCgkY29tcGlsZSgkdGVtcGxhdGVDYWNoZS5nZXQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xuICAgICAgICBzY29wZS4kZW1pdCgnZm9ybUVsZW1lbnRSZW5kZXInLCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiBmYWxzZSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2Vycm9ycy5odG1sJ1xuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgc2NvcGU6IHtcbiAgICAgIGZvcm06ICc9JyxcbiAgICAgIHN1Ym1pc3Npb246ICc9JyxcbiAgICAgIGlnbm9yZTogJz0/J1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vc3VibWlzc2lvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiBbXG4gICAgICAnJHNjb3BlJyxcbiAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICBGb3JtaW9VdGlsc1xuICAgICAgKSB7XG4gICAgICAgICRzY29wZS5pc1Zpc2libGUgPSBmdW5jdGlvbihjb21wb25lbnQsIHJvdykge1xuICAgICAgICAgIHJldHVybiBGb3JtaW9VdGlscy5pc1Zpc2libGUoXG4gICAgICAgICAgICBjb21wb25lbnQsXG4gICAgICAgICAgICByb3csXG4gICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA/ICRzY29wZS5zdWJtaXNzaW9uLmRhdGEgOiBudWxsLFxuICAgICAgICAgICAgJHNjb3BlLmlnbm9yZVxuICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgXVxuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgc2NvcGU6IHtcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm06ICc9PycsXG4gICAgICBzdWJtaXNzaW9uczogJz0/JyxcbiAgICAgIHBlclBhZ2U6ICc9PydcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL3N1Ym1pc3Npb25zLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICckc2NvcGUnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW9TY29wZScsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHNjb3BlLFxuICAgICAgICAkZWxlbWVudCxcbiAgICAgICAgRm9ybWlvU2NvcGVcbiAgICAgICkge1xuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XG4gICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcbiAgICAgICAgLy8gU2hvd3MgdGhlIGdpdmVuIGFsZXJ0cyAoc2luZ2xlIG9yIGFycmF5KSwgYW5kIGRpc21pc3NlcyBvbGQgYWxlcnRzXG4gICAgICAgIHRoaXMuc2hvd0FsZXJ0cyA9ICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdLmNvbmNhdChhbGVydHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5wZXJQYWdlID0gJHNjb3BlLnBlclBhZ2UgPT09IHVuZGVmaW5lZCA/IDEwIDogJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICRzY29wZS5mb3JtaW8gPSBGb3JtaW9TY29wZS5yZWdpc3Rlcigkc2NvcGUsICRlbGVtZW50LCB7XG4gICAgICAgICAgZm9ybTogdHJ1ZSxcbiAgICAgICAgICBzdWJtaXNzaW9uczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSAxO1xuICAgICAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlKSB7XG4gICAgICAgICAgJHNjb3BlLnNraXAgPSAocGFnZSAtIDEpICogJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnRhYmxlVmlldyA9IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgIHJldHVybiAhY29tcG9uZW50Lmhhc093blByb3BlcnR5KCd0YWJsZVZpZXcnKSB8fCBjb21wb25lbnQudGFibGVWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3N1Ym1pc3Npb25zJywgZnVuY3Rpb24oc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICBpZiAoc3VibWlzc2lvbnMgJiYgc3VibWlzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsICRzY29wZS5zdWJtaXNzaW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICBdXG4gIH07XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby13aXphcmQuaHRtbCcsXG4gICAgc2NvcGU6IHtcbiAgICAgIHNyYzogJz0/JyxcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXG4gICAgICBmb3JtOiAnPT8nLFxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcbiAgICAgIHJlYWRPbmx5OiAnPT8nLFxuICAgICAgaGlkZUNvbXBvbmVudHM6ICc9PycsXG4gICAgICBkaXNhYmxlQ29tcG9uZW50czogJz0/JyxcbiAgICAgIGZvcm1pb09wdGlvbnM6ICc9PycsXG4gICAgICBzdG9yYWdlOiAnPT8nXG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgLy8gRnJvbSBodHRwczovL3Npb25ndWkuZ2l0aHViLmlvLzIwMTMvMDUvMTIvYW5ndWxhcmpzLWdldC1lbGVtZW50LW9mZnNldC1wb3NpdGlvbi9cbiAgICAgIHZhciBvZmZzZXQgPSBmdW5jdGlvbihlbG0pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gZWxtLm9mZnNldCgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gRG8gbm90aGluZy4uLlxuICAgICAgICB9XG4gICAgICAgIHZhciByYXdEb20gPSBlbG1bMF07XG4gICAgICAgIHZhciBfeCA9IDA7XG4gICAgICAgIHZhciBfeSA9IDA7XG4gICAgICAgIHZhciBib2R5ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50IHx8IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHZhciBzY3JvbGxYID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGJvZHkuc2Nyb2xsTGVmdDtcbiAgICAgICAgdmFyIHNjcm9sbFkgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgYm9keS5zY3JvbGxUb3A7XG4gICAgICAgIF94ID0gcmF3RG9tLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQgKyBzY3JvbGxYO1xuICAgICAgICBfeSA9IHJhd0RvbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBzY3JvbGxZO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGxlZnQ6IF94LFxuICAgICAgICAgIHRvcDogX3lcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIHNjb3BlLndpemFyZExvYWRlZCA9IGZhbHNlO1xuICAgICAgc2NvcGUud2l6YXJkVG9wID0gb2Zmc2V0KGVsZW1lbnQpLnRvcDtcbiAgICAgIGlmIChzY29wZS53aXphcmRUb3AgPiA1MCkge1xuICAgICAgICBzY29wZS53aXphcmRUb3AgLT0gNTA7XG4gICAgICB9XG4gICAgICBzY29wZS53aXphcmRFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCcuZm9ybWlvLXdpemFyZCcsIGVsZW1lbnQpO1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGNvbXBpbGUnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICdGb3JtaW8nLFxuICAgICAgJ0Zvcm1pb1Njb3BlJyxcbiAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICAnJGh0dHAnLFxuICAgICAgJyR0aW1lb3V0JyxcbiAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAkc2NvcGUsXG4gICAgICAgICRjb21waWxlLFxuICAgICAgICAkZWxlbWVudCxcbiAgICAgICAgRm9ybWlvLFxuICAgICAgICBGb3JtaW9TY29wZSxcbiAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICRodHRwLFxuICAgICAgICAkdGltZW91dFxuICAgICAgKSB7XG4gICAgICAgIHZhciBzZXNzaW9uID0gKCRzY29wZS5zdG9yYWdlICYmICEkc2NvcGUucmVhZE9ubHkpID8gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJHNjb3BlLnN0b3JhZ2UpIDogZmFsc2U7XG4gICAgICAgIGlmIChzZXNzaW9uKSB7XG4gICAgICAgICAgc2Vzc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oc2Vzc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnBhZ2UgPSB7fTtcbiAgICAgICAgJHNjb3BlLnBhZ2VzID0gW107XG4gICAgICAgICRzY29wZS5oYXNUaXRsZXMgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJyc7XG4gICAgICAgIGlmICghJHNjb3BlLnN1Ym1pc3Npb24gfHwgIU9iamVjdC5rZXlzKCRzY29wZS5zdWJtaXNzaW9uKS5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA9IHNlc3Npb24gPyB7ZGF0YTogc2Vzc2lvbi5kYXRhfSA6IHtkYXRhOiB7fX07XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gc2Vzc2lvbiA/IHNlc3Npb24ucGFnZSA6IDA7XG4gICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcblxuICAgICAgICB2YXIgZ2V0Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnI2Zvcm1pby13aXphcmQtZm9ybScpO1xuICAgICAgICAgIGlmICghZWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuY2hpbGRyZW4oKS5zY29wZSgpLmZvcm1pb0Zvcm07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2hvdyB0aGUgY3VycmVudCBwYWdlLlxuICAgICAgICB2YXIgc2hvd1BhZ2UgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICAgICAgICAkc2NvcGUud2l6YXJkTG9hZGVkID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnBhZ2UuY29tcG9uZW50cyA9IFtdO1xuICAgICAgICAgICRzY29wZS5wYWdlLmNvbXBvbmVudHMubGVuZ3RoID0gMDtcbiAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSBwYWdlIGlzIHBhc3QgdGhlIGNvbXBvbmVudHMgbGVuZ3RoLCB0cnkgdG8gY2xlYXIgZmlyc3QuXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmN1cnJlbnRQYWdlID49ICRzY29wZS5wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3RvcmFnZSAmJiAhJHNjb3BlLnJlYWRPbmx5KSB7XG4gICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCRzY29wZS5zdG9yYWdlLCBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgICAgICAgICAgcGFnZTogJHNjb3BlLmN1cnJlbnRQYWdlLFxuICAgICAgICAgICAgICAgIGRhdGE6ICRzY29wZS5zdWJtaXNzaW9uLmRhdGFcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUucGFnZS5jb21wb25lbnRzID0gJHNjb3BlLnBhZ2VzWyRzY29wZS5jdXJyZW50UGFnZV0uY29tcG9uZW50cztcbiAgICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcbiAgICAgICAgICAgIGlmIChzY3JvbGwpIHtcbiAgICAgICAgICAgICAgd2luZG93LnNjcm9sbFRvKDAsICRzY29wZS53aXphcmRUb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLndpemFyZExvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3dpemFyZFBhZ2UnLCAkc2NvcGUuY3VycmVudFBhZ2UpO1xuICAgICAgICAgICAgJHRpbWVvdXQoJHNjb3BlLiRhcHBseS5iaW5kKCRzY29wZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghJHNjb3BlLmZvcm0gJiYgJHNjb3BlLnNyYykge1xuICAgICAgICAgIChuZXcgRm9ybWlvKCRzY29wZS5zcmMpKS5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtO1xuICAgICAgICAgICAgaWYgKCEkc2NvcGUud2l6YXJkTG9hZGVkKSB7XG4gICAgICAgICAgICAgIHNob3dQYWdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcbiAgICAgICAgdGhpcy5zaG93QWxlcnRzID0gJHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbihhbGVydHMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5zdG9yYWdlICYmICEkc2NvcGUucmVhZE9ubHkpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCRzY29wZS5zdG9yYWdlLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0ge2RhdGE6IHt9fTtcbiAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBlcnJvcnMuXG4gICAgICAgICRzY29wZS5jaGVja0Vycm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghJHNjb3BlLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgLy8gQ2hhbmdlIGFsbCBvZiB0aGUgZmllbGRzIHRvIG5vdCBiZSBwcmlzdGluZS5cbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkZWxlbWVudC5maW5kKCdbbmFtZT1cImZvcm1pb0Zvcm1cIl0nKS5jaGlsZHJlbigpLCBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgIHZhciBlbGVtZW50U2NvcGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudCkuc2NvcGUoKTtcbiAgICAgICAgICAgICAgdmFyIGZpZWxkRm9ybSA9IGVsZW1lbnRTY29wZS5mb3JtaW9Gb3JtO1xuICAgICAgICAgICAgICBpZiAoZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XSkge1xuICAgICAgICAgICAgICAgIGZpZWxkRm9ybVtlbGVtZW50U2NvcGUuY29tcG9uZW50LmtleV0uJHByaXN0aW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGZpeCB0aGUgZm9sbG93aW5nIGVycm9ycyBiZWZvcmUgcHJvY2VlZGluZy4nXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU3VibWl0IHRoZSBzdWJtaXNzaW9uLlxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGEgc2FuaXRpemVkIHN1Ym1pc3Npb24gb2JqZWN0LlxuICAgICAgICAgIHZhciBzdWJtaXNzaW9uRGF0YSA9IHtkYXRhOiB7fX07XG4gICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uLl9pZCkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuX2lkID0gJHNjb3BlLnN1Ym1pc3Npb24uX2lkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uZGF0YS5faWQpIHtcbiAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLl9pZCA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGEuX2lkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBncmFiSWRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIShpbnB1dCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICBpbnB1dCA9IFtpbnB1dF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaW5hbCA9IFtdO1xuICAgICAgICAgICAgaW5wdXQuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGlmIChlbGVtZW50ICYmIGVsZW1lbnQuX2lkKSB7XG4gICAgICAgICAgICAgICAgZmluYWwucHVzaChlbGVtZW50Ll9pZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZmluYWw7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBkZWZhdWx0UGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgICBGb3JtaW9VdGlscy5lYWNoQ29tcG9uZW50KCRzY29wZS5mb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAncmVzb3VyY2UnICYmIGNvbXBvbmVudC5rZXkgJiYgY29tcG9uZW50LmRlZmF1bHRQZXJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgIGRlZmF1bHRQZXJtaXNzaW9uc1tjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdWJtaXNzaW9uRGF0YS5kYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5rZXkpICYmIChjb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpKSB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbY29tcG9uZW50LmtleV07XG4gICAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5kYXRhW2NvbXBvbmVudC5rZXldID0gdmFsdWUgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtjb21wb25lbnQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnN1Ym1pc3Npb24uZGF0YSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtrZXldID0gdmFsdWU7XG5cbiAgICAgICAgICAgIC8vIFNldHVwIHRoZSBzdWJtaXNzaW9uIGFjY2Vzcy5cbiAgICAgICAgICAgIHZhciBwZXJtID0gZGVmYXVsdFBlcm1pc3Npb25zW2tleV07XG4gICAgICAgICAgICBpZiAocGVybSkge1xuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgPSBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgfHwgW107XG5cbiAgICAgICAgICAgICAgLy8gQ29lcmNlIHZhbHVlIGludG8gYW4gYXJyYXkgZm9yIHBsdWNraW5nLlxuICAgICAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFRyeSB0byBmaW5kIGFuZCB1cGRhdGUgYW4gZXhpc3RpbmcgcGVybWlzc2lvbi5cbiAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5mb3JFYWNoKGZ1bmN0aW9uKHBlcm1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAocGVybWlzc2lvbi50eXBlID09PSBwZXJtKSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcyA9IHBlcm1pc3Npb24ucmVzb3VyY2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbi5yZXNvdXJjZXMuY29uY2F0KGdyYWJJZHModmFsdWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIC8vIEFkZCBhIHBlcm1pc3Npb24sIGJlY2F1c2Ugb25lIHdhcyBub3QgZm91bmQuXG4gICAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBwZXJtLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBncmFiSWRzKHZhbHVlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gU3RyaXAgb3V0IGFueSBhbmd1bGFyIGtleXMuXG4gICAgICAgICAgc3VibWlzc2lvbkRhdGEgPSBhbmd1bGFyLmNvcHkoc3VibWlzc2lvbkRhdGEpO1xuXG4gICAgICAgICAgdmFyIHN1Ym1pdEV2ZW50ID0gJHNjb3BlLiRlbWl0KCdmb3JtU3VibWl0Jywgc3VibWlzc2lvbkRhdGEpO1xuICAgICAgICAgIGlmIChzdWJtaXRFdmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgIC8vIExpc3RlbmVyIHdhbnRzIHRvIGNhbmNlbCB0aGUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgb25Eb25lID0gZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5zdG9yYWdlICYmICEkc2NvcGUucmVhZE9ubHkpIHtcbiAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU3VibWlzc2lvbiBDb21wbGV0ZSEnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pc3Npb24nLCBzdWJtaXNzaW9uKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gU2F2ZSB0byBzcGVjaWZpZWQgYWN0aW9uLlxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gc3VibWlzc2lvbkRhdGEuX2lkID8gJ3B1dCcgOiAncG9zdCc7XG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Ym1pc3Npb25EYXRhKS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgICAgb25Eb25lKHN1Ym1pc3Npb24pO1xuICAgICAgICAgICAgfSwgRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5mb3JtaW8gJiYgISRzY29wZS5mb3JtaW8ubm9TdWJtaXQpIHtcbiAgICAgICAgICAgICRzY29wZS5mb3JtaW8uc2F2ZVN1Ym1pc3Npb24oc3VibWlzc2lvbkRhdGEpLnRoZW4ob25Eb25lKS5jYXRjaChGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvbkRvbmUoc3VibWlzc2lvbkRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgc2hvd1BhZ2UodHJ1ZSk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdjYW5jZWwnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBNb3ZlIG9udG8gdGhlIG5leHQgcGFnZS5cbiAgICAgICAgJHNjb3BlLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmNoZWNrRXJyb3JzKCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRzY29wZS5jdXJyZW50UGFnZSA+PSAoJHNjb3BlLnBhZ2VzLmxlbmd0aCAtIDEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZSsrO1xuICAgICAgICAgIHNob3dQYWdlKHRydWUpO1xuICAgICAgICAgICRzY29wZS4kZW1pdCgnd2l6YXJkTmV4dCcsICRzY29wZS5jdXJyZW50UGFnZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gTW92ZSBvbnRvIHRoZSBwcmV2aW91cyBwYWdlLlxuICAgICAgICAkc2NvcGUucHJldiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFBhZ2UgPCAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZS0tO1xuICAgICAgICAgIHNob3dQYWdlKHRydWUpO1xuICAgICAgICAgICRzY29wZS4kZW1pdCgnd2l6YXJkUHJldicsICRzY29wZS5jdXJyZW50UGFnZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdvdG8gPSBmdW5jdGlvbihwYWdlKSB7XG4gICAgICAgICAgaWYgKHBhZ2UgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwYWdlID49ICRzY29wZS5wYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnZTtcbiAgICAgICAgICBzaG93UGFnZSh0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWYWxpZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGb3JtKCkuJHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kb24oJ3dpemFyZEdvVG9QYWdlJywgZnVuY3Rpb24oZXZlbnQsIHBhZ2UpIHtcbiAgICAgICAgICAkc2NvcGUuZ290byhwYWdlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVwZGF0ZVBhZ2VzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5wYWdlcy5sZW5ndGggPiA2KSB7XG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjA4MzMzMzMzMzMpKSAvIDIpICogMTAwO1xuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0xJztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjE2NjY2NjY2NjcpKSAvIDIpICogMTAwO1xuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0yJztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGFsbFBhZ2VzID0gW107XG4gICAgICAgIHZhciBoYXNDb25kaXRpb25hbFBhZ2VzID0gZmFsc2U7XG4gICAgICAgIHZhciBzZXRGb3JtID0gZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICRzY29wZS5wYWdlcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgLy8gT25seSBpbmNsdWRlIHBhbmVscyBmb3IgdGhlIHBhZ2VzLlxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAncGFuZWwnKSB7XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmhhc1RpdGxlcyAmJiBjb21wb25lbnQudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaGFzVGl0bGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmN1c3RvbUNvbmRpdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgaGFzQ29uZGl0aW9uYWxQYWdlcyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoY29tcG9uZW50LmNvbmRpdGlvbmFsICYmIGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuKSB7XG4gICAgICAgICAgICAgICAgaGFzQ29uZGl0aW9uYWxQYWdlcyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoaXMgcGFnZSBpcyBub3QgaW4gdGhlIGhpZGUgY29tcG9lbmVudHMgYXJyYXkuXG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAoJHNjb3BlLmhpZGVDb21wb25lbnRzKSAmJlxuICAgICAgICAgICAgICAgIChjb21wb25lbnQua2V5KSAmJlxuICAgICAgICAgICAgICAgICgkc2NvcGUuaGlkZUNvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQua2V5KSAhPT0gLTEpXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhbGxQYWdlcy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICRzY29wZS5wYWdlcy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBGT1ItNzFcbiAgICAgICAgICBpZiAoISRzY29wZS5idWlsZGVyICYmIGhhc0NvbmRpdGlvbmFsUGFnZXMpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3N1Ym1pc3Npb24uZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgdmFyIG5ld1BhZ2VzID0gW107XG4gICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChhbGxQYWdlcywgZnVuY3Rpb24ocGFnZSkge1xuICAgICAgICAgICAgICAgIGlmIChGb3JtaW9VdGlscy5pc1Zpc2libGUocGFnZSwgbnVsbCwgZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgIG5ld1BhZ2VzLnB1c2gocGFnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgJHNjb3BlLnBhZ2VzID0gbmV3UGFnZXM7XG4gICAgICAgICAgICAgIHVwZGF0ZVBhZ2VzKCk7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoJHNjb3BlLiRhcHBseS5iaW5kKCRzY29wZSksIDEwKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICRzY29wZS5mb3JtID0gJHNjb3BlLmZvcm0gPyBhbmd1bGFyLm1lcmdlKCRzY29wZS5mb3JtLCBhbmd1bGFyLmNvcHkoZm9ybSkpIDogYW5ndWxhci5jb3B5KGZvcm0pO1xuICAgICAgICAgICRzY29wZS5wYWdlID0gYW5ndWxhci5jb3B5KGZvcm0pO1xuICAgICAgICAgICRzY29wZS5wYWdlLmRpc3BsYXkgPSAnZm9ybSc7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmRGb3JtTG9hZCcsIGZvcm0pO1xuICAgICAgICAgIHVwZGF0ZVBhZ2VzKCk7XG4gICAgICAgICAgc2hvd1BhZ2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGT1ItNzFcbiAgICAgICAgaWYgKCEkc2NvcGUuYnVpbGRlcikge1xuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2Zvcm0nLCBmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICRzY29wZS5zcmMgfHxcbiAgICAgICAgICAgICAgIWZvcm0gfHxcbiAgICAgICAgICAgICAgIU9iamVjdC5rZXlzKGZvcm0pLmxlbmd0aCB8fFxuICAgICAgICAgICAgICAhZm9ybS5jb21wb25lbnRzIHx8XG4gICAgICAgICAgICAgICFmb3JtLmNvbXBvbmVudHMubGVuZ3RoXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZvcm1VcmwgPSBmb3JtLnByb2plY3QgPyAnL3Byb2plY3QvJyArIGZvcm0ucHJvamVjdCA6ICcnO1xuICAgICAgICAgICAgZm9ybVVybCArPSAnL2Zvcm0vJyArIGZvcm0uX2lkO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oZm9ybVVybCk7XG4gICAgICAgICAgICBzZXRGb3JtKGZvcm0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2hlbiB0aGUgY29tcG9uZW50cyBsZW5ndGggY2hhbmdlcyB1cGRhdGUgdGhlIHBhZ2VzLlxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdmb3JtLmNvbXBvbmVudHMubGVuZ3RoJywgdXBkYXRlUGFnZXMpO1xuXG4gICAgICAgIC8vIExvYWQgdGhlIGZvcm0uXG4gICAgICAgIGlmICgkc2NvcGUuc3JjKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XG4gICAgICAgICAgJHNjb3BlLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgc2V0Rm9ybShmb3JtKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuc3JjID0gJyc7XG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdXG4gIH07XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ0Zvcm1pbycsXG4gICdmb3JtaW9Db21wb25lbnRzJyxcbiAgJyR0aW1lb3V0JyxcbiAgZnVuY3Rpb24oXG4gICAgRm9ybWlvLFxuICAgIGZvcm1pb0NvbXBvbmVudHMsXG4gICAgJHRpbWVvdXRcbiAgKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgaWYgKChlcnJvci5uYW1lID09PSAnVmFsaWRhdGlvbkVycm9yJykgJiYgJGVsZW1lbnQpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmZpbmQoJyNmb3JtLWdyb3VwLScgKyBlcnJvci5kZXRhaWxzWzBdLnBhdGgpLmFkZENsYXNzKCdoYXMtZXJyb3InKTtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gJ1ZhbGlkYXRpb25FcnJvcjogJyArIGVycm9yLmRldGFpbHNbMF0ubWVzc2FnZTtcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcbiAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgIGVycm9yID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgZXJyb3IgPSBKU09OLnN0cmluZ2lmeShlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUVycm9yJywgZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBsb2FkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuZm9ybSA9IGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5mb3JtKSA/ICRzY29wZS5mb3JtIDoge307XG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLnN1Ym1pc3Npb24pID8gJHNjb3BlLnN1Ym1pc3Npb24gOiB7ZGF0YToge319O1xuICAgICAgICAkc2NvcGUuc3VibWlzc2lvbnMgPSBhbmd1bGFyLmlzRGVmaW5lZCgkc2NvcGUuc3VibWlzc2lvbnMpID8gJHNjb3BlLnN1Ym1pc3Npb25zIDogW107XG5cbiAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZWxlbWVudHMgcmVuZGVyZWQuXG4gICAgICAgIHZhciBlbGVtZW50c1JlbmRlcmVkID0gMDtcbiAgICAgICAgJHNjb3BlLiRvbignZm9ybUVsZW1lbnRSZW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50c1JlbmRlcmVkKys7XG4gICAgICAgICAgaWYgKGVsZW1lbnRzUmVuZGVyZWQgPT09ICRzY29wZS5mb3JtLmNvbXBvbmVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtUmVuZGVyJywgJHNjb3BlLmZvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyA9IGZ1bmN0aW9uKF9sb2FkaW5nKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gX2xvYWRpbmc7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlZCB0byBzZXQgdGhlIGZvcm0gYWN0aW9uLlxuICAgICAgICB2YXIgZ2V0QWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgaWYgKCFhY3Rpb24pIHJldHVybiAnJztcbiAgICAgICAgICBpZiAoYWN0aW9uLnN1YnN0cigwLCAxKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSBGb3JtaW8uZ2V0QmFzZVVybCgpICsgYWN0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCB0aGUgYWN0aW9uLlxuICAgICAgICAkc2NvcGUuYWN0aW9uID0gZ2V0QWN0aW9uKCRzY29wZS5mb3JtQWN0aW9uKTtcblxuICAgICAgICAvLyBBbGxvdyBzdWIgY29tcG9uZW50cyB0aGUgYWJpbGl0eSB0byBhZGQgbmV3IGZvcm0gY29tcG9uZW50cyB0byB0aGUgZm9ybS5cbiAgICAgICAgdmFyIGFkZGVkRGF0YSA9IHt9O1xuICAgICAgICAkc2NvcGUuJG9uKCdhZGRGb3JtQ29tcG9uZW50JywgZnVuY3Rpb24oZXZlbnQsIGNvbXBvbmVudCkge1xuICAgICAgICAgIGlmICghYWRkZWREYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5zZXR0aW5ncy5rZXkpKSB7XG4gICAgICAgICAgICBhZGRlZERhdGFbY29tcG9uZW50LnNldHRpbmdzLmtleV0gPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRDb21wb25lbnQgPSBmb3JtaW9Db21wb25lbnRzLmNvbXBvbmVudHNbY29tcG9uZW50LnR5cGVdO1xuICAgICAgICAgICAgJHNjb3BlLmZvcm0uY29tcG9uZW50cy5wdXNoKGFuZ3VsYXIuZXh0ZW5kKGRlZmF1bHRDb21wb25lbnQuc2V0dGluZ3MsIGNvbXBvbmVudC5zZXR0aW5ncykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBhY3Rpb24gaWYgdGhleSBwcm92aWRlZCBpdCBpbiB0aGUgZm9ybS5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZm9ybS5hY3Rpb24nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICB2YXIgYWN0aW9uID0gZ2V0QWN0aW9uKHZhbHVlKTtcbiAgICAgICAgICBpZiAoYWN0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBhIGZvcm0gbG9hZCBldmVudCB3aGVuIHRoZSBjb21wb25lbnRzIGxlbmd0aCBpcyBtb3JlIHRoYW4gMC5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZm9ybS5jb21wb25lbnRzLmxlbmd0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICEkc2NvcGUuZm9ybSB8fFxuICAgICAgICAgICAgISRzY29wZS5mb3JtLmNvbXBvbmVudHMgfHxcbiAgICAgICAgICAgICEkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcodHJ1ZSk7XG4gICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgIGlmICgkc2NvcGUucGVyUGFnZSkgcGFyYW1zLmxpbWl0ID0gJHNjb3BlLnBlclBhZ2U7XG4gICAgICAgICAgaWYgKCRzY29wZS5za2lwKSBwYXJhbXMuc2tpcCA9ICRzY29wZS5za2lwO1xuICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbnMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbnMsIGFuZ3VsYXIuY29weShzdWJtaXNzaW9ucykpO1xuICAgICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcoZmFsc2UpO1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uc0xvYWQnLCBzdWJtaXNzaW9ucyk7XG4gICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAgICAgaWYgKCRzY29wZS5fc3JjKSB7XG4gICAgICAgICAgbG9hZGVyID0gbmV3IEZvcm1pbygkc2NvcGUuX3NyYyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZm9ybSkge1xuICAgICAgICAgICAgJHNjb3BlLnNldExvYWRpbmcodHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIElmIGEgZm9ybSBpcyBhbHJlYWR5IHByb3ZpZGVkLCB0aGVuIHNraXAgdGhlIGxvYWQuXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmZvcm0gJiYgT2JqZWN0LmtleXMoJHNjb3BlLmZvcm0pLmxlbmd0aCkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuZm9ybSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuZm9ybSwgYW5ndWxhci5jb3B5KGZvcm0pKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcbiAgICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9uICYmIGxvYWRlci5zdWJtaXNzaW9uSWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zZXRMb2FkaW5nKHRydWUpO1xuXG4gICAgICAgICAgICAvLyBJZiBhIHN1Ym1pc3Npb24gaXMgYWxyZWFkeSBwcm92aWRlZCwgdGhlbiBza2lwIHRoZSBsb2FkLlxuICAgICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uICYmIE9iamVjdC5rZXlzKCRzY29wZS5zdWJtaXNzaW9uLmRhdGEpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkxvYWQnLCAkc2NvcGUuc3VibWlzc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbiwgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsIHN1Ym1pc3Npb24pO1xuICAgICAgICAgICAgICB9LCB0aGlzLm9uRXJyb3IoJHNjb3BlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRpb25zLnN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU3VibWlzc2lvbnMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy8gSWYgdGhleSBwcm92aWRlIGEgdXJsIHRvIHRoZSBmb3JtLCB3ZSBzdGlsbCBuZWVkIHRvIGNyZWF0ZSBpdCBidXQgdGVsbCBpdCB0byBub3Qgc3VibWl0LlxuICAgICAgICAgIGlmICgkc2NvcGUudXJsKSB7XG4gICAgICAgICAgICBsb2FkZXIgPSBuZXcgRm9ybWlvKCRzY29wZS51cmwpO1xuICAgICAgICAgICAgbG9hZGVyLm5vU3VibWl0ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkc2NvcGUuZm9ybW9Mb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9ICEkc2NvcGUuZm9ybSB8fCAoT2JqZWN0LmtleXMoJHNjb3BlLmZvcm0pLmxlbmd0aCA9PT0gMCkgfHwgISRzY29wZS5mb3JtLmNvbXBvbmVudHMubGVuZ3RoO1xuICAgICAgICAgICRzY29wZS5zZXRMb2FkaW5nKCRzY29wZS5mb3JtTG9hZGluZyk7XG5cbiAgICAgICAgICAvLyBFbWl0IHRoZSBldmVudHMgaWYgdGhlc2Ugb2JqZWN0cyBhcmUgYWxyZWFkeSBsb2FkZWQuXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZm9ybUxvYWRpbmcpIHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuZm9ybSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbikge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsICRzY29wZS5zdWJtaXNzaW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uc0xvYWQnLCAkc2NvcGUuc3VibWlzc2lvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHVybiB0aGUgbG9hZGVyLlxuICAgICAgICByZXR1cm4gbG9hZGVyO1xuICAgICAgfVxuICAgIH07XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBmb3JtaW9VdGlscyA9IHJlcXVpcmUoJ2Zvcm1pby11dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGNoZWNrVmlzaWJsZTogZnVuY3Rpb24oY29tcG9uZW50LCByb3csIGRhdGEpIHtcbiAgICAgIGlmICghZm9ybWlvVXRpbHMuY2hlY2tDb25kaXRpb24oY29tcG9uZW50LCByb3csIGRhdGEpKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdjbGVhck9uSGlkZScpIHx8IGNvbXBvbmVudC5jbGVhck9uSGlkZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBpZiAocm93ICYmIHJvdy5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSkge1xuICAgICAgICAgICAgZGVsZXRlIHJvd1tjb21wb25lbnQua2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSkge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbY29tcG9uZW50LmtleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgaXNWaXNpYmxlOiBmdW5jdGlvbihjb21wb25lbnQsIHJvdywgZGF0YSwgaGlkZSkge1xuICAgICAgLy8gSWYgdGhlIGNvbXBvbmVudCBpcyBpbiB0aGUgaGlkZUNvbXBvbmVudHMgYXJyYXksIHRoZW4gaGlkZSBpdCBieSBkZWZhdWx0LlxuICAgICAgaWYgKGhpZGUgJiYgQXJyYXkuaXNBcnJheShoaWRlKSAmJiAoaGlkZS5pbmRleE9mKGNvbXBvbmVudC5rZXkpICE9PSAtMSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5jaGVja1Zpc2libGUoY29tcG9uZW50LCByb3csIGRhdGEpO1xuICAgIH0sXG4gICAgZmxhdHRlbkNvbXBvbmVudHM6IGZvcm1pb1V0aWxzLmZsYXR0ZW5Db21wb25lbnRzLFxuICAgIGVhY2hDb21wb25lbnQ6IGZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50OiBmb3JtaW9VdGlscy5nZXRDb21wb25lbnQsXG4gICAgZ2V0VmFsdWU6IGZvcm1pb1V0aWxzLmdldFZhbHVlLFxuICAgIGhpZGVGaWVsZHM6IGZ1bmN0aW9uKGZvcm0sIGNvbXBvbmVudHMpIHtcbiAgICAgIHRoaXMuZWFjaENvbXBvbmVudChmb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICBmb3IgKHZhciBpIGluIGNvbXBvbmVudHMpIHtcbiAgICAgICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0gY29tcG9uZW50c1tpXSkge1xuICAgICAgICAgICAgY29tcG9uZW50LnR5cGUgPSAnaGlkZGVuJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgdW5pcXVlTmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIHBhcnRzID0gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teMC05YS16XFwuXS9nLCAnJykuc3BsaXQoJy4nKTtcbiAgICAgIHZhciBmaWxlTmFtZSA9IHBhcnRzWzBdO1xuICAgICAgdmFyIGV4dCA9ICcnO1xuICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZXh0ID0gJy4nICsgcGFydHNbKHBhcnRzLmxlbmd0aCAtIDEpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmaWxlTmFtZS5zdWJzdHIoMCwgMTApICsgJy0nICsgdGhpcy5ndWlkKCkgKyBleHQ7XG4gICAgfSxcbiAgICBndWlkOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpKjE2fDAsIHYgPSBjID09PSAneCcgPyByIDogKHImMHgzfDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZmllbGRXcmFwOiBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgdmFyIG11bHRpSW5wdXQgPSBpbnB1dC5yZXBsYWNlKCdkYXRhW2NvbXBvbmVudC5rZXldJywgJ2RhdGFbY29tcG9uZW50LmtleV1bJGluZGV4XScpO1xuICAgICAgdmFyIGlucHV0TGFiZWwgPSAnPGxhYmVsIG5nLWlmPVwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXCIgZm9yPVwie3sgY29tcG9uZW50LmtleSB9fVwiIGNsYXNzPVwiY29udHJvbC1sYWJlbFwiIG5nLWNsYXNzPVwie1xcJ2ZpZWxkLXJlcXVpcmVkXFwnOiBpc1JlcXVpcmVkKGNvbXBvbmVudCl9XCI+e3sgY29tcG9uZW50LmxhYmVsIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvbGFiZWw+JztcbiAgICAgIHZhciByZXF1aXJlZElubGluZSA9ICc8c3BhbiBuZy1pZj1cIihjb21wb25lbnQuaGlkZUxhYmVsID09PSB0cnVlIHx8IGNvbXBvbmVudC5sYWJlbCA9PT0gXFwnXFwnIHx8ICFjb21wb25lbnQubGFiZWwpICYmIGlzUmVxdWlyZWQoY29tcG9uZW50KVwiIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPic7XG4gICAgICB2YXIgdGVtcGxhdGUgPVxuICAgICAgICAnPGRpdiBuZy1pZj1cIiFjb21wb25lbnQubXVsdGlwbGVcIj4nICtcbiAgICAgICAgICBpbnB1dExhYmVsICtcbiAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwXCI+JyArXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5wcmVmaXhcIj57eyBjb21wb25lbnQucHJlZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgICBpbnB1dCArXG4gICAgICAgICAgICByZXF1aXJlZElubGluZSArXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZm9ybWlvLWVycm9yc1wiPicgK1xuICAgICAgICAgICAgJzxmb3JtaW8tZXJyb3JzIG5nLWlmPVwiOjohYnVpbGRlclwiPjwvZm9ybWlvLWVycm9ycz4nICtcbiAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgbmctaWY9XCIhIWNvbXBvbmVudC5kZXNjcmlwdGlvblwiIGNsYXNzPVwiaGVscC1ibG9ja1wiPicgK1xuICAgICAgICAgICc8c3Bhbj57eyBjb21wb25lbnQuZGVzY3JpcHRpb24gfX08L3NwYW4+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgbmctaWY9XCJjb21wb25lbnQubXVsdGlwbGVcIj48dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1ib3JkZXJlZFwiPicgK1xuICAgICAgICAgIGlucHV0TGFiZWwgK1xuICAgICAgICAgICc8dHIgbmctcmVwZWF0PVwidmFsdWUgaW4gZGF0YVtjb21wb25lbnQua2V5XSB0cmFjayBieSAkaW5kZXhcIj4nICtcbiAgICAgICAgICAgICc8dGQ+JyArXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5wcmVmaXhcIj57eyBjb21wb25lbnQucHJlZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICBtdWx0aUlucHV0ICtcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkSW5saW5lICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXG4gICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJmb3JtaW8tZXJyb3JzXCI+JyArXG4gICAgICAgICAgICAgICAgJzxmb3JtaW8tZXJyb3JzIG5nLWlmPVwiOjohYnVpbGRlclwiPjwvZm9ybWlvLWVycm9ycz4nICtcbiAgICAgICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAgICAgJzwvdGQ+JyArXG4gICAgICAgICAgICAnPHRkPjxhIG5nLWNsaWNrPVwicmVtb3ZlRmllbGRWYWx1ZSgkaW5kZXgpXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHRcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVwiPjwvc3Bhbj48L2E+PC90ZD4nICtcbiAgICAgICAgICAnPC90cj4nICtcbiAgICAgICAgICAnPHRyPicgK1xuICAgICAgICAgICAgJzx0ZCBjb2xzcGFuPVwiMlwiPjxhIG5nLWNsaWNrPVwiYWRkRmllbGRWYWx1ZSgpXCIgY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj4ge3sgY29tcG9uZW50LmFkZEFub3RoZXIgfHwgXCJBZGQgQW5vdGhlclwiIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvYT48L3RkPicgK1xuICAgICAgICAgICc8L3RyPicgK1xuICAgICAgICAnPC90YWJsZT48L2Rpdj4nO1xuICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH1cbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBnZW5lcmljID0gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUsIGNvbXBvbmVudEluZm8pIHtcbiAgICB2YXIgc3RhcnRUYWJsZSA9IGZ1bmN0aW9uKGxhYmVscykge1xuICAgICAgaWYgKCEobGFiZWxzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgIGxhYmVscyA9IFtsYWJlbHNdXG4gICAgICB9XG5cbiAgICAgIHZhciB2aWV3ID0gJzx0YWJsZSBjbGFzcz1cInRhYmxlIHRhYmxlLXN0cmlwZWQgdGFibGUtYm9yZGVyZWRcIj48dGhlYWQ+PHRyPic7XG5cbiAgICAgIGxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmlldyArPSAnPHRoPicgKyBpdGVtICsgJzwvdGg+JztcbiAgICAgIH0pO1xuXG4gICAgICB2aWV3ICs9ICc8L3RyPjwvdGhlYWQ+JztcbiAgICAgIHZpZXcgKz0gJzx0Ym9keT4nO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfTtcblxuICAgIHZhciBtYWtlUm93ID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIHZpZXcgPSAnPHRyPic7XG5cbiAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIGRhdGEgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHZpZXcgKz0gJzx0ZD4nICsgZGF0YSArICc8L3RkPic7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICB2aWV3ICs9IG1ha2VSb3coaXRlbSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBsYWJlbHMgPSBPYmplY3Qua2V5cyhkYXRhKTtcblxuICAgICAgICB2aWV3ICs9IHN0YXJ0VGFibGUobGFiZWxzKTtcbiAgICAgICAgbGFiZWxzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdmlldyArPSBtYWtlUm93KGRhdGFba2V5XSk7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3ICs9IGZpbmlzaFRhYmxlKCk7XG4gICAgICB9XG5cbiAgICAgIHZpZXcgKz0gJzwvdHI+JztcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH07XG5cbiAgICB2YXIgZmluaXNoVGFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSBhIHRlbXBsYXRlXG4gICAgdmFyIHZpZXcgPSAnJztcbiAgICB2YXIgbGFiZWw7XG4gICAgaWYgKCFsYWJlbCAmJiBjb21wb25lbnQgJiYgY29tcG9uZW50LmxhYmVsKSB7XG4gICAgICBsYWJlbCA9IGNvbXBvbmVudC5sYWJlbDtcbiAgICB9XG4gICAgZWxzZSBpZiAoIWxhYmVsICYmIGNvbXBvbmVudCAmJiBjb21wb25lbnQua2V5KSB7XG4gICAgICBsYWJlbCA9IGNvbXBvbmVudC5rZXk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbGFiZWwgPSAnJztcbiAgICB9XG4gICAgdmlldyArPSBzdGFydFRhYmxlKGxhYmVsKTtcbiAgICB2aWV3ICs9IG1ha2VSb3coZGF0YSk7XG4gICAgdmlldyArPSBmaW5pc2hUYWJsZSgpO1xuICAgIHJldHVybiB2aWV3O1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2VuZXJpYzogZ2VuZXJpY1xuICB9O1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9maWx0ZXIgPSByZXF1aXJlKCdsb2Rhc2guZmlsdGVyJyk7XG52YXIgX2dldCA9IHJlcXVpcmUoJ2xvZGFzaC5nZXQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBmaWx0ZXI6IF9maWx0ZXIsXG4gICAgJ2dldCc6IF9nZXRcbiAgfTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJHEnLFxuICAnJHJvb3RTY29wZScsXG4gICdGb3JtaW8nLFxuICBmdW5jdGlvbigkcSwgJHJvb3RTY29wZSwgRm9ybWlvKSB7XG4gICAgdmFyIEludGVyY2VwdG9yID0ge1xuICAgICAgLyoqXG4gICAgICAgKiBVcGRhdGUgSldUIHRva2VuIHJlY2VpdmVkIGZyb20gcmVzcG9uc2UuXG4gICAgICAgKi9cbiAgICAgIHJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSByZXNwb25zZS5oZWFkZXJzKCd4LWp3dC10b2tlbicpO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDAgJiYgdG9rZW4gJiYgdG9rZW4gIT09ICcnKSB7XG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEludGVyY2VwdCBhIHJlc3BvbnNlIGVycm9yLlxuICAgICAgICovXG4gICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQ0MCkge1xuICAgICAgICAgIHJlc3BvbnNlLmxvZ2dlZE91dCA9IHRydWU7XG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKG51bGwpO1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgcmVzcG9uc2UuYm9keSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQwMSkge1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIHJlc3BvbnNlLmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBTZXQgdGhlIHRva2VuIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuXG4gICAgICAgKi9cbiAgICAgIHJlcXVlc3Q6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZiAoY29uZmlnLmRpc2FibGVKV1QpIHJldHVybiBjb25maWc7XG4gICAgICAgIHZhciB0b2tlbiA9IEZvcm1pby5nZXRUb2tlbigpO1xuICAgICAgICBpZiAodG9rZW4pIGNvbmZpZy5oZWFkZXJzWyd4LWp3dC10b2tlbiddID0gdG9rZW47XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBJbnRlcmNlcHRvcjtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW8nLFxuICAnZm9ybWlvQ29tcG9uZW50cycsXG4gICckaW50ZXJwb2xhdGUnLFxuICBmdW5jdGlvbihcbiAgICBGb3JtaW8sXG4gICAgZm9ybWlvQ29tcG9uZW50cyxcbiAgICAkaW50ZXJwb2xhdGVcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBjb21wb25lbnQpIHtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgICAgaWYgKCFjb21wb25lbnQgfHwgIWNvbXBvbmVudC5pbnB1dHx8ICFjb21wb25lbnQudHlwZSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgY29tcG9uZW50SW5mbyA9IGZvcm1pb0NvbXBvbmVudHMuY29tcG9uZW50c1tjb21wb25lbnQudHlwZV07XG4gICAgICBpZiAoIWNvbXBvbmVudEluZm8udGFibGVWaWV3KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgKHZhbHVlLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHZhbHVlLCBmdW5jdGlvbihhcnJheVZhbHVlKSB7XG4gICAgICAgICAgdmFsdWVzLnB1c2goY29tcG9uZW50SW5mby50YWJsZVZpZXcoYXJyYXlWYWx1ZSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUsIGZvcm1pb0NvbXBvbmVudHMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29tcG9uZW50SW5mby50YWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlLCBmb3JtaW9Db21wb25lbnRzKTtcbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJ0Zvcm1pb1V0aWxzJyxcbiAgZnVuY3Rpb24oRm9ybWlvVXRpbHMpIHtcbiAgICByZXR1cm4gRm9ybWlvVXRpbHMuZmxhdHRlbkNvbXBvbmVudHM7XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICAnJHNjZScsXG4gIGZ1bmN0aW9uKFxuICAgICRzY2VcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xuICAgIH07XG4gIH1cbl07XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xuICBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY29tcG9uZW50cykge1xuICAgICAgdmFyIHRhYmxlQ29tcHMgPSBbXTtcbiAgICAgIGlmICghY29tcG9uZW50cyB8fCAhY29tcG9uZW50cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XG4gICAgICB9XG4gICAgICBjb21wb25lbnRzLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChjb21wb25lbnQudGFibGVWaWV3KSB7XG4gICAgICAgICAgdGFibGVDb21wcy5wdXNoKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdmb3JtaW9UYWJsZVZpZXcnLFxuICBmdW5jdGlvbihcbiAgICBmb3JtaW9UYWJsZVZpZXdcbiAgKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBjb21wb25lbnQpIHtcbiAgICAgIHJldHVybiBmb3JtaW9UYWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCk7XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdGb3JtaW8nLFxuICAnZm9ybWlvVGFibGVWaWV3JyxcbiAgZnVuY3Rpb24oXG4gICAgRm9ybWlvLFxuICAgIGZvcm1pb1RhYmxlVmlld1xuICApIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gZm9ybWlvVGFibGVWaWV3KEZvcm1pby5maWVsZERhdGEoZGF0YSwgY29tcG9uZW50KSwgY29tcG9uZW50KTtcbiAgICB9O1xuICB9XG5dO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgJyRmaWx0ZXInLFxuICBmdW5jdGlvbihcbiAgICAkZmlsdGVyXG4gICkge1xuICAgIHJldHVybiBmdW5jdGlvbih0ZXh0LCBrZXksIGJ1aWxkZXIpIHtcbiAgICAgIGlmIChidWlsZGVyKSByZXR1cm4gdGV4dDtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSAkZmlsdGVyKCd0cmFuc2xhdGUnKTtcbiAgICAgICAgLy8gQWxsb3cgdHJhbnNsYXRpbmcgYnkgZmllbGQga2V5IHdoaWNoIGhlbHBzIHdpdGggbGFyZ2UgYmxvY2tzIG9mIGh0bWwuXG4gICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gdHJhbnNsYXRlKGtleSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0ga2V5KSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0cmFuc2xhdGUodGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJhbnNsYXRlKHRleHQpO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXTtcbiIsIlwidXNlIHN0cmljdFwiO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvcG9seWZpbGxzJyk7XG5cblxudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmb3JtaW8nLCBbXG4gICduZ1Nhbml0aXplJyxcbiAgJ3VpLmJvb3RzdHJhcCcsXG4gICd1aS5ib290c3RyYXAuZGF0ZXRpbWVwaWNrZXInLFxuICAndWkuc2VsZWN0JyxcbiAgJ3VpLm1hc2snLFxuICAnYW5ndWxhck1vbWVudCcsXG4gICduZ0ZpbGVVcGxvYWQnLFxuICAnbmdGaWxlU2F2ZXInXG5dKTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGZvcm1pbyBwcm92aWRlcnMuXG4gKi9cbmFwcC5wcm92aWRlcignRm9ybWlvJywgcmVxdWlyZSgnLi9wcm92aWRlcnMvRm9ybWlvJykpO1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgd2F5IHRvIHJlZ2lzdGVyIHRoZSBGb3JtaW8gc2NvcGUuXG4gKi9cbmFwcC5mYWN0b3J5KCdGb3JtaW9TY29wZScsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL0Zvcm1pb1Njb3BlJykpO1xuXG5hcHAuZmFjdG9yeSgnRm9ybWlvVXRpbHMnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9Gb3JtaW9VdGlscycpKTtcblxuYXBwLmZhY3RvcnkoJ0xvZGFzaCcsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL0xvZGFzaCcpKTtcblxuYXBwLmZhY3RvcnkoJ2Zvcm1pb0ludGVyY2VwdG9yJywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvZm9ybWlvSW50ZXJjZXB0b3InKSk7XG5cbmFwcC5mYWN0b3J5KCdmb3JtaW9UYWJsZVZpZXcnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9mb3JtaW9UYWJsZVZpZXcnKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pbycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW8nKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0RlbGV0ZScsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9EZWxldGUnKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0Vycm9ycycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9FcnJvcnMnKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2N1c3RvbVZhbGlkYXRvcicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9jdXN0b21WYWxpZGF0b3InKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1N1Ym1pc3Npb25zJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9TdWJtaXNzaW9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb24nKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0NvbXBvbmVudCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9Db21wb25lbnQnKSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0NvbXBvbmVudFZpZXcnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvQ29tcG9uZW50VmlldycpKTtcblxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRWxlbWVudCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9FbGVtZW50JykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9XaXphcmQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvV2l6YXJkJykpO1xuXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9CaW5kSHRtbCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9CaW5kSHRtbC5qcycpKTtcblxuLyoqXG4gKiBGaWx0ZXIgdG8gZmxhdHRlbiBmb3JtIGNvbXBvbmVudHMuXG4gKi9cbmFwcC5maWx0ZXIoJ2ZsYXR0ZW5Db21wb25lbnRzJywgcmVxdWlyZSgnLi9maWx0ZXJzL2ZsYXR0ZW5Db21wb25lbnRzJykpO1xuYXBwLmZpbHRlcigndGFibGVDb21wb25lbnRzJywgcmVxdWlyZSgnLi9maWx0ZXJzL3RhYmxlQ29tcG9uZW50cycpKTtcbmFwcC5maWx0ZXIoJ3RhYmxlVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZVZpZXcnKSk7XG5hcHAuZmlsdGVyKCd0YWJsZUZpZWxkVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZUZpZWxkVmlldycpKTtcbmFwcC5maWx0ZXIoJ3NhZmVodG1sJywgcmVxdWlyZSgnLi9maWx0ZXJzL3NhZmVodG1sJykpO1xuYXBwLmZpbHRlcignZm9ybWlvVHJhbnNsYXRlJywgcmVxdWlyZSgnLi9maWx0ZXJzL3RyYW5zbGF0ZScpKTtcblxuYXBwLmNvbmZpZyhbXG4gICckaHR0cFByb3ZpZGVyJyxcbiAgJyRpbmplY3RvcicsXG4gIGZ1bmN0aW9uKFxuICAgICRodHRwUHJvdmlkZXIsXG4gICAgJGluamVjdG9yXG4gICkge1xuICAgIGlmICghJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCkge1xuICAgICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCA9IHt9O1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IG5nQW5pbWF0ZSBkb2Vzbid0IG1lc3MgdXAgbG9hZGVyLlxuICAgIHRyeSB7XG4gICAgICAkaW5qZWN0b3IuZ2V0KCckYW5pbWF0ZVByb3ZpZGVyJykuY2xhc3NOYW1lRmlsdGVyKC9eKCg/IShmYS1zcGlubmVyfGdseXBoaWNvbi1zcGluKSkuKSokLyk7XG4gICAgfVxuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXG4gICAgY2F0Y2ggKGVycikge31cbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWVtcHR5ICovXG5cbiAgICAvLyBEaXNhYmxlIElFIGNhY2hpbmcgZm9yIEdFVCByZXF1ZXN0cy5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5nZXQuUHJhZ21hID0gJ25vLWNhY2hlJztcbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdmb3JtaW9JbnRlcmNlcHRvcicpO1xuICB9XG5dKTtcblxuYXBwLnJ1bihbXG4gICckdGVtcGxhdGVDYWNoZScsXG4gIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICAgLy8gVGhlIHRlbXBsYXRlIGZvciB0aGUgZm9ybWlvIGZvcm1zLlxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLmh0bWwnLFxuICAgICAgXCI8ZGl2PlxcbiAgPGkgc3R5bGU9XFxcImZvbnQtc2l6ZTogMmVtO1xcXCIgbmctaWY9XFxcImZvcm1Mb2FkaW5nXFxcIiBuZy1jbGFzcz1cXFwieydmb3JtaW8taGlkZGVuJzogIWZvcm1Mb2FkaW5nfVxcXCIgY2xhc3M9XFxcImZvcm1pby1sb2FkaW5nIGdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcbiAgPGZvcm1pby13aXphcmQgbmctaWY9XFxcImZvcm0uZGlzcGxheSA9PT0gJ3dpemFyZCdcXFwiIHNyYz1cXFwic3JjXFxcIiBmb3JtPVxcXCJmb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIiBmb3JtLWFjdGlvbj1cXFwiZm9ybUFjdGlvblxcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCIgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCIgZGlzYWJsZS1jb21wb25lbnRzPVxcXCJkaXNhYmxlQ29tcG9uZW50c1xcXCIgZm9ybWlvLW9wdGlvbnM9XFxcImZvcm1pb09wdGlvbnNcXFwiIHN0b3JhZ2U9XFxcImZvcm0ubmFtZVxcXCI+PC9mb3JtaW8td2l6YXJkPlxcbiAgPGZvcm0gbmctaWY9XFxcIiFmb3JtLmRpc3BsYXkgfHwgKGZvcm0uZGlzcGxheSA9PT0gJ2Zvcm0nKVxcXCIgcm9sZT1cXFwiZm9ybVxcXCIgbmFtZT1cXFwiZm9ybWlvRm9ybVxcXCIgbmctc3VibWl0PVxcXCJvblN1Ym1pdChmb3JtaW9Gb3JtKVxcXCIgbm92YWxpZGF0ZT5cXG4gICAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0cyB0cmFjayBieSAkaW5kZXhcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC17eyBhbGVydC50eXBlIH19XFxcIiByb2xlPVxcXCJhbGVydFxcXCIgbmctaWY9XFxcIjo6IWJ1aWxkZXJcXFwiPlxcbiAgICAgIHt7IGFsZXJ0Lm1lc3NhZ2UgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19XFxuICAgIDwvZGl2PlxcbiAgICA8IS0tIERPIE5PVCBQVVQgXFxcInRyYWNrIGJ5ICRpbmRleFxcXCIgSEVSRSBTSU5DRSBEWU5BTUlDQUxMWSBBRERJTkcvUkVNT1ZJTkcgQ09NUE9ORU5UUyBXSUxMIEJSRUFLIC0tPlxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudFxcbiAgICAgIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiXFxuICAgICAgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiXFxuICAgICAgbmctaWY9XFxcImJ1aWxkZXIgPyAnOjp0cnVlJyA6IGlzVmlzaWJsZShjb21wb25lbnQpXFxcIlxcbiAgICAgIGRhdGE9XFxcInN1Ym1pc3Npb24uZGF0YVxcXCJcXG4gICAgICBmb3JtaW8tZm9ybT1cXFwiZm9ybWlvRm9ybVxcXCJcXG4gICAgICBmb3JtaW89XFxcImZvcm1pb1xcXCJcXG4gICAgICBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIlxcbiAgICAgIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiXFxuICAgICAgcmVhZC1vbmx5PVxcXCJpc0Rpc2FibGVkKGNvbXBvbmVudCwgc3VibWlzc2lvbi5kYXRhKVxcXCJcXG4gICAgICBidWlsZGVyPVxcXCJidWlsZGVyXFxcIlxcbiAgICA+PC9mb3JtaW8tY29tcG9uZW50PlxcbiAgPC9mb3JtPlxcbjwvZGl2PlxcblwiXG4gICAgKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLXdpemFyZC5odG1sJyxcbiAgICAgIFwiPGRpdiBjbGFzcz1cXFwiZm9ybWlvLXdpemFyZC13cmFwcGVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInJvdyBicy13aXphcmRcXFwiIHN0eWxlPVxcXCJib3JkZXItYm90dG9tOjA7XFxcIiBuZy1jbGFzcz1cXFwie2hhc1RpdGxlczogaGFzVGl0bGVzfVxcXCI+XFxuICAgIDxkaXYgbmctY2xhc3M9XFxcIntkaXNhYmxlZDogKCRpbmRleCA+IGN1cnJlbnRQYWdlKSwgYWN0aXZlOiAoJGluZGV4ID09IGN1cnJlbnRQYWdlKSwgY29tcGxldGU6ICgkaW5kZXggPCBjdXJyZW50UGFnZSksIG5vVGl0bGU6ICFwYWdlLnRpdGxlfVxcXCIgY2xhc3M9XFxcInt7IGNvbGNsYXNzIH19IGJzLXdpemFyZC1zdGVwXFxcIiBuZy1yZXBlYXQ9XFxcInBhZ2UgaW4gcGFnZXMgdHJhY2sgYnkgJGluZGV4XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJicy13aXphcmQtc3RlcG51bS13cmFwcGVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInRleHQtY2VudGVyIGJzLXdpemFyZC1zdGVwbnVtXFxcIiBuZy1pZj1cXFwicGFnZS50aXRsZVxcXCI+e3sgcGFnZS50aXRsZSB9fTwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj48ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXIgcHJvZ3Jlc3MtYmFyLXByaW1hcnlcXFwiPjwvZGl2PjwvZGl2PlxcbiAgICAgIDxhIG5nLWNsaWNrPVxcXCJnb3RvKCRpbmRleClcXFwiIGNsYXNzPVxcXCJicy13aXphcmQtZG90IGJnLXByaW1hcnlcXFwiPjxkaXYgY2xhc3M9XFxcImJzLXdpemFyZC1kb3QtaW5uZXIgYmctc3VjY2Vzc1xcXCI+PC9kaXY+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbiAgPHN0eWxlIHR5cGU9XFxcInRleHQvY3NzXFxcIj4uYnMtd2l6YXJkID4gLmJzLXdpemFyZC1zdGVwOmZpcnN0LWNoaWxkIHsgbWFyZ2luLWxlZnQ6IHt7IG1hcmdpbiB9fSU7IH08L3N0eWxlPlxcbiAgPGkgbmctc2hvdz1cXFwiIXdpemFyZExvYWRlZFxcXCIgaWQ9XFxcImZvcm1pby1sb2FkaW5nXFxcIiBzdHlsZT1cXFwiZm9udC1zaXplOiAyZW07XFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoIGdseXBoaWNvbi1zcGluXFxcIj48L2k+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj57eyBhbGVydC5tZXNzYWdlIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlciB9fTwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybWlvLXdpemFyZFxcXCI+XFxuICAgIDxmb3JtaW9cXG4gICAgICBuZy1pZj1cXFwid2l6YXJkTG9hZGVkXFxcIlxcbiAgICAgIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiXFxuICAgICAgZm9ybT1cXFwicGFnZVxcXCJcXG4gICAgICByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIlxcbiAgICAgIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiXFxuICAgICAgZGlzYWJsZS1jb21wb25lbnRzPVxcXCJkaXNhYmxlQ29tcG9uZW50c1xcXCJcXG4gICAgICBmb3JtaW8tb3B0aW9ucz1cXFwiZm9ybWlvT3B0aW9uc1xcXCJcXG4gICAgICBpZD1cXFwiZm9ybWlvLXdpemFyZC1mb3JtXFxcIlxcbiAgICA+PC9mb3JtaW8+XFxuICA8L2Rpdj5cXG4gIDx1bCBuZy1zaG93PVxcXCJ3aXphcmRMb2FkZWRcXFwiIGNsYXNzPVxcXCJsaXN0LWlubGluZVxcXCI+XFxuICAgIDxsaT48YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBuZy1jbGljaz1cXFwiY2FuY2VsKClcXFwiPkNhbmNlbDwvYT48L2xpPlxcbiAgICA8bGkgbmctaWY9XFxcImN1cnJlbnRQYWdlID4gMFxcXCI+PGEgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcInByZXYoKVxcXCI+UHJldmlvdXM8L2E+PC9saT5cXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA8IChwYWdlcy5sZW5ndGggLSAxKVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcIm5leHQoKVxcXCI+TmV4dDwvYT5cXG4gICAgPC9saT5cXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA+PSAocGFnZXMubGVuZ3RoIC0gMSlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIG5nLWNsaWNrPVxcXCJzdWJtaXQoKVxcXCI+U3VibWl0IEZvcm08L2E+XFxuICAgIDwvbGk+XFxuICA8L3VsPlxcbjwvZGl2PlxcblwiXG4gICAgKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWRlbGV0ZS5odG1sJyxcbiAgICAgIFwiPGZvcm0gcm9sZT1cXFwiZm9ybVxcXCI+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj5cXG4gICAge3sgYWxlcnQubWVzc2FnZSB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX1cXG4gIDwvZGl2PlxcbiAgPGgzPnt7IGRlbGV0ZU1lc3NhZ2UgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyIH19PC9oMz5cXG4gIDxkaXYgY2xhc3M9XFxcImJ0bi10b29sYmFyXFxcIj5cXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25EZWxldGUoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyXFxcIj57eyAnWWVzJyB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25DYW5jZWwoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+e3sgJ05vJyB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX08L2J1dHRvbj5cXG4gIDwvZGl2PlxcbjwvZm9ybT5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgXCI8ZGl2PlxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIiBuZy1pZj1cXFwic3VibWlzc2lvbiAmJiBzdWJtaXNzaW9uLmRhdGFcXFwiPlxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudC12aWV3XFxuICAgICAgZm9ybT1cXFwiZm9ybVxcXCJcXG4gICAgICBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCJcXG4gICAgICBkYXRhPVxcXCJzdWJtaXNzaW9uLmRhdGFcXFwiXFxuICAgICAgaWdub3JlPVxcXCJpZ25vcmVcXFwiXFxuICAgICAgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCJcXG4gICAgICBuZy1pZj1cXFwiYnVpbGRlciA/ICc6OnRydWUnIDogaXNWaXNpYmxlKGNvbXBvbmVudClcXFwiXFxuICAgICAgYnVpbGRlcj1cXFwiYnVpbGRlclxcXCJcXG4gICAgPjwvZm9ybWlvLWNvbXBvbmVudC12aWV3PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCJcbiAgICApO1xuXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vc3VibWlzc2lvbnMuaHRtbCcsXG4gICAgICBcIjxkaXY+XFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj5cXG4gICAge3sgYWxlcnQubWVzc2FnZSB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXIgfX1cXG4gIDwvZGl2PlxcbiAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDx0aGVhZD5cXG4gICAgICA8dHI+XFxuICAgICAgICA8dGggbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gZm9ybS5jb21wb25lbnRzIHwgZmxhdHRlbkNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIiBuZy1pZj1cXFwidGFibGVWaWV3KGNvbXBvbmVudClcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19PC90aD5cXG4gICAgICAgIDx0aD5TdWJtaXR0ZWQ8L3RoPlxcbiAgICAgICAgPHRoPlVwZGF0ZWQ8L3RoPlxcbiAgICAgICAgPHRoPk9wZXJhdGlvbnM8L3RoPlxcbiAgICAgIDwvdHI+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJzdWJtaXNzaW9uIGluIHN1Ym1pc3Npb25zIHRyYWNrIGJ5ICRpbmRleFxcXCIgY2xhc3M9XFxcImZvcm1pby1zdWJtaXNzaW9uXFxcIiBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25WaWV3Jywgc3VibWlzc2lvbilcXFwiPlxcbiAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB8IGZsYXR0ZW5Db21wb25lbnRzIHRyYWNrIGJ5ICRpbmRleFxcXCIgbmctaWY9XFxcInRhYmxlVmlldyhjb21wb25lbnQpXFxcIj57eyBzdWJtaXNzaW9uLmRhdGEgfCB0YWJsZVZpZXc6Y29tcG9uZW50IH19PC90ZD5cXG4gICAgICAgIDx0ZD57eyBzdWJtaXNzaW9uLmNyZWF0ZWQgfCBhbURhdGVGb3JtYXQ6J2wsIGg6bW06c3MgYScgfX08L3RkPlxcbiAgICAgICAgPHRkPnt7IHN1Ym1pc3Npb24ubW9kaWZpZWQgfCBhbURhdGVGb3JtYXQ6J2wsIGg6bW06c3MgYScgfX08L3RkPlxcbiAgICAgICAgPHRkPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJidXR0b24tZ3JvdXBcXFwiIHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7XFxcIj5cXG4gICAgICAgICAgICA8YSBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25WaWV3Jywgc3VibWlzc2lvbik7ICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnkgYnRuLXhzXFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1leWUtb3BlblxcXCI+PC9zcGFuPjwvYT4mbmJzcDtcXG4gICAgICAgICAgICA8YSBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25FZGl0Jywgc3VibWlzc2lvbik7ICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYnRuLXhzXFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1lZGl0XFxcIj48L3NwYW4+PC9hPiZuYnNwO1xcbiAgICAgICAgICAgIDxhIG5nLWNsaWNrPVxcXCIkZW1pdCgnc3VibWlzc2lvbkRlbGV0ZScsIHN1Ym1pc3Npb24pOyAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXIgYnRuLXhzXFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUtY2lyY2xlXFxcIj48L3NwYW4+PC9hPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGQ+XFxuICAgICAgPC90cj5cXG4gICAgPC90Ym9keT5cXG4gIDwvdGFibGU+XFxuICA8cGFnaW5hdGlvblxcbiAgICBuZy1pZj1cXFwic3VibWlzc2lvbnMuc2VydmVyQ291bnQgPiBwZXJQYWdlXFxcIlxcbiAgICBuZy1tb2RlbD1cXFwiY3VycmVudFBhZ2VcXFwiXFxuICAgIG5nLWNoYW5nZT1cXFwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXFxcIlxcbiAgICB0b3RhbC1pdGVtcz1cXFwic3VibWlzc2lvbnMuc2VydmVyQ291bnRcXFwiXFxuICAgIGl0ZW1zLXBlci1wYWdlPVxcXCJwZXJQYWdlXFxcIlxcbiAgICBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIlxcbiAgICBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCJcXG4gICAgZmlyc3QtdGV4dD1cXFwiJmxhcXVvO1xcXCJcXG4gICAgbGFzdC10ZXh0PVxcXCImcmFxdW87XFxcIlxcbiAgICA+XFxuICA8L3BhZ2luYXRpb24+XFxuPC9kaXY+XFxuXCJcbiAgICApO1xuXG4gICAgLy8gQSBmb3JtaW8gY29tcG9uZW50IHRlbXBsYXRlLlxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudC5odG1sJyxcbiAgICAgIFwiPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cCBoYXMtZmVlZGJhY2sgZm9ybS1maWVsZC10eXBlLXt7IGNvbXBvbmVudC50eXBlIH19IGZvcm1pby1jb21wb25lbnQte3sgY29tcG9uZW50LmtleSB9fSB7e2NvbXBvbmVudC5jdXN0b21DbGFzc319XFxcIiBpZD1cXFwiZm9ybS1ncm91cC17eyBjb21wb25lbnRJZCB9fVxcXCIgbmctY2xhc3M9XFxcInsnaGFzLWVycm9yJzogZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGludmFsaWQgJiYgIWZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRwcmlzdGluZSB9XFxcIiBuZy1zdHlsZT1cXFwiY29tcG9uZW50LnN0eWxlXFxcIiBuZy1oaWRlPVxcXCJjb21wb25lbnQuaGlkZGVuXFxcIj5cXG4gIDxmb3JtaW8tZWxlbWVudD48L2Zvcm1pby1lbGVtZW50PlxcbjwvZGl2PlxcblwiXG4gICAgKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudC12aWV3Lmh0bWwnLFxuICAgICAgXCI8ZGl2IG5hbWU9XFxcInt7IGNvbXBvbmVudElkIH19XFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBoYXMtZmVlZGJhY2sgZm9ybS1maWVsZC10eXBlLXt7IGNvbXBvbmVudC50eXBlIH19IHt7Y29tcG9uZW50LmN1c3RvbUNsYXNzfX0gZm9ybWlvLWNvbXBvbmVudC17eyBjb21wb25lbnQua2V5IH19XFxcIiBpZD1cXFwiZm9ybS1ncm91cC17eyBjb21wb25lbnRJZCB9fVxcXCIgbmctc3R5bGU9XFxcImNvbXBvbmVudC5zdHlsZVxcXCI+XFxuICA8Zm9ybWlvLWVsZW1lbnQ+PC9mb3JtaW8tZWxlbWVudD5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9lbGVtZW50LXZpZXcuaHRtbCcsXG4gICAgICBcIjxkaXY+XFxuICA8ZGl2IG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWxcXFwiPjxzdHJvbmc+e3sgY29tcG9uZW50LmxhYmVsIH19PC9zdHJvbmc+PC9kaXY+XFxuICA8ZGl2IGZvcm1pby1iaW5kLWh0bWw9XFxcImRhdGEgfCB0YWJsZVZpZXc6Y29tcG9uZW50XFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG5cbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9lcnJvcnMuaHRtbCcsXG4gICAgICBcIjxkaXYgbmctc2hvdz1cXFwiZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGVycm9yICYmICFmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kcHJpc3RpbmVcXFwiPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5lbWFpbFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IHt7J211c3QgYmUgYSB2YWxpZCBlbWFpbCcgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyfX0uPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5yZXF1aXJlZFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IHt7J2lzIHJlcXVpcmVkJyB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXJ9fS48L3A+XFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGVycm9yLm51bWJlclxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IHt7J211c3QgYmUgYSBudW1iZXInIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlcn19LjwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IubWF4bGVuZ3RoXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LnBsYWNlaG9sZGVyIHx8IGNvbXBvbmVudC5rZXkgfX0ge3snbXVzdCBiZSBzaG9ydGVyIHRoYW4nIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlcn19IHt7IGNvbXBvbmVudC52YWxpZGF0ZS5tYXhMZW5ndGggKyAxIH19IHt7J2NoYXJhY3RlcnMnIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlcn19LjwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IubWlubGVuZ3RoXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LnBsYWNlaG9sZGVyIHx8IGNvbXBvbmVudC5rZXkgfX0ge3snbXVzdCBiZSBsb25nZXIgdGhhbicgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyfX0ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1pbkxlbmd0aCAtIDEgfX0ge3snY2hhcmFjdGVycycgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyfX0uPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5taW5cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQucGxhY2Vob2xkZXIgfHwgY29tcG9uZW50LmtleSB9fSB7eydtdXN0IGJlIGhpZ2hlciB0aGFuJyB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXJ9fSB7eyBjb21wb25lbnQudmFsaWRhdGUubWluIC0gMSB9fS48L3A+XFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRm9ybVtjb21wb25lbnRJZF0uJGVycm9yLm1heFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IHt7J211c3QgYmUgbG93ZXIgdGhhbicgfCBmb3JtaW9UcmFuc2xhdGU6bnVsbDpidWlsZGVyfX0ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1heCArIDEgfX0uPC9wPlxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0Zvcm1bY29tcG9uZW50SWRdLiRlcnJvci5jdXN0b21cXFwiPnt7IGNvbXBvbmVudC5jdXN0b21FcnJvciB8IGZvcm1pb1RyYW5zbGF0ZSB9fTwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IucGF0dGVyblxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5wbGFjZWhvbGRlciB8fCBjb21wb25lbnQua2V5IH19IHt7J2RvZXMgbm90IG1hdGNoIHRoZSBwYXR0ZXJuJyB8IGZvcm1pb1RyYW5zbGF0ZTpudWxsOmJ1aWxkZXJ9fSB7eyBjb21wb25lbnQudmFsaWRhdGUucGF0dGVybiB9fTwvcD5cXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9Gb3JtW2NvbXBvbmVudElkXS4kZXJyb3IuZGF5XFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LnBsYWNlaG9sZGVyIHx8IGNvbXBvbmVudC5rZXkgfX0ge3snbXVzdCBiZSBhIHZhbGlkIGRhdGUnIHwgZm9ybWlvVHJhbnNsYXRlOm51bGw6YnVpbGRlcn19LjwvcD5cXG48L2Rpdj5cXG5cIlxuICAgICk7XG4gIH1cbl0pO1xuXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuJ3VzZSBzdHJpY3QnO1xuXG5pZiAodHlwZW9mIE9iamVjdC5hc3NpZ24gIT0gJ2Z1bmN0aW9uJykge1xuICAoZnVuY3Rpb24oKSB7XG4gICAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgLy8gV2UgbXVzdCBjaGVjayBhZ2FpbnN0IHRoZXNlIHNwZWNpZmljIGNhc2VzLlxuICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG91dHB1dCA9IE9iamVjdCh0YXJnZXQpO1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgbWF4LWRlcHRoICovXG4gICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgaWYgKHNvdXJjZSAhPT0gdW5kZWZpbmVkICYmIHNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KG5leHRLZXkpKSB7XG4gICAgICAgICAgICAgIG91dHB1dFtuZXh0S2V5XSA9IHNvdXJjZVtuZXh0S2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8qIGVzbGludC1lbmFibGUgbWF4LWRlcHRoICovXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG4gIH0pKCk7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9PYmplY3QuYXNzaWduJyk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIFRoZSBmb3JtaW8gY2xhc3MuXG4gIHZhciBGb3JtaW8gPSByZXF1aXJlKCdmb3JtaW9qcycpO1xuXG4gIC8vIFJldHVybiB0aGUgcHJvdmlkZXIgaW50ZXJmYWNlLlxuICByZXR1cm4ge1xuXG4gICAgLy8gRXhwb3NlIEZvcm1pbyBjb25maWd1cmF0aW9uIGZ1bmN0aW9uc1xuICAgIHNldEJhc2VVcmw6IEZvcm1pby5zZXRCYXNlVXJsLFxuICAgIGdldEJhc2VVcmw6IEZvcm1pby5nZXRCYXNlVXJsLFxuICAgIHNldEFwaVVybDogRm9ybWlvLnNldEJhc2VVcmwsXG4gICAgZ2V0QXBpVXJsOiBGb3JtaW8uZ2V0QmFzZVVybCxcbiAgICBzZXRBcHBVcmw6IEZvcm1pby5zZXRBcHBVcmwsXG4gICAgZ2V0QXBwVXJsOiBGb3JtaW8uZ2V0QXBwVXJsLFxuICAgIHJlZ2lzdGVyUGx1Z2luOiBGb3JtaW8ucmVnaXN0ZXJQbHVnaW4sXG4gICAgZ2V0UGx1Z2luOiBGb3JtaW8uZ2V0UGx1Z2luLFxuICAgIHByb3ZpZGVyczogRm9ybWlvLnByb3ZpZGVycyxcbiAgICBzZXREb21haW46IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gUmVtb3ZlIHRoaXM/XG4gICAgfSxcblxuICAgICRnZXQ6IFtcbiAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICckcScsXG4gICAgICBmdW5jdGlvbihcbiAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgJHFcbiAgICAgICkge1xuICAgICAgICB2YXIgd3JhcFFQcm9taXNlID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICAgIHJldHVybiAkcS53aGVuKHByb21pc2UpXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IgPT09ICdVbmF1dGhvcml6ZWQnKSB7XG4gICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGVycm9yID09PSAnTG9naW4gVGltZW91dCcpIHtcbiAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdmb3JtaW8uc2Vzc2lvbkV4cGlyZWQnLCBlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQcm9wYWdhdGUgZXJyb3JcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm1pby5yZWdpc3RlclBsdWdpbih7XG4gICAgICAgICAgcHJpb3JpdHk6IC0xMDAsXG4gICAgICAgICAgLy8gV3JhcCBGb3JtaW8ucmVxdWVzdCdzIHByb21pc2VzIHdpdGggJHEgc28gJGFwcGx5IGdldHMgY2FsbGVkIGNvcnJlY3RseS5cbiAgICAgICAgICB3cmFwUmVxdWVzdFByb21pc2U6IHdyYXBRUHJvbWlzZSxcbiAgICAgICAgICB3cmFwU3RhdGljUmVxdWVzdFByb21pc2U6IHdyYXBRUHJvbWlzZVxuICAgICAgICB9LCAnbmdGb3JtaW9Qcm9taXNlV3JhcHBlcicpO1xuXG4gICAgICAgIC8vIEJyb2FkY2FzdCBvZmZsaW5lIGV2ZW50cyBmcm9tICRyb290U2NvcGVcbiAgICAgICAgRm9ybWlvLmV2ZW50cy5vbkFueShmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZXZlbnQgPSAnZm9ybWlvLicgKyB0aGlzLmV2ZW50O1xuICAgICAgICAgIHZhciBhcmdzID0gW10uc3BsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgICBhcmdzLnVuc2hpZnQoZXZlbnQpO1xuICAgICAgICAgICRyb290U2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0LmFwcGx5KCRyb290U2NvcGUsIGFyZ3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGZvcm1pbyBpbnRlcmZhY2UuXG4gICAgICAgIHJldHVybiBGb3JtaW87XG4gICAgICB9XG4gICAgXVxuICB9O1xufTtcbiJdfQ==