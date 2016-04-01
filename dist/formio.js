(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
module.exports = {
  /**
   * Iterate through each component within a form.
   * @param components
   * @param fn
   */
  eachComponent: function eachComponent(components, fn) {
    if (!components) return;

    components.forEach(function(component) {
      if (component.columns && Array.isArray(component.columns)) {
        component.columns.forEach(function(column) {
          eachComponent(column.components, fn);
        });
      }

      else if (component.rows && Array.isArray(component.rows)) {
        [].concat.apply([], component.rows).forEach(function(row) {
          eachComponent(row.components, fn);
        });
      }

      else if (component.components && Array.isArray(component.components)) {
        eachComponent(component.components, fn);
      }

      else {
        fn(component);
      }
      // If the component is a tree, be sure to add it back in as well.
      if (component.tree) {
        fn(component);
      }
    });
  },

  /**
   * Get a component by its key
   * @param components
   * @param key The key of the component to get
   * @returns The component that matches the given key, or undefined if not found.
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
   * @param components
   * @param flattened
   * @returns {*|{}}
   */
  flattenComponents: function flattenComponents(components) {
    var flattened = {};
    module.exports.eachComponent(components, function(component) {
      flattened[component.key] = component;
    });
    return flattened;
  }
};

},{}],3:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))

},{"_process":1}],4:[function(require,module,exports){
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
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

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

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
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
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
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
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

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

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
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
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
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

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
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
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
(function() {
  'use strict';

  if (self.fetch) {
    return
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = name.toString();
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = value.toString();
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
        new Blob();
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self
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
      } else {
        throw new Error('unsupported BodyInit type')
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

  function Request(url, options) {
    options = options || {}
    this.url = url

    this.credentials = options.credentials || 'omit'
    this.headers = new Headers(options.headers)
    this.method = normalizeMethod(options.method || 'GET')
    this.mode = options.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && options.body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(options.body)
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
    var pairs = xhr.getAllResponseHeaders().trim().split('\n')
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

    this._initBody(bodyInit)
    this.type = 'default'
    this.url = null
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
  }

  Body.call(Response.prototype)

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function(input, init) {
    // TODO: Request constructor should accept input, init
    var request
    if (Request.prototype.isPrototypeOf(input) && !init) {
      request = input
    } else {
      request = new Request(input, init)
    }

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return;
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
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
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
})();

},{}],7:[function(require,module,exports){
'use strict';

require('whatwg-fetch');
var Q = require('Q');
var EventEmitter = require('eventemitter2').EventEmitter2;
var copy = require('shallow-copy');

// The default base url.
var baseUrl = '';

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
  return Q.all(plugins.map(function(plugin) {
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
    if (!plugin) return Q(null);
    return Q((plugin && plugin[pluginFn] || noop).apply(plugin, [].slice.call(arguments, 2)))
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
  return url.match(/^(http[s]?:\/\/)([^/]+)($|\/.*)/);
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
    if (!this[_id]) { return Q.reject('Missing ' + _id); }
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
    if (!this[_id]) { Q.reject('Nothing to delete'); }
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

Formio.makeStaticRequest = function(url, method, data) {
  var self = this;
  method = (method || 'GET').toUpperCase();

  var requestArgs = {
    url: url,
    method: method,
    data: data
  };

  var request = pluginWait('preStaticRequest', requestArgs)
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
  if (!url) { return Q.reject('No url provided'); }
  method = (method || 'GET').toUpperCase();
  var cacheKey = btoa(url);

  return Q().then(function() {
    // Get the cached promise to save multiple loads.
    if (method === 'GET' && cache.hasOwnProperty(cacheKey)) {
      return cache[cacheKey];
    }
    else {
      return Q()
      .then(function() {
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

        return fetch(url, options);
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
        // Remove failed promises from cache
        delete cache[cacheKey];
        // Propagate error so client can handle accordingly
        throw err;
      });
    }
  })
  .then(function(result) {
    // Save the cache
    if (method === 'GET') {
      cache[cacheKey] = Q(result);
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
    return localStorage.removeItem('formioToken');
  }
  localStorage.setItem('formioToken', token);
  Formio.currentUser(); // Run this so user is updated if null
};
Formio.getToken = function() {
  if (this.token) { return this.token; }
  var token = localStorage.getItem('formioToken') || '';
  this.token = token;
  return token;
};
Formio.setUser = function(user) {
  if (!user) {
    this.setToken(null);
    return localStorage.removeItem('formioUser');
  }
  localStorage.setItem('formioUser', JSON.stringify(user));
};
Formio.getUser = function() {
  return JSON.parse(localStorage.getItem('formioUser') || null);
};

Formio.setBaseUrl = function(url) {
  baseUrl = url;
};
Formio.getBaseUrl = function() {
  return baseUrl;
}
Formio.clearCache = function() { cache = {}; };

Formio.currentUser = function() {
  var url = baseUrl + '/current';
  var user = this.getUser();
  if (user) {
    return pluginAlter('wrapStaticRequestPromise', Q(user), {
      url: url,
      method: 'GET'
    })
  }
  var token = this.getToken();
  if (!token) {
    return pluginAlter('wrapStaticRequestPromise', Q(null), {
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
  return this.makeStaticRequest(baseUrl + '/logout').finally(function() {
    this.setToken(null);
    this.setUser(null);
    Formio.clearCache();
  }.bind(this));
};
Formio.fieldData = function(data, component) {
  if (!data) { return ''; }
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

},{"Q":3,"eventemitter2":4,"shallow-copy":5,"whatwg-fetch":6}],8:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  /*jshint camelcase: false */
  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('address', {
        title: 'Address',
        template: function ($scope) {
          return $scope.component.multiple ? 'formio/components/address-multiple.html' : 'formio/components/address.html';
        },
        controller: ['$scope', '$http', function ($scope, $http) {
          $scope.address = {};
          $scope.addresses = [];
          $scope.refreshAddress = function (address) {
            var params = {address: address, sensor: false};
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
            ).then(function (response) {
                $scope.addresses = response.data.results;
              });
          };
        }],
        tableView: function (data) {
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
          validate: {
            required: false
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/address.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\r\n<ui-select id=\"{{ component.key }}\" ng-model=\"data[component.key]\" safe-multiple-to-single ng-disabled=\"readOnly\" ng-required=\"component.validate.required\"  tabindex=\"{{ component.tabindex || 0 }}\" theme=\"bootstrap\">\r\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder }}\" >{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>\r\n  <ui-select-choices class=\"ui-select-choices\"  repeat=\"address in addresses\" refresh=\"refreshAddress($select.search)\" refresh-delay=\"500\">\r\n    <div ng-bind-html=\"address.formatted_address | highlight: $select.search\" ></div>\r\n  </ui-select-choices>\r\n</ui-select>"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/address-multiple.html',
        $templateCache.get('formio/components/address.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],9:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
          disableOnInvalid: true,
          theme: 'primary'
        },
        controller: ['$scope', function ($scope) {
          var settings = $scope.component;
          $scope.onClick = function() {
            switch (settings.action) {
              case 'submit':
                return;
              case 'reset':
                $scope.resetForm();
                break;
              case 'oauth':
                if ($scope.hasOwnProperty('form')) {
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
                }
                break;
            }
          };

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
                  $scope.form.submitting = true;
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
                    $scope.form.submitting = false;
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

        }]
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/button.html',
        "<button type=\"{{component.action == 'submit' || component.action == 'reset' ? component.action : 'button'}}\"\r\nng-class=\"{'btn-block': component.block}\"\r\nclass=\"btn btn-{{ component.theme }} btn-{{ component.size }}\"\r\nng-disabled=\"readOnly || form.submitting || (component.disableOnInvalid && form.$invalid)\"\r\ntabindex=\"{{ component.tabindex || 0 }}\"\r\nng-click=\"onClick()\">\r\n  <span ng-if=\"component.leftIcon\" class=\"{{ component.leftIcon }}\" aria-hidden=\"true\"></span>\r\n  <span ng-if=\"component.leftIcon && component.label\">&nbsp;</span>{{ component.label }}<span ng-if=\"component.rightIcon && component.label\">&nbsp;</span>\r\n  <span ng-if=\"component.rightIcon\" class=\"{{ component.rightIcon }}\" aria-hidden=\"true\"></span>\r\n   <i ng-if=\"component.action == 'submit' && form.submitting\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\r\n</button>\r\n"
      );
    }
  ]);
};

},{}],10:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('checkbox', {
        title: 'Check Box',
        template: 'formio/components/checkbox.html',
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
    'FormioUtils',
    function ($templateCache) {
      $templateCache.put('formio/components/checkbox.html',
        "<div class=\"checkbox\">\r\n  <label for=\"{{ component.key }}\" ng-class=\"{'field-required': component.validate.required}\">\r\n    <input type=\"{{ component.inputType }}\"\r\n    id=\"{{ component.key }}\"\r\n    name=\"{{ component.key }}\"\r\n    value=\"{{ component.key }}\"\r\n    ng-checked=\"data[component.key] === 'true'\"\r\n    tabindex=\"{{ component.tabindex || 0 }}\"\r\n    ng-disabled=\"readOnly\"\r\n    ng-model=\"data[component.key]\"\r\n    ng-required=\"component.validate.required\">\r\n    {{ component.label }}\r\n  </label>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],11:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('columns', {
        title: 'Columns',
        template: 'formio/components/columns.html',
        group: 'layout',
        settings: {
          input: false,
          columns: [{components: []}, {components: []}]
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/columns.html',
        "<div class=\"row\">\r\n  <div class=\"col-sm-6\" ng-repeat=\"column in component.columns\">\r\n    <formio-component ng-repeat=\"component in column.components\" component=\"component\" data=\"data\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n  </div>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],12:[function(require,module,exports){
"use strict";
module.exports = function (app) {

  app.provider('formioComponents', function () {
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
      addGroup: function (name, group) {
        groups[name] = group;
      },
      register: function (type, component, group) {
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
      $get: function () {
        return {
          components: components,
          groups: groups
        };
      }
    };
  });

  app.directive('safeMultipleToSingle', [function () {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function ($scope, el, attrs, ngModel) {
        ngModel.$formatters.push(function (modelValue) {
          if (!$scope.component.multiple && Array.isArray(modelValue)) {
            return modelValue[0] || '';
          }

          return modelValue;
        });
      }
    };
  }]);
};

},{}],13:[function(require,module,exports){
"use strict";

module.exports = function(app) {

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('container', {
        title: 'Container',
        template: 'formio/components/container.html',
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
        "<div ng-controller=\"formioContainerComponent\" class=\"formio-container-component\">\r\n  <formio-component ng-repeat=\"component in component.components\" component=\"component\" data=\"data[parentKey]\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n</div>\r\n"
      ));
    }
  ]);
};

},{}],14:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('content', {
        title: 'Content',
        template: 'formio/components/content.html',
        settings: {
          input: false,
          html: ''
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/content.html',
        "<div ng-bind-html=\"component.html | safehtml\" id=\"{{ component.key }}\"></div>\r\n"
      );
    }
  ]);
};

},{}],15:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
    function ($templateCache) {
      $templateCache.put('formio/components/custom.html',
        "<div class=\"panel panel-default\">\r\n  <div class=\"panel-body text-muted text-center\">\r\n    Custom Component ({{ component.type }})\r\n  </div>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],16:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('datagrid', {
        title: 'Data Grid',
        template: 'formio/components/datagrid.html',
        group: 'layout',
        tableView: function(data, component) {
          var view = '<table class="table table-striped"><thead><tr>';
          angular.forEach(component.components, function(component) {
            view += '<th>' + component.label + '</th>';
          });
          view += '</tr></thead>';
          view += '<tbody>';
          angular.forEach(data, function(row) {
            view += '<tr>';
            angular.forEach(component.components, function(component) {
              view += '<td>' + row[component.key] + '</td>';
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
      $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [{}];

      $scope.addRow = function() {
        // Ensure the object is initialized as it may be unset on a "Reset".
        if (!Array.isArray($scope.data[$scope.component.key])) {
          $scope.data[$scope.component.key] = [];
        }
        $scope.data[$scope.component.key].push({});
      };

      $scope.removeRow = function(index) {
        $scope.data[$scope.component.key].splice(index, 1);
      };
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/datagrid.html', FormioUtils.fieldWrap(
        "<div class=\"formio-data-grid\" ng-controller=\"formioDataGrid\" >\r\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table datagrid-table\">\r\n    <tr>\r\n      <th ng-repeat=\"component in component.components\">{{ component.label}}</th>\r\n      <th></th>\r\n    </tr>\r\n    <tr class=\"formio-data-grid-row\" ng-repeat=\"rowData in data[component.key] track by $index\">\r\n      <td ng-repeat=\"component in component.components\" ng-init=\"component.hideLabel = true\" >\r\n        <formio-component component=\"component\" data=\"rowData\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n      </td>\r\n      <td>\r\n        <a ng-click=\"removeRow($index)\" class=\"btn btn-default\">\r\n          <span class=\"glyphicon glyphicon-remove-circle\"></span>\r\n        </a>\r\n      </td>\r\n    </tr>\r\n  </table>\r\n  <div class=\"datagrid-add\">\r\n    <a ng-click=\"addRow()\" class=\"btn btn-primary\">\r\n      <span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> {{ component.addAnother || \"Add Another\" }}\r\n    </a>\r\n  </div>\r\n</div>\r\n"
      ));
    }
  ]);
};

},{}],17:[function(require,module,exports){
"use strict";

module.exports = function (app) {

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
        "<div class=\"input-group\">\r\n  <input type=\"text\" class=\"form-control\"\r\n  id=\"{{ component.key }}\"\r\n  ng-focus=\"calendarOpen = true\"\r\n  ng-click=\"calendarOpen = true\"\r\n  ng-init=\"calendarOpen = false\"\r\n  ng-disabled=\"readOnly\"\r\n  ng-required=\"component.validate.required\"\r\n  is-open=\"calendarOpen\"\r\n  datetime-picker=\"{{ component.format }}\"\r\n  min-date=\"component.minDate\"\r\n  max-date=\"component.maxDate\"\r\n  datepicker-mode=\"component.datepickerMode\"\r\n  enable-date=\"component.enableDate\"\r\n  enable-time=\"component.enableTime\"\r\n  ng-model=\"data[component.key]\"\r\n  tabindex=\"{{ component.tabindex || 0 }}\"\r\n  placeholder=\"{{ component.placeholder }}\"\r\n  datepicker-options=\"component.datePicker\"\r\n  timepicker-options=\"component.timePicker\" />\r\n  <span class=\"input-group-btn\">\r\n    <button type=\"button\" ng-disabled=\"readOnly\" class=\"btn btn-default\" ng-click=\"calendarOpen = true\">\r\n      <i ng-if=\"component.enableDate\" class=\"glyphicon glyphicon-calendar\"></i>\r\n      <i ng-if=\"!component.enableDate\" class=\"glyphicon glyphicon-time\"></i>\r\n    </button>\r\n  </span>\r\n</div>\r\n\r\n"
      ));
    }
  ]);
};

},{}],18:[function(require,module,exports){
"use strict";
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
          persistent: true
        }
      });
    }
  ]);
};

},{}],19:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('fieldset', {
        title: 'Field Set',
        template: 'formio/components/fieldset.html',
        group: 'layout',
        settings: {
          input: false,
          tableView: true,
          legend: '',
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/fieldset.html',
        "<fieldset id=\"{{ component.key }}\">\r\n  <legend ng-if=\"component.legend\">{{ component.legend }}</legend>\r\n  <formio-component ng-repeat=\"component in component.components\" component=\"component\" data=\"data\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n</fieldset>\r\n"
      );
    }
  ]);
};

},{}],20:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
          protected: false
        }
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
        function ($scope) {
          $scope.removeFile = function (event, index) {
            event.preventDefault();
            $scope.files.splice(index, 1);
          };

          $scope.fileSize = function (a, b, c, d, e) {
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
        '$scope',
        'FormioPlugins',
        function (
          $scope,
          FormioPlugins
        ) {
          $scope.getFile = function (evt) {
            var plugin = FormioPlugins('storage', $scope.file.storage);
            if (plugin) {
              plugin.downloadFile(evt, $scope.file, $scope);
            }
          };
        }
      ]
    };
  }]);

  app.controller('formioFileUpload', [
    '$scope',
    'FormioPlugins',
    function(
      $scope,
      FormioPlugins
    ) {
      $scope.fileUploads = {};

      $scope.removeUpload = function(index) {
        delete $scope.fileUploads[index];
      };

      // This fixes new fields having an empty space in the array.
      if ($scope.data && $scope.data[$scope.component.key] === '') {
        $scope.data[$scope.component.key] = [];
      }
      if ($scope.data && $scope.data[$scope.component.key][0] === '') {
        $scope.data[$scope.component.key].splice(0, 1);
      }

      $scope.upload = function(files) {
        if ($scope.component.storage && files && files.length) {
          var plugin = FormioPlugins('storage', $scope.component.storage);
          angular.forEach(files, function(file) {
            if (plugin) {
              $scope.fileUploads[file.name] = {
                name: file.name,
                size: file.size,
                status: 'info',
                message: 'Starting upload'
              };
              plugin.uploadFile(file, $scope.fileUploads[file.name], $scope)
                .then(function(fileInfo) {
                  delete $scope.fileUploads[file.name];
                  fileInfo.storage = $scope.component.storage;
                  $scope.data[$scope.component.key].push(fileInfo);
                })
                .catch(function(message) {
                  $scope.fileUploads[file.name].status = 'error';
                  $scope.fileUploads[file.name].message = message;
                  delete $scope.fileUploads[file.name].progress;
                });
            }
            else {
              $scope.fileUploads[file.name] = {
                name: file.name,
                size: file.size,
                status: 'error',
                message: 'Storage plugin not found'
              };
            }
          });
        }
      };
    }
  ]);
  app.run([
    '$templateCache',
    function (
      $templateCache
    ) {

      $templateCache.put('formio/components/formio-file-list.html',
        "<table class=\"table table-striped table-bordered\">\r\n  <thead>\r\n    <tr>\r\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"></td>\r\n      <th>File Name</th>\r\n      <th>Size</th>\r\n    </tr>\r\n  </thead>\r\n  <tbody>\r\n    <tr ng-repeat=\"file in files track by $index\">\r\n      <td ng-if=\"!readOnly\" style=\"width:1%;white-space:nowrap;\"><a ng-if=\"!readOnly\" href=\"#\" ng-click=\"removeFile($event, $index)\" style=\"padding: 2px 4px;\" class=\"btn btn-sm btn-default\"><span class=\"glyphicon glyphicon-remove\"></span></a></td>\r\n      <td><formio-file file=\"file\" form=\"form\"></formio-file></td>\r\n      <td>{{ fileSize(file.size) }}</td>\r\n    </tr>\r\n  </tbody>\r\n</table>\r\n"
      );

      $templateCache.put('formio/components/file.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\r\n<div ng-controller=\"formioFileUpload\">\r\n  <formio-file-list files=\"data[component.key]\" form=\"formio.formUrl\"></formio-file-list>\r\n  <div ng-if=\"!readOnly\">\r\n    <div ngf-drop=\"upload($files)\" class=\"fileSelector\" ngf-drag-over-class=\"'fileDragOver'\" ngf-multiple=\"component.multiple\"><span class=\"glyphicon glyphicon-cloud-upload\"></span>Drop files to attach, or <a href=\"#\" ngf-select=\"upload($files)\" tabindex=\"{{ component.tabindex || 0 }}\" ngf-multiple=\"component.multiple\">browse</a>.</div>\r\n    <div ng-if=\"!component.storage\" class=\"alert alert-warning\">No storage has been set for this field. File uploads are disabled until storage is set up.</div>\r\n    <div ngf-no-file-drop>File Drag/Drop is not supported for this browser</div>\r\n  </div>\r\n  <div ng-repeat=\"fileUpload in fileUploads track by $index\" ng-class=\"{'has-error': fileUpload.status === 'error'}\" class=\"file\">\r\n    <div class=\"row\">\r\n      <div class=\"fileName control-label col-sm-10\">{{ fileUpload.name }} <span ng-click=\"removeUpload(fileUpload.name)\" class=\"glyphicon glyphicon-remove\"></span></div>\r\n      <div class=\"fileSize control-label col-sm-2 text-right\">{{ fileSize(fileUpload.size) }}</div>\r\n    </div>\r\n    <div class=\"row\">\r\n      <div class=\"col-sm-12\">\r\n        <span ng-if=\"fileUpload.status === 'progress'\">\r\n          <div class=\"progress\">\r\n            <div class=\"progress-bar\" role=\"progressbar\" aria-valuenow=\"{{fileUpload.progress}}\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width:{{fileUpload.progress}}%\">\r\n              <span class=\"sr-only\">{{fileUpload.progress}}% Complete</span>\r\n            </div>\r\n          </div>\r\n        </span>\r\n        <div ng-if=\"!fileUpload.status !== 'progress'\" class=\"bg-{{ fileUpload.status }} control-label\">{{ fileUpload.message }}</div>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],21:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
    function ($templateCache) {
      $templateCache.put('formio/components/hidden.html',
        "<input type=\"hidden\" id=\"{{ component.key }}\" name=\"{{ component.key }}\" ng-model=\"data[component.key]\">\r\n"
      );
    }
  ]);
};

},{}],22:[function(require,module,exports){
"use strict";


module.exports = function (app) {
  app.directive('formioHtmlElement', [
    '$sanitize',
    function($sanitize) {
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

            element.html($scope.component.content);

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
    function (formioComponentsProvider) {
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
    function ($templateCache) {
      $templateCache.put('formio/components/htmlelement.html',
        '<formio-html-element component="component"></div>'
      );

      $templateCache.put('formio/components/htmlelement-directive.html',
        "<div id=\"{{ component.key }}\">\r\n  <div class=\"alert alert-warning\" ng-if=\"parseError\">{{ parseError }}</div>\r\n  <div ng-bind-html=\"html\"></div>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],23:[function(require,module,exports){
"use strict";
var app = angular.module('formio');

// Basic
require('./components')(app);
require('./textfield')(app);
require('./number')(app);
require('./password')(app);
require('./textarea')(app);
require('./checkbox')(app);
require('./selectboxes')(app);
require('./select')(app);
require('./radio')(app);
require('./htmlelement')(app);
require('./content')(app);
require('./button')(app);

// Special
require('./email')(app);
require('./phonenumber')(app);
require('./address')(app);
require('./datetime')(app);
require('./hidden')(app);
require('./resource')(app);
require('./file')(app);
require('./signature')(app);
require('./custom')(app);

// Layout
require('./columns')(app);
require('./fieldset')(app);
require('./container')(app);
require('./datagrid')(app);
require('./page')(app);
require('./panel')(app);
require('./table')(app);
require('./well')(app);

},{"./address":8,"./button":9,"./checkbox":10,"./columns":11,"./components":12,"./container":13,"./content":14,"./custom":15,"./datagrid":16,"./datetime":17,"./email":18,"./fieldset":19,"./file":20,"./hidden":21,"./htmlelement":22,"./number":24,"./page":25,"./panel":26,"./password":27,"./phonenumber":28,"./radio":29,"./resource":30,"./select":31,"./selectboxes":32,"./signature":33,"./table":34,"./textarea":35,"./textfield":36,"./well":37}],24:[function(require,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
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
        }
      });
    }
  ]);

  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache, FormioUtils) {
      $templateCache.put('formio/components/number.html', FormioUtils.fieldWrap(
        "<input type=\"{{ component.inputType }}\"\r\nclass=\"form-control\"\r\nid=\"{{ component.key }}\"\r\nname=\"{{ component.key }}\"\r\ntabindex=\"{{ component.tabindex || 0 }}\"\r\nng-model=\"data[component.key]\"\r\nng-required=\"component.validate.required\"\r\nng-disabled=\"readOnly\"\r\nsafe-multiple-to-single\r\nmin=\"{{ component.validate.min }}\"\r\nmax=\"{{ component.validate.max }}\"\r\nstep=\"{{ component.validate.step }}\"\r\nplaceholder=\"{{ component.placeholder }}\"\r\ncustom-validator=\"component.validate.custom\"\r\nui-mask=\"{{ component.inputMask }}\"\r\nui-mask-placeholder=\"\"\r\nui-options=\"uiMaskOptions\"\r\n>\r\n"
      ));
    }
  ]);
};

},{}],25:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
    function ($templateCache) {
      $templateCache.put('formio/components/page.html',
        "<formio-component ng-repeat=\"component in component.components\" component=\"component\" data=\"data\" formio=\"formio\"></formio-component>\r\n"
      );
    }
  ]);
};

},{}],26:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('panel', {
        title: 'Panel',
        template: 'formio/components/panel.html',
        group: 'layout',
        settings: {
          input: false,
          title: '',
          theme: 'default',
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/panel.html',
        "<div class=\"panel panel-{{ component.theme }}\" id=\"{{ component.key }}\">\r\n  <div ng-if=\"component.title\" class=\"panel-heading\">\r\n    <h3 class=\"panel-title\">{{ component.title }}</h3>\r\n  </div>\r\n  <div class=\"panel-body\">\r\n    <formio-component ng-repeat=\"component in component.components\" component=\"component\" data=\"data\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n  </div>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],27:[function(require,module,exports){
"use strict";
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('password', {
        title: 'Password',
        template: 'formio/components/textfield.html',
        tableView: function () {
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

},{}],28:[function(require,module,exports){
"use strict";
module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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

},{}],29:[function(require,module,exports){
"use strict";


module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('radio', {
        title: 'Radio',
        template: 'formio/components/radio.html',
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
        "<div ng-class=\"component.inline ? 'radio-inline' : 'radio'\" ng-repeat=\"v in component.values track by $index\">\r\n  <label class=\"control-label\" for=\"{{ v.value }}\">\r\n    <input type=\"{{ component.inputType }}\"\r\n    id=\"{{ v.value }}\"\r\n    name=\"{{ component.key }}\"\r\n    value=\"{{ v.value }}\"\r\n    tabindex=\"{{ component.tabindex || 0 }}\"\r\n    ng-model=\"data[component.key]\"\r\n    ng-required=\"component.validate.required\"\r\n    ng-disabled=\"readOnly\"\r\n    custom-validator=\"component.validate.custom\">\r\n    {{ v.label }}\r\n  </label>\r\n</div>\r\n"
      ));
    }
  ]);
};

},{}],30:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('resource', {
        title: 'Resource',
        tableView: function (data, component, $interpolate) {
          if ($interpolate) {
            return $interpolate(component.template)({item: data});
          }

          return data ? data._id : '';
        },
        template: function ($scope) {
          return $scope.component.multiple ? 'formio/components/resource-multiple.html' : 'formio/components/resource.html';
        },
        controller: ['$scope', 'Formio', function ($scope, Formio) {
          var settings = $scope.component;
          $scope.selectItems = [];
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
            $scope.refreshSubmissions = function (input) {
              var params = settings.params || {};
              // If they wish to return only some fields.
              if (settings.selectFields) {
                params.select = settings.selectFields;
              }
              if (settings.searchFields && input) {
                angular.forEach(settings.searchFields, function (field) {
                  params[field] = input;
                });
              }
              // Load the submissions.
              formio.loadSubmissions({
                params: params
              }).then(function (submissions) {
                $scope.selectItems = submissions || [];
              });
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
    function ($templateCache) {
      $templateCache.put('formio/components/resource.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\r\n<ui-select ui-select-required safe-multiple-to-single ui-select-open-on-focus ng-model=\"data[component.key]\" ng-disabled=\"readOnly\" ng-required=\"component.validate.required\" id=\"{{ component.key }}\" name=\"{{ component.key }}\" theme=\"bootstrap\" tabindex=\"{{ component.tabindex || 0 }}\">\r\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder }}\">\r\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\r\n  </ui-select-match>\r\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"item in selectItems | filter: $select.search\" refresh=\"refreshSubmissions($select.search)\" refresh-delay=\"250\">\r\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\r\n  </ui-select-choices>\r\n</ui-select>\r\n<formio-errors></formio-errors>\r\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/resource-multiple.html',
        $templateCache.get('formio/components/resource.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],31:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.directive('formioSelectItem', [
    '$compile',
    function ($compile) {
      return {
        restrict: 'E',
        scope: {
          template: '=',
          item: '=',
          select: '='
        },
        link: function (scope, element) {
          if (scope.template) {
            element.html($compile(angular.element(scope.template))(scope));
          }
        }
      };
    }
  ]);

  app.directive('uiSelectRequired', function () {
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        var oldIsEmpty = ngModel.$isEmpty;
        ngModel.$isEmpty = function (value) {
          return (Array.isArray(value) && value.length === 0) || oldIsEmpty(value);
        };
      }
    };
  });

  // A hack to have ui-select open on focus
  app.directive('uiSelectOpenOnFocus', ['$timeout', function ($timeout) {
    return {
      require: 'uiSelect',
      restrict: 'A',
      link: function ($scope, el, attrs, uiSelect) {
        var closing = false;

        angular.element(uiSelect.focusser).on('focus', function () {
          if (!closing) {
            uiSelect.activate();
          }
        });

        // Because ui-select immediately focuses the focusser after closing
        // we need to not re-activate after closing
        $scope.$on('uis:close', function () {
          closing = true;
          $timeout(function () { // I'm so sorry
            closing = false;
          });
        });
      }
    };
  }]);

  // Configure the Select component.
  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('select', {
        title: 'Select',
        template: function ($scope) {
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
            });
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
        controller: ['$scope', '$http', 'Formio', '$interpolate', function ($scope, $http, Formio, $interpolate) {
          var settings = $scope.component;
          $scope.nowrap = true;
          $scope.selectItems = [];
          var valueProp = $scope.component.valueProperty;
          $scope.getSelectItem = function (item) {
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
              }
              catch (error) {
                $scope.selectItems = [];
              }
              break;
            case 'url':
            case 'resource':
              var url = '';
              var options = {cache: true};
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
                url += '/form/' + settings.data.resource + '/submission?limit=1000';
              }

              if (url) {
                $scope.refreshItems = function(input, newUrl) {
                  newUrl = newUrl || url;
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

                  $http.get(newUrl, options).then(function (result) {
                    $scope.selectItems = result.data;
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
    function ($templateCache) {
      $templateCache.put('formio/components/select.html',
        "<label ng-if=\"component.label && !component.hideLabel\"  for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\r\n<ui-select ui-select-required ui-select-open-on-focus ng-model=\"data[component.key]\" safe-multiple-to-single name=\"{{ component.key }}\" ng-disabled=\"readOnly\" ng-required=\"component.validate.required\" id=\"{{ component.key }}\" theme=\"bootstrap\" tabindex=\"{{ component.tabindex || 0 }}\">\r\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder }}\">\r\n    <formio-select-item template=\"component.template\" item=\"$item || $select.selected\" select=\"$select\"></formio-select-item>\r\n  </ui-select-match>\r\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"getSelectItem(item) as item in selectItems | filter: $select.search\" refresh=\"refreshItems($select.search)\" refresh-delay=\"250\">\r\n    <formio-select-item template=\"component.template\" item=\"item\" select=\"$select\"></formio-select-item>\r\n  </ui-select-choices>\r\n</ui-select>\r\n<formio-errors></formio-errors>\r\n"
      );

      // Change the ui-select to ui-select multiple.
      $templateCache.put('formio/components/select-multiple.html',
        $templateCache.get('formio/components/select.html').replace('<ui-select', '<ui-select multiple')
      );
    }
  ]);
};

},{}],32:[function(require,module,exports){
"use strict";


module.exports = function(app) {
  app.directive('formioSelectBoxes', [function() {
    return {
      restrict: 'E',
      replace: true,
      require: 'ngModel',
      scope: {
        component: '=',
        readOnly: '=',
        model: '=ngModel'
      },
      templateUrl: 'formio/components/selectboxes-directive.html',
      link: function($scope, el, attrs, ngModel) {
        // Initialize model
        var model = {};
        angular.forEach($scope.component.values, function(v) {
          model[v.value] = !!ngModel.$viewValue[v.value];
        });
        ngModel.$setViewValue(model);
        ngModel.$setPristine(true);

        ngModel.$isEmpty = function(value) {
          return Object.keys(value).every(function(key) {
            return !value[key];
          });
        };

        $scope.toggleCheckbox = function(value) {
          var model = angular.copy(ngModel.$viewValue);
          model[value] = !model[value];
          ngModel.$setViewValue(model);
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
        tableView: function(data) {
          if (!data) return '';

          return Object.keys(data)
          .filter(function(key) {
            return data[key];
          })
          .join(', ');
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'selectboxesField',
          values: [],
          defaultValue: {},
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
    'FormioUtils',
    function($templateCache) {
      $templateCache.put('formio/components/selectboxes-directive.html',
        "<div class=\"select-boxes\">\r\n  <div ng-class=\"component.inline ? 'checkbox-inline' : 'checkbox'\" ng-repeat=\"v in component.values track by $index\">\r\n    <label class=\"control-label\" for=\"{{ component.key }}-{{ v.value }}\">\r\n      <input type=\"checkbox\"\r\n        id=\"{{ component.key }}-{{ v.value }}\"\r\n        name=\"{{ component.key }}-{{ v.value }}\"\r\n        value=\"{{ v.value }}\"\r\n        tabindex=\"{{ component.tabindex || 0 }}\"\r\n        ng-disabled=\"readOnly\"\r\n        ng-click=\"toggleCheckbox(v.value)\"\r\n        ng-checked=\"model[v.value]\"\r\n      >\r\n      {{ v.label }}\r\n    </label>\r\n  </div>\r\n</div>\r\n"
      );
      $templateCache.put('formio/components/selectboxes.html',
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" class=\"control-label\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<formio-select-boxes\r\n  name=\"{{ component.key }}\"\r\n  ng-model=\"data[component.key]\"\r\n  ng-model-options=\"{allowInvalid: true}\"\r\n  component=\"component\"\r\n  read-only=\"readOnly\"\r\n  ng-required=\"component.validate.required\"\r\n  custom-validator=\"component.validate.custom\"\r\n  ></formio-select-boxes>\r\n<formio-errors></formio-errors>\r\n"
      );
    }
  ]);
};

},{}],33:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('signature', {
        title: 'Signature',
        template: 'formio/components/signature.html',
        tableView: function (data) {
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
        }
      });
    }
  ]);
  app.directive('signature', function () {
    return {
      restrict: 'A',
      scope: {
        component: '='
      },
      require: '?ngModel',
      link: function (scope, element, attrs, ngModel) {
        if (!ngModel) {
          return;
        }

        // Sets the label of component for error display.
        scope.component.label = 'Signature';
        scope.component.hideLabel = true;

        // Sets the dimension of a width or height.
        var setDimension = function (dim) {
          if (scope.component[dim].slice(-1) === '%') {
            var percent = parseFloat(scope.component[dim].slice(0, -1)) / 100;
            element[0][dim] = element.parent()[dim]() * percent;
          }
          else {
            element[0][dim] = parseInt(scope.component[dim], 10);
            scope.component[dim] = element[0][dim] + 'px';
          }
        };

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

        scope.$watch('component.penColor', function (newValue) {
          signaturePad.penColor = newValue;
        });

        scope.$watch('component.backgroundColor', function (newValue) {
          signaturePad.backgroundColor = newValue;
          signaturePad.clear();
        });

        // Clear the signature.
        scope.component.clearSignature = function () {
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

        ngModel.$render = function () {
          signaturePad.fromDataURL(ngModel.$viewValue);
        };
        signaturePad.onEnd = function () {
          scope.$evalAsync(readSignature);
        };

        // Read initial empty canvas, unless signature is required, then keep it pristine
        if (!scope.component.validate.required) {
          readSignature();
        }
      }
    };
  });
  app.run([
    '$templateCache',
    'FormioUtils',
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/signature.html', FormioUtils.fieldWrap(
        "<img ng-if=\"readOnly\" ng-attr-src=\"{{data[component.key]}}\" src=\"\" />\r\n<div ng-if=\"!readOnly\" style=\"width: {{ component.width }}; height: {{ component.height }};\">\r\n  <a class=\"btn btn-xs btn-default\" style=\"position:absolute; left: 0; top: 0; z-index: 1000\" ng-click=\"component.clearSignature()\">\r\n    <span class=\"glyphicon glyphicon-refresh\"></span>\r\n  </a>\r\n  <canvas signature component=\"component\" name=\"{{ component.key }}\" ng-model=\"data[component.key]\" ng-required=\"component.validate.required\"></canvas>\r\n  <div class=\"formio-signature-footer\" style=\"text-align: center;color:#C3C3C3;\" ng-class=\"{'field-required': component.validate.required}\">{{ component.footer }}</div>\r\n</div>\r\n"
      ));
    }
  ]);
};

},{}],34:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
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
    function ($templateCache) {
      var tableClasses = "{'table-striped': component.striped, ";
      tableClasses += "'table-bordered': component.bordered, ";
      tableClasses += "'table-hover': component.hover, ";
      tableClasses += "'table-condensed': component.condensed}";
      $templateCache.put('formio/components/table.html',
        "<div class=\"table-responsive\" id=\"{{ component.key }}\">\r\n  <table ng-class=\"{'table-striped': component.striped, 'table-bordered': component.bordered, 'table-hover': component.hover, 'table-condensed': component.condensed}\" class=\"table\">\r\n    <thead ng-if=\"component.header.length\">\r\n      <th ng-repeat=\"header in component.header\">{{ header }}</th>\r\n    </thead>\r\n    <tbody>\r\n      <tr ng-repeat=\"row in component.rows track by $index\">\r\n        <td ng-repeat=\"column in row track by $index\">\r\n          <formio-component ng-repeat=\"component in column.components\" component=\"component\" data=\"data\" formio=\"formio\"></formio-component>\r\n        </td>\r\n      </tr>\r\n    </tbody>\r\n  </table>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],35:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: 'formio/components/textarea.html',
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
    function ($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/textarea.html', FormioUtils.fieldWrap(
        "<textarea\r\nclass=\"form-control\"\r\nng-model=\"data[component.key]\"\r\nng-disabled=\"readOnly\"\r\nng-required=\"component.validate.required\"\r\nsafe-multiple-to-single\r\nid=\"{{ component.key }}\"\r\ntabindex=\"{{ component.tabindex || 0 }}\"\r\nplaceholder=\"{{ component.placeholder }}\"\r\ncustom-validator=\"component.validate.custom\"\r\nrows=\"{{ component.rows }}\"></textarea>\r\n"
      ));
    }
  ]);
};

},{}],36:[function(require,module,exports){
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
        "<input type=\"{{ component.inputType }}\"\r\n  class=\"form-control\"\r\n  id=\"{{ component.key }}\"\r\n  name=\"{{ component.key }}\"\r\n  tabindex=\"{{ component.tabindex || 0 }}\"\r\n  ng-disabled=\"readOnly\"\r\n  ng-model=\"data[component.key]\"\r\n  ng-model-options=\"{ debounce: 500 }\"\r\n  safe-multiple-to-single\r\n  ng-required=\"component.validate.required\"\r\n  ng-minlength=\"component.validate.minLength\"\r\n  ng-maxlength=\"component.validate.maxLength\"\r\n  ng-pattern=\"component.validate.pattern\"\r\n  custom-validator=\"component.validate.custom\"\r\n  placeholder=\"{{ component.placeholder }}\"\r\n  ui-mask=\"{{ component.inputMask }}\"\r\n  ui-mask-placeholder=\"\"\r\n  ui-options=\"uiMaskOptions\"\r\n>\r\n"
      ));
    }
  ]);
};

},{}],37:[function(require,module,exports){
"use strict";

module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('well', {
        title: 'Well',
        template: 'formio/components/well.html',
        group: 'layout',
        settings: {
          input: false,
          components: []
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('formio/components/well.html',
        "<div class=\"well\" id=\"{{ component.key }}\">\r\n  <formio-component ng-repeat=\"component in component.components\" component=\"component\" data=\"data\" formio=\"formio\" read-only=\"readOnly\"></formio-component>\r\n</div>\r\n"
      );
    }
  ]);
};

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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
      formioOptions: '=?'
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
        $scope.show = {};
        var boolean = {
          'true': true,
          'false': false
        };

        var submission = $scope.submission || {data: {}};
        var updateComponents = function() {
          // Change the visibility for the component with the given key
          var updateVisiblity = function(key) {
            var newClass = $scope.show[key] ? 'ng-show' : 'ng-hide';
            if ($scope.hideComponents && $scope.hideComponents.indexOf(key) !== -1) {
              newClass = 'ng-hide';
            }
            $element
              .find('div#form-group-' + key)
              .removeClass('ng-show ng-hide')
              .addClass(newClass);
          };

          $scope.form.components = $scope.form.components || [];
          FormioUtils.eachComponent($scope.form.components, function(component) {

            // Display every component by default
            $scope.show[component.key] = ($scope.show[component.key] === undefined)
              ? true
              : $scope.show[component.key];

            // Only change display options of all require conditional properties are present.
            if (
              component.conditional
              && (component.conditional.show !== null && component.conditional.show !== '')
              && (component.conditional.when !== null && component.conditional.when !== '')
            ) {
              // Default the conditional values.
              component.conditional.show = boolean[component.conditional.show];
              component.conditional.eq = component.conditional.eq || '';

              // Get the conditional component.
              var cond = FormioUtils.getComponent($scope.form.components, component.conditional.when.toString());
              var value = submission.data[cond.key];

              if (value) {
                // Check if the conditional value is equal to the trigger value
                $scope.show[component.key] = value.toString() === component.conditional.eq.toString()
                  ? boolean[component.conditional.show]
                  : !boolean[component.conditional.show];
              }
              // Check against the components default value, if present and the components hasnt been interacted with.
              else if (!value && cond.defaultValue) {
                $scope.show[component.key] = cond.defaultValue.toString() === component.conditional.eq.toString()
                  ? boolean[component.conditional.show]
                  : !boolean[component.conditional.show];
              }
              // If there is no value, we still need to process as not equal.
              else {
                $scope.show[component.key] = !boolean[component.conditional.show];
              }

              // Update the visibility, if its possible a change occurred.
              updateVisiblity(component.key);
            }

            // Set hidden if specified
            if ($scope.hideComponents && $scope.hideComponents.indexOf(component.key) !== -1) {
              updateVisiblity(component.key);
            }

            // Set required if specified
            if ($scope.requireComponents && component.hasOwnProperty('validate')) {
              component.validate.required = $scope.requireComponents.indexOf(component.key) !== -1;
            }

            // Set disabled if specified
            if ($scope.disableComponents) {
              component.disabled = $scope.disableComponents.indexOf(component.key) !== -1;
            }
          }, true);
        };

        // Update the components on the initial form render and all subsequent submission data changes.
        $scope.$on('formRender', updateComponents);
        $scope.$on('submissionDataUpdate', function(ev, key, value) {
          submission.data[key] = value;
          updateComponents();
        });

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

        // Called when the form is submitted.
        $scope.onSubmit = function(form) {
          if (!form.$valid || form.submitting) return;
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
              if (component.type === 'number') {
                submissionData.data[component.key] = value ? parseFloat(value) : 0;
              }
              else {
                submissionData.data[component.key] = value;
              }
            }
          });

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

          // Called when a submission has been made.
          var onSubmitDone = function(method, submission) {
            $scope.showAlerts({
              type: 'success',
              message: 'Submission was ' + ((method === 'put') ? 'updated' : 'created') + '.'
            });
            form.submitting = false;
            // Trigger the form submission.
            $scope.$emit('formSubmission', submission);
          };

          var submitEvent = $scope.$emit('formSubmit', submissionData);
          if (submitEvent.defaultPrevented) {
            // Listener wants to cancel the form submission
            form.submitting = false;
            return;
          }

          // Allow custom action urls.
          if ($scope.action) {
            var method = submissionData._id ? 'put' : 'post';
            $http[method]($scope.action, submissionData).success(function (submission) {
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
            $scope.formio.saveSubmission(angular.copy(submissionData), $scope.formioOptions)
              .then(function(submission) {
              onSubmitDone(submission.method, submission);
            }, FormioScope.onError($scope, $element))
              .finally(function() {
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

},{}],40:[function(require,module,exports){
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
        form: '=',
        readOnly: '='
      },
      templateUrl: 'formio/component.html',
      link: function($scope, el, attrs, formioCtrl) {
        if (formioCtrl) {
          $scope.showAlerts = formioCtrl.showAlerts.bind(formioCtrl);
        }
        else {
          $scope.showAlerts = function() {
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

          $scope.resetForm = function() {
            // Manually remove each key so we don't lose a reference to original
            // data in child scopes.
            for (var key in $scope.data) {
              delete $scope.data[key];
            }
          };

          // Initialize the data.
          if (!$scope.data) {
            $scope.resetForm();
          }

          // If this component references an object, we need to determine the
          // value by navigating through the object.
          if (
            $scope.component &&
            $scope.component.key
          ) {
            var root = '';
            if ($scope.component.key.indexOf('.') !== -1) {
              root = $scope.component.key.split('.').shift();
            }
            $scope.$watch('data', function(data) {
              if (!data || angular.equals({}, data)) return;
              if (root && (!data.hasOwnProperty(root) || angular.equals({}, data[root]))) return;
              if (root && data[root].hasOwnProperty('_id')) {
                $scope.data[root + '._id'] = data[root]._id;
              }
              var value = Formio.fieldData(data, $scope.component);
              if (value !== undefined) {
                $scope.data[$scope.component.key] = value;
              }
            });
          }

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
            $scope.data[$scope.component.key] = $scope.data[$scope.component.key] || [];
            $scope.data[$scope.component.key].push('');
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

            // Maintain reverse compatability by executing the old method style.
            if (typeof component.controller === 'function') {
              component.controller($scope.component, $scope, $http, Formio);
            }
            else {
              $controller(component.controller, {$scope: $scope});
            }
          }

          // Establish a default for data.
          if ($scope.data && !$scope.data.hasOwnProperty($scope.component.key) && $scope.component.hasOwnProperty('defaultValue')) {
            if ($scope.component.multiple && !angular.isArray($scope.component.defaultValue)) {
              $scope.data[$scope.component.key] = [$scope.component.defaultValue];
            }
            else {
              $scope.data[$scope.component.key] = $scope.component.defaultValue;
            }
          }
          else if ($scope.data && !$scope.data.hasOwnProperty($scope.component.key) && $scope.component.multiple) {
            $scope.data[$scope.component.key] = [];
          }
        }
      ]
    };
  }
];

},{}],41:[function(require,module,exports){
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
      resourceName: '=?'
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
        $scope._resourceName = resourceName;

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

},{}],42:[function(require,module,exports){
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
      },
      controller: [
        '$scope',
        function(
          $scope
        ) {
          $scope.$watchCollection('data.' + $scope.component.key, function(_new, _old) {
            if (_new !== _old) {
              $scope.$emit('submissionDataUpdate', $scope.component.key, $scope.data[$scope.component.key]);
            }
          });
        }
      ]
    };
  }
];

},{}],43:[function(require,module,exports){
"use strict";
module.exports = function() {
  return {
    scope: false,
    restrict: 'E',
    templateUrl: 'formio/errors.html'
  };
};

},{}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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
    link: function (scope, element) {
      scope.wizardLoaded = false;
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
      function (
        $scope,
        $compile,
        $element,
        Formio,
        FormioScope,
        FormioUtils,
        $http
      ) {
        var session = $scope.storage ? localStorage.getItem($scope.storage) : false;
        if (session) {
          session = angular.fromJson(session);
        }

        $scope.formio = null;
        $scope.page = {};
        $scope.form = {};
        $scope.pages = [];
        $scope.colclass = '';
        if (!$scope.submission || !Object.keys($scope.submission.data).length) {
          $scope.submission = session ? {data: session.data} : {data: {}};
        }
        $scope.currentPage = session ? session.page : 0;

        $scope.formioAlerts = [];
        // Shows the given alerts (single or array), and dismisses old alerts
        this.showAlerts = $scope.showAlerts = function (alerts) {
          $scope.formioAlerts = [].concat(alerts);
        };

        $scope.clear = function () {
          if ($scope.storage) {
            localStorage.setItem($scope.storage, '');
          }
          $scope.submission = {data: {}};
          $scope.currentPage = 0;
        };

        // Show the current page.
        var showPage = function () {

          // If the page is past the components length, try to clear first.
          if ($scope.currentPage >= $scope.form.components.length) {
            $scope.clear();
          }

          $scope.wizardLoaded = false;
          if ($scope.storage) {
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
            readOnly: 'readOnly',
            hideComponents: 'hideComponents',
            formioOptions: 'formioOptions',
            id: 'formio-wizard-form'
          }))($scope));
          $scope.wizardLoaded = true;
          $scope.formioAlerts = [];
          $scope.$emit('wizardPage', $scope.currentPage);
        };

        // Check for errors.
        $scope.checkErrors = function () {
          if (!$scope.isValid()) {
            // Change all of the fields to not be pristine.
            angular.forEach($element.find('[name="formioFieldForm"]').children(), function (element) {
              var elementScope = angular.element(element).scope();
              var fieldForm = elementScope.formioFieldForm;
              if (fieldForm[elementScope.component.key]) {
                fieldForm[elementScope.component.key].$pristine = false;
              }
            });
            $scope.formioAlerts.push({
              type: 'danger',
              message: 'Please fix the following errors before proceeding.'
            });
            return true;
          }
          return false;
        };

        // Submit the submission.
        $scope.submit = function () {
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
            if ($scope.storage) {
              localStorage.setItem($scope.storage, '');
            }
            $scope.$emit('formSubmission', submission);
          };

          // Save to specified action.
          if ($scope.action) {
            var method = sub._id ? 'put' : 'post';
            $http[method]($scope.action, sub).success(function (submission) {
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

        $scope.cancel = function () {
          $scope.clear();
          showPage();
        };

        // Move onto the next page.
        $scope.next = function () {
          if ($scope.checkErrors()) {
            return;
          }
          if ($scope.currentPage >= ($scope.form.components.length - 1)) {
            return;
          }
          $scope.currentPage++;
          showPage();
          $scope.$emit('wizardNext', $scope.currentPage);
        };

        // Move onto the previous page.
        $scope.prev = function () {
          if ($scope.currentPage < 1) {
            return;
          }
          $scope.currentPage--;
          showPage();
          $scope.$emit('wizardPrev', $scope.currentPage);
        };

        $scope.goto = function (page) {
          if (page < 0) {
            return;
          }
          if (page >= $scope.form.components.length) {
            return;
          }
          $scope.currentPage = page;
          showPage();
        };

        $scope.isValid = function () {
          var element = $element.find('#formio-wizard-form');
          if (!element.length) {
            return false;
          }
          var formioForm = element.children().scope().formioForm;
          return formioForm.$valid;
        };

        $scope.$on('wizardGoToPage', function (event, page) {
          $scope.goto(page);
        });

        var setForm = function(form) {
          $scope.pages = [];
          angular.forEach(form.components, function(component) {

            // Only include panels for the pages.
            if (component.type === 'panel') {
              $scope.pages.push(component);
            }
          });

          $scope.form = form;
          $scope.form.components = $scope.pages;
          $scope.page = angular.copy(form);
          $scope.page.display = 'form';
          if ($scope.pages.length > 6) {
            $scope.margin = ((1 - ($scope.pages.length * 0.0833333333)) / 2) * 100;
            $scope.colclass = 'col-sm-1';
          }
          else {
            $scope.margin = ((1 - ($scope.pages.length * 0.1666666667)) / 2) * 100;
            $scope.colclass = 'col-sm-2';
          }

          $scope.$emit('wizardFormLoad', form);
          showPage();
        };

        // Load the form.
        if ($scope.src) {
          $scope.formio = new Formio($scope.src);
          $scope.formio.loadForm().then(function (form) {
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

},{}],47:[function(require,module,exports){
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
          if (error.name === 'ValidationError') {
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

        // Used to set the form action.
        var getAction = function(action) {
          if (!action) return '';
          if ($scope.action) return '';
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

        $scope.$watch('form', function(form) {
          if (!form || (Object.keys(form).length === 0)) {
            return;
          }
          $scope.formLoading = false;
          $scope.$emit('formLoad', $scope.form);
        });

        $scope.updateSubmissions = function() {
          $scope.formLoading = true;
          var params = {};
          if ($scope.perPage) params.limit = $scope.perPage;
          if ($scope.skip) params.skip = $scope.skip;
          loader.loadSubmissions({params: params}).then(function(submissions) {
            angular.merge($scope.submissions, angular.copy(submissions));
            $scope.formLoading = false;
            $scope.$emit('submissionsLoad', submissions);
          }, this.onError($scope));
        }.bind(this);

        if ($scope._src) {
          loader = new Formio($scope._src);
          if (options.form) {
            $scope.formLoading = true;

            // If a form is already provided, then skip the load.
            if ($scope.form && Object.keys($scope.form).length) {
              $scope.formLoading = false;
              $scope.$emit('formLoad', $scope.form);
            }
            else {
              loader.loadForm().then(function(form) {
                angular.merge($scope.form, angular.copy(form));
                $scope.formLoading = false;
                $scope.$emit('formLoad', form);
              }, this.onError($scope));
            }
          }
          if (options.submission && loader.submissionId) {
            $scope.formLoading = true;

            // If a submission is already provided, then skip the load.
            if ($scope.submission && Object.keys($scope.submission.data).length) {
              $scope.formLoading = false;
              $scope.$emit('submissionLoad', $scope.submission);
            }
            else {
              loader.loadSubmission().then(function(submission) {
                angular.merge($scope.submission, angular.copy(submission));
                $scope.formLoading = false;
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
          $scope.formLoading = $scope.form && (Object.keys($scope.form).length === 0);

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

},{}],48:[function(require,module,exports){
"use strict";
var formioUtils = require('formio-utils');

module.exports = function() {
  return {
    flattenComponents: formioUtils.flattenComponents,
    eachComponent: formioUtils.eachComponent,
    getComponent: formioUtils.getComponent,
    hideFields: function(form, components) {
      this.eachComponent(form.components, function (component) {
        for (var i in components) {
          if (component.key === components[i]) {
            component.type = 'hidden';
          }
        }
      });
    },
    fieldWrap: function(input) {
      input = input + '<formio-errors></formio-errors>';
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label }}</label>';
      var requiredInline = '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
        inputLabel + requiredInline +
        '<div class="input-group" ng-if="component.prefix || component.suffix">' +
        '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
        input +
        '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
        '</div>' +
        '<div ng-if="!component.prefix && !component.suffix">' + input + '</div>' +
        '</div>' +
        '<div ng-if="component.multiple"><table class="table table-bordered">' +
        inputLabel +
        '<tr ng-repeat="value in data[component.key] track by $index">' +
        '<td>' + requiredInline +
        '<div class="input-group" ng-if="component.prefix || component.suffix">' +
        '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
        multiInput +
        '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
        '</div>' +
        '<div ng-if="!component.prefix && !component.suffix">' + multiInput + '</div>' +
        '</td>' +
        '<td><a ng-click="removeFieldValue($index)" class="btn btn-default"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
        '</tr>' +
        '<tr>' +
        '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> {{ component.addAnother || "Add Another" }}</a></td>' +
        '</tr>' +
        '</table></div>';
      return template;
    }
  };
};

},{"formio-utils":2}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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
      var componentInfo = formioComponents.components[component.type];
      if (!componentInfo.tableView) {
        return value;
      }
      if (component.multiple && (value.length > 0)) {
        var values = [];
        angular.forEach(value, function(arrayValue) {
          values.push(componentInfo.tableView(arrayValue, component, $interpolate));
        });
        return values;
      }
      return componentInfo.tableView(value, component, $interpolate);
    };
  }
];

},{}],51:[function(require,module,exports){
"use strict";
module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return FormioUtils.flattenComponents;
  }
];

},{}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
"use strict";
module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return function(components) {
      var tableComps = [];
      if (!components || !components.length) {
        return tableComps;
      }
      FormioUtils.eachComponent(components, function(component) {
        if (component.tableView && component.key) {
          tableComps.push(component);
        }
      });
      return tableComps;
    };
  }
];

},{}],54:[function(require,module,exports){
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

},{}],55:[function(require,module,exports){
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

},{}],56:[function(require,module,exports){
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
app.provider('Formio', require('./providers/Formio'));

app.provider('FormioPlugins', require('./providers/FormioPlugins'));

/**
 * Provides a way to regsiter the Formio scope.
 */
app.factory('FormioScope', require('./factories/FormioScope'));

app.factory('FormioUtils', require('./factories/FormioUtils'));

app.factory('formioInterceptor', require('./factories/formioInterceptor'));

app.factory('formioTableView', require('./factories/formioTableView'));

app.directive('formio', require('./directives/formio'));

app.directive('formioDelete', require('./directives/formioDelete'));

app.directive('formioErrors', require('./directives/formioErrors'));

app.directive('customValidator', require('./directives/customValidator'));

app.directive('formioSubmissions', require('./directives/formioSubmissions'));

app.directive('formioSubmission', require('./directives/formioSubmission'));

app.directive('formioComponent', require('./directives/formioComponent'));

app.directive('formioElement', require('./directives/formioElement'));

app.directive('formioWizard', require('./directives/formioWizard'));

/**
 * Filter to flatten form components.
 */
app.filter('flattenComponents', require('./filters/flattenComponents'));
app.filter('tableComponents', require('./filters/tableComponents'));
app.filter('tableView', require('./filters/tableView'));
app.filter('tableFieldView', require('./filters/tableFieldView'));
app.filter('safehtml', require('./filters/safehtml'));

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

require('./plugins')(app);

app.run([
  '$templateCache',
  function($templateCache) {

    // The template for the formio forms.
    $templateCache.put('formio.html',
      "<div>\r\n  <i style=\"font-size: 2em;\" ng-if=\"formLoading\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\r\n  <formio-wizard ng-if=\"form.display === 'wizard'\" src=\"src\" form=\"form\" submission=\"submission\" form-action=\"formAction\" read-only=\"readOnly\" hide-components=\"hideComponents\" formio-options=\"formioOptions\" storage=\"form.name\"></formio-wizard>\r\n  <form ng-if=\"!form.display || (form.display === 'form')\" role=\"form\" name=\"formioForm\" ng-submit=\"onSubmit(formioForm)\" novalidate>\r\n    <div ng-repeat=\"alert in formioAlerts\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\r\n      {{ alert.message }}\r\n    </div>\r\n    <formio-component ng-repeat=\"component in form.components track by $index\" component=\"component\" data=\"submission.data\" form=\"formioForm\" formio=\"formio\" read-only=\"readOnly || component.disabled\"></formio-component>\r\n  </form>\r\n</div>\r\n"
    );

    $templateCache.put('formio-wizard.html',
      "<div>\r\n  <div class=\"row bs-wizard\" style=\"border-bottom:0;\">\r\n    <div ng-class=\"{disabled: ($index > currentPage), active: ($index == currentPage), complete: ($index < currentPage)}\" class=\"{{ colclass }} bs-wizard-step\" ng-repeat=\"page in pages\">\r\n      <div class=\"text-center bs-wizard-stepnum\">{{ page.title }}</div>\r\n      <div class=\"progress\"><div class=\"progress-bar\"></div></div>\r\n      <a ng-click=\"goto($index)\" class=\"bs-wizard-dot\"></a>\r\n    </div>\r\n  </div>\r\n  <style type=\"text/css\">.bs-wizard > .bs-wizard-step:first-child { margin-left: {{ margin }}%; }</style>\r\n  <i ng-show=\"!wizardLoaded\" id=\"formio-loading\" style=\"font-size: 2em;\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\r\n  <div ng-repeat=\"alert in formioAlerts\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">{{ alert.message }}</div>\r\n  <div class=\"formio-wizard\"></div>\r\n  <ul ng-show=\"wizardLoaded\" class=\"list-inline\">\r\n    <li><a class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</a></li>\r\n    <li ng-if=\"currentPage > 0\"><a class=\"btn btn-primary\" ng-click=\"prev()\">Previous</a></li>\r\n    <li ng-if=\"currentPage < (form.components.length - 1)\">\r\n      <button class=\"btn btn-primary\" ng-click=\"next()\">Next</button>\r\n    </li>\r\n    <li ng-if=\"currentPage >= (form.components.length - 1)\">\r\n      <button class=\"btn btn-primary\" ng-click=\"submit()\">Submit Form</button>\r\n    </li>\r\n  </ul>\r\n</div>\r\n"
    );

    $templateCache.put('formio-delete.html',
      "<form role=\"form\">\r\n  <div ng-repeat=\"alert in formioAlerts\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\r\n    {{ alert.message }}\r\n  </div>\r\n  <h3>Are you sure you wish to delete the {{ resourceName || _resourceName }}?</h3>\r\n  <div class=\"btn-toolbar\">\r\n    <button ng-click=\"onDelete()\" class=\"btn btn-danger\">Yes</button>\r\n    <button ng-click=\"onCancel()\" class=\"btn btn-default\">No</button>\r\n  </div>\r\n</form>\r\n"
    );

    $templateCache.put('formio/submission.html',
      "<table class=\"table table-striped table-responsive\">\r\n  <tr ng-repeat=\"component in form.components | tableComponents\" ng-if=\"!ignore[component.key]\">\r\n    <th>{{ component.label }}</th>\r\n    <td><div ng-bind-html=\"submission.data | tableView:component\"></div></td>\r\n  </tr>\r\n</table>\r\n"
    );

    $templateCache.put('formio/submissions.html',
      "<div>\r\n  <div ng-repeat=\"alert in formioAlerts\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\r\n    {{ alert.message }}\r\n  </div>\r\n  <table class=\"table\">\r\n    <thead>\r\n      <tr>\r\n        <th ng-repeat=\"component in form.components | flattenComponents\" ng-if=\"tableView(component)\">{{ component.label || component.key }}</th>\r\n        <th>Submitted</th>\r\n        <th>Updated</th>\r\n        <th>Operations</th>\r\n      </tr>\r\n    </thead>\r\n    <tbody>\r\n      <tr ng-repeat=\"submission in submissions\" class=\"formio-submission\" ng-click=\"$emit('submissionView', submission)\">\r\n        <td ng-repeat=\"component in form.components | flattenComponents\" ng-if=\"tableView(component)\">{{ submission.data | tableView:component }}</td>\r\n        <td>{{ submission.created | amDateFormat:'l, h:mm:ss a' }}</td>\r\n        <td>{{ submission.modified | amDateFormat:'l, h:mm:ss a' }}</td>\r\n        <td>\r\n          <div class=\"button-group\" style=\"display:flex;\">\r\n            <a ng-click=\"$emit('submissionView', submission); $event.stopPropagation();\" class=\"btn btn-primary btn-xs\"><span class=\"glyphicon glyphicon-eye-open\"></span></a>&nbsp;\r\n            <a ng-click=\"$emit('submissionEdit', submission); $event.stopPropagation();\" class=\"btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-edit\"></span></a>&nbsp;\r\n            <a ng-click=\"$emit('submissionDelete', submission); $event.stopPropagation();\" class=\"btn btn-danger btn-xs\"><span class=\"glyphicon glyphicon-remove-circle\"></span></a>\r\n          </div>\r\n        </td>\r\n      </tr>\r\n    </tbody>\r\n  </table>\r\n  <pagination\r\n    ng-if=\"submissions.serverCount > perPage\"\r\n    ng-model=\"currentPage\"\r\n    ng-change=\"pageChanged(currentPage)\"\r\n    total-items=\"submissions.serverCount\"\r\n    items-per-page=\"perPage\"\r\n    direction-links=\"false\"\r\n    boundary-links=\"true\"\r\n    first-text=\"&laquo;\"\r\n    last-text=\"&raquo;\"\r\n    >\r\n  </pagination>\r\n</div>\r\n"
    );

    // A formio component template.
    $templateCache.put('formio/component.html',
      "<ng-form name=\"formioFieldForm\" class=\"formio-component-{{ component.key }}\" ng-hide=\"component.hidden\">\r\n  <div class=\"form-group has-feedback form-field-type-{{ component.type }} {{component.customClass}}\" id=\"form-group-{{ component.key }}\" ng-class=\"{'has-error': formioFieldForm[component.key].$invalid && !formioFieldForm[component.key].$pristine }\" ng-style=\"component.style\">\r\n    <formio-element></formio-element>\r\n  </div>\r\n</ng-form>\r\n"
    );

    $templateCache.put('formio/errors.html',
      "<div ng-show=\"formioFieldForm[component.key].$error && !formioFieldForm[component.key].$pristine\">\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.email\">{{ component.label || component.key }} must be a valid email.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.required\">{{ component.label || component.key }} is required.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.number\">{{ component.label || component.key }} must be a number.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.maxlength\">{{ component.label || component.key }} must be shorter than {{ component.validate.maxLength + 1 }} characters.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.minlength\">{{ component.label || component.key }} must be longer than {{ component.validate.minLength - 1 }} characters.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.min\">{{ component.label || component.key }} must be higher than {{ component.validate.min - 1 }}.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.max\">{{ component.label || component.key }} must be lower than {{ component.validate.max + 1 }}.</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.custom\">{{ component.customError }}</p>\r\n  <p class=\"help-block\" ng-show=\"formioFieldForm[component.key].$error.pattern\">{{ component.label || component.key }} does not match the pattern {{ component.validate.pattern }}</p>\r\n</div>\r\n"
    );
  }
]);

require('./components');

},{"./components":23,"./directives/customValidator":38,"./directives/formio":39,"./directives/formioComponent":40,"./directives/formioDelete":41,"./directives/formioElement":42,"./directives/formioErrors":43,"./directives/formioSubmission":44,"./directives/formioSubmissions":45,"./directives/formioWizard":46,"./factories/FormioScope":47,"./factories/FormioUtils":48,"./factories/formioInterceptor":49,"./factories/formioTableView":50,"./filters/flattenComponents":51,"./filters/safehtml":52,"./filters/tableComponents":53,"./filters/tableFieldView":54,"./filters/tableView":55,"./plugins":57,"./providers/Formio":61,"./providers/FormioPlugins":62}],57:[function(require,module,exports){
"use strict";
module.exports = function(app) {
  require('./storage/url')(app);
  require('./storage/s3')(app);
  require('./storage/dropbox')(app);
};

},{"./storage/dropbox":58,"./storage/s3":59,"./storage/url":60}],58:[function(require,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'FormioPluginsProvider',
    'FormioStorageDropboxProvider',
    function (
      FormioPluginsProvider,
      FormioStorageDropboxProvider
    ) {
      FormioPluginsProvider.register('storage', 'dropbox', FormioStorageDropboxProvider.$get());
    }]
  );

  app.factory('FormioStorageDropbox', [
    '$q',
    '$rootScope',
    '$window',
    '$http',
    'Blob',
    'FileSaver',
    function(
      $q,
      $rootScope,
      $window,
      $http,
      Blob,
      FileSaver
    ) {
      var getDropboxToken = function() {
        var dropboxToken;
        if ($rootScope.user && $rootScope.user.externalTokens) {
          angular.forEach($rootScope.user.externalTokens, function(token) {
            if (token.type === 'dropbox') {
              dropboxToken = token.token;
            }
          });
        }
        return dropboxToken;
        //return _.result(_.find($rootScope.user.externalTokens, {type: 'dropbox'}), 'token');
      };

      return {
        title: 'Dropbox',
        name: 'dropbox',
        uploadFile: function(file, status, $scope) {
          var defer = $q.defer();
          var dir = $scope.component.dir || '';
          var dropboxToken = getDropboxToken();
          if (!dropboxToken) {
            defer.reject('You must authenticate with dropbox before uploading files.');
          }
          else {
            // Both Upload and $http don't handle files as application/octet-stream which is required by dropbox.
            var xhr = new XMLHttpRequest();

            var onProgress = function(evt) {
              status.status = 'progress';
              status.progress = parseInt(100.0 * evt.loaded / evt.total);
              delete status.message;
              $scope.$apply();
            };

            xhr.upload.onprogress = onProgress;

            xhr.onload = function() {
              if (xhr.status === 200) {
                defer.resolve(JSON.parse(xhr.response));
                $scope.$apply();
              }
              else {
                defer.reject(xhr.response || 'Unable to upload file');
                $scope.$apply();
              }
            };

            xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload');
            xhr.setRequestHeader('Authorization', 'Bearer ' + dropboxToken);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({
              path: '/' + dir + file.name,
              mode: 'add',
              autorename: true,
              mute: false
            }));

            xhr.send(file);
          }
          return defer.promise;
        },
        getFile: function(fileUrl, file) {
          var defer = $q.defer();
          var dropboxToken = getDropboxToken();
          if (!dropboxToken) {
            defer.reject('You must authenticate with dropbox before downloading files.');
          }
          else {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';

            xhr.onload = function() {
              if (xhr.status === 200) {
                defer.resolve(xhr.response);
              }
              else {
                defer.reject(xhr.response || 'Unable to download file');
              }
            };

            xhr.open('POST', 'https://content.dropboxapi.com/2/files/download');
            xhr.setRequestHeader('Authorization', 'Bearer ' + dropboxToken);
            xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({
              path: file.path_lower
            }));
            xhr.send();
          }
          return defer.promise;
        },
        downloadFile: function(evt, file) {
          var strMimeType = 'application/octet-stream';
          evt.preventDefault();
          this.getFile(null, file).then(function(data) {
            var blob = new Blob([data], {type: strMimeType});
            FileSaver.saveAs(blob, file.name, true);
          }).catch(function(err) {
            alert(err);
          });
        }
      };
    }
  ]);
};


},{}],59:[function(require,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'FormioPluginsProvider',
    'FormioStorageS3Provider',
    function (
      FormioPluginsProvider,
      FormioStorageS3Provider
    ) {
      FormioPluginsProvider.register('storage', 's3', FormioStorageS3Provider.$get());
    }
  ]);

  app.factory('FormioStorageS3', [
    '$q',
    '$window',
    'Formio',
    'Upload',
    function(
      $q,
      $window,
      Formio,
      Upload
    ) {
      return {
        title: 'S3',
        name: 's3',
        uploadFile: function(file, status, $scope) {
          var defer = $q.defer();
          Formio.request($scope.formio.formUrl + '/storage/s3', 'POST', {
            name: file.name,
            size: file.size,
            type: file.type
          })
            .then(function(response) {
              var request = {
                url: response.url,
                method: 'POST',
                data: response.data
              };
              request.data.file = file;
              var dir = $scope.component.dir || '';
              request.data.key += dir + file.name;
              var upload = Upload.upload(request);
              upload
                .then(function() {
                  // Handle upload finished.
                  defer.resolve({
                    name: file.name,
                    bucket: response.bucket,
                    key: request.data.key,
                    url: response.url + request.data.key,
                    acl: request.data.acl,
                    size: file.size,
                    type: file.type
                  });
                }, function(resp) {
                  // Handle error
                  var oParser = new DOMParser();
                  var oDOM = oParser.parseFromString(resp.data, 'text/xml');
                  var message = oDOM.getElementsByTagName('Message')[0].innerHTML;
                  defer.reject(message);
                }, function(evt) {
                  // Progress notify
                  status.status = 'progress';
                  status.progress = parseInt(100.0 * evt.loaded / evt.total);
                  delete status.message;
                });
            });
          return defer.promise;
        },
        getFile: function(formUrl, file) {
          if (file.acl !== 'public-read') {
            return Formio.request(formUrl + '/storage/s3?bucket=' + file.bucket + '&key=' + file.key, 'GET');
          }
          else {
            var deferred = $q.defer();
            deferred.resolve(file);
            return deferred.promise;
          }
        },
        downloadFile: function(evt, file, $scope) {
          evt.preventDefault();
          this.getFile($scope.form, file).then(function(file) {
            $window.open(file.url, '_blank');
          }).catch(function (response) {
            // Is alert the best way to do this?
            // User is expecting an immediate notification due to attempting to download a file.
            alert(response);
          });
        }
      };
    }
  ]);
};

},{}],60:[function(require,module,exports){
"use strict";
module.exports = function(app) {
  app.config([
    'FormioPluginsProvider',
    'FormioStorageUrlProvider',
    function (
      FormioPluginsProvider,
      FormioStorageUrlProvider
    ) {
      FormioPluginsProvider.register('storage', 'url', FormioStorageUrlProvider.$get());
    }
  ]);

  app.factory('FormioStorageUrl', [
    '$q',
    'Upload',
    function (
      $q,
      Upload
    ) {
      return {
        title: 'Url',
        name: 'url',
        uploadFile: function(file, status, $scope) {
          var defer = $q.defer();
          Upload.upload({
            url: $scope.component.url,
            data: {
              file: file
            }
          })
            .then(function(resp) {
              defer.resolve(resp);
            }, function(resp) {
              defer.reject(resp.data);
            }, function (evt) {
              // Progress notify
              status.status = 'progress';
              status.progress = parseInt(100.0 * evt.loaded / evt.total);
              delete status.message;
            });
          return defer.promise;
        },
        downloadFile: function() {
          // Do nothing which will cause a normal link click to occur.
        }
      };
    }]
  );
};

},{}],61:[function(require,module,exports){
"use strict";
module.exports = function() {

  // The formio class.
  var Formio = require('formiojs/src/formio.js');

  // Return the provider interface.
  return {

    // Expose Formio configuration functions
    setBaseUrl: Formio.setBaseUrl,
    getBaseUrl: Formio.getBaseUrl,
    registerPlugin: Formio.registerPlugin,
    getPlugin: Formio.getPlugin,
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

},{"formiojs/src/formio.js":7}],62:[function(require,module,exports){
"use strict";

module.exports = function() {

  var plugins = {};

  return {

    register: function(type, name, plugin) {
      if (!plugins[type]) {
        plugins[type] = {};
      }
      plugins[type][name] = plugin;
    },

    $get: [
      function() {
        return function(type, name) {
          if (type) {
            if (name) {
              return plugins[type][name] || false;
            }
            return plugins[type] || false;
          }
          return plugins;
        };
      }
    ]
  };
};

},{}]},{},[56])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Zvcm1pby11dGlscy9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZm9ybWlvanMvbm9kZV9tb2R1bGVzL1EvcS5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9ub2RlX21vZHVsZXMvc2hhbGxvdy1jb3B5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Zvcm1pb2pzL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCJub2RlX21vZHVsZXMvZm9ybWlvanMvc3JjL2Zvcm1pby5qcyIsInNyYy9jb21wb25lbnRzL2FkZHJlc3MuanMiLCJzcmMvY29tcG9uZW50cy9idXR0b24uanMiLCJzcmMvY29tcG9uZW50cy9jaGVja2JveC5qcyIsInNyYy9jb21wb25lbnRzL2NvbHVtbnMuanMiLCJzcmMvY29tcG9uZW50cy9jb21wb25lbnRzLmpzIiwic3JjL2NvbXBvbmVudHMvY29udGFpbmVyLmpzIiwic3JjL2NvbXBvbmVudHMvY29udGVudC5qcyIsInNyYy9jb21wb25lbnRzL2N1c3RvbS5qcyIsInNyYy9jb21wb25lbnRzL2RhdGFncmlkLmpzIiwic3JjL2NvbXBvbmVudHMvZGF0ZXRpbWUuanMiLCJzcmMvY29tcG9uZW50cy9lbWFpbC5qcyIsInNyYy9jb21wb25lbnRzL2ZpZWxkc2V0LmpzIiwic3JjL2NvbXBvbmVudHMvZmlsZS5qcyIsInNyYy9jb21wb25lbnRzL2hpZGRlbi5qcyIsInNyYy9jb21wb25lbnRzL2h0bWxlbGVtZW50LmpzIiwic3JjL2NvbXBvbmVudHMvaW5kZXguanMiLCJzcmMvY29tcG9uZW50cy9udW1iZXIuanMiLCJzcmMvY29tcG9uZW50cy9wYWdlLmpzIiwic3JjL2NvbXBvbmVudHMvcGFuZWwuanMiLCJzcmMvY29tcG9uZW50cy9wYXNzd29yZC5qcyIsInNyYy9jb21wb25lbnRzL3Bob25lbnVtYmVyLmpzIiwic3JjL2NvbXBvbmVudHMvcmFkaW8uanMiLCJzcmMvY29tcG9uZW50cy9yZXNvdXJjZS5qcyIsInNyYy9jb21wb25lbnRzL3NlbGVjdC5qcyIsInNyYy9jb21wb25lbnRzL3NlbGVjdGJveGVzLmpzIiwic3JjL2NvbXBvbmVudHMvc2lnbmF0dXJlLmpzIiwic3JjL2NvbXBvbmVudHMvdGFibGUuanMiLCJzcmMvY29tcG9uZW50cy90ZXh0YXJlYS5qcyIsInNyYy9jb21wb25lbnRzL3RleHRmaWVsZC5qcyIsInNyYy9jb21wb25lbnRzL3dlbGwuanMiLCJzcmMvZGlyZWN0aXZlcy9jdXN0b21WYWxpZGF0b3IuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW8uanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9Db21wb25lbnQuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9EZWxldGUuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9FbGVtZW50LmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvU3VibWlzc2lvbi5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvV2l6YXJkLmpzIiwic3JjL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZS5qcyIsInNyYy9mYWN0b3JpZXMvRm9ybWlvVXRpbHMuanMiLCJzcmMvZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yLmpzIiwic3JjL2ZhY3Rvcmllcy9mb3JtaW9UYWJsZVZpZXcuanMiLCJzcmMvZmlsdGVycy9mbGF0dGVuQ29tcG9uZW50cy5qcyIsInNyYy9maWx0ZXJzL3NhZmVodG1sLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVDb21wb25lbnRzLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVGaWVsZFZpZXcuanMiLCJzcmMvZmlsdGVycy90YWJsZVZpZXcuanMiLCJzcmMvZm9ybWlvLmpzIiwic3JjL3BsdWdpbnMvaW5kZXguanMiLCJzcmMvcGx1Z2lucy9zdG9yYWdlL2Ryb3Bib3guanMiLCJzcmMvcGx1Z2lucy9zdG9yYWdlL3MzLmpzIiwic3JjL3BsdWdpbnMvc3RvcmFnZS91cmwuanMiLCJzcmMvcHJvdmlkZXJzL0Zvcm1pby5qcyIsInNyYy9wcm92aWRlcnMvRm9ybWlvUGx1Z2lucy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaGdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGNvbXBvbmVudCB3aXRoaW4gYSBmb3JtLlxuICAgKiBAcGFyYW0gY29tcG9uZW50c1xuICAgKiBAcGFyYW0gZm5cbiAgICovXG4gIGVhY2hDb21wb25lbnQ6IGZ1bmN0aW9uIGVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZm4pIHtcbiAgICBpZiAoIWNvbXBvbmVudHMpIHJldHVybjtcblxuICAgIGNvbXBvbmVudHMuZm9yRWFjaChmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgIGlmIChjb21wb25lbnQuY29sdW1ucyAmJiBBcnJheS5pc0FycmF5KGNvbXBvbmVudC5jb2x1bW5zKSkge1xuICAgICAgICBjb21wb25lbnQuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgIGVhY2hDb21wb25lbnQoY29sdW1uLmNvbXBvbmVudHMsIGZuKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGVsc2UgaWYgKGNvbXBvbmVudC5yb3dzICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LnJvd3MpKSB7XG4gICAgICAgIFtdLmNvbmNhdC5hcHBseShbXSwgY29tcG9uZW50LnJvd3MpLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICAgICAgZWFjaENvbXBvbmVudChyb3cuY29tcG9uZW50cywgZm4pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudHMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29tcG9uZW50cykpIHtcbiAgICAgICAgZWFjaENvbXBvbmVudChjb21wb25lbnQuY29tcG9uZW50cywgZm4pO1xuICAgICAgfVxuXG4gICAgICBlbHNlIHtcbiAgICAgICAgZm4oY29tcG9uZW50KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBjb21wb25lbnQgaXMgYSB0cmVlLCBiZSBzdXJlIHRvIGFkZCBpdCBiYWNrIGluIGFzIHdlbGwuXG4gICAgICBpZiAoY29tcG9uZW50LnRyZWUpIHtcbiAgICAgICAgZm4oY29tcG9uZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGEgY29tcG9uZW50IGJ5IGl0cyBrZXlcbiAgICogQHBhcmFtIGNvbXBvbmVudHNcbiAgICogQHBhcmFtIGtleSBUaGUga2V5IG9mIHRoZSBjb21wb25lbnQgdG8gZ2V0XG4gICAqIEByZXR1cm5zIFRoZSBjb21wb25lbnQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBrZXksIG9yIHVuZGVmaW5lZCBpZiBub3QgZm91bmQuXG4gICAqL1xuICBnZXRDb21wb25lbnQ6IGZ1bmN0aW9uIGdldENvbXBvbmVudChjb21wb25lbnRzLCBrZXkpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIG1vZHVsZS5leHBvcnRzLmVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0ga2V5KSB7XG4gICAgICAgIHJlc3VsdCA9IGNvbXBvbmVudDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBmb3JtIGNvbXBvbmVudHMgZm9yIGRhdGEgbWFuaXB1bGF0aW9uLlxuICAgKiBAcGFyYW0gY29tcG9uZW50c1xuICAgKiBAcGFyYW0gZmxhdHRlbmVkXG4gICAqIEByZXR1cm5zIHsqfHt9fVxuICAgKi9cbiAgZmxhdHRlbkNvbXBvbmVudHM6IGZ1bmN0aW9uIGZsYXR0ZW5Db21wb25lbnRzKGNvbXBvbmVudHMpIHtcbiAgICB2YXIgZmxhdHRlbmVkID0ge307XG4gICAgbW9kdWxlLmV4cG9ydHMuZWFjaENvbXBvbmVudChjb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgIGZsYXR0ZW5lZFtjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudDtcbiAgICB9KTtcbiAgICByZXR1cm4gZmxhdHRlbmVkO1xuICB9XG59O1xuIiwiLy8gdmltOnRzPTQ6c3RzPTQ6c3c9NDpcbi8qIVxuICpcbiAqIENvcHlyaWdodCAyMDA5LTIwMTIgS3JpcyBLb3dhbCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVFxuICogbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9yYXcvbWFzdGVyL0xJQ0VOU0VcbiAqXG4gKiBXaXRoIHBhcnRzIGJ5IFR5bGVyIENsb3NlXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDA5IFR5bGVyIENsb3NlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIFggbGljZW5zZSBmb3VuZFxuICogYXQgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5odG1sXG4gKiBGb3JrZWQgYXQgcmVmX3NlbmQuanMgdmVyc2lvbjogMjAwOS0wNS0xMVxuICpcbiAqIFdpdGggcGFydHMgYnkgTWFyayBNaWxsZXJcbiAqIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFRoaXMgZmlsZSB3aWxsIGZ1bmN0aW9uIHByb3Blcmx5IGFzIGEgPHNjcmlwdD4gdGFnLCBvciBhIG1vZHVsZVxuICAgIC8vIHVzaW5nIENvbW1vbkpTIGFuZCBOb2RlSlMgb3IgUmVxdWlyZUpTIG1vZHVsZSBmb3JtYXRzLiAgSW5cbiAgICAvLyBDb21tb24vTm9kZS9SZXF1aXJlSlMsIHRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgUSBBUEkgYW5kIHdoZW5cbiAgICAvLyBleGVjdXRlZCBhcyBhIHNpbXBsZSA8c2NyaXB0PiwgaXQgY3JlYXRlcyBhIFEgZ2xvYmFsIGluc3RlYWQuXG5cbiAgICAvLyBNb250YWdlIFJlcXVpcmVcbiAgICBpZiAodHlwZW9mIGJvb3RzdHJhcCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGJvb3RzdHJhcChcInByb21pc2VcIiwgZGVmaW5pdGlvbik7XG5cbiAgICAvLyBDb21tb25KU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcblxuICAgIC8vIFJlcXVpcmVKU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xuXG4gICAgLy8gU0VTIChTZWN1cmUgRWNtYVNjcmlwdClcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKCFzZXMub2soKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VzLm1ha2VRID0gZGVmaW5pdGlvbjtcbiAgICAgICAgfVxuXG4gICAgLy8gPHNjcmlwdD5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gUHJlZmVyIHdpbmRvdyBvdmVyIHNlbGYgZm9yIGFkZC1vbiBzY3JpcHRzLiBVc2Ugc2VsZiBmb3JcbiAgICAgICAgLy8gbm9uLXdpbmRvd2VkIGNvbnRleHRzLlxuICAgICAgICB2YXIgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHNlbGY7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBgd2luZG93YCBvYmplY3QsIHNhdmUgdGhlIHByZXZpb3VzIFEgZ2xvYmFsXG4gICAgICAgIC8vIGFuZCBpbml0aWFsaXplIFEgYXMgYSBnbG9iYWwuXG4gICAgICAgIHZhciBwcmV2aW91c1EgPSBnbG9iYWwuUTtcbiAgICAgICAgZ2xvYmFsLlEgPSBkZWZpbml0aW9uKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgbm9Db25mbGljdCBmdW5jdGlvbiBzbyBRIGNhbiBiZSByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgIC8vIGdsb2JhbCBuYW1lc3BhY2UuXG4gICAgICAgIGdsb2JhbC5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBnbG9iYWwuUSA9IHByZXZpb3VzUTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBlbnZpcm9ubWVudCB3YXMgbm90IGFudGljaXBhdGVkIGJ5IFEuIFBsZWFzZSBmaWxlIGEgYnVnLlwiKTtcbiAgICB9XG5cbn0pKGZ1bmN0aW9uICgpIHtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgaGFzU3RhY2tzID0gZmFsc2U7XG50cnkge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xufSBjYXRjaCAoZSkge1xuICAgIGhhc1N0YWNrcyA9ICEhZS5zdGFjaztcbn1cblxuLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkXG4vLyBieSBRLlxudmFyIHFTdGFydGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xudmFyIHFGaWxlTmFtZTtcblxuLy8gc2hpbXNcblxuLy8gdXNlZCBmb3IgZmFsbGJhY2sgaW4gXCJhbGxSZXNvbHZlZFwiXG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxuLy8gb2YgdGhlIGV2ZW50IGxvb3AuXG52YXIgbmV4dFRpY2sgPShmdW5jdGlvbiAoKSB7XG4gICAgLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXG4gICAgdmFyIGhlYWQgPSB7dGFzazogdm9pZCAwLCBuZXh0OiBudWxsfTtcbiAgICB2YXIgdGFpbCA9IGhlYWQ7XG4gICAgdmFyIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgdmFyIHJlcXVlc3RUaWNrID0gdm9pZCAwO1xuICAgIHZhciBpc05vZGVKUyA9IGZhbHNlO1xuICAgIC8vIHF1ZXVlIGZvciBsYXRlIHRhc2tzLCB1c2VkIGJ5IHVuaGFuZGxlZCByZWplY3Rpb24gdHJhY2tpbmdcbiAgICB2YXIgbGF0ZXJRdWV1ZSA9IFtdO1xuXG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuICAgICAgICB2YXIgdGFzaywgZG9tYWluO1xuXG4gICAgICAgIHdoaWxlIChoZWFkLm5leHQpIHtcbiAgICAgICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICAgICAgICB0YXNrID0gaGVhZC50YXNrO1xuICAgICAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xuICAgICAgICAgICAgZG9tYWluID0gaGVhZC5kb21haW47XG5cbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pO1xuXG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGxhdGVyUXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0YXNrID0gbGF0ZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrKTtcbiAgICAgICAgfVxuICAgICAgICBmbHVzaGluZyA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyBydW5zIGEgc2luZ2xlIGZ1bmN0aW9uIGluIHRoZSBhc3luYyBxdWV1ZVxuICAgIGZ1bmN0aW9uIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRhc2soKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcbiAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cbiAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5leHRUaWNrID0gZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcbiAgICAgICAgICAgIHRhc2s6IHRhc2ssXG4gICAgICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxuICAgICAgICAgICAgbmV4dDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIHByb2Nlc3MudG9TdHJpbmcoKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAvLyBFbnN1cmUgUSBpcyBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudCwgd2l0aCBhIGBwcm9jZXNzLm5leHRUaWNrYC5cbiAgICAgICAgLy8gVG8gc2VlIHRocm91Z2ggZmFrZSBOb2RlIGVudmlyb25tZW50czpcbiAgICAgICAgLy8gKiBNb2NoYSB0ZXN0IHJ1bm5lciAtIGV4cG9zZXMgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgXG4gICAgICAgIC8vICogQnJvd3NlcmlmeSAtIGV4cG9zZXMgYSBgcHJvY2Vzcy5uZXhUaWNrYCBmdW5jdGlvbiB0aGF0IHVzZXNcbiAgICAgICAgLy8gICBgc2V0VGltZW91dGAuIEluIHRoaXMgY2FzZSBgc2V0SW1tZWRpYXRlYCBpcyBwcmVmZXJyZWQgYmVjYXVzZVxuICAgICAgICAvLyAgICBpdCBpcyBmYXN0ZXIuIEJyb3dzZXJpZnkncyBgcHJvY2Vzcy50b1N0cmluZygpYCB5aWVsZHNcbiAgICAgICAgLy8gICBcIltvYmplY3QgT2JqZWN0XVwiLCB3aGlsZSBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudFxuICAgICAgICAvLyAgIGBwcm9jZXNzLm5leHRUaWNrKClgIHlpZWxkcyBcIltvYmplY3QgcHJvY2Vzc11cIi5cbiAgICAgICAgaXNOb2RlSlMgPSB0cnVlO1xuXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgICAgIH07XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgLy8gQXQgbGVhc3QgU2FmYXJpIFZlcnNpb24gNi4wLjUgKDg1MzYuMzAuMSkgaW50ZXJtaXR0ZW50bHkgY2Fubm90IGNyZWF0ZVxuICAgICAgICAvLyB3b3JraW5nIG1lc3NhZ2UgcG9ydHMgdGhlIGZpcnN0IHRpbWUgYSBwYWdlIGxvYWRzLlxuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gcmVxdWVzdFBvcnRUaWNrO1xuICAgICAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICAgICAgICAgIGZsdXNoKCk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXF1ZXN0UG9ydFRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBPcGVyYSByZXF1aXJlcyB1cyB0byBwcm92aWRlIGEgbWVzc2FnZSBwYXlsb2FkLCByZWdhcmRsZXNzIG9mXG4gICAgICAgICAgICAvLyB3aGV0aGVyIHdlIHVzZSBpdC5cbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICByZXF1ZXN0UG9ydFRpY2soKTtcbiAgICAgICAgfTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9sZCBicm93c2Vyc1xuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvLyBydW5zIGEgdGFzayBhZnRlciBhbGwgb3RoZXIgdGFza3MgaGF2ZSBiZWVuIHJ1blxuICAgIC8vIHRoaXMgaXMgdXNlZnVsIGZvciB1bmhhbmRsZWQgcmVqZWN0aW9uIHRyYWNraW5nIHRoYXQgbmVlZHMgdG8gaGFwcGVuXG4gICAgLy8gYWZ0ZXIgYWxsIGB0aGVuYGQgdGFza3MgaGF2ZSBiZWVuIHJ1bi5cbiAgICBuZXh0VGljay5ydW5BZnRlciA9IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIGxhdGVyUXVldWUucHVzaCh0YXNrKTtcbiAgICAgICAgaWYgKCFmbHVzaGluZykge1xuICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgcmVxdWVzdFRpY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5leHRUaWNrO1xufSkoKTtcblxuLy8gQXR0ZW1wdCB0byBtYWtlIGdlbmVyaWNzIHNhZmUgaW4gdGhlIGZhY2Ugb2YgZG93bnN0cmVhbVxuLy8gbW9kaWZpY2F0aW9ucy5cbi8vIFRoZXJlIGlzIG5vIHNpdHVhdGlvbiB3aGVyZSB0aGlzIGlzIG5lY2Vzc2FyeS5cbi8vIElmIHlvdSBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLCB0aGVzZSBwcmltb3JkaWFscyBuZWVkIHRvIGJlXG4vLyBkZWVwbHkgZnJvemVuIGFueXdheSwgYW5kIGlmIHlvdSBkb27igJl0IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsXG4vLyB0aGlzIGlzIGp1c3QgcGxhaW4gcGFyYW5vaWQuXG4vLyBIb3dldmVyLCB0aGlzICoqbWlnaHQqKiBoYXZlIHRoZSBuaWNlIHNpZGUtZWZmZWN0IG9mIHJlZHVjaW5nIHRoZSBzaXplIG9mXG4vLyB0aGUgbWluaWZpZWQgY29kZSBieSByZWR1Y2luZyB4LmNhbGwoKSB0byBtZXJlbHkgeCgpXG4vLyBTZWUgTWFyayBNaWxsZXLigJlzIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhpcyBkb2VzLlxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9Y29udmVudGlvbnM6c2FmZV9tZXRhX3Byb2dyYW1taW5nXG52YXIgY2FsbCA9IEZ1bmN0aW9uLmNhbGw7XG5mdW5jdGlvbiB1bmN1cnJ5VGhpcyhmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNhbGwuYXBwbHkoZiwgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuLy8gVGhpcyBpcyBlcXVpdmFsZW50LCBidXQgc2xvd2VyOlxuLy8gdW5jdXJyeVRoaXMgPSBGdW5jdGlvbl9iaW5kLmJpbmQoRnVuY3Rpb25fYmluZC5jYWxsKTtcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VuY3Vycnl0aGlzXG5cbnZhciBhcnJheV9zbGljZSA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5zbGljZSk7XG5cbnZhciBhcnJheV9yZWR1Y2UgPSB1bmN1cnJ5VGhpcyhcbiAgICBBcnJheS5wcm90b3R5cGUucmVkdWNlIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICAvLyBjb25jZXJuaW5nIHRoZSBpbml0aWFsIHZhbHVlLCBpZiBvbmUgaXMgbm90IHByb3ZpZGVkXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBzZWVrIHRvIHRoZSBmaXJzdCB2YWx1ZSBpbiB0aGUgYXJyYXksIGFjY291bnRpbmdcbiAgICAgICAgICAgIC8vIGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCBpcyBpcyBhIHNwYXJzZSBhcnJheVxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2lzID0gdGhpc1tpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgrK2luZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSB3aGlsZSAoMSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVkdWNlXG4gICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgdGhlIGFycmF5IGlzIHNwYXJzZVxuICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBiYXNpcyA9IGNhbGxiYWNrKGJhc2lzLCB0aGlzW2luZGV4XSwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiYXNpcztcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfaW5kZXhPZiA9IHVuY3VycnlUaGlzKFxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBub3QgYSB2ZXJ5IGdvb2Qgc2hpbSwgYnV0IGdvb2QgZW5vdWdoIGZvciBvdXIgb25lIHVzZSBvZiBpdFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzW2ldID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfbWFwID0gdW5jdXJyeVRoaXMoXG4gICAgQXJyYXkucHJvdG90eXBlLm1hcCB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbGxlY3QgPSBbXTtcbiAgICAgICAgYXJyYXlfcmVkdWNlKHNlbGYsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29sbGVjdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBpbmRleCwgc2VsZikpO1xuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICByZXR1cm4gY29sbGVjdDtcbiAgICB9XG4pO1xuXG52YXIgb2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgIGZ1bmN0aW9uIFR5cGUoKSB7IH1cbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICByZXR1cm4gbmV3IFR5cGUoKTtcbn07XG5cbnZhciBvYmplY3RfaGFzT3duUHJvcGVydHkgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcblxudmFyIG9iamVjdF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0X2hhc093blByb3BlcnR5KG9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGtleXM7XG59O1xuXG52YXIgb2JqZWN0X3RvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSBPYmplY3QodmFsdWUpO1xufVxuXG4vLyBnZW5lcmF0b3IgcmVsYXRlZCBzaGltc1xuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgZnVuY3Rpb24gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuZnVuY3Rpb24gaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikge1xuICAgIHJldHVybiAoXG4gICAgICAgIG9iamVjdF90b1N0cmluZyhleGNlcHRpb24pID09PSBcIltvYmplY3QgU3RvcEl0ZXJhdGlvbl1cIiB8fFxuICAgICAgICBleGNlcHRpb24gaW5zdGFuY2VvZiBRUmV0dXJuVmFsdWVcbiAgICApO1xufVxuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaGVscGVyIGFuZCBRLnJldHVybiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpblxuLy8gU3BpZGVyTW9ua2V5LlxudmFyIFFSZXR1cm5WYWx1ZTtcbmlmICh0eXBlb2YgUmV0dXJuVmFsdWUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBRUmV0dXJuVmFsdWUgPSBSZXR1cm5WYWx1ZTtcbn0gZWxzZSB7XG4gICAgUVJldHVyblZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9O1xufVxuXG4vLyBsb25nIHN0YWNrIHRyYWNlc1xuXG52YXIgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgPSBcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCI7XG5cbmZ1bmN0aW9uIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSkge1xuICAgIC8vIElmIHBvc3NpYmxlLCB0cmFuc2Zvcm0gdGhlIGVycm9yIHN0YWNrIHRyYWNlIGJ5IHJlbW92aW5nIE5vZGUgYW5kIFFcbiAgICAvLyBjcnVmdCwgdGhlbiBjb25jYXRlbmF0aW5nIHdpdGggdGhlIHN0YWNrIHRyYWNlIG9mIGBwcm9taXNlYC4gU2VlICM1Ny5cbiAgICBpZiAoaGFzU3RhY2tzICYmXG4gICAgICAgIHByb21pc2Uuc3RhY2sgJiZcbiAgICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIGVycm9yICE9PSBudWxsICYmXG4gICAgICAgIGVycm9yLnN0YWNrICYmXG4gICAgICAgIGVycm9yLnN0YWNrLmluZGV4T2YoU1RBQ0tfSlVNUF9TRVBBUkFUT1IpID09PSAtMVxuICAgICkge1xuICAgICAgICB2YXIgc3RhY2tzID0gW107XG4gICAgICAgIGZvciAodmFyIHAgPSBwcm9taXNlOyAhIXA7IHAgPSBwLnNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHAuc3RhY2spIHtcbiAgICAgICAgICAgICAgICBzdGFja3MudW5zaGlmdChwLnN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGFja3MudW5zaGlmdChlcnJvci5zdGFjayk7XG5cbiAgICAgICAgdmFyIGNvbmNhdGVkU3RhY2tzID0gc3RhY2tzLmpvaW4oXCJcXG5cIiArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgXCJcXG5cIik7XG4gICAgICAgIGVycm9yLnN0YWNrID0gZmlsdGVyU3RhY2tTdHJpbmcoY29uY2F0ZWRTdGFja3MpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgZGVzaXJlZExpbmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xuXG4gICAgICAgIGlmICghaXNJbnRlcm5hbEZyYW1lKGxpbmUpICYmICFpc05vZGVGcmFtZShsaW5lKSAmJiBsaW5lKSB7XG4gICAgICAgICAgICBkZXNpcmVkTGluZXMucHVzaChsaW5lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzaXJlZExpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIGlzTm9kZUZyYW1lKHN0YWNrTGluZSkge1xuICAgIHJldHVybiBzdGFja0xpbmUuaW5kZXhPZihcIihtb2R1bGUuanM6XCIpICE9PSAtMSB8fFxuICAgICAgICAgICBzdGFja0xpbmUuaW5kZXhPZihcIihub2RlLmpzOlwiKSAhPT0gLTE7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpIHtcbiAgICAvLyBOYW1lZCBmdW5jdGlvbnM6IFwiYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlcilcIlxuICAgIC8vIEluIElFMTAgZnVuY3Rpb24gbmFtZSBjYW4gaGF2ZSBzcGFjZXMgKFwiQW5vbnltb3VzIGZ1bmN0aW9uXCIpIE9fb1xuICAgIHZhciBhdHRlbXB0MSA9IC9hdCAuKyBcXCgoLispOihcXGQrKTooPzpcXGQrKVxcKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDEpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MVsxXSwgTnVtYmVyKGF0dGVtcHQxWzJdKV07XG4gICAgfVxuXG4gICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uczogXCJhdCBmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlclwiXG4gICAgdmFyIGF0dGVtcHQyID0gL2F0IChbXiBdKyk6KFxcZCspOig/OlxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xuICAgIGlmIChhdHRlbXB0Mikge1xuICAgICAgICByZXR1cm4gW2F0dGVtcHQyWzFdLCBOdW1iZXIoYXR0ZW1wdDJbMl0pXTtcbiAgICB9XG5cbiAgICAvLyBGaXJlZm94IHN0eWxlOiBcImZ1bmN0aW9uQGZpbGVuYW1lOmxpbmVOdW1iZXIgb3IgQGZpbGVuYW1lOmxpbmVOdW1iZXJcIlxuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDMpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0M1sxXSwgTnVtYmVyKGF0dGVtcHQzWzJdKV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xuXG4gICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcbiAgICB2YXIgbGluZU51bWJlciA9IGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcblxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gcUZpbGVOYW1lICYmXG4gICAgICAgIGxpbmVOdW1iZXIgPj0gcVN0YXJ0aW5nTGluZSAmJlxuICAgICAgICBsaW5lTnVtYmVyIDw9IHFFbmRpbmdMaW5lO1xufVxuXG4vLyBkaXNjb3ZlciBvd24gZmlsZSBuYW1lIGFuZCBsaW5lIG51bWJlciByYW5nZSBmb3IgZmlsdGVyaW5nIHN0YWNrXG4vLyB0cmFjZXNcbmZ1bmN0aW9uIGNhcHR1cmVMaW5lKCkge1xuICAgIGlmICghaGFzU3RhY2tzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGUuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIHZhciBmaXJzdExpbmUgPSBsaW5lc1swXS5pbmRleE9mKFwiQFwiKSA+IDAgPyBsaW5lc1sxXSA6IGxpbmVzWzJdO1xuICAgICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XG4gICAgICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBxRmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XG4gICAgICAgIHJldHVybiBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZXByZWNhdGUoY2FsbGJhY2ssIG5hbWUsIGFsdGVybmF0aXZlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS53YXJuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihuYW1lICsgXCIgaXMgZGVwcmVjYXRlZCwgdXNlIFwiICsgYWx0ZXJuYXRpdmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGluc3RlYWQuXCIsIG5ldyBFcnJvcihcIlwiKS5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGNhbGxiYWNrLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbi8vIGVuZCBvZiBzaGltc1xuLy8gYmVnaW5uaW5nIG9mIHJlYWwgd29ya1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLCBwYXNzZXMgcHJvbWlzZXMgdGhyb3VnaCwgb3JcbiAqIGNvZXJjZXMgcHJvbWlzZXMgZnJvbSBkaWZmZXJlbnQgc3lzdGVtcy5cbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlIG9yIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gUSh2YWx1ZSkge1xuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgYWxyZWFkeSBhIFByb21pc2UsIHJldHVybiBpdCBkaXJlY3RseS4gIFRoaXMgZW5hYmxlc1xuICAgIC8vIHRoZSByZXNvbHZlIGZ1bmN0aW9uIHRvIGJvdGggYmUgdXNlZCB0byBjcmVhdGVkIHJlZmVyZW5jZXMgZnJvbSBvYmplY3RzLFxuICAgIC8vIGJ1dCB0byB0b2xlcmFibHkgY29lcmNlIG5vbi1wcm9taXNlcyB0byBwcm9taXNlcy5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBhc3NpbWlsYXRlIHRoZW5hYmxlc1xuICAgIGlmIChpc1Byb21pc2VBbGlrZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvZXJjZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGwodmFsdWUpO1xuICAgIH1cbn1cblEucmVzb2x2ZSA9IFE7XG5cbi8qKlxuICogUGVyZm9ybXMgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm4gb2YgdGhlIGV2ZW50IGxvb3AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0YXNrXG4gKi9cblEubmV4dFRpY2sgPSBuZXh0VGljaztcblxuLyoqXG4gKiBDb250cm9scyB3aGV0aGVyIG9yIG5vdCBsb25nIHN0YWNrIHRyYWNlcyB3aWxsIGJlIG9uXG4gKi9cblEubG9uZ1N0YWNrU3VwcG9ydCA9IGZhbHNlO1xuXG4vLyBlbmFibGUgbG9uZyBzdGFja3MgaWYgUV9ERUJVRyBpcyBzZXRcbmlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiBwcm9jZXNzICYmIHByb2Nlc3MuZW52ICYmIHByb2Nlc3MuZW52LlFfREVCVUcpIHtcbiAgICBRLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdHMgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSBvYmplY3QuXG4gKlxuICogYHJlc29sdmVgIGlzIGEgY2FsbGJhY2sgdG8gaW52b2tlIHdpdGggYSBtb3JlIHJlc29sdmVkIHZhbHVlIGZvciB0aGVcbiAqIHByb21pc2UuIFRvIGZ1bGZpbGwgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhbnkgdmFsdWUgdGhhdCBpc1xuICogbm90IGEgdGhlbmFibGUuIFRvIHJlamVjdCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGEgcmVqZWN0ZWRcbiAqIHRoZW5hYmxlLCBvciBpbnZva2UgYHJlamVjdGAgd2l0aCB0aGUgcmVhc29uIGRpcmVjdGx5LiBUbyByZXNvbHZlIHRoZVxuICogcHJvbWlzZSB0byBhbm90aGVyIHRoZW5hYmxlLCB0aHVzIHB1dHRpbmcgaXQgaW4gdGhlIHNhbWUgc3RhdGUsIGludm9rZVxuICogYHJlc29sdmVgIHdpdGggdGhhdCBvdGhlciB0aGVuYWJsZS5cbiAqL1xuUS5kZWZlciA9IGRlZmVyO1xuZnVuY3Rpb24gZGVmZXIoKSB7XG4gICAgLy8gaWYgXCJtZXNzYWdlc1wiIGlzIGFuIFwiQXJyYXlcIiwgdGhhdCBpbmRpY2F0ZXMgdGhhdCB0aGUgcHJvbWlzZSBoYXMgbm90IHlldFxuICAgIC8vIGJlZW4gcmVzb2x2ZWQuICBJZiBpdCBpcyBcInVuZGVmaW5lZFwiLCBpdCBoYXMgYmVlbiByZXNvbHZlZC4gIEVhY2hcbiAgICAvLyBlbGVtZW50IG9mIHRoZSBtZXNzYWdlcyBhcnJheSBpcyBpdHNlbGYgYW4gYXJyYXkgb2YgY29tcGxldGUgYXJndW1lbnRzIHRvXG4gICAgLy8gZm9yd2FyZCB0byB0aGUgcmVzb2x2ZWQgcHJvbWlzZS4gIFdlIGNvZXJjZSB0aGUgcmVzb2x1dGlvbiB2YWx1ZSB0byBhXG4gICAgLy8gcHJvbWlzZSB1c2luZyB0aGUgYHJlc29sdmVgIGZ1bmN0aW9uIGJlY2F1c2UgaXQgaGFuZGxlcyBib3RoIGZ1bGx5XG4gICAgLy8gbm9uLXRoZW5hYmxlIHZhbHVlcyBhbmQgb3RoZXIgdGhlbmFibGVzIGdyYWNlZnVsbHkuXG4gICAgdmFyIG1lc3NhZ2VzID0gW10sIHByb2dyZXNzTGlzdGVuZXJzID0gW10sIHJlc29sdmVkUHJvbWlzZTtcblxuICAgIHZhciBkZWZlcnJlZCA9IG9iamVjdF9jcmVhdGUoZGVmZXIucHJvdG90eXBlKTtcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIG9wZXJhbmRzKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGFyZ3MpO1xuICAgICAgICAgICAgaWYgKG9wID09PSBcIndoZW5cIiAmJiBvcGVyYW5kc1sxXSkgeyAvLyBwcm9ncmVzcyBvcGVyYW5kXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMucHVzaChvcGVyYW5kc1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlZFByb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KHJlc29sdmVkUHJvbWlzZSwgYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZFxuICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmVhcmVyVmFsdWUgPSBuZWFyZXIocmVzb2x2ZWRQcm9taXNlKTtcbiAgICAgICAgaWYgKGlzUHJvbWlzZShuZWFyZXJWYWx1ZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5lYXJlclZhbHVlOyAvLyBzaG9ydGVuIGNoYWluXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lYXJlclZhbHVlO1xuICAgIH07XG5cbiAgICBwcm9taXNlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghcmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJwZW5kaW5nXCIgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQcm9taXNlLmluc3BlY3QoKTtcbiAgICB9O1xuXG4gICAgaWYgKFEubG9uZ1N0YWNrU3VwcG9ydCAmJiBoYXNTdGFja3MpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOT1RFOiBkb24ndCB0cnkgdG8gdXNlIGBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZWAgb3IgdHJhbnNmZXIgdGhlXG4gICAgICAgICAgICAvLyBhY2Nlc3NvciBhcm91bmQ7IHRoYXQgY2F1c2VzIG1lbW9yeSBsZWFrcyBhcyBwZXIgR0gtMTExLiBKdXN0XG4gICAgICAgICAgICAvLyByZWlmeSB0aGUgc3RhY2sgdHJhY2UgYXMgYSBzdHJpbmcgQVNBUC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBBdCB0aGUgc2FtZSB0aW1lLCBjdXQgb2ZmIHRoZSBmaXJzdCBsaW5lOyBpdCdzIGFsd2F5cyBqdXN0XG4gICAgICAgICAgICAvLyBcIltvYmplY3QgUHJvbWlzZV1cXG5cIiwgYXMgcGVyIHRoZSBgdG9TdHJpbmdgLlxuICAgICAgICAgICAgcHJvbWlzZS5zdGFjayA9IGUuc3RhY2suc3Vic3RyaW5nKGUuc3RhY2suaW5kZXhPZihcIlxcblwiKSArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTk9URTogd2UgZG8gdGhlIGNoZWNrcyBmb3IgYHJlc29sdmVkUHJvbWlzZWAgaW4gZWFjaCBtZXRob2QsIGluc3RlYWQgb2ZcbiAgICAvLyBjb25zb2xpZGF0aW5nIHRoZW0gaW50byBgYmVjb21lYCwgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgY3JlYXRlIG5ld1xuICAgIC8vIHByb21pc2VzIHdpdGggdGhlIGxpbmVzIGBiZWNvbWUod2hhdGV2ZXIodmFsdWUpKWAuIFNlZSBlLmcuIEdILTI1Mi5cblxuICAgIGZ1bmN0aW9uIGJlY29tZShuZXdQcm9taXNlKSB7XG4gICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5ld1Byb21pc2U7XG4gICAgICAgIHByb21pc2Uuc291cmNlID0gbmV3UHJvbWlzZTtcblxuICAgICAgICBhcnJheV9yZWR1Y2UobWVzc2FnZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5ld1Byb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KG5ld1Byb21pc2UsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHZvaWQgMCk7XG5cbiAgICAgICAgbWVzc2FnZXMgPSB2b2lkIDA7XG4gICAgICAgIHByb2dyZXNzTGlzdGVuZXJzID0gdm9pZCAwO1xuICAgIH1cblxuICAgIGRlZmVycmVkLnByb21pc2UgPSBwcm9taXNlO1xuICAgIGRlZmVycmVkLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYmVjb21lKFEodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgZGVmZXJyZWQuZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUoZnVsZmlsbCh2YWx1ZSkpO1xuICAgIH07XG4gICAgZGVmZXJyZWQucmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUocmVqZWN0KHJlYXNvbikpO1xuICAgIH07XG4gICAgZGVmZXJyZWQubm90aWZ5ID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9ncmVzc0xpc3RlbmVycywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvZ3Jlc3NMaXN0ZW5lcikge1xuICAgICAgICAgICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgdm9pZCAwKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBOb2RlLXN0eWxlIGNhbGxiYWNrIHRoYXQgd2lsbCByZXNvbHZlIG9yIHJlamVjdCB0aGUgZGVmZXJyZWRcbiAqIHByb21pc2UuXG4gKiBAcmV0dXJucyBhIG5vZGViYWNrXG4gKi9cbmRlZmVyLnByb3RvdHlwZS5tYWtlTm9kZVJlc29sdmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVycm9yLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbGYucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSByZXNvbHZlciB7RnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG5vdGhpbmcgYW5kIGFjY2VwdHNcbiAqIHRoZSByZXNvbHZlLCByZWplY3QsIGFuZCBub3RpZnkgZnVuY3Rpb25zIGZvciBhIGRlZmVycmVkLlxuICogQHJldHVybnMgYSBwcm9taXNlIHRoYXQgbWF5IGJlIHJlc29sdmVkIHdpdGggdGhlIGdpdmVuIHJlc29sdmUgYW5kIHJlamVjdFxuICogZnVuY3Rpb25zLCBvciByZWplY3RlZCBieSBhIHRocm93biBleGNlcHRpb24gaW4gcmVzb2x2ZXJcbiAqL1xuUS5Qcm9taXNlID0gcHJvbWlzZTsgLy8gRVM2XG5RLnByb21pc2UgPSBwcm9taXNlO1xuZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicmVzb2x2ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XG4gICAgfSBjYXRjaCAocmVhc29uKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn1cblxucHJvbWlzZS5yYWNlID0gcmFjZTsgLy8gRVM2XG5wcm9taXNlLmFsbCA9IGFsbDsgLy8gRVM2XG5wcm9taXNlLnJlamVjdCA9IHJlamVjdDsgLy8gRVM2XG5wcm9taXNlLnJlc29sdmUgPSBROyAvLyBFUzZcblxuLy8gWFhYIGV4cGVyaW1lbnRhbC4gIFRoaXMgbWV0aG9kIGlzIGEgd2F5IHRvIGRlbm90ZSB0aGF0IGEgbG9jYWwgdmFsdWUgaXNcbi8vIHNlcmlhbGl6YWJsZSBhbmQgc2hvdWxkIGJlIGltbWVkaWF0ZWx5IGRpc3BhdGNoZWQgdG8gYSByZW1vdGUgdXBvbiByZXF1ZXN0LFxuLy8gaW5zdGVhZCBvZiBwYXNzaW5nIGEgcmVmZXJlbmNlLlxuUS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIC8vZnJlZXplKG9iamVjdCk7XG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XG4gICAgcmV0dXJuIG9iamVjdDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9mcmVlemUob2JqZWN0KTtcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSWYgdHdvIHByb21pc2VzIGV2ZW50dWFsbHkgZnVsZmlsbCB0byB0aGUgc2FtZSB2YWx1ZSwgcHJvbWlzZXMgdGhhdCB2YWx1ZSxcbiAqIGJ1dCBvdGhlcndpc2UgcmVqZWN0cy5cbiAqIEBwYXJhbSB4IHtBbnkqfVxuICogQHBhcmFtIHkge0FueSp9XG4gKiBAcmV0dXJucyB7QW55Kn0gYSBwcm9taXNlIGZvciB4IGFuZCB5IGlmIHRoZXkgYXJlIHRoZSBzYW1lLCBidXQgYSByZWplY3Rpb25cbiAqIG90aGVyd2lzZS5cbiAqXG4gKi9cblEuam9pbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuIFEoeCkuam9pbih5KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAodGhhdCkge1xuICAgIHJldHVybiBRKFt0aGlzLCB0aGF0XSkuc3ByZWFkKGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBcIj09PVwiIHNob3VsZCBiZSBPYmplY3QuaXMgb3IgZXF1aXZcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgam9pbjogbm90IHRoZSBzYW1lOiBcIiArIHggKyBcIiBcIiArIHkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZmlyc3Qgb2YgYW4gYXJyYXkgb2YgcHJvbWlzZXMgdG8gYmVjb21lIHNldHRsZWQuXG4gKiBAcGFyYW0gYW5zd2VycyB7QXJyYXlbQW55Kl19IHByb21pc2VzIHRvIHJhY2VcbiAqIEByZXR1cm5zIHtBbnkqfSB0aGUgZmlyc3QgcHJvbWlzZSB0byBiZSBzZXR0bGVkXG4gKi9cblEucmFjZSA9IHJhY2U7XG5mdW5jdGlvbiByYWNlKGFuc3dlclBzKSB7XG4gICAgcmV0dXJuIHByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBTd2l0Y2ggdG8gdGhpcyBvbmNlIHdlIGNhbiBhc3N1bWUgYXQgbGVhc3QgRVM1XG4gICAgICAgIC8vIGFuc3dlclBzLmZvckVhY2goZnVuY3Rpb24gKGFuc3dlclApIHtcbiAgICAgICAgLy8gICAgIFEoYW5zd2VyUCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gVXNlIHRoaXMgaW4gdGhlIG1lYW50aW1lXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhbnN3ZXJQcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgUShhbnN3ZXJQc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihRLnJhY2UpO1xufTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgUHJvbWlzZSB3aXRoIGEgcHJvbWlzZSBkZXNjcmlwdG9yIG9iamVjdCBhbmQgb3B0aW9uYWwgZmFsbGJhY2tcbiAqIGZ1bmN0aW9uLiAgVGhlIGRlc2NyaXB0b3IgY29udGFpbnMgbWV0aG9kcyBsaWtlIHdoZW4ocmVqZWN0ZWQpLCBnZXQobmFtZSksXG4gKiBzZXQobmFtZSwgdmFsdWUpLCBwb3N0KG5hbWUsIGFyZ3MpLCBhbmQgZGVsZXRlKG5hbWUpLCB3aGljaCBhbGxcbiAqIHJldHVybiBlaXRoZXIgYSB2YWx1ZSwgYSBwcm9taXNlIGZvciBhIHZhbHVlLCBvciBhIHJlamVjdGlvbi4gIFRoZSBmYWxsYmFja1xuICogYWNjZXB0cyB0aGUgb3BlcmF0aW9uIG5hbWUsIGEgcmVzb2x2ZXIsIGFuZCBhbnkgZnVydGhlciBhcmd1bWVudHMgdGhhdCB3b3VsZFxuICogaGF2ZSBiZWVuIGZvcndhcmRlZCB0byB0aGUgYXBwcm9wcmlhdGUgbWV0aG9kIGFib3ZlIGhhZCBhIG1ldGhvZCBiZWVuXG4gKiBwcm92aWRlZCB3aXRoIHRoZSBwcm9wZXIgbmFtZS4gIFRoZSBBUEkgbWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCB0aGUgbmF0dXJlXG4gKiBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LCBhcGFydCBmcm9tIHRoYXQgaXQgaXMgdXNhYmxlIHdoZXJlZXZlciBwcm9taXNlcyBhcmVcbiAqIGJvdWdodCBhbmQgc29sZC5cbiAqL1xuUS5tYWtlUHJvbWlzZSA9IFByb21pc2U7XG5mdW5jdGlvbiBQcm9taXNlKGRlc2NyaXB0b3IsIGZhbGxiYWNrLCBpbnNwZWN0KSB7XG4gICAgaWYgKGZhbGxiYWNrID09PSB2b2lkIDApIHtcbiAgICAgICAgZmFsbGJhY2sgPSBmdW5jdGlvbiAob3ApIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIFwiUHJvbWlzZSBkb2VzIG5vdCBzdXBwb3J0IG9wZXJhdGlvbjogXCIgKyBvcFxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmIChpbnNwZWN0ID09PSB2b2lkIDApIHtcbiAgICAgICAgaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7c3RhdGU6IFwidW5rbm93blwifTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIGFyZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yW29wXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRlc2NyaXB0b3Jbb3BdLmFwcGx5KHByb21pc2UsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxsYmFjay5jYWxsKHByb21pc2UsIG9wLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzb2x2ZSkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHByb21pc2UuaW5zcGVjdCA9IGluc3BlY3Q7XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZCBgdmFsdWVPZmAgYW5kIGBleGNlcHRpb25gIHN1cHBvcnRcbiAgICBpZiAoaW5zcGVjdCkge1xuICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInJlamVjdGVkXCIpIHtcbiAgICAgICAgICAgIHByb21pc2UuZXhjZXB0aW9uID0gaW5zcGVjdGVkLnJlYXNvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XG4gICAgICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInBlbmRpbmdcIiB8fFxuICAgICAgICAgICAgICAgIGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgZG9uZSA9IGZhbHNlOyAgIC8vIGVuc3VyZSB0aGUgdW50cnVzdGVkIHByb21pc2UgbWFrZXMgYXQgbW9zdCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbCB0byBvbmUgb2YgdGhlIGNhbGxiYWNrc1xuXG4gICAgZnVuY3Rpb24gX2Z1bGZpbGxlZCh2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBmdWxmaWxsZWQgPT09IFwiZnVuY3Rpb25cIiA/IGZ1bGZpbGxlZCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmVqZWN0ZWQoZXhjZXB0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ZWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGV4Y2VwdGlvbiwgc2VsZik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3RlZChleGNlcHRpb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAobmV3RXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXdFeGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcHJvZ3Jlc3NlZCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHByb2dyZXNzZWQgPT09IFwiZnVuY3Rpb25cIiA/IHByb2dyZXNzZWQodmFsdWUpIDogdmFsdWU7XG4gICAgfVxuXG4gICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfZnVsZmlsbGVkKHZhbHVlKSk7XG4gICAgICAgIH0sIFwid2hlblwiLCBbZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfcmVqZWN0ZWQoZXhjZXB0aW9uKSk7XG4gICAgICAgIH1dKTtcbiAgICB9KTtcblxuICAgIC8vIFByb2dyZXNzIHByb3BhZ2F0b3IgbmVlZCB0byBiZSBhdHRhY2hlZCBpbiB0aGUgY3VycmVudCB0aWNrLlxuICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKHZvaWQgMCwgXCJ3aGVuXCIsIFt2b2lkIDAsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICAgIHZhciB0aHJldyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbmV3VmFsdWUgPSBfcHJvZ3Jlc3NlZCh2YWx1ZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRocmV3KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkobmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5RLnRhcCA9IGZ1bmN0aW9uIChwcm9taXNlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRhcChjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFdvcmtzIGFsbW9zdCBsaWtlIFwiZmluYWxseVwiLCBidXQgbm90IGNhbGxlZCBmb3IgcmVqZWN0aW9ucy5cbiAqIE9yaWdpbmFsIHJlc29sdXRpb24gdmFsdWUgaXMgcGFzc2VkIHRocm91Z2ggY2FsbGJhY2sgdW5hZmZlY3RlZC5cbiAqIENhbGxiYWNrIG1heSByZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBiZSBhd2FpdGVkIGZvci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7US5Qcm9taXNlfVxuICogQGV4YW1wbGVcbiAqIGRvU29tZXRoaW5nKClcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGFwKGNvbnNvbGUubG9nKVxuICogICAudGhlbiguLi4pO1xuICovXG5Qcm9taXNlLnByb3RvdHlwZS50YXAgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xuXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKHZhbHVlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBvYnNlcnZlciBvbiBhIHByb21pc2UuXG4gKlxuICogR3VhcmFudGVlczpcbiAqXG4gKiAxLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBiZSBjYWxsZWQgb25seSBvbmNlLlxuICogMi4gdGhhdCBlaXRoZXIgdGhlIGZ1bGZpbGxlZCBjYWxsYmFjayBvciB0aGUgcmVqZWN0ZWQgY2FsbGJhY2sgd2lsbCBiZVxuICogICAgY2FsbGVkLCBidXQgbm90IGJvdGguXG4gKiAzLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBub3QgYmUgY2FsbGVkIGluIHRoaXMgdHVybi5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgICAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgdG8gb2JzZXJ2ZVxuICogQHBhcmFtIGZ1bGZpbGxlZCAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGZ1bGZpbGxlZCB2YWx1ZVxuICogQHBhcmFtIHJlamVjdGVkICAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlamVjdGlvbiBleGNlcHRpb25cbiAqIEBwYXJhbSBwcm9ncmVzc2VkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGludm9rZWQgY2FsbGJhY2tcbiAqL1xuUS53aGVuID0gd2hlbjtcbmZ1bmN0aW9uIHdoZW4odmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUSh2YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9KTtcbn07XG5cblEudGhlblJlc29sdmUgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyB0aHJvdyByZWFzb247IH0pO1xufTtcblxuUS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZWplY3QocmVhc29uKTtcbn07XG5cbi8qKlxuICogSWYgYW4gb2JqZWN0IGlzIG5vdCBhIHByb21pc2UsIGl0IGlzIGFzIFwibmVhclwiIGFzIHBvc3NpYmxlLlxuICogSWYgYSBwcm9taXNlIGlzIHJlamVjdGVkLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZSB0b28uXG4gKiBJZiBpdOKAmXMgYSBmdWxmaWxsZWQgcHJvbWlzZSwgdGhlIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5lYXJlci5cbiAqIElmIGl04oCZcyBhIGRlZmVycmVkIHByb21pc2UgYW5kIHRoZSBkZWZlcnJlZCBoYXMgYmVlbiByZXNvbHZlZCwgdGhlXG4gKiByZXNvbHV0aW9uIGlzIFwibmVhcmVyXCIuXG4gKiBAcGFyYW0gb2JqZWN0XG4gKiBAcmV0dXJucyBtb3N0IHJlc29sdmVkIChuZWFyZXN0KSBmb3JtIG9mIHRoZSBvYmplY3RcbiAqL1xuXG4vLyBYWFggc2hvdWxkIHdlIHJlLWRvIHRoaXM/XG5RLm5lYXJlciA9IG5lYXJlcjtcbmZ1bmN0aW9uIG5lYXJlcih2YWx1ZSkge1xuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSB2YWx1ZS5pbnNwZWN0KCk7XG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnNwZWN0ZWQudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2UuXG4gKiBPdGhlcndpc2UgaXQgaXMgYSBmdWxmaWxsZWQgdmFsdWUuXG4gKi9cblEuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlO1xufVxuXG5RLmlzUHJvbWlzZUFsaWtlID0gaXNQcm9taXNlQWxpa2U7XG5mdW5jdGlvbiBpc1Byb21pc2VBbGlrZShvYmplY3QpIHtcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJiB0eXBlb2Ygb2JqZWN0LnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwZW5kaW5nIHByb21pc2UsIG1lYW5pbmcgbm90XG4gKiBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG4gKi9cblEuaXNQZW5kaW5nID0gaXNQZW5kaW5nO1xuZnVuY3Rpb24gaXNQZW5kaW5nKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHZhbHVlIG9yIGZ1bGZpbGxlZFxuICogcHJvbWlzZS5cbiAqL1xuUS5pc0Z1bGZpbGxlZCA9IGlzRnVsZmlsbGVkO1xuZnVuY3Rpb24gaXNGdWxmaWxsZWQob2JqZWN0KSB7XG4gICAgcmV0dXJuICFpc1Byb21pc2Uob2JqZWN0KSB8fCBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHJlamVjdGVkIHByb21pc2UuXG4gKi9cblEuaXNSZWplY3RlZCA9IGlzUmVqZWN0ZWQ7XG5mdW5jdGlvbiBpc1JlamVjdGVkKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59XG5cblByb21pc2UucHJvdG90eXBlLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59O1xuXG4vLy8vIEJFR0lOIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcblxuLy8gVGhpcyBwcm9taXNlIGxpYnJhcnkgY29uc3VtZXMgZXhjZXB0aW9ucyB0aHJvd24gaW4gaGFuZGxlcnMgc28gdGhleSBjYW4gYmVcbi8vIGhhbmRsZWQgYnkgYSBzdWJzZXF1ZW50IHByb21pc2UuICBUaGUgZXhjZXB0aW9ucyBnZXQgYWRkZWQgdG8gdGhpcyBhcnJheSB3aGVuXG4vLyB0aGV5IGFyZSBjcmVhdGVkLCBhbmQgcmVtb3ZlZCB3aGVuIHRoZXkgYXJlIGhhbmRsZWQuICBOb3RlIHRoYXQgaW4gRVM2IG9yXG4vLyBzaGltbWVkIGVudmlyb25tZW50cywgdGhpcyB3b3VsZCBuYXR1cmFsbHkgYmUgYSBgU2V0YC5cbnZhciB1bmhhbmRsZWRSZWFzb25zID0gW107XG52YXIgdW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XG5cbmZ1bmN0aW9uIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpIHtcbiAgICB1bmhhbmRsZWRSZWFzb25zLmxlbmd0aCA9IDA7XG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5sZW5ndGggPSAwO1xuXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYWNrUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBwcm9jZXNzLmVtaXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChhcnJheV9pbmRleE9mKHVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZW1pdChcInVuaGFuZGxlZFJlamVjdGlvblwiLCByZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgICAgIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnB1c2gocHJvbWlzZSk7XG4gICAgaWYgKHJlYXNvbiAmJiB0eXBlb2YgcmVhc29uLnN0YWNrICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChyZWFzb24uc3RhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChcIihubyBzdGFjaykgXCIgKyByZWFzb24pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdW50cmFja1JlamVjdGlvbihwcm9taXNlKSB7XG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBhdCA9IGFycmF5X2luZGV4T2YodW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgaWYgKGF0ICE9PSAtMSkge1xuICAgICAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHByb2Nlc3MuZW1pdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXRSZXBvcnQgPSBhcnJheV9pbmRleE9mKHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgaWYgKGF0UmVwb3J0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVtaXQoXCJyZWplY3Rpb25IYW5kbGVkXCIsIHVuaGFuZGxlZFJlYXNvbnNbYXRdLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0ZWRVbmhhbmRsZWRSZWplY3Rpb25zLnNwbGljZShhdFJlcG9ydCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXQsIDEpO1xuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnNwbGljZShhdCwgMSk7XG4gICAgfVxufVxuXG5RLnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucyA9IHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucztcblxuUS5nZXRVbmhhbmRsZWRSZWFzb25zID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIE1ha2UgYSBjb3B5IHNvIHRoYXQgY29uc3VtZXJzIGNhbid0IGludGVyZmVyZSB3aXRoIG91ciBpbnRlcm5hbCBzdGF0ZS5cbiAgICByZXR1cm4gdW5oYW5kbGVkUmVhc29ucy5zbGljZSgpO1xufTtcblxuUS5zdG9wVW5oYW5kbGVkUmVqZWN0aW9uVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG4gICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gZmFsc2U7XG59O1xuXG5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcblxuLy8vLyBFTkQgVU5IQU5ETEVEIFJFSkVDVElPTiBUUkFDS0lOR1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSByZWplY3RlZCBwcm9taXNlLlxuICogQHBhcmFtIHJlYXNvbiB2YWx1ZSBkZXNjcmliaW5nIHRoZSBmYWlsdXJlXG4gKi9cblEucmVqZWN0ID0gcmVqZWN0O1xuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgIHZhciByZWplY3Rpb24gPSBQcm9taXNlKHtcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uIChyZWplY3RlZCkge1xuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHRoZSBlcnJvciBoYXMgYmVlbiBoYW5kbGVkXG4gICAgICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICB1bnRyYWNrUmVqZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQocmVhc29uKSA6IHRoaXM7XG4gICAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicmVqZWN0ZWRcIiwgcmVhc29uOiByZWFzb24gfTtcbiAgICB9KTtcblxuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVhc29uIGhhcyBub3QgYmVlbiBoYW5kbGVkLlxuICAgIHRyYWNrUmVqZWN0aW9uKHJlamVjdGlvbiwgcmVhc29uKTtcblxuICAgIHJldHVybiByZWplY3Rpb247XG59XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIGZ1bGZpbGxlZCBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLlxuICogQHBhcmFtIHZhbHVlIGltbWVkaWF0ZSByZWZlcmVuY2VcbiAqL1xuUS5mdWxmaWxsID0gZnVsZmlsbDtcbmZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHtcbiAgICByZXR1cm4gUHJvbWlzZSh7XG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV07XG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0XCI6IGZ1bmN0aW9uIChuYW1lLCByaHMpIHtcbiAgICAgICAgICAgIHZhbHVlW25hbWVdID0gcmhzO1xuICAgICAgICB9LFxuICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdO1xuICAgICAgICB9LFxuICAgICAgICBcInBvc3RcIjogZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgICAgIC8vIE1hcmsgTWlsbGVyIHByb3Bvc2VzIHRoYXQgcG9zdCB3aXRoIG5vIG5hbWUgc2hvdWxkIGFwcGx5IGFcbiAgICAgICAgICAgIC8vIHByb21pc2VkIGZ1bmN0aW9uLlxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHZvaWQgMCwgYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYXBwbHlcIjogZnVuY3Rpb24gKHRoaXNwLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodGhpc3AsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBcImtleXNcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdF9rZXlzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sIHZvaWQgMCwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwiZnVsZmlsbGVkXCIsIHZhbHVlOiB2YWx1ZSB9O1xuICAgIH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRoZW5hYmxlcyB0byBRIHByb21pc2VzLlxuICogQHBhcmFtIHByb21pc2UgdGhlbmFibGUgcHJvbWlzZVxuICogQHJldHVybnMgYSBRIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gY29lcmNlKHByb21pc2UpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufVxuXG4vKipcbiAqIEFubm90YXRlcyBhbiBvYmplY3Qgc3VjaCB0aGF0IGl0IHdpbGwgbmV2ZXIgYmVcbiAqIHRyYW5zZmVycmVkIGF3YXkgZnJvbSB0aGlzIHByb2Nlc3Mgb3ZlciBhbnkgcHJvbWlzZVxuICogY29tbXVuaWNhdGlvbiBjaGFubmVsLlxuICogQHBhcmFtIG9iamVjdFxuICogQHJldHVybnMgcHJvbWlzZSBhIHdyYXBwaW5nIG9mIHRoYXQgb2JqZWN0IHRoYXRcbiAqIGFkZGl0aW9uYWxseSByZXNwb25kcyB0byB0aGUgXCJpc0RlZlwiIG1lc3NhZ2VcbiAqIHdpdGhvdXQgYSByZWplY3Rpb24uXG4gKi9cblEubWFzdGVyID0gbWFzdGVyO1xuZnVuY3Rpb24gbWFzdGVyKG9iamVjdCkge1xuICAgIHJldHVybiBQcm9taXNlKHtcbiAgICAgICAgXCJpc0RlZlwiOiBmdW5jdGlvbiAoKSB7fVxuICAgIH0sIGZ1bmN0aW9uIGZhbGxiYWNrKG9wLCBhcmdzKSB7XG4gICAgICAgIHJldHVybiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKTtcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBRKG9iamVjdCkuaW5zcGVjdCgpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFNwcmVhZHMgdGhlIHZhbHVlcyBvZiBhIHByb21pc2VkIGFycmF5IG9mIGFyZ3VtZW50cyBpbnRvIHRoZVxuICogZnVsZmlsbG1lbnQgY2FsbGJhY2suXG4gKiBAcGFyYW0gZnVsZmlsbGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdmFyaWFkaWMgYXJndW1lbnRzIGZyb20gdGhlXG4gKiBwcm9taXNlZCBhcnJheVxuICogQHBhcmFtIHJlamVjdGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdGhlIGV4Y2VwdGlvbiBpZiB0aGUgcHJvbWlzZVxuICogaXMgcmVqZWN0ZWQuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb3IgdGhyb3duIGV4Y2VwdGlvbiBvZlxuICogZWl0aGVyIGNhbGxiYWNrLlxuICovXG5RLnNwcmVhZCA9IHNwcmVhZDtcbmZ1bmN0aW9uIHNwcmVhZCh2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKHZhbHVlKS5zcHJlYWQoZnVsZmlsbGVkLCByZWplY3RlZCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMuYWxsKCkudGhlbihmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KTtcbiAgICB9LCByZWplY3RlZCk7XG59O1xuXG4vKipcbiAqIFRoZSBhc3luYyBmdW5jdGlvbiBpcyBhIGRlY29yYXRvciBmb3IgZ2VuZXJhdG9yIGZ1bmN0aW9ucywgdHVybmluZ1xuICogdGhlbSBpbnRvIGFzeW5jaHJvbm91cyBnZW5lcmF0b3JzLiAgQWx0aG91Z2ggZ2VuZXJhdG9ycyBhcmUgb25seSBwYXJ0XG4gKiBvZiB0aGUgbmV3ZXN0IEVDTUFTY3JpcHQgNiBkcmFmdHMsIHRoaXMgY29kZSBkb2VzIG5vdCBjYXVzZSBzeW50YXhcbiAqIGVycm9ycyBpbiBvbGRlciBlbmdpbmVzLiAgVGhpcyBjb2RlIHNob3VsZCBjb250aW51ZSB0byB3b3JrIGFuZCB3aWxsXG4gKiBpbiBmYWN0IGltcHJvdmUgb3ZlciB0aW1lIGFzIHRoZSBsYW5ndWFnZSBpbXByb3Zlcy5cbiAqXG4gKiBFUzYgZ2VuZXJhdG9ycyBhcmUgY3VycmVudGx5IHBhcnQgb2YgVjggdmVyc2lvbiAzLjE5IHdpdGggdGhlXG4gKiAtLWhhcm1vbnktZ2VuZXJhdG9ycyBydW50aW1lIGZsYWcgZW5hYmxlZC4gIFNwaWRlck1vbmtleSBoYXMgaGFkIHRoZW1cbiAqIGZvciBsb25nZXIsIGJ1dCB1bmRlciBhbiBvbGRlciBQeXRob24taW5zcGlyZWQgZm9ybS4gIFRoaXMgZnVuY3Rpb25cbiAqIHdvcmtzIG9uIGJvdGgga2luZHMgb2YgZ2VuZXJhdG9ycy5cbiAqXG4gKiBEZWNvcmF0ZXMgYSBnZW5lcmF0b3IgZnVuY3Rpb24gc3VjaCB0aGF0OlxuICogIC0gaXQgbWF5IHlpZWxkIHByb21pc2VzXG4gKiAgLSBleGVjdXRpb24gd2lsbCBjb250aW51ZSB3aGVuIHRoYXQgcHJvbWlzZSBpcyBmdWxmaWxsZWRcbiAqICAtIHRoZSB2YWx1ZSBvZiB0aGUgeWllbGQgZXhwcmVzc2lvbiB3aWxsIGJlIHRoZSBmdWxmaWxsZWQgdmFsdWVcbiAqICAtIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlICh3aGVuIHRoZSBnZW5lcmF0b3JcbiAqICAgIHN0b3BzIGl0ZXJhdGluZylcbiAqICAtIHRoZSBkZWNvcmF0ZWQgZnVuY3Rpb24gcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqICAgIG9mIHRoZSBnZW5lcmF0b3Igb3IgdGhlIGZpcnN0IHJlamVjdGVkIHByb21pc2UgYW1vbmcgdGhvc2VcbiAqICAgIHlpZWxkZWQuXG4gKiAgLSBpZiBhbiBlcnJvciBpcyB0aHJvd24gaW4gdGhlIGdlbmVyYXRvciwgaXQgcHJvcGFnYXRlcyB0aHJvdWdoXG4gKiAgICBldmVyeSBmb2xsb3dpbmcgeWllbGQgdW50aWwgaXQgaXMgY2F1Z2h0LCBvciB1bnRpbCBpdCBlc2NhcGVzXG4gKiAgICB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uIGFsdG9nZXRoZXIsIGFuZCBpcyB0cmFuc2xhdGVkIGludG8gYVxuICogICAgcmVqZWN0aW9uIGZvciB0aGUgcHJvbWlzZSByZXR1cm5lZCBieSB0aGUgZGVjb3JhdGVkIGdlbmVyYXRvci5cbiAqL1xuUS5hc3luYyA9IGFzeW5jO1xuZnVuY3Rpb24gYXN5bmMobWFrZUdlbmVyYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInNlbmRcIiwgYXJnIGlzIGEgdmFsdWVcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwidGhyb3dcIiwgYXJnIGlzIGFuIGV4Y2VwdGlvblxuICAgICAgICBmdW5jdGlvbiBjb250aW51ZXIodmVyYiwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICAgICAgICAvLyBVbnRpbCBWOCAzLjE5IC8gQ2hyb21pdW0gMjkgaXMgcmVsZWFzZWQsIFNwaWRlck1vbmtleSBpcyB0aGUgb25seVxuICAgICAgICAgICAgLy8gZW5naW5lIHRoYXQgaGFzIGEgZGVwbG95ZWQgYmFzZSBvZiBicm93c2VycyB0aGF0IHN1cHBvcnQgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIFNNJ3MgZ2VuZXJhdG9ycyB1c2UgdGhlIFB5dGhvbi1pbnNwaXJlZCBzZW1hbnRpY3Mgb2ZcbiAgICAgICAgICAgIC8vIG91dGRhdGVkIEVTNiBkcmFmdHMuICBXZSB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgRVM2LCBidXQgd2UnZCBhbHNvXG4gICAgICAgICAgICAvLyBsaWtlIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gdXNlIGdlbmVyYXRvcnMgaW4gZGVwbG95ZWQgYnJvd3NlcnMsIHNvXG4gICAgICAgICAgICAvLyB3ZSBhbHNvIHN1cHBvcnQgUHl0aG9uLXN0eWxlIGdlbmVyYXRvcnMuICBBdCBzb21lIHBvaW50IHdlIGNhbiByZW1vdmVcbiAgICAgICAgICAgIC8vIHRoaXMgYmxvY2suXG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgU3RvcEl0ZXJhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIC8vIEVTNiBHZW5lcmF0b3JzXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBRKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LnZhbHVlLCBjYWxsYmFjaywgZXJyYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJNb25rZXkgR2VuZXJhdG9yc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBSZW1vdmUgdGhpcyBjYXNlIHdoZW4gU00gZG9lcyBFUzYgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShleGNlcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdCwgY2FsbGJhY2ssIGVycmJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBtYWtlR2VuZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJuZXh0XCIpO1xuICAgICAgICB2YXIgZXJyYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJ0aHJvd1wiKTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc3Bhd24gZnVuY3Rpb24gaXMgYSBzbWFsbCB3cmFwcGVyIGFyb3VuZCBhc3luYyB0aGF0IGltbWVkaWF0ZWx5XG4gKiBjYWxscyB0aGUgZ2VuZXJhdG9yIGFuZCBhbHNvIGVuZHMgdGhlIHByb21pc2UgY2hhaW4sIHNvIHRoYXQgYW55XG4gKiB1bmhhbmRsZWQgZXJyb3JzIGFyZSB0aHJvd24gaW5zdGVhZCBvZiBmb3J3YXJkZWQgdG8gdGhlIGVycm9yXG4gKiBoYW5kbGVyLiBUaGlzIGlzIHVzZWZ1bCBiZWNhdXNlIGl0J3MgZXh0cmVtZWx5IGNvbW1vbiB0byBydW5cbiAqIGdlbmVyYXRvcnMgYXQgdGhlIHRvcC1sZXZlbCB0byB3b3JrIHdpdGggbGlicmFyaWVzLlxuICovXG5RLnNwYXduID0gc3Bhd247XG5mdW5jdGlvbiBzcGF3bihtYWtlR2VuZXJhdG9yKSB7XG4gICAgUS5kb25lKFEuYXN5bmMobWFrZUdlbmVyYXRvcikoKSk7XG59XG5cbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBpbnRlcmZhY2Ugb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuLyoqXG4gKiBUaHJvd3MgYSBSZXR1cm5WYWx1ZSBleGNlcHRpb24gdG8gc3RvcCBhbiBhc3luY2hyb25vdXMgZ2VuZXJhdG9yLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIGEgc3RvcC1nYXAgbWVhc3VyZSB0byBzdXBwb3J0IGdlbmVyYXRvciByZXR1cm5cbiAqIHZhbHVlcyBpbiBvbGRlciBGaXJlZm94L1NwaWRlck1vbmtleS4gIEluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBFUzZcbiAqIGdlbmVyYXRvcnMgbGlrZSBDaHJvbWl1bSAyOSwganVzdCB1c2UgXCJyZXR1cm5cIiBpbiB5b3VyIGdlbmVyYXRvclxuICogZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgcmV0dXJuIHZhbHVlIGZvciB0aGUgc3Vycm91bmRpbmcgZ2VuZXJhdG9yXG4gKiBAdGhyb3dzIFJldHVyblZhbHVlIGV4Y2VwdGlvbiB3aXRoIHRoZSB2YWx1ZS5cbiAqIEBleGFtcGxlXG4gKiAvLyBFUzYgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24qICgpIHtcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcbiAqICAgICAgcmV0dXJuIGZvbyArIGJhcjtcbiAqIH0pXG4gKiAvLyBPbGRlciBTcGlkZXJNb25rZXkgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24gKCkge1xuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xuICogICAgICBRLnJldHVybihmb28gKyBiYXIpO1xuICogfSlcbiAqL1xuUVtcInJldHVyblwiXSA9IF9yZXR1cm47XG5mdW5jdGlvbiBfcmV0dXJuKHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IFFSZXR1cm5WYWx1ZSh2YWx1ZSk7XG59XG5cbi8qKlxuICogVGhlIHByb21pc2VkIGZ1bmN0aW9uIGRlY29yYXRvciBlbnN1cmVzIHRoYXQgYW55IHByb21pc2UgYXJndW1lbnRzXG4gKiBhcmUgc2V0dGxlZCBhbmQgcGFzc2VkIGFzIHZhbHVlcyAoYHRoaXNgIGlzIGFsc28gc2V0dGxlZCBhbmQgcGFzc2VkXG4gKiBhcyBhIHZhbHVlKS4gIEl0IHdpbGwgYWxzbyBlbnN1cmUgdGhhdCB0aGUgcmVzdWx0IG9mIGEgZnVuY3Rpb24gaXNcbiAqIGFsd2F5cyBhIHByb21pc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhZGQgPSBRLnByb21pc2VkKGZ1bmN0aW9uIChhLCBiKSB7XG4gKiAgICAgcmV0dXJuIGEgKyBiO1xuICogfSk7XG4gKiBhZGQoUShhKSwgUShCKSk7XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGRlY29yYXRlXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBoYXMgYmVlbiBkZWNvcmF0ZWQuXG4gKi9cblEucHJvbWlzZWQgPSBwcm9taXNlZDtcbmZ1bmN0aW9uIHByb21pc2VkKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNwcmVhZChbdGhpcywgYWxsKGFyZ3VtZW50cyldLCBmdW5jdGlvbiAoc2VsZiwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG4vKipcbiAqIHNlbmRzIGEgbWVzc2FnZSB0byBhIHZhbHVlIGluIGEgZnV0dXJlIHR1cm5cbiAqIEBwYXJhbSBvYmplY3QqIHRoZSByZWNpcGllbnRcbiAqIEBwYXJhbSBvcCB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSBvcGVyYXRpb24sIGUuZy4sIFwid2hlblwiLFxuICogQHBhcmFtIGFyZ3MgZnVydGhlciBhcmd1bWVudHMgdG8gYmUgZm9yd2FyZGVkIHRvIHRoZSBvcGVyYXRpb25cbiAqIEByZXR1cm5zIHJlc3VsdCB7UHJvbWlzZX0gYSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb25cbiAqL1xuUS5kaXNwYXRjaCA9IGRpc3BhdGNoO1xuZnVuY3Rpb24gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2gob3AsIGFyZ3MpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChvcCwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChkZWZlcnJlZC5yZXNvbHZlLCBvcCwgYXJncyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZ2V0XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICovXG5RLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIG9iamVjdCBvYmplY3RcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSAgICAgbmV3IHZhbHVlIG9mIHByb3BlcnR5XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuLyoqXG4gKiBEZWxldGVzIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZGVsZXRlXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5kZWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kZWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG4vKipcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxuICogQHBhcmFtIHZhbHVlICAgICBhIHZhbHVlIHRvIHBvc3QsIHR5cGljYWxseSBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgICBpbnZvY2F0aW9uIGFyZ3VtZW50cyBmb3IgcHJvbWlzZXMgdGhhdFxuICogICAgICAgICAgICAgICAgICBhcmUgdWx0aW1hdGVseSBiYWNrZWQgd2l0aCBgcmVzb2x2ZWAgdmFsdWVzLFxuICogICAgICAgICAgICAgICAgICBhcyBvcHBvc2VkIHRvIHRob3NlIGJhY2tlZCB3aXRoIFVSTHNcbiAqICAgICAgICAgICAgICAgICAgd2hlcmVpbiB0aGUgcG9zdGVkIHZhbHVlIGNhbiBiZSBhbnlcbiAqICAgICAgICAgICAgICAgICAgSlNPTiBzZXJpYWxpemFibGUgb2JqZWN0LlxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKi9cbi8vIGJvdW5kIGxvY2FsbHkgYmVjYXVzZSBpdCBpcyB1c2VkIGJ5IG90aGVyIG1ldGhvZHNcblEubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblEucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgaW52b2NhdGlvbiBhcmd1bWVudHNcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxuICovXG5RLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxuUS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXG5Qcm9taXNlLnByb3RvdHlwZS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5Qcm9taXNlLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbiAobmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIGFyZ3MgICAgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUS5mYXBwbHkgPSBmdW5jdGlvbiAob2JqZWN0LCBhcmdzKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XG59O1xuXG4vKipcbiAqIENhbGxzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUVtcInRyeVwiXSA9XG5RLmZjYWxsID0gZnVuY3Rpb24gKG9iamVjdCAvKiAuLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cyldKTtcbn07XG5cbi8qKlxuICogQmluZHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uLCB0cmFuc2Zvcm1pbmcgcmV0dXJuIHZhbHVlcyBpbnRvIGEgZnVsZmlsbGVkXG4gKiBwcm9taXNlIGFuZCB0aHJvd24gZXJyb3JzIGludG8gYSByZWplY3RlZCBvbmUuXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xuICovXG5RLmZiaW5kID0gZnVuY3Rpb24gKG9iamVjdCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBwcm9taXNlID0gUShvYmplY3QpO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblByb21pc2UucHJvdG90eXBlLmZiaW5kID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBSZXF1ZXN0cyB0aGUgbmFtZXMgb2YgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYSBwcm9taXNlZFxuICogb2JqZWN0IGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUga2V5cyBvZiB0aGUgZXZlbnR1YWxseSBzZXR0bGVkIG9iamVjdFxuICovXG5RLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuLyoqXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkuICBJZiBhbnkgb2ZcbiAqIHRoZSBwcm9taXNlcyBnZXRzIHJlamVjdGVkLCB0aGUgd2hvbGUgYXJyYXkgaXMgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXG4gKiBAcGFyYW0ge0FycmF5Kn0gYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAqL1xuLy8gQnkgTWFyayBNaWxsZXJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmNvbmN1cnJlbmN5JnJldj0xMzA4Nzc2NTIxI2FsbGZ1bGZpbGxlZFxuUS5hbGwgPSBhbGw7XG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgICAgIHZhciBwZW5kaW5nQ291bnQgPSAwO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb21pc2UsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc25hcHNob3Q7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgaXNQcm9taXNlKHByb21pc2UpICYmXG4gICAgICAgICAgICAgICAgKHNuYXBzaG90ID0gcHJvbWlzZS5pbnNwZWN0KCkpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSBzbmFwc2hvdC52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKytwZW5kaW5nQ291bnQ7XG4gICAgICAgICAgICAgICAgd2hlbihcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLXBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KHsgaW5kZXg6IGluZGV4LCB2YWx1ZTogcHJvZ3Jlc3MgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICBpZiAocGVuZGluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2Ugb2YgYW4gYXJyYXkuIFByaW9yIHJlamVjdGVkIHByb21pc2VzIGFyZVxuICogaWdub3JlZC4gIFJlamVjdHMgb25seSBpZiBhbGwgcHJvbWlzZXMgYXJlIHJlamVjdGVkLlxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IGNvbnRhaW5pbmcgdmFsdWVzIG9yIHByb21pc2VzIGZvciB2YWx1ZXNcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2UsXG4gKiBvciBhIHJlamVjdGVkIHByb21pc2UgaWYgYWxsIHByb21pc2VzIGFyZSByZWplY3RlZC5cbiAqL1xuUS5hbnkgPSBhbnk7XG5cbmZ1bmN0aW9uIGFueShwcm9taXNlcykge1xuICAgIGlmIChwcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcbiAgICB2YXIgcGVuZGluZ0NvdW50ID0gMDtcbiAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uIChwcmV2LCBjdXJyZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VzW2luZGV4XTtcblxuICAgICAgICBwZW5kaW5nQ291bnQrKztcblxuICAgICAgICB3aGVuKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBvblByb2dyZXNzKTtcbiAgICAgICAgZnVuY3Rpb24gb25GdWxmaWxsZWQocmVzdWx0KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gb25SZWplY3RlZCgpIHtcbiAgICAgICAgICAgIHBlbmRpbmdDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuJ3QgZ2V0IGZ1bGZpbGxtZW50IHZhbHVlIGZyb20gYW55IHByb21pc2UsIGFsbCBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwicHJvbWlzZXMgd2VyZSByZWplY3RlZC5cIlxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG9uUHJvZ3Jlc3MocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7XG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9ncmVzc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59XG5cblByb21pc2UucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYW55KHRoaXMpO1xufTtcblxuLyoqXG4gKiBXYWl0cyBmb3IgYWxsIHByb21pc2VzIHRvIGJlIHNldHRsZWQsIGVpdGhlciBmdWxmaWxsZWQgb3JcbiAqIHJlamVjdGVkLiAgVGhpcyBpcyBkaXN0aW5jdCBmcm9tIGBhbGxgIHNpbmNlIHRoYXQgd291bGQgc3RvcFxuICogd2FpdGluZyBhdCB0aGUgZmlyc3QgcmVqZWN0aW9uLiAgVGhlIHByb21pc2UgcmV0dXJuZWQgYnlcbiAqIGBhbGxSZXNvbHZlZGAgd2lsbCBuZXZlciBiZSByZWplY3RlZC5cbiAqIEBwYXJhbSBwcm9taXNlcyBhIHByb21pc2UgZm9yIGFuIGFycmF5IChvciBhbiBhcnJheSkgb2YgcHJvbWlzZXNcbiAqIChvciB2YWx1ZXMpXG4gKiBAcmV0dXJuIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgcHJvbWlzZXNcbiAqL1xuUS5hbGxSZXNvbHZlZCA9IGRlcHJlY2F0ZShhbGxSZXNvbHZlZCwgXCJhbGxSZXNvbHZlZFwiLCBcImFsbFNldHRsZWRcIik7XG5mdW5jdGlvbiBhbGxSZXNvbHZlZChwcm9taXNlcykge1xuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcHJvbWlzZXMgPSBhcnJheV9tYXAocHJvbWlzZXMsIFEpO1xuICAgICAgICByZXR1cm4gd2hlbihhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHdoZW4ocHJvbWlzZSwgbm9vcCwgbm9vcCk7XG4gICAgICAgIH0pKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VzO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFsbFJlc29sdmVkKHRoaXMpO1xufTtcblxuLyoqXG4gKiBAc2VlIFByb21pc2UjYWxsU2V0dGxlZFxuICovXG5RLmFsbFNldHRsZWQgPSBhbGxTZXR0bGVkO1xuZnVuY3Rpb24gYWxsU2V0dGxlZChwcm9taXNlcykge1xuICAgIHJldHVybiBRKHByb21pc2VzKS5hbGxTZXR0bGVkKCk7XG59XG5cbi8qKlxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZWlyIHN0YXRlcyAoYXNcbiAqIHJldHVybmVkIGJ5IGBpbnNwZWN0YCkgd2hlbiB0aGV5IGhhdmUgYWxsIHNldHRsZWQuXG4gKiBAcGFyYW0ge0FycmF5W0FueSpdfSB2YWx1ZXMgYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMge0FycmF5W1N0YXRlXX0gYW4gYXJyYXkgb2Ygc3RhdGVzIGZvciB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMuXG4gKi9cblByb21pc2UucHJvdG90eXBlLmFsbFNldHRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcmV0dXJuIGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgICAgICBwcm9taXNlID0gUShwcm9taXNlKTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2FyZGxlc3MoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuaW5zcGVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihyZWdhcmRsZXNzLCByZWdhcmRsZXNzKTtcbiAgICAgICAgfSkpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDYXB0dXJlcyB0aGUgZmFpbHVyZSBvZiBhIHByb21pc2UsIGdpdmluZyBhbiBvcG9ydHVuaXR5IHRvIHJlY292ZXJcbiAqIHdpdGggYSBjYWxsYmFjay4gIElmIHRoZSBnaXZlbiBwcm9taXNlIGlzIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gKiBwcm9taXNlIGlzIGZ1bGZpbGxlZC5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBmdWxmaWxsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlmIHRoZVxuICogZ2l2ZW4gcHJvbWlzZSBpcyByZWplY3RlZFxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBjYWxsYmFja1xuICovXG5RLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cbi8qKlxuICogQXR0YWNoZXMgYSBsaXN0ZW5lciB0aGF0IGNhbiByZXNwb25kIHRvIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgZnJvbSBhXG4gKiBwcm9taXNlJ3Mgb3JpZ2luYXRpbmcgZGVmZXJyZWQuIFRoaXMgbGlzdGVuZXIgcmVjZWl2ZXMgdGhlIGV4YWN0IGFyZ3VtZW50c1xuICogcGFzc2VkIHRvIGBgZGVmZXJyZWQubm90aWZ5YGAuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gcmVjZWl2ZSBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybnMgdGhlIGdpdmVuIHByb21pc2UsIHVuY2hhbmdlZFxuICovXG5RLnByb2dyZXNzID0gcHJvZ3Jlc3M7XG5mdW5jdGlvbiBwcm9ncmVzcyhvYmplY3QsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uIChwcm9ncmVzc2VkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGFuIG9wcG9ydHVuaXR5IHRvIG9ic2VydmUgdGhlIHNldHRsaW5nIG9mIGEgcHJvbWlzZSxcbiAqIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgcHJvbWlzZSBpcyBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuICBGb3J3YXJkc1xuICogdGhlIHJlc29sdXRpb24gdG8gdGhlIHJldHVybmVkIHByb21pc2Ugd2hlbiB0aGUgY2FsbGJhY2sgaXMgZG9uZS5cbiAqIFRoZSBjYWxsYmFjayBjYW4gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBjb21wbGV0aW9uLlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBvYnNlcnZlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlblxuICogcHJvbWlzZSwgdGFrZXMgbm8gYXJndW1lbnRzLlxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSB3aGVuXG4gKiBgYGZpbmBgIGlzIGRvbmUuXG4gKi9cblEuZmluID0gLy8gWFhYIGxlZ2FjeVxuUVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKG9iamVjdClbXCJmaW5hbGx5XCJdKGNhbGxiYWNrKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZpbiA9IC8vIFhYWCBsZWdhY3lcblByb21pc2UucHJvdG90eXBlW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gUShjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVE9ETyBhdHRlbXB0IHRvIHJlY3ljbGUgdGhlIHJlamVjdGlvbiB3aXRoIFwidGhpc1wiLlxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IHJlYXNvbjtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFRlcm1pbmF0ZXMgYSBjaGFpbiBvZiBwcm9taXNlcywgZm9yY2luZyByZWplY3Rpb25zIHRvIGJlXG4gKiB0aHJvd24gYXMgZXhjZXB0aW9ucy5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBhdCB0aGUgZW5kIG9mIGEgY2hhaW4gb2YgcHJvbWlzZXNcbiAqIEByZXR1cm5zIG5vdGhpbmdcbiAqL1xuUS5kb25lID0gZnVuY3Rpb24gKG9iamVjdCwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRvbmUoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xuICAgIHZhciBvblVuaGFuZGxlZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIC8vIGZvcndhcmQgdG8gYSBmdXR1cmUgdHVybiBzbyB0aGF0IGBgd2hlbmBgXG4gICAgICAgIC8vIGRvZXMgbm90IGNhdGNoIGl0IGFuZCB0dXJuIGl0IGludG8gYSByZWplY3Rpb24uXG4gICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IGBuZXh0VGlja2BpbmcgdmlhIGFuIHVubmVjZXNzYXJ5IGB3aGVuYC5cbiAgICB2YXIgcHJvbWlzZSA9IGZ1bGZpbGxlZCB8fCByZWplY3RlZCB8fCBwcm9ncmVzcyA/XG4gICAgICAgIHRoaXMudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykgOlxuICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy5kb21haW4pIHtcbiAgICAgICAgb25VbmhhbmRsZWRFcnJvciA9IHByb2Nlc3MuZG9tYWluLmJpbmQob25VbmhhbmRsZWRFcnJvcik7XG4gICAgfVxuXG4gICAgcHJvbWlzZS50aGVuKHZvaWQgMCwgb25VbmhhbmRsZWRFcnJvcik7XG59O1xuXG4vKipcbiAqIENhdXNlcyBhIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgaWYgaXQgZG9lcyBub3QgZ2V0IGZ1bGZpbGxlZCBiZWZvcmVcbiAqIHNvbWUgbWlsbGlzZWNvbmRzIHRpbWUgb3V0LlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzIHRpbWVvdXRcbiAqIEBwYXJhbSB7QW55Kn0gY3VzdG9tIGVycm9yIG1lc3NhZ2Ugb3IgRXJyb3Igb2JqZWN0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgaWYgaXQgaXNcbiAqIGZ1bGZpbGxlZCBiZWZvcmUgdGhlIHRpbWVvdXQsIG90aGVyd2lzZSByZWplY3RlZC5cbiAqL1xuUS50aW1lb3V0ID0gZnVuY3Rpb24gKG9iamVjdCwgbXMsIGVycm9yKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS50aW1lb3V0KG1zLCBlcnJvcik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBlcnJvcikge1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdmFyIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWVycm9yIHx8IFwic3RyaW5nXCIgPT09IHR5cGVvZiBlcnJvcikge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3IgfHwgXCJUaW1lZCBvdXQgYWZ0ZXIgXCIgKyBtcyArIFwiIG1zXCIpO1xuICAgICAgICAgICAgZXJyb3IuY29kZSA9IFwiRVRJTUVET1VUXCI7XG4gICAgICAgIH1cbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICB9LCBtcyk7XG5cbiAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9LCBkZWZlcnJlZC5ub3RpZnkpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZ2l2ZW4gdmFsdWUgKG9yIHByb21pc2VkIHZhbHVlKSwgc29tZVxuICogbWlsbGlzZWNvbmRzIGFmdGVyIGl0IHJlc29sdmVkLiBQYXNzZXMgcmVqZWN0aW9ucyBpbW1lZGlhdGVseS5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kc1xuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBhZnRlciBtaWxsaXNlY29uZHNcbiAqIHRpbWUgaGFzIGVsYXBzZWQgc2luY2UgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UuXG4gKiBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSByZWplY3RzLCB0aGF0IGlzIHBhc3NlZCBpbW1lZGlhdGVseS5cbiAqL1xuUS5kZWxheSA9IGZ1bmN0aW9uIChvYmplY3QsIHRpbWVvdXQpIHtcbiAgICBpZiAodGltZW91dCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBvYmplY3Q7XG4gICAgICAgIG9iamVjdCA9IHZvaWQgMDtcbiAgICB9XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kZWxheSh0aW1lb3V0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxuICogYXJndW1lbnRzIHByb3ZpZGVkIGFzIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKlxuICogICAgICBRLm5mYXBwbHkoRlMucmVhZEZpbGUsIFtfX2ZpbGVuYW1lXSlcbiAqICAgICAgLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAqICAgICAgfSlcbiAqXG4gKi9cblEubmZhcHBseSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYXJncykge1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgaW5kaXZpZHVhbGx5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmNhbGwoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpXG4gKiAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xuICogfSlcbiAqXG4gKi9cblEubmZjYWxsID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBXcmFwcyBhIE5vZGVKUyBjb250aW51YXRpb24gcGFzc2luZyBmdW5jdGlvbiBhbmQgcmV0dXJucyBhbiBlcXVpdmFsZW50XG4gKiB2ZXJzaW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmJpbmQoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpKFwidXRmLThcIilcbiAqIC50aGVuKGNvbnNvbGUubG9nKVxuICogLmRvbmUoKVxuICovXG5RLm5mYmluZCA9XG5RLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIFEoY2FsbGJhY2spLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZiaW5kID1cblByb21pc2UucHJvdG90eXBlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIFEuZGVub2RlaWZ5LmFwcGx5KHZvaWQgMCwgYXJncyk7XG59O1xuXG5RLm5iaW5kID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHRoaXNwLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIFEoYm91bmQpLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmJpbmQgPSBmdW5jdGlvbiAoLyp0aGlzcCwgLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDApO1xuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gUS5uYmluZC5hcHBseSh2b2lkIDAsIGFyZ3MpO1xufTtcblxuLyoqXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcbiAqIGNhbGxiYWNrIHdpdGggYSBnaXZlbiBhcnJheSBvZiBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZCBjYWxsYmFjay5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrXG4gKiB3aWxsIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXG4gKi9cblEubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLm5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkubnBvc3QobmFtZSwgYXJncyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5ubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLm5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzIHx8IFtdKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxuICogY2FsbGJhY2ssIGZvcndhcmRpbmcgdGhlIGdpdmVuIHZhcmlhZGljIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkXG4gKiBjYWxsYmFjayBhcmd1bWVudC5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSAuLi5hcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFjayB3aWxsXG4gKiBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxuICovXG5RLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcblEubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxuUS5uaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXG5Qcm9taXNlLnByb3RvdHlwZS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXG5Qcm9taXNlLnByb3RvdHlwZS5uaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogSWYgYSBmdW5jdGlvbiB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgYm90aCBOb2RlIGNvbnRpbnVhdGlvbi1wYXNzaW5nLXN0eWxlIGFuZFxuICogcHJvbWlzZS1yZXR1cm5pbmctc3R5bGUsIGl0IGNhbiBlbmQgaXRzIGludGVybmFsIHByb21pc2UgY2hhaW4gd2l0aFxuICogYG5vZGVpZnkobm9kZWJhY2spYCwgZm9yd2FyZGluZyB0aGUgb3B0aW9uYWwgbm9kZWJhY2sgYXJndW1lbnQuICBJZiB0aGUgdXNlclxuICogZWxlY3RzIHRvIHVzZSBhIG5vZGViYWNrLCB0aGUgcmVzdWx0IHdpbGwgYmUgc2VudCB0aGVyZS4gIElmIHRoZXkgZG8gbm90XG4gKiBwYXNzIGEgbm9kZWJhY2ssIHRoZXkgd2lsbCByZWNlaXZlIHRoZSByZXN1bHQgcHJvbWlzZS5cbiAqIEBwYXJhbSBvYmplY3QgYSByZXN1bHQgKG9yIGEgcHJvbWlzZSBmb3IgYSByZXN1bHQpXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub2RlYmFjayBhIE5vZGUuanMtc3R5bGUgY2FsbGJhY2tcbiAqIEByZXR1cm5zIGVpdGhlciB0aGUgcHJvbWlzZSBvciBub3RoaW5nXG4gKi9cblEubm9kZWlmeSA9IG5vZGVpZnk7XG5mdW5jdGlvbiBub2RlaWZ5KG9iamVjdCwgbm9kZWJhY2spIHtcbiAgICByZXR1cm4gUShvYmplY3QpLm5vZGVpZnkobm9kZWJhY2spO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrKSB7XG4gICAgaWYgKG5vZGViYWNrKSB7XG4gICAgICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJRLm5vQ29uZmxpY3Qgb25seSB3b3JrcyB3aGVuIFEgaXMgdXNlZCBhcyBhIGdsb2JhbFwiKTtcbn07XG5cbi8vIEFsbCBjb2RlIGJlZm9yZSB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMuXG52YXIgcUVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xuXG5yZXR1cm4gUTtcblxufSk7XG4iLCIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuXG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgY29uZi5tYXhMaXN0ZW5lcnMgJiYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyk7XG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVycywgbGlzdGVuZXJdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQXJyYXkodHJlZS5fbGlzdGVuZXJzKSkge1xuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMud2FybmVkKSB7XG5cbiAgICAgICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG0gPiAwICYmIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiBtKSB7XG5cbiAgICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgpO1xuICAgICAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XG4gICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICB0aGlzLm1hbnkoZXZlbnQsIDEsIGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5vbihldmVudCwgbGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSAqX2FsbCogZnVuY3Rpb25zIGFuZCBpbnZva2UgdGhlbS5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgdGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuXG4gICAgICBpZiAoIXRoaXMuX2FsbCAmJlxuICAgICAgICAhdGhpcy5fZXZlbnRzLmVycm9yICYmXG4gICAgICAgICEodGhpcy53aWxkY2FyZCAmJiB0aGlzLmxpc3RlbmVyVHJlZS5lcnJvcikpIHtcblxuICAgICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSlcbiAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy8gc2xvd2VyXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobGlzdGVuZXJzLmxlbmd0aCA+IDApIHx8ICEhdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgICB9XG5cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5vbkFueSh0eXBlKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG5cbiAgICAgICAgdmFyIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBleHBvcnRzLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuICAgIFxuICAgIHZhciBjb3B5O1xuICAgIFxuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG4gICAgICAgIGNvcHkgPSBBcnJheShsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBjb3B5W2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IG9iamVjdEtleXMob2JqKTtcbiAgICAgICAgY29weSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29weTtcbn07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoe30uaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgICByZXR1cm4ge30udG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnVybCA9IG51bGxcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgLy8gVE9ETzogUmVxdWVzdCBjb25zdHJ1Y3RvciBzaG91bGQgYWNjZXB0IGlucHV0LCBpbml0XG4gICAgdmFyIHJlcXVlc3RcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIGZ1bmN0aW9uIHJlc3BvbnNlVVJMKCkge1xuICAgICAgICBpZiAoJ3Jlc3BvbnNlVVJMJyBpbiB4aHIpIHtcbiAgICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVVJMXG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdm9pZCBzZWN1cml0eSB3YXJuaW5ncyBvbiBnZXRSZXNwb25zZUhlYWRlciB3aGVuIG5vdCBhbGxvd2VkIGJ5IENPUlNcbiAgICAgICAgaWYgKC9eWC1SZXF1ZXN0LVVSTDovbS50ZXN0KHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkpIHtcbiAgICAgICAgICByZXR1cm4geGhyLmdldFJlc3BvbnNlSGVhZGVyKCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdHVzID0gKHhoci5zdGF0dXMgPT09IDEyMjMpID8gMjA0IDogeGhyLnN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzIDwgMTAwIHx8IHN0YXR1cyA+IDU5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5yZXF1aXJlKCd3aGF0d2ctZmV0Y2gnKTtcclxudmFyIFEgPSByZXF1aXJlKCdRJyk7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIyJykuRXZlbnRFbWl0dGVyMjtcclxudmFyIGNvcHkgPSByZXF1aXJlKCdzaGFsbG93LWNvcHknKTtcclxuXHJcbi8vIFRoZSBkZWZhdWx0IGJhc2UgdXJsLlxyXG52YXIgYmFzZVVybCA9ICcnO1xyXG5cclxudmFyIHBsdWdpbnMgPSBbXTtcclxuXHJcbi8vIFRoZSB0ZW1wb3JhcnkgR0VUIHJlcXVlc3QgY2FjaGUgc3RvcmFnZVxyXG52YXIgY2FjaGUgPSB7fTtcclxuXHJcbnZhciBub29wID0gZnVuY3Rpb24oKXt9O1xyXG52YXIgaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XHJcblxyXG4vLyBXaWxsIGludm9rZSBhIGZ1bmN0aW9uIG9uIGFsbCBwbHVnaW5zLlxyXG4vLyBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gYWxsIHByb21pc2VzXHJcbi8vIHJldHVybmVkIGJ5IHRoZSBwbHVnaW5zIGhhdmUgcmVzb2x2ZWQuXHJcbi8vIFNob3VsZCBiZSB1c2VkIHdoZW4geW91IHdhbnQgcGx1Z2lucyB0byBwcmVwYXJlIGZvciBhbiBldmVudFxyXG4vLyBidXQgZG9uJ3Qgd2FudCBhbnkgZGF0YSByZXR1cm5lZC5cclxudmFyIHBsdWdpbldhaXQgPSBmdW5jdGlvbihwbHVnaW5Gbikge1xyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xyXG4gIHJldHVybiBRLmFsbChwbHVnaW5zLm1hcChmdW5jdGlvbihwbHVnaW4pIHtcclxuICAgIHJldHVybiAocGx1Z2luW3BsdWdpbkZuXSB8fCBub29wKS5hcHBseShwbHVnaW4sIGFyZ3MpO1xyXG4gIH0pKTtcclxufTtcclxuXHJcbi8vIFdpbGwgaW52b2tlIGEgZnVuY3Rpb24gb24gcGx1Z2lucyBmcm9tIGhpZ2hlc3QgcHJpb3JpdHlcclxuLy8gdG8gbG93ZXN0IHVudGlsIG9uZSByZXR1cm5zIGEgdmFsdWUuIFJldHVybnMgbnVsbCBpZiBub1xyXG4vLyBwbHVnaW5zIHJldHVybiBhIHZhbHVlLlxyXG4vLyBTaG91bGQgYmUgdXNlZCB3aGVuIHlvdSB3YW50IGp1c3Qgb25lIHBsdWdpbiB0byBoYW5kbGUgdGhpbmdzLlxyXG52YXIgcGx1Z2luR2V0ID0gZnVuY3Rpb24ocGx1Z2luRm4pIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcclxuICB2YXIgY2FsbFBsdWdpbiA9IGZ1bmN0aW9uKGluZGV4LCBwbHVnaW5Gbikge1xyXG4gICAgdmFyIHBsdWdpbiA9IHBsdWdpbnNbaW5kZXhdO1xyXG4gICAgaWYgKCFwbHVnaW4pIHJldHVybiBRKG51bGwpO1xyXG4gICAgcmV0dXJuIFEoKHBsdWdpbiAmJiBwbHVnaW5bcGx1Z2luRm5dIHx8IG5vb3ApLmFwcGx5KHBsdWdpbiwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICBpZiAocmVzdWx0ICE9PSBudWxsICYmIHJlc3VsdCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmVzdWx0O1xyXG4gICAgICByZXR1cm4gY2FsbFBsdWdpbi5hcHBseShudWxsLCBbaW5kZXggKyAxXS5jb25jYXQoYXJncykpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICByZXR1cm4gY2FsbFBsdWdpbi5hcHBseShudWxsLCBbMF0uY29uY2F0KGFyZ3MpKTtcclxufTtcclxuXHJcbi8vIFdpbGwgaW52b2tlIGEgZnVuY3Rpb24gb24gcGx1Z2lucyBmcm9tIGhpZ2hlc3QgcHJpb3JpdHkgdG9cclxuLy8gbG93ZXN0LCBidWlsZGluZyBhIHByb21pc2UgY2hhaW4gZnJvbSB0aGVpciByZXR1cm4gdmFsdWVzXHJcbi8vIFNob3VsZCBiZSB1c2VkIHdoZW4gYWxsIHBsdWdpbnMgbmVlZCB0byBwcm9jZXNzIGEgcHJvbWlzZSdzXHJcbi8vIHN1Y2Nlc3Mgb3IgZmFpbHVyZVxyXG52YXIgcGx1Z2luQWx0ZXIgPSBmdW5jdGlvbihwbHVnaW5GbiwgdmFsdWUpIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcclxuICByZXR1cm4gcGx1Z2lucy5yZWR1Y2UoZnVuY3Rpb24odmFsdWUsIHBsdWdpbikge1xyXG4gICAgICByZXR1cm4gKHBsdWdpbltwbHVnaW5Gbl0gfHwgaWRlbnRpdHkpLmFwcGx5KHBsdWdpbiwgW3ZhbHVlXS5jb25jYXQoYXJncykpO1xyXG4gIH0sIHZhbHVlKTtcclxufTtcclxuXHJcblxyXG4vKipcclxuICogUmV0dXJucyBwYXJ0cyBvZiB0aGUgVVJMIHRoYXQgYXJlIGltcG9ydGFudC5cclxuICogSW5kZXhlc1xyXG4gKiAgLSAwOiBUaGUgZnVsbCB1cmxcclxuICogIC0gMTogVGhlIHByb3RvY29sXHJcbiAqICAtIDI6IFRoZSBob3N0bmFtZVxyXG4gKiAgLSAzOiBUaGUgcmVzdFxyXG4gKlxyXG4gKiBAcGFyYW0gdXJsXHJcbiAqIEByZXR1cm5zIHsqfVxyXG4gKi9cclxudmFyIGdldFVybFBhcnRzID0gZnVuY3Rpb24odXJsKSB7XHJcbiAgcmV0dXJuIHVybC5tYXRjaCgvXihodHRwW3NdPzpcXC9cXC8pKFteL10rKSgkfFxcLy4qKS8pO1xyXG59O1xyXG5cclxudmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uKG9iaikge1xyXG4gIHZhciBzdHIgPSBbXTtcclxuICBmb3IodmFyIHAgaW4gb2JqKVxyXG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwKSkge1xyXG4gICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQocCkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbcF0pKTtcclxuICAgIH1cclxuICByZXR1cm4gc3RyLmpvaW4oXCImXCIpO1xyXG59O1xyXG5cclxuLy8gVGhlIGZvcm1pbyBjbGFzcy5cclxudmFyIEZvcm1pbyA9IGZ1bmN0aW9uKHBhdGgpIHtcclxuXHJcbiAgLy8gRW5zdXJlIHdlIGhhdmUgYW4gaW5zdGFuY2Ugb2YgRm9ybWlvLlxyXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGb3JtaW8pKSB7IHJldHVybiBuZXcgRm9ybWlvKHBhdGgpOyB9XHJcbiAgaWYgKCFwYXRoKSB7XHJcbiAgICAvLyBBbGxvdyB1c2VyIHRvIGNyZWF0ZSBuZXcgcHJvamVjdHMgaWYgdGhpcyB3YXMgaW5zdGFudGlhdGVkIHdpdGhvdXRcclxuICAgIC8vIGEgdXJsXHJcbiAgICB0aGlzLnByb2plY3RVcmwgPSBiYXNlVXJsICsgJy9wcm9qZWN0JztcclxuICAgIHRoaXMucHJvamVjdHNVcmwgPSBiYXNlVXJsICsgJy9wcm9qZWN0JztcclxuICAgIHRoaXMucHJvamVjdElkID0gZmFsc2U7XHJcbiAgICB0aGlzLnF1ZXJ5ID0gJyc7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBJbml0aWFsaXplIG91ciB2YXJpYWJsZXMuXHJcbiAgdGhpcy5wcm9qZWN0c1VybCA9ICcnO1xyXG4gIHRoaXMucHJvamVjdFVybCA9ICcnO1xyXG4gIHRoaXMucHJvamVjdElkID0gJyc7XHJcbiAgdGhpcy5mb3JtVXJsID0gJyc7XHJcbiAgdGhpcy5mb3Jtc1VybCA9ICcnO1xyXG4gIHRoaXMuZm9ybUlkID0gJyc7XHJcbiAgdGhpcy5zdWJtaXNzaW9uc1VybCA9ICcnO1xyXG4gIHRoaXMuc3VibWlzc2lvblVybCA9ICcnO1xyXG4gIHRoaXMuc3VibWlzc2lvbklkID0gJyc7XHJcbiAgdGhpcy5hY3Rpb25zVXJsID0gJyc7XHJcbiAgdGhpcy5hY3Rpb25JZCA9ICcnO1xyXG4gIHRoaXMuYWN0aW9uVXJsID0gJyc7XHJcbiAgdGhpcy5xdWVyeSA9ICcnO1xyXG5cclxuICAvLyBOb3JtYWxpemUgdG8gYW4gYWJzb2x1dGUgcGF0aC5cclxuICBpZiAoKHBhdGguaW5kZXhPZignaHR0cCcpICE9PSAwKSAmJiAocGF0aC5pbmRleE9mKCcvLycpICE9PSAwKSkge1xyXG4gICAgYmFzZVVybCA9IGJhc2VVcmwgPyBiYXNlVXJsIDogd2luZG93LmxvY2F0aW9uLmhyZWYubWF0Y2goL2h0dHBbc10/OlxcL1xcL2FwaS4vKVswXTtcclxuICAgIHBhdGggPSBiYXNlVXJsICsgcGF0aDtcclxuICB9XHJcblxyXG4gIHZhciBob3N0cGFydHMgPSBnZXRVcmxQYXJ0cyhwYXRoKTtcclxuICB2YXIgcGFydHMgPSBbXTtcclxuICB2YXIgaG9zdE5hbWUgPSBob3N0cGFydHNbMV0gKyBob3N0cGFydHNbMl07XHJcbiAgcGF0aCA9IGhvc3RwYXJ0cy5sZW5ndGggPiAzID8gaG9zdHBhcnRzWzNdIDogJyc7XHJcbiAgdmFyIHF1ZXJ5cGFydHMgPSBwYXRoLnNwbGl0KCc/Jyk7XHJcbiAgaWYgKHF1ZXJ5cGFydHMubGVuZ3RoID4gMSkge1xyXG4gICAgcGF0aCA9IHF1ZXJ5cGFydHNbMF07XHJcbiAgICB0aGlzLnF1ZXJ5ID0gJz8nICsgcXVlcnlwYXJ0c1sxXTtcclxuICB9XHJcblxyXG4gIC8vIFNlZSBpZiB0aGlzIGlzIGEgZm9ybSBwYXRoLlxyXG4gIGlmICgocGF0aC5zZWFyY2goLyhefFxcLykoZm9ybXxwcm9qZWN0KSgkfFxcLykvKSAhPT0gLTEpKSB7XHJcblxyXG4gICAgLy8gUmVnaXN0ZXIgYSBzcGVjaWZpYyBwYXRoLlxyXG4gICAgdmFyIHJlZ2lzdGVyUGF0aCA9IGZ1bmN0aW9uKG5hbWUsIGJhc2UpIHtcclxuICAgICAgdGhpc1tuYW1lICsgJ3NVcmwnXSA9IGJhc2UgKyAnLycgKyBuYW1lO1xyXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCdcXC8nICsgbmFtZSArICdcXC8oW14vXSspJyk7XHJcbiAgICAgIGlmIChwYXRoLnNlYXJjaChyZWdleCkgIT09IC0xKSB7XHJcbiAgICAgICAgcGFydHMgPSBwYXRoLm1hdGNoKHJlZ2V4KTtcclxuICAgICAgICB0aGlzW25hbWUgKyAnVXJsJ10gPSBwYXJ0cyA/IChiYXNlICsgcGFydHNbMF0pIDogJyc7XHJcbiAgICAgICAgdGhpc1tuYW1lICsgJ0lkJ10gPSAocGFydHMubGVuZ3RoID4gMSkgPyBwYXJ0c1sxXSA6ICcnO1xyXG4gICAgICAgIGJhc2UgKz0gcGFydHNbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGJhc2U7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgLy8gUmVnaXN0ZXIgYW4gYXJyYXkgb2YgaXRlbXMuXHJcbiAgICB2YXIgcmVnaXN0ZXJJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1zLCBiYXNlLCBzdGF0aWNCYXNlKSB7XHJcbiAgICAgIGZvciAodmFyIGkgaW4gaXRlbXMpIHtcclxuICAgICAgICBpZiAoaXRlbXMuaGFzT3duUHJvcGVydHkoaSkpIHtcclxuICAgICAgICAgIHZhciBpdGVtID0gaXRlbXNbaV07XHJcbiAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgICAgICAgIHJlZ2lzdGVySXRlbXMoaXRlbSwgYmFzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIG5ld0Jhc2UgPSByZWdpc3RlclBhdGgoaXRlbSwgYmFzZSk7XHJcbiAgICAgICAgICAgIGJhc2UgPSBzdGF0aWNCYXNlID8gYmFzZSA6IG5ld0Jhc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJlZ2lzdGVySXRlbXMoWydwcm9qZWN0JywgJ2Zvcm0nLCBbJ3N1Ym1pc3Npb24nLCAnYWN0aW9uJ11dLCBob3N0TmFtZSk7XHJcblxyXG4gICAgaWYgKCF0aGlzLnByb2plY3RJZCkge1xyXG4gICAgICBpZiAoaG9zdHBhcnRzLmxlbmd0aCA+IDIgJiYgaG9zdHBhcnRzWzJdLnNwbGl0KCcuJykubGVuZ3RoID4gMikge1xyXG4gICAgICAgIHRoaXMucHJvamVjdFVybCA9IGhvc3ROYW1lO1xyXG4gICAgICAgIHRoaXMucHJvamVjdElkID0gaG9zdHBhcnRzWzJdLnNwbGl0KCcuJylbMF07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgZWxzZSB7XHJcblxyXG4gICAgLy8gVGhpcyBpcyBhbiBhbGlhc2VkIHVybC5cclxuICAgIHRoaXMucHJvamVjdFVybCA9IGhvc3ROYW1lO1xyXG4gICAgdGhpcy5wcm9qZWN0SWQgPSAoaG9zdHBhcnRzLmxlbmd0aCA+IDIpID8gaG9zdHBhcnRzWzJdLnNwbGl0KCcuJylbMF0gOiAnJztcclxuICAgIHZhciBzdWJSZWdFeCA9IG5ldyBSZWdFeHAoJ1xcLyhzdWJtaXNzaW9ufGFjdGlvbikoJHxcXC8uKiknKTtcclxuICAgIHZhciBzdWJzID0gcGF0aC5tYXRjaChzdWJSZWdFeCk7XHJcbiAgICB0aGlzLnBhdGhUeXBlID0gKHN1YnMgJiYgKHN1YnMubGVuZ3RoID4gMSkpID8gc3Vic1sxXSA6ICcnO1xyXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZShzdWJSZWdFeCwgJycpO1xyXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvJC8sICcnKTtcclxuICAgIHRoaXMuZm9ybXNVcmwgPSBob3N0TmFtZSArICcvZm9ybSc7XHJcbiAgICB0aGlzLmZvcm1VcmwgPSBob3N0TmFtZSArIHBhdGg7XHJcbiAgICB0aGlzLmZvcm1JZCA9IHBhdGgucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgJycpO1xyXG4gICAgdmFyIGl0ZW1zID0gWydzdWJtaXNzaW9uJywgJ2FjdGlvbiddO1xyXG4gICAgZm9yICh2YXIgaSBpbiBpdGVtcykge1xyXG4gICAgICBpZiAoaXRlbXMuaGFzT3duUHJvcGVydHkoaSkpIHtcclxuICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xyXG4gICAgICAgIHRoaXNbaXRlbSArICdzVXJsJ10gPSBob3N0TmFtZSArIHBhdGggKyAnLycgKyBpdGVtO1xyXG4gICAgICAgIGlmICgodGhpcy5wYXRoVHlwZSA9PT0gaXRlbSkgJiYgKHN1YnMubGVuZ3RoID4gMikgJiYgc3Vic1syXSkge1xyXG4gICAgICAgICAgdGhpc1tpdGVtICsgJ0lkJ10gPSBzdWJzWzJdLnJlcGxhY2UoL15cXC8rfFxcLyskL2csICcnKTtcclxuICAgICAgICAgIHRoaXNbaXRlbSArICdVcmwnXSA9IGhvc3ROYW1lICsgcGF0aCArIHN1YnNbMF07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvYWQgYSByZXNvdXJjZS5cclxuICpcclxuICogQHBhcmFtIHR5cGVcclxuICogQHJldHVybnMge0Z1bmN0aW9ufVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxudmFyIF9sb2FkID0gZnVuY3Rpb24odHlwZSkge1xyXG4gIHZhciBfaWQgPSB0eXBlICsgJ0lkJztcclxuICB2YXIgX3VybCA9IHR5cGUgKyAnVXJsJztcclxuICByZXR1cm4gZnVuY3Rpb24ocXVlcnksIG9wdHMpIHtcclxuICAgIGlmIChxdWVyeSAmJiB0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHF1ZXJ5ID0gc2VyaWFsaXplKHF1ZXJ5LnBhcmFtcyk7XHJcbiAgICB9XHJcbiAgICBpZiAocXVlcnkpIHtcclxuICAgICAgcXVlcnkgPSB0aGlzLnF1ZXJ5ID8gKHRoaXMucXVlcnkgKyAnJicgKyBxdWVyeSkgOiAoJz8nICsgcXVlcnkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHF1ZXJ5ID0gdGhpcy5xdWVyeTtcclxuICAgIH1cclxuICAgIGlmICghdGhpc1tfaWRdKSB7IHJldHVybiBRLnJlamVjdCgnTWlzc2luZyAnICsgX2lkKTsgfVxyXG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QodHlwZSwgdGhpc1tfdXJsXSArIHF1ZXJ5LCAnZ2V0JywgbnVsbCwgb3B0cyk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTYXZlIGEgcmVzb3VyY2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB0eXBlXHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBfc2F2ZSA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuICB2YXIgX2lkID0gdHlwZSArICdJZCc7XHJcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEsIG9wdHMpIHtcclxuICAgIHZhciBtZXRob2QgPSB0aGlzW19pZF0gPyAncHV0JyA6ICdwb3N0JztcclxuICAgIHZhciByZXFVcmwgPSB0aGlzW19pZF0gPyB0aGlzW191cmxdIDogdGhpc1t0eXBlICsgJ3NVcmwnXTtcclxuICAgIGNhY2hlID0ge307XHJcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCByZXFVcmwgKyB0aGlzLnF1ZXJ5LCBtZXRob2QsIGRhdGEsIG9wdHMpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogRGVsZXRlIGEgcmVzb3VyY2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB0eXBlXHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBfZGVsZXRlID0gZnVuY3Rpb24odHlwZSkge1xyXG4gIHZhciBfaWQgPSB0eXBlICsgJ0lkJztcclxuICB2YXIgX3VybCA9IHR5cGUgKyAnVXJsJztcclxuICByZXR1cm4gZnVuY3Rpb24ob3B0cykge1xyXG4gICAgaWYgKCF0aGlzW19pZF0pIHsgUS5yZWplY3QoJ05vdGhpbmcgdG8gZGVsZXRlJyk7IH1cclxuICAgIGNhY2hlID0ge307XHJcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCB0aGlzW191cmxdLCAnZGVsZXRlJywgbnVsbCwgb3B0cyk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvdXJjZSBpbmRleCBtZXRob2QuXHJcbiAqXHJcbiAqIEBwYXJhbSB0eXBlXHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBfaW5kZXggPSBmdW5jdGlvbih0eXBlKSB7XHJcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKHF1ZXJ5LCBvcHRzKSB7XHJcbiAgICBxdWVyeSA9IHF1ZXJ5IHx8ICcnO1xyXG4gICAgaWYgKHF1ZXJ5ICYmIHR5cGVvZiBxdWVyeSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgcXVlcnkgPSAnPycgKyBzZXJpYWxpemUocXVlcnkucGFyYW1zKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHR5cGUsIHRoaXNbX3VybF0gKyBxdWVyeSwgJ2dldCcsIG51bGwsIG9wdHMpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vLyBBY3RpdmF0ZXMgcGx1Z2luIGhvb2tzLCBtYWtlcyBGb3JtaW8ucmVxdWVzdCBpZiBubyBwbHVnaW4gcHJvdmlkZXMgYSByZXF1ZXN0XHJcbkZvcm1pby5wcm90b3R5cGUubWFrZVJlcXVlc3QgPSBmdW5jdGlvbih0eXBlLCB1cmwsIG1ldGhvZCwgZGF0YSwgb3B0cykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBtZXRob2QgPSAobWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xyXG4gIGlmKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xyXG4gICAgb3B0cyA9IHt9O1xyXG4gIH1cclxuXHJcbiAgdmFyIHJlcXVlc3RBcmdzID0ge1xyXG4gICAgZm9ybWlvOiBzZWxmLFxyXG4gICAgdHlwZTogdHlwZSxcclxuICAgIHVybDogdXJsLFxyXG4gICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICBkYXRhOiBkYXRhLFxyXG4gICAgb3B0czogb3B0c1xyXG4gIH07XHJcblxyXG4gIHZhciByZXF1ZXN0ID0gcGx1Z2luV2FpdCgncHJlUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxyXG4gIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHBsdWdpbkdldCgncmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxyXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm4gRm9ybWlvLnJlcXVlc3QodXJsLCBtZXRob2QsIGRhdGEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XHJcbn07XHJcblxyXG4vLyBEZWZpbmUgc3BlY2lmaWMgQ1JVRCBtZXRob2RzLlxyXG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRQcm9qZWN0ID0gX2xvYWQoJ3Byb2plY3QnKTtcclxuRm9ybWlvLnByb3RvdHlwZS5zYXZlUHJvamVjdCA9IF9zYXZlKCdwcm9qZWN0Jyk7XHJcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlUHJvamVjdCA9IF9kZWxldGUoJ3Byb2plY3QnKTtcclxuRm9ybWlvLnByb3RvdHlwZS5sb2FkRm9ybSA9IF9sb2FkKCdmb3JtJyk7XHJcbkZvcm1pby5wcm90b3R5cGUuc2F2ZUZvcm0gPSBfc2F2ZSgnZm9ybScpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZUZvcm0gPSBfZGVsZXRlKCdmb3JtJyk7XHJcbkZvcm1pby5wcm90b3R5cGUubG9hZEZvcm1zID0gX2luZGV4KCdmb3JtcycpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRTdWJtaXNzaW9uID0gX2xvYWQoJ3N1Ym1pc3Npb24nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5zYXZlU3VibWlzc2lvbiA9IF9zYXZlKCdzdWJtaXNzaW9uJyk7XHJcbkZvcm1pby5wcm90b3R5cGUuZGVsZXRlU3VibWlzc2lvbiA9IF9kZWxldGUoJ3N1Ym1pc3Npb24nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5sb2FkU3VibWlzc2lvbnMgPSBfaW5kZXgoJ3N1Ym1pc3Npb25zJyk7XHJcbkZvcm1pby5wcm90b3R5cGUubG9hZEFjdGlvbiA9IF9sb2FkKCdhY3Rpb24nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5zYXZlQWN0aW9uID0gX3NhdmUoJ2FjdGlvbicpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZUFjdGlvbiA9IF9kZWxldGUoJ2FjdGlvbicpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRBY3Rpb25zID0gX2luZGV4KCdhY3Rpb25zJyk7XHJcbkZvcm1pby5wcm90b3R5cGUuYXZhaWxhYmxlQWN0aW9ucyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCgnYXZhaWxhYmxlQWN0aW9ucycsIHRoaXMuZm9ybVVybCArICcvYWN0aW9ucycpOyB9O1xyXG5Gb3JtaW8ucHJvdG90eXBlLmFjdGlvbkluZm8gPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KCdhY3Rpb25JbmZvJywgdGhpcy5mb3JtVXJsICsgJy9hY3Rpb25zLycgKyBuYW1lKTsgfTtcclxuXHJcbkZvcm1pby5tYWtlU3RhdGljUmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBkYXRhKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIG1ldGhvZCA9IChtZXRob2QgfHwgJ0dFVCcpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gIHZhciByZXF1ZXN0QXJncyA9IHtcclxuICAgIHVybDogdXJsLFxyXG4gICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICBkYXRhOiBkYXRhXHJcbiAgfTtcclxuXHJcbiAgdmFyIHJlcXVlc3QgPSBwbHVnaW5XYWl0KCdwcmVTdGF0aWNSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXHJcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gcGx1Z2luR2V0KCdzdGF0aWNSZXF1ZXN0JywgcmVxdWVzdEFyZ3MpXHJcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHJldHVybiBGb3JtaW8ucmVxdWVzdCh1cmwsIG1ldGhvZCwgZGF0YSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gcGx1Z2luQWx0ZXIoJ3dyYXBTdGF0aWNSZXF1ZXN0UHJvbWlzZScsIHJlcXVlc3QsIHJlcXVlc3RBcmdzKTtcclxufTtcclxuXHJcbi8vIFN0YXRpYyBtZXRob2RzLlxyXG5Gb3JtaW8ubG9hZFByb2plY3RzID0gZnVuY3Rpb24ocXVlcnkpIHtcclxuICBxdWVyeSA9IHF1ZXJ5IHx8ICcnO1xyXG4gIGlmICh0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XHJcbiAgICBxdWVyeSA9ICc/JyArIHNlcmlhbGl6ZShxdWVyeS5wYXJhbXMpO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5tYWtlU3RhdGljUmVxdWVzdChiYXNlVXJsICsgJy9wcm9qZWN0JyArIHF1ZXJ5KTtcclxufTtcclxuRm9ybWlvLnJlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG1ldGhvZCwgZGF0YSkge1xyXG4gIGlmICghdXJsKSB7IHJldHVybiBRLnJlamVjdCgnTm8gdXJsIHByb3ZpZGVkJyk7IH1cclxuICBtZXRob2QgPSAobWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xyXG4gIHZhciBjYWNoZUtleSA9IGJ0b2EodXJsKTtcclxuXHJcbiAgcmV0dXJuIFEoKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgLy8gR2V0IHRoZSBjYWNoZWQgcHJvbWlzZSB0byBzYXZlIG11bHRpcGxlIGxvYWRzLlxyXG4gICAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgY2FjaGUuaGFzT3duUHJvcGVydHkoY2FjaGVLZXkpKSB7XHJcbiAgICAgIHJldHVybiBjYWNoZVtjYWNoZUtleV07XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcmV0dXJuIFEoKVxyXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBTZXQgdXAgYW5kIGZldGNoIHJlcXVlc3RcclxuICAgICAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHtcclxuICAgICAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIHRva2VuID0gRm9ybWlvLmdldFRva2VuKCk7XHJcbiAgICAgICAgaWYgKHRva2VuKSB7XHJcbiAgICAgICAgICBoZWFkZXJzLmFwcGVuZCgneC1qd3QtdG9rZW4nLCB0b2tlbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyxcclxuICAgICAgICAgIG1vZGU6ICdjb3JzJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZldGNoKHVybCwgb3B0aW9ucyk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICBlcnIubWVzc2FnZSA9ICdDb3VsZCBub3QgY29ubmVjdCB0byBBUEkgc2VydmVyICgnICsgZXJyLm1lc3NhZ2UgKyAnKSc7XHJcbiAgICAgICAgZXJyLm5ldHdvcmtFcnJvciA9IHRydWU7XHJcbiAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICB9KVxyXG4gICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgIC8vIEhhbmRsZSBmZXRjaCByZXN1bHRzXHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICB2YXIgdG9rZW4gPSByZXNwb25zZS5oZWFkZXJzLmdldCgneC1qd3QtdG9rZW4nKTtcclxuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCAmJiB0b2tlbiAmJiB0b2tlbiAhPT0gJycpIHtcclxuICAgICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIDIwNCBpcyBubyBjb250ZW50LiBEb24ndCB0cnkgdG8gLmpzb24oKSBpdC5cclxuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgIT09IC0xID9cclxuICAgICAgICAgICAgcmVzcG9uc2UuanNvbigpIDogcmVzcG9uc2UudGV4dCgpKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIC8vIEFkZCBzb21lIGNvbnRlbnQtcmFuZ2UgbWV0YWRhdGEgdG8gdGhlIHJlc3VsdCBoZXJlXHJcbiAgICAgICAgICAgIHZhciByYW5nZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXJhbmdlJyk7XHJcbiAgICAgICAgICAgIGlmIChyYW5nZSAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJhbmdlID0gcmFuZ2Uuc3BsaXQoJy8nKTtcclxuICAgICAgICAgICAgICBpZihyYW5nZVswXSAhPT0gJyonKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2tpcExpbWl0ID0gcmFuZ2VbMF0uc3BsaXQoJy0nKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5za2lwID0gTnVtYmVyKHNraXBMaW1pdFswXSk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQubGltaXQgPSBza2lwTGltaXRbMV0gLSBza2lwTGltaXRbMF0gKyAxO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICByZXN1bHQuc2VydmVyQ291bnQgPSByYW5nZVsxXSA9PT0gJyonID8gcmFuZ2VbMV0gOiBOdW1iZXIocmFuZ2VbMV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0NDApIHtcclxuICAgICAgICAgICAgRm9ybWlvLnNldFRva2VuKG51bGwpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gUGFyc2UgYW5kIHJldHVybiB0aGUgZXJyb3IgYXMgYSByZWplY3RlZCBwcm9taXNlIHRvIHJlamVjdCB0aGlzIHByb21pc2VcclxuICAgICAgICAgIHJldHVybiAocmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTEgP1xyXG4gICAgICAgICAgICByZXNwb25zZS5qc29uKCkgOiByZXNwb25zZS50ZXh0KCkpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGZhaWxlZCBwcm9taXNlcyBmcm9tIGNhY2hlXHJcbiAgICAgICAgZGVsZXRlIGNhY2hlW2NhY2hlS2V5XTtcclxuICAgICAgICAvLyBQcm9wYWdhdGUgZXJyb3Igc28gY2xpZW50IGNhbiBoYW5kbGUgYWNjb3JkaW5nbHlcclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pXHJcbiAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAvLyBTYXZlIHRoZSBjYWNoZVxyXG4gICAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgY2FjaGVbY2FjaGVLZXldID0gUShyZXN1bHQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNoYWxsb3cgY29weSByZXN1bHQgc28gbW9kaWZpY2F0aW9ucyBkb24ndCBlbmQgdXAgaW4gY2FjaGVcclxuICAgIGlmKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xyXG4gICAgICB2YXIgcmVzdWx0Q29weSA9IHJlc3VsdC5tYXAoY29weSk7XHJcbiAgICAgIHJlc3VsdENvcHkuc2tpcCA9IHJlc3VsdC5za2lwO1xyXG4gICAgICByZXN1bHRDb3B5LmxpbWl0ID0gcmVzdWx0LmxpbWl0O1xyXG4gICAgICByZXN1bHRDb3B5LnNlcnZlckNvdW50ID0gcmVzdWx0LnNlcnZlckNvdW50O1xyXG4gICAgICByZXR1cm4gcmVzdWx0Q29weTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb3B5KHJlc3VsdCk7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5Gb3JtaW8uc2V0VG9rZW4gPSBmdW5jdGlvbih0b2tlbikge1xyXG4gIHRva2VuID0gdG9rZW4gfHwgJyc7XHJcbiAgaWYgKHRva2VuID09PSB0aGlzLnRva2VuKSB7IHJldHVybjsgfVxyXG4gIHRoaXMudG9rZW4gPSB0b2tlbjtcclxuICBpZiAoIXRva2VuKSB7XHJcbiAgICBGb3JtaW8uc2V0VXNlcihudWxsKTtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVG9rZW4nKTtcclxuICB9XHJcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb1Rva2VuJywgdG9rZW4pO1xyXG4gIEZvcm1pby5jdXJyZW50VXNlcigpOyAvLyBSdW4gdGhpcyBzbyB1c2VyIGlzIHVwZGF0ZWQgaWYgbnVsbFxyXG59O1xyXG5Gb3JtaW8uZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcclxuICBpZiAodGhpcy50b2tlbikgeyByZXR1cm4gdGhpcy50b2tlbjsgfVxyXG4gIHZhciB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Ub2tlbicpIHx8ICcnO1xyXG4gIHRoaXMudG9rZW4gPSB0b2tlbjtcclxuICByZXR1cm4gdG9rZW47XHJcbn07XHJcbkZvcm1pby5zZXRVc2VyID0gZnVuY3Rpb24odXNlcikge1xyXG4gIGlmICghdXNlcikge1xyXG4gICAgdGhpcy5zZXRUb2tlbihudWxsKTtcclxuICAgIHJldHVybiBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xyXG4gIH1cclxuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvVXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcclxufTtcclxuRm9ybWlvLmdldFVzZXIgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVXNlcicpIHx8IG51bGwpO1xyXG59O1xyXG5cclxuRm9ybWlvLnNldEJhc2VVcmwgPSBmdW5jdGlvbih1cmwpIHtcclxuICBiYXNlVXJsID0gdXJsO1xyXG59O1xyXG5Gb3JtaW8uZ2V0QmFzZVVybCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBiYXNlVXJsO1xyXG59XHJcbkZvcm1pby5jbGVhckNhY2hlID0gZnVuY3Rpb24oKSB7IGNhY2hlID0ge307IH07XHJcblxyXG5Gb3JtaW8uY3VycmVudFVzZXIgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgdXJsID0gYmFzZVVybCArICcvY3VycmVudCc7XHJcbiAgdmFyIHVzZXIgPSB0aGlzLmdldFVzZXIoKTtcclxuICBpZiAodXNlcikge1xyXG4gICAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwU3RhdGljUmVxdWVzdFByb21pc2UnLCBRKHVzZXIpLCB7XHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICBtZXRob2Q6ICdHRVQnXHJcbiAgICB9KVxyXG4gIH1cclxuICB2YXIgdG9rZW4gPSB0aGlzLmdldFRva2VuKCk7XHJcbiAgaWYgKCF0b2tlbikge1xyXG4gICAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwU3RhdGljUmVxdWVzdFByb21pc2UnLCBRKG51bGwpLCB7XHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICBtZXRob2Q6ICdHRVQnXHJcbiAgICB9KVxyXG4gIH1cclxuICByZXR1cm4gdGhpcy5tYWtlU3RhdGljUmVxdWVzdCh1cmwpXHJcbiAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgIEZvcm1pby5zZXRVc2VyKHJlc3BvbnNlKTtcclxuICAgIHJldHVybiByZXNwb25zZTtcclxuICB9KTtcclxufTtcclxuXHJcbi8vIEtlZXAgdHJhY2sgb2YgdGhlaXIgbG9nb3V0IGNhbGxiYWNrLlxyXG5Gb3JtaW8ubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QoYmFzZVVybCArICcvbG9nb3V0JykuZmluYWxseShmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuc2V0VG9rZW4obnVsbCk7XHJcbiAgICB0aGlzLnNldFVzZXIobnVsbCk7XHJcbiAgICBGb3JtaW8uY2xlYXJDYWNoZSgpO1xyXG4gIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcbkZvcm1pby5maWVsZERhdGEgPSBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQpIHtcclxuICBpZiAoIWRhdGEpIHsgcmV0dXJuICcnOyB9XHJcbiAgaWYgKGNvbXBvbmVudC5rZXkuaW5kZXhPZignLicpICE9PSAtMSkge1xyXG4gICAgdmFyIHZhbHVlID0gZGF0YTtcclxuICAgIHZhciBwYXJ0cyA9IGNvbXBvbmVudC5rZXkuc3BsaXQoJy4nKTtcclxuICAgIHZhciBrZXkgPSAnJztcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAga2V5ID0gcGFydHNbaV07XHJcblxyXG4gICAgICAvLyBIYW5kbGUgbmVzdGVkIHJlc291cmNlc1xyXG4gICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XHJcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5kYXRhO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBSZXR1cm4gaWYgdGhlIGtleSBpcyBub3QgZm91bmQgb24gdGhlIHZhbHVlLlxyXG4gICAgICBpZiAoIXZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENvbnZlcnQgb2xkIHNpbmdsZSBmaWVsZCBkYXRhIGluIHN1Ym1pc3Npb25zIHRvIG11bHRpcGxlXHJcbiAgICAgIGlmIChrZXkgPT09IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdICYmIGNvbXBvbmVudC5tdWx0aXBsZSAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZVtrZXldKSkge1xyXG4gICAgICAgIHZhbHVlW2tleV0gPSBbdmFsdWVba2V5XV07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNldCB0aGUgdmFsdWUgb2YgdGhpcyBrZXkuXHJcbiAgICAgIHZhbHVlID0gdmFsdWVba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvLyBDb252ZXJ0IG9sZCBzaW5nbGUgZmllbGQgZGF0YSBpbiBzdWJtaXNzaW9ucyB0byBtdWx0aXBsZVxyXG4gICAgaWYgKGNvbXBvbmVudC5tdWx0aXBsZSAmJiAhQXJyYXkuaXNBcnJheShkYXRhW2NvbXBvbmVudC5rZXldKSkge1xyXG4gICAgICBkYXRhW2NvbXBvbmVudC5rZXldID0gW2RhdGFbY29tcG9uZW50LmtleV1dO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRhdGFbY29tcG9uZW50LmtleV07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEV2ZW50RW1pdHRlciBmb3IgRm9ybWlvIGV2ZW50cy5cclxuICogU2VlIE5vZGUuanMgZG9jdW1lbnRhdGlvbiBmb3IgQVBJIGRvY3VtZW50YXRpb246IGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWxcclxuICovXHJcbkZvcm1pby5ldmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyKHtcclxuICB3aWxkY2FyZDogZmFsc2UsXHJcbiAgbWF4TGlzdGVuZXJzOiAwXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyIGEgcGx1Z2luIHdpdGggRm9ybWlvLmpzXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiB0byByZWdpc3Rlci4gU2VlIHBsdWdpbiBkb2N1bWVudGF0aW9uLlxyXG4gKiBAcGFyYW0gbmFtZSAgIE9wdGlvbmFsIG5hbWUgdG8gbGF0ZXIgcmV0cmlldmUgcGx1Z2luIHdpdGguXHJcbiAqL1xyXG5Gb3JtaW8ucmVnaXN0ZXJQbHVnaW4gPSBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcclxuICBwbHVnaW5zLnB1c2gocGx1Z2luKTtcclxuICBwbHVnaW5zLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgcmV0dXJuIChiLnByaW9yaXR5IHx8IDApIC0gKGEucHJpb3JpdHkgfHwgMCk7XHJcbiAgfSk7XHJcbiAgcGx1Z2luLl9fbmFtZSA9IG5hbWU7XHJcbiAgKHBsdWdpbi5pbml0IHx8IG5vb3ApLmNhbGwocGx1Z2luLCBGb3JtaW8pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHBsdWdpbiByZWdpc3RlcmVkIHdpdGggdGhlIGdpdmVuIG5hbWUuXHJcbiAqL1xyXG5Gb3JtaW8uZ2V0UGx1Z2luID0gZnVuY3Rpb24obmFtZSkge1xyXG4gIHJldHVybiBwbHVnaW5zLnJlZHVjZShmdW5jdGlvbihyZXN1bHQsIHBsdWdpbikge1xyXG4gICAgaWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcclxuICAgIGlmIChwbHVnaW4uX19uYW1lID09PSBuYW1lKSByZXR1cm4gcGx1Z2luO1xyXG4gIH0sIG51bGwpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlcmVnaXN0ZXJzIGEgcGx1Z2luIHdpdGggRm9ybWlvLmpzLlxyXG4gKiBAcGFyYW0gIHBsdWdpbiBUaGUgaW5zdGFuY2Ugb3IgbmFtZSBvZiB0aGUgcGx1Z2luXHJcbiAqIEByZXR1cm4gdHJ1ZSBpZiBkZXJlZ2lzdGVyZWQsIGZhbHNlIG90aGVyd2lzZVxyXG4gKi9cclxuRm9ybWlvLmRlcmVnaXN0ZXJQbHVnaW4gPSBmdW5jdGlvbihwbHVnaW4pIHtcclxuICB2YXIgYmVmb3JlTGVuZ3RoID0gcGx1Z2lucy5sZW5ndGg7XHJcbiAgcGx1Z2lucyA9IHBsdWdpbnMuZmlsdGVyKGZ1bmN0aW9uKHApIHtcclxuICAgIGlmKHAgIT09IHBsdWdpbiAmJiBwLl9fbmFtZSAhPT0gcGx1Z2luKSByZXR1cm4gdHJ1ZTtcclxuICAgIChwLmRlcmVnaXN0ZXIgfHwgbm9vcCkuY2FsbChwLCBGb3JtaW8pO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZWZvcmVMZW5ndGggIT09IHBsdWdpbnMubGVuZ3RoO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGb3JtaW87XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICAvKmpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdhZGRyZXNzJywge1xyXG4gICAgICAgIHRpdGxlOiAnQWRkcmVzcycsXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uICgkc2NvcGUpIHtcclxuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MtbXVsdGlwbGUuaHRtbCcgOiAnZm9ybWlvL2NvbXBvbmVudHMvYWRkcmVzcy5odG1sJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRodHRwJywgZnVuY3Rpb24gKCRzY29wZSwgJGh0dHApIHtcclxuICAgICAgICAgICRzY29wZS5hZGRyZXNzID0ge307XHJcbiAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gW107XHJcbiAgICAgICAgICAkc2NvcGUucmVmcmVzaEFkZHJlc3MgPSBmdW5jdGlvbiAoYWRkcmVzcykge1xyXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge2FkZHJlc3M6IGFkZHJlc3MsIHNlbnNvcjogZmFsc2V9O1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KFxyXG4gICAgICAgICAgICAgICdodHRwczovL21hcHMuZ29vZ2xlYXBpcy5jb20vbWFwcy9hcGkvZ2VvY29kZS9qc29uJyxcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBkaXNhYmxlSldUOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXHJcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgUHJhZ21hOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICdDYWNoZS1Db250cm9sJzogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWRkcmVzc2VzID0gcmVzcG9uc2UuZGF0YS5yZXN1bHRzO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XSxcclxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICByZXR1cm4gZGF0YSA/IGRhdGEuZm9ybWF0dGVkX2FkZHJlc3MgOiAnJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ2FkZHJlc3NGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MuaHRtbCcsXHJcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+XFxyXFxuPHNwYW4gbmctaWY9XFxcIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbjx1aS1zZWxlY3QgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiPlxcclxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIiA+e3skaXRlbS5mb3JtYXR0ZWRfYWRkcmVzcyB8fCAkc2VsZWN0LnNlbGVjdGVkLmZvcm1hdHRlZF9hZGRyZXNzfX08L3VpLXNlbGVjdC1tYXRjaD5cXHJcXG4gIDx1aS1zZWxlY3QtY2hvaWNlcyBjbGFzcz1cXFwidWktc2VsZWN0LWNob2ljZXNcXFwiICByZXBlYXQ9XFxcImFkZHJlc3MgaW4gYWRkcmVzc2VzXFxcIiByZWZyZXNoPVxcXCJyZWZyZXNoQWRkcmVzcygkc2VsZWN0LnNlYXJjaClcXFwiIHJlZnJlc2gtZGVsYXk9XFxcIjUwMFxcXCI+XFxyXFxuICAgIDxkaXYgbmctYmluZC1odG1sPVxcXCJhZGRyZXNzLmZvcm1hdHRlZF9hZGRyZXNzIHwgaGlnaGxpZ2h0OiAkc2VsZWN0LnNlYXJjaFxcXCIgPjwvZGl2PlxcclxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXHJcXG48L3VpLXNlbGVjdD5cIlxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gQ2hhbmdlIHRoZSB1aS1zZWxlY3QgdG8gdWktc2VsZWN0IG11bHRpcGxlLlxyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MtbXVsdGlwbGUuaHRtbCcsXHJcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdidXR0b24nLCB7XHJcbiAgICAgICAgdGl0bGU6ICdCdXR0b24nLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnU3VibWl0JyxcclxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXHJcbiAgICAgICAgICBrZXk6ICdzdWJtaXQnLFxyXG4gICAgICAgICAgc2l6ZTogJ21kJyxcclxuICAgICAgICAgIGxlZnRJY29uOiAnJyxcclxuICAgICAgICAgIHJpZ2h0SWNvbjogJycsXHJcbiAgICAgICAgICBibG9jazogZmFsc2UsXHJcbiAgICAgICAgICBhY3Rpb246ICdzdWJtaXQnLFxyXG4gICAgICAgICAgZGlzYWJsZU9uSW52YWxpZDogdHJ1ZSxcclxuICAgICAgICAgIHRoZW1lOiAncHJpbWFyeSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xyXG4gICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcclxuICAgICAgICAgICRzY29wZS5vbkNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoc2V0dGluZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICBjYXNlICdyZXNldCc6XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRGb3JtKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICBjYXNlICdvYXV0aCc6XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmhhc093blByb3BlcnR5KCdmb3JtJykpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5vYXV0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBtdXN0IGFzc2lnbiB0aGlzIGJ1dHRvbiB0byBhbiBPQXV0aCBhY3Rpb24gYmVmb3JlIGl0IHdpbGwgd29yay4nXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLm9hdXRoLmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBzZXR0aW5ncy5vYXV0aC5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5vcGVuT0F1dGgoc2V0dGluZ3Mub2F1dGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgJHNjb3BlLm9wZW5PQXV0aCA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXHJcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2VfdHlwZTogJ2NvZGUnLFxyXG4gICAgICAgICAgICAgIGNsaWVudF9pZDogc2V0dGluZ3MuY2xpZW50SWQsXHJcbiAgICAgICAgICAgICAgcmVkaXJlY3RfdXJpOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luIHx8IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdCxcclxuICAgICAgICAgICAgICBzdGF0ZTogc2V0dGluZ3Muc3RhdGUsXHJcbiAgICAgICAgICAgICAgc2NvcGU6IHNldHRpbmdzLnNjb3BlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIC8qZXNsaW50LWVuYWJsZSBjYW1lbGNhc2UgKi9cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgZGlzcGxheSBvcHRpb25hbC5cclxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRpc3BsYXkpIHtcclxuICAgICAgICAgICAgICBwYXJhbXMuZGlzcGxheSA9IHNldHRpbmdzLmRpc3BsYXk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFyYW1zID0gT2JqZWN0LmtleXMocGFyYW1zKS5tYXAoZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGtleSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba2V5XSk7XHJcbiAgICAgICAgICAgIH0pLmpvaW4oJyYnKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB1cmwgPSBzZXR0aW5ncy5hdXRoVVJJICsgJz8nICsgcGFyYW1zO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETzogbWFrZSB3aW5kb3cgb3B0aW9ucyBmcm9tIG9hdXRoIHNldHRpbmdzLCBoYXZlIGJldHRlciBkZWZhdWx0c1xyXG4gICAgICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3Blbih1cmwsIHNldHRpbmdzLnByb3ZpZGVyLCAnd2lkdGg9MTAyMCxoZWlnaHQ9NjE4Jyk7XHJcbiAgICAgICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcG9wdXBIb3N0ID0gcG9wdXAubG9jYXRpb24uaG9zdDtcclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvcHVwICYmICFwb3B1cC5jbG9zZWQgJiYgcG9wdXBIb3N0ID09PSBjdXJyZW50SG9zdCAmJiBwb3B1cC5sb2NhdGlvbi5zZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgcG9wdXAuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHBvcHVwLmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocGFyYW1zLCBwYXJhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzcGxpdCA9IHBhcmFtLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW3NwbGl0WzBdXSA9IHNwbGl0WzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICAgIH0sIHt9KTtcclxuICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLmVycm9yX2Rlc2NyaXB0aW9uIHx8IHBhcmFtcy5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBmb3IgZXJyb3IgcmVzcG9uc2UgaGVyZVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc3RhdGUgIT09IHBhcmFtcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ09BdXRoIHN0YXRlIGRvZXMgbm90IG1hdGNoLiBQbGVhc2UgdHJ5IGxvZ2dpbmcgaW4gYWdhaW4uJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvbiA9IHtkYXRhOiB7fSwgb2F1dGg6IHt9fTtcclxuICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbi5vYXV0aFtzZXR0aW5ncy5wcm92aWRlcl0gPSBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb24ub2F1dGhbc2V0dGluZ3MucHJvdmlkZXJdLnJlZGlyZWN0VVJJID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiB8fCB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3Q7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybWlvLnNhdmVTdWJtaXNzaW9uKHN1Ym1pc3Npb24pXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBmb3JtIHN1Ym1pc3Npb24uXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8IGVycm9yXHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoIXBvcHVwIHx8IHBvcHVwLmNsb3NlZCB8fCBwb3B1cC5jbG9zZWQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfV1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxyXG4gICAgICAgIFwiPGJ1dHRvbiB0eXBlPVxcXCJ7e2NvbXBvbmVudC5hY3Rpb24gPT0gJ3N1Ym1pdCcgfHwgY29tcG9uZW50LmFjdGlvbiA9PSAncmVzZXQnID8gY29tcG9uZW50LmFjdGlvbiA6ICdidXR0b24nfX1cXFwiXFxyXFxubmctY2xhc3M9XFxcInsnYnRuLWJsb2NrJzogY29tcG9uZW50LmJsb2NrfVxcXCJcXHJcXG5jbGFzcz1cXFwiYnRuIGJ0bi17eyBjb21wb25lbnQudGhlbWUgfX0gYnRuLXt7IGNvbXBvbmVudC5zaXplIH19XFxcIlxcclxcbm5nLWRpc2FibGVkPVxcXCJyZWFkT25seSB8fCBmb3JtLnN1Ym1pdHRpbmcgfHwgKGNvbXBvbmVudC5kaXNhYmxlT25JbnZhbGlkICYmIGZvcm0uJGludmFsaWQpXFxcIlxcclxcbnRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG5uZy1jbGljaz1cXFwib25DbGljaygpXFxcIj5cXHJcXG4gIDxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQubGVmdEljb25cXFwiIGNsYXNzPVxcXCJ7eyBjb21wb25lbnQubGVmdEljb24gfX1cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuICA8c3BhbiBuZy1pZj1cXFwiY29tcG9uZW50LmxlZnRJY29uICYmIGNvbXBvbmVudC5sYWJlbFxcXCI+Jm5ic3A7PC9zcGFuPnt7IGNvbXBvbmVudC5sYWJlbCB9fTxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQucmlnaHRJY29uICYmIGNvbXBvbmVudC5sYWJlbFxcXCI+Jm5ic3A7PC9zcGFuPlxcclxcbiAgPHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5yaWdodEljb25cXFwiIGNsYXNzPVxcXCJ7eyBjb21wb25lbnQucmlnaHRJY29uIH19XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbiAgIDxpIG5nLWlmPVxcXCJjb21wb25lbnQuYWN0aW9uID09ICdzdWJtaXQnICYmIGZvcm0uc3VibWl0dGluZ1xcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcclxcbjwvYnV0dG9uPlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NoZWNrYm94Jywge1xyXG4gICAgICAgIHRpdGxlOiAnQ2hlY2sgQm94JyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NoZWNrYm94Lmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ2NoZWNrYm94JyxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIC8vIFRoaXMgaGlkZXMgdGhlIGRlZmF1bHQgbGFiZWwgbGF5b3V0IHNvIHdlIGNhbiB1c2UgYSBzcGVjaWFsIGlubGluZSBsYWJlbFxyXG4gICAgICAgICAgaGlkZUxhYmVsOiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnY2hlY2tib3hGaWVsZCcsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9jaGVja2JveC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImNoZWNrYm94XFxcIj5cXHJcXG4gIDxsYWJlbCBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+XFxyXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcclxcbiAgICBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gICAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gICAgdmFsdWU9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxuICAgIG5nLWNoZWNrZWQ9XFxcImRhdGFbY29tcG9uZW50LmtleV0gPT09ICd0cnVlJ1xcXCJcXHJcXG4gICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbiAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxyXFxuICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbiAgICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIj5cXHJcXG4gICAge3sgY29tcG9uZW50LmxhYmVsIH19XFxyXFxuICA8L2xhYmVsPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NvbHVtbnMnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdDb2x1bW5zJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBjb2x1bW5zOiBbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTZcXFwiIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbXBvbmVudC5jb2x1bW5zXFxcIj5cXHJcXG4gICAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLnByb3ZpZGVyKCdmb3JtaW9Db21wb25lbnRzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcclxuICAgIHZhciBncm91cHMgPSB7XHJcbiAgICAgIF9fY29tcG9uZW50OiB7XHJcbiAgICAgICAgdGl0bGU6ICdCYXNpYyBDb21wb25lbnRzJ1xyXG4gICAgICB9LFxyXG4gICAgICBhZHZhbmNlZDoge1xyXG4gICAgICAgIHRpdGxlOiAnU3BlY2lhbCBDb21wb25lbnRzJ1xyXG4gICAgICB9LFxyXG4gICAgICBsYXlvdXQ6IHtcclxuICAgICAgICB0aXRsZTogJ0xheW91dCBDb21wb25lbnRzJ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWRkR3JvdXA6IGZ1bmN0aW9uIChuYW1lLCBncm91cCkge1xyXG4gICAgICAgIGdyb3Vwc1tuYW1lXSA9IGdyb3VwO1xyXG4gICAgICB9LFxyXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24gKHR5cGUsIGNvbXBvbmVudCwgZ3JvdXApIHtcclxuICAgICAgICBpZiAoIWNvbXBvbmVudHNbdHlwZV0pIHtcclxuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0gPSBjb21wb25lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgYW5ndWxhci5leHRlbmQoY29tcG9uZW50c1t0eXBlXSwgY29tcG9uZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgdHlwZSBmb3IgdGhpcyBjb21wb25lbnQuXHJcbiAgICAgICAgaWYgKCFjb21wb25lbnRzW3R5cGVdLmdyb3VwKSB7XHJcbiAgICAgICAgICBjb21wb25lbnRzW3R5cGVdLmdyb3VwID0gZ3JvdXAgfHwgJ19fY29tcG9uZW50JztcclxuICAgICAgICB9XHJcbiAgICAgICAgY29tcG9uZW50c1t0eXBlXS5zZXR0aW5ncy50eXBlID0gdHlwZTtcclxuICAgICAgfSxcclxuICAgICAgJGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzLFxyXG4gICAgICAgICAgZ3JvdXBzOiBncm91cHNcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBhcHAuZGlyZWN0aXZlKCdzYWZlTXVsdGlwbGVUb1NpbmdsZScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXHJcbiAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsLCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMucHVzaChmdW5jdGlvbiAobW9kZWxWYWx1ZSkge1xyXG4gICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlICYmIEFycmF5LmlzQXJyYXkobW9kZWxWYWx1ZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWVbMF0gfHwgJyc7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfV0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY29udGFpbmVyJywge1xyXG4gICAgICAgIHRpdGxlOiAnQ29udGFpbmVyJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbnRhaW5lci5odG1sJyxcclxuICAgICAgICBncm91cDogJ2xheW91dCcsXHJcbiAgICAgICAgaWNvbjogJ2ZhIGZhLWZvbGRlci1vcGVuJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0cmVlOiB0cnVlLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW10sXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdjb250YWluZXInLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9Db250YWluZXJDb21wb25lbnQnLCBbXHJcbiAgICAnJHNjb3BlJyxcclxuICAgIGZ1bmN0aW9uKCRzY29wZSkge1xyXG4gICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gfHwge307XHJcbiAgICAgICRzY29wZS5wYXJlbnRLZXkgPSAkc2NvcGUuY29tcG9uZW50LmtleTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGFpbmVyLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8ZGl2IG5nLWNvbnRyb2xsZXI9XFxcImZvcm1pb0NvbnRhaW5lckNvbXBvbmVudFxcXCIgY2xhc3M9XFxcImZvcm1pby1jb250YWluZXItY29tcG9uZW50XFxcIj5cXHJcXG4gIDxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVtwYXJlbnRLZXldXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb250ZW50Jywge1xyXG4gICAgICAgIHRpdGxlOiAnQ29udGVudCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jb250ZW50Lmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBodG1sOiAnJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgbmctYmluZC1odG1sPVxcXCJjb21wb25lbnQuaHRtbCB8IHNhZmVodG1sXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+PC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY3VzdG9tJywge1xyXG4gICAgICAgIHRpdGxlOiAnQ3VzdG9tJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2N1c3RvbS5odG1sJyxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge31cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY3VzdG9tLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtZGVmYXVsdFxcXCI+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5IHRleHQtbXV0ZWQgdGV4dC1jZW50ZXJcXFwiPlxcclxcbiAgICBDdXN0b20gQ29tcG9uZW50ICh7eyBjb21wb25lbnQudHlwZSB9fSlcXHJcXG4gIDwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZGF0YWdyaWQnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdEYXRhIEdyaWQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0YWdyaWQuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XHJcbiAgICAgICAgICB2YXIgdmlldyA9ICc8dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1zdHJpcGVkXCI+PHRoZWFkPjx0cj4nO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgdmlldyArPSAnPHRoPicgKyBjb21wb25lbnQubGFiZWwgKyAnPC90aD4nO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICB2aWV3ICs9ICc8L3RyPjwvdGhlYWQ+JztcclxuICAgICAgICAgIHZpZXcgKz0gJzx0Ym9keT4nO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICB2aWV3ICs9ICc8dHI+JztcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICB2aWV3ICs9ICc8dGQ+JyArIHJvd1tjb21wb25lbnQua2V5XSArICc8L3RkPic7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2aWV3ICs9ICc8L3RyPic7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHZpZXcgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xyXG4gICAgICAgICAgcmV0dXJuIHZpZXc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0cmVlOiB0cnVlLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW10sXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdkYXRhZ3JpZCcsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLmNvbnRyb2xsZXIoJ2Zvcm1pb0RhdGFHcmlkJywgW1xyXG4gICAgJyRzY29wZScsXHJcbiAgICBmdW5jdGlvbigkc2NvcGUpIHtcclxuICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFt7fV07XHJcblxyXG4gICAgICAkc2NvcGUuYWRkUm93ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gRW5zdXJlIHRoZSBvYmplY3QgaXMgaW5pdGlhbGl6ZWQgYXMgaXQgbWF5IGJlIHVuc2V0IG9uIGEgXCJSZXNldFwiLlxyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0pKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnB1c2goe30pO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgJHNjb3BlLnJlbW92ZVJvdyA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2RhdGFncmlkLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJmb3JtaW8tZGF0YS1ncmlkXFxcIiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9EYXRhR3JpZFxcXCIgPlxcclxcbiAgPHRhYmxlIG5nLWNsYXNzPVxcXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgJ3RhYmxlLWJvcmRlcmVkJzogY29tcG9uZW50LmJvcmRlcmVkLCAndGFibGUtaG92ZXInOiBjb21wb25lbnQuaG92ZXIsICd0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVxcXCIgY2xhc3M9XFxcInRhYmxlIGRhdGFncmlkLXRhYmxlXFxcIj5cXHJcXG4gICAgPHRyPlxcclxcbiAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCI+e3sgY29tcG9uZW50LmxhYmVsfX08L3RoPlxcclxcbiAgICAgIDx0aD48L3RoPlxcclxcbiAgICA8L3RyPlxcclxcbiAgICA8dHIgY2xhc3M9XFxcImZvcm1pby1kYXRhLWdyaWQtcm93XFxcIiBuZy1yZXBlYXQ9XFxcInJvd0RhdGEgaW4gZGF0YVtjb21wb25lbnQua2V5XSB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCIgbmctaW5pdD1cXFwiY29tcG9uZW50LmhpZGVMYWJlbCA9IHRydWVcXFwiID5cXHJcXG4gICAgICAgIDxmb3JtaW8tY29tcG9uZW50IGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJyb3dEYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgICAgIDwvdGQ+XFxyXFxuICAgICAgPHRkPlxcclxcbiAgICAgICAgPGEgbmctY2xpY2s9XFxcInJlbW92ZVJvdygkaW5kZXgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5cXHJcXG4gICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVxcXCI+PC9zcGFuPlxcclxcbiAgICAgICAgPC9hPlxcclxcbiAgICAgIDwvdGQ+XFxyXFxuICAgIDwvdHI+XFxyXFxuICA8L3RhYmxlPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiZGF0YWdyaWQtYWRkXFxcIj5cXHJcXG4gICAgPGEgbmctY2xpY2s9XFxcImFkZFJvdygpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj5cXHJcXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiB7eyBjb21wb25lbnQuYWRkQW5vdGhlciB8fCBcXFwiQWRkIEFub3RoZXJcXFwiIH19XFxyXFxuICAgIDwvYT5cXHJcXG4gIDwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2RhdGV0aW1lJywge1xyXG4gICAgICAgIHRpdGxlOiAnRGF0ZSAvIFRpbWUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSkge1xyXG4gICAgICAgICAgcmV0dXJuICRpbnRlcnBvbGF0ZSgnPHNwYW4+e3sgXCInICsgZGF0YSArICdcIiB8IGRhdGU6IFwiJyArIGNvbXBvbmVudC5mb3JtYXQgKyAnXCIgfX08L3NwYW4+JykoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ2RhdGV0aW1lRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgZm9ybWF0OiAneXl5eS1NTS1kZCBISDptbScsXHJcbiAgICAgICAgICBlbmFibGVEYXRlOiB0cnVlLFxyXG4gICAgICAgICAgZW5hYmxlVGltZTogdHJ1ZSxcclxuICAgICAgICAgIG1pbkRhdGU6IG51bGwsXHJcbiAgICAgICAgICBtYXhEYXRlOiBudWxsLFxyXG4gICAgICAgICAgZGF0ZXBpY2tlck1vZGU6ICdkYXknLFxyXG4gICAgICAgICAgZGF0ZVBpY2tlcjoge1xyXG4gICAgICAgICAgICBzaG93V2Vla3M6IHRydWUsXHJcbiAgICAgICAgICAgIHN0YXJ0aW5nRGF5OiAwLFxyXG4gICAgICAgICAgICBpbml0RGF0ZTogJycsXHJcbiAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknLFxyXG4gICAgICAgICAgICBtYXhNb2RlOiAneWVhcicsXHJcbiAgICAgICAgICAgIHllYXJSYW5nZTogJzIwJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRpbWVQaWNrZXI6IHtcclxuICAgICAgICAgICAgaG91clN0ZXA6IDEsXHJcbiAgICAgICAgICAgIG1pbnV0ZVN0ZXA6IDEsXHJcbiAgICAgICAgICAgIHNob3dNZXJpZGlhbjogdHJ1ZSxcclxuICAgICAgICAgICAgcmVhZG9ubHlJbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICAgIG1vdXNld2hlZWw6IHRydWUsXHJcbiAgICAgICAgICAgIGFycm93a2V5czogdHJ1ZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBjdXN0b206ICcnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWdyb3VwXFxcIj5cXHJcXG4gIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcclxcbiAgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxuICBuZy1mb2N1cz1cXFwiY2FsZW5kYXJPcGVuID0gdHJ1ZVxcXCJcXHJcXG4gIG5nLWNsaWNrPVxcXCJjYWxlbmRhck9wZW4gPSB0cnVlXFxcIlxcclxcbiAgbmctaW5pdD1cXFwiY2FsZW5kYXJPcGVuID0gZmFsc2VcXFwiXFxyXFxuICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxyXFxuICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcclxcbiAgaXMtb3Blbj1cXFwiY2FsZW5kYXJPcGVuXFxcIlxcclxcbiAgZGF0ZXRpbWUtcGlja2VyPVxcXCJ7eyBjb21wb25lbnQuZm9ybWF0IH19XFxcIlxcclxcbiAgbWluLWRhdGU9XFxcImNvbXBvbmVudC5taW5EYXRlXFxcIlxcclxcbiAgbWF4LWRhdGU9XFxcImNvbXBvbmVudC5tYXhEYXRlXFxcIlxcclxcbiAgZGF0ZXBpY2tlci1tb2RlPVxcXCJjb21wb25lbnQuZGF0ZXBpY2tlck1vZGVcXFwiXFxyXFxuICBlbmFibGUtZGF0ZT1cXFwiY29tcG9uZW50LmVuYWJsZURhdGVcXFwiXFxyXFxuICBlbmFibGUtdGltZT1cXFwiY29tcG9uZW50LmVuYWJsZVRpbWVcXFwiXFxyXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXHJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiXFxyXFxuICBkYXRlcGlja2VyLW9wdGlvbnM9XFxcImNvbXBvbmVudC5kYXRlUGlja2VyXFxcIlxcclxcbiAgdGltZXBpY2tlci1vcHRpb25zPVxcXCJjb21wb25lbnQudGltZVBpY2tlclxcXCIgLz5cXHJcXG4gIDxzcGFuIGNsYXNzPVxcXCJpbnB1dC1ncm91cC1idG5cXFwiPlxcclxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBuZy1jbGljaz1cXFwiY2FsZW5kYXJPcGVuID0gdHJ1ZVxcXCI+XFxyXFxuICAgICAgPGkgbmctaWY9XFxcImNvbXBvbmVudC5lbmFibGVEYXRlXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jYWxlbmRhclxcXCI+PC9pPlxcclxcbiAgICAgIDxpIG5nLWlmPVxcXCIhY29tcG9uZW50LmVuYWJsZURhdGVcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXRpbWVcXFwiPjwvaT5cXHJcXG4gICAgPC9idXR0b24+XFxyXFxuICA8L3NwYW4+XFxyXFxuPC9kaXY+XFxyXFxuXFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZW1haWwnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdFbWFpbCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgaW5wdXRUeXBlOiAnZW1haWwnLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnZW1haWxGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBwcmVmaXg6ICcnLFxyXG4gICAgICAgICAgc3VmZml4OiAnJyxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdmaWVsZHNldCcsIHtcclxuICAgICAgICB0aXRsZTogJ0ZpZWxkIFNldCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9maWVsZHNldC5odG1sJyxcclxuICAgICAgICBncm91cDogJ2xheW91dCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiBmYWxzZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxlZ2VuZDogJycsXHJcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZmllbGRzZXQuaHRtbCcsXHJcbiAgICAgICAgXCI8ZmllbGRzZXQgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcclxcbiAgPGxlZ2VuZCBuZy1pZj1cXFwiY29tcG9uZW50LmxlZ2VuZFxcXCI+e3sgY29tcG9uZW50LmxlZ2VuZCB9fTwvbGVnZW5kPlxcclxcbiAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbjwvZmllbGRzZXQ+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZmlsZScsIHtcclxuICAgICAgICB0aXRsZTogJ0ZpbGUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZmlsZS5odG1sJyxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdmaWxlJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRmlsZUxpc3QnLCBbZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICBzY29wZToge1xyXG4gICAgICAgIGZpbGVzOiAnPScsXHJcbiAgICAgICAgZm9ybTogJz0nLFxyXG4gICAgICAgIHJlYWRPbmx5OiAnPSdcclxuICAgICAgfSxcclxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50cy9mb3JtaW8tZmlsZS1saXN0Lmh0bWwnLFxyXG4gICAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICAgJyRzY29wZScsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRzY29wZSkge1xyXG4gICAgICAgICAgJHNjb3BlLnJlbW92ZUZpbGUgPSBmdW5jdGlvbiAoZXZlbnQsIGluZGV4KSB7XHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICRzY29wZS5maWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAkc2NvcGUuZmlsZVNpemUgPSBmdW5jdGlvbiAoYSwgYiwgYywgZCwgZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gKGIgPSBNYXRoLCBjID0gYi5sb2csIGQgPSAxMDI0LCBlID0gYyhhKSAvIGMoZCkgfCAwLCBhIC8gYi5wb3coZCwgZSkpLnRvRml4ZWQoMikgKyAnICcgKyAoZSA/ICdrTUdUUEVaWSdbLS1lXSArICdCJyA6ICdCeXRlcycpO1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfV0pO1xyXG5cclxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9GaWxlJywgW2Z1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBmaWxlOiAnPScsXHJcbiAgICAgICAgZm9ybTogJz0nXHJcbiAgICAgIH0sXHJcbiAgICAgIHRlbXBsYXRlOiAnPGEgaHJlZj1cInt7IGZpbGUudXJsIH19XCIgbmctY2xpY2s9XCJnZXRGaWxlKCRldmVudClcIiB0YXJnZXQ9XCJfYmxhbmtcIj57eyBmaWxlLm5hbWUgfX08L2E+JyxcclxuICAgICAgY29udHJvbGxlcjogW1xyXG4gICAgICAgICckc2NvcGUnLFxyXG4gICAgICAgICdGb3JtaW9QbHVnaW5zJyxcclxuICAgICAgICBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgICBGb3JtaW9QbHVnaW5zXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZ2V0RmlsZSA9IGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgdmFyIHBsdWdpbiA9IEZvcm1pb1BsdWdpbnMoJ3N0b3JhZ2UnLCAkc2NvcGUuZmlsZS5zdG9yYWdlKTtcclxuICAgICAgICAgICAgaWYgKHBsdWdpbikge1xyXG4gICAgICAgICAgICAgIHBsdWdpbi5kb3dubG9hZEZpbGUoZXZ0LCAkc2NvcGUuZmlsZSwgJHNjb3BlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfV0pO1xyXG5cclxuICBhcHAuY29udHJvbGxlcignZm9ybWlvRmlsZVVwbG9hZCcsIFtcclxuICAgICckc2NvcGUnLFxyXG4gICAgJ0Zvcm1pb1BsdWdpbnMnLFxyXG4gICAgZnVuY3Rpb24oXHJcbiAgICAgICRzY29wZSxcclxuICAgICAgRm9ybWlvUGx1Z2luc1xyXG4gICAgKSB7XHJcbiAgICAgICRzY29wZS5maWxlVXBsb2FkcyA9IHt9O1xyXG5cclxuICAgICAgJHNjb3BlLnJlbW92ZVVwbG9hZCA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICAgICAgZGVsZXRlICRzY29wZS5maWxlVXBsb2Fkc1tpbmRleF07XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBUaGlzIGZpeGVzIG5ldyBmaWVsZHMgaGF2aW5nIGFuIGVtcHR5IHNwYWNlIGluIHRoZSBhcnJheS5cclxuICAgICAgaWYgKCRzY29wZS5kYXRhICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9PT0gJycpIHtcclxuICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoJHNjb3BlLmRhdGEgJiYgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldWzBdID09PSAnJykge1xyXG4gICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5zcGxpY2UoMCwgMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgICRzY29wZS51cGxvYWQgPSBmdW5jdGlvbihmaWxlcykge1xyXG4gICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2UgJiYgZmlsZXMgJiYgZmlsZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICB2YXIgcGx1Z2luID0gRm9ybWlvUGx1Z2lucygnc3RvcmFnZScsICRzY29wZS5jb21wb25lbnQuc3RvcmFnZSk7XHJcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uKGZpbGUpIHtcclxuICAgICAgICAgICAgaWYgKHBsdWdpbikge1xyXG4gICAgICAgICAgICAgICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlLm5hbWVdID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgc2l6ZTogZmlsZS5zaXplLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAnaW5mbycsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU3RhcnRpbmcgdXBsb2FkJ1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgcGx1Z2luLnVwbG9hZEZpbGUoZmlsZSwgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGUubmFtZV0sICRzY29wZSlcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGZpbGVJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZS5uYW1lXTtcclxuICAgICAgICAgICAgICAgICAgZmlsZUluZm8uc3RvcmFnZSA9ICRzY29wZS5jb21wb25lbnQuc3RvcmFnZTtcclxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnB1c2goZmlsZUluZm8pO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlLm5hbWVdLnN0YXR1cyA9ICdlcnJvcic7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlLm5hbWVdLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGUubmFtZV0ucHJvZ3Jlc3M7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZS5uYW1lXSA9IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZSxcclxuICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTdG9yYWdlIHBsdWdpbiBub3QgZm91bmQnXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uIChcclxuICAgICAgJHRlbXBsYXRlQ2FjaGVcclxuICAgICkge1xyXG5cclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9mb3JtaW8tZmlsZS1saXN0Lmh0bWwnLFxyXG4gICAgICAgIFwiPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWJvcmRlcmVkXFxcIj5cXHJcXG4gIDx0aGVhZD5cXHJcXG4gICAgPHRyPlxcclxcbiAgICAgIDx0ZCBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6MSU7d2hpdGUtc3BhY2U6bm93cmFwO1xcXCI+PC90ZD5cXHJcXG4gICAgICA8dGg+RmlsZSBOYW1lPC90aD5cXHJcXG4gICAgICA8dGg+U2l6ZTwvdGg+XFxyXFxuICAgIDwvdHI+XFxyXFxuICA8L3RoZWFkPlxcclxcbiAgPHRib2R5PlxcclxcbiAgICA8dHIgbmctcmVwZWF0PVxcXCJmaWxlIGluIGZpbGVzIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxyXFxuICAgICAgPHRkIG5nLWlmPVxcXCIhcmVhZE9ubHlcXFwiIHN0eWxlPVxcXCJ3aWR0aDoxJTt3aGl0ZS1zcGFjZTpub3dyYXA7XFxcIj48YSBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBocmVmPVxcXCIjXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlRmlsZSgkZXZlbnQsICRpbmRleClcXFwiIHN0eWxlPVxcXCJwYWRkaW5nOiAycHggNHB4O1xcXCIgY2xhc3M9XFxcImJ0biBidG4tc20gYnRuLWRlZmF1bHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZVxcXCI+PC9zcGFuPjwvYT48L3RkPlxcclxcbiAgICAgIDx0ZD48Zm9ybWlvLWZpbGUgZmlsZT1cXFwiZmlsZVxcXCIgZm9ybT1cXFwiZm9ybVxcXCI+PC9mb3JtaW8tZmlsZT48L3RkPlxcclxcbiAgICAgIDx0ZD57eyBmaWxlU2l6ZShmaWxlLnNpemUpIH19PC90ZD5cXHJcXG4gICAgPC90cj5cXHJcXG4gIDwvdGJvZHk+XFxyXFxuPC90YWJsZT5cXHJcXG5cIlxyXG4gICAgICApO1xyXG5cclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9maWxlLmh0bWwnLFxyXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIH19PC9sYWJlbD5cXHJcXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuPGRpdiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9GaWxlVXBsb2FkXFxcIj5cXHJcXG4gIDxmb3JtaW8tZmlsZS1saXN0IGZpbGVzPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBmb3JtPVxcXCJmb3JtaW8uZm9ybVVybFxcXCI+PC9mb3JtaW8tZmlsZS1saXN0PlxcclxcbiAgPGRpdiBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIj5cXHJcXG4gICAgPGRpdiBuZ2YtZHJvcD1cXFwidXBsb2FkKCRmaWxlcylcXFwiIGNsYXNzPVxcXCJmaWxlU2VsZWN0b3JcXFwiIG5nZi1kcmFnLW92ZXItY2xhc3M9XFxcIidmaWxlRHJhZ092ZXInXFxcIiBuZ2YtbXVsdGlwbGU9XFxcImNvbXBvbmVudC5tdWx0aXBsZVxcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tY2xvdWQtdXBsb2FkXFxcIj48L3NwYW4+RHJvcCBmaWxlcyB0byBhdHRhY2gsIG9yIDxhIGhyZWY9XFxcIiNcXFwiIG5nZi1zZWxlY3Q9XFxcInVwbG9hZCgkZmlsZXMpXFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIG5nZi1tdWx0aXBsZT1cXFwiY29tcG9uZW50Lm11bHRpcGxlXFxcIj5icm93c2U8L2E+LjwvZGl2PlxcclxcbiAgICA8ZGl2IG5nLWlmPVxcXCIhY29tcG9uZW50LnN0b3JhZ2VcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC13YXJuaW5nXFxcIj5ObyBzdG9yYWdlIGhhcyBiZWVuIHNldCBmb3IgdGhpcyBmaWVsZC4gRmlsZSB1cGxvYWRzIGFyZSBkaXNhYmxlZCB1bnRpbCBzdG9yYWdlIGlzIHNldCB1cC48L2Rpdj5cXHJcXG4gICAgPGRpdiBuZ2Ytbm8tZmlsZS1kcm9wPkZpbGUgRHJhZy9Ecm9wIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHRoaXMgYnJvd3NlcjwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiZmlsZVVwbG9hZCBpbiBmaWxlVXBsb2FkcyB0cmFjayBieSAkaW5kZXhcXFwiIG5nLWNsYXNzPVxcXCJ7J2hhcy1lcnJvcic6IGZpbGVVcGxvYWQuc3RhdHVzID09PSAnZXJyb3InfVxcXCIgY2xhc3M9XFxcImZpbGVcXFwiPlxcclxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImZpbGVOYW1lIGNvbnRyb2wtbGFiZWwgY29sLXNtLTEwXFxcIj57eyBmaWxlVXBsb2FkLm5hbWUgfX0gPHNwYW4gbmctY2xpY2s9XFxcInJlbW92ZVVwbG9hZChmaWxlVXBsb2FkLm5hbWUpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiPjwvc3Bhbj48L2Rpdj5cXHJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJmaWxlU2l6ZSBjb250cm9sLWxhYmVsIGNvbC1zbS0yIHRleHQtcmlnaHRcXFwiPnt7IGZpbGVTaXplKGZpbGVVcGxvYWQuc2l6ZSkgfX08L2Rpdj5cXHJcXG4gICAgPC9kaXY+XFxyXFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxyXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyXFxcIj5cXHJcXG4gICAgICAgIDxzcGFuIG5nLWlmPVxcXCJmaWxlVXBsb2FkLnN0YXR1cyA9PT0gJ3Byb2dyZXNzJ1xcXCI+XFxyXFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj5cXHJcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXJcXFwiIHJvbGU9XFxcInByb2dyZXNzYmFyXFxcIiBhcmlhLXZhbHVlbm93PVxcXCJ7e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fVxcXCIgYXJpYS12YWx1ZW1pbj1cXFwiMFxcXCIgYXJpYS12YWx1ZW1heD1cXFwiMTAwXFxcIiBzdHlsZT1cXFwid2lkdGg6e3tmaWxlVXBsb2FkLnByb2dyZXNzfX0lXFxcIj5cXHJcXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJzci1vbmx5XFxcIj57e2ZpbGVVcGxvYWQucHJvZ3Jlc3N9fSUgQ29tcGxldGU8L3NwYW4+XFxyXFxuICAgICAgICAgICAgPC9kaXY+XFxyXFxuICAgICAgICAgIDwvZGl2PlxcclxcbiAgICAgICAgPC9zcGFuPlxcclxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwiIWZpbGVVcGxvYWQuc3RhdHVzICE9PSAncHJvZ3Jlc3MnXFxcIiBjbGFzcz1cXFwiYmcte3sgZmlsZVVwbG9hZC5zdGF0dXMgfX0gY29udHJvbC1sYWJlbFxcXCI+e3sgZmlsZVVwbG9hZC5tZXNzYWdlIH19PC9kaXY+XFxyXFxuICAgICAgPC9kaXY+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignaGlkZGVuJywge1xyXG4gICAgICAgIHRpdGxlOiAnSGlkZGVuJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2hpZGRlbi5odG1sJyxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBrZXk6ICdoaWRkZW5GaWVsZCcsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2hpZGRlbi5odG1sJyxcclxuICAgICAgICBcIjxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCI+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0h0bWxFbGVtZW50JywgW1xyXG4gICAgJyRzYW5pdGl6ZScsXHJcbiAgICBmdW5jdGlvbigkc2FuaXRpemUpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICBjb21wb25lbnQ6ICc9J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50cy9odG1sZWxlbWVudC1kaXJlY3RpdmUuaHRtbCcsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XHJcbiAgICAgICAgICB2YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudChcclxuICAgICAgICAgICAgICAnPCcgKyAkc2NvcGUuY29tcG9uZW50LnRhZyArICc+JyArICc8LycgKyAkc2NvcGUuY29tcG9uZW50LnRhZyArICc+J1xyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgZWxlbWVudC5odG1sKCRzY29wZS5jb21wb25lbnQuY29udGVudCk7XHJcblxyXG4gICAgICAgICAgICBlbGVtZW50LmF0dHIoJ2NsYXNzJywgJHNjb3BlLmNvbXBvbmVudC5jbGFzc05hbWUpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudC5hdHRycywgZnVuY3Rpb24oYXR0cikge1xyXG4gICAgICAgICAgICAgIGlmICghYXR0ci5hdHRyKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKGF0dHIuYXR0ciwgYXR0ci52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAkc2NvcGUuaHRtbCA9ICRzYW5pdGl6ZShlbGVtZW50LnByb3AoJ291dGVySFRNTCcpKTtcclxuICAgICAgICAgICAgICAkc2NvcGUucGFyc2VFcnJvciA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgIC8vIElzb2xhdGUgdGhlIG1lc3NhZ2UgYW5kIHN0b3JlIGl0LlxyXG4gICAgICAgICAgICAgICRzY29wZS5wYXJzZUVycm9yID0gZXJyLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAuc3BsaXQoJ1xcbicpWzBdXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoJ1skc2FuaXRpemU6YmFkcGFyc2VdJywgJycpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBjcmVhdGVFbGVtZW50KCk7XHJcblxyXG4gICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY29tcG9uZW50JywgY3JlYXRlRWxlbWVudCwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gIH1dKTtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdodG1sZWxlbWVudCcsIHtcclxuICAgICAgICB0aXRsZTogJ0hUTUwgRWxlbWVudCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9odG1sZWxlbWVudC5odG1sJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgdGFnOiAncCcsXHJcbiAgICAgICAgICBhdHRyczogW10sXHJcbiAgICAgICAgICBjbGFzc05hbWU6ICcnLFxyXG4gICAgICAgICAgY29udGVudDogJydcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9odG1sZWxlbWVudC5odG1sJyxcclxuICAgICAgICAnPGZvcm1pby1odG1sLWVsZW1lbnQgY29tcG9uZW50PVwiY29tcG9uZW50XCI+PC9kaXY+J1xyXG4gICAgICApO1xyXG5cclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9odG1sZWxlbWVudC1kaXJlY3RpdmUuaHRtbCcsXHJcbiAgICAgICAgXCI8ZGl2IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXHJcXG4gIDxkaXYgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcXFwiIG5nLWlmPVxcXCJwYXJzZUVycm9yXFxcIj57eyBwYXJzZUVycm9yIH19PC9kaXY+XFxyXFxuICA8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiaHRtbFxcXCI+PC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2Zvcm1pbycpO1xyXG5cclxuLy8gQmFzaWNcclxucmVxdWlyZSgnLi9jb21wb25lbnRzJykoYXBwKTtcclxucmVxdWlyZSgnLi90ZXh0ZmllbGQnKShhcHApO1xyXG5yZXF1aXJlKCcuL251bWJlcicpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcGFzc3dvcmQnKShhcHApO1xyXG5yZXF1aXJlKCcuL3RleHRhcmVhJykoYXBwKTtcclxucmVxdWlyZSgnLi9jaGVja2JveCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vc2VsZWN0Ym94ZXMnKShhcHApO1xyXG5yZXF1aXJlKCcuL3NlbGVjdCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcmFkaW8nKShhcHApO1xyXG5yZXF1aXJlKCcuL2h0bWxlbGVtZW50JykoYXBwKTtcclxucmVxdWlyZSgnLi9jb250ZW50JykoYXBwKTtcclxucmVxdWlyZSgnLi9idXR0b24nKShhcHApO1xyXG5cclxuLy8gU3BlY2lhbFxyXG5yZXF1aXJlKCcuL2VtYWlsJykoYXBwKTtcclxucmVxdWlyZSgnLi9waG9uZW51bWJlcicpKGFwcCk7XHJcbnJlcXVpcmUoJy4vYWRkcmVzcycpKGFwcCk7XHJcbnJlcXVpcmUoJy4vZGF0ZXRpbWUnKShhcHApO1xyXG5yZXF1aXJlKCcuL2hpZGRlbicpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcmVzb3VyY2UnKShhcHApO1xyXG5yZXF1aXJlKCcuL2ZpbGUnKShhcHApO1xyXG5yZXF1aXJlKCcuL3NpZ25hdHVyZScpKGFwcCk7XHJcbnJlcXVpcmUoJy4vY3VzdG9tJykoYXBwKTtcclxuXHJcbi8vIExheW91dFxyXG5yZXF1aXJlKCcuL2NvbHVtbnMnKShhcHApO1xyXG5yZXF1aXJlKCcuL2ZpZWxkc2V0JykoYXBwKTtcclxucmVxdWlyZSgnLi9jb250YWluZXInKShhcHApO1xyXG5yZXF1aXJlKCcuL2RhdGFncmlkJykoYXBwKTtcclxucmVxdWlyZSgnLi9wYWdlJykoYXBwKTtcclxucmVxdWlyZSgnLi9wYW5lbCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vdGFibGUnKShhcHApO1xyXG5yZXF1aXJlKCcuL3dlbGwnKShhcHApO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignbnVtYmVyJywge1xyXG4gICAgICAgIHRpdGxlOiAnTnVtYmVyJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL251bWJlci5odG1sJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBpbnB1dFR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnbnVtYmVyRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgcHJlZml4OiAnJyxcclxuICAgICAgICAgIHN1ZmZpeDogJycsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IDAsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgbWluOiAnJyxcclxuICAgICAgICAgICAgbWF4OiAnJyxcclxuICAgICAgICAgICAgc3RlcDogJ2FueScsXHJcbiAgICAgICAgICAgIGludGVnZXI6ICcnLFxyXG4gICAgICAgICAgICBtdWx0aXBsZTogJycsXHJcbiAgICAgICAgICAgIGN1c3RvbTogJydcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvbnVtYmVyLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8aW5wdXQgdHlwZT1cXFwie3sgY29tcG9uZW50LmlucHV0VHlwZSB9fVxcXCJcXHJcXG5jbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcclxcbmlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbm5hbWU9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxudGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbm5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbm5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxyXFxubmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcclxcbnNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxyXFxubWluPVxcXCJ7eyBjb21wb25lbnQudmFsaWRhdGUubWluIH19XFxcIlxcclxcbm1heD1cXFwie3sgY29tcG9uZW50LnZhbGlkYXRlLm1heCB9fVxcXCJcXHJcXG5zdGVwPVxcXCJ7eyBjb21wb25lbnQudmFsaWRhdGUuc3RlcCB9fVxcXCJcXHJcXG5wbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIlxcclxcbmN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxyXFxudWktbWFzaz1cXFwie3sgY29tcG9uZW50LmlucHV0TWFzayB9fVxcXCJcXHJcXG51aS1tYXNrLXBsYWNlaG9sZGVyPVxcXCJcXFwiXFxyXFxudWktb3B0aW9ucz1cXFwidWlNYXNrT3B0aW9uc1xcXCJcXHJcXG4+XFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3BhZ2UnLCB7XHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9wYWdlLmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcGFnZS5odG1sJyxcclxuICAgICAgICBcIjxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVxcXCIgZm9ybWlvPVxcXCJmb3JtaW9cXFwiPjwvZm9ybWlvLWNvbXBvbmVudD5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYW5lbCcsIHtcclxuICAgICAgICB0aXRsZTogJ1BhbmVsJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3BhbmVsLmh0bWwnLFxyXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgdGl0bGU6ICcnLFxyXG4gICAgICAgICAgdGhlbWU6ICdkZWZhdWx0JyxcclxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9wYW5lbC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXt7IGNvbXBvbmVudC50aGVtZSB9fVxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcclxcbiAgPGRpdiBuZy1pZj1cXFwiY29tcG9uZW50LnRpdGxlXFxcIiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+XFxyXFxuICAgIDxoMyBjbGFzcz1cXFwicGFuZWwtdGl0bGVcXFwiPnt7IGNvbXBvbmVudC50aXRsZSB9fTwvaDM+XFxyXFxuICA8L2Rpdj5cXHJcXG4gIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHlcXFwiPlxcclxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm1pbz1cXFwiZm9ybWlvXFxcIiByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIj48L2Zvcm1pby1jb21wb25lbnQ+XFxyXFxuICA8L2Rpdj5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3Bhc3N3b3JkJywge1xyXG4gICAgICAgIHRpdGxlOiAnUGFzc3dvcmQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuICctLS0gUFJPVEVDVEVEIC0tLSc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IGZhbHNlLFxyXG4gICAgICAgICAgaW5wdXRUeXBlOiAncGFzc3dvcmQnLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAncGFzc3dvcmRGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBwcmVmaXg6ICcnLFxyXG4gICAgICAgICAgc3VmZml4OiAnJyxcclxuICAgICAgICAgIHByb3RlY3RlZDogdHJ1ZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3Bob25lTnVtYmVyJywge1xyXG4gICAgICAgIHRpdGxlOiAnUGhvbmUgTnVtYmVyJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJyxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBpbnB1dE1hc2s6ICcoOTk5KSA5OTktOTk5OScsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdwaG9uZW51bWJlckZpZWxkJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIHByZWZpeDogJycsXHJcbiAgICAgICAgICBzdWZmaXg6ICcnLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdyYWRpbycsIHtcclxuICAgICAgICB0aXRsZTogJ1JhZGlvJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3JhZGlvLmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ3JhZGlvJyxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ3JhZGlvRmllbGQnLFxyXG4gICAgICAgICAgdmFsdWVzOiBbXSxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgY3VzdG9tOiAnJyxcclxuICAgICAgICAgICAgY3VzdG9tUHJpdmF0ZTogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSwgRm9ybWlvVXRpbHMpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yYWRpby5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxyXG4gICAgICAgIFwiPGRpdiBuZy1jbGFzcz1cXFwiY29tcG9uZW50LmlubGluZSA/ICdyYWRpby1pbmxpbmUnIDogJ3JhZGlvJ1xcXCIgbmctcmVwZWF0PVxcXCJ2IGluIGNvbXBvbmVudC52YWx1ZXMgdHJhY2sgYnkgJGluZGV4XFxcIj5cXHJcXG4gIDxsYWJlbCBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgZm9yPVxcXCJ7eyB2LnZhbHVlIH19XFxcIj5cXHJcXG4gICAgPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxyXFxuICAgIGlkPVxcXCJ7eyB2LnZhbHVlIH19XFxcIlxcclxcbiAgICBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbiAgICB2YWx1ZT1cXFwie3sgdi52YWx1ZSB9fVxcXCJcXHJcXG4gICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbiAgICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXHJcXG4gICAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXHJcXG4gICAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcclxcbiAgICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIj5cXHJcXG4gICAge3sgdi5sYWJlbCB9fVxcclxcbiAgPC9sYWJlbD5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgICApKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmVzb3VyY2UnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdSZXNvdXJjZScsXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbiAoZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUpIHtcclxuICAgICAgICAgIGlmICgkaW50ZXJwb2xhdGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuICRpbnRlcnBvbGF0ZShjb21wb25lbnQudGVtcGxhdGUpKHtpdGVtOiBkYXRhfSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyBkYXRhLl9pZCA6ICcnO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uICgkc2NvcGUpIHtcclxuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgZnVuY3Rpb24gKCRzY29wZSwgRm9ybWlvKSB7XHJcbiAgICAgICAgICB2YXIgc2V0dGluZ3MgPSAkc2NvcGUuY29tcG9uZW50O1xyXG4gICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XHJcbiAgICAgICAgICBpZiAoc2V0dGluZ3MubXVsdGlwbGUpIHtcclxuICAgICAgICAgICAgc2V0dGluZ3MuZGVmYXVsdFZhbHVlID0gW107XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoc2V0dGluZ3MucmVzb3VyY2UpIHtcclxuICAgICAgICAgICAgdmFyIHVybCA9ICcnO1xyXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MucHJvamVjdCkge1xyXG4gICAgICAgICAgICAgIHVybCArPSAnL3Byb2plY3QvJyArIHNldHRpbmdzLnByb2plY3Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoJHNjb3BlLmZvcm1pbyAmJiAkc2NvcGUuZm9ybWlvLnByb2plY3RVcmwpIHtcclxuICAgICAgICAgICAgICB1cmwgKz0gJHNjb3BlLmZvcm1pby5wcm9qZWN0VXJsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHVybCArPSAnL2Zvcm0vJyArIHNldHRpbmdzLnJlc291cmNlO1xyXG4gICAgICAgICAgICB2YXIgZm9ybWlvID0gbmV3IEZvcm1pbyh1cmwpO1xyXG4gICAgICAgICAgICAkc2NvcGUucmVmcmVzaFN1Ym1pc3Npb25zID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHNldHRpbmdzLnBhcmFtcyB8fCB7fTtcclxuICAgICAgICAgICAgICAvLyBJZiB0aGV5IHdpc2ggdG8gcmV0dXJuIG9ubHkgc29tZSBmaWVsZHMuXHJcbiAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnNlbGVjdEZpZWxkcykge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1zLnNlbGVjdCA9IHNldHRpbmdzLnNlbGVjdEZpZWxkcztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnNlYXJjaEZpZWxkcyAmJiBpbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNldHRpbmdzLnNlYXJjaEZpZWxkcywgZnVuY3Rpb24gKGZpZWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHBhcmFtc1tmaWVsZF0gPSBpbnB1dDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBMb2FkIHRoZSBzdWJtaXNzaW9ucy5cclxuICAgICAgICAgICAgICBmb3JtaW8ubG9hZFN1Ym1pc3Npb25zKHtcclxuICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXHJcbiAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoc3VibWlzc2lvbnMpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IHN1Ym1pc3Npb25zIHx8IFtdO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hTdWJtaXNzaW9ucygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ3Jlc291cmNlRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgcmVzb3VyY2U6ICcnLFxyXG4gICAgICAgICAgcHJvamVjdDogJycsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxyXG4gICAgICAgICAgdGVtcGxhdGU6ICc8c3Bhbj57eyBpdGVtLmRhdGEgfX08L3NwYW4+JyxcclxuICAgICAgICAgIHNlbGVjdEZpZWxkczogJycsXHJcbiAgICAgICAgICBzZWFyY2hGaWVsZHM6ICcnLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBkZWZhdWx0UGVybWlzc2lvbjogJydcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS5odG1sJyxcclxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+XFxyXFxuPHNwYW4gbmctaWY9XFxcIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbjx1aS1zZWxlY3QgdWktc2VsZWN0LXJlcXVpcmVkIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlIHVpLXNlbGVjdC1vcGVuLW9uLWZvY3VzIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiB0aGVtZT1cXFwiYm9vdHN0cmFwXFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiPlxcclxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIj5cXHJcXG4gICAgPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cXFwiY29tcG9uZW50LnRlbXBsYXRlXFxcIiBpdGVtPVxcXCIkaXRlbSB8fCAkc2VsZWN0LnNlbGVjdGVkXFxcIiBzZWxlY3Q9XFxcIiRzZWxlY3RcXFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPlxcclxcbiAgPC91aS1zZWxlY3QtbWF0Y2g+XFxyXFxuICA8dWktc2VsZWN0LWNob2ljZXMgY2xhc3M9XFxcInVpLXNlbGVjdC1jaG9pY2VzXFxcIiByZXBlYXQ9XFxcIml0ZW0gaW4gc2VsZWN0SXRlbXMgfCBmaWx0ZXI6ICRzZWxlY3Quc2VhcmNoXFxcIiByZWZyZXNoPVxcXCJyZWZyZXNoU3VibWlzc2lvbnMoJHNlbGVjdC5zZWFyY2gpXFxcIiByZWZyZXNoLWRlbGF5PVxcXCIyNTBcXFwiPlxcclxcbiAgICA8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVxcXCJjb21wb25lbnQudGVtcGxhdGVcXFwiIGl0ZW09XFxcIml0ZW1cXFwiIHNlbGVjdD1cXFwiJHNlbGVjdFxcXCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+XFxyXFxuICA8L3VpLXNlbGVjdC1jaG9pY2VzPlxcclxcbjwvdWktc2VsZWN0Plxcclxcbjxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz5cXHJcXG5cIlxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gQ2hhbmdlIHRoZSB1aS1zZWxlY3QgdG8gdWktc2VsZWN0IG11bHRpcGxlLlxyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLW11bHRpcGxlLmh0bWwnLFxyXG4gICAgICAgICR0ZW1wbGF0ZUNhY2hlLmdldCgnZm9ybWlvL2NvbXBvbmVudHMvcmVzb3VyY2UuaHRtbCcpLnJlcGxhY2UoJzx1aS1zZWxlY3QnLCAnPHVpLXNlbGVjdCBtdWx0aXBsZScpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9TZWxlY3RJdGVtJywgW1xyXG4gICAgJyRjb21waWxlJyxcclxuICAgIGZ1bmN0aW9uICgkY29tcGlsZSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgIHRlbXBsYXRlOiAnPScsXHJcbiAgICAgICAgICBpdGVtOiAnPScsXHJcbiAgICAgICAgICBzZWxlY3Q6ICc9J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUudGVtcGxhdGUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5odG1sKCRjb21waWxlKGFuZ3VsYXIuZWxlbWVudChzY29wZS50ZW1wbGF0ZSkpKHNjb3BlKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAuZGlyZWN0aXZlKCd1aVNlbGVjdFJlcXVpcmVkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgdmFyIG9sZElzRW1wdHkgPSBuZ01vZGVsLiRpc0VtcHR5O1xyXG4gICAgICAgIG5nTW9kZWwuJGlzRW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgIHJldHVybiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB8fCBvbGRJc0VtcHR5KHZhbHVlKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICAvLyBBIGhhY2sgdG8gaGF2ZSB1aS1zZWxlY3Qgb3BlbiBvbiBmb2N1c1xyXG4gIGFwcC5kaXJlY3RpdmUoJ3VpU2VsZWN0T3Blbk9uRm9jdXMnLCBbJyR0aW1lb3V0JywgZnVuY3Rpb24gKCR0aW1lb3V0KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXF1aXJlOiAndWlTZWxlY3QnLFxyXG4gICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCBlbCwgYXR0cnMsIHVpU2VsZWN0KSB7XHJcbiAgICAgICAgdmFyIGNsb3NpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KHVpU2VsZWN0LmZvY3Vzc2VyKS5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoIWNsb3NpbmcpIHtcclxuICAgICAgICAgICAgdWlTZWxlY3QuYWN0aXZhdGUoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQmVjYXVzZSB1aS1zZWxlY3QgaW1tZWRpYXRlbHkgZm9jdXNlcyB0aGUgZm9jdXNzZXIgYWZ0ZXIgY2xvc2luZ1xyXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gbm90IHJlLWFjdGl2YXRlIGFmdGVyIGNsb3NpbmdcclxuICAgICAgICAkc2NvcGUuJG9uKCd1aXM6Y2xvc2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBjbG9zaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHsgLy8gSSdtIHNvIHNvcnJ5XHJcbiAgICAgICAgICAgIGNsb3NpbmcgPSBmYWxzZTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTtcclxuXHJcbiAgLy8gQ29uZmlndXJlIHRoZSBTZWxlY3QgY29tcG9uZW50LlxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignc2VsZWN0Jywge1xyXG4gICAgICAgIHRpdGxlOiAnU2VsZWN0JyxcclxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24gKCRzY29wZSkge1xyXG4gICAgICAgICAgcmV0dXJuICRzY29wZS5jb21wb25lbnQubXVsdGlwbGUgPyAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0LW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC5odG1sJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50LCAkaW50ZXJwb2xhdGUpIHtcclxuICAgICAgICAgIHZhciBnZXRJdGVtID0gZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGNvbXBvbmVudC5kYXRhU3JjKSB7XHJcbiAgICAgICAgICAgICAgY2FzZSAndmFsdWVzJzpcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5kYXRhLnZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0udmFsdWUgPT09IGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBkYXRhID0gaXRlbTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICAgICAgICBjYXNlICdqc29uJzpcclxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQudmFsdWVQcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0SXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbXMgPSBhbmd1bGFyLmZyb21Kc29uKGNvbXBvbmVudC5kYXRhLmpzb24pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zID0gW107XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1bY29tcG9uZW50LnZhbHVlUHJvcGVydHldID09PSBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgICAgICAgLy8gVE9ETzogaW1wbGVtZW50IHVybCBhbmQgcmVzb3VyY2Ugdmlldy5cclxuICAgICAgICAgICAgICBjYXNlICd1cmwnOlxyXG4gICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlJzpcclxuICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50Lm11bHRpcGxlICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGdldEl0ZW0pLnJlZHVjZShmdW5jdGlvbihwcmV2LCBpdGVtKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHZhbHVlO1xyXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJldHVybiAocHJldiA9PT0gJycgPyAnJyA6ICcsICcpICsgdmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtID0gZ2V0SXRlbShkYXRhKTtcclxuICAgICAgICAgICAgdmFyIHZhbHVlO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgdmFsdWUgPSAkaW50ZXJwb2xhdGUoY29tcG9uZW50LnRlbXBsYXRlKSh7aXRlbTogaXRlbX0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIHZhbHVlID0gaXRlbTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckaHR0cCcsICdGb3JtaW8nLCAnJGludGVycG9sYXRlJywgZnVuY3Rpb24gKCRzY29wZSwgJGh0dHAsIEZvcm1pbywgJGludGVycG9sYXRlKSB7XHJcbiAgICAgICAgICB2YXIgc2V0dGluZ3MgPSAkc2NvcGUuY29tcG9uZW50O1xyXG4gICAgICAgICAgJHNjb3BlLm5vd3JhcCA9IHRydWU7XHJcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBbXTtcclxuICAgICAgICAgIHZhciB2YWx1ZVByb3AgPSAkc2NvcGUuY29tcG9uZW50LnZhbHVlUHJvcGVydHk7XHJcbiAgICAgICAgICAkc2NvcGUuZ2V0U2VsZWN0SXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGF0YVNyYyA9PT0gJ3ZhbHVlcycpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gaXRlbS52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQWxsb3cgZG90IG5vdGF0aW9uIGluIHRoZSB2YWx1ZSBwcm9wZXJ0eS5cclxuICAgICAgICAgICAgaWYgKHZhbHVlUHJvcC5pbmRleE9mKCcuJykgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHBhcnRzID0gdmFsdWVQcm9wLnNwbGl0KCcuJyk7XHJcbiAgICAgICAgICAgICAgdmFyIHByb3AgPSBpdGVtO1xyXG4gICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcGFydHMpIHtcclxuICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wW3BhcnRzW2ldXTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVByb3AgPyBpdGVtW3ZhbHVlUHJvcF0gOiBpdGVtO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBpZiAoc2V0dGluZ3MubXVsdGlwbGUpIHtcclxuICAgICAgICAgICAgc2V0dGluZ3MuZGVmYXVsdFZhbHVlID0gW107XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcyA9IGFuZ3VsYXIubm9vcDtcclxuICAgICAgICAgICRzY29wZS4kb24oJ3JlZnJlc2hMaXN0JywgZnVuY3Rpb24oZXZlbnQsIHVybCwgaW5wdXQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcyhpbnB1dCwgdXJsKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIEFkZCBhIHdhdGNoIGlmIHRoZXkgd2lzaCB0byByZWZyZXNoIG9uIHNlbGVjdGlvbiBvZiBhbm90aGVyIGZpZWxkLlxyXG4gICAgICAgICAgaWYgKHNldHRpbmdzLnJlZnJlc2hPbikge1xyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhLicgKyBzZXR0aW5ncy5yZWZyZXNoT24sIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgc3dpdGNoIChzZXR0aW5ncy5kYXRhU3JjKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3ZhbHVlcyc6XHJcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gc2V0dGluZ3MuZGF0YS52YWx1ZXM7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2pzb24nOlxyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBhbmd1bGFyLmZyb21Kc29uKHNldHRpbmdzLmRhdGEuanNvbik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd1cmwnOlxyXG4gICAgICAgICAgICBjYXNlICdyZXNvdXJjZSc6XHJcbiAgICAgICAgICAgICAgdmFyIHVybCA9ICcnO1xyXG4gICAgICAgICAgICAgIHZhciBvcHRpb25zID0ge2NhY2hlOiB0cnVlfTtcclxuICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGF0YVNyYyA9PT0gJ3VybCcpIHtcclxuICAgICAgICAgICAgICAgIHVybCA9IHNldHRpbmdzLmRhdGEudXJsO1xyXG4gICAgICAgICAgICAgICAgaWYgKHVybC5zdWJzdHIoMCwgMSkgPT09ICcvJykge1xyXG4gICAgICAgICAgICAgICAgICB1cmwgPSBGb3JtaW8uZ2V0QmFzZVVybCgpICsgc2V0dGluZ3MuZGF0YS51cmw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBhdXRoIGZvciBvdXRnb2luZyByZXF1ZXN0cy5cclxuICAgICAgICAgICAgICAgIGlmICghc2V0dGluZ3MuYXV0aGVudGljYXRlICYmIHVybC5pbmRleE9mKEZvcm1pby5nZXRCYXNlVXJsKCkpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVKV1Q6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgUHJhZ21hOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBGb3JtaW8uZ2V0QmFzZVVybCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhdGEucHJvamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICB1cmwgKz0gJy9wcm9qZWN0LycgKyBzZXR0aW5ncy5kYXRhLnByb2plY3Q7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB1cmwgKz0gJy9mb3JtLycgKyBzZXR0aW5ncy5kYXRhLnJlc291cmNlICsgJy9zdWJtaXNzaW9uP2xpbWl0PTEwMDAnO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgaWYgKHVybCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcyA9IGZ1bmN0aW9uKGlucHV0LCBuZXdVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgbmV3VXJsID0gbmV3VXJsIHx8IHVybDtcclxuICAgICAgICAgICAgICAgICAgaWYgKCFuZXdVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBzZWFyY2gsIHRoZW4gYWRkIHRoYXQgdG8gdGhlIGZpbHRlci5cclxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLnNlYXJjaEZpZWxkICYmIGlucHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VXJsICs9ICgobmV3VXJsLmluZGV4T2YoJz8nKSA9PT0gLTEpID8gJz8nIDogJyYnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc2V0dGluZ3Muc2VhcmNoRmllbGQpICtcclxuICAgICAgICAgICAgICAgICAgICAgICc9JyArXHJcbiAgICAgICAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIG90aGVyIGZpbHRlci5cclxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWx0ZXIgPSAkaW50ZXJwb2xhdGUoc2V0dGluZ3MuZmlsdGVyKSh7ZGF0YTogJHNjb3BlLmRhdGF9KTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdVcmwgKz0gKChuZXdVcmwuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJicpICsgZmlsdGVyO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAkaHR0cC5nZXQobmV3VXJsLCBvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSByZXN1bHQuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hJdGVtcygpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBbXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XSxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdzZWxlY3RGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIHZhbHVlczogW10sXHJcbiAgICAgICAgICAgIGpzb246ICcnLFxyXG4gICAgICAgICAgICB1cmw6ICcnLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBkYXRhU3JjOiAndmFsdWVzJyxcclxuICAgICAgICAgIHZhbHVlUHJvcGVydHk6ICcnLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcclxuICAgICAgICAgIHJlZnJlc2hPbjogJycsXHJcbiAgICAgICAgICBmaWx0ZXI6ICcnLFxyXG4gICAgICAgICAgYXV0aGVudGljYXRlOiBmYWxzZSxcclxuICAgICAgICAgIHRlbXBsYXRlOiAnPHNwYW4+e3sgaXRlbS5sYWJlbCB9fTwvc3Bhbj4nLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCcsXHJcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIH19PC9sYWJlbD5cXHJcXG48c3BhbiBuZy1pZj1cXFwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFzdGVyaXNrIGZvcm0tY29udHJvbC1mZWVkYmFjayBmaWVsZC1yZXF1aXJlZC1pbmxpbmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuPHVpLXNlbGVjdCB1aS1zZWxlY3QtcmVxdWlyZWQgdWktc2VsZWN0LW9wZW4tb24tZm9jdXMgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlIG5hbWU9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCIgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCI+XFxyXFxuICA8dWktc2VsZWN0LW1hdGNoIGNsYXNzPVxcXCJ1aS1zZWxlY3QtbWF0Y2hcXFwiIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiPlxcclxcbiAgICA8Zm9ybWlvLXNlbGVjdC1pdGVtIHRlbXBsYXRlPVxcXCJjb21wb25lbnQudGVtcGxhdGVcXFwiIGl0ZW09XFxcIiRpdGVtIHx8ICRzZWxlY3Quc2VsZWN0ZWRcXFwiIHNlbGVjdD1cXFwiJHNlbGVjdFxcXCI+PC9mb3JtaW8tc2VsZWN0LWl0ZW0+XFxyXFxuICA8L3VpLXNlbGVjdC1tYXRjaD5cXHJcXG4gIDx1aS1zZWxlY3QtY2hvaWNlcyBjbGFzcz1cXFwidWktc2VsZWN0LWNob2ljZXNcXFwiIHJlcGVhdD1cXFwiZ2V0U2VsZWN0SXRlbShpdGVtKSBhcyBpdGVtIGluIHNlbGVjdEl0ZW1zIHwgZmlsdGVyOiAkc2VsZWN0LnNlYXJjaFxcXCIgcmVmcmVzaD1cXFwicmVmcmVzaEl0ZW1zKCRzZWxlY3Quc2VhcmNoKVxcXCIgcmVmcmVzaC1kZWxheT1cXFwiMjUwXFxcIj5cXHJcXG4gICAgPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cXFwiY29tcG9uZW50LnRlbXBsYXRlXFxcIiBpdGVtPVxcXCJpdGVtXFxcIiBzZWxlY3Q9XFxcIiRzZWxlY3RcXFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPlxcclxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXHJcXG48L3VpLXNlbGVjdD5cXHJcXG48Zm9ybWlvLWVycm9ycz48L2Zvcm1pby1lcnJvcnM+XFxyXFxuXCJcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QtbXVsdGlwbGUuaHRtbCcsXHJcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCcpLnJlcGxhY2UoJzx1aS1zZWxlY3QnLCAnPHVpLXNlbGVjdCBtdWx0aXBsZScpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1NlbGVjdEJveGVzJywgW2Z1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxyXG4gICAgICBzY29wZToge1xyXG4gICAgICAgIGNvbXBvbmVudDogJz0nLFxyXG4gICAgICAgIHJlYWRPbmx5OiAnPScsXHJcbiAgICAgICAgbW9kZWw6ICc9bmdNb2RlbCdcclxuICAgICAgfSxcclxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3Rib3hlcy1kaXJlY3RpdmUuaHRtbCcsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSwgZWwsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RlbFxyXG4gICAgICAgIHZhciBtb2RlbCA9IHt9O1xyXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tcG9uZW50LnZhbHVlcywgZnVuY3Rpb24odikge1xyXG4gICAgICAgICAgbW9kZWxbdi52YWx1ZV0gPSAhIW5nTW9kZWwuJHZpZXdWYWx1ZVt2LnZhbHVlXTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobW9kZWwpO1xyXG4gICAgICAgIG5nTW9kZWwuJHNldFByaXN0aW5lKHRydWUpO1xyXG5cclxuICAgICAgICBuZ01vZGVsLiRpc0VtcHR5ID0gZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSkuZXZlcnkoZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhdmFsdWVba2V5XTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS50b2dnbGVDaGVja2JveCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgICB2YXIgbW9kZWwgPSBhbmd1bGFyLmNvcHkobmdNb2RlbC4kdmlld1ZhbHVlKTtcclxuICAgICAgICAgIG1vZGVsW3ZhbHVlXSA9ICFtb2RlbFt2YWx1ZV07XHJcbiAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobW9kZWwpO1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfV0pO1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignc2VsZWN0Ym94ZXMnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgQm94ZXMnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMuaHRtbCcsXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICBpZiAoIWRhdGEpIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSlcclxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgLmpvaW4oJywgJyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdzZWxlY3Rib3hlc0ZpZWxkJyxcclxuICAgICAgICAgIHZhbHVlczogW10sXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IHt9LFxyXG4gICAgICAgICAgaW5saW5lOiBmYWxzZSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMtZGlyZWN0aXZlLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwic2VsZWN0LWJveGVzXFxcIj5cXHJcXG4gIDxkaXYgbmctY2xhc3M9XFxcImNvbXBvbmVudC5pbmxpbmUgPyAnY2hlY2tib3gtaW5saW5lJyA6ICdjaGVja2JveCdcXFwiIG5nLXJlcGVhdD1cXFwidiBpbiBjb21wb25lbnQudmFsdWVzIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxyXFxuICAgIDxsYWJlbCBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnQua2V5IH19LXt7IHYudmFsdWUgfX1cXFwiPlxcclxcbiAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCJcXHJcXG4gICAgICAgIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19LXt7IHYudmFsdWUgfX1cXFwiXFxyXFxuICAgICAgICBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19LXt7IHYudmFsdWUgfX1cXFwiXFxyXFxuICAgICAgICB2YWx1ZT1cXFwie3sgdi52YWx1ZSB9fVxcXCJcXHJcXG4gICAgICAgIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG4gICAgICAgIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXHJcXG4gICAgICAgIG5nLWNsaWNrPVxcXCJ0b2dnbGVDaGVja2JveCh2LnZhbHVlKVxcXCJcXHJcXG4gICAgICAgIG5nLWNoZWNrZWQ9XFxcIm1vZGVsW3YudmFsdWVdXFxcIlxcclxcbiAgICAgID5cXHJcXG4gICAgICB7eyB2LmxhYmVsIH19XFxyXFxuICAgIDwvbGFiZWw+XFxyXFxuICA8L2Rpdj5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLmh0bWwnLFxyXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmxhYmVsIH19PC9sYWJlbD5cXHJcXG48Zm9ybWlvLXNlbGVjdC1ib3hlc1xcclxcbiAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbiAgbmctbW9kZWwtb3B0aW9ucz1cXFwie2FsbG93SW52YWxpZDogdHJ1ZX1cXFwiXFxyXFxuICBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCJcXHJcXG4gIHJlYWQtb25seT1cXFwicmVhZE9ubHlcXFwiXFxyXFxuICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcclxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXHJcXG4gID48L2Zvcm1pby1zZWxlY3QtYm94ZXM+XFxyXFxuPGZvcm1pby1lcnJvcnM+PC9mb3JtaW8tZXJyb3JzPlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NpZ25hdHVyZScsIHtcclxuICAgICAgICB0aXRsZTogJ1NpZ25hdHVyZScsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9zaWduYXR1cmUuaHRtbCcsXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyAnWWVzJyA6ICdObyc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdzaWduYXR1cmUnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgZm9vdGVyOiAnU2lnbiBhYm92ZScsXHJcbiAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgaGVpZ2h0OiAnMTUwJyxcclxuICAgICAgICAgIHBlbkNvbG9yOiAnYmxhY2snLFxyXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAncmdiKDI0NSwyNDUsMjM1KScsXHJcbiAgICAgICAgICBtaW5XaWR0aDogJzAuNScsXHJcbiAgICAgICAgICBtYXhXaWR0aDogJzIuNScsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLmRpcmVjdGl2ZSgnc2lnbmF0dXJlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBjb21wb25lbnQ6ICc9J1xyXG4gICAgICB9LFxyXG4gICAgICByZXF1aXJlOiAnP25nTW9kZWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgaWYgKCFuZ01vZGVsKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZXRzIHRoZSBsYWJlbCBvZiBjb21wb25lbnQgZm9yIGVycm9yIGRpc3BsYXkuXHJcbiAgICAgICAgc2NvcGUuY29tcG9uZW50LmxhYmVsID0gJ1NpZ25hdHVyZSc7XHJcbiAgICAgICAgc2NvcGUuY29tcG9uZW50LmhpZGVMYWJlbCA9IHRydWU7XHJcblxyXG4gICAgICAgIC8vIFNldHMgdGhlIGRpbWVuc2lvbiBvZiBhIHdpZHRoIG9yIGhlaWdodC5cclxuICAgICAgICB2YXIgc2V0RGltZW5zaW9uID0gZnVuY3Rpb24gKGRpbSkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLmNvbXBvbmVudFtkaW1dLnNsaWNlKC0xKSA9PT0gJyUnKSB7XHJcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gcGFyc2VGbG9hdChzY29wZS5jb21wb25lbnRbZGltXS5zbGljZSgwLCAtMSkpIC8gMTAwO1xyXG4gICAgICAgICAgICBlbGVtZW50WzBdW2RpbV0gPSBlbGVtZW50LnBhcmVudCgpW2RpbV0oKSAqIHBlcmNlbnQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWxlbWVudFswXVtkaW1dID0gcGFyc2VJbnQoc2NvcGUuY29tcG9uZW50W2RpbV0sIDEwKTtcclxuICAgICAgICAgICAgc2NvcGUuY29tcG9uZW50W2RpbV0gPSBlbGVtZW50WzBdW2RpbV0gKyAncHgnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgY2FudmFzLlxyXG4gICAgICAgIHNldERpbWVuc2lvbignd2lkdGgnKTtcclxuICAgICAgICBzZXREaW1lbnNpb24oJ2hlaWdodCcpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIHNpZ25hdHVyZSBwYWQuXHJcbiAgICAgICAgLyogZ2xvYmFsIFNpZ25hdHVyZVBhZDpmYWxzZSAqL1xyXG4gICAgICAgIHZhciBzaWduYXR1cmVQYWQgPSBuZXcgU2lnbmF0dXJlUGFkKGVsZW1lbnRbMF0sIHtcclxuICAgICAgICAgIG1pbldpZHRoOiBzY29wZS5jb21wb25lbnQubWluV2lkdGgsXHJcbiAgICAgICAgICBtYXhXaWR0aDogc2NvcGUuY29tcG9uZW50Lm1heFdpZHRoLFxyXG4gICAgICAgICAgcGVuQ29sb3I6IHNjb3BlLmNvbXBvbmVudC5wZW5Db2xvcixcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogc2NvcGUuY29tcG9uZW50LmJhY2tncm91bmRDb2xvclxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5wZW5Db2xvcicsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgc2lnbmF0dXJlUGFkLnBlbkNvbG9yID0gbmV3VmFsdWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnY29tcG9uZW50LmJhY2tncm91bmRDb2xvcicsIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmNsZWFyKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENsZWFyIHRoZSBzaWduYXR1cmUuXHJcbiAgICAgICAgc2NvcGUuY29tcG9uZW50LmNsZWFyU2lnbmF0dXJlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmNsZWFyKCk7XHJcbiAgICAgICAgICByZWFkU2lnbmF0dXJlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gU2V0IHNvbWUgQ1NTIHByb3BlcnRpZXMuXHJcbiAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgJ2JvcmRlci1yYWRpdXMnOiAnNHB4JyxcclxuICAgICAgICAgICdib3gtc2hhZG93JzogJzAgMCA1cHggcmdiYSgwLCAwLCAwLCAwLjAyKSBpbnNldCcsXHJcbiAgICAgICAgICAnYm9yZGVyJzogJzFweCBzb2xpZCAjZjRmNGY0J1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkU2lnbmF0dXJlKCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZCAmJiBzaWduYXR1cmVQYWQuaXNFbXB0eSgpKSB7XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgnJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKHNpZ25hdHVyZVBhZC50b0RhdGFVUkwoKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBzaWduYXR1cmVQYWQuZnJvbURhdGFVUkwobmdNb2RlbC4kdmlld1ZhbHVlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNpZ25hdHVyZVBhZC5vbkVuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMocmVhZFNpZ25hdHVyZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gUmVhZCBpbml0aWFsIGVtcHR5IGNhbnZhcywgdW5sZXNzIHNpZ25hdHVyZSBpcyByZXF1aXJlZCwgdGhlbiBrZWVwIGl0IHByaXN0aW5lXHJcbiAgICAgICAgaWYgKCFzY29wZS5jb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWQpIHtcclxuICAgICAgICAgIHJlYWRTaWduYXR1cmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcclxuICAgICAgICAgICAgICBGb3JtaW9VdGlscykge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NpZ25hdHVyZS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxyXG4gICAgICAgIFwiPGltZyBuZy1pZj1cXFwicmVhZE9ubHlcXFwiIG5nLWF0dHItc3JjPVxcXCJ7e2RhdGFbY29tcG9uZW50LmtleV19fVxcXCIgc3JjPVxcXCJcXFwiIC8+XFxyXFxuPGRpdiBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6IHt7IGNvbXBvbmVudC53aWR0aCB9fTsgaGVpZ2h0OiB7eyBjb21wb25lbnQuaGVpZ2h0IH19O1xcXCI+XFxyXFxuICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi14cyBidG4tZGVmYXVsdFxcXCIgc3R5bGU9XFxcInBvc2l0aW9uOmFic29sdXRlOyBsZWZ0OiAwOyB0b3A6IDA7IHotaW5kZXg6IDEwMDBcXFwiIG5nLWNsaWNrPVxcXCJjb21wb25lbnQuY2xlYXJTaWduYXR1cmUoKVxcXCI+XFxyXFxuICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcXFwiPjwvc3Bhbj5cXHJcXG4gIDwvYT5cXHJcXG4gIDxjYW52YXMgc2lnbmF0dXJlIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCI+PC9jYW52YXM+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJmb3JtaW8tc2lnbmF0dXJlLWZvb3RlclxcXCIgc3R5bGU9XFxcInRleHQtYWxpZ246IGNlbnRlcjtjb2xvcjojQzNDM0MzO1xcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj57eyBjb21wb25lbnQuZm9vdGVyIH19PC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3RhYmxlJywge1xyXG4gICAgICAgIHRpdGxlOiAnVGFibGUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGFibGUuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBudW1Sb3dzOiAzLFxyXG4gICAgICAgICAgbnVtQ29sczogMyxcclxuICAgICAgICAgIHJvd3M6IFtbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV0sIFt7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119XSwgW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dXSxcclxuICAgICAgICAgIGhlYWRlcjogW10sXHJcbiAgICAgICAgICBjYXB0aW9uOiAnJyxcclxuICAgICAgICAgIHN0cmlwZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgYm9yZGVyZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgaG92ZXI6IGZhbHNlLFxyXG4gICAgICAgICAgY29uZGVuc2VkOiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgIHZhciB0YWJsZUNsYXNzZXMgPSBcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCBcIjtcclxuICAgICAgdGFibGVDbGFzc2VzICs9IFwiJ3RhYmxlLWJvcmRlcmVkJzogY29tcG9uZW50LmJvcmRlcmVkLCBcIjtcclxuICAgICAgdGFibGVDbGFzc2VzICs9IFwiJ3RhYmxlLWhvdmVyJzogY29tcG9uZW50LmhvdmVyLCBcIjtcclxuICAgICAgdGFibGVDbGFzc2VzICs9IFwiJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XCI7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvdGFibGUuaHRtbCcsXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1yZXNwb25zaXZlXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxyXFxuICA8dGFibGUgbmctY2xhc3M9XFxcInsndGFibGUtc3RyaXBlZCc6IGNvbXBvbmVudC5zdHJpcGVkLCAndGFibGUtYm9yZGVyZWQnOiBjb21wb25lbnQuYm9yZGVyZWQsICd0YWJsZS1ob3Zlcic6IGNvbXBvbmVudC5ob3ZlciwgJ3RhYmxlLWNvbmRlbnNlZCc6IGNvbXBvbmVudC5jb25kZW5zZWR9XFxcIiBjbGFzcz1cXFwidGFibGVcXFwiPlxcclxcbiAgICA8dGhlYWQgbmctaWY9XFxcImNvbXBvbmVudC5oZWFkZXIubGVuZ3RoXFxcIj5cXHJcXG4gICAgICA8dGggbmctcmVwZWF0PVxcXCJoZWFkZXIgaW4gY29tcG9uZW50LmhlYWRlclxcXCI+e3sgaGVhZGVyIH19PC90aD5cXHJcXG4gICAgPC90aGVhZD5cXHJcXG4gICAgPHRib2R5PlxcclxcbiAgICAgIDx0ciBuZy1yZXBlYXQ9XFxcInJvdyBpbiBjb21wb25lbnQucm93cyB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIHJvdyB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICAgICAgICA8Zm9ybWlvLWNvbXBvbmVudCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb2x1bW4uY29tcG9uZW50c1xcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm1pbz1cXFwiZm9ybWlvXFxcIj48L2Zvcm1pby1jb21wb25lbnQ+XFxyXFxuICAgICAgICA8L3RkPlxcclxcbiAgICAgIDwvdHI+XFxyXFxuICAgIDwvdGJvZHk+XFxyXFxuICA8L3RhYmxlPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3RleHRhcmVhJywge1xyXG4gICAgICAgIHRpdGxlOiAnVGV4dCBBcmVhJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRhcmVhLmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ3RleHRhcmVhRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgcHJlZml4OiAnJyxcclxuICAgICAgICAgIHN1ZmZpeDogJycsXHJcbiAgICAgICAgICByb3dzOiAzLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBtaW5MZW5ndGg6ICcnLFxyXG4gICAgICAgICAgICBtYXhMZW5ndGg6ICcnLFxyXG4gICAgICAgICAgICBwYXR0ZXJuOiAnJyxcclxuICAgICAgICAgICAgY3VzdG9tOiAnJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcclxuICAgICAgICAgICAgICBGb3JtaW9VdGlscykge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRhcmVhLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8dGV4dGFyZWFcXHJcXG5jbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcclxcbm5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbm5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXHJcXG5uZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcclxcbnNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxyXFxuaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxudGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbnBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiXFxyXFxuY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXHJcXG5yb3dzPVxcXCJ7eyBjb21wb25lbnQucm93cyB9fVxcXCI+PC90ZXh0YXJlYT5cXHJcXG5cIlxyXG4gICAgICApKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3RleHRmaWVsZCcsIHtcclxuICAgICAgICB0aXRsZTogJ1RleHQgRmllbGQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxyXG4gICAgICAgIGljb246ICdmYSBmYS10ZXJtaW5hbCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgaW5wdXRUeXBlOiAndGV4dCcsXHJcbiAgICAgICAgICBpbnB1dE1hc2s6ICcnLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAndGV4dEZpZWxkJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIHByZWZpeDogJycsXHJcbiAgICAgICAgICBzdWZmaXg6ICcnLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgbWluTGVuZ3RoOiAnJyxcclxuICAgICAgICAgICAgbWF4TGVuZ3RoOiAnJyxcclxuICAgICAgICAgICAgcGF0dGVybjogJycsXHJcbiAgICAgICAgICAgIGN1c3RvbTogJycsXHJcbiAgICAgICAgICAgIGN1c3RvbVByaXZhdGU6IGZhbHNlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY29uZGl0aW9uYWw6IHtcclxuICAgICAgICAgICAgc2hvdzogbnVsbCxcclxuICAgICAgICAgICAgd2hlbjogbnVsbCxcclxuICAgICAgICAgICAgZXE6ICcnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uKFxyXG4gICAgICAkdGVtcGxhdGVDYWNoZSxcclxuICAgICAgRm9ybWlvVXRpbHNcclxuICAgICkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxyXG4gICAgICAgIFwiPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxyXFxuICBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcclxcbiAgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxuICBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbiAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbiAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcclxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxyXFxuICBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7IGRlYm91bmNlOiA1MDAgfVxcXCJcXHJcXG4gIHNhZmUtbXVsdGlwbGUtdG8tc2luZ2xlXFxyXFxuICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcclxcbiAgbmctbWlubGVuZ3RoPVxcXCJjb21wb25lbnQudmFsaWRhdGUubWluTGVuZ3RoXFxcIlxcclxcbiAgbmctbWF4bGVuZ3RoPVxcXCJjb21wb25lbnQudmFsaWRhdGUubWF4TGVuZ3RoXFxcIlxcclxcbiAgbmctcGF0dGVybj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnBhdHRlcm5cXFwiXFxyXFxuICBjdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcclxcbiAgcGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVxcXCJcXHJcXG4gIHVpLW1hc2s9XFxcInt7IGNvbXBvbmVudC5pbnB1dE1hc2sgfX1cXFwiXFxyXFxuICB1aS1tYXNrLXBsYWNlaG9sZGVyPVxcXCJcXFwiXFxyXFxuICB1aS1vcHRpb25zPVxcXCJ1aU1hc2tPcHRpb25zXFxcIlxcclxcbj5cXHJcXG5cIlxyXG4gICAgICApKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3Rlcignd2VsbCcsIHtcclxuICAgICAgICB0aXRsZTogJ1dlbGwnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvd2VsbC5odG1sJyxcclxuICAgICAgICBncm91cDogJ2xheW91dCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiBmYWxzZSxcclxuICAgICAgICAgIGNvbXBvbmVudHM6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy93ZWxsLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwid2VsbFxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcclxcbiAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcclxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGUsIGF0dHJzLCBjdHJsKSB7XHJcbiAgICAgIGlmIChcclxuICAgICAgICAhc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlIHx8XHJcbiAgICAgICAgIXNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cclxuICAgICAgKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGN0cmwuJHZhbGlkYXRvcnMuY3VzdG9tID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gdHJ1ZTtcclxuICAgICAgICAvKmVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXHJcbiAgICAgICAgdmFyIGlucHV0ID0gbW9kZWxWYWx1ZSB8fCB2aWV3VmFsdWU7XHJcbiAgICAgICAgLyplc2xpbnQtZW5hYmxlIG5vLXVudXNlZC12YXJzICovXHJcbiAgICAgICAgdmFyIGN1c3RvbSA9IHNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b207XHJcbiAgICAgICAgY3VzdG9tID0gY3VzdG9tLnJlcGxhY2UoLyh7e1xccysoLiopXFxzK319KS8sIGZ1bmN0aW9uKG1hdGNoLCAkMSwgJDIpIHtcclxuICAgICAgICAgIHJldHVybiBzY29wZS5kYXRhWyQyXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLyoganNoaW50IGV2aWw6IHRydWUgKi9cclxuICAgICAgICBldmFsKGN1c3RvbSk7XHJcblxyXG4gICAgICAgIGlmICh2YWxpZCAhPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgc2NvcGUuY29tcG9uZW50LmN1c3RvbUVycm9yID0gdmFsaWQ7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgc2NvcGU6IHtcclxuICAgICAgc3JjOiAnPT8nLFxyXG4gICAgICBmb3JtQWN0aW9uOiAnPT8nLFxyXG4gICAgICBmb3JtOiAnPT8nLFxyXG4gICAgICBzdWJtaXNzaW9uOiAnPT8nLFxyXG4gICAgICByZWFkT25seTogJz0/JyxcclxuICAgICAgaGlkZUNvbXBvbmVudHM6ICc9PycsXHJcbiAgICAgIHJlcXVpcmVDb21wb25lbnRzOiAnPT8nLFxyXG4gICAgICBkaXNhYmxlQ29tcG9uZW50czogJz0/JyxcclxuICAgICAgZm9ybWlvT3B0aW9uczogJz0/J1xyXG4gICAgfSxcclxuICAgIGNvbnRyb2xsZXI6IFtcclxuICAgICAgJyRzY29wZScsXHJcbiAgICAgICckaHR0cCcsXHJcbiAgICAgICckZWxlbWVudCcsXHJcbiAgICAgICdGb3JtaW9TY29wZScsXHJcbiAgICAgICdGb3JtaW8nLFxyXG4gICAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgICBmdW5jdGlvbihcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJGh0dHAsXHJcbiAgICAgICAgJGVsZW1lbnQsXHJcbiAgICAgICAgRm9ybWlvU2NvcGUsXHJcbiAgICAgICAgRm9ybWlvLFxyXG4gICAgICAgIEZvcm1pb1V0aWxzXHJcbiAgICAgICkge1xyXG4gICAgICAgICRzY29wZS5fc3JjID0gJHNjb3BlLnNyYyB8fCAnJztcclxuICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XHJcbiAgICAgICAgLy8gU2hvd3MgdGhlIGdpdmVuIGFsZXJ0cyAoc2luZ2xlIG9yIGFycmF5KSwgYW5kIGRpc21pc3NlcyBvbGQgYWxlcnRzXHJcbiAgICAgICAgdGhpcy5zaG93QWxlcnRzID0gJHNjb3BlLnNob3dBbGVydHMgPSBmdW5jdGlvbihhbGVydHMpIHtcclxuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBBZGQgdGhlIGxpdmUgZm9ybSBwYXJhbWV0ZXIgdG8gdGhlIHVybC5cclxuICAgICAgICBpZiAoJHNjb3BlLl9zcmMgJiYgKCRzY29wZS5fc3JjLmluZGV4T2YoJ2xpdmU9JykgPT09IC0xKSkge1xyXG4gICAgICAgICAgJHNjb3BlLl9zcmMgKz0gKCRzY29wZS5fc3JjLmluZGV4T2YoJz8nKSA9PT0gLTEpID8gJz8nIDogJyYnO1xyXG4gICAgICAgICAgJHNjb3BlLl9zcmMgKz0gJ2xpdmU9MSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBCdWlsZCB0aGUgZGlzcGxheSBtYXAuXHJcbiAgICAgICAgJHNjb3BlLnNob3cgPSB7fTtcclxuICAgICAgICB2YXIgYm9vbGVhbiA9IHtcclxuICAgICAgICAgICd0cnVlJzogdHJ1ZSxcclxuICAgICAgICAgICdmYWxzZSc6IGZhbHNlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHN1Ym1pc3Npb24gPSAkc2NvcGUuc3VibWlzc2lvbiB8fCB7ZGF0YToge319O1xyXG4gICAgICAgIHZhciB1cGRhdGVDb21wb25lbnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAvLyBDaGFuZ2UgdGhlIHZpc2liaWxpdHkgZm9yIHRoZSBjb21wb25lbnQgd2l0aCB0aGUgZ2l2ZW4ga2V5XHJcbiAgICAgICAgICB2YXIgdXBkYXRlVmlzaWJsaXR5ID0gZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgIHZhciBuZXdDbGFzcyA9ICRzY29wZS5zaG93W2tleV0gPyAnbmctc2hvdycgOiAnbmctaGlkZSc7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaGlkZUNvbXBvbmVudHMgJiYgJHNjb3BlLmhpZGVDb21wb25lbnRzLmluZGV4T2Yoa2V5KSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICBuZXdDbGFzcyA9ICduZy1oaWRlJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkZWxlbWVudFxyXG4gICAgICAgICAgICAgIC5maW5kKCdkaXYjZm9ybS1ncm91cC0nICsga2V5KVxyXG4gICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbmctc2hvdyBuZy1oaWRlJylcclxuICAgICAgICAgICAgICAuYWRkQ2xhc3MobmV3Q2xhc3MpO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAkc2NvcGUuZm9ybS5jb21wb25lbnRzID0gJHNjb3BlLmZvcm0uY29tcG9uZW50cyB8fCBbXTtcclxuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcblxyXG4gICAgICAgICAgICAvLyBEaXNwbGF5IGV2ZXJ5IGNvbXBvbmVudCBieSBkZWZhdWx0XHJcbiAgICAgICAgICAgICRzY29wZS5zaG93W2NvbXBvbmVudC5rZXldID0gKCRzY29wZS5zaG93W2NvbXBvbmVudC5rZXldID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgPyB0cnVlXHJcbiAgICAgICAgICAgICAgOiAkc2NvcGUuc2hvd1tjb21wb25lbnQua2V5XTtcclxuXHJcbiAgICAgICAgICAgIC8vIE9ubHkgY2hhbmdlIGRpc3BsYXkgb3B0aW9ucyBvZiBhbGwgcmVxdWlyZSBjb25kaXRpb25hbCBwcm9wZXJ0aWVzIGFyZSBwcmVzZW50LlxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgY29tcG9uZW50LmNvbmRpdGlvbmFsXHJcbiAgICAgICAgICAgICAgJiYgKGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ICE9PSBudWxsICYmIGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ICE9PSAnJylcclxuICAgICAgICAgICAgICAmJiAoY29tcG9uZW50LmNvbmRpdGlvbmFsLndoZW4gIT09IG51bGwgJiYgY29tcG9uZW50LmNvbmRpdGlvbmFsLndoZW4gIT09ICcnKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAvLyBEZWZhdWx0IHRoZSBjb25kaXRpb25hbCB2YWx1ZXMuXHJcbiAgICAgICAgICAgICAgY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3cgPSBib29sZWFuW2NvbXBvbmVudC5jb25kaXRpb25hbC5zaG93XTtcclxuICAgICAgICAgICAgICBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEgPSBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEgfHwgJyc7XHJcblxyXG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgY29uZGl0aW9uYWwgY29tcG9uZW50LlxyXG4gICAgICAgICAgICAgIHZhciBjb25kID0gRm9ybWlvVXRpbHMuZ2V0Q29tcG9uZW50KCRzY29wZS5mb3JtLmNvbXBvbmVudHMsIGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHN1Ym1pc3Npb24uZGF0YVtjb25kLmtleV07XHJcblxyXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGNvbmRpdGlvbmFsIHZhbHVlIGlzIGVxdWFsIHRvIHRoZSB0cmlnZ2VyIHZhbHVlXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnQua2V5XSA9IHZhbHVlLnRvU3RyaW5nKCkgPT09IGNvbXBvbmVudC5jb25kaXRpb25hbC5lcS50b1N0cmluZygpXHJcbiAgICAgICAgICAgICAgICAgID8gYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd11cclxuICAgICAgICAgICAgICAgICAgOiAhYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd107XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIC8vIENoZWNrIGFnYWluc3QgdGhlIGNvbXBvbmVudHMgZGVmYXVsdCB2YWx1ZSwgaWYgcHJlc2VudCBhbmQgdGhlIGNvbXBvbmVudHMgaGFzbnQgYmVlbiBpbnRlcmFjdGVkIHdpdGguXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoIXZhbHVlICYmIGNvbmQuZGVmYXVsdFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnQua2V5XSA9IGNvbmQuZGVmYXVsdFZhbHVlLnRvU3RyaW5nKCkgPT09IGNvbXBvbmVudC5jb25kaXRpb25hbC5lcS50b1N0cmluZygpXHJcbiAgICAgICAgICAgICAgICAgID8gYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd11cclxuICAgICAgICAgICAgICAgICAgOiAhYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd107XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIHZhbHVlLCB3ZSBzdGlsbCBuZWVkIHRvIHByb2Nlc3MgYXMgbm90IGVxdWFsLlxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dbY29tcG9uZW50LmtleV0gPSAhYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd107XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHZpc2liaWxpdHksIGlmIGl0cyBwb3NzaWJsZSBhIGNoYW5nZSBvY2N1cnJlZC5cclxuICAgICAgICAgICAgICB1cGRhdGVWaXNpYmxpdHkoY29tcG9uZW50LmtleSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaGlkZUNvbXBvbmVudHMgJiYgJHNjb3BlLmhpZGVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgdXBkYXRlVmlzaWJsaXR5KGNvbXBvbmVudC5rZXkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgcmVxdWlyZWQgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUucmVxdWlyZUNvbXBvbmVudHMgJiYgY29tcG9uZW50Lmhhc093blByb3BlcnR5KCd2YWxpZGF0ZScpKSB7XHJcbiAgICAgICAgICAgICAgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkID0gJHNjb3BlLnJlcXVpcmVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgZGlzYWJsZWQgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICBjb21wb25lbnQuZGlzYWJsZWQgPSAkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQua2V5KSAhPT0gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY29tcG9uZW50cyBvbiB0aGUgaW5pdGlhbCBmb3JtIHJlbmRlciBhbmQgYWxsIHN1YnNlcXVlbnQgc3VibWlzc2lvbiBkYXRhIGNoYW5nZXMuXHJcbiAgICAgICAgJHNjb3BlLiRvbignZm9ybVJlbmRlcicsIHVwZGF0ZUNvbXBvbmVudHMpO1xyXG4gICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25EYXRhVXBkYXRlJywgZnVuY3Rpb24oZXYsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHN1Ym1pc3Npb24uZGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICB1cGRhdGVDb21wb25lbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghJHNjb3BlLl9zcmMpIHtcclxuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3NyYycsIGZ1bmN0aW9uKHNyYykge1xyXG4gICAgICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuX3NyYyA9IHNyYztcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcclxuICAgICAgICAgICAgICBmb3JtOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZm9ybWlvIG9iamVjdC5cclxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xyXG4gICAgICAgICAgZm9ybTogdHJ1ZSxcclxuICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbGVkIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkLlxyXG4gICAgICAgICRzY29wZS5vblN1Ym1pdCA9IGZ1bmN0aW9uKGZvcm0pIHtcclxuICAgICAgICAgIGlmICghZm9ybS4kdmFsaWQgfHwgZm9ybS5zdWJtaXR0aW5nKSByZXR1cm47XHJcbiAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICAgIC8vIENyZWF0ZSBhIHNhbml0aXplZCBzdWJtaXNzaW9uIG9iamVjdC5cclxuICAgICAgICAgIHZhciBzdWJtaXNzaW9uRGF0YSA9IHtkYXRhOiB7fX07XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uX2lkKSB7XHJcbiAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLl9pZCA9ICRzY29wZS5zdWJtaXNzaW9uLl9pZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLl9pZCkge1xyXG4gICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5faWQgPSAkc2NvcGUuc3VibWlzc2lvbi5kYXRhLl9pZDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZ3JhYklkcyA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghKGlucHV0IGluc3RhbmNlb2YgQXJyYXkpKSB7XHJcbiAgICAgICAgICAgICAgaW5wdXQgPSBbaW5wdXRdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZmluYWwgPSBbXTtcclxuICAgICAgICAgICAgaW5wdXQuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgJiYgZWxlbWVudC5faWQpIHtcclxuICAgICAgICAgICAgICAgIGZpbmFsLnB1c2goZWxlbWVudC5faWQpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmluYWw7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHZhciBkZWZhdWx0UGVybWlzc2lvbnMgPSB7fTtcclxuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ3Jlc291cmNlJyAmJiBjb21wb25lbnQua2V5ICYmIGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIGRlZmF1bHRQZXJtaXNzaW9uc1tjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uZGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSkge1xyXG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbY29tcG9uZW50LmtleV07XHJcbiAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtjb21wb25lbnQua2V5XSA9IHZhbHVlID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiAwO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmRhdGFbY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhdmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XHJcbiAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNldHVwIHRoZSBzdWJtaXNzaW9uIGFjY2Vzcy5cclxuICAgICAgICAgICAgdmFyIHBlcm0gPSBkZWZhdWx0UGVybWlzc2lvbnNba2V5XTtcclxuICAgICAgICAgICAgaWYgKHBlcm0pIHtcclxuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgPSBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgfHwgW107XHJcblxyXG4gICAgICAgICAgICAgIC8vIENvZXJjZSB2YWx1ZSBpbnRvIGFuIGFycmF5IGZvciBwbHVja2luZy5cclxuICAgICAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYW5kIHVwZGF0ZSBhbiBleGlzdGluZyBwZXJtaXNzaW9uLlxyXG4gICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5mb3JFYWNoKGZ1bmN0aW9uKHBlcm1pc3Npb24pIHtcclxuICAgICAgICAgICAgICAgIGlmIChwZXJtaXNzaW9uLnR5cGUgPT09IHBlcm0pIHtcclxuICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcyA9IHBlcm1pc3Npb24ucmVzb3VyY2VzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcy5jb25jYXQoZ3JhYklkcyh2YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAvLyBBZGQgYSBwZXJtaXNzaW9uLCBiZWNhdXNlIG9uZSB3YXMgbm90IGZvdW5kLlxyXG4gICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgdHlwZTogcGVybSxcclxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBncmFiSWRzKHZhbHVlKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiBhIHN1Ym1pc3Npb24gaGFzIGJlZW4gbWFkZS5cclxuICAgICAgICAgIHZhciBvblN1Ym1pdERvbmUgPSBmdW5jdGlvbihtZXRob2QsIHN1Ym1pc3Npb24pIHtcclxuICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xyXG4gICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU3VibWlzc2lvbiB3YXMgJyArICgobWV0aG9kID09PSAncHV0JykgPyAndXBkYXRlZCcgOiAnY3JlYXRlZCcpICsgJy4nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgZm9ybSBzdWJtaXNzaW9uLlxyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbik7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHZhciBzdWJtaXRFdmVudCA9ICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pdCcsIHN1Ym1pc3Npb25EYXRhKTtcclxuICAgICAgICAgIGlmIChzdWJtaXRFdmVudC5kZWZhdWx0UHJldmVudGVkKSB7XHJcbiAgICAgICAgICAgIC8vIExpc3RlbmVyIHdhbnRzIHRvIGNhbmNlbCB0aGUgZm9ybSBzdWJtaXNzaW9uXHJcbiAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGFjdGlvbiB1cmxzLlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5hY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IHN1Ym1pc3Npb25EYXRhLl9pZCA/ICdwdXQnIDogJ3Bvc3QnO1xyXG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Ym1pc3Npb25EYXRhKS5zdWNjZXNzKGZ1bmN0aW9uIChzdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcclxuICAgICAgICAgICAgICBvblN1Ym1pdERvbmUobWV0aG9kLCBzdWJtaXNzaW9uKTtcclxuICAgICAgICAgICAgfSkuZXJyb3IoRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSlcclxuICAgICAgICAgICAgICAuZmluYWxseShmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIElmIHRoZXkgd2lzaCB0byBzdWJtaXQgdG8gdGhlIGRlZmF1bHQgbG9jYXRpb24uXHJcbiAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuZm9ybWlvKSB7XHJcbiAgICAgICAgICAgIC8vIGNvcHkgdG8gcmVtb3ZlIGFuZ3VsYXIgJCRoYXNoS2V5XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtaW8uc2F2ZVN1Ym1pc3Npb24oYW5ndWxhci5jb3B5KHN1Ym1pc3Npb25EYXRhKSwgJHNjb3BlLmZvcm1pb09wdGlvbnMpXHJcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIG9uU3VibWl0RG9uZShzdWJtaXNzaW9uLm1ldGhvZCwgc3VibWlzc2lvbik7XHJcbiAgICAgICAgICAgIH0sIEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpXHJcbiAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbkRhdGEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby5odG1sJ1xyXG4gIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJ0Zvcm1pbycsXHJcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxyXG4gIGZ1bmN0aW9uKFxyXG4gICAgRm9ybWlvLFxyXG4gICAgZm9ybWlvQ29tcG9uZW50c1xyXG4gICkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVxdWlyZTogJz9eZm9ybWlvJyxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBjb21wb25lbnQ6ICc9JyxcclxuICAgICAgICBkYXRhOiAnPScsXHJcbiAgICAgICAgZm9ybWlvOiAnPScsXHJcbiAgICAgICAgZm9ybTogJz0nLFxyXG4gICAgICAgIHJlYWRPbmx5OiAnPSdcclxuICAgICAgfSxcclxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUsIGVsLCBhdHRycywgZm9ybWlvQ3RybCkge1xyXG4gICAgICAgIGlmIChmb3JtaW9DdHJsKSB7XHJcbiAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZvcm1pb0N0cmwuc2hvd0FsZXJ0cy5iaW5kKGZvcm1pb0N0cmwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNhbGwgJHNjb3BlLnNob3dBbGVydHMgdW5sZXNzIHRoaXMgY29tcG9uZW50IGlzIGluc2lkZSBhIGZvcm1pbyBkaXJlY3RpdmUuJyk7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgY29udHJvbGxlcjogW1xyXG4gICAgICAgICckc2NvcGUnLFxyXG4gICAgICAgICckaHR0cCcsXHJcbiAgICAgICAgJyRjb250cm9sbGVyJyxcclxuICAgICAgICBmdW5jdGlvbihcclxuICAgICAgICAgICRzY29wZSxcclxuICAgICAgICAgICRodHRwLFxyXG4gICAgICAgICAgJGNvbnRyb2xsZXJcclxuICAgICAgICApIHtcclxuXHJcbiAgICAgICAgICAvLyBPcHRpb25zIHRvIG1hdGNoIGpxdWVyeS5tYXNrZWRpbnB1dCBtYXNrc1xyXG4gICAgICAgICAgJHNjb3BlLnVpTWFza09wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1hc2tEZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICc5JzogL1xcZC8sXHJcbiAgICAgICAgICAgICAgJ2EnOiAvW2EtekEtWl0vLFxyXG4gICAgICAgICAgICAgICcqJzogL1thLXpBLVowLTldL1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjbGVhck9uQmx1cjogZmFsc2UsXHJcbiAgICAgICAgICAgIGV2ZW50c1RvSGFuZGxlOiBbJ2lucHV0JywgJ2tleXVwJywgJ2NsaWNrJywgJ2ZvY3VzJ10sXHJcbiAgICAgICAgICAgIHNpbGVudEV2ZW50czogWydjbGljaycsICdmb2N1cyddXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICRzY29wZS5yZXNldEZvcm0gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gTWFudWFsbHkgcmVtb3ZlIGVhY2gga2V5IHNvIHdlIGRvbid0IGxvc2UgYSByZWZlcmVuY2UgdG8gb3JpZ2luYWxcclxuICAgICAgICAgICAgLy8gZGF0YSBpbiBjaGlsZCBzY29wZXMuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiAkc2NvcGUuZGF0YSkge1xyXG4gICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZGF0YVtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRhdGEuXHJcbiAgICAgICAgICBpZiAoISRzY29wZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5yZXNldEZvcm0oKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGlzIGNvbXBvbmVudCByZWZlcmVuY2VzIGFuIG9iamVjdCwgd2UgbmVlZCB0byBkZXRlcm1pbmUgdGhlXHJcbiAgICAgICAgICAvLyB2YWx1ZSBieSBuYXZpZ2F0aW5nIHRocm91Z2ggdGhlIG9iamVjdC5cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudCAmJlxyXG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHZhciByb290ID0gJyc7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmtleS5pbmRleE9mKCcuJykgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgcm9vdCA9ICRzY29wZS5jb21wb25lbnQua2V5LnNwbGl0KCcuJykuc2hpZnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgIGlmICghZGF0YSB8fCBhbmd1bGFyLmVxdWFscyh7fSwgZGF0YSkpIHJldHVybjtcclxuICAgICAgICAgICAgICBpZiAocm9vdCAmJiAoIWRhdGEuaGFzT3duUHJvcGVydHkocm9vdCkgfHwgYW5ndWxhci5lcXVhbHMoe30sIGRhdGFbcm9vdF0pKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIGlmIChyb290ICYmIGRhdGFbcm9vdF0uaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVtyb290ICsgJy5faWQnXSA9IGRhdGFbcm9vdF0uX2lkO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBGb3JtaW8uZmllbGREYXRhKGRhdGEsICRzY29wZS5jb21wb25lbnQpO1xyXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEdldCB0aGUgc2V0dGluZ3MuXHJcbiAgICAgICAgICB2YXIgY29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzWyRzY29wZS5jb21wb25lbnQudHlwZV0gfHwgZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzWydjdXN0b20nXTtcclxuXHJcbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBkZWZhdWx0cyBmcm9tIHRoZSBjb21wb25lbnQgc2V0dGluZ3MuXHJcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LnNldHRpbmdzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHJcbiAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFtrZXldID0gYW5ndWxhci5jb3B5KHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gQWRkIGEgbmV3IGZpZWxkIHZhbHVlLlxyXG4gICAgICAgICAgJHNjb3BlLmFkZEZpZWxkVmFsdWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFtdO1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0ucHVzaCgnJyk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIFJlbW92ZSBhIGZpZWxkIHZhbHVlLlxyXG4gICAgICAgICAgJHNjb3BlLnJlbW92ZUZpZWxkVmFsdWUgPSBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0uc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gU2V0IHRoZSB0ZW1wbGF0ZSBmb3IgdGhlIGNvbXBvbmVudC5cclxuICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LnRlbXBsYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZSgkc2NvcGUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBBbGxvdyBjb21wb25lbnQga2V5cyB0byBsb29rIGxpa2UgXCJzZXR0aW5nc1t1c2VybmFtZV1cIlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQua2V5ICYmICRzY29wZS5jb21wb25lbnQua2V5LmluZGV4T2YoJ1snKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAkc2NvcGUuY29tcG9uZW50LmtleS5tYXRjaCgvKFteXFxbXSspXFxbKFteXSspXFxdLyk7XHJcbiAgICAgICAgICAgIGlmICgobWF0Y2hlcy5sZW5ndGggPT09IDMpICYmICRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KG1hdGNoZXNbMV0pKSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGEgPSAkc2NvcGUuZGF0YVttYXRjaGVzWzFdXTtcclxuICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleSA9IG1hdGNoZXNbMl07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIGNvbnRyb2xsZXIuXHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIE1haW50YWluIHJldmVyc2UgY29tcGF0YWJpbGl0eSBieSBleGVjdXRpbmcgdGhlIG9sZCBtZXRob2Qgc3R5bGUuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LmNvbnRyb2xsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICBjb21wb25lbnQuY29udHJvbGxlcigkc2NvcGUuY29tcG9uZW50LCAkc2NvcGUsICRodHRwLCBGb3JtaW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbXBvbmVudC5jb250cm9sbGVyLCB7JHNjb3BlOiAkc2NvcGV9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEVzdGFibGlzaCBhIGRlZmF1bHQgZm9yIGRhdGEuXHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmRhdGEgJiYgISRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KCRzY29wZS5jb21wb25lbnQua2V5KSAmJiAkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSkge1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSAmJiAhYW5ndWxhci5pc0FycmF5KCRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IFskc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5kYXRhICYmICEkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eSgkc2NvcGUuY29tcG9uZW50LmtleSkgJiYgJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZm9ybTogJz0/JyxcclxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcclxuICAgICAgc3JjOiAnPT8nLFxyXG4gICAgICBmb3JtQWN0aW9uOiAnPT8nLFxyXG4gICAgICByZXNvdXJjZU5hbWU6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1kZWxldGUuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICckc2NvcGUnLFxyXG4gICAgICAnJGVsZW1lbnQnLFxyXG4gICAgICAnRm9ybWlvU2NvcGUnLFxyXG4gICAgICAnRm9ybWlvJyxcclxuICAgICAgJyRodHRwJyxcclxuICAgICAgZnVuY3Rpb24oXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICRlbGVtZW50LFxyXG4gICAgICAgIEZvcm1pb1Njb3BlLFxyXG4gICAgICAgIEZvcm1pbyxcclxuICAgICAgICAkaHR0cFxyXG4gICAgICApIHtcclxuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XHJcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xyXG4gICAgICAgICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgcmVzb3VyY2VOYW1lID0gJ3Jlc291cmNlJztcclxuICAgICAgICB2YXIgbWV0aG9kTmFtZSA9ICcnO1xyXG4gICAgICAgIHZhciBsb2FkZXIgPSBGb3JtaW9TY29wZS5yZWdpc3Rlcigkc2NvcGUsICRlbGVtZW50LCB7XHJcbiAgICAgICAgICBmb3JtOiB0cnVlLFxyXG4gICAgICAgICAgc3VibWlzc2lvbjogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAobG9hZGVyKSB7XHJcbiAgICAgICAgICByZXNvdXJjZU5hbWUgPSBsb2FkZXIuc3VibWlzc2lvbklkID8gJ3N1Ym1pc3Npb24nIDogJ2Zvcm0nO1xyXG4gICAgICAgICAgdmFyIHJlc291cmNlVGl0bGUgPSByZXNvdXJjZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICBtZXRob2ROYW1lID0gJ2RlbGV0ZScgKyByZXNvdXJjZVRpdGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IHRoZSByZXNvdXJjZSBuYW1lXHJcbiAgICAgICAgJHNjb3BlLl9yZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWU7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBkZWxldGUgY2FwYWJpbGl0eS5cclxuICAgICAgICAkc2NvcGUub25EZWxldGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIC8vIFJlYnVpbGQgcmVzb3VyY2VUaXRsZSwgJHNjb3BlLnJlc291cmNlTmFtZSBjb3VsZCBoYXZlIGNoYW5nZWRcclxuICAgICAgICAgIHZhciByZXNvdXJjZU5hbWUgPSAkc2NvcGUucmVzb3VyY2VOYW1lIHx8ICRzY29wZS5fcmVzb3VyY2VOYW1lO1xyXG4gICAgICAgICAgdmFyIHJlc291cmNlVGl0bGUgPSByZXNvdXJjZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgZGVsZXRlIGlzIGRvbmUuXHJcbiAgICAgICAgICB2YXIgb25EZWxldGVEb25lID0gZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IHJlc291cmNlVGl0bGUgKyAnIHdhcyBkZWxldGVkLidcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZGVsZXRlJywgZGF0YSk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSgkc2NvcGUuYWN0aW9uKS5zdWNjZXNzKG9uRGVsZXRlRG9uZSkuZXJyb3IoRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIGlmIChsb2FkZXIpIHtcclxuICAgICAgICAgICAgaWYgKCFtZXRob2ROYW1lKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9hZGVyW21ldGhvZE5hbWVdICE9PSAnZnVuY3Rpb24nKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxvYWRlclttZXRob2ROYW1lXSgpLnRoZW4ob25EZWxldGVEb25lLCBGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5vbkNhbmNlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdjYW5jZWwnKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnJGNvbXBpbGUnLFxyXG4gICckdGVtcGxhdGVDYWNoZScsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICAkY29tcGlsZSxcclxuICAgICR0ZW1wbGF0ZUNhY2hlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aCgkY29tcGlsZSgkdGVtcGxhdGVDYWNoZS5nZXQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xyXG4gICAgICAgIHNjb3BlLiRlbWl0KCdmb3JtRWxlbWVudFJlbmRlcicsIGVsZW1lbnQpO1xyXG4gICAgICB9LFxyXG4gICAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICAgJyRzY29wZScsXHJcbiAgICAgICAgZnVuY3Rpb24oXHJcbiAgICAgICAgICAkc2NvcGVcclxuICAgICAgICApIHtcclxuICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCdkYXRhLicgKyAkc2NvcGUuY29tcG9uZW50LmtleSwgZnVuY3Rpb24oX25ldywgX29sZCkge1xyXG4gICAgICAgICAgICBpZiAoX25ldyAhPT0gX29sZCkge1xyXG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkRhdGFVcGRhdGUnLCAkc2NvcGUuY29tcG9uZW50LmtleSwgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBzY29wZTogZmFsc2UsXHJcbiAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vZXJyb3JzLmh0bWwnXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHNjb3BlOiB7XHJcbiAgICAgIGZvcm06ICc9JyxcclxuICAgICAgc3VibWlzc2lvbjogJz0nLFxyXG4gICAgICBpZ25vcmU6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9zdWJtaXNzaW9uLmh0bWwnXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHNjb3BlOiB7XHJcbiAgICAgIHNyYzogJz0/JyxcclxuICAgICAgZm9ybTogJz0/JyxcclxuICAgICAgc3VibWlzc2lvbnM6ICc9PycsXHJcbiAgICAgIHBlclBhZ2U6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9zdWJtaXNzaW9ucy5odG1sJyxcclxuICAgIGNvbnRyb2xsZXI6IFtcclxuICAgICAgJyRzY29wZScsXHJcbiAgICAgICckZWxlbWVudCcsXHJcbiAgICAgICdGb3JtaW9TY29wZScsXHJcbiAgICAgIGZ1bmN0aW9uKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkZWxlbWVudCxcclxuICAgICAgICBGb3JtaW9TY29wZVxyXG4gICAgICApIHtcclxuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XHJcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xyXG4gICAgICAgIHRoaXMuc2hvd0FsZXJ0cyA9ICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLnBlclBhZ2UgPSAkc2NvcGUucGVyUGFnZSA9PT0gdW5kZWZpbmVkID8gMTAgOiAkc2NvcGUucGVyUGFnZTtcclxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xyXG4gICAgICAgICAgZm9ybTogdHJ1ZSxcclxuICAgICAgICAgIHN1Ym1pc3Npb25zOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IDE7XHJcbiAgICAgICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZSkge1xyXG4gICAgICAgICAgJHNjb3BlLnNraXAgPSAocGFnZSAtIDEpICogJHNjb3BlLnBlclBhZ2U7XHJcbiAgICAgICAgICAkc2NvcGUudXBkYXRlU3VibWlzc2lvbnMoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcbiAgICAgICAgICByZXR1cm4gIWNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgndGFibGVWaWV3JykgfHwgY29tcG9uZW50LnRhYmxlVmlldztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdzdWJtaXNzaW9ucycsIGZ1bmN0aW9uKHN1Ym1pc3Npb25zKSB7XHJcbiAgICAgICAgICBpZiAoc3VibWlzc2lvbnMgJiYgc3VibWlzc2lvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25Mb2FkJywgJHNjb3BlLnN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby13aXphcmQuaHRtbCcsXHJcbiAgICBzY29wZToge1xyXG4gICAgICBzcmM6ICc9PycsXHJcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXHJcbiAgICAgIGZvcm06ICc9PycsXHJcbiAgICAgIHN1Ym1pc3Npb246ICc9PycsXHJcbiAgICAgIHJlYWRPbmx5OiAnPT8nLFxyXG4gICAgICBoaWRlQ29tcG9uZW50czogJz0/JyxcclxuICAgICAgZm9ybWlvT3B0aW9uczogJz0/JyxcclxuICAgICAgc3RvcmFnZTogJz0/J1xyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICBzY29wZS53aXphcmRMb2FkZWQgPSBmYWxzZTtcclxuICAgICAgc2NvcGUud2l6YXJkRWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgnLmZvcm1pby13aXphcmQnLCBlbGVtZW50KTtcclxuICAgIH0sXHJcbiAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICckc2NvcGUnLFxyXG4gICAgICAnJGNvbXBpbGUnLFxyXG4gICAgICAnJGVsZW1lbnQnLFxyXG4gICAgICAnRm9ybWlvJyxcclxuICAgICAgJ0Zvcm1pb1Njb3BlJyxcclxuICAgICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgICAgJyRodHRwJyxcclxuICAgICAgZnVuY3Rpb24gKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkY29tcGlsZSxcclxuICAgICAgICAkZWxlbWVudCxcclxuICAgICAgICBGb3JtaW8sXHJcbiAgICAgICAgRm9ybWlvU2NvcGUsXHJcbiAgICAgICAgRm9ybWlvVXRpbHMsXHJcbiAgICAgICAgJGh0dHBcclxuICAgICAgKSB7XHJcbiAgICAgICAgdmFyIHNlc3Npb24gPSAkc2NvcGUuc3RvcmFnZSA/IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCRzY29wZS5zdG9yYWdlKSA6IGZhbHNlO1xyXG4gICAgICAgIGlmIChzZXNzaW9uKSB7XHJcbiAgICAgICAgICBzZXNzaW9uID0gYW5ndWxhci5mcm9tSnNvbihzZXNzaW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRzY29wZS5mb3JtaW8gPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5wYWdlID0ge307XHJcbiAgICAgICAgJHNjb3BlLmZvcm0gPSB7fTtcclxuICAgICAgICAkc2NvcGUucGFnZXMgPSBbXTtcclxuICAgICAgICAkc2NvcGUuY29sY2xhc3MgPSAnJztcclxuICAgICAgICBpZiAoISRzY29wZS5zdWJtaXNzaW9uIHx8ICFPYmplY3Qua2V5cygkc2NvcGUuc3VibWlzc2lvbi5kYXRhKS5sZW5ndGgpIHtcclxuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gc2Vzc2lvbiA/IHtkYXRhOiBzZXNzaW9uLmRhdGF9IDoge2RhdGE6IHt9fTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gc2Vzc2lvbiA/IHNlc3Npb24ucGFnZSA6IDA7XHJcblxyXG4gICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcclxuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcclxuICAgICAgICB0aGlzLnNob3dBbGVydHMgPSAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uIChhbGVydHMpIHtcclxuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsICcnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0ge2RhdGE6IHt9fTtcclxuICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IDA7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gU2hvdyB0aGUgY3VycmVudCBwYWdlLlxyXG4gICAgICAgIHZhciBzaG93UGFnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgcGFnZSBpcyBwYXN0IHRoZSBjb21wb25lbnRzIGxlbmd0aCwgdHJ5IHRvIGNsZWFyIGZpcnN0LlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5jdXJyZW50UGFnZSA+PSAkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAkc2NvcGUud2l6YXJkTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsIGFuZ3VsYXIudG9Kc29uKHtcclxuICAgICAgICAgICAgICBwYWdlOiAkc2NvcGUuY3VycmVudFBhZ2UsXHJcbiAgICAgICAgICAgICAgZGF0YTogJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUucGFnZS5jb21wb25lbnRzID0gJHNjb3BlLmZvcm0uY29tcG9uZW50c1skc2NvcGUuY3VycmVudFBhZ2VdLmNvbXBvbmVudHM7XHJcbiAgICAgICAgICB2YXIgcGFnZUVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9ybWlvJykpO1xyXG4gICAgICAgICAgJHNjb3BlLndpemFyZEVsZW1lbnQuaHRtbCgkY29tcGlsZShwYWdlRWxlbWVudC5hdHRyKHtcclxuICAgICAgICAgICAgc3JjOiBcIidcIiArICRzY29wZS5zcmMgKyBcIidcIixcclxuICAgICAgICAgICAgZm9ybTogJ3BhZ2UnLFxyXG4gICAgICAgICAgICBzdWJtaXNzaW9uOiAnc3VibWlzc2lvbicsXHJcbiAgICAgICAgICAgIHJlYWRPbmx5OiAncmVhZE9ubHknLFxyXG4gICAgICAgICAgICBoaWRlQ29tcG9uZW50czogJ2hpZGVDb21wb25lbnRzJyxcclxuICAgICAgICAgICAgZm9ybWlvT3B0aW9uczogJ2Zvcm1pb09wdGlvbnMnLFxyXG4gICAgICAgICAgICBpZDogJ2Zvcm1pby13aXphcmQtZm9ybSdcclxuICAgICAgICAgIH0pKSgkc2NvcGUpKTtcclxuICAgICAgICAgICRzY29wZS53aXphcmRMb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmRQYWdlJywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3JzLlxyXG4gICAgICAgICRzY29wZS5jaGVja0Vycm9ycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICghJHNjb3BlLmlzVmFsaWQoKSkge1xyXG4gICAgICAgICAgICAvLyBDaGFuZ2UgYWxsIG9mIHRoZSBmaWVsZHMgdG8gbm90IGJlIHByaXN0aW5lLlxyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJGVsZW1lbnQuZmluZCgnW25hbWU9XCJmb3JtaW9GaWVsZEZvcm1cIl0nKS5jaGlsZHJlbigpLCBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgIHZhciBlbGVtZW50U2NvcGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudCkuc2NvcGUoKTtcclxuICAgICAgICAgICAgICB2YXIgZmllbGRGb3JtID0gZWxlbWVudFNjb3BlLmZvcm1pb0ZpZWxkRm9ybTtcclxuICAgICAgICAgICAgICBpZiAoZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XSkge1xyXG4gICAgICAgICAgICAgICAgZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XS4kcHJpc3RpbmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZml4IHRoZSBmb2xsb3dpbmcgZXJyb3JzIGJlZm9yZSBwcm9jZWVkaW5nLidcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFN1Ym1pdCB0aGUgc3VibWlzc2lvbi5cclxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBzdWIgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLnN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudCgkc2NvcGUuZm9ybS5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgaWYgKHN1Yi5kYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5rZXkpICYmIChjb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldKSB7XHJcbiAgICAgICAgICAgICAgICBzdWIuZGF0YVtjb21wb25lbnQua2V5XSA9IHBhcnNlRmxvYXQoc3ViLmRhdGFbY29tcG9uZW50LmtleV0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldID0gMDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbihzdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3RvcmFnZSkge1xyXG4gICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCRzY29wZS5zdG9yYWdlLCAnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyBTYXZlIHRvIHNwZWNpZmllZCBhY3Rpb24uXHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmFjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gc3ViLl9pZCA/ICdwdXQnIDogJ3Bvc3QnO1xyXG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Yikuc3VjY2VzcyhmdW5jdGlvbiAoc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XHJcbiAgICAgICAgICAgICAgb25Eb25lKHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICB9KS5lcnJvcihGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5mb3JtaW8pIHtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1pby5zYXZlU3VibWlzc2lvbihzdWIpLnRoZW4ob25Eb25lKS5jYXRjaChGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBvbkRvbmUoc3ViKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XHJcbiAgICAgICAgICBzaG93UGFnZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIE1vdmUgb250byB0aGUgbmV4dCBwYWdlLlxyXG4gICAgICAgICRzY29wZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFBhZ2UgPj0gKCRzY29wZS5mb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlKys7XHJcbiAgICAgICAgICBzaG93UGFnZSgpO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmROZXh0JywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBNb3ZlIG9udG8gdGhlIHByZXZpb3VzIHBhZ2UuXHJcbiAgICAgICAgJHNjb3BlLnByZXYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmN1cnJlbnRQYWdlIDwgMSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UtLTtcclxuICAgICAgICAgIHNob3dQYWdlKCk7XHJcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3dpemFyZFByZXYnLCAkc2NvcGUuY3VycmVudFBhZ2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5nb3RvID0gZnVuY3Rpb24gKHBhZ2UpIHtcclxuICAgICAgICAgIGlmIChwYWdlIDwgMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAocGFnZSA+PSAkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdlO1xyXG4gICAgICAgICAgc2hvd1BhZ2UoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuaXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnI2Zvcm1pby13aXphcmQtZm9ybScpO1xyXG4gICAgICAgICAgaWYgKCFlbGVtZW50Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgZm9ybWlvRm9ybSA9IGVsZW1lbnQuY2hpbGRyZW4oKS5zY29wZSgpLmZvcm1pb0Zvcm07XHJcbiAgICAgICAgICByZXR1cm4gZm9ybWlvRm9ybS4kdmFsaWQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiRvbignd2l6YXJkR29Ub1BhZ2UnLCBmdW5jdGlvbiAoZXZlbnQsIHBhZ2UpIHtcclxuICAgICAgICAgICRzY29wZS5nb3RvKHBhZ2UpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgc2V0Rm9ybSA9IGZ1bmN0aW9uKGZvcm0pIHtcclxuICAgICAgICAgICRzY29wZS5wYWdlcyA9IFtdO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcblxyXG4gICAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgcGFuZWxzIGZvciB0aGUgcGFnZXMuXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ3BhbmVsJykge1xyXG4gICAgICAgICAgICAgICRzY29wZS5wYWdlcy5wdXNoKGNvbXBvbmVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICRzY29wZS5mb3JtID0gZm9ybTtcclxuICAgICAgICAgICRzY29wZS5mb3JtLmNvbXBvbmVudHMgPSAkc2NvcGUucGFnZXM7XHJcbiAgICAgICAgICAkc2NvcGUucGFnZSA9IGFuZ3VsYXIuY29weShmb3JtKTtcclxuICAgICAgICAgICRzY29wZS5wYWdlLmRpc3BsYXkgPSAnZm9ybSc7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnBhZ2VzLmxlbmd0aCA+IDYpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1hcmdpbiA9ICgoMSAtICgkc2NvcGUucGFnZXMubGVuZ3RoICogMC4wODMzMzMzMzMzKSkgLyAyKSAqIDEwMDtcclxuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0xJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjE2NjY2NjY2NjcpKSAvIDIpICogMTAwO1xyXG4gICAgICAgICAgICAkc2NvcGUuY29sY2xhc3MgPSAnY29sLXNtLTInO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICRzY29wZS4kZW1pdCgnd2l6YXJkRm9ybUxvYWQnLCBmb3JtKTtcclxuICAgICAgICAgIHNob3dQYWdlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gTG9hZCB0aGUgZm9ybS5cclxuICAgICAgICBpZiAoJHNjb3BlLnNyYykge1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbiAoZm9ybSkge1xyXG4gICAgICAgICAgICBzZXRGb3JtKGZvcm0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgJHNjb3BlLnNyYyA9ICcnO1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnRm9ybWlvJyxcclxuICAnZm9ybWlvQ29tcG9uZW50cycsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICBGb3JtaW8sXHJcbiAgICBmb3JtaW9Db21wb25lbnRzXHJcbiAgKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbkVycm9yOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1ZhbGlkYXRpb25FcnJvcicpIHtcclxuICAgICAgICAgICAgJGVsZW1lbnQuZmluZCgnI2Zvcm0tZ3JvdXAtJyArIGVycm9yLmRldGFpbHNbMF0ucGF0aCkuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdWYWxpZGF0aW9uRXJyb3I6ICcgKyBlcnJvci5kZXRhaWxzWzBdLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICBlcnJvciA9IEpTT04uc3RyaW5naWZ5KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1FcnJvcicsIGVycm9yKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgICAgIHZhciBsb2FkZXIgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgJHNjb3BlLmZvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZCgkc2NvcGUuZm9ybSkgPyAkc2NvcGUuZm9ybSA6IHt9O1xyXG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLnN1Ym1pc3Npb24pID8gJHNjb3BlLnN1Ym1pc3Npb24gOiB7ZGF0YToge319O1xyXG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5zdWJtaXNzaW9ucykgPyAkc2NvcGUuc3VibWlzc2lvbnMgOiBbXTtcclxuXHJcbiAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZWxlbWVudHMgcmVuZGVyZWQuXHJcbiAgICAgICAgdmFyIGVsZW1lbnRzUmVuZGVyZWQgPSAwO1xyXG4gICAgICAgICRzY29wZS4kb24oJ2Zvcm1FbGVtZW50UmVuZGVyJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBlbGVtZW50c1JlbmRlcmVkKys7XHJcbiAgICAgICAgICBpZiAoZWxlbWVudHNSZW5kZXJlZCA9PT0gJHNjb3BlLmZvcm0uY29tcG9uZW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1SZW5kZXInLCAkc2NvcGUuZm9ybSk7XHJcbiAgICAgICAgICAgIH0sIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBVc2VkIHRvIHNldCB0aGUgZm9ybSBhY3Rpb24uXHJcbiAgICAgICAgdmFyIGdldEFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xyXG4gICAgICAgICAgaWYgKCFhY3Rpb24pIHJldHVybiAnJztcclxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSByZXR1cm4gJyc7XHJcbiAgICAgICAgICBpZiAoYWN0aW9uLnN1YnN0cigwLCAxKSA9PT0gJy8nKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IEZvcm1pby5nZXRCYXNlVXJsKCkgKyBhY3Rpb247XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gYWN0aW9uO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgYWN0aW9uLlxyXG4gICAgICAgICRzY29wZS5hY3Rpb24gPSBnZXRBY3Rpb24oJHNjb3BlLmZvcm1BY3Rpb24pO1xyXG5cclxuICAgICAgICAvLyBBbGxvdyBzdWIgY29tcG9uZW50cyB0aGUgYWJpbGl0eSB0byBhZGQgbmV3IGZvcm0gY29tcG9uZW50cyB0byB0aGUgZm9ybS5cclxuICAgICAgICB2YXIgYWRkZWREYXRhID0ge307XHJcbiAgICAgICAgJHNjb3BlLiRvbignYWRkRm9ybUNvbXBvbmVudCcsIGZ1bmN0aW9uKGV2ZW50LCBjb21wb25lbnQpIHtcclxuICAgICAgICAgIGlmICghYWRkZWREYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5zZXR0aW5ncy5rZXkpKSB7XHJcbiAgICAgICAgICAgIGFkZGVkRGF0YVtjb21wb25lbnQuc2V0dGluZ3Mua2V5XSA9IHRydWU7XHJcbiAgICAgICAgICAgIHZhciBkZWZhdWx0Q29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm0uY29tcG9uZW50cy5wdXNoKGFuZ3VsYXIuZXh0ZW5kKGRlZmF1bHRDb21wb25lbnQuc2V0dGluZ3MsIGNvbXBvbmVudC5zZXR0aW5ncykpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTZXQgdGhlIGFjdGlvbiBpZiB0aGV5IHByb3ZpZGVkIGl0IGluIHRoZSBmb3JtLlxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2Zvcm0uYWN0aW9uJywgZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcclxuICAgICAgICAgIHZhciBhY3Rpb24gPSBnZXRBY3Rpb24odmFsdWUpO1xyXG4gICAgICAgICAgaWYgKGFjdGlvbikge1xyXG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9uID0gYWN0aW9uO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdmb3JtJywgZnVuY3Rpb24oZm9ybSkge1xyXG4gICAgICAgICAgaWYgKCFmb3JtIHx8IChPYmplY3Qua2V5cyhmb3JtKS5sZW5ndGggPT09IDApKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5wZXJQYWdlKSBwYXJhbXMubGltaXQgPSAkc2NvcGUucGVyUGFnZTtcclxuICAgICAgICAgIGlmICgkc2NvcGUuc2tpcCkgcGFyYW1zLnNraXAgPSAkc2NvcGUuc2tpcDtcclxuICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbnMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9ucykge1xyXG4gICAgICAgICAgICBhbmd1bGFyLm1lcmdlKCRzY29wZS5zdWJtaXNzaW9ucywgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb25zKSk7XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25zTG9hZCcsIHN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH0sIHRoaXMub25FcnJvcigkc2NvcGUpKTtcclxuICAgICAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgICAgIGlmICgkc2NvcGUuX3NyYykge1xyXG4gICAgICAgICAgbG9hZGVyID0gbmV3IEZvcm1pbygkc2NvcGUuX3NyYyk7XHJcbiAgICAgICAgICBpZiAob3B0aW9ucy5mb3JtKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBhIGZvcm0gaXMgYWxyZWFkeSBwcm92aWRlZCwgdGhlbiBza2lwIHRoZSBsb2FkLlxyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmZvcm0gJiYgT2JqZWN0LmtleXMoJHNjb3BlLmZvcm0pLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuZm9ybSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XHJcbiAgICAgICAgICAgICAgICBhbmd1bGFyLm1lcmdlKCRzY29wZS5mb3JtLCBhbmd1bGFyLmNvcHkoZm9ybSkpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1Mb2FkJywgZm9ybSk7XHJcbiAgICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9uICYmIGxvYWRlci5zdWJtaXNzaW9uSWQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGEgc3VibWlzc2lvbiBpcyBhbHJlYWR5IHByb3ZpZGVkLCB0aGVuIHNraXAgdGhlIGxvYWQuXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbiAmJiBPYmplY3Qua2V5cygkc2NvcGUuc3VibWlzc2lvbi5kYXRhKS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25Mb2FkJywgJHNjb3BlLnN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbiwgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb24pKTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICAgIH0sIHRoaXMub25FcnJvcigkc2NvcGUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3VibWlzc2lvbnMpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1vTG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9ICRzY29wZS5mb3JtICYmIChPYmplY3Qua2V5cygkc2NvcGUuZm9ybSkubGVuZ3RoID09PSAwKTtcclxuXHJcbiAgICAgICAgICAvLyBFbWl0IHRoZSBldmVudHMgaWYgdGhlc2Ugb2JqZWN0cyBhcmUgYWxyZWFkeSBsb2FkZWQuXHJcbiAgICAgICAgICBpZiAoISRzY29wZS5mb3JtTG9hZGluZykge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1Mb2FkJywgJHNjb3BlLmZvcm0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkxvYWQnLCAkc2NvcGUuc3VibWlzc2lvbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb25zKSB7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbnNMb2FkJywgJHNjb3BlLnN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJldHVybiB0aGUgbG9hZGVyLlxyXG4gICAgICAgIHJldHVybiBsb2FkZXI7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBmb3JtaW9VdGlscyA9IHJlcXVpcmUoJ2Zvcm1pby11dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgZmxhdHRlbkNvbXBvbmVudHM6IGZvcm1pb1V0aWxzLmZsYXR0ZW5Db21wb25lbnRzLFxyXG4gICAgZWFjaENvbXBvbmVudDogZm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudCxcclxuICAgIGdldENvbXBvbmVudDogZm9ybWlvVXRpbHMuZ2V0Q29tcG9uZW50LFxyXG4gICAgaGlkZUZpZWxkczogZnVuY3Rpb24oZm9ybSwgY29tcG9uZW50cykge1xyXG4gICAgICB0aGlzLmVhY2hDb21wb25lbnQoZm9ybS5jb21wb25lbnRzLCBmdW5jdGlvbiAoY29tcG9uZW50KSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSBpbiBjb21wb25lbnRzKSB7XHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0gY29tcG9uZW50c1tpXSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnQudHlwZSA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgZmllbGRXcmFwOiBmdW5jdGlvbihpbnB1dCkge1xyXG4gICAgICBpbnB1dCA9IGlucHV0ICsgJzxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz4nO1xyXG4gICAgICB2YXIgbXVsdGlJbnB1dCA9IGlucHV0LnJlcGxhY2UoJ2RhdGFbY29tcG9uZW50LmtleV0nLCAnZGF0YVtjb21wb25lbnQua2V5XVskaW5kZXhdJyk7XHJcbiAgICAgIHZhciBpbnB1dExhYmVsID0gJzxsYWJlbCBuZy1pZj1cImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFwiIGZvcj1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+JztcclxuICAgICAgdmFyIHJlcXVpcmVkSW5saW5lID0gJzxzcGFuIG5nLWlmPVwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj4nO1xyXG4gICAgICB2YXIgdGVtcGxhdGUgPVxyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5tdWx0aXBsZVwiPicgK1xyXG4gICAgICAgIGlucHV0TGFiZWwgKyByZXF1aXJlZElubGluZSArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiIG5nLWlmPVwiY29tcG9uZW50LnByZWZpeCB8fCBjb21wb25lbnQuc3VmZml4XCI+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1hZGRvblwiIG5nLWlmPVwiISFjb21wb25lbnQucHJlZml4XCI+e3sgY29tcG9uZW50LnByZWZpeCB9fTwvZGl2PicgK1xyXG4gICAgICAgIGlucHV0ICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5wcmVmaXggJiYgIWNvbXBvbmVudC5zdWZmaXhcIj4nICsgaW5wdXQgKyAnPC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiY29tcG9uZW50Lm11bHRpcGxlXCI+PHRhYmxlIGNsYXNzPVwidGFibGUgdGFibGUtYm9yZGVyZWRcIj4nICtcclxuICAgICAgICBpbnB1dExhYmVsICtcclxuICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInZhbHVlIGluIGRhdGFbY29tcG9uZW50LmtleV0gdHJhY2sgYnkgJGluZGV4XCI+JyArXHJcbiAgICAgICAgJzx0ZD4nICsgcmVxdWlyZWRJbmxpbmUgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIiBuZy1pZj1cImNvbXBvbmVudC5wcmVmaXggfHwgY29tcG9uZW50LnN1ZmZpeFwiPicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnByZWZpeFwiPnt7IGNvbXBvbmVudC5wcmVmaXggfX08L2Rpdj4nICtcclxuICAgICAgICBtdWx0aUlucHV0ICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5wcmVmaXggJiYgIWNvbXBvbmVudC5zdWZmaXhcIj4nICsgbXVsdGlJbnB1dCArICc8L2Rpdj4nICtcclxuICAgICAgICAnPC90ZD4nICtcclxuICAgICAgICAnPHRkPjxhIG5nLWNsaWNrPVwicmVtb3ZlRmllbGRWYWx1ZSgkaW5kZXgpXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHRcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVwiPjwvc3Bhbj48L2E+PC90ZD4nICtcclxuICAgICAgICAnPC90cj4nICtcclxuICAgICAgICAnPHRyPicgK1xyXG4gICAgICAgICc8dGQgY29sc3Bhbj1cIjJcIj48YSBuZy1jbGljaz1cImFkZEZpZWxkVmFsdWUoKVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+IHt7IGNvbXBvbmVudC5hZGRBbm90aGVyIHx8IFwiQWRkIEFub3RoZXJcIiB9fTwvYT48L3RkPicgK1xyXG4gICAgICAgICc8L3RyPicgK1xyXG4gICAgICAgICc8L3RhYmxlPjwvZGl2Pic7XHJcbiAgICAgIHJldHVybiB0ZW1wbGF0ZTtcclxuICAgIH1cclxuICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICckcScsXHJcbiAgJyRyb290U2NvcGUnLFxyXG4gICdGb3JtaW8nLFxyXG4gIGZ1bmN0aW9uKCRxLCAkcm9vdFNjb3BlLCBGb3JtaW8pIHtcclxuICAgIHZhciBJbnRlcmNlcHRvciA9IHtcclxuICAgICAgLyoqXHJcbiAgICAgICAqIFVwZGF0ZSBKV1QgdG9rZW4gcmVjZWl2ZWQgZnJvbSByZXNwb25zZS5cclxuICAgICAgICovXHJcbiAgICAgIHJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgIHZhciB0b2tlbiA9IHJlc3BvbnNlLmhlYWRlcnMoJ3gtand0LXRva2VuJyk7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwICYmIHRva2VuICYmIHRva2VuICE9PSAnJykge1xyXG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIEludGVyY2VwdCBhIHJlc3BvbnNlIGVycm9yLlxyXG4gICAgICAgKi9cclxuICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQ0MCkge1xyXG4gICAgICAgICAgcmVzcG9uc2UubG9nZ2VkT3V0ID0gdHJ1ZTtcclxuICAgICAgICAgIEZvcm1pby5zZXRUb2tlbihudWxsKTtcclxuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgcmVzcG9uc2UuYm9keSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHBhcnNlSW50KHJlc3BvbnNlLnN0YXR1cywgMTApID09PSA0MDEpIHtcclxuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIHJlc3BvbnNlLmJvZHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBTZXQgdGhlIHRva2VuIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuXHJcbiAgICAgICAqL1xyXG4gICAgICByZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcclxuICAgICAgICBpZiAoY29uZmlnLmRpc2FibGVKV1QpIHJldHVybiBjb25maWc7XHJcbiAgICAgICAgdmFyIHRva2VuID0gRm9ybWlvLmdldFRva2VuKCk7XHJcbiAgICAgICAgaWYgKHRva2VuKSBjb25maWcuaGVhZGVyc1sneC1qd3QtdG9rZW4nXSA9IHRva2VuO1xyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIEludGVyY2VwdG9yO1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnRm9ybWlvJyxcclxuICAnZm9ybWlvQ29tcG9uZW50cycsXHJcbiAgJyRpbnRlcnBvbGF0ZScsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICBGb3JtaW8sXHJcbiAgICBmb3JtaW9Db21wb25lbnRzLFxyXG4gICAgJGludGVycG9sYXRlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGNvbXBvbmVudCkge1xyXG4gICAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBjb21wb25lbnRJbmZvID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcclxuICAgICAgaWYgKCFjb21wb25lbnRJbmZvLnRhYmxlVmlldykge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoY29tcG9uZW50Lm11bHRpcGxlICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgICBhbmd1bGFyLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uKGFycmF5VmFsdWUpIHtcclxuICAgICAgICAgIHZhbHVlcy5wdXNoKGNvbXBvbmVudEluZm8udGFibGVWaWV3KGFycmF5VmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gY29tcG9uZW50SW5mby50YWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKTtcclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICdGb3JtaW9VdGlscycsXHJcbiAgZnVuY3Rpb24oRm9ybWlvVXRpbHMpIHtcclxuICAgIHJldHVybiBGb3JtaW9VdGlscy5mbGF0dGVuQ29tcG9uZW50cztcclxuICB9XHJcbl07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJyRzY2UnLFxyXG4gIGZ1bmN0aW9uKFxyXG4gICAgJHNjZVxyXG4gICkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGh0bWwpIHtcclxuICAgICAgcmV0dXJuICRzY2UudHJ1c3RBc0h0bWwoaHRtbCk7XHJcbiAgICB9O1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnRm9ybWlvVXRpbHMnLFxyXG4gIGZ1bmN0aW9uKEZvcm1pb1V0aWxzKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oY29tcG9uZW50cykge1xyXG4gICAgICB2YXIgdGFibGVDb21wcyA9IFtdO1xyXG4gICAgICBpZiAoIWNvbXBvbmVudHMgfHwgIWNvbXBvbmVudHMubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XHJcbiAgICAgIH1cclxuICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudChjb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICBpZiAoY29tcG9uZW50LnRhYmxlVmlldyAmJiBjb21wb25lbnQua2V5KSB7XHJcbiAgICAgICAgICB0YWJsZUNvbXBzLnB1c2goY29tcG9uZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gdGFibGVDb21wcztcclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICdmb3JtaW9UYWJsZVZpZXcnLFxyXG4gIGZ1bmN0aW9uKFxyXG4gICAgZm9ybWlvVGFibGVWaWV3XHJcbiAgKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGNvbXBvbmVudCkge1xyXG4gICAgICByZXR1cm4gZm9ybWlvVGFibGVWaWV3KHZhbHVlLCBjb21wb25lbnQpO1xyXG4gICAgfTtcclxuICB9XHJcbl07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJ0Zvcm1pbycsXHJcbiAgJ2Zvcm1pb1RhYmxlVmlldycsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICBGb3JtaW8sXHJcbiAgICBmb3JtaW9UYWJsZVZpZXdcclxuICApIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQpIHtcclxuICAgICAgcmV0dXJuIGZvcm1pb1RhYmxlVmlldyhGb3JtaW8uZmllbGREYXRhKGRhdGEsIGNvbXBvbmVudCksIGNvbXBvbmVudCk7XHJcbiAgICB9O1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxuXHJcbnZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZm9ybWlvJywgW1xyXG4gICduZ1Nhbml0aXplJyxcclxuICAndWkuYm9vdHN0cmFwJyxcclxuICAndWkuYm9vdHN0cmFwLmRhdGV0aW1lcGlja2VyJyxcclxuICAndWkuc2VsZWN0JyxcclxuICAndWkubWFzaycsXHJcbiAgJ2FuZ3VsYXJNb21lbnQnLFxyXG4gICduZ0ZpbGVVcGxvYWQnLFxyXG4gICduZ0ZpbGVTYXZlcidcclxuXSk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHRoZSBmb3JtaW8gcHJvdmlkZXJzLlxyXG4gKi9cclxuYXBwLnByb3ZpZGVyKCdGb3JtaW8nLCByZXF1aXJlKCcuL3Byb3ZpZGVycy9Gb3JtaW8nKSk7XHJcblxyXG5hcHAucHJvdmlkZXIoJ0Zvcm1pb1BsdWdpbnMnLCByZXF1aXJlKCcuL3Byb3ZpZGVycy9Gb3JtaW9QbHVnaW5zJykpO1xyXG5cclxuLyoqXHJcbiAqIFByb3ZpZGVzIGEgd2F5IHRvIHJlZ3NpdGVyIHRoZSBGb3JtaW8gc2NvcGUuXHJcbiAqL1xyXG5hcHAuZmFjdG9yeSgnRm9ybWlvU2NvcGUnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9Gb3JtaW9TY29wZScpKTtcclxuXHJcbmFwcC5mYWN0b3J5KCdGb3JtaW9VdGlscycsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL0Zvcm1pb1V0aWxzJykpO1xyXG5cclxuYXBwLmZhY3RvcnkoJ2Zvcm1pb0ludGVyY2VwdG9yJywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvZm9ybWlvSW50ZXJjZXB0b3InKSk7XHJcblxyXG5hcHAuZmFjdG9yeSgnZm9ybWlvVGFibGVWaWV3JywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvZm9ybWlvVGFibGVWaWV3JykpO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pbycpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0RlbGV0ZScsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9EZWxldGUnKSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9FcnJvcnMnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRXJyb3JzJykpO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnY3VzdG9tVmFsaWRhdG9yJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2N1c3RvbVZhbGlkYXRvcicpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1N1Ym1pc3Npb25zJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb1N1Ym1pc3Npb25zJykpO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvU3VibWlzc2lvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9uJykpO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvQ29tcG9uZW50JywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudCcpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0VsZW1lbnQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRWxlbWVudCcpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1dpemFyZCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9XaXphcmQnKSk7XHJcblxyXG4vKipcclxuICogRmlsdGVyIHRvIGZsYXR0ZW4gZm9ybSBjb21wb25lbnRzLlxyXG4gKi9cclxuYXBwLmZpbHRlcignZmxhdHRlbkNvbXBvbmVudHMnLCByZXF1aXJlKCcuL2ZpbHRlcnMvZmxhdHRlbkNvbXBvbmVudHMnKSk7XHJcbmFwcC5maWx0ZXIoJ3RhYmxlQ29tcG9uZW50cycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZUNvbXBvbmVudHMnKSk7XHJcbmFwcC5maWx0ZXIoJ3RhYmxlVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZVZpZXcnKSk7XHJcbmFwcC5maWx0ZXIoJ3RhYmxlRmllbGRWaWV3JywgcmVxdWlyZSgnLi9maWx0ZXJzL3RhYmxlRmllbGRWaWV3JykpO1xyXG5hcHAuZmlsdGVyKCdzYWZlaHRtbCcsIHJlcXVpcmUoJy4vZmlsdGVycy9zYWZlaHRtbCcpKTtcclxuXHJcbmFwcC5jb25maWcoW1xyXG4gICckaHR0cFByb3ZpZGVyJyxcclxuICBmdW5jdGlvbihcclxuICAgICRodHRwUHJvdmlkZXJcclxuICApIHtcclxuICAgIGlmICghJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCkge1xyXG4gICAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0ID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGlzYWJsZSBJRSBjYWNoaW5nIGZvciBHRVQgcmVxdWVzdHMuXHJcbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xyXG4gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldC5QcmFnbWEgPSAnbm8tY2FjaGUnO1xyXG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnZm9ybWlvSW50ZXJjZXB0b3InKTtcclxuICB9XHJcbl0pO1xyXG5cclxucmVxdWlyZSgnLi9wbHVnaW5zJykoYXBwKTtcclxuXHJcbmFwcC5ydW4oW1xyXG4gICckdGVtcGxhdGVDYWNoZScsXHJcbiAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcclxuXHJcbiAgICAvLyBUaGUgdGVtcGxhdGUgZm9yIHRoZSBmb3JtaW8gZm9ybXMuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby5odG1sJyxcclxuICAgICAgXCI8ZGl2PlxcclxcbiAgPGkgc3R5bGU9XFxcImZvbnQtc2l6ZTogMmVtO1xcXCIgbmctaWY9XFxcImZvcm1Mb2FkaW5nXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoIGdseXBoaWNvbi1zcGluXFxcIj48L2k+XFxyXFxuICA8Zm9ybWlvLXdpemFyZCBuZy1pZj1cXFwiZm9ybS5kaXNwbGF5ID09PSAnd2l6YXJkJ1xcXCIgc3JjPVxcXCJzcmNcXFwiIGZvcm09XFxcImZvcm1cXFwiIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiIGZvcm0tYWN0aW9uPVxcXCJmb3JtQWN0aW9uXFxcIiByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIiBoaWRlLWNvbXBvbmVudHM9XFxcImhpZGVDb21wb25lbnRzXFxcIiBmb3JtaW8tb3B0aW9ucz1cXFwiZm9ybWlvT3B0aW9uc1xcXCIgc3RvcmFnZT1cXFwiZm9ybS5uYW1lXFxcIj48L2Zvcm1pby13aXphcmQ+XFxyXFxuICA8Zm9ybSBuZy1pZj1cXFwiIWZvcm0uZGlzcGxheSB8fCAoZm9ybS5kaXNwbGF5ID09PSAnZm9ybScpXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuYW1lPVxcXCJmb3JtaW9Gb3JtXFxcIiBuZy1zdWJtaXQ9XFxcIm9uU3VibWl0KGZvcm1pb0Zvcm0pXFxcIiBub3ZhbGlkYXRlPlxcclxcbiAgICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzXFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVxcXCIgcm9sZT1cXFwiYWxlcnRcXFwiPlxcclxcbiAgICAgIHt7IGFsZXJ0Lm1lc3NhZ2UgfX1cXHJcXG4gICAgPC9kaXY+XFxyXFxuICAgIDxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB0cmFjayBieSAkaW5kZXhcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJzdWJtaXNzaW9uLmRhdGFcXFwiIGZvcm09XFxcImZvcm1pb0Zvcm1cXFwiIGZvcm1pbz1cXFwiZm9ybWlvXFxcIiByZWFkLW9ubHk9XFxcInJlYWRPbmx5IHx8IGNvbXBvbmVudC5kaXNhYmxlZFxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgPC9mb3JtPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICApO1xyXG5cclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLXdpemFyZC5odG1sJyxcclxuICAgICAgXCI8ZGl2PlxcclxcbiAgPGRpdiBjbGFzcz1cXFwicm93IGJzLXdpemFyZFxcXCIgc3R5bGU9XFxcImJvcmRlci1ib3R0b206MDtcXFwiPlxcclxcbiAgICA8ZGl2IG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6ICgkaW5kZXggPiBjdXJyZW50UGFnZSksIGFjdGl2ZTogKCRpbmRleCA9PSBjdXJyZW50UGFnZSksIGNvbXBsZXRlOiAoJGluZGV4IDwgY3VycmVudFBhZ2UpfVxcXCIgY2xhc3M9XFxcInt7IGNvbGNsYXNzIH19IGJzLXdpemFyZC1zdGVwXFxcIiBuZy1yZXBlYXQ9XFxcInBhZ2UgaW4gcGFnZXNcXFwiPlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInRleHQtY2VudGVyIGJzLXdpemFyZC1zdGVwbnVtXFxcIj57eyBwYWdlLnRpdGxlIH19PC9kaXY+XFxyXFxuICAgICAgPGRpdiBjbGFzcz1cXFwicHJvZ3Jlc3NcXFwiPjxkaXYgY2xhc3M9XFxcInByb2dyZXNzLWJhclxcXCI+PC9kaXY+PC9kaXY+XFxyXFxuICAgICAgPGEgbmctY2xpY2s9XFxcImdvdG8oJGluZGV4KVxcXCIgY2xhc3M9XFxcImJzLXdpemFyZC1kb3RcXFwiPjwvYT5cXHJcXG4gICAgPC9kaXY+XFxyXFxuICA8L2Rpdj5cXHJcXG4gIDxzdHlsZSB0eXBlPVxcXCJ0ZXh0L2Nzc1xcXCI+LmJzLXdpemFyZCA+IC5icy13aXphcmQtc3RlcDpmaXJzdC1jaGlsZCB7IG1hcmdpbi1sZWZ0OiB7eyBtYXJnaW4gfX0lOyB9PC9zdHlsZT5cXHJcXG4gIDxpIG5nLXNob3c9XFxcIiF3aXphcmRMb2FkZWRcXFwiIGlkPVxcXCJmb3JtaW8tbG9hZGluZ1xcXCIgc3R5bGU9XFxcImZvbnQtc2l6ZTogMmVtO1xcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcclxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0c1xcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj57eyBhbGVydC5tZXNzYWdlIH19PC9kaXY+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJmb3JtaW8td2l6YXJkXFxcIj48L2Rpdj5cXHJcXG4gIDx1bCBuZy1zaG93PVxcXCJ3aXphcmRMb2FkZWRcXFwiIGNsYXNzPVxcXCJsaXN0LWlubGluZVxcXCI+XFxyXFxuICAgIDxsaT48YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBuZy1jbGljaz1cXFwiY2FuY2VsKClcXFwiPkNhbmNlbDwvYT48L2xpPlxcclxcbiAgICA8bGkgbmctaWY9XFxcImN1cnJlbnRQYWdlID4gMFxcXCI+PGEgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcInByZXYoKVxcXCI+UHJldmlvdXM8L2E+PC9saT5cXHJcXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA8IChmb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSlcXFwiPlxcclxcbiAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcIm5leHQoKVxcXCI+TmV4dDwvYnV0dG9uPlxcclxcbiAgICA8L2xpPlxcclxcbiAgICA8bGkgbmctaWY9XFxcImN1cnJlbnRQYWdlID49IChmb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSlcXFwiPlxcclxcbiAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgbmctY2xpY2s9XFxcInN1Ym1pdCgpXFxcIj5TdWJtaXQgRm9ybTwvYnV0dG9uPlxcclxcbiAgICA8L2xpPlxcclxcbiAgPC91bD5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgKTtcclxuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1kZWxldGUuaHRtbCcsXHJcbiAgICAgIFwiPGZvcm0gcm9sZT1cXFwiZm9ybVxcXCI+XFxyXFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzXFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVxcXCIgcm9sZT1cXFwiYWxlcnRcXFwiPlxcclxcbiAgICB7eyBhbGVydC5tZXNzYWdlIH19XFxyXFxuICA8L2Rpdj5cXHJcXG4gIDxoMz5BcmUgeW91IHN1cmUgeW91IHdpc2ggdG8gZGVsZXRlIHRoZSB7eyByZXNvdXJjZU5hbWUgfHwgX3Jlc291cmNlTmFtZSB9fT88L2gzPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiYnRuLXRvb2xiYXJcXFwiPlxcclxcbiAgICA8YnV0dG9uIG5nLWNsaWNrPVxcXCJvbkRlbGV0ZSgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXJcXFwiPlllczwvYnV0dG9uPlxcclxcbiAgICA8YnV0dG9uIG5nLWNsaWNrPVxcXCJvbkNhbmNlbCgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5ObzwvYnV0dG9uPlxcclxcbiAgPC9kaXY+XFxyXFxuPC9mb3JtPlxcclxcblwiXHJcbiAgICApO1xyXG5cclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL3N1Ym1pc3Npb24uaHRtbCcsXHJcbiAgICAgIFwiPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLXJlc3BvbnNpdmVcXFwiPlxcclxcbiAgPHRyIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB8IHRhYmxlQ29tcG9uZW50c1xcXCIgbmctaWY9XFxcIiFpZ25vcmVbY29tcG9uZW50LmtleV1cXFwiPlxcclxcbiAgICA8dGg+e3sgY29tcG9uZW50LmxhYmVsIH19PC90aD5cXHJcXG4gICAgPHRkPjxkaXYgbmctYmluZC1odG1sPVxcXCJzdWJtaXNzaW9uLmRhdGEgfCB0YWJsZVZpZXc6Y29tcG9uZW50XFxcIj48L2Rpdj48L3RkPlxcclxcbiAgPC90cj5cXHJcXG48L3RhYmxlPlxcclxcblwiXHJcbiAgICApO1xyXG5cclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL3N1Ym1pc3Npb25zLmh0bWwnLFxyXG4gICAgICBcIjxkaXY+XFxyXFxuICA8ZGl2IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gZm9ybWlvQWxlcnRzXFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQte3sgYWxlcnQudHlwZSB9fVxcXCIgcm9sZT1cXFwiYWxlcnRcXFwiPlxcclxcbiAgICB7eyBhbGVydC5tZXNzYWdlIH19XFxyXFxuICA8L2Rpdj5cXHJcXG4gIDx0YWJsZSBjbGFzcz1cXFwidGFibGVcXFwiPlxcclxcbiAgICA8dGhlYWQ+XFxyXFxuICAgICAgPHRyPlxcclxcbiAgICAgICAgPHRoIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB8IGZsYXR0ZW5Db21wb25lbnRzXFxcIiBuZy1pZj1cXFwidGFibGVWaWV3KGNvbXBvbmVudClcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19PC90aD5cXHJcXG4gICAgICAgIDx0aD5TdWJtaXR0ZWQ8L3RoPlxcclxcbiAgICAgICAgPHRoPlVwZGF0ZWQ8L3RoPlxcclxcbiAgICAgICAgPHRoPk9wZXJhdGlvbnM8L3RoPlxcclxcbiAgICAgIDwvdHI+XFxyXFxuICAgIDwvdGhlYWQ+XFxyXFxuICAgIDx0Ym9keT5cXHJcXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJzdWJtaXNzaW9uIGluIHN1Ym1pc3Npb25zXFxcIiBjbGFzcz1cXFwiZm9ybWlvLXN1Ym1pc3Npb25cXFwiIG5nLWNsaWNrPVxcXCIkZW1pdCgnc3VibWlzc2lvblZpZXcnLCBzdWJtaXNzaW9uKVxcXCI+XFxyXFxuICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gZm9ybS5jb21wb25lbnRzIHwgZmxhdHRlbkNvbXBvbmVudHNcXFwiIG5nLWlmPVxcXCJ0YWJsZVZpZXcoY29tcG9uZW50KVxcXCI+e3sgc3VibWlzc2lvbi5kYXRhIHwgdGFibGVWaWV3OmNvbXBvbmVudCB9fTwvdGQ+XFxyXFxuICAgICAgICA8dGQ+e3sgc3VibWlzc2lvbi5jcmVhdGVkIHwgYW1EYXRlRm9ybWF0OidsLCBoOm1tOnNzIGEnIH19PC90ZD5cXHJcXG4gICAgICAgIDx0ZD57eyBzdWJtaXNzaW9uLm1vZGlmaWVkIHwgYW1EYXRlRm9ybWF0OidsLCBoOm1tOnNzIGEnIH19PC90ZD5cXHJcXG4gICAgICAgIDx0ZD5cXHJcXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYnV0dG9uLWdyb3VwXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O1xcXCI+XFxyXFxuICAgICAgICAgICAgPGEgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uVmlldycsIHN1Ym1pc3Npb24pOyAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZXllLW9wZW5cXFwiPjwvc3Bhbj48L2E+Jm5ic3A7XFxyXFxuICAgICAgICAgICAgPGEgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uRWRpdCcsIHN1Ym1pc3Npb24pOyAkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZWRpdFxcXCI+PC9zcGFuPjwvYT4mbmJzcDtcXHJcXG4gICAgICAgICAgICA8YSBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25EZWxldGUnLCBzdWJtaXNzaW9uKTsgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xcXCIgY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyIGJ0bi14c1xcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVxcXCI+PC9zcGFuPjwvYT5cXHJcXG4gICAgICAgICAgPC9kaXY+XFxyXFxuICAgICAgICA8L3RkPlxcclxcbiAgICAgIDwvdHI+XFxyXFxuICAgIDwvdGJvZHk+XFxyXFxuICA8L3RhYmxlPlxcclxcbiAgPHBhZ2luYXRpb25cXHJcXG4gICAgbmctaWY9XFxcInN1Ym1pc3Npb25zLnNlcnZlckNvdW50ID4gcGVyUGFnZVxcXCJcXHJcXG4gICAgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIlxcclxcbiAgICBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCJcXHJcXG4gICAgdG90YWwtaXRlbXM9XFxcInN1Ym1pc3Npb25zLnNlcnZlckNvdW50XFxcIlxcclxcbiAgICBpdGVtcy1wZXItcGFnZT1cXFwicGVyUGFnZVxcXCJcXHJcXG4gICAgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCJcXHJcXG4gICAgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiXFxyXFxuICAgIGZpcnN0LXRleHQ9XFxcIiZsYXF1bztcXFwiXFxyXFxuICAgIGxhc3QtdGV4dD1cXFwiJnJhcXVvO1xcXCJcXHJcXG4gICAgPlxcclxcbiAgPC9wYWdpbmF0aW9uPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEEgZm9ybWlvIGNvbXBvbmVudCB0ZW1wbGF0ZS5cclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudC5odG1sJyxcclxuICAgICAgXCI8bmctZm9ybSBuYW1lPVxcXCJmb3JtaW9GaWVsZEZvcm1cXFwiIGNsYXNzPVxcXCJmb3JtaW8tY29tcG9uZW50LXt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLWhpZGU9XFxcImNvbXBvbmVudC5oaWRkZW5cXFwiPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cCBoYXMtZmVlZGJhY2sgZm9ybS1maWVsZC10eXBlLXt7IGNvbXBvbmVudC50eXBlIH19IHt7Y29tcG9uZW50LmN1c3RvbUNsYXNzfX1cXFwiIGlkPVxcXCJmb3JtLWdyb3VwLXt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7J2hhcy1lcnJvcic6IGZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kaW52YWxpZCAmJiAhZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRwcmlzdGluZSB9XFxcIiBuZy1zdHlsZT1cXFwiY29tcG9uZW50LnN0eWxlXFxcIj5cXHJcXG4gICAgPGZvcm1pby1lbGVtZW50PjwvZm9ybWlvLWVsZW1lbnQ+XFxyXFxuICA8L2Rpdj5cXHJcXG48L25nLWZvcm0+XFxyXFxuXCJcclxuICAgICk7XHJcblxyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vZXJyb3JzLmh0bWwnLFxyXG4gICAgICBcIjxkaXYgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvciAmJiAhZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRwcmlzdGluZVxcXCI+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5lbWFpbFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBhIHZhbGlkIGVtYWlsLjwvcD5cXHJcXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLnJlcXVpcmVkXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBpcyByZXF1aXJlZC48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5udW1iZXJcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgYSBudW1iZXIuPC9wPlxcclxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IubWF4bGVuZ3RoXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIHNob3J0ZXIgdGhhbiB7eyBjb21wb25lbnQudmFsaWRhdGUubWF4TGVuZ3RoICsgMSB9fSBjaGFyYWN0ZXJzLjwvcD5cXHJcXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLm1pbmxlbmd0aFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBsb25nZXIgdGhhbiB7eyBjb21wb25lbnQudmFsaWRhdGUubWluTGVuZ3RoIC0gMSB9fSBjaGFyYWN0ZXJzLjwvcD5cXHJcXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLm1pblxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBoaWdoZXIgdGhhbiB7eyBjb21wb25lbnQudmFsaWRhdGUubWluIC0gMSB9fS48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5tYXhcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgbG93ZXIgdGhhbiB7eyBjb21wb25lbnQudmFsaWRhdGUubWF4ICsgMSB9fS48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5jdXN0b21cXFwiPnt7IGNvbXBvbmVudC5jdXN0b21FcnJvciB9fTwvcD5cXHJcXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLnBhdHRlcm5cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IGRvZXMgbm90IG1hdGNoIHRoZSBwYXR0ZXJuIHt7IGNvbXBvbmVudC52YWxpZGF0ZS5wYXR0ZXJuIH19PC9wPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICApO1xyXG4gIH1cclxuXSk7XHJcblxyXG5yZXF1aXJlKCcuL2NvbXBvbmVudHMnKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIHJlcXVpcmUoJy4vc3RvcmFnZS91cmwnKShhcHApO1xyXG4gIHJlcXVpcmUoJy4vc3RvcmFnZS9zMycpKGFwcCk7XHJcbiAgcmVxdWlyZSgnLi9zdG9yYWdlL2Ryb3Bib3gnKShhcHApO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnRm9ybWlvUGx1Z2luc1Byb3ZpZGVyJyxcclxuICAgICdGb3JtaW9TdG9yYWdlRHJvcGJveFByb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChcclxuICAgICAgRm9ybWlvUGx1Z2luc1Byb3ZpZGVyLFxyXG4gICAgICBGb3JtaW9TdG9yYWdlRHJvcGJveFByb3ZpZGVyXHJcbiAgICApIHtcclxuICAgICAgRm9ybWlvUGx1Z2luc1Byb3ZpZGVyLnJlZ2lzdGVyKCdzdG9yYWdlJywgJ2Ryb3Bib3gnLCBGb3JtaW9TdG9yYWdlRHJvcGJveFByb3ZpZGVyLiRnZXQoKSk7XHJcbiAgICB9XVxyXG4gICk7XHJcblxyXG4gIGFwcC5mYWN0b3J5KCdGb3JtaW9TdG9yYWdlRHJvcGJveCcsIFtcclxuICAgICckcScsXHJcbiAgICAnJHJvb3RTY29wZScsXHJcbiAgICAnJHdpbmRvdycsXHJcbiAgICAnJGh0dHAnLFxyXG4gICAgJ0Jsb2InLFxyXG4gICAgJ0ZpbGVTYXZlcicsXHJcbiAgICBmdW5jdGlvbihcclxuICAgICAgJHEsXHJcbiAgICAgICRyb290U2NvcGUsXHJcbiAgICAgICR3aW5kb3csXHJcbiAgICAgICRodHRwLFxyXG4gICAgICBCbG9iLFxyXG4gICAgICBGaWxlU2F2ZXJcclxuICAgICkge1xyXG4gICAgICB2YXIgZ2V0RHJvcGJveFRva2VuID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGRyb3Bib3hUb2tlbjtcclxuICAgICAgICBpZiAoJHJvb3RTY29wZS51c2VyICYmICRyb290U2NvcGUudXNlci5leHRlcm5hbFRva2Vucykge1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRyb290U2NvcGUudXNlci5leHRlcm5hbFRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcclxuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICdkcm9wYm94Jykge1xyXG4gICAgICAgICAgICAgIGRyb3Bib3hUb2tlbiA9IHRva2VuLnRva2VuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRyb3Bib3hUb2tlbjtcclxuICAgICAgICAvL3JldHVybiBfLnJlc3VsdChfLmZpbmQoJHJvb3RTY29wZS51c2VyLmV4dGVybmFsVG9rZW5zLCB7dHlwZTogJ2Ryb3Bib3gnfSksICd0b2tlbicpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0aXRsZTogJ0Ryb3Bib3gnLFxyXG4gICAgICAgIG5hbWU6ICdkcm9wYm94JyxcclxuICAgICAgICB1cGxvYWRGaWxlOiBmdW5jdGlvbihmaWxlLCBzdGF0dXMsICRzY29wZSkge1xyXG4gICAgICAgICAgdmFyIGRlZmVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgIHZhciBkaXIgPSAkc2NvcGUuY29tcG9uZW50LmRpciB8fCAnJztcclxuICAgICAgICAgIHZhciBkcm9wYm94VG9rZW4gPSBnZXREcm9wYm94VG9rZW4oKTtcclxuICAgICAgICAgIGlmICghZHJvcGJveFRva2VuKSB7XHJcbiAgICAgICAgICAgIGRlZmVyLnJlamVjdCgnWW91IG11c3QgYXV0aGVudGljYXRlIHdpdGggZHJvcGJveCBiZWZvcmUgdXBsb2FkaW5nIGZpbGVzLicpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIEJvdGggVXBsb2FkIGFuZCAkaHR0cCBkb24ndCBoYW5kbGUgZmlsZXMgYXMgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtIHdoaWNoIGlzIHJlcXVpcmVkIGJ5IGRyb3Bib3guXHJcbiAgICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvblByb2dyZXNzID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgICAgICAgICAgc3RhdHVzLnN0YXR1cyA9ICdwcm9ncmVzcyc7XHJcbiAgICAgICAgICAgICAgc3RhdHVzLnByb2dyZXNzID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcclxuICAgICAgICAgICAgICBkZWxldGUgc3RhdHVzLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gb25Qcm9ncmVzcztcclxuXHJcbiAgICAgICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSk7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIucmVqZWN0KHhoci5yZXNwb25zZSB8fCAnVW5hYmxlIHRvIHVwbG9hZCBmaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgeGhyLm9wZW4oJ1BPU1QnLCAnaHR0cHM6Ly9jb250ZW50LmRyb3Bib3hhcGkuY29tLzIvZmlsZXMvdXBsb2FkJyk7XHJcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgZHJvcGJveFRva2VuKTtcclxuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKTtcclxuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0Ryb3Bib3gtQVBJLUFyZycsIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICBwYXRoOiAnLycgKyBkaXIgKyBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgbW9kZTogJ2FkZCcsXHJcbiAgICAgICAgICAgICAgYXV0b3JlbmFtZTogdHJ1ZSxcclxuICAgICAgICAgICAgICBtdXRlOiBmYWxzZVxyXG4gICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICB4aHIuc2VuZChmaWxlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RmlsZTogZnVuY3Rpb24oZmlsZVVybCwgZmlsZSkge1xyXG4gICAgICAgICAgdmFyIGRlZmVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgIHZhciBkcm9wYm94VG9rZW4gPSBnZXREcm9wYm94VG9rZW4oKTtcclxuICAgICAgICAgIGlmICghZHJvcGJveFRva2VuKSB7XHJcbiAgICAgICAgICAgIGRlZmVyLnJlamVjdCgnWW91IG11c3QgYXV0aGVudGljYXRlIHdpdGggZHJvcGJveCBiZWZvcmUgZG93bmxvYWRpbmcgZmlsZXMuJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuXHJcbiAgICAgICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKHhoci5yZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIucmVqZWN0KHhoci5yZXNwb25zZSB8fCAnVW5hYmxlIHRvIGRvd25sb2FkIGZpbGUnKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB4aHIub3BlbignUE9TVCcsICdodHRwczovL2NvbnRlbnQuZHJvcGJveGFwaS5jb20vMi9maWxlcy9kb3dubG9hZCcpO1xyXG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIGRyb3Bib3hUb2tlbik7XHJcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdEcm9wYm94LUFQSS1BcmcnLCBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgcGF0aDogZmlsZS5wYXRoX2xvd2VyXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgeGhyLnNlbmQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG93bmxvYWRGaWxlOiBmdW5jdGlvbihldnQsIGZpbGUpIHtcclxuICAgICAgICAgIHZhciBzdHJNaW1lVHlwZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xyXG4gICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICB0aGlzLmdldEZpbGUobnVsbCwgZmlsZSkudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogc3RyTWltZVR5cGV9KTtcclxuICAgICAgICAgICAgRmlsZVNhdmVyLnNhdmVBcyhibG9iLCBmaWxlLm5hbWUsIHRydWUpO1xyXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcblxyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnRm9ybWlvUGx1Z2luc1Byb3ZpZGVyJyxcclxuICAgICdGb3JtaW9TdG9yYWdlUzNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoXHJcbiAgICAgIEZvcm1pb1BsdWdpbnNQcm92aWRlcixcclxuICAgICAgRm9ybWlvU3RvcmFnZVMzUHJvdmlkZXJcclxuICAgICkge1xyXG4gICAgICBGb3JtaW9QbHVnaW5zUHJvdmlkZXIucmVnaXN0ZXIoJ3N0b3JhZ2UnLCAnczMnLCBGb3JtaW9TdG9yYWdlUzNQcm92aWRlci4kZ2V0KCkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAuZmFjdG9yeSgnRm9ybWlvU3RvcmFnZVMzJywgW1xyXG4gICAgJyRxJyxcclxuICAgICckd2luZG93JyxcclxuICAgICdGb3JtaW8nLFxyXG4gICAgJ1VwbG9hZCcsXHJcbiAgICBmdW5jdGlvbihcclxuICAgICAgJHEsXHJcbiAgICAgICR3aW5kb3csXHJcbiAgICAgIEZvcm1pbyxcclxuICAgICAgVXBsb2FkXHJcbiAgICApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0aXRsZTogJ1MzJyxcclxuICAgICAgICBuYW1lOiAnczMnLFxyXG4gICAgICAgIHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUsIHN0YXR1cywgJHNjb3BlKSB7XHJcbiAgICAgICAgICB2YXIgZGVmZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgICAgRm9ybWlvLnJlcXVlc3QoJHNjb3BlLmZvcm1pby5mb3JtVXJsICsgJy9zdG9yYWdlL3MzJywgJ1BPU1QnLCB7XHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZSxcclxuICAgICAgICAgICAgc2l6ZTogZmlsZS5zaXplLFxyXG4gICAgICAgICAgICB0eXBlOiBmaWxlLnR5cGVcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHJlc3BvbnNlLnVybCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogcmVzcG9uc2UuZGF0YVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5kYXRhLmZpbGUgPSBmaWxlO1xyXG4gICAgICAgICAgICAgIHZhciBkaXIgPSAkc2NvcGUuY29tcG9uZW50LmRpciB8fCAnJztcclxuICAgICAgICAgICAgICByZXF1ZXN0LmRhdGEua2V5ICs9IGRpciArIGZpbGUubmFtZTtcclxuICAgICAgICAgICAgICB2YXIgdXBsb2FkID0gVXBsb2FkLnVwbG9hZChyZXF1ZXN0KTtcclxuICAgICAgICAgICAgICB1cGxvYWRcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdXBsb2FkIGZpbmlzaGVkLlxyXG4gICAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0OiByZXNwb25zZS5idWNrZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2V5OiByZXF1ZXN0LmRhdGEua2V5LFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogcmVzcG9uc2UudXJsICsgcmVxdWVzdC5kYXRhLmtleSxcclxuICAgICAgICAgICAgICAgICAgICBhY2w6IHJlcXVlc3QuZGF0YS5hY2wsXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZS5zaXplLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGUudHlwZVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3ApIHtcclxuICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgIHZhciBvUGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xyXG4gICAgICAgICAgICAgICAgICB2YXIgb0RPTSA9IG9QYXJzZXIucGFyc2VGcm9tU3RyaW5nKHJlc3AuZGF0YSwgJ3RleHQveG1sJyk7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gb0RPTS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnTWVzc2FnZScpWzBdLmlubmVySFRNTDtcclxuICAgICAgICAgICAgICAgICAgZGVmZXIucmVqZWN0KG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIFByb2dyZXNzIG5vdGlmeVxyXG4gICAgICAgICAgICAgICAgICBzdGF0dXMuc3RhdHVzID0gJ3Byb2dyZXNzJztcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzLnByb2dyZXNzID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcclxuICAgICAgICAgICAgICAgICAgZGVsZXRlIHN0YXR1cy5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcmV0dXJuIGRlZmVyLnByb21pc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRGaWxlOiBmdW5jdGlvbihmb3JtVXJsLCBmaWxlKSB7XHJcbiAgICAgICAgICBpZiAoZmlsZS5hY2wgIT09ICdwdWJsaWMtcmVhZCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIEZvcm1pby5yZXF1ZXN0KGZvcm1VcmwgKyAnL3N0b3JhZ2UvczM/YnVja2V0PScgKyBmaWxlLmJ1Y2tldCArICcma2V5PScgKyBmaWxlLmtleSwgJ0dFVCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG93bmxvYWRGaWxlOiBmdW5jdGlvbihldnQsIGZpbGUsICRzY29wZSkge1xyXG4gICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICB0aGlzLmdldEZpbGUoJHNjb3BlLmZvcm0sIGZpbGUpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xyXG4gICAgICAgICAgICAkd2luZG93Lm9wZW4oZmlsZS51cmwsICdfYmxhbmsnKTtcclxuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBJcyBhbGVydCB0aGUgYmVzdCB3YXkgdG8gZG8gdGhpcz9cclxuICAgICAgICAgICAgLy8gVXNlciBpcyBleHBlY3RpbmcgYW4gaW1tZWRpYXRlIG5vdGlmaWNhdGlvbiBkdWUgdG8gYXR0ZW1wdGluZyB0byBkb3dubG9hZCBhIGZpbGUuXHJcbiAgICAgICAgICAgIGFsZXJ0KHJlc3BvbnNlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ0Zvcm1pb1BsdWdpbnNQcm92aWRlcicsXHJcbiAgICAnRm9ybWlvU3RvcmFnZVVybFByb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChcclxuICAgICAgRm9ybWlvUGx1Z2luc1Byb3ZpZGVyLFxyXG4gICAgICBGb3JtaW9TdG9yYWdlVXJsUHJvdmlkZXJcclxuICAgICkge1xyXG4gICAgICBGb3JtaW9QbHVnaW5zUHJvdmlkZXIucmVnaXN0ZXIoJ3N0b3JhZ2UnLCAndXJsJywgRm9ybWlvU3RvcmFnZVVybFByb3ZpZGVyLiRnZXQoKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcblxyXG4gIGFwcC5mYWN0b3J5KCdGb3JtaW9TdG9yYWdlVXJsJywgW1xyXG4gICAgJyRxJyxcclxuICAgICdVcGxvYWQnLFxyXG4gICAgZnVuY3Rpb24gKFxyXG4gICAgICAkcSxcclxuICAgICAgVXBsb2FkXHJcbiAgICApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0aXRsZTogJ1VybCcsXHJcbiAgICAgICAgbmFtZTogJ3VybCcsXHJcbiAgICAgICAgdXBsb2FkRmlsZTogZnVuY3Rpb24oZmlsZSwgc3RhdHVzLCAkc2NvcGUpIHtcclxuICAgICAgICAgIHZhciBkZWZlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICBVcGxvYWQudXBsb2FkKHtcclxuICAgICAgICAgICAgdXJsOiAkc2NvcGUuY29tcG9uZW50LnVybCxcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgIGZpbGU6IGZpbGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xyXG4gICAgICAgICAgICAgIGRlZmVyLnJlc29sdmUocmVzcCk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3ApIHtcclxuICAgICAgICAgICAgICBkZWZlci5yZWplY3QocmVzcC5kYXRhKTtcclxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgIC8vIFByb2dyZXNzIG5vdGlmeVxyXG4gICAgICAgICAgICAgIHN0YXR1cy5zdGF0dXMgPSAncHJvZ3Jlc3MnO1xyXG4gICAgICAgICAgICAgIHN0YXR1cy5wcm9ncmVzcyA9IHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXR1cy5tZXNzYWdlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG93bmxvYWRGaWxlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIC8vIERvIG5vdGhpbmcgd2hpY2ggd2lsbCBjYXVzZSBhIG5vcm1hbCBsaW5rIGNsaWNrIHRvIG9jY3VyLlxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH1dXHJcbiAgKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAvLyBUaGUgZm9ybWlvIGNsYXNzLlxyXG4gIHZhciBGb3JtaW8gPSByZXF1aXJlKCdmb3JtaW9qcy9zcmMvZm9ybWlvLmpzJyk7XHJcblxyXG4gIC8vIFJldHVybiB0aGUgcHJvdmlkZXIgaW50ZXJmYWNlLlxyXG4gIHJldHVybiB7XHJcblxyXG4gICAgLy8gRXhwb3NlIEZvcm1pbyBjb25maWd1cmF0aW9uIGZ1bmN0aW9uc1xyXG4gICAgc2V0QmFzZVVybDogRm9ybWlvLnNldEJhc2VVcmwsXHJcbiAgICBnZXRCYXNlVXJsOiBGb3JtaW8uZ2V0QmFzZVVybCxcclxuICAgIHJlZ2lzdGVyUGx1Z2luOiBGb3JtaW8ucmVnaXN0ZXJQbHVnaW4sXHJcbiAgICBnZXRQbHVnaW46IEZvcm1pby5nZXRQbHVnaW4sXHJcbiAgICBzZXREb21haW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBSZW1vdmUgdGhpcz9cclxuICAgIH0sXHJcblxyXG4gICAgJGdldDogW1xyXG4gICAgICAnJHJvb3RTY29wZScsXHJcbiAgICAgICckcScsXHJcbiAgICAgIGZ1bmN0aW9uKFxyXG4gICAgICAgICRyb290U2NvcGUsXHJcbiAgICAgICAgJHFcclxuICAgICAgKSB7XHJcblxyXG4gICAgICAgIHZhciB3cmFwUVByb21pc2UgPSBmdW5jdGlvbihwcm9taXNlKSB7XHJcbiAgICAgICAgICByZXR1cm4gJHEud2hlbihwcm9taXNlKVxyXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvciA9PT0gJ1VuYXV0aG9yaXplZCcpIHtcclxuICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Zvcm1pby51bmF1dGhvcml6ZWQnLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZXJyb3IgPT09ICdMb2dpbiBUaW1lb3V0Jykge1xyXG4gICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIFByb3BhZ2F0ZSBlcnJvclxyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEZvcm1pby5yZWdpc3RlclBsdWdpbih7XHJcbiAgICAgICAgICBwcmlvcml0eTogLTEwMCxcclxuICAgICAgICAgIC8vIFdyYXAgRm9ybWlvLnJlcXVlc3QncyBwcm9taXNlcyB3aXRoICRxIHNvICRhcHBseSBnZXRzIGNhbGxlZCBjb3JyZWN0bHkuXHJcbiAgICAgICAgICB3cmFwUmVxdWVzdFByb21pc2U6IHdyYXBRUHJvbWlzZSxcclxuICAgICAgICAgIHdyYXBTdGF0aWNSZXF1ZXN0UHJvbWlzZTogd3JhcFFQcm9taXNlXHJcbiAgICAgICAgfSwgJ25nRm9ybWlvUHJvbWlzZVdyYXBwZXInKTtcclxuXHJcbiAgICAgICAgLy8gQnJvYWRjYXN0IG9mZmxpbmUgZXZlbnRzIGZyb20gJHJvb3RTY29wZVxyXG4gICAgICAgIEZvcm1pby5ldmVudHMub25BbnkoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB2YXIgZXZlbnQgPSAnZm9ybWlvLicgKyB0aGlzLmV2ZW50O1xyXG4gICAgICAgICAgdmFyIGFyZ3MgPSBbXS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDApO1xyXG4gICAgICAgICAgYXJncy51bnNoaWZ0KGV2ZW50KTtcclxuICAgICAgICAgICRyb290U2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QuYXBwbHkoJHJvb3RTY29wZSwgYXJncyk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gUmV0dXJuIHRoZSBmb3JtaW8gaW50ZXJmYWNlLlxyXG4gICAgICAgIHJldHVybiBGb3JtaW87XHJcbiAgICAgIH1cclxuICAgIF1cclxuICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICB2YXIgcGx1Z2lucyA9IHt9O1xyXG5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbih0eXBlLCBuYW1lLCBwbHVnaW4pIHtcclxuICAgICAgaWYgKCFwbHVnaW5zW3R5cGVdKSB7XHJcbiAgICAgICAgcGx1Z2luc1t0eXBlXSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIHBsdWdpbnNbdHlwZV1bbmFtZV0gPSBwbHVnaW47XHJcbiAgICB9LFxyXG5cclxuICAgICRnZXQ6IFtcclxuICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcclxuICAgICAgICAgIGlmICh0eXBlKSB7XHJcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHBsdWdpbnNbdHlwZV1bbmFtZV0gfHwgZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHBsdWdpbnNbdHlwZV0gfHwgZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcGx1Z2lucztcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIl19
