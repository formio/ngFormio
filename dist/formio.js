(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"_process":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"Q":1,"eventemitter2":2,"shallow-copy":6,"whatwg-fetch":7}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
        "<label ng-if=\"component.label && !component.hideLabel\" for=\"{{ component.key }}\" ng-class=\"{'field-required': component.validate.required}\">{{ component.label }}</label>\r\n<span ng-if=\"!component.label && component.validate.required\" class=\"glyphicon glyphicon-asterisk form-control-feedback field-required-inline\" aria-hidden=\"true\"></span>\r\n<ui-select ng-model=\"data[component.key]\" safe-multiple-to-single ng-disabled=\"readOnly\" ng-required=\"component.validate.required\" id=\"{{ component.key }}\" tabindex=\"{{ component.tabindex || 0 }}\" theme=\"bootstrap\">\r\n  <ui-select-match class=\"ui-select-match\" placeholder=\"{{ component.placeholder }}\">{{$item.formatted_address || $select.selected.formatted_address}}</ui-select-match>\r\n  <ui-select-choices class=\"ui-select-choices\" repeat=\"address in addresses\" refresh=\"refreshAddress($select.search)\" refresh-delay=\"500\">\r\n    <div ng-bind-html=\"address.formatted_address | highlight: $select.search\"></div>\r\n  </ui-select-choices>\r\n</ui-select>\r\n"
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
        "<div class=\"input-group\">\r\n  <input type=\"text\" class=\"form-control\"\r\n  ng-focus=\"calendarOpen = true\"\r\n  ng-click=\"calendarOpen = true\"\r\n  ng-init=\"calendarOpen = false\"\r\n  ng-disabled=\"readOnly\"\r\n  ng-required=\"component.validate.required\"\r\n  is-open=\"calendarOpen\"\r\n  datetime-picker=\"{{ component.format }}\"\r\n  min-date=\"component.minDate\"\r\n  max-date=\"component.maxDate\"\r\n  datepicker-mode=\"component.datepickerMode\"\r\n  enable-date=\"component.enableDate\"\r\n  enable-time=\"component.enableTime\"\r\n  ng-model=\"data[component.key]\"\r\n  tabindex=\"{{ component.tabindex || 0 }}\"\r\n  placeholder=\"{{ component.placeholder }}\"\r\n  datepicker-options=\"component.datePicker\"\r\n  timepicker-options=\"component.timePicker\" />\r\n  <span class=\"input-group-btn\">\r\n    <button type=\"button\" ng-disabled=\"readOnly\" class=\"btn btn-default\" ng-click=\"calendarOpen = true\">\r\n      <i ng-if=\"component.enableDate\" class=\"glyphicon glyphicon-calendar\"></i>\r\n      <i ng-if=\"!component.enableDate\" class=\"glyphicon glyphicon-time\"></i>\r\n    </button>\r\n  </span>\r\n</div>\r\n"
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
module.exports = function($compile) {
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
      i18n: '=?'
    },
    controller: [
      '$scope',
      '$http',
      '$element',
      'FormioScope',
      'Formio',
      'FormioUtils',
      'AppConfig',
      '$filter',
      function(
        $scope,
        $http,
        $element,
        FormioScope,
        Formio,
        FormioUtils,
        AppConfig,
        $filter
      ) {
        $scope._src = $scope.src || '';
        $scope.formioAlerts = [];
        $scope.i18n = 'en';
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

            //Internationalization
            /*
            * An external dropdown is required in html page which will list all available languages and their key values.
            * Ex: <select ng-model="languageSelect" class="languageSelect" ng-options="key as value for (key, value) in defaultLanguage"></select> 
            * Enable i18n multilangual property for a form. <formio i18n="languageSelect" src="userLoginForm"></formio>
            * To support above dropdown select an constant objact has to be defined in app.js. The object element contains the name and key of supported languages.
            * ex: 
            * .constant('LANGUAGES', {
                'languages': {
                  'en': 'English',
                  'dn': 'dansk',
                }
              });
            * Finally a filter is being used to execute the rest process and convert form component labels with selected language.
            */
            if($scope.i18n !== undefined){
              $scope.$watch('i18n', function(languageOption) {
                $scope.currentLanguage = languageOption;
                $filter('i18n')(component , languageOption) ;
              });
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

},{"formio-utils":3}],49:[function(require,module,exports){
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
  '$http', 'AppConfig',
  function($http, AppConfig) {
    return function(component, lang){
    	$http.get(AppConfig.languageUrl + '/' + lang +'.json').then(function(response) {
        angular.forEach(response.data, function(key1, value1) {
          if(component.key == value1) {
            component.label = key1;
          }
        });
      });
      return component;
    }
  }
];

},{}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
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

},{}],55:[function(require,module,exports){
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

},{}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
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
app.filter('i18n', require('./filters/i18n'));

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
      "\r\n<div ng-attr-dir=\"{{ currentLanguage == 'ar' ? 'rtl' : 'ltr' }}\" >\r\n  <i style=\"font-size: 2em;\" ng-if=\"formLoading\" class=\"glyphicon glyphicon-refresh glyphicon-spin\"></i>\r\n  <formio-wizard ng-if=\"form.display === 'wizard'\" src=\"src\" form=\"form\" submission=\"submission\" form-action=\"formAction\" read-only=\"readOnly\" hide-components=\"hideComponents\" formio-options=\"formioOptions\" storage=\"form.name\"></formio-wizard>\r\n  <form ng-if=\"!form.display || (form.display === 'form')\" role=\"form\" name=\"formioForm\" ng-submit=\"onSubmit(formioForm)\" novalidate>\r\n    <div ng-repeat=\"alert in formioAlerts\" class=\"alert alert-{{ alert.type }}\" role=\"alert\">\r\n      {{ alert.message }}\r\n    </div>\r\n    <formio-component ng-repeat=\"component in form.components track by $index\" component=\"component\" data=\"submission.data\" form=\"formioForm\" formio=\"formio\" read-only=\"readOnly || component.disabled\"></formio-component>\r\n  </form>\r\n</div>\r\n"
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

},{"./components":23,"./directives/customValidator":38,"./directives/formio":39,"./directives/formioComponent":40,"./directives/formioDelete":41,"./directives/formioElement":42,"./directives/formioErrors":43,"./directives/formioSubmission":44,"./directives/formioSubmissions":45,"./directives/formioWizard":46,"./factories/FormioScope":47,"./factories/FormioUtils":48,"./factories/formioInterceptor":49,"./factories/formioTableView":50,"./filters/flattenComponents":51,"./filters/i18n":52,"./filters/safehtml":53,"./filters/tableComponents":54,"./filters/tableFieldView":55,"./filters/tableView":56,"./plugins":58,"./providers/Formio":62,"./providers/FormioPlugins":63}],58:[function(require,module,exports){
"use strict";
module.exports = function(app) {
  require('./storage/url')(app);
  require('./storage/s3')(app);
  require('./storage/dropbox')(app);
};

},{"./storage/dropbox":59,"./storage/s3":60,"./storage/url":61}],59:[function(require,module,exports){
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


},{}],60:[function(require,module,exports){
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

},{}],61:[function(require,module,exports){
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

},{}],62:[function(require,module,exports){
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

},{"formiojs/src/formio.js":4}],63:[function(require,module,exports){
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

},{}]},{},[57])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvUS9xLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjIvbGliL2V2ZW50ZW1pdHRlcjIuanMiLCJub2RlX21vZHVsZXMvZm9ybWlvLXV0aWxzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mb3JtaW9qcy9zcmMvZm9ybWlvLmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9zaGFsbG93LWNvcHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2NvbXBvbmVudHMvYWRkcmVzcy5qcyIsInNyYy9jb21wb25lbnRzL2J1dHRvbi5qcyIsInNyYy9jb21wb25lbnRzL2NoZWNrYm94LmpzIiwic3JjL2NvbXBvbmVudHMvY29sdW1ucy5qcyIsInNyYy9jb21wb25lbnRzL2NvbXBvbmVudHMuanMiLCJzcmMvY29tcG9uZW50cy9jb250YWluZXIuanMiLCJzcmMvY29tcG9uZW50cy9jb250ZW50LmpzIiwic3JjL2NvbXBvbmVudHMvY3VzdG9tLmpzIiwic3JjL2NvbXBvbmVudHMvZGF0YWdyaWQuanMiLCJzcmMvY29tcG9uZW50cy9kYXRldGltZS5qcyIsInNyYy9jb21wb25lbnRzL2VtYWlsLmpzIiwic3JjL2NvbXBvbmVudHMvZmllbGRzZXQuanMiLCJzcmMvY29tcG9uZW50cy9maWxlLmpzIiwic3JjL2NvbXBvbmVudHMvaGlkZGVuLmpzIiwic3JjL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuanMiLCJzcmMvY29tcG9uZW50cy9pbmRleC5qcyIsInNyYy9jb21wb25lbnRzL251bWJlci5qcyIsInNyYy9jb21wb25lbnRzL3BhZ2UuanMiLCJzcmMvY29tcG9uZW50cy9wYW5lbC5qcyIsInNyYy9jb21wb25lbnRzL3Bhc3N3b3JkLmpzIiwic3JjL2NvbXBvbmVudHMvcGhvbmVudW1iZXIuanMiLCJzcmMvY29tcG9uZW50cy9yYWRpby5qcyIsInNyYy9jb21wb25lbnRzL3Jlc291cmNlLmpzIiwic3JjL2NvbXBvbmVudHMvc2VsZWN0LmpzIiwic3JjL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMuanMiLCJzcmMvY29tcG9uZW50cy9zaWduYXR1cmUuanMiLCJzcmMvY29tcG9uZW50cy90YWJsZS5qcyIsInNyYy9jb21wb25lbnRzL3RleHRhcmVhLmpzIiwic3JjL2NvbXBvbmVudHMvdGV4dGZpZWxkLmpzIiwic3JjL2NvbXBvbmVudHMvd2VsbC5qcyIsInNyYy9kaXJlY3RpdmVzL2N1c3RvbVZhbGlkYXRvci5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pby5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0NvbXBvbmVudC5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0RlbGV0ZS5qcyIsInNyYy9kaXJlY3RpdmVzL2Zvcm1pb0VsZW1lbnQuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9FcnJvcnMuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9uLmpzIiwic3JjL2RpcmVjdGl2ZXMvZm9ybWlvU3VibWlzc2lvbnMuanMiLCJzcmMvZGlyZWN0aXZlcy9mb3JtaW9XaXphcmQuanMiLCJzcmMvZmFjdG9yaWVzL0Zvcm1pb1Njb3BlLmpzIiwic3JjL2ZhY3Rvcmllcy9Gb3JtaW9VdGlscy5qcyIsInNyYy9mYWN0b3JpZXMvZm9ybWlvSW50ZXJjZXB0b3IuanMiLCJzcmMvZmFjdG9yaWVzL2Zvcm1pb1RhYmxlVmlldy5qcyIsInNyYy9maWx0ZXJzL2ZsYXR0ZW5Db21wb25lbnRzLmpzIiwic3JjL2ZpbHRlcnMvaTE4bi5qcyIsInNyYy9maWx0ZXJzL3NhZmVodG1sLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVDb21wb25lbnRzLmpzIiwic3JjL2ZpbHRlcnMvdGFibGVGaWVsZFZpZXcuanMiLCJzcmMvZmlsdGVycy90YWJsZVZpZXcuanMiLCJzcmMvZm9ybWlvLmpzIiwic3JjL3BsdWdpbnMvaW5kZXguanMiLCJzcmMvcGx1Z2lucy9zdG9yYWdlL2Ryb3Bib3guanMiLCJzcmMvcGx1Z2lucy9zdG9yYWdlL3MzLmpzIiwic3JjL3BsdWdpbnMvc3RvcmFnZS91cmwuanMiLCJzcmMvcHJvdmlkZXJzL0Zvcm1pby5qcyIsInNyYy9wcm92aWRlcnMvRm9ybWlvUGx1Z2lucy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoZ0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHZpbTp0cz00OnN0cz00OnN3PTQ6XG4vKiFcbiAqXG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEyIEtyaXMgS293YWwgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVRcbiAqIGxpY2Vuc2UgZm91bmQgYXQgaHR0cDovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3EvcmF3L21hc3Rlci9MSUNFTlNFXG4gKlxuICogV2l0aCBwYXJ0cyBieSBUeWxlciBDbG9zZVxuICogQ29weXJpZ2h0IDIwMDctMjAwOSBUeWxlciBDbG9zZSB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVCBYIGxpY2Vuc2UgZm91bmRcbiAqIGF0IGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UuaHRtbFxuICogRm9ya2VkIGF0IHJlZl9zZW5kLmpzIHZlcnNpb246IDIwMDktMDUtMTFcbiAqXG4gKiBXaXRoIHBhcnRzIGJ5IE1hcmsgTWlsbGVyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvLyBUaGlzIGZpbGUgd2lsbCBmdW5jdGlvbiBwcm9wZXJseSBhcyBhIDxzY3JpcHQ+IHRhZywgb3IgYSBtb2R1bGVcbiAgICAvLyB1c2luZyBDb21tb25KUyBhbmQgTm9kZUpTIG9yIFJlcXVpcmVKUyBtb2R1bGUgZm9ybWF0cy4gIEluXG4gICAgLy8gQ29tbW9uL05vZGUvUmVxdWlyZUpTLCB0aGUgbW9kdWxlIGV4cG9ydHMgdGhlIFEgQVBJIGFuZCB3aGVuXG4gICAgLy8gZXhlY3V0ZWQgYXMgYSBzaW1wbGUgPHNjcmlwdD4sIGl0IGNyZWF0ZXMgYSBRIGdsb2JhbCBpbnN0ZWFkLlxuXG4gICAgLy8gTW9udGFnZSBSZXF1aXJlXG4gICAgaWYgKHR5cGVvZiBib290c3RyYXAgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBib290c3RyYXAoXCJwcm9taXNlXCIsIGRlZmluaXRpb24pO1xuXG4gICAgLy8gQ29tbW9uSlNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG5cbiAgICAvLyBSZXF1aXJlSlNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShkZWZpbml0aW9uKTtcblxuICAgIC8vIFNFUyAoU2VjdXJlIEVjbWFTY3JpcHQpXG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGlmICghc2VzLm9rKCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlcy5tYWtlUSA9IGRlZmluaXRpb247XG4gICAgICAgIH1cblxuICAgIC8vIDxzY3JpcHQ+XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIFByZWZlciB3aW5kb3cgb3ZlciBzZWxmIGZvciBhZGQtb24gc2NyaXB0cy4gVXNlIHNlbGYgZm9yXG4gICAgICAgIC8vIG5vbi13aW5kb3dlZCBjb250ZXh0cy5cbiAgICAgICAgdmFyIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiBzZWxmO1xuXG4gICAgICAgIC8vIEdldCB0aGUgYHdpbmRvd2Agb2JqZWN0LCBzYXZlIHRoZSBwcmV2aW91cyBRIGdsb2JhbFxuICAgICAgICAvLyBhbmQgaW5pdGlhbGl6ZSBRIGFzIGEgZ2xvYmFsLlxuICAgICAgICB2YXIgcHJldmlvdXNRID0gZ2xvYmFsLlE7XG4gICAgICAgIGdsb2JhbC5RID0gZGVmaW5pdGlvbigpO1xuXG4gICAgICAgIC8vIEFkZCBhIG5vQ29uZmxpY3QgZnVuY3Rpb24gc28gUSBjYW4gYmUgcmVtb3ZlZCBmcm9tIHRoZVxuICAgICAgICAvLyBnbG9iYWwgbmFtZXNwYWNlLlxuICAgICAgICBnbG9iYWwuUS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZ2xvYmFsLlEgPSBwcmV2aW91c1E7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZW52aXJvbm1lbnQgd2FzIG5vdCBhbnRpY2lwYXRlZCBieSBRLiBQbGVhc2UgZmlsZSBhIGJ1Zy5cIik7XG4gICAgfVxuXG59KShmdW5jdGlvbiAoKSB7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGhhc1N0YWNrcyA9IGZhbHNlO1xudHJ5IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbn0gY2F0Y2ggKGUpIHtcbiAgICBoYXNTdGFja3MgPSAhIWUuc3RhY2s7XG59XG5cbi8vIEFsbCBjb2RlIGFmdGVyIHRoaXMgcG9pbnQgd2lsbCBiZSBmaWx0ZXJlZCBmcm9tIHN0YWNrIHRyYWNlcyByZXBvcnRlZFxuLy8gYnkgUS5cbnZhciBxU3RhcnRpbmdMaW5lID0gY2FwdHVyZUxpbmUoKTtcbnZhciBxRmlsZU5hbWU7XG5cbi8vIHNoaW1zXG5cbi8vIHVzZWQgZm9yIGZhbGxiYWNrIGluIFwiYWxsUmVzb2x2ZWRcIlxudmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcblxuLy8gVXNlIHRoZSBmYXN0ZXN0IHBvc3NpYmxlIG1lYW5zIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm5cbi8vIG9mIHRoZSBldmVudCBsb29wLlxudmFyIG5leHRUaWNrID0oZnVuY3Rpb24gKCkge1xuICAgIC8vIGxpbmtlZCBsaXN0IG9mIHRhc2tzIChzaW5nbGUsIHdpdGggaGVhZCBub2RlKVxuICAgIHZhciBoZWFkID0ge3Rhc2s6IHZvaWQgMCwgbmV4dDogbnVsbH07XG4gICAgdmFyIHRhaWwgPSBoZWFkO1xuICAgIHZhciBmbHVzaGluZyA9IGZhbHNlO1xuICAgIHZhciByZXF1ZXN0VGljayA9IHZvaWQgMDtcbiAgICB2YXIgaXNOb2RlSlMgPSBmYWxzZTtcbiAgICAvLyBxdWV1ZSBmb3IgbGF0ZSB0YXNrcywgdXNlZCBieSB1bmhhbmRsZWQgcmVqZWN0aW9uIHRyYWNraW5nXG4gICAgdmFyIGxhdGVyUXVldWUgPSBbXTtcblxuICAgIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgICAgICAvKiBqc2hpbnQgbG9vcGZ1bmM6IHRydWUgKi9cbiAgICAgICAgdmFyIHRhc2ssIGRvbWFpbjtcblxuICAgICAgICB3aGlsZSAoaGVhZC5uZXh0KSB7XG4gICAgICAgICAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgICAgICAgICAgdGFzayA9IGhlYWQudGFzaztcbiAgICAgICAgICAgIGhlYWQudGFzayA9IHZvaWQgMDtcbiAgICAgICAgICAgIGRvbWFpbiA9IGhlYWQuZG9tYWluO1xuXG4gICAgICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgaGVhZC5kb21haW4gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBydW5TaW5nbGUodGFzaywgZG9tYWluKTtcblxuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChsYXRlclF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGFzayA9IGxhdGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBydW5TaW5nbGUodGFzayk7XG4gICAgICAgIH1cbiAgICAgICAgZmx1c2hpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgLy8gcnVucyBhIHNpbmdsZSBmdW5jdGlvbiBpbiB0aGUgYXN5bmMgcXVldWVcbiAgICBmdW5jdGlvbiBydW5TaW5nbGUodGFzaywgZG9tYWluKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0YXNrKCk7XG5cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUpTKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gbm9kZSwgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgY29uc2lkZXJlZCBmYXRhbCBlcnJvcnMuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBzeW5jaHJvbm91c2x5IHRvIGludGVycnVwdCBmbHVzaGluZyFcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjb250aW51YXRpb24gaWYgdGhlIHVuY2F1Z2h0IGV4Y2VwdGlvbiBpcyBzdXBwcmVzc2VkXG4gICAgICAgICAgICAgICAgLy8gbGlzdGVuaW5nIFwidW5jYXVnaHRFeGNlcHRpb25cIiBldmVudHMgKGFzIGRvbWFpbnMgZG9lcykuXG4gICAgICAgICAgICAgICAgLy8gQ29udGludWUgaW4gbmV4dCBldmVudCB0byBhdm9pZCB0aWNrIHJlY3Vyc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBicm93c2VycywgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgbm90IGZhdGFsLlxuICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgc2xvdy1kb3ducy5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZXh0VGljayA9IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7XG4gICAgICAgICAgICB0YXNrOiB0YXNrLFxuICAgICAgICAgICAgZG9tYWluOiBpc05vZGVKUyAmJiBwcm9jZXNzLmRvbWFpbixcbiAgICAgICAgICAgIG5leHQ6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoIWZsdXNoaW5nKSB7XG4gICAgICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgICAgICAgICByZXF1ZXN0VGljaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICBwcm9jZXNzLnRvU3RyaW5nKCkgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAgICAgLy8gRW5zdXJlIFEgaXMgaW4gYSByZWFsIE5vZGUgZW52aXJvbm1lbnQsIHdpdGggYSBgcHJvY2Vzcy5uZXh0VGlja2AuXG4gICAgICAgIC8vIFRvIHNlZSB0aHJvdWdoIGZha2UgTm9kZSBlbnZpcm9ubWVudHM6XG4gICAgICAgIC8vICogTW9jaGEgdGVzdCBydW5uZXIgLSBleHBvc2VzIGEgYHByb2Nlc3NgIGdsb2JhbCB3aXRob3V0IGEgYG5leHRUaWNrYFxuICAgICAgICAvLyAqIEJyb3dzZXJpZnkgLSBleHBvc2VzIGEgYHByb2Nlc3MubmV4VGlja2AgZnVuY3Rpb24gdGhhdCB1c2VzXG4gICAgICAgIC8vICAgYHNldFRpbWVvdXRgLiBJbiB0aGlzIGNhc2UgYHNldEltbWVkaWF0ZWAgaXMgcHJlZmVycmVkIGJlY2F1c2VcbiAgICAgICAgLy8gICAgaXQgaXMgZmFzdGVyLiBCcm93c2VyaWZ5J3MgYHByb2Nlc3MudG9TdHJpbmcoKWAgeWllbGRzXG4gICAgICAgIC8vICAgXCJbb2JqZWN0IE9iamVjdF1cIiwgd2hpbGUgaW4gYSByZWFsIE5vZGUgZW52aXJvbm1lbnRcbiAgICAgICAgLy8gICBgcHJvY2Vzcy5uZXh0VGljaygpYCB5aWVsZHMgXCJbb2JqZWN0IHByb2Nlc3NdXCIuXG4gICAgICAgIGlzTm9kZUpTID0gdHJ1ZTtcblxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgICAgICB9O1xuXG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gSW4gSUUxMCwgTm9kZS5qcyAwLjkrLCBvciBodHRwczovL2dpdGh1Yi5jb20vTm9ibGVKUy9zZXRJbW1lZGlhdGVcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gc2V0SW1tZWRpYXRlLmJpbmQod2luZG93LCBmbHVzaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZmx1c2gpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgIC8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXG4gICAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIC8vIEF0IGxlYXN0IFNhZmFyaSBWZXJzaW9uIDYuMC41ICg4NTM2LjMwLjEpIGludGVybWl0dGVudGx5IGNhbm5vdCBjcmVhdGVcbiAgICAgICAgLy8gd29ya2luZyBtZXNzYWdlIHBvcnRzIHRoZSBmaXJzdCB0aW1lIGEgcGFnZSBsb2Fkcy5cbiAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IHJlcXVlc3RQb3J0VGljaztcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gICAgICAgICAgICBmbHVzaCgpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVxdWVzdFBvcnRUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gT3BlcmEgcmVxdWlyZXMgdXMgdG8gcHJvdmlkZSBhIG1lc3NhZ2UgcGF5bG9hZCwgcmVnYXJkbGVzcyBvZlxuICAgICAgICAgICAgLy8gd2hldGhlciB3ZSB1c2UgaXQuXG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICAgICAgcmVxdWVzdFBvcnRUaWNrKCk7XG4gICAgICAgIH07XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvbGQgYnJvd3NlcnNcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLy8gcnVucyBhIHRhc2sgYWZ0ZXIgYWxsIG90aGVyIHRhc2tzIGhhdmUgYmVlbiBydW5cbiAgICAvLyB0aGlzIGlzIHVzZWZ1bCBmb3IgdW5oYW5kbGVkIHJlamVjdGlvbiB0cmFja2luZyB0aGF0IG5lZWRzIHRvIGhhcHBlblxuICAgIC8vIGFmdGVyIGFsbCBgdGhlbmBkIHRhc2tzIGhhdmUgYmVlbiBydW4uXG4gICAgbmV4dFRpY2sucnVuQWZ0ZXIgPSBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICBsYXRlclF1ZXVlLnB1c2godGFzayk7XG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBuZXh0VGljaztcbn0pKCk7XG5cbi8vIEF0dGVtcHQgdG8gbWFrZSBnZW5lcmljcyBzYWZlIGluIHRoZSBmYWNlIG9mIGRvd25zdHJlYW1cbi8vIG1vZGlmaWNhdGlvbnMuXG4vLyBUaGVyZSBpcyBubyBzaXR1YXRpb24gd2hlcmUgdGhpcyBpcyBuZWNlc3NhcnkuXG4vLyBJZiB5b3UgbmVlZCBhIHNlY3VyaXR5IGd1YXJhbnRlZSwgdGhlc2UgcHJpbW9yZGlhbHMgbmVlZCB0byBiZVxuLy8gZGVlcGx5IGZyb3plbiBhbnl3YXksIGFuZCBpZiB5b3UgZG9u4oCZdCBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLFxuLy8gdGhpcyBpcyBqdXN0IHBsYWluIHBhcmFub2lkLlxuLy8gSG93ZXZlciwgdGhpcyAqKm1pZ2h0KiogaGF2ZSB0aGUgbmljZSBzaWRlLWVmZmVjdCBvZiByZWR1Y2luZyB0aGUgc2l6ZSBvZlxuLy8gdGhlIG1pbmlmaWVkIGNvZGUgYnkgcmVkdWNpbmcgeC5jYWxsKCkgdG8gbWVyZWx5IHgoKVxuLy8gU2VlIE1hcmsgTWlsbGVy4oCZcyBleHBsYW5hdGlvbiBvZiB3aGF0IHRoaXMgZG9lcy5cbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWNvbnZlbnRpb25zOnNhZmVfbWV0YV9wcm9ncmFtbWluZ1xudmFyIGNhbGwgPSBGdW5jdGlvbi5jYWxsO1xuZnVuY3Rpb24gdW5jdXJyeVRoaXMoZikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjYWxsLmFwcGx5KGYsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cbi8vIFRoaXMgaXMgZXF1aXZhbGVudCwgYnV0IHNsb3dlcjpcbi8vIHVuY3VycnlUaGlzID0gRnVuY3Rpb25fYmluZC5iaW5kKEZ1bmN0aW9uX2JpbmQuY2FsbCk7XG4vLyBodHRwOi8vanNwZXJmLmNvbS91bmN1cnJ5dGhpc1xuXG52YXIgYXJyYXlfc2xpY2UgPSB1bmN1cnJ5VGhpcyhBcnJheS5wcm90b3R5cGUuc2xpY2UpO1xuXG52YXIgYXJyYXlfcmVkdWNlID0gdW5jdXJyeVRoaXMoXG4gICAgQXJyYXkucHJvdG90eXBlLnJlZHVjZSB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzKSB7XG4gICAgICAgIHZhciBpbmRleCA9IDAsXG4gICAgICAgICAgICBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgLy8gY29uY2VybmluZyB0aGUgaW5pdGlhbCB2YWx1ZSwgaWYgb25lIGlzIG5vdCBwcm92aWRlZFxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgLy8gc2VlayB0byB0aGUgZmlyc3QgdmFsdWUgaW4gdGhlIGFycmF5LCBhY2NvdW50aW5nXG4gICAgICAgICAgICAvLyBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgaXMgaXMgYSBzcGFyc2UgYXJyYXlcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggaW4gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBiYXNpcyA9IHRoaXNbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoKytpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gd2hpbGUgKDEpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJlZHVjZVxuICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIC8vIGFjY291bnQgZm9yIHRoZSBwb3NzaWJpbGl0eSB0aGF0IHRoZSBhcnJheSBpcyBzcGFyc2VcbiAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgYmFzaXMgPSBjYWxsYmFjayhiYXNpcywgdGhpc1tpbmRleF0sIGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmFzaXM7XG4gICAgfVxuKTtcblxudmFyIGFycmF5X2luZGV4T2YgPSB1bmN1cnJ5VGhpcyhcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiB8fCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbm90IGEgdmVyeSBnb29kIHNoaW0sIGJ1dCBnb29kIGVub3VnaCBmb3Igb3VyIG9uZSB1c2Ugb2YgaXRcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpc1tpXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuKTtcblxudmFyIGFycmF5X21hcCA9IHVuY3VycnlUaGlzKFxuICAgIEFycmF5LnByb3RvdHlwZS5tYXAgfHwgZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBjb2xsZWN0ID0gW107XG4gICAgICAgIGFycmF5X3JlZHVjZShzZWxmLCBmdW5jdGlvbiAodW5kZWZpbmVkLCB2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGNvbGxlY3QucHVzaChjYWxsYmFjay5jYWxsKHRoaXNwLCB2YWx1ZSwgaW5kZXgsIHNlbGYpKTtcbiAgICAgICAgfSwgdm9pZCAwKTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Q7XG4gICAgfVxuKTtcblxudmFyIG9iamVjdF9jcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcbiAgICBmdW5jdGlvbiBUeXBlKCkgeyB9XG4gICAgVHlwZS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgcmV0dXJuIG5ldyBUeXBlKCk7XG59O1xuXG52YXIgb2JqZWN0X2hhc093blByb3BlcnR5ID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XG5cbnZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKG9iamVjdF9oYXNPd25Qcm9wZXJ0eShvYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBrZXlzO1xufTtcblxudmFyIG9iamVjdF90b1N0cmluZyA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xuXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gT2JqZWN0KHZhbHVlKTtcbn1cblxuLy8gZ2VuZXJhdG9yIHJlbGF0ZWQgc2hpbXNcblxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGZ1bmN0aW9uIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluIFNwaWRlck1vbmtleS5cbmZ1bmN0aW9uIGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pIHtcbiAgICByZXR1cm4gKFxuICAgICAgICBvYmplY3RfdG9TdHJpbmcoZXhjZXB0aW9uKSA9PT0gXCJbb2JqZWN0IFN0b3BJdGVyYXRpb25dXCIgfHxcbiAgICAgICAgZXhjZXB0aW9uIGluc3RhbmNlb2YgUVJldHVyblZhbHVlXG4gICAgKTtcbn1cblxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGhlbHBlciBhbmQgUS5yZXR1cm4gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW5cbi8vIFNwaWRlck1vbmtleS5cbnZhciBRUmV0dXJuVmFsdWU7XG5pZiAodHlwZW9mIFJldHVyblZhbHVlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgUVJldHVyblZhbHVlID0gUmV0dXJuVmFsdWU7XG59IGVsc2Uge1xuICAgIFFSZXR1cm5WYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfTtcbn1cblxuLy8gbG9uZyBzdGFjayB0cmFjZXNcblxudmFyIFNUQUNLX0pVTVBfU0VQQVJBVE9SID0gXCJGcm9tIHByZXZpb3VzIGV2ZW50OlwiO1xuXG5mdW5jdGlvbiBtYWtlU3RhY2tUcmFjZUxvbmcoZXJyb3IsIHByb21pc2UpIHtcbiAgICAvLyBJZiBwb3NzaWJsZSwgdHJhbnNmb3JtIHRoZSBlcnJvciBzdGFjayB0cmFjZSBieSByZW1vdmluZyBOb2RlIGFuZCBRXG4gICAgLy8gY3J1ZnQsIHRoZW4gY29uY2F0ZW5hdGluZyB3aXRoIHRoZSBzdGFjayB0cmFjZSBvZiBgcHJvbWlzZWAuIFNlZSAjNTcuXG4gICAgaWYgKGhhc1N0YWNrcyAmJlxuICAgICAgICBwcm9taXNlLnN0YWNrICYmXG4gICAgICAgIHR5cGVvZiBlcnJvciA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICBlcnJvciAhPT0gbnVsbCAmJlxuICAgICAgICBlcnJvci5zdGFjayAmJlxuICAgICAgICBlcnJvci5zdGFjay5pbmRleE9mKFNUQUNLX0pVTVBfU0VQQVJBVE9SKSA9PT0gLTFcbiAgICApIHtcbiAgICAgICAgdmFyIHN0YWNrcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBwID0gcHJvbWlzZTsgISFwOyBwID0gcC5zb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChwLnN0YWNrKSB7XG4gICAgICAgICAgICAgICAgc3RhY2tzLnVuc2hpZnQocC5zdGFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3RhY2tzLnVuc2hpZnQoZXJyb3Iuc3RhY2spO1xuXG4gICAgICAgIHZhciBjb25jYXRlZFN0YWNrcyA9IHN0YWNrcy5qb2luKFwiXFxuXCIgKyBTVEFDS19KVU1QX1NFUEFSQVRPUiArIFwiXFxuXCIpO1xuICAgICAgICBlcnJvci5zdGFjayA9IGZpbHRlclN0YWNrU3RyaW5nKGNvbmNhdGVkU3RhY2tzKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlclN0YWNrU3RyaW5nKHN0YWNrU3RyaW5nKSB7XG4gICAgdmFyIGxpbmVzID0gc3RhY2tTdHJpbmcuc3BsaXQoXCJcXG5cIik7XG4gICAgdmFyIGRlc2lyZWRMaW5lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGxpbmUgPSBsaW5lc1tpXTtcblxuICAgICAgICBpZiAoIWlzSW50ZXJuYWxGcmFtZShsaW5lKSAmJiAhaXNOb2RlRnJhbWUobGluZSkgJiYgbGluZSkge1xuICAgICAgICAgICAgZGVzaXJlZExpbmVzLnB1c2gobGluZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc2lyZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiBpc05vZGVGcmFtZShzdGFja0xpbmUpIHtcbiAgICByZXR1cm4gc3RhY2tMaW5lLmluZGV4T2YoXCIobW9kdWxlLmpzOlwiKSAhPT0gLTEgfHxcbiAgICAgICAgICAgc3RhY2tMaW5lLmluZGV4T2YoXCIobm9kZS5qczpcIikgIT09IC0xO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKSB7XG4gICAgLy8gTmFtZWQgZnVuY3Rpb25zOiBcImF0IGZ1bmN0aW9uTmFtZSAoZmlsZW5hbWU6bGluZU51bWJlcjpjb2x1bW5OdW1iZXIpXCJcbiAgICAvLyBJbiBJRTEwIGZ1bmN0aW9uIG5hbWUgY2FuIGhhdmUgc3BhY2VzIChcIkFub255bW91cyBmdW5jdGlvblwiKSBPX29cbiAgICB2YXIgYXR0ZW1wdDEgPSAvYXQgLisgXFwoKC4rKTooXFxkKyk6KD86XFxkKylcXCkkLy5leGVjKHN0YWNrTGluZSk7XG4gICAgaWYgKGF0dGVtcHQxKSB7XG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDFbMV0sIE51bWJlcihhdHRlbXB0MVsyXSldO1xuICAgIH1cblxuICAgIC8vIEFub255bW91cyBmdW5jdGlvbnM6IFwiYXQgZmlsZW5hbWU6bGluZU51bWJlcjpjb2x1bW5OdW1iZXJcIlxuICAgIHZhciBhdHRlbXB0MiA9IC9hdCAoW14gXSspOihcXGQrKTooPzpcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDIpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MlsxXSwgTnVtYmVyKGF0dGVtcHQyWzJdKV07XG4gICAgfVxuXG4gICAgLy8gRmlyZWZveCBzdHlsZTogXCJmdW5jdGlvbkBmaWxlbmFtZTpsaW5lTnVtYmVyIG9yIEBmaWxlbmFtZTpsaW5lTnVtYmVyXCJcbiAgICB2YXIgYXR0ZW1wdDMgPSAvLipAKC4rKTooXFxkKykkLy5leGVjKHN0YWNrTGluZSk7XG4gICAgaWYgKGF0dGVtcHQzKSB7XG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDNbMV0sIE51bWJlcihhdHRlbXB0M1syXSldO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNJbnRlcm5hbEZyYW1lKHN0YWNrTGluZSkge1xuICAgIHZhciBmaWxlTmFtZUFuZExpbmVOdW1iZXIgPSBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKTtcblxuICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XG4gICAgdmFyIGxpbmVOdW1iZXIgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XG5cbiAgICByZXR1cm4gZmlsZU5hbWUgPT09IHFGaWxlTmFtZSAmJlxuICAgICAgICBsaW5lTnVtYmVyID49IHFTdGFydGluZ0xpbmUgJiZcbiAgICAgICAgbGluZU51bWJlciA8PSBxRW5kaW5nTGluZTtcbn1cblxuLy8gZGlzY292ZXIgb3duIGZpbGUgbmFtZSBhbmQgbGluZSBudW1iZXIgcmFuZ2UgZm9yIGZpbHRlcmluZyBzdGFja1xuLy8gdHJhY2VzXG5mdW5jdGlvbiBjYXB0dXJlTGluZSgpIHtcbiAgICBpZiAoIWhhc1N0YWNrcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YXIgbGluZXMgPSBlLnN0YWNrLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICB2YXIgZmlyc3RMaW5lID0gbGluZXNbMF0uaW5kZXhPZihcIkBcIikgPiAwID8gbGluZXNbMV0gOiBsaW5lc1syXTtcbiAgICAgICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihmaXJzdExpbmUpO1xuICAgICAgICBpZiAoIWZpbGVOYW1lQW5kTGluZU51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcUZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xuICAgICAgICByZXR1cm4gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzFdO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZGVwcmVjYXRlKGNhbGxiYWNrLCBuYW1lLCBhbHRlcm5hdGl2ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUud2FybiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4obmFtZSArIFwiIGlzIGRlcHJlY2F0ZWQsIHVzZSBcIiArIGFsdGVybmF0aXZlICtcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIiBpbnN0ZWFkLlwiLCBuZXcgRXJyb3IoXCJcIikuc3RhY2spO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjYWxsYmFjaywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuXG4vLyBlbmQgb2Ygc2hpbXNcbi8vIGJlZ2lubmluZyBvZiByZWFsIHdvcmtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgcHJvbWlzZSBmb3IgYW4gaW1tZWRpYXRlIHJlZmVyZW5jZSwgcGFzc2VzIHByb21pc2VzIHRocm91Z2gsIG9yXG4gKiBjb2VyY2VzIHByb21pc2VzIGZyb20gZGlmZmVyZW50IHN5c3RlbXMuXG4gKiBAcGFyYW0gdmFsdWUgaW1tZWRpYXRlIHJlZmVyZW5jZSBvciBwcm9taXNlXG4gKi9cbmZ1bmN0aW9uIFEodmFsdWUpIHtcbiAgICAvLyBJZiB0aGUgb2JqZWN0IGlzIGFscmVhZHkgYSBQcm9taXNlLCByZXR1cm4gaXQgZGlyZWN0bHkuICBUaGlzIGVuYWJsZXNcbiAgICAvLyB0aGUgcmVzb2x2ZSBmdW5jdGlvbiB0byBib3RoIGJlIHVzZWQgdG8gY3JlYXRlZCByZWZlcmVuY2VzIGZyb20gb2JqZWN0cyxcbiAgICAvLyBidXQgdG8gdG9sZXJhYmx5IGNvZXJjZSBub24tcHJvbWlzZXMgdG8gcHJvbWlzZXMuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gYXNzaW1pbGF0ZSB0aGVuYWJsZXNcbiAgICBpZiAoaXNQcm9taXNlQWxpa2UodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBjb2VyY2UodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmdWxmaWxsKHZhbHVlKTtcbiAgICB9XG59XG5RLnJlc29sdmUgPSBRO1xuXG4vKipcbiAqIFBlcmZvcm1zIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuIG9mIHRoZSBldmVudCBsb29wLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGFza1xuICovXG5RLm5leHRUaWNrID0gbmV4dFRpY2s7XG5cbi8qKlxuICogQ29udHJvbHMgd2hldGhlciBvciBub3QgbG9uZyBzdGFjayB0cmFjZXMgd2lsbCBiZSBvblxuICovXG5RLmxvbmdTdGFja1N1cHBvcnQgPSBmYWxzZTtcblxuLy8gZW5hYmxlIGxvbmcgc3RhY2tzIGlmIFFfREVCVUcgaXMgc2V0XG5pZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgcHJvY2VzcyAmJiBwcm9jZXNzLmVudiAmJiBwcm9jZXNzLmVudi5RX0RFQlVHKSB7XG4gICAgUS5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEge3Byb21pc2UsIHJlc29sdmUsIHJlamVjdH0gb2JqZWN0LlxuICpcbiAqIGByZXNvbHZlYCBpcyBhIGNhbGxiYWNrIHRvIGludm9rZSB3aXRoIGEgbW9yZSByZXNvbHZlZCB2YWx1ZSBmb3IgdGhlXG4gKiBwcm9taXNlLiBUbyBmdWxmaWxsIHRoZSBwcm9taXNlLCBpbnZva2UgYHJlc29sdmVgIHdpdGggYW55IHZhbHVlIHRoYXQgaXNcbiAqIG5vdCBhIHRoZW5hYmxlLiBUbyByZWplY3QgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhIHJlamVjdGVkXG4gKiB0aGVuYWJsZSwgb3IgaW52b2tlIGByZWplY3RgIHdpdGggdGhlIHJlYXNvbiBkaXJlY3RseS4gVG8gcmVzb2x2ZSB0aGVcbiAqIHByb21pc2UgdG8gYW5vdGhlciB0aGVuYWJsZSwgdGh1cyBwdXR0aW5nIGl0IGluIHRoZSBzYW1lIHN0YXRlLCBpbnZva2VcbiAqIGByZXNvbHZlYCB3aXRoIHRoYXQgb3RoZXIgdGhlbmFibGUuXG4gKi9cblEuZGVmZXIgPSBkZWZlcjtcbmZ1bmN0aW9uIGRlZmVyKCkge1xuICAgIC8vIGlmIFwibWVzc2FnZXNcIiBpcyBhbiBcIkFycmF5XCIsIHRoYXQgaW5kaWNhdGVzIHRoYXQgdGhlIHByb21pc2UgaGFzIG5vdCB5ZXRcbiAgICAvLyBiZWVuIHJlc29sdmVkLiAgSWYgaXQgaXMgXCJ1bmRlZmluZWRcIiwgaXQgaGFzIGJlZW4gcmVzb2x2ZWQuICBFYWNoXG4gICAgLy8gZWxlbWVudCBvZiB0aGUgbWVzc2FnZXMgYXJyYXkgaXMgaXRzZWxmIGFuIGFycmF5IG9mIGNvbXBsZXRlIGFyZ3VtZW50cyB0b1xuICAgIC8vIGZvcndhcmQgdG8gdGhlIHJlc29sdmVkIHByb21pc2UuICBXZSBjb2VyY2UgdGhlIHJlc29sdXRpb24gdmFsdWUgdG8gYVxuICAgIC8vIHByb21pc2UgdXNpbmcgdGhlIGByZXNvbHZlYCBmdW5jdGlvbiBiZWNhdXNlIGl0IGhhbmRsZXMgYm90aCBmdWxseVxuICAgIC8vIG5vbi10aGVuYWJsZSB2YWx1ZXMgYW5kIG90aGVyIHRoZW5hYmxlcyBncmFjZWZ1bGx5LlxuICAgIHZhciBtZXNzYWdlcyA9IFtdLCBwcm9ncmVzc0xpc3RlbmVycyA9IFtdLCByZXNvbHZlZFByb21pc2U7XG5cbiAgICB2YXIgZGVmZXJyZWQgPSBvYmplY3RfY3JlYXRlKGRlZmVyLnByb3RvdHlwZSk7XG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcblxuICAgIHByb21pc2UucHJvbWlzZURpc3BhdGNoID0gZnVuY3Rpb24gKHJlc29sdmUsIG9wLCBvcGVyYW5kcykge1xuICAgICAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChtZXNzYWdlcykge1xuICAgICAgICAgICAgbWVzc2FnZXMucHVzaChhcmdzKTtcbiAgICAgICAgICAgIGlmIChvcCA9PT0gXCJ3aGVuXCIgJiYgb3BlcmFuZHNbMV0pIHsgLy8gcHJvZ3Jlc3Mgb3BlcmFuZFxuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXJzLnB1c2gob3BlcmFuZHNbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZWRQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShyZXNvbHZlZFByb21pc2UsIGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWRcbiAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcykge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5lYXJlclZhbHVlID0gbmVhcmVyKHJlc29sdmVkUHJvbWlzZSk7XG4gICAgICAgIGlmIChpc1Byb21pc2UobmVhcmVyVmFsdWUpKSB7XG4gICAgICAgICAgICByZXNvbHZlZFByb21pc2UgPSBuZWFyZXJWYWx1ZTsgLy8gc2hvcnRlbiBjaGFpblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZWFyZXJWYWx1ZTtcbiAgICB9O1xuXG4gICAgcHJvbWlzZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicGVuZGluZ1wiIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUHJvbWlzZS5pbnNwZWN0KCk7XG4gICAgfTtcblxuICAgIGlmIChRLmxvbmdTdGFja1N1cHBvcnQgJiYgaGFzU3RhY2tzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gTk9URTogZG9uJ3QgdHJ5IHRvIHVzZSBgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2VgIG9yIHRyYW5zZmVyIHRoZVxuICAgICAgICAgICAgLy8gYWNjZXNzb3IgYXJvdW5kOyB0aGF0IGNhdXNlcyBtZW1vcnkgbGVha3MgYXMgcGVyIEdILTExMS4gSnVzdFxuICAgICAgICAgICAgLy8gcmVpZnkgdGhlIHN0YWNrIHRyYWNlIGFzIGEgc3RyaW5nIEFTQVAuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gQXQgdGhlIHNhbWUgdGltZSwgY3V0IG9mZiB0aGUgZmlyc3QgbGluZTsgaXQncyBhbHdheXMganVzdFxuICAgICAgICAgICAgLy8gXCJbb2JqZWN0IFByb21pc2VdXFxuXCIsIGFzIHBlciB0aGUgYHRvU3RyaW5nYC5cbiAgICAgICAgICAgIHByb21pc2Uuc3RhY2sgPSBlLnN0YWNrLnN1YnN0cmluZyhlLnN0YWNrLmluZGV4T2YoXCJcXG5cIikgKyAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5PVEU6IHdlIGRvIHRoZSBjaGVja3MgZm9yIGByZXNvbHZlZFByb21pc2VgIGluIGVhY2ggbWV0aG9kLCBpbnN0ZWFkIG9mXG4gICAgLy8gY29uc29saWRhdGluZyB0aGVtIGludG8gYGJlY29tZWAsIHNpbmNlIG90aGVyd2lzZSB3ZSdkIGNyZWF0ZSBuZXdcbiAgICAvLyBwcm9taXNlcyB3aXRoIHRoZSBsaW5lcyBgYmVjb21lKHdoYXRldmVyKHZhbHVlKSlgLiBTZWUgZS5nLiBHSC0yNTIuXG5cbiAgICBmdW5jdGlvbiBiZWNvbWUobmV3UHJvbWlzZSkge1xuICAgICAgICByZXNvbHZlZFByb21pc2UgPSBuZXdQcm9taXNlO1xuICAgICAgICBwcm9taXNlLnNvdXJjZSA9IG5ld1Byb21pc2U7XG5cbiAgICAgICAgYXJyYXlfcmVkdWNlKG1lc3NhZ2VzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBuZXdQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShuZXdQcm9taXNlLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCB2b2lkIDApO1xuXG4gICAgICAgIG1lc3NhZ2VzID0gdm9pZCAwO1xuICAgICAgICBwcm9ncmVzc0xpc3RlbmVycyA9IHZvaWQgMDtcbiAgICB9XG5cbiAgICBkZWZlcnJlZC5wcm9taXNlID0gcHJvbWlzZTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJlY29tZShRKHZhbHVlKSk7XG4gICAgfTtcblxuICAgIGRlZmVycmVkLmZ1bGZpbGwgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYmVjb21lKGZ1bGZpbGwodmFsdWUpKTtcbiAgICB9O1xuICAgIGRlZmVycmVkLnJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYmVjb21lKHJlamVjdChyZWFzb24pKTtcbiAgICB9O1xuICAgIGRlZmVycmVkLm5vdGlmeSA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBhcnJheV9yZWR1Y2UocHJvZ3Jlc3NMaXN0ZW5lcnMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb2dyZXNzTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXIocHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHZvaWQgMCk7XG4gICAgfTtcblxuICAgIHJldHVybiBkZWZlcnJlZDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgTm9kZS1zdHlsZSBjYWxsYmFjayB0aGF0IHdpbGwgcmVzb2x2ZSBvciByZWplY3QgdGhlIGRlZmVycmVkXG4gKiBwcm9taXNlLlxuICogQHJldHVybnMgYSBub2RlYmFja1xuICovXG5kZWZlci5wcm90b3R5cGUubWFrZU5vZGVSZXNvbHZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlcnJvciwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBzZWxmLnJlamVjdChlcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHNlbGYucmVzb2x2ZShhcnJheV9zbGljZShhcmd1bWVudHMsIDEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYucmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuLyoqXG4gKiBAcGFyYW0gcmVzb2x2ZXIge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBub3RoaW5nIGFuZCBhY2NlcHRzXG4gKiB0aGUgcmVzb2x2ZSwgcmVqZWN0LCBhbmQgbm90aWZ5IGZ1bmN0aW9ucyBmb3IgYSBkZWZlcnJlZC5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IG1heSBiZSByZXNvbHZlZCB3aXRoIHRoZSBnaXZlbiByZXNvbHZlIGFuZCByZWplY3RcbiAqIGZ1bmN0aW9ucywgb3IgcmVqZWN0ZWQgYnkgYSB0aHJvd24gZXhjZXB0aW9uIGluIHJlc29sdmVyXG4gKi9cblEuUHJvbWlzZSA9IHByb21pc2U7IC8vIEVTNlxuUS5wcm9taXNlID0gcHJvbWlzZTtcbmZ1bmN0aW9uIHByb21pc2UocmVzb2x2ZXIpIHtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInJlc29sdmVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0LCBkZWZlcnJlZC5ub3RpZnkpO1xuICAgIH0gY2F0Y2ggKHJlYXNvbikge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59XG5cbnByb21pc2UucmFjZSA9IHJhY2U7IC8vIEVTNlxucHJvbWlzZS5hbGwgPSBhbGw7IC8vIEVTNlxucHJvbWlzZS5yZWplY3QgPSByZWplY3Q7IC8vIEVTNlxucHJvbWlzZS5yZXNvbHZlID0gUTsgLy8gRVM2XG5cbi8vIFhYWCBleHBlcmltZW50YWwuICBUaGlzIG1ldGhvZCBpcyBhIHdheSB0byBkZW5vdGUgdGhhdCBhIGxvY2FsIHZhbHVlIGlzXG4vLyBzZXJpYWxpemFibGUgYW5kIHNob3VsZCBiZSBpbW1lZGlhdGVseSBkaXNwYXRjaGVkIHRvIGEgcmVtb3RlIHVwb24gcmVxdWVzdCxcbi8vIGluc3RlYWQgb2YgcGFzc2luZyBhIHJlZmVyZW5jZS5cblEucGFzc0J5Q29weSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAvL2ZyZWV6ZShvYmplY3QpO1xuICAgIC8vcGFzc0J5Q29waWVzLnNldChvYmplY3QsIHRydWUpO1xuICAgIHJldHVybiBvYmplY3Q7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vZnJlZXplKG9iamVjdCk7XG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIElmIHR3byBwcm9taXNlcyBldmVudHVhbGx5IGZ1bGZpbGwgdG8gdGhlIHNhbWUgdmFsdWUsIHByb21pc2VzIHRoYXQgdmFsdWUsXG4gKiBidXQgb3RoZXJ3aXNlIHJlamVjdHMuXG4gKiBAcGFyYW0geCB7QW55Kn1cbiAqIEBwYXJhbSB5IHtBbnkqfVxuICogQHJldHVybnMge0FueSp9IGEgcHJvbWlzZSBmb3IgeCBhbmQgeSBpZiB0aGV5IGFyZSB0aGUgc2FtZSwgYnV0IGEgcmVqZWN0aW9uXG4gKiBvdGhlcndpc2UuXG4gKlxuICovXG5RLmpvaW4gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiBRKHgpLmpvaW4oeSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5qb2luID0gZnVuY3Rpb24gKHRoYXQpIHtcbiAgICByZXR1cm4gUShbdGhpcywgdGhhdF0pLnNwcmVhZChmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICBpZiAoeCA9PT0geSkge1xuICAgICAgICAgICAgLy8gVE9ETzogXCI9PT1cIiBzaG91bGQgYmUgT2JqZWN0LmlzIG9yIGVxdWl2XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGpvaW46IG5vdCB0aGUgc2FtZTogXCIgKyB4ICsgXCIgXCIgKyB5KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIGZpcnN0IG9mIGFuIGFycmF5IG9mIHByb21pc2VzIHRvIGJlY29tZSBzZXR0bGVkLlxuICogQHBhcmFtIGFuc3dlcnMge0FycmF5W0FueSpdfSBwcm9taXNlcyB0byByYWNlXG4gKiBAcmV0dXJucyB7QW55Kn0gdGhlIGZpcnN0IHByb21pc2UgdG8gYmUgc2V0dGxlZFxuICovXG5RLnJhY2UgPSByYWNlO1xuZnVuY3Rpb24gcmFjZShhbnN3ZXJQcykge1xuICAgIHJldHVybiBwcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gU3dpdGNoIHRvIHRoaXMgb25jZSB3ZSBjYW4gYXNzdW1lIGF0IGxlYXN0IEVTNVxuICAgICAgICAvLyBhbnN3ZXJQcy5mb3JFYWNoKGZ1bmN0aW9uIChhbnN3ZXJQKSB7XG4gICAgICAgIC8vICAgICBRKGFuc3dlclApLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIFVzZSB0aGlzIGluIHRoZSBtZWFudGltZVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYW5zd2VyUHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIFEoYW5zd2VyUHNbaV0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5yYWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnRoZW4oUS5yYWNlKTtcbn07XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIFByb21pc2Ugd2l0aCBhIHByb21pc2UgZGVzY3JpcHRvciBvYmplY3QgYW5kIG9wdGlvbmFsIGZhbGxiYWNrXG4gKiBmdW5jdGlvbi4gIFRoZSBkZXNjcmlwdG9yIGNvbnRhaW5zIG1ldGhvZHMgbGlrZSB3aGVuKHJlamVjdGVkKSwgZ2V0KG5hbWUpLFxuICogc2V0KG5hbWUsIHZhbHVlKSwgcG9zdChuYW1lLCBhcmdzKSwgYW5kIGRlbGV0ZShuYW1lKSwgd2hpY2ggYWxsXG4gKiByZXR1cm4gZWl0aGVyIGEgdmFsdWUsIGEgcHJvbWlzZSBmb3IgYSB2YWx1ZSwgb3IgYSByZWplY3Rpb24uICBUaGUgZmFsbGJhY2tcbiAqIGFjY2VwdHMgdGhlIG9wZXJhdGlvbiBuYW1lLCBhIHJlc29sdmVyLCBhbmQgYW55IGZ1cnRoZXIgYXJndW1lbnRzIHRoYXQgd291bGRcbiAqIGhhdmUgYmVlbiBmb3J3YXJkZWQgdG8gdGhlIGFwcHJvcHJpYXRlIG1ldGhvZCBhYm92ZSBoYWQgYSBtZXRob2QgYmVlblxuICogcHJvdmlkZWQgd2l0aCB0aGUgcHJvcGVyIG5hbWUuICBUaGUgQVBJIG1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgdGhlIG5hdHVyZVxuICogb2YgdGhlIHJldHVybmVkIG9iamVjdCwgYXBhcnQgZnJvbSB0aGF0IGl0IGlzIHVzYWJsZSB3aGVyZWV2ZXIgcHJvbWlzZXMgYXJlXG4gKiBib3VnaHQgYW5kIHNvbGQuXG4gKi9cblEubWFrZVByb21pc2UgPSBQcm9taXNlO1xuZnVuY3Rpb24gUHJvbWlzZShkZXNjcmlwdG9yLCBmYWxsYmFjaywgaW5zcGVjdCkge1xuICAgIGlmIChmYWxsYmFjayA9PT0gdm9pZCAwKSB7XG4gICAgICAgIGZhbGxiYWNrID0gZnVuY3Rpb24gKG9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIlByb21pc2UgZG9lcyBub3Qgc3VwcG9ydCBvcGVyYXRpb246IFwiICsgb3BcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoaW5zcGVjdCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIGluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge3N0YXRlOiBcInVua25vd25cIn07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcblxuICAgIHByb21pc2UucHJvbWlzZURpc3BhdGNoID0gZnVuY3Rpb24gKHJlc29sdmUsIG9wLCBhcmdzKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRvcltvcF0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBkZXNjcmlwdG9yW29wXS5hcHBseShwcm9taXNlLCBhcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsbGJhY2suY2FsbChwcm9taXNlLCBvcCwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc29sdmUpIHtcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwcm9taXNlLmluc3BlY3QgPSBpbnNwZWN0O1xuXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWQgYHZhbHVlT2ZgIGFuZCBgZXhjZXB0aW9uYCBzdXBwb3J0XG4gICAgaWYgKGluc3BlY3QpIHtcbiAgICAgICAgdmFyIGluc3BlY3RlZCA9IGluc3BlY3QoKTtcbiAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XG4gICAgICAgICAgICBwcm9taXNlLmV4Y2VwdGlvbiA9IGluc3BlY3RlZC5yZWFzb247XG4gICAgICAgIH1cblxuICAgICAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xuICAgICAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJwZW5kaW5nXCIgfHxcbiAgICAgICAgICAgICAgICBpbnNwZWN0ZWQuc3RhdGUgPT09IFwicmVqZWN0ZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RlZC52YWx1ZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBQcm9taXNlXVwiO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdmFyIGRvbmUgPSBmYWxzZTsgICAvLyBlbnN1cmUgdGhlIHVudHJ1c3RlZCBwcm9taXNlIG1ha2VzIGF0IG1vc3QgYVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlIGNhbGwgdG8gb25lIG9mIHRoZSBjYWxsYmFja3NcblxuICAgIGZ1bmN0aW9uIF9mdWxmaWxsZWQodmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZnVsZmlsbGVkID09PSBcImZ1bmN0aW9uXCIgPyBmdWxmaWxsZWQodmFsdWUpIDogdmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3JlamVjdGVkKGV4Y2VwdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHJlamVjdGVkID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhleGNlcHRpb24sIHNlbGYpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0ZWQoZXhjZXB0aW9uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKG5ld0V4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3RXhjZXB0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3Byb2dyZXNzZWQodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBwcm9ncmVzc2VkID09PSBcImZ1bmN0aW9uXCIgPyBwcm9ncmVzc2VkKHZhbHVlKSA6IHZhbHVlO1xuICAgIH1cblxuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XG5cbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX2Z1bGZpbGxlZCh2YWx1ZSkpO1xuICAgICAgICB9LCBcIndoZW5cIiwgW2Z1bmN0aW9uIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XG5cbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX3JlamVjdGVkKGV4Y2VwdGlvbikpO1xuICAgICAgICB9XSk7XG4gICAgfSk7XG5cbiAgICAvLyBQcm9ncmVzcyBwcm9wYWdhdG9yIG5lZWQgdG8gYmUgYXR0YWNoZWQgaW4gdGhlIGN1cnJlbnQgdGljay5cbiAgICBzZWxmLnByb21pc2VEaXNwYXRjaCh2b2lkIDAsIFwid2hlblwiLCBbdm9pZCAwLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlO1xuICAgICAgICB2YXIgdGhyZXcgPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5ld1ZhbHVlID0gX3Byb2dyZXNzZWQodmFsdWUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJldyA9IHRydWU7XG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XG4gICAgICAgICAgICAgICAgUS5vbmVycm9yKGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aHJldykge1xuICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KG5ld1ZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuUS50YXAgPSBmdW5jdGlvbiAocHJvbWlzZSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gUShwcm9taXNlKS50YXAoY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBXb3JrcyBhbG1vc3QgbGlrZSBcImZpbmFsbHlcIiwgYnV0IG5vdCBjYWxsZWQgZm9yIHJlamVjdGlvbnMuXG4gKiBPcmlnaW5hbCByZXNvbHV0aW9uIHZhbHVlIGlzIHBhc3NlZCB0aHJvdWdoIGNhbGxiYWNrIHVuYWZmZWN0ZWQuXG4gKiBDYWxsYmFjayBtYXkgcmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmUgYXdhaXRlZCBmb3IuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHJldHVybnMge1EuUHJvbWlzZX1cbiAqIEBleGFtcGxlXG4gKiBkb1NvbWV0aGluZygpXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRhcChjb25zb2xlLmxvZylcbiAqICAgLnRoZW4oLi4uKTtcbiAqL1xuUHJvbWlzZS5wcm90b3R5cGUudGFwID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBRKGNhbGxiYWNrKTtcblxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5mY2FsbCh2YWx1ZSkudGhlblJlc29sdmUodmFsdWUpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gb2JzZXJ2ZXIgb24gYSBwcm9taXNlLlxuICpcbiAqIEd1YXJhbnRlZXM6XG4gKlxuICogMS4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgYmUgY2FsbGVkIG9ubHkgb25jZS5cbiAqIDIuIHRoYXQgZWl0aGVyIHRoZSBmdWxmaWxsZWQgY2FsbGJhY2sgb3IgdGhlIHJlamVjdGVkIGNhbGxiYWNrIHdpbGwgYmVcbiAqICAgIGNhbGxlZCwgYnV0IG5vdCBib3RoLlxuICogMy4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgbm90IGJlIGNhbGxlZCBpbiB0aGlzIHR1cm4uXG4gKlxuICogQHBhcmFtIHZhbHVlICAgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIHRvIG9ic2VydmVcbiAqIEBwYXJhbSBmdWxmaWxsZWQgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBmdWxmaWxsZWQgdmFsdWVcbiAqIEBwYXJhbSByZWplY3RlZCAgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZWplY3Rpb24gZXhjZXB0aW9uXG4gKiBAcGFyYW0gcHJvZ3Jlc3NlZCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gYW55IHByb2dyZXNzIG5vdGlmaWNhdGlvbnNcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBmcm9tIHRoZSBpbnZva2VkIGNhbGxiYWNrXG4gKi9cblEud2hlbiA9IHdoZW47XG5mdW5jdGlvbiB3aGVuKHZhbHVlLCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XG4gICAgcmV0dXJuIFEodmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnRoZW5SZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAoKSB7IHJldHVybiB2YWx1ZTsgfSk7XG59O1xuXG5RLnRoZW5SZXNvbHZlID0gZnVuY3Rpb24gKHByb21pc2UsIHZhbHVlKSB7XG4gICAgcmV0dXJuIFEocHJvbWlzZSkudGhlblJlc29sdmUodmFsdWUpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgdGhyb3cgcmVhc29uOyB9KTtcbn07XG5cblEudGhlblJlamVjdCA9IGZ1bmN0aW9uIChwcm9taXNlLCByZWFzb24pIHtcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVqZWN0KHJlYXNvbik7XG59O1xuXG4vKipcbiAqIElmIGFuIG9iamVjdCBpcyBub3QgYSBwcm9taXNlLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZS5cbiAqIElmIGEgcHJvbWlzZSBpcyByZWplY3RlZCwgaXQgaXMgYXMgXCJuZWFyXCIgYXMgcG9zc2libGUgdG9vLlxuICogSWYgaXTigJlzIGEgZnVsZmlsbGVkIHByb21pc2UsIHRoZSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZWFyZXIuXG4gKiBJZiBpdOKAmXMgYSBkZWZlcnJlZCBwcm9taXNlIGFuZCB0aGUgZGVmZXJyZWQgaGFzIGJlZW4gcmVzb2x2ZWQsIHRoZVxuICogcmVzb2x1dGlvbiBpcyBcIm5lYXJlclwiLlxuICogQHBhcmFtIG9iamVjdFxuICogQHJldHVybnMgbW9zdCByZXNvbHZlZCAobmVhcmVzdCkgZm9ybSBvZiB0aGUgb2JqZWN0XG4gKi9cblxuLy8gWFhYIHNob3VsZCB3ZSByZS1kbyB0aGlzP1xuUS5uZWFyZXIgPSBuZWFyZXI7XG5mdW5jdGlvbiBuZWFyZXIodmFsdWUpIHtcbiAgICBpZiAoaXNQcm9taXNlKHZhbHVlKSkge1xuICAgICAgICB2YXIgaW5zcGVjdGVkID0gdmFsdWUuaW5zcGVjdCgpO1xuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwcm9taXNlLlxuICogT3RoZXJ3aXNlIGl0IGlzIGEgZnVsZmlsbGVkIHZhbHVlLlxuICovXG5RLmlzUHJvbWlzZSA9IGlzUHJvbWlzZTtcbmZ1bmN0aW9uIGlzUHJvbWlzZShvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgUHJvbWlzZTtcbn1cblxuUS5pc1Byb21pc2VBbGlrZSA9IGlzUHJvbWlzZUFsaWtlO1xuZnVuY3Rpb24gaXNQcm9taXNlQWxpa2Uob2JqZWN0KSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KG9iamVjdCkgJiYgdHlwZW9mIG9iamVjdC50aGVuID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbi8qKlxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcGVuZGluZyBwcm9taXNlLCBtZWFuaW5nIG5vdFxuICogZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuICovXG5RLmlzUGVuZGluZyA9IGlzUGVuZGluZztcbmZ1bmN0aW9uIGlzUGVuZGluZyhvYmplY3QpIHtcbiAgICByZXR1cm4gaXNQcm9taXNlKG9iamVjdCkgJiYgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XG59XG5cblByb21pc2UucHJvdG90eXBlLmlzUGVuZGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwicGVuZGluZ1wiO1xufTtcblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSB2YWx1ZSBvciBmdWxmaWxsZWRcbiAqIHByb21pc2UuXG4gKi9cblEuaXNGdWxmaWxsZWQgPSBpc0Z1bGZpbGxlZDtcbmZ1bmN0aW9uIGlzRnVsZmlsbGVkKG9iamVjdCkge1xuICAgIHJldHVybiAhaXNQcm9taXNlKG9iamVjdCkgfHwgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIjtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuaXNGdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xufTtcblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSByZWplY3RlZCBwcm9taXNlLlxuICovXG5RLmlzUmVqZWN0ZWQgPSBpc1JlamVjdGVkO1xuZnVuY3Rpb24gaXNSZWplY3RlZChvYmplY3QpIHtcbiAgICByZXR1cm4gaXNQcm9taXNlKG9iamVjdCkgJiYgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xufTtcblxuLy8vLyBCRUdJTiBVTkhBTkRMRUQgUkVKRUNUSU9OIFRSQUNLSU5HXG5cbi8vIFRoaXMgcHJvbWlzZSBsaWJyYXJ5IGNvbnN1bWVzIGV4Y2VwdGlvbnMgdGhyb3duIGluIGhhbmRsZXJzIHNvIHRoZXkgY2FuIGJlXG4vLyBoYW5kbGVkIGJ5IGEgc3Vic2VxdWVudCBwcm9taXNlLiAgVGhlIGV4Y2VwdGlvbnMgZ2V0IGFkZGVkIHRvIHRoaXMgYXJyYXkgd2hlblxuLy8gdGhleSBhcmUgY3JlYXRlZCwgYW5kIHJlbW92ZWQgd2hlbiB0aGV5IGFyZSBoYW5kbGVkLiAgTm90ZSB0aGF0IGluIEVTNiBvclxuLy8gc2hpbW1lZCBlbnZpcm9ubWVudHMsIHRoaXMgd291bGQgbmF0dXJhbGx5IGJlIGEgYFNldGAuXG52YXIgdW5oYW5kbGVkUmVhc29ucyA9IFtdO1xudmFyIHVuaGFuZGxlZFJlamVjdGlvbnMgPSBbXTtcbnZhciByZXBvcnRlZFVuaGFuZGxlZFJlamVjdGlvbnMgPSBbXTtcbnZhciB0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMgPSB0cnVlO1xuXG5mdW5jdGlvbiByZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKSB7XG4gICAgdW5oYW5kbGVkUmVhc29ucy5sZW5ndGggPSAwO1xuICAgIHVuaGFuZGxlZFJlamVjdGlvbnMubGVuZ3RoID0gMDtcblxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XG4gICAgICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0cmFja1JlamVjdGlvbihwcm9taXNlLCByZWFzb24pIHtcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcHJvY2Vzcy5lbWl0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgUS5uZXh0VGljay5ydW5BZnRlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoYXJyYXlfaW5kZXhPZih1bmhhbmRsZWRSZWplY3Rpb25zLCBwcm9taXNlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmVtaXQoXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgcmVhc29uLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICByZXBvcnRlZFVuaGFuZGxlZFJlamVjdGlvbnMucHVzaChwcm9taXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xuICAgIGlmIChyZWFzb24gJiYgdHlwZW9mIHJlYXNvbi5zdGFjayAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnB1c2gocmVhc29uLnN0YWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnB1c2goXCIobm8gc3RhY2spIFwiICsgcmVhc29uKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVudHJhY2tSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYXQgPSBhcnJheV9pbmRleE9mKHVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpO1xuICAgIGlmIChhdCAhPT0gLTEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBwcm9jZXNzLmVtaXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgUS5uZXh0VGljay5ydW5BZnRlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0UmVwb3J0ID0gYXJyYXlfaW5kZXhPZihyZXBvcnRlZFVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpO1xuICAgICAgICAgICAgICAgIGlmIChhdFJlcG9ydCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbWl0KFwicmVqZWN0aW9uSGFuZGxlZFwiLCB1bmhhbmRsZWRSZWFzb25zW2F0XSwgcHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXRSZXBvcnQsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHVuaGFuZGxlZFJlamVjdGlvbnMuc3BsaWNlKGF0LCAxKTtcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5zcGxpY2UoYXQsIDEpO1xuICAgIH1cbn1cblxuUS5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMgPSByZXNldFVuaGFuZGxlZFJlamVjdGlvbnM7XG5cblEuZ2V0VW5oYW5kbGVkUmVhc29ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBNYWtlIGEgY29weSBzbyB0aGF0IGNvbnN1bWVycyBjYW4ndCBpbnRlcmZlcmUgd2l0aCBvdXIgaW50ZXJuYWwgc3RhdGUuXG4gICAgcmV0dXJuIHVuaGFuZGxlZFJlYXNvbnMuc2xpY2UoKTtcbn07XG5cblEuc3RvcFVuaGFuZGxlZFJlamVjdGlvblRyYWNraW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpO1xuICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IGZhbHNlO1xufTtcblxucmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG5cbi8vLy8gRU5EIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cbiAqIEBwYXJhbSByZWFzb24gdmFsdWUgZGVzY3JpYmluZyB0aGUgZmFpbHVyZVxuICovXG5RLnJlamVjdCA9IHJlamVjdDtcbmZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcbiAgICB2YXIgcmVqZWN0aW9uID0gUHJvbWlzZSh7XG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICAgIC8vIG5vdGUgdGhhdCB0aGUgZXJyb3IgaGFzIGJlZW4gaGFuZGxlZFxuICAgICAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgICAgICAgdW50cmFja1JlamVjdGlvbih0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZWplY3RlZCA/IHJlamVjdGVkKHJlYXNvbikgOiB0aGlzO1xuICAgICAgICB9XG4gICAgfSwgZnVuY3Rpb24gZmFsbGJhY2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sIGZ1bmN0aW9uIGluc3BlY3QoKSB7XG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcInJlamVjdGVkXCIsIHJlYXNvbjogcmVhc29uIH07XG4gICAgfSk7XG5cbiAgICAvLyBOb3RlIHRoYXQgdGhlIHJlYXNvbiBoYXMgbm90IGJlZW4gaGFuZGxlZC5cbiAgICB0cmFja1JlamVjdGlvbihyZWplY3Rpb24sIHJlYXNvbik7XG5cbiAgICByZXR1cm4gcmVqZWN0aW9uO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBmdWxmaWxsZWQgcHJvbWlzZSBmb3IgYW4gaW1tZWRpYXRlIHJlZmVyZW5jZS5cbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlXG4gKi9cblEuZnVsZmlsbCA9IGZ1bGZpbGw7XG5mdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7XG4gICAgcmV0dXJuIFByb21pc2Uoe1xuICAgICAgICBcIndoZW5cIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBcImdldFwiOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlW25hbWVdO1xuICAgICAgICB9LFxuICAgICAgICBcInNldFwiOiBmdW5jdGlvbiAobmFtZSwgcmhzKSB7XG4gICAgICAgICAgICB2YWx1ZVtuYW1lXSA9IHJocztcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZWxldGVcIjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtuYW1lXTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJwb3N0XCI6IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XG4gICAgICAgICAgICAvLyBNYXJrIE1pbGxlciBwcm9wb3NlcyB0aGF0IHBvc3Qgd2l0aCBubyBuYW1lIHNob3VsZCBhcHBseSBhXG4gICAgICAgICAgICAvLyBwcm9taXNlZCBmdW5jdGlvbi5cbiAgICAgICAgICAgIGlmIChuYW1lID09PSBudWxsIHx8IG5hbWUgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5hcHBseSh2b2lkIDAsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV0uYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImFwcGx5XCI6IGZ1bmN0aW9uICh0aGlzcCwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHRoaXNwLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJrZXlzXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Rfa2V5cyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LCB2b2lkIDAsIGZ1bmN0aW9uIGluc3BlY3QoKSB7XG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcImZ1bGZpbGxlZFwiLCB2YWx1ZTogdmFsdWUgfTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGVuYWJsZXMgdG8gUSBwcm9taXNlcy5cbiAqIEBwYXJhbSBwcm9taXNlIHRoZW5hYmxlIHByb21pc2VcbiAqIEByZXR1cm5zIGEgUSBwcm9taXNlXG4gKi9cbmZ1bmN0aW9uIGNvZXJjZShwcm9taXNlKSB7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn1cblxuLyoqXG4gKiBBbm5vdGF0ZXMgYW4gb2JqZWN0IHN1Y2ggdGhhdCBpdCB3aWxsIG5ldmVyIGJlXG4gKiB0cmFuc2ZlcnJlZCBhd2F5IGZyb20gdGhpcyBwcm9jZXNzIG92ZXIgYW55IHByb21pc2VcbiAqIGNvbW11bmljYXRpb24gY2hhbm5lbC5cbiAqIEBwYXJhbSBvYmplY3RcbiAqIEByZXR1cm5zIHByb21pc2UgYSB3cmFwcGluZyBvZiB0aGF0IG9iamVjdCB0aGF0XG4gKiBhZGRpdGlvbmFsbHkgcmVzcG9uZHMgdG8gdGhlIFwiaXNEZWZcIiBtZXNzYWdlXG4gKiB3aXRob3V0IGEgcmVqZWN0aW9uLlxuICovXG5RLm1hc3RlciA9IG1hc3RlcjtcbmZ1bmN0aW9uIG1hc3RlcihvYmplY3QpIHtcbiAgICByZXR1cm4gUHJvbWlzZSh7XG4gICAgICAgIFwiaXNEZWZcIjogZnVuY3Rpb24gKCkge31cbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjayhvcCwgYXJncykge1xuICAgICAgICByZXR1cm4gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncyk7XG4gICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gUShvYmplY3QpLmluc3BlY3QoKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBTcHJlYWRzIHRoZSB2YWx1ZXMgb2YgYSBwcm9taXNlZCBhcnJheSBvZiBhcmd1bWVudHMgaW50byB0aGVcbiAqIGZ1bGZpbGxtZW50IGNhbGxiYWNrLlxuICogQHBhcmFtIGZ1bGZpbGxlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHZhcmlhZGljIGFyZ3VtZW50cyBmcm9tIHRoZVxuICogcHJvbWlzZWQgYXJyYXlcbiAqIEBwYXJhbSByZWplY3RlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHRoZSBleGNlcHRpb24gaWYgdGhlIHByb21pc2VcbiAqIGlzIHJlamVjdGVkLlxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9yIHRocm93biBleGNlcHRpb24gb2ZcbiAqIGVpdGhlciBjYWxsYmFjay5cbiAqL1xuUS5zcHJlYWQgPSBzcHJlYWQ7XG5mdW5jdGlvbiBzcHJlYWQodmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcbiAgICByZXR1cm4gUSh2YWx1ZSkuc3ByZWFkKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5zcHJlYWQgPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICAgIHJldHVybiB0aGlzLmFsbCgpLnRoZW4oZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgICAgIHJldHVybiBmdWxmaWxsZWQuYXBwbHkodm9pZCAwLCBhcnJheSk7XG4gICAgfSwgcmVqZWN0ZWQpO1xufTtcblxuLyoqXG4gKiBUaGUgYXN5bmMgZnVuY3Rpb24gaXMgYSBkZWNvcmF0b3IgZm9yIGdlbmVyYXRvciBmdW5jdGlvbnMsIHR1cm5pbmdcbiAqIHRoZW0gaW50byBhc3luY2hyb25vdXMgZ2VuZXJhdG9ycy4gIEFsdGhvdWdoIGdlbmVyYXRvcnMgYXJlIG9ubHkgcGFydFxuICogb2YgdGhlIG5ld2VzdCBFQ01BU2NyaXB0IDYgZHJhZnRzLCB0aGlzIGNvZGUgZG9lcyBub3QgY2F1c2Ugc3ludGF4XG4gKiBlcnJvcnMgaW4gb2xkZXIgZW5naW5lcy4gIFRoaXMgY29kZSBzaG91bGQgY29udGludWUgdG8gd29yayBhbmQgd2lsbFxuICogaW4gZmFjdCBpbXByb3ZlIG92ZXIgdGltZSBhcyB0aGUgbGFuZ3VhZ2UgaW1wcm92ZXMuXG4gKlxuICogRVM2IGdlbmVyYXRvcnMgYXJlIGN1cnJlbnRseSBwYXJ0IG9mIFY4IHZlcnNpb24gMy4xOSB3aXRoIHRoZVxuICogLS1oYXJtb255LWdlbmVyYXRvcnMgcnVudGltZSBmbGFnIGVuYWJsZWQuICBTcGlkZXJNb25rZXkgaGFzIGhhZCB0aGVtXG4gKiBmb3IgbG9uZ2VyLCBidXQgdW5kZXIgYW4gb2xkZXIgUHl0aG9uLWluc3BpcmVkIGZvcm0uICBUaGlzIGZ1bmN0aW9uXG4gKiB3b3JrcyBvbiBib3RoIGtpbmRzIG9mIGdlbmVyYXRvcnMuXG4gKlxuICogRGVjb3JhdGVzIGEgZ2VuZXJhdG9yIGZ1bmN0aW9uIHN1Y2ggdGhhdDpcbiAqICAtIGl0IG1heSB5aWVsZCBwcm9taXNlc1xuICogIC0gZXhlY3V0aW9uIHdpbGwgY29udGludWUgd2hlbiB0aGF0IHByb21pc2UgaXMgZnVsZmlsbGVkXG4gKiAgLSB0aGUgdmFsdWUgb2YgdGhlIHlpZWxkIGV4cHJlc3Npb24gd2lsbCBiZSB0aGUgZnVsZmlsbGVkIHZhbHVlXG4gKiAgLSBpdCByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSAod2hlbiB0aGUgZ2VuZXJhdG9yXG4gKiAgICBzdG9wcyBpdGVyYXRpbmcpXG4gKiAgLSB0aGUgZGVjb3JhdGVkIGZ1bmN0aW9uIHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKiAgICBvZiB0aGUgZ2VuZXJhdG9yIG9yIHRoZSBmaXJzdCByZWplY3RlZCBwcm9taXNlIGFtb25nIHRob3NlXG4gKiAgICB5aWVsZGVkLlxuICogIC0gaWYgYW4gZXJyb3IgaXMgdGhyb3duIGluIHRoZSBnZW5lcmF0b3IsIGl0IHByb3BhZ2F0ZXMgdGhyb3VnaFxuICogICAgZXZlcnkgZm9sbG93aW5nIHlpZWxkIHVudGlsIGl0IGlzIGNhdWdodCwgb3IgdW50aWwgaXQgZXNjYXBlc1xuICogICAgdGhlIGdlbmVyYXRvciBmdW5jdGlvbiBhbHRvZ2V0aGVyLCBhbmQgaXMgdHJhbnNsYXRlZCBpbnRvIGFcbiAqICAgIHJlamVjdGlvbiBmb3IgdGhlIHByb21pc2UgcmV0dXJuZWQgYnkgdGhlIGRlY29yYXRlZCBnZW5lcmF0b3IuXG4gKi9cblEuYXN5bmMgPSBhc3luYztcbmZ1bmN0aW9uIGFzeW5jKG1ha2VHZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyB3aGVuIHZlcmIgaXMgXCJzZW5kXCIsIGFyZyBpcyBhIHZhbHVlXG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInRocm93XCIsIGFyZyBpcyBhbiBleGNlcHRpb25cbiAgICAgICAgZnVuY3Rpb24gY29udGludWVyKHZlcmIsIGFyZykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgICAgICAgLy8gVW50aWwgVjggMy4xOSAvIENocm9taXVtIDI5IGlzIHJlbGVhc2VkLCBTcGlkZXJNb25rZXkgaXMgdGhlIG9ubHlcbiAgICAgICAgICAgIC8vIGVuZ2luZSB0aGF0IGhhcyBhIGRlcGxveWVkIGJhc2Ugb2YgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IGdlbmVyYXRvcnMuXG4gICAgICAgICAgICAvLyBIb3dldmVyLCBTTSdzIGdlbmVyYXRvcnMgdXNlIHRoZSBQeXRob24taW5zcGlyZWQgc2VtYW50aWNzIG9mXG4gICAgICAgICAgICAvLyBvdXRkYXRlZCBFUzYgZHJhZnRzLiAgV2Ugd291bGQgbGlrZSB0byBzdXBwb3J0IEVTNiwgYnV0IHdlJ2QgYWxzb1xuICAgICAgICAgICAgLy8gbGlrZSB0byBtYWtlIGl0IHBvc3NpYmxlIHRvIHVzZSBnZW5lcmF0b3JzIGluIGRlcGxveWVkIGJyb3dzZXJzLCBzb1xuICAgICAgICAgICAgLy8gd2UgYWxzbyBzdXBwb3J0IFB5dGhvbi1zdHlsZSBnZW5lcmF0b3JzLiAgQXQgc29tZSBwb2ludCB3ZSBjYW4gcmVtb3ZlXG4gICAgICAgICAgICAvLyB0aGlzIGJsb2NrLlxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIFN0b3BJdGVyYXRpb24gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBFUzYgR2VuZXJhdG9yc1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRvclt2ZXJiXShhcmcpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdC52YWx1ZSwgY2FsbGJhY2ssIGVycmJhY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU3BpZGVyTW9ua2V5IEdlbmVyYXRvcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogUmVtb3ZlIHRoaXMgY2FzZSB3aGVuIFNNIGRvZXMgRVM2IGdlbmVyYXRvcnMuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1N0b3BJdGVyYXRpb24oZXhjZXB0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFEoZXhjZXB0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gd2hlbihyZXN1bHQsIGNhbGxiYWNrLCBlcnJiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZ2VuZXJhdG9yID0gbWFrZUdlbmVyYXRvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBjb250aW51ZXIuYmluZChjb250aW51ZXIsIFwibmV4dFwiKTtcbiAgICAgICAgdmFyIGVycmJhY2sgPSBjb250aW51ZXIuYmluZChjb250aW51ZXIsIFwidGhyb3dcIik7XG4gICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH07XG59XG5cbi8qKlxuICogVGhlIHNwYXduIGZ1bmN0aW9uIGlzIGEgc21hbGwgd3JhcHBlciBhcm91bmQgYXN5bmMgdGhhdCBpbW1lZGlhdGVseVxuICogY2FsbHMgdGhlIGdlbmVyYXRvciBhbmQgYWxzbyBlbmRzIHRoZSBwcm9taXNlIGNoYWluLCBzbyB0aGF0IGFueVxuICogdW5oYW5kbGVkIGVycm9ycyBhcmUgdGhyb3duIGluc3RlYWQgb2YgZm9yd2FyZGVkIHRvIHRoZSBlcnJvclxuICogaGFuZGxlci4gVGhpcyBpcyB1c2VmdWwgYmVjYXVzZSBpdCdzIGV4dHJlbWVseSBjb21tb24gdG8gcnVuXG4gKiBnZW5lcmF0b3JzIGF0IHRoZSB0b3AtbGV2ZWwgdG8gd29yayB3aXRoIGxpYnJhcmllcy5cbiAqL1xuUS5zcGF3biA9IHNwYXduO1xuZnVuY3Rpb24gc3Bhd24obWFrZUdlbmVyYXRvcikge1xuICAgIFEuZG9uZShRLmFzeW5jKG1ha2VHZW5lcmF0b3IpKCkpO1xufVxuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaW50ZXJmYWNlIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluIFNwaWRlck1vbmtleS5cbi8qKlxuICogVGhyb3dzIGEgUmV0dXJuVmFsdWUgZXhjZXB0aW9uIHRvIHN0b3AgYW4gYXN5bmNocm9ub3VzIGdlbmVyYXRvci5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBpcyBhIHN0b3AtZ2FwIG1lYXN1cmUgdG8gc3VwcG9ydCBnZW5lcmF0b3IgcmV0dXJuXG4gKiB2YWx1ZXMgaW4gb2xkZXIgRmlyZWZveC9TcGlkZXJNb25rZXkuICBJbiBicm93c2VycyB0aGF0IHN1cHBvcnQgRVM2XG4gKiBnZW5lcmF0b3JzIGxpa2UgQ2hyb21pdW0gMjksIGp1c3QgdXNlIFwicmV0dXJuXCIgaW4geW91ciBnZW5lcmF0b3JcbiAqIGZ1bmN0aW9ucy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHJldHVybiB2YWx1ZSBmb3IgdGhlIHN1cnJvdW5kaW5nIGdlbmVyYXRvclxuICogQHRocm93cyBSZXR1cm5WYWx1ZSBleGNlcHRpb24gd2l0aCB0aGUgdmFsdWUuXG4gKiBAZXhhbXBsZVxuICogLy8gRVM2IHN0eWxlXG4gKiBRLmFzeW5jKGZ1bmN0aW9uKiAoKSB7XG4gKiAgICAgIHZhciBmb28gPSB5aWVsZCBnZXRGb29Qcm9taXNlKCk7XG4gKiAgICAgIHZhciBiYXIgPSB5aWVsZCBnZXRCYXJQcm9taXNlKCk7XG4gKiAgICAgIHJldHVybiBmb28gKyBiYXI7XG4gKiB9KVxuICogLy8gT2xkZXIgU3BpZGVyTW9ua2V5IHN0eWxlXG4gKiBRLmFzeW5jKGZ1bmN0aW9uICgpIHtcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcbiAqICAgICAgUS5yZXR1cm4oZm9vICsgYmFyKTtcbiAqIH0pXG4gKi9cblFbXCJyZXR1cm5cIl0gPSBfcmV0dXJuO1xuZnVuY3Rpb24gX3JldHVybih2YWx1ZSkge1xuICAgIHRocm93IG5ldyBRUmV0dXJuVmFsdWUodmFsdWUpO1xufVxuXG4vKipcbiAqIFRoZSBwcm9taXNlZCBmdW5jdGlvbiBkZWNvcmF0b3IgZW5zdXJlcyB0aGF0IGFueSBwcm9taXNlIGFyZ3VtZW50c1xuICogYXJlIHNldHRsZWQgYW5kIHBhc3NlZCBhcyB2YWx1ZXMgKGB0aGlzYCBpcyBhbHNvIHNldHRsZWQgYW5kIHBhc3NlZFxuICogYXMgYSB2YWx1ZSkuICBJdCB3aWxsIGFsc28gZW5zdXJlIHRoYXQgdGhlIHJlc3VsdCBvZiBhIGZ1bmN0aW9uIGlzXG4gKiBhbHdheXMgYSBwcm9taXNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgYWRkID0gUS5wcm9taXNlZChmdW5jdGlvbiAoYSwgYikge1xuICogICAgIHJldHVybiBhICsgYjtcbiAqIH0pO1xuICogYWRkKFEoYSksIFEoQikpO1xuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBkZWNvcmF0ZVxuICogQHJldHVybnMge2Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgaGFzIGJlZW4gZGVjb3JhdGVkLlxuICovXG5RLnByb21pc2VkID0gcHJvbWlzZWQ7XG5mdW5jdGlvbiBwcm9taXNlZChjYWxsYmFjaykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzcHJlYWQoW3RoaXMsIGFsbChhcmd1bWVudHMpXSwgZnVuY3Rpb24gKHNlbGYsIGFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBzZW5kcyBhIG1lc3NhZ2UgdG8gYSB2YWx1ZSBpbiBhIGZ1dHVyZSB0dXJuXG4gKiBAcGFyYW0gb2JqZWN0KiB0aGUgcmVjaXBpZW50XG4gKiBAcGFyYW0gb3AgdGhlIG5hbWUgb2YgdGhlIG1lc3NhZ2Ugb3BlcmF0aW9uLCBlLmcuLCBcIndoZW5cIixcbiAqIEBwYXJhbSBhcmdzIGZ1cnRoZXIgYXJndW1lbnRzIHRvIGJlIGZvcndhcmRlZCB0byB0aGUgb3BlcmF0aW9uXG4gKiBAcmV0dXJucyByZXN1bHQge1Byb21pc2V9IGEgcHJvbWlzZSBmb3IgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uXG4gKi9cblEuZGlzcGF0Y2ggPSBkaXNwYXRjaDtcbmZ1bmN0aW9uIGRpc3BhdGNoKG9iamVjdCwgb3AsIGFyZ3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKG9wLCBhcmdzKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAob3AsIGFyZ3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5wcm9taXNlRGlzcGF0Y2goZGVmZXJyZWQucmVzb2x2ZSwgb3AsIGFyZ3MpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGdldFxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcHJvcGVydHkgdmFsdWVcbiAqL1xuUS5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImdldFwiLCBba2V5XSk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciBvYmplY3Qgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gc2V0XG4gKiBAcGFyYW0gdmFsdWUgICAgIG5ldyB2YWx1ZSBvZiBwcm9wZXJ0eVxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKi9cblEuc2V0ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJzZXRcIiwgW2tleSwgdmFsdWVdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJzZXRcIiwgW2tleSwgdmFsdWVdKTtcbn07XG5cbi8qKlxuICogRGVsZXRlcyBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGRlbGV0ZVxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKi9cblEuZGVsID0gLy8gWFhYIGxlZ2FjeVxuUVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJkZWxldGVcIiwgW2tleV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZGVsID0gLy8gWFhYIGxlZ2FjeVxuUHJvbWlzZS5wcm90b3R5cGVbXCJkZWxldGVcIl0gPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJkZWxldGVcIiwgW2tleV0pO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAqIEBwYXJhbSB2YWx1ZSAgICAgYSB2YWx1ZSB0byBwb3N0LCB0eXBpY2FsbHkgYW4gYXJyYXkgb2ZcbiAqICAgICAgICAgICAgICAgICAgaW52b2NhdGlvbiBhcmd1bWVudHMgZm9yIHByb21pc2VzIHRoYXRcbiAqICAgICAgICAgICAgICAgICAgYXJlIHVsdGltYXRlbHkgYmFja2VkIHdpdGggYHJlc29sdmVgIHZhbHVlcyxcbiAqICAgICAgICAgICAgICAgICAgYXMgb3Bwb3NlZCB0byB0aG9zZSBiYWNrZWQgd2l0aCBVUkxzXG4gKiAgICAgICAgICAgICAgICAgIHdoZXJlaW4gdGhlIHBvc3RlZCB2YWx1ZSBjYW4gYmUgYW55XG4gKiAgICAgICAgICAgICAgICAgIEpTT04gc2VyaWFsaXphYmxlIG9iamVjdC5cbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxuICovXG4vLyBib3VuZCBsb2NhbGx5IGJlY2F1c2UgaXQgaXMgdXNlZCBieSBvdGhlciBtZXRob2RzXG5RLm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLnBvc3QgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBhcmdzKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5Qcm9taXNlLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcbn07XG5cbi8qKlxuICogSW52b2tlcyBhIG1ldGhvZCBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBtZXRob2QgdG8gaW52b2tlXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGludm9jYXRpb24gYXJndW1lbnRzXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5zZW5kID0gLy8gWFhYIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgcGFybGFuY2VcblEubWNhbGwgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxuUS5pbnZva2UgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lIC8qLi4uYXJncyovKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMildKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxuUHJvbWlzZS5wcm90b3R5cGUubWNhbGwgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxuUHJvbWlzZS5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcbn07XG5cbi8qKlxuICogQXBwbGllcyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24gaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cbiAqIEBwYXJhbSBhcmdzICAgICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXG4gKi9cblEuZmFwcGx5ID0gZnVuY3Rpb24gKG9iamVjdCwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5mYXBwbHkgPSBmdW5jdGlvbiAoYXJncykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJnc10pO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24gaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXG4gKi9cblFbXCJ0cnlcIl0gPVxuUS5mY2FsbCA9IGZ1bmN0aW9uIChvYmplY3QgLyogLi4uYXJncyovKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcnJheV9zbGljZShhcmd1bWVudHMpXSk7XG59O1xuXG4vKipcbiAqIEJpbmRzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiwgdHJhbnNmb3JtaW5nIHJldHVybiB2YWx1ZXMgaW50byBhIGZ1bGZpbGxlZFxuICogcHJvbWlzZSBhbmQgdGhyb3duIGVycm9ycyBpbnRvIGEgcmVqZWN0ZWQgb25lLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUS5mYmluZCA9IGZ1bmN0aW9uIChvYmplY3QgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgcHJvbWlzZSA9IFEob2JqZWN0KTtcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZib3VuZCgpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UuZGlzcGF0Y2goXCJhcHBseVwiLCBbXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgYXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSlcbiAgICAgICAgXSk7XG4gICAgfTtcbn07XG5Qcm9taXNlLnByb3RvdHlwZS5mYmluZCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZib3VuZCgpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UuZGlzcGF0Y2goXCJhcHBseVwiLCBbXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgYXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSlcbiAgICAgICAgXSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICogUmVxdWVzdHMgdGhlIG5hbWVzIG9mIHRoZSBvd25lZCBwcm9wZXJ0aWVzIG9mIGEgcHJvbWlzZWRcbiAqIG9iamVjdCBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIGtleXMgb2YgdGhlIGV2ZW50dWFsbHkgc2V0dGxlZCBvYmplY3RcbiAqL1xuUS5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJrZXlzXCIsIFtdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJrZXlzXCIsIFtdKTtcbn07XG5cbi8qKlxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5LiAgSWYgYW55IG9mXG4gKiB0aGUgcHJvbWlzZXMgZ2V0cyByZWplY3RlZCwgdGhlIHdob2xlIGFycmF5IGlzIHJlamVjdGVkIGltbWVkaWF0ZWx5LlxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IChvciBwcm9taXNlIGZvciBhbiBhcnJheSkgb2YgdmFsdWVzIChvclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG4gKi9cbi8vIEJ5IE1hcmsgTWlsbGVyXG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1zdHJhd21hbjpjb25jdXJyZW5jeSZyZXY9MTMwODc3NjUyMSNhbGxmdWxmaWxsZWRcblEuYWxsID0gYWxsO1xuZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlcykge1xuICAgICAgICB2YXIgcGVuZGluZ0NvdW50ID0gMDtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICAgICAgYXJyYXlfcmVkdWNlKHByb21pc2VzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBwcm9taXNlLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIHNuYXBzaG90O1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGlzUHJvbWlzZShwcm9taXNlKSAmJlxuICAgICAgICAgICAgICAgIChzbmFwc2hvdCA9IHByb21pc2UuaW5zcGVjdCgpKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIlxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcHJvbWlzZXNbaW5kZXhdID0gc25hcHNob3QudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICsrcGVuZGluZ0NvdW50O1xuICAgICAgICAgICAgICAgIHdoZW4oXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1wZW5kaW5nQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7IGluZGV4OiBpbmRleCwgdmFsdWU6IHByb2dyZXNzIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdm9pZCAwKTtcbiAgICAgICAgaWYgKHBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSk7XG59XG5cblByb21pc2UucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYWxsKHRoaXMpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmaXJzdCByZXNvbHZlZCBwcm9taXNlIG9mIGFuIGFycmF5LiBQcmlvciByZWplY3RlZCBwcm9taXNlcyBhcmVcbiAqIGlnbm9yZWQuICBSZWplY3RzIG9ubHkgaWYgYWxsIHByb21pc2VzIGFyZSByZWplY3RlZC5cbiAqIEBwYXJhbSB7QXJyYXkqfSBhbiBhcnJheSBjb250YWluaW5nIHZhbHVlcyBvciBwcm9taXNlcyBmb3IgdmFsdWVzXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZnVsZmlsbGVkIHdpdGggdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCByZXNvbHZlZCBwcm9taXNlLFxuICogb3IgYSByZWplY3RlZCBwcm9taXNlIGlmIGFsbCBwcm9taXNlcyBhcmUgcmVqZWN0ZWQuXG4gKi9cblEuYW55ID0gYW55O1xuXG5mdW5jdGlvbiBhbnkocHJvbWlzZXMpIHtcbiAgICBpZiAocHJvbWlzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBRLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XG4gICAgdmFyIHBlbmRpbmdDb3VudCA9IDA7XG4gICAgYXJyYXlfcmVkdWNlKHByb21pc2VzLCBmdW5jdGlvbiAocHJldiwgY3VycmVudCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSBwcm9taXNlc1tpbmRleF07XG5cbiAgICAgICAgcGVuZGluZ0NvdW50Kys7XG5cbiAgICAgICAgd2hlbihwcm9taXNlLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgb25Qcm9ncmVzcyk7XG4gICAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbGVkKHJlc3VsdCkge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0ZWQoKSB7XG4gICAgICAgICAgICBwZW5kaW5nQ291bnQtLTtcbiAgICAgICAgICAgIGlmIChwZW5kaW5nQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgICBcIkNhbid0IGdldCBmdWxmaWxsbWVudCB2YWx1ZSBmcm9tIGFueSBwcm9taXNlLCBhbGwgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcInByb21pc2VzIHdlcmUgcmVqZWN0ZWQuXCJcbiAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBvblByb2dyZXNzKHByb2dyZXNzKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkoe1xuICAgICAgICAgICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcHJvZ3Jlc3NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKTtcblxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5hbnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFueSh0aGlzKTtcbn07XG5cbi8qKlxuICogV2FpdHMgZm9yIGFsbCBwcm9taXNlcyB0byBiZSBzZXR0bGVkLCBlaXRoZXIgZnVsZmlsbGVkIG9yXG4gKiByZWplY3RlZC4gIFRoaXMgaXMgZGlzdGluY3QgZnJvbSBgYWxsYCBzaW5jZSB0aGF0IHdvdWxkIHN0b3BcbiAqIHdhaXRpbmcgYXQgdGhlIGZpcnN0IHJlamVjdGlvbi4gIFRoZSBwcm9taXNlIHJldHVybmVkIGJ5XG4gKiBgYWxsUmVzb2x2ZWRgIHdpbGwgbmV2ZXIgYmUgcmVqZWN0ZWQuXG4gKiBAcGFyYW0gcHJvbWlzZXMgYSBwcm9taXNlIGZvciBhbiBhcnJheSAob3IgYW4gYXJyYXkpIG9mIHByb21pc2VzXG4gKiAob3IgdmFsdWVzKVxuICogQHJldHVybiBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHByb21pc2VzXG4gKi9cblEuYWxsUmVzb2x2ZWQgPSBkZXByZWNhdGUoYWxsUmVzb2x2ZWQsIFwiYWxsUmVzb2x2ZWRcIiwgXCJhbGxTZXR0bGVkXCIpO1xuZnVuY3Rpb24gYWxsUmVzb2x2ZWQocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgICAgIHByb21pc2VzID0gYXJyYXlfbWFwKHByb21pc2VzLCBRKTtcbiAgICAgICAgcmV0dXJuIHdoZW4oYWxsKGFycmF5X21hcChwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB3aGVuKHByb21pc2UsIG5vb3AsIG5vb3ApO1xuICAgICAgICB9KSksIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlcztcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblByb21pc2UucHJvdG90eXBlLmFsbFJlc29sdmVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhbGxSZXNvbHZlZCh0aGlzKTtcbn07XG5cbi8qKlxuICogQHNlZSBQcm9taXNlI2FsbFNldHRsZWRcbiAqL1xuUS5hbGxTZXR0bGVkID0gYWxsU2V0dGxlZDtcbmZ1bmN0aW9uIGFsbFNldHRsZWQocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gUShwcm9taXNlcykuYWxsU2V0dGxlZCgpO1xufVxuXG4vKipcbiAqIFR1cm5zIGFuIGFycmF5IG9mIHByb21pc2VzIGludG8gYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGVpciBzdGF0ZXMgKGFzXG4gKiByZXR1cm5lZCBieSBgaW5zcGVjdGApIHdoZW4gdGhleSBoYXZlIGFsbCBzZXR0bGVkLlxuICogQHBhcmFtIHtBcnJheVtBbnkqXX0gdmFsdWVzIGFuIGFycmF5IChvciBwcm9taXNlIGZvciBhbiBhcnJheSkgb2YgdmFsdWVzIChvclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcbiAqIEByZXR1cm5zIHtBcnJheVtTdGF0ZV19IGFuIGFycmF5IG9mIHN0YXRlcyBmb3IgdGhlIHJlc3BlY3RpdmUgdmFsdWVzLlxuICovXG5Qcm9taXNlLnByb3RvdHlwZS5hbGxTZXR0bGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgICAgIHJldHVybiBhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICAgICAgcHJvbWlzZSA9IFEocHJvbWlzZSk7XG4gICAgICAgICAgICBmdW5jdGlvbiByZWdhcmRsZXNzKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLmluc3BlY3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4ocmVnYXJkbGVzcywgcmVnYXJkbGVzcyk7XG4gICAgICAgIH0pKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQ2FwdHVyZXMgdGhlIGZhaWx1cmUgb2YgYSBwcm9taXNlLCBnaXZpbmcgYW4gb3BvcnR1bml0eSB0byByZWNvdmVyXG4gKiB3aXRoIGEgY2FsbGJhY2suICBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSBpcyBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZFxuICogcHJvbWlzZSBpcyBmdWxmaWxsZWQuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gZnVsZmlsbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpZiB0aGVcbiAqIGdpdmVuIHByb21pc2UgaXMgcmVqZWN0ZWRcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgY2FsbGJhY2tcbiAqL1xuUS5mYWlsID0gLy8gWFhYIGxlZ2FjeVxuUVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKG9iamVjdCwgcmVqZWN0ZWQpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCByZWplY3RlZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5mYWlsID0gLy8gWFhYIGxlZ2FjeVxuUHJvbWlzZS5wcm90b3R5cGVbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uIChyZWplY3RlZCkge1xuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCByZWplY3RlZCk7XG59O1xuXG4vKipcbiAqIEF0dGFjaGVzIGEgbGlzdGVuZXIgdGhhdCBjYW4gcmVzcG9uZCB0byBwcm9ncmVzcyBub3RpZmljYXRpb25zIGZyb20gYVxuICogcHJvbWlzZSdzIG9yaWdpbmF0aW5nIGRlZmVycmVkLiBUaGlzIGxpc3RlbmVyIHJlY2VpdmVzIHRoZSBleGFjdCBhcmd1bWVudHNcbiAqIHBhc3NlZCB0byBgYGRlZmVycmVkLm5vdGlmeWBgLlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlIGZvciBzb21ldGhpbmdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIHJlY2VpdmUgYW55IHByb2dyZXNzIG5vdGlmaWNhdGlvbnNcbiAqIEByZXR1cm5zIHRoZSBnaXZlbiBwcm9taXNlLCB1bmNoYW5nZWRcbiAqL1xuUS5wcm9ncmVzcyA9IHByb2dyZXNzO1xuZnVuY3Rpb24gcHJvZ3Jlc3Mob2JqZWN0LCBwcm9ncmVzc2VkKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS50aGVuKHZvaWQgMCwgdm9pZCAwLCBwcm9ncmVzc2VkKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUucHJvZ3Jlc3MgPSBmdW5jdGlvbiAocHJvZ3Jlc3NlZCkge1xuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xufTtcblxuLyoqXG4gKiBQcm92aWRlcyBhbiBvcHBvcnR1bml0eSB0byBvYnNlcnZlIHRoZSBzZXR0bGluZyBvZiBhIHByb21pc2UsXG4gKiByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIHByb21pc2UgaXMgZnVsZmlsbGVkIG9yIHJlamVjdGVkLiAgRm9yd2FyZHNcbiAqIHRoZSByZXNvbHV0aW9uIHRvIHRoZSByZXR1cm5lZCBwcm9taXNlIHdoZW4gdGhlIGNhbGxiYWNrIGlzIGRvbmUuXG4gKiBUaGUgY2FsbGJhY2sgY2FuIHJldHVybiBhIHByb21pc2UgdG8gZGVmZXIgY29tcGxldGlvbi5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gb2JzZXJ2ZSB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW5cbiAqIHByb21pc2UsIHRha2VzIG5vIGFyZ3VtZW50cy5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2Ugd2hlblxuICogYGBmaW5gYCBpcyBkb25lLlxuICovXG5RLmZpbiA9IC8vIFhYWCBsZWdhY3lcblFbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gUShvYmplY3QpW1wiZmluYWxseVwiXShjYWxsYmFjayk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5maW4gPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5mY2FsbCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRPRE8gYXR0ZW1wdCB0byByZWN5Y2xlIHRoZSByZWplY3Rpb24gd2l0aCBcInRoaXNcIi5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aHJvdyByZWFzb247XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBUZXJtaW5hdGVzIGEgY2hhaW4gb2YgcHJvbWlzZXMsIGZvcmNpbmcgcmVqZWN0aW9ucyB0byBiZVxuICogdGhyb3duIGFzIGV4Y2VwdGlvbnMuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgYXQgdGhlIGVuZCBvZiBhIGNoYWluIG9mIHByb21pc2VzXG4gKiBAcmV0dXJucyBub3RoaW5nXG4gKi9cblEuZG9uZSA9IGZ1bmN0aW9uIChvYmplY3QsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kb25lKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcbiAgICB2YXIgb25VbmhhbmRsZWRFcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAvLyBmb3J3YXJkIHRvIGEgZnV0dXJlIHR1cm4gc28gdGhhdCBgYHdoZW5gYFxuICAgICAgICAvLyBkb2VzIG5vdCBjYXRjaCBpdCBhbmQgdHVybiBpdCBpbnRvIGEgcmVqZWN0aW9uLlxuICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSk7XG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XG4gICAgICAgICAgICAgICAgUS5vbmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBgbmV4dFRpY2tgaW5nIHZpYSBhbiB1bm5lY2Vzc2FyeSBgd2hlbmAuXG4gICAgdmFyIHByb21pc2UgPSBmdWxmaWxsZWQgfHwgcmVqZWN0ZWQgfHwgcHJvZ3Jlc3MgP1xuICAgICAgICB0aGlzLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIDpcbiAgICAgICAgdGhpcztcblxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiBwcm9jZXNzICYmIHByb2Nlc3MuZG9tYWluKSB7XG4gICAgICAgIG9uVW5oYW5kbGVkRXJyb3IgPSBwcm9jZXNzLmRvbWFpbi5iaW5kKG9uVW5oYW5kbGVkRXJyb3IpO1xuICAgIH1cblxuICAgIHByb21pc2UudGhlbih2b2lkIDAsIG9uVW5oYW5kbGVkRXJyb3IpO1xufTtcblxuLyoqXG4gKiBDYXVzZXMgYSBwcm9taXNlIHRvIGJlIHJlamVjdGVkIGlmIGl0IGRvZXMgbm90IGdldCBmdWxmaWxsZWQgYmVmb3JlXG4gKiBzb21lIG1pbGxpc2Vjb25kcyB0aW1lIG91dC5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kcyB0aW1lb3V0XG4gKiBAcGFyYW0ge0FueSp9IGN1c3RvbSBlcnJvciBtZXNzYWdlIG9yIEVycm9yIG9iamVjdCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIGlmIGl0IGlzXG4gKiBmdWxmaWxsZWQgYmVmb3JlIHRoZSB0aW1lb3V0LCBvdGhlcndpc2UgcmVqZWN0ZWQuXG4gKi9cblEudGltZW91dCA9IGZ1bmN0aW9uIChvYmplY3QsIG1zLCBlcnJvcikge1xuICAgIHJldHVybiBRKG9iamVjdCkudGltZW91dChtcywgZXJyb3IpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIChtcywgZXJyb3IpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHZhciB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFlcnJvciB8fCBcInN0cmluZ1wiID09PSB0eXBlb2YgZXJyb3IpIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKGVycm9yIHx8IFwiVGltZWQgb3V0IGFmdGVyIFwiICsgbXMgKyBcIiBtc1wiKTtcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPSBcIkVUSU1FRE9VVFwiO1xuICAgICAgICB9XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgfSwgbXMpO1xuXG4gICAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgfSwgZGVmZXJyZWQubm90aWZ5KTtcblxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIGdpdmVuIHZhbHVlIChvciBwcm9taXNlZCB2YWx1ZSksIHNvbWVcbiAqIG1pbGxpc2Vjb25kcyBhZnRlciBpdCByZXNvbHZlZC4gUGFzc2VzIHJlamVjdGlvbnMgaW1tZWRpYXRlbHkuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaWxsaXNlY29uZHNcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgYWZ0ZXIgbWlsbGlzZWNvbmRzXG4gKiB0aW1lIGhhcyBlbGFwc2VkIHNpbmNlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlLlxuICogSWYgdGhlIGdpdmVuIHByb21pc2UgcmVqZWN0cywgdGhhdCBpcyBwYXNzZWQgaW1tZWRpYXRlbHkuXG4gKi9cblEuZGVsYXkgPSBmdW5jdGlvbiAob2JqZWN0LCB0aW1lb3V0KSB7XG4gICAgaWYgKHRpbWVvdXQgPT09IHZvaWQgMCkge1xuICAgICAgICB0aW1lb3V0ID0gb2JqZWN0O1xuICAgICAgICBvYmplY3QgPSB2b2lkIDA7XG4gICAgfVxuICAgIHJldHVybiBRKG9iamVjdCkuZGVsYXkodGltZW91dCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uICh0aW1lb3V0KSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBQYXNzZXMgYSBjb250aW51YXRpb24gdG8gYSBOb2RlIGZ1bmN0aW9uLCB3aGljaCBpcyBjYWxsZWQgd2l0aCB0aGUgZ2l2ZW5cbiAqIGFyZ3VtZW50cyBwcm92aWRlZCBhcyBhbiBhcnJheSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxuICpcbiAqICAgICAgUS5uZmFwcGx5KEZTLnJlYWRGaWxlLCBbX19maWxlbmFtZV0pXG4gKiAgICAgIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XG4gKiAgICAgIH0pXG4gKlxuICovXG5RLm5mYXBwbHkgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGFyZ3MpIHtcbiAgICByZXR1cm4gUShjYWxsYmFjaykubmZhcHBseShhcmdzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm5mYXBwbHkgPSBmdW5jdGlvbiAoYXJncykge1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJncyk7XG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgIHRoaXMuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxuICogYXJndW1lbnRzIHByb3ZpZGVkIGluZGl2aWR1YWxseSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxuICogQGV4YW1wbGVcbiAqIFEubmZjYWxsKEZTLnJlYWRGaWxlLCBfX2ZpbGVuYW1lKVxuICogLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAqIH0pXG4gKlxuICovXG5RLm5mY2FsbCA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gUShjYWxsYmFjaykubmZhcHBseShhcmdzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm5mY2FsbCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogV3JhcHMgYSBOb2RlSlMgY29udGludWF0aW9uIHBhc3NpbmcgZnVuY3Rpb24gYW5kIHJldHVybnMgYW4gZXF1aXZhbGVudFxuICogdmVyc2lvbiB0aGF0IHJldHVybnMgYSBwcm9taXNlLlxuICogQGV4YW1wbGVcbiAqIFEubmZiaW5kKEZTLnJlYWRGaWxlLCBfX2ZpbGVuYW1lKShcInV0Zi04XCIpXG4gKiAudGhlbihjb25zb2xlLmxvZylcbiAqIC5kb25lKClcbiAqL1xuUS5uZmJpbmQgPVxuUS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoY2FsbGJhY2sgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlQXJncyA9IGJhc2VBcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKTtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgICAgICBRKGNhbGxiYWNrKS5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm5mYmluZCA9XG5Qcm9taXNlLnByb3RvdHlwZS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XG4gICAgYXJncy51bnNoaWZ0KHRoaXMpO1xuICAgIHJldHVybiBRLmRlbm9kZWlmeS5hcHBseSh2b2lkIDAsIGFyZ3MpO1xufTtcblxuUS5uYmluZCA9IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc3AgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlQXJncyA9IGJhc2VBcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKTtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgICAgICBmdW5jdGlvbiBib3VuZCgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseSh0aGlzcCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICBRKGJvdW5kKS5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm5iaW5kID0gZnVuY3Rpb24gKC8qdGhpc3AsIC4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAwKTtcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIFEubmJpbmQuYXBwbHkodm9pZCAwLCBhcmdzKTtcbn07XG5cbi8qKlxuICogQ2FsbHMgYSBtZXRob2Qgb2YgYSBOb2RlLXN0eWxlIG9iamVjdCB0aGF0IGFjY2VwdHMgYSBOb2RlLXN0eWxlXG4gKiBjYWxsYmFjayB3aXRoIGEgZ2l2ZW4gYXJyYXkgb2YgYXJndW1lbnRzLCBwbHVzIGEgcHJvdmlkZWQgY2FsbGJhY2suXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBtZXRob2Qgb2Ygb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFja1xuICogd2lsbCBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxuICovXG5RLm5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxuUS5ucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLm5wb3N0KG5hbWUsIGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5Qcm9taXNlLnByb3RvdHlwZS5ucG9zdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJncyB8fCBbXSk7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcbiAqIGNhbGxiYWNrLCBmb3J3YXJkaW5nIHRoZSBnaXZlbiB2YXJpYWRpYyBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZFxuICogY2FsbGJhY2sgYXJndW1lbnQuXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBtZXRob2Qgb2Ygb2JqZWN0XG4gKiBAcGFyYW0gLi4uYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kOyB0aGUgY2FsbGJhY2sgd2lsbFxuICogYmUgcHJvdmlkZWQgYnkgUSBhbmQgYXBwZW5kZWQgdG8gdGhlc2UgYXJndW1lbnRzLlxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgdmFsdWUgb3IgZXJyb3JcbiAqL1xuUS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXG5RLm5tY2FsbCA9IC8vIFhYWCBCYXNlZCBvbiBcIlJlZHNhbmRybydzXCIgcHJvcG9zYWxcblEubmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubnNlbmQgPSAvLyBYWFggQmFzZWQgb24gTWFyayBNaWxsZXIncyBwcm9wb3NlZCBcInNlbmRcIlxuUHJvbWlzZS5wcm90b3R5cGUubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxuUHJvbWlzZS5wcm90b3R5cGUubmludm9rZSA9IGZ1bmN0aW9uIChuYW1lIC8qLi4uYXJncyovKSB7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIElmIGEgZnVuY3Rpb24gd291bGQgbGlrZSB0byBzdXBwb3J0IGJvdGggTm9kZSBjb250aW51YXRpb24tcGFzc2luZy1zdHlsZSBhbmRcbiAqIHByb21pc2UtcmV0dXJuaW5nLXN0eWxlLCBpdCBjYW4gZW5kIGl0cyBpbnRlcm5hbCBwcm9taXNlIGNoYWluIHdpdGhcbiAqIGBub2RlaWZ5KG5vZGViYWNrKWAsIGZvcndhcmRpbmcgdGhlIG9wdGlvbmFsIG5vZGViYWNrIGFyZ3VtZW50LiAgSWYgdGhlIHVzZXJcbiAqIGVsZWN0cyB0byB1c2UgYSBub2RlYmFjaywgdGhlIHJlc3VsdCB3aWxsIGJlIHNlbnQgdGhlcmUuICBJZiB0aGV5IGRvIG5vdFxuICogcGFzcyBhIG5vZGViYWNrLCB0aGV5IHdpbGwgcmVjZWl2ZSB0aGUgcmVzdWx0IHByb21pc2UuXG4gKiBAcGFyYW0gb2JqZWN0IGEgcmVzdWx0IChvciBhIHByb21pc2UgZm9yIGEgcmVzdWx0KVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbm9kZWJhY2sgYSBOb2RlLmpzLXN0eWxlIGNhbGxiYWNrXG4gKiBAcmV0dXJucyBlaXRoZXIgdGhlIHByb21pc2Ugb3Igbm90aGluZ1xuICovXG5RLm5vZGVpZnkgPSBub2RlaWZ5O1xuZnVuY3Rpb24gbm9kZWlmeShvYmplY3QsIG5vZGViYWNrKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5ub2RlaWZ5KG5vZGViYWNrKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUubm9kZWlmeSA9IGZ1bmN0aW9uIChub2RlYmFjaykge1xuICAgIGlmIChub2RlYmFjaykge1xuICAgICAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBub2RlYmFjayhudWxsLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBub2RlYmFjayhlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufTtcblxuUS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUS5ub0NvbmZsaWN0IG9ubHkgd29ya3Mgd2hlbiBRIGlzIHVzZWQgYXMgYSBnbG9iYWxcIik7XG59O1xuXG4vLyBBbGwgY29kZSBiZWZvcmUgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzLlxudmFyIHFFbmRpbmdMaW5lID0gY2FwdHVyZUxpbmUoKTtcblxucmV0dXJuIFE7XG5cbn0pO1xuIiwiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcblxuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIGNvbmYubWF4TGlzdGVuZXJzICYmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMpO1xuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnMsIGxpc3RlbmVyXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FycmF5KHRyZWUuX2xpc3RlbmVycykpIHtcblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzLndhcm5lZCkge1xuXG4gICAgICAgICAgICB2YXIgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtID4gMCAmJiB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgdGhpcy5tYW55KGV2ZW50LCAxLCBmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMub24oZXZlbnQsIGxpc3RlbmVyKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgKl9hbGwqIGZ1bmN0aW9ucyBhbmQgaW52b2tlIHRoZW0uXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcblxuICAgICAgaWYgKCF0aGlzLl9hbGwgJiZcbiAgICAgICAgIXRoaXMuX2V2ZW50cy5lcnJvciAmJlxuICAgICAgICAhKHRoaXMud2lsZGNhcmQgJiYgdGhpcy5saXN0ZW5lclRyZWUuZXJyb3IpKSB7XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIC8vIHNsb3dlclxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gKGxpc3RlbmVycy5sZW5ndGggPiAwKSB8fCAhIXRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gICAgfVxuXG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMub25BbnkodHlwZSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuICAgIH1cbiAgICBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuXG4gICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcblxuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgZXhwb3J0cy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGNvbXBvbmVudCB3aXRoaW4gYSBmb3JtLlxuICAgKiBAcGFyYW0gY29tcG9uZW50c1xuICAgKiBAcGFyYW0gZm5cbiAgICovXG4gIGVhY2hDb21wb25lbnQ6IGZ1bmN0aW9uIGVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZm4pIHtcbiAgICBpZiAoIWNvbXBvbmVudHMpIHJldHVybjtcblxuICAgIGNvbXBvbmVudHMuZm9yRWFjaChmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgIGlmIChjb21wb25lbnQuY29sdW1ucyAmJiBBcnJheS5pc0FycmF5KGNvbXBvbmVudC5jb2x1bW5zKSkge1xuICAgICAgICBjb21wb25lbnQuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgIGVhY2hDb21wb25lbnQoY29sdW1uLmNvbXBvbmVudHMsIGZuKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGVsc2UgaWYgKGNvbXBvbmVudC5yb3dzICYmIEFycmF5LmlzQXJyYXkoY29tcG9uZW50LnJvd3MpKSB7XG4gICAgICAgIFtdLmNvbmNhdC5hcHBseShbXSwgY29tcG9uZW50LnJvd3MpLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICAgICAgZWFjaENvbXBvbmVudChyb3cuY29tcG9uZW50cywgZm4pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudHMgJiYgQXJyYXkuaXNBcnJheShjb21wb25lbnQuY29tcG9uZW50cykpIHtcbiAgICAgICAgZWFjaENvbXBvbmVudChjb21wb25lbnQuY29tcG9uZW50cywgZm4pO1xuICAgICAgfVxuXG4gICAgICBlbHNlIHtcbiAgICAgICAgZm4oY29tcG9uZW50KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBjb21wb25lbnQgaXMgYSB0cmVlLCBiZSBzdXJlIHRvIGFkZCBpdCBiYWNrIGluIGFzIHdlbGwuXG4gICAgICBpZiAoY29tcG9uZW50LnRyZWUpIHtcbiAgICAgICAgZm4oY29tcG9uZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGEgY29tcG9uZW50IGJ5IGl0cyBrZXlcbiAgICogQHBhcmFtIGNvbXBvbmVudHNcbiAgICogQHBhcmFtIGtleSBUaGUga2V5IG9mIHRoZSBjb21wb25lbnQgdG8gZ2V0XG4gICAqIEByZXR1cm5zIFRoZSBjb21wb25lbnQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBrZXksIG9yIHVuZGVmaW5lZCBpZiBub3QgZm91bmQuXG4gICAqL1xuICBnZXRDb21wb25lbnQ6IGZ1bmN0aW9uIGdldENvbXBvbmVudChjb21wb25lbnRzLCBrZXkpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIG1vZHVsZS5leHBvcnRzLmVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0ga2V5KSB7XG4gICAgICAgIHJlc3VsdCA9IGNvbXBvbmVudDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBmb3JtIGNvbXBvbmVudHMgZm9yIGRhdGEgbWFuaXB1bGF0aW9uLlxuICAgKiBAcGFyYW0gY29tcG9uZW50c1xuICAgKiBAcGFyYW0gZmxhdHRlbmVkXG4gICAqIEByZXR1cm5zIHsqfHt9fVxuICAgKi9cbiAgZmxhdHRlbkNvbXBvbmVudHM6IGZ1bmN0aW9uIGZsYXR0ZW5Db21wb25lbnRzKGNvbXBvbmVudHMpIHtcbiAgICB2YXIgZmxhdHRlbmVkID0ge307XG4gICAgbW9kdWxlLmV4cG9ydHMuZWFjaENvbXBvbmVudChjb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgIGZsYXR0ZW5lZFtjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudDtcbiAgICB9KTtcbiAgICByZXR1cm4gZmxhdHRlbmVkO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxucmVxdWlyZSgnd2hhdHdnLWZldGNoJyk7XHJcbnZhciBRID0gcmVxdWlyZSgnUScpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XHJcbnZhciBjb3B5ID0gcmVxdWlyZSgnc2hhbGxvdy1jb3B5Jyk7XHJcblxyXG4vLyBUaGUgZGVmYXVsdCBiYXNlIHVybC5cclxudmFyIGJhc2VVcmwgPSAnJztcclxuXHJcbnZhciBwbHVnaW5zID0gW107XHJcblxyXG4vLyBUaGUgdGVtcG9yYXJ5IEdFVCByZXF1ZXN0IGNhY2hlIHN0b3JhZ2VcclxudmFyIGNhY2hlID0ge307XHJcblxyXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCl7fTtcclxudmFyIGlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xyXG5cclxuLy8gV2lsbCBpbnZva2UgYSBmdW5jdGlvbiBvbiBhbGwgcGx1Z2lucy5cclxuLy8gUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIGFsbCBwcm9taXNlc1xyXG4vLyByZXR1cm5lZCBieSB0aGUgcGx1Z2lucyBoYXZlIHJlc29sdmVkLlxyXG4vLyBTaG91bGQgYmUgdXNlZCB3aGVuIHlvdSB3YW50IHBsdWdpbnMgdG8gcHJlcGFyZSBmb3IgYW4gZXZlbnRcclxuLy8gYnV0IGRvbid0IHdhbnQgYW55IGRhdGEgcmV0dXJuZWQuXHJcbnZhciBwbHVnaW5XYWl0ID0gZnVuY3Rpb24ocGx1Z2luRm4pIHtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcclxuICByZXR1cm4gUS5hbGwocGx1Z2lucy5tYXAoZnVuY3Rpb24ocGx1Z2luKSB7XHJcbiAgICByZXR1cm4gKHBsdWdpbltwbHVnaW5Gbl0gfHwgbm9vcCkuYXBwbHkocGx1Z2luLCBhcmdzKTtcclxuICB9KSk7XHJcbn07XHJcblxyXG4vLyBXaWxsIGludm9rZSBhIGZ1bmN0aW9uIG9uIHBsdWdpbnMgZnJvbSBoaWdoZXN0IHByaW9yaXR5XHJcbi8vIHRvIGxvd2VzdCB1bnRpbCBvbmUgcmV0dXJucyBhIHZhbHVlLiBSZXR1cm5zIG51bGwgaWYgbm9cclxuLy8gcGx1Z2lucyByZXR1cm4gYSB2YWx1ZS5cclxuLy8gU2hvdWxkIGJlIHVzZWQgd2hlbiB5b3Ugd2FudCBqdXN0IG9uZSBwbHVnaW4gdG8gaGFuZGxlIHRoaW5ncy5cclxudmFyIHBsdWdpbkdldCA9IGZ1bmN0aW9uKHBsdWdpbkZuKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XHJcbiAgdmFyIGNhbGxQbHVnaW4gPSBmdW5jdGlvbihpbmRleCwgcGx1Z2luRm4pIHtcclxuICAgIHZhciBwbHVnaW4gPSBwbHVnaW5zW2luZGV4XTtcclxuICAgIGlmICghcGx1Z2luKSByZXR1cm4gUShudWxsKTtcclxuICAgIHJldHVybiBRKChwbHVnaW4gJiYgcGx1Z2luW3BsdWdpbkZuXSB8fCBub29wKS5hcHBseShwbHVnaW4sIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSkpXHJcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgaWYgKHJlc3VsdCAhPT0gbnVsbCAmJiByZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgcmV0dXJuIGNhbGxQbHVnaW4uYXBwbHkobnVsbCwgW2luZGV4ICsgMV0uY29uY2F0KGFyZ3MpKTtcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgcmV0dXJuIGNhbGxQbHVnaW4uYXBwbHkobnVsbCwgWzBdLmNvbmNhdChhcmdzKSk7XHJcbn07XHJcblxyXG4vLyBXaWxsIGludm9rZSBhIGZ1bmN0aW9uIG9uIHBsdWdpbnMgZnJvbSBoaWdoZXN0IHByaW9yaXR5IHRvXHJcbi8vIGxvd2VzdCwgYnVpbGRpbmcgYSBwcm9taXNlIGNoYWluIGZyb20gdGhlaXIgcmV0dXJuIHZhbHVlc1xyXG4vLyBTaG91bGQgYmUgdXNlZCB3aGVuIGFsbCBwbHVnaW5zIG5lZWQgdG8gcHJvY2VzcyBhIHByb21pc2Unc1xyXG4vLyBzdWNjZXNzIG9yIGZhaWx1cmVcclxudmFyIHBsdWdpbkFsdGVyID0gZnVuY3Rpb24ocGx1Z2luRm4sIHZhbHVlKSB7XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XHJcbiAgcmV0dXJuIHBsdWdpbnMucmVkdWNlKGZ1bmN0aW9uKHZhbHVlLCBwbHVnaW4pIHtcclxuICAgICAgcmV0dXJuIChwbHVnaW5bcGx1Z2luRm5dIHx8IGlkZW50aXR5KS5hcHBseShwbHVnaW4sIFt2YWx1ZV0uY29uY2F0KGFyZ3MpKTtcclxuICB9LCB2YWx1ZSk7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgcGFydHMgb2YgdGhlIFVSTCB0aGF0IGFyZSBpbXBvcnRhbnQuXHJcbiAqIEluZGV4ZXNcclxuICogIC0gMDogVGhlIGZ1bGwgdXJsXHJcbiAqICAtIDE6IFRoZSBwcm90b2NvbFxyXG4gKiAgLSAyOiBUaGUgaG9zdG5hbWVcclxuICogIC0gMzogVGhlIHJlc3RcclxuICpcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcmV0dXJucyB7Kn1cclxuICovXHJcbnZhciBnZXRVcmxQYXJ0cyA9IGZ1bmN0aW9uKHVybCkge1xyXG4gIHJldHVybiB1cmwubWF0Y2goL14oaHR0cFtzXT86XFwvXFwvKShbXi9dKykoJHxcXC8uKikvKTtcclxufTtcclxuXHJcbnZhciBzZXJpYWxpemUgPSBmdW5jdGlvbihvYmopIHtcclxuICB2YXIgc3RyID0gW107XHJcbiAgZm9yKHZhciBwIGluIG9iailcclxuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcclxuICAgICAgc3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHApICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW3BdKSk7XHJcbiAgICB9XHJcbiAgcmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcclxufTtcclxuXHJcbi8vIFRoZSBmb3JtaW8gY2xhc3MuXHJcbnZhciBGb3JtaW8gPSBmdW5jdGlvbihwYXRoKSB7XHJcblxyXG4gIC8vIEVuc3VyZSB3ZSBoYXZlIGFuIGluc3RhbmNlIG9mIEZvcm1pby5cclxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRm9ybWlvKSkgeyByZXR1cm4gbmV3IEZvcm1pbyhwYXRoKTsgfVxyXG4gIGlmICghcGF0aCkge1xyXG4gICAgLy8gQWxsb3cgdXNlciB0byBjcmVhdGUgbmV3IHByb2plY3RzIGlmIHRoaXMgd2FzIGluc3RhbnRpYXRlZCB3aXRob3V0XHJcbiAgICAvLyBhIHVybFxyXG4gICAgdGhpcy5wcm9qZWN0VXJsID0gYmFzZVVybCArICcvcHJvamVjdCc7XHJcbiAgICB0aGlzLnByb2plY3RzVXJsID0gYmFzZVVybCArICcvcHJvamVjdCc7XHJcbiAgICB0aGlzLnByb2plY3RJZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5xdWVyeSA9ICcnO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gSW5pdGlhbGl6ZSBvdXIgdmFyaWFibGVzLlxyXG4gIHRoaXMucHJvamVjdHNVcmwgPSAnJztcclxuICB0aGlzLnByb2plY3RVcmwgPSAnJztcclxuICB0aGlzLnByb2plY3RJZCA9ICcnO1xyXG4gIHRoaXMuZm9ybVVybCA9ICcnO1xyXG4gIHRoaXMuZm9ybXNVcmwgPSAnJztcclxuICB0aGlzLmZvcm1JZCA9ICcnO1xyXG4gIHRoaXMuc3VibWlzc2lvbnNVcmwgPSAnJztcclxuICB0aGlzLnN1Ym1pc3Npb25VcmwgPSAnJztcclxuICB0aGlzLnN1Ym1pc3Npb25JZCA9ICcnO1xyXG4gIHRoaXMuYWN0aW9uc1VybCA9ICcnO1xyXG4gIHRoaXMuYWN0aW9uSWQgPSAnJztcclxuICB0aGlzLmFjdGlvblVybCA9ICcnO1xyXG4gIHRoaXMucXVlcnkgPSAnJztcclxuXHJcbiAgLy8gTm9ybWFsaXplIHRvIGFuIGFic29sdXRlIHBhdGguXHJcbiAgaWYgKChwYXRoLmluZGV4T2YoJ2h0dHAnKSAhPT0gMCkgJiYgKHBhdGguaW5kZXhPZignLy8nKSAhPT0gMCkpIHtcclxuICAgIGJhc2VVcmwgPSBiYXNlVXJsID8gYmFzZVVybCA6IHdpbmRvdy5sb2NhdGlvbi5ocmVmLm1hdGNoKC9odHRwW3NdPzpcXC9cXC9hcGkuLylbMF07XHJcbiAgICBwYXRoID0gYmFzZVVybCArIHBhdGg7XHJcbiAgfVxyXG5cclxuICB2YXIgaG9zdHBhcnRzID0gZ2V0VXJsUGFydHMocGF0aCk7XHJcbiAgdmFyIHBhcnRzID0gW107XHJcbiAgdmFyIGhvc3ROYW1lID0gaG9zdHBhcnRzWzFdICsgaG9zdHBhcnRzWzJdO1xyXG4gIHBhdGggPSBob3N0cGFydHMubGVuZ3RoID4gMyA/IGhvc3RwYXJ0c1szXSA6ICcnO1xyXG4gIHZhciBxdWVyeXBhcnRzID0gcGF0aC5zcGxpdCgnPycpO1xyXG4gIGlmIChxdWVyeXBhcnRzLmxlbmd0aCA+IDEpIHtcclxuICAgIHBhdGggPSBxdWVyeXBhcnRzWzBdO1xyXG4gICAgdGhpcy5xdWVyeSA9ICc/JyArIHF1ZXJ5cGFydHNbMV07XHJcbiAgfVxyXG5cclxuICAvLyBTZWUgaWYgdGhpcyBpcyBhIGZvcm0gcGF0aC5cclxuICBpZiAoKHBhdGguc2VhcmNoKC8oXnxcXC8pKGZvcm18cHJvamVjdCkoJHxcXC8pLykgIT09IC0xKSkge1xyXG5cclxuICAgIC8vIFJlZ2lzdGVyIGEgc3BlY2lmaWMgcGF0aC5cclxuICAgIHZhciByZWdpc3RlclBhdGggPSBmdW5jdGlvbihuYW1lLCBiYXNlKSB7XHJcbiAgICAgIHRoaXNbbmFtZSArICdzVXJsJ10gPSBiYXNlICsgJy8nICsgbmFtZTtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnXFwvJyArIG5hbWUgKyAnXFwvKFteL10rKScpO1xyXG4gICAgICBpZiAocGF0aC5zZWFyY2gocmVnZXgpICE9PSAtMSkge1xyXG4gICAgICAgIHBhcnRzID0gcGF0aC5tYXRjaChyZWdleCk7XHJcbiAgICAgICAgdGhpc1tuYW1lICsgJ1VybCddID0gcGFydHMgPyAoYmFzZSArIHBhcnRzWzBdKSA6ICcnO1xyXG4gICAgICAgIHRoaXNbbmFtZSArICdJZCddID0gKHBhcnRzLmxlbmd0aCA+IDEpID8gcGFydHNbMV0gOiAnJztcclxuICAgICAgICBiYXNlICs9IHBhcnRzWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBiYXNlO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIC8vIFJlZ2lzdGVyIGFuIGFycmF5IG9mIGl0ZW1zLlxyXG4gICAgdmFyIHJlZ2lzdGVySXRlbXMgPSBmdW5jdGlvbihpdGVtcywgYmFzZSwgc3RhdGljQmFzZSkge1xyXG4gICAgICBmb3IgKHZhciBpIGluIGl0ZW1zKSB7XHJcbiAgICAgICAgaWYgKGl0ZW1zLmhhc093blByb3BlcnR5KGkpKSB7XHJcbiAgICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xyXG4gICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICByZWdpc3Rlckl0ZW1zKGl0ZW0sIGJhc2UsIHRydWUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBuZXdCYXNlID0gcmVnaXN0ZXJQYXRoKGl0ZW0sIGJhc2UpO1xyXG4gICAgICAgICAgICBiYXNlID0gc3RhdGljQmFzZSA/IGJhc2UgOiBuZXdCYXNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZWdpc3Rlckl0ZW1zKFsncHJvamVjdCcsICdmb3JtJywgWydzdWJtaXNzaW9uJywgJ2FjdGlvbiddXSwgaG9zdE5hbWUpO1xyXG5cclxuICAgIGlmICghdGhpcy5wcm9qZWN0SWQpIHtcclxuICAgICAgaWYgKGhvc3RwYXJ0cy5sZW5ndGggPiAyICYmIGhvc3RwYXJ0c1syXS5zcGxpdCgnLicpLmxlbmd0aCA+IDIpIHtcclxuICAgICAgICB0aGlzLnByb2plY3RVcmwgPSBob3N0TmFtZTtcclxuICAgICAgICB0aGlzLnByb2plY3RJZCA9IGhvc3RwYXJ0c1syXS5zcGxpdCgnLicpWzBdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG5cclxuICAgIC8vIFRoaXMgaXMgYW4gYWxpYXNlZCB1cmwuXHJcbiAgICB0aGlzLnByb2plY3RVcmwgPSBob3N0TmFtZTtcclxuICAgIHRoaXMucHJvamVjdElkID0gKGhvc3RwYXJ0cy5sZW5ndGggPiAyKSA/IGhvc3RwYXJ0c1syXS5zcGxpdCgnLicpWzBdIDogJyc7XHJcbiAgICB2YXIgc3ViUmVnRXggPSBuZXcgUmVnRXhwKCdcXC8oc3VibWlzc2lvbnxhY3Rpb24pKCR8XFwvLiopJyk7XHJcbiAgICB2YXIgc3VicyA9IHBhdGgubWF0Y2goc3ViUmVnRXgpO1xyXG4gICAgdGhpcy5wYXRoVHlwZSA9IChzdWJzICYmIChzdWJzLmxlbmd0aCA+IDEpKSA/IHN1YnNbMV0gOiAnJztcclxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2Uoc3ViUmVnRXgsICcnKTtcclxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyk7XHJcbiAgICB0aGlzLmZvcm1zVXJsID0gaG9zdE5hbWUgKyAnL2Zvcm0nO1xyXG4gICAgdGhpcy5mb3JtVXJsID0gaG9zdE5hbWUgKyBwYXRoO1xyXG4gICAgdGhpcy5mb3JtSWQgPSBwYXRoLnJlcGxhY2UoL15cXC8rfFxcLyskL2csICcnKTtcclxuICAgIHZhciBpdGVtcyA9IFsnc3VibWlzc2lvbicsICdhY3Rpb24nXTtcclxuICAgIGZvciAodmFyIGkgaW4gaXRlbXMpIHtcclxuICAgICAgaWYgKGl0ZW1zLmhhc093blByb3BlcnR5KGkpKSB7XHJcbiAgICAgICAgdmFyIGl0ZW0gPSBpdGVtc1tpXTtcclxuICAgICAgICB0aGlzW2l0ZW0gKyAnc1VybCddID0gaG9zdE5hbWUgKyBwYXRoICsgJy8nICsgaXRlbTtcclxuICAgICAgICBpZiAoKHRoaXMucGF0aFR5cGUgPT09IGl0ZW0pICYmIChzdWJzLmxlbmd0aCA+IDIpICYmIHN1YnNbMl0pIHtcclxuICAgICAgICAgIHRoaXNbaXRlbSArICdJZCddID0gc3Vic1syXS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCAnJyk7XHJcbiAgICAgICAgICB0aGlzW2l0ZW0gKyAnVXJsJ10gPSBob3N0TmFtZSArIHBhdGggKyBzdWJzWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb2FkIGEgcmVzb3VyY2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB0eXBlXHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBfbG9hZCA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuICB2YXIgX2lkID0gdHlwZSArICdJZCc7XHJcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKHF1ZXJ5LCBvcHRzKSB7XHJcbiAgICBpZiAocXVlcnkgJiYgdHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xyXG4gICAgICBxdWVyeSA9IHNlcmlhbGl6ZShxdWVyeS5wYXJhbXMpO1xyXG4gICAgfVxyXG4gICAgaWYgKHF1ZXJ5KSB7XHJcbiAgICAgIHF1ZXJ5ID0gdGhpcy5xdWVyeSA/ICh0aGlzLnF1ZXJ5ICsgJyYnICsgcXVlcnkpIDogKCc/JyArIHF1ZXJ5KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBxdWVyeSA9IHRoaXMucXVlcnk7XHJcbiAgICB9XHJcbiAgICBpZiAoIXRoaXNbX2lkXSkgeyByZXR1cm4gUS5yZWplY3QoJ01pc3NpbmcgJyArIF9pZCk7IH1cclxuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHR5cGUsIHRoaXNbX3VybF0gKyBxdWVyeSwgJ2dldCcsIG51bGwsIG9wdHMpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogU2F2ZSBhIHJlc291cmNlLlxyXG4gKlxyXG4gKiBAcGFyYW0gdHlwZVxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG52YXIgX3NhdmUgPSBmdW5jdGlvbih0eXBlKSB7XHJcbiAgdmFyIF9pZCA9IHR5cGUgKyAnSWQnO1xyXG4gIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xyXG4gIHJldHVybiBmdW5jdGlvbihkYXRhLCBvcHRzKSB7XHJcbiAgICB2YXIgbWV0aG9kID0gdGhpc1tfaWRdID8gJ3B1dCcgOiAncG9zdCc7XHJcbiAgICB2YXIgcmVxVXJsID0gdGhpc1tfaWRdID8gdGhpc1tfdXJsXSA6IHRoaXNbdHlwZSArICdzVXJsJ107XHJcbiAgICBjYWNoZSA9IHt9O1xyXG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QodHlwZSwgcmVxVXJsICsgdGhpcy5xdWVyeSwgbWV0aG9kLCBkYXRhLCBvcHRzKTtcclxuICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlbGV0ZSBhIHJlc291cmNlLlxyXG4gKlxyXG4gKiBAcGFyYW0gdHlwZVxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG52YXIgX2RlbGV0ZSA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuICB2YXIgX2lkID0gdHlwZSArICdJZCc7XHJcbiAgdmFyIF91cmwgPSB0eXBlICsgJ1VybCc7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uKG9wdHMpIHtcclxuICAgIGlmICghdGhpc1tfaWRdKSB7IFEucmVqZWN0KCdOb3RoaW5nIHRvIGRlbGV0ZScpOyB9XHJcbiAgICBjYWNoZSA9IHt9O1xyXG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QodHlwZSwgdGhpc1tfdXJsXSwgJ2RlbGV0ZScsIG51bGwsIG9wdHMpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogUmVzb3VyY2UgaW5kZXggbWV0aG9kLlxyXG4gKlxyXG4gKiBAcGFyYW0gdHlwZVxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG52YXIgX2luZGV4ID0gZnVuY3Rpb24odHlwZSkge1xyXG4gIHZhciBfdXJsID0gdHlwZSArICdVcmwnO1xyXG4gIHJldHVybiBmdW5jdGlvbihxdWVyeSwgb3B0cykge1xyXG4gICAgcXVlcnkgPSBxdWVyeSB8fCAnJztcclxuICAgIGlmIChxdWVyeSAmJiB0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHF1ZXJ5ID0gJz8nICsgc2VyaWFsaXplKHF1ZXJ5LnBhcmFtcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCh0eXBlLCB0aGlzW191cmxdICsgcXVlcnksICdnZXQnLCBudWxsLCBvcHRzKTtcclxuICB9O1xyXG59O1xyXG5cclxuLy8gQWN0aXZhdGVzIHBsdWdpbiBob29rcywgbWFrZXMgRm9ybWlvLnJlcXVlc3QgaWYgbm8gcGx1Z2luIHByb3ZpZGVzIGEgcmVxdWVzdFxyXG5Gb3JtaW8ucHJvdG90eXBlLm1ha2VSZXF1ZXN0ID0gZnVuY3Rpb24odHlwZSwgdXJsLCBtZXRob2QsIGRhdGEsIG9wdHMpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgbWV0aG9kID0gKG1ldGhvZCB8fCAnR0VUJykudG9VcHBlckNhc2UoKTtcclxuICBpZighb3B0cyB8fCB0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcclxuICAgIG9wdHMgPSB7fTtcclxuICB9XHJcblxyXG4gIHZhciByZXF1ZXN0QXJncyA9IHtcclxuICAgIGZvcm1pbzogc2VsZixcclxuICAgIHR5cGU6IHR5cGUsXHJcbiAgICB1cmw6IHVybCxcclxuICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgZGF0YTogZGF0YSxcclxuICAgIG9wdHM6IG9wdHNcclxuICB9O1xyXG5cclxuICB2YXIgcmVxdWVzdCA9IHBsdWdpbldhaXQoJ3ByZVJlcXVlc3QnLCByZXF1ZXN0QXJncylcclxuICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBwbHVnaW5HZXQoJ3JlcXVlc3QnLCByZXF1ZXN0QXJncylcclxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIEZvcm1pby5yZXF1ZXN0KHVybCwgbWV0aG9kLCBkYXRhKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBwbHVnaW5BbHRlcignd3JhcFJlcXVlc3RQcm9taXNlJywgcmVxdWVzdCwgcmVxdWVzdEFyZ3MpO1xyXG59O1xyXG5cclxuLy8gRGVmaW5lIHNwZWNpZmljIENSVUQgbWV0aG9kcy5cclxuRm9ybWlvLnByb3RvdHlwZS5sb2FkUHJvamVjdCA9IF9sb2FkKCdwcm9qZWN0Jyk7XHJcbkZvcm1pby5wcm90b3R5cGUuc2F2ZVByb2plY3QgPSBfc2F2ZSgncHJvamVjdCcpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZVByb2plY3QgPSBfZGVsZXRlKCdwcm9qZWN0Jyk7XHJcbkZvcm1pby5wcm90b3R5cGUubG9hZEZvcm0gPSBfbG9hZCgnZm9ybScpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLnNhdmVGb3JtID0gX3NhdmUoJ2Zvcm0nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5kZWxldGVGb3JtID0gX2RlbGV0ZSgnZm9ybScpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRGb3JtcyA9IF9pbmRleCgnZm9ybXMnKTtcclxuRm9ybWlvLnByb3RvdHlwZS5sb2FkU3VibWlzc2lvbiA9IF9sb2FkKCdzdWJtaXNzaW9uJyk7XHJcbkZvcm1pby5wcm90b3R5cGUuc2F2ZVN1Ym1pc3Npb24gPSBfc2F2ZSgnc3VibWlzc2lvbicpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmRlbGV0ZVN1Ym1pc3Npb24gPSBfZGVsZXRlKCdzdWJtaXNzaW9uJyk7XHJcbkZvcm1pby5wcm90b3R5cGUubG9hZFN1Ym1pc3Npb25zID0gX2luZGV4KCdzdWJtaXNzaW9ucycpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmxvYWRBY3Rpb24gPSBfbG9hZCgnYWN0aW9uJyk7XHJcbkZvcm1pby5wcm90b3R5cGUuc2F2ZUFjdGlvbiA9IF9zYXZlKCdhY3Rpb24nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5kZWxldGVBY3Rpb24gPSBfZGVsZXRlKCdhY3Rpb24nKTtcclxuRm9ybWlvLnByb3RvdHlwZS5sb2FkQWN0aW9ucyA9IF9pbmRleCgnYWN0aW9ucycpO1xyXG5Gb3JtaW8ucHJvdG90eXBlLmF2YWlsYWJsZUFjdGlvbnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QoJ2F2YWlsYWJsZUFjdGlvbnMnLCB0aGlzLmZvcm1VcmwgKyAnL2FjdGlvbnMnKTsgfTtcclxuRm9ybWlvLnByb3RvdHlwZS5hY3Rpb25JbmZvID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdCgnYWN0aW9uSW5mbycsIHRoaXMuZm9ybVVybCArICcvYWN0aW9ucy8nICsgbmFtZSk7IH07XHJcblxyXG5Gb3JtaW8ubWFrZVN0YXRpY1JlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG1ldGhvZCwgZGF0YSkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBtZXRob2QgPSAobWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xyXG5cclxuICB2YXIgcmVxdWVzdEFyZ3MgPSB7XHJcbiAgICB1cmw6IHVybCxcclxuICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgZGF0YTogZGF0YVxyXG4gIH07XHJcblxyXG4gIHZhciByZXF1ZXN0ID0gcGx1Z2luV2FpdCgncHJlU3RhdGljUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxyXG4gIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHBsdWdpbkdldCgnc3RhdGljUmVxdWVzdCcsIHJlcXVlc3RBcmdzKVxyXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm4gRm9ybWlvLnJlcXVlc3QodXJsLCBtZXRob2QsIGRhdGEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHBsdWdpbkFsdGVyKCd3cmFwU3RhdGljUmVxdWVzdFByb21pc2UnLCByZXF1ZXN0LCByZXF1ZXN0QXJncyk7XHJcbn07XHJcblxyXG4vLyBTdGF0aWMgbWV0aG9kcy5cclxuRm9ybWlvLmxvYWRQcm9qZWN0cyA9IGZ1bmN0aW9uKHF1ZXJ5KSB7XHJcbiAgcXVlcnkgPSBxdWVyeSB8fCAnJztcclxuICBpZiAodHlwZW9mIHF1ZXJ5ID09PSAnb2JqZWN0Jykge1xyXG4gICAgcXVlcnkgPSAnPycgKyBzZXJpYWxpemUocXVlcnkucGFyYW1zKTtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QoYmFzZVVybCArICcvcHJvamVjdCcgKyBxdWVyeSk7XHJcbn07XHJcbkZvcm1pby5yZXF1ZXN0ID0gZnVuY3Rpb24odXJsLCBtZXRob2QsIGRhdGEpIHtcclxuICBpZiAoIXVybCkgeyByZXR1cm4gUS5yZWplY3QoJ05vIHVybCBwcm92aWRlZCcpOyB9XHJcbiAgbWV0aG9kID0gKG1ldGhvZCB8fCAnR0VUJykudG9VcHBlckNhc2UoKTtcclxuICB2YXIgY2FjaGVLZXkgPSBidG9hKHVybCk7XHJcblxyXG4gIHJldHVybiBRKCkudGhlbihmdW5jdGlvbigpIHtcclxuICAgIC8vIEdldCB0aGUgY2FjaGVkIHByb21pc2UgdG8gc2F2ZSBtdWx0aXBsZSBsb2Fkcy5cclxuICAgIGlmIChtZXRob2QgPT09ICdHRVQnICYmIGNhY2hlLmhhc093blByb3BlcnR5KGNhY2hlS2V5KSkge1xyXG4gICAgICByZXR1cm4gY2FjaGVbY2FjaGVLZXldO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHJldHVybiBRKClcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gU2V0IHVwIGFuZCBmZXRjaCByZXF1ZXN0XHJcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7XHJcbiAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04J1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB0b2tlbiA9IEZvcm1pby5nZXRUb2tlbigpO1xyXG4gICAgICAgIGlmICh0b2tlbikge1xyXG4gICAgICAgICAgaGVhZGVycy5hcHBlbmQoJ3gtand0LXRva2VuJywgdG9rZW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcclxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMsXHJcbiAgICAgICAgICBtb2RlOiAnY29ycydcclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgICBvcHRpb25zLmJvZHkgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmZXRjaCh1cmwsIG9wdGlvbnMpO1xyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgZXJyLm1lc3NhZ2UgPSAnQ291bGQgbm90IGNvbm5lY3QgdG8gQVBJIHNlcnZlciAoJyArIGVyci5tZXNzYWdlICsgJyknO1xyXG4gICAgICAgIGVyci5uZXR3b3JrRXJyb3IgPSB0cnVlO1xyXG4gICAgICAgIHRocm93IGVycjtcclxuICAgICAgfSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAvLyBIYW5kbGUgZmV0Y2ggcmVzdWx0c1xyXG4gICAgICAgIGlmIChyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgdmFyIHRva2VuID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ3gtand0LXRva2VuJyk7XHJcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDAgJiYgdG9rZW4gJiYgdG9rZW4gIT09ICcnKSB7XHJcbiAgICAgICAgICAgIEZvcm1pby5zZXRUb2tlbih0b2tlbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyAyMDQgaXMgbm8gY29udGVudC4gRG9uJ3QgdHJ5IHRvIC5qc29uKCkgaXQuXHJcbiAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIChyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykuaW5kZXhPZignYXBwbGljYXRpb24vanNvbicpICE9PSAtMSA/XHJcbiAgICAgICAgICAgIHJlc3BvbnNlLmpzb24oKSA6IHJlc3BvbnNlLnRleHQoKSlcclxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAvLyBBZGQgc29tZSBjb250ZW50LXJhbmdlIG1ldGFkYXRhIHRvIHRoZSByZXN1bHQgaGVyZVxyXG4gICAgICAgICAgICB2YXIgcmFuZ2UgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1yYW5nZScpO1xyXG4gICAgICAgICAgICBpZiAocmFuZ2UgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlLnNwbGl0KCcvJyk7XHJcbiAgICAgICAgICAgICAgaWYocmFuZ2VbMF0gIT09ICcqJykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNraXBMaW1pdCA9IHJhbmdlWzBdLnNwbGl0KCctJyk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2tpcCA9IE51bWJlcihza2lwTGltaXRbMF0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LmxpbWl0ID0gc2tpcExpbWl0WzFdIC0gc2tpcExpbWl0WzBdICsgMTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgcmVzdWx0LnNlcnZlckNvdW50ID0gcmFuZ2VbMV0gPT09ICcqJyA/IHJhbmdlWzFdIDogTnVtYmVyKHJhbmdlWzFdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDQwKSB7XHJcbiAgICAgICAgICAgIEZvcm1pby5zZXRUb2tlbihudWxsKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFBhcnNlIGFuZCByZXR1cm4gdGhlIGVycm9yIGFzIGEgcmVqZWN0ZWQgcHJvbWlzZSB0byByZWplY3QgdGhpcyBwcm9taXNlXHJcbiAgICAgICAgICByZXR1cm4gKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgIT09IC0xID9cclxuICAgICAgICAgICAgcmVzcG9uc2UuanNvbigpIDogcmVzcG9uc2UudGV4dCgpKVxyXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihlcnJvcil7XHJcbiAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgIC8vIFJlbW92ZSBmYWlsZWQgcHJvbWlzZXMgZnJvbSBjYWNoZVxyXG4gICAgICAgIGRlbGV0ZSBjYWNoZVtjYWNoZUtleV07XHJcbiAgICAgICAgLy8gUHJvcGFnYXRlIGVycm9yIHNvIGNsaWVudCBjYW4gaGFuZGxlIGFjY29yZGluZ2x5XHJcbiAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9KVxyXG4gIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgLy8gU2F2ZSB0aGUgY2FjaGVcclxuICAgIGlmIChtZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgIGNhY2hlW2NhY2hlS2V5XSA9IFEocmVzdWx0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTaGFsbG93IGNvcHkgcmVzdWx0IHNvIG1vZGlmaWNhdGlvbnMgZG9uJ3QgZW5kIHVwIGluIGNhY2hlXHJcbiAgICBpZihBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcclxuICAgICAgdmFyIHJlc3VsdENvcHkgPSByZXN1bHQubWFwKGNvcHkpO1xyXG4gICAgICByZXN1bHRDb3B5LnNraXAgPSByZXN1bHQuc2tpcDtcclxuICAgICAgcmVzdWx0Q29weS5saW1pdCA9IHJlc3VsdC5saW1pdDtcclxuICAgICAgcmVzdWx0Q29weS5zZXJ2ZXJDb3VudCA9IHJlc3VsdC5zZXJ2ZXJDb3VudDtcclxuICAgICAgcmV0dXJuIHJlc3VsdENvcHk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29weShyZXN1bHQpO1xyXG4gIH0pO1xyXG59O1xyXG5cclxuRm9ybWlvLnNldFRva2VuID0gZnVuY3Rpb24odG9rZW4pIHtcclxuICB0b2tlbiA9IHRva2VuIHx8ICcnO1xyXG4gIGlmICh0b2tlbiA9PT0gdGhpcy50b2tlbikgeyByZXR1cm47IH1cclxuICB0aGlzLnRva2VuID0gdG9rZW47XHJcbiAgaWYgKCF0b2tlbikge1xyXG4gICAgRm9ybWlvLnNldFVzZXIobnVsbCk7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1Rva2VuJyk7XHJcbiAgfVxyXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9Ub2tlbicsIHRva2VuKTtcclxuICBGb3JtaW8uY3VycmVudFVzZXIoKTsgLy8gUnVuIHRoaXMgc28gdXNlciBpcyB1cGRhdGVkIGlmIG51bGxcclxufTtcclxuRm9ybWlvLmdldFRva2VuID0gZnVuY3Rpb24oKSB7XHJcbiAgaWYgKHRoaXMudG9rZW4pIHsgcmV0dXJuIHRoaXMudG9rZW47IH1cclxuICB2YXIgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvVG9rZW4nKSB8fCAnJztcclxuICB0aGlzLnRva2VuID0gdG9rZW47XHJcbiAgcmV0dXJuIHRva2VuO1xyXG59O1xyXG5Gb3JtaW8uc2V0VXNlciA9IGZ1bmN0aW9uKHVzZXIpIHtcclxuICBpZiAoIXVzZXIpIHtcclxuICAgIHRoaXMuc2V0VG9rZW4obnVsbCk7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1VzZXInKTtcclxuICB9XHJcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb1VzZXInLCBKU09OLnN0cmluZ2lmeSh1c2VyKSk7XHJcbn07XHJcbkZvcm1pby5nZXRVc2VyID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1VzZXInKSB8fCBudWxsKTtcclxufTtcclxuXHJcbkZvcm1pby5zZXRCYXNlVXJsID0gZnVuY3Rpb24odXJsKSB7XHJcbiAgYmFzZVVybCA9IHVybDtcclxufTtcclxuRm9ybWlvLmdldEJhc2VVcmwgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gYmFzZVVybDtcclxufVxyXG5Gb3JtaW8uY2xlYXJDYWNoZSA9IGZ1bmN0aW9uKCkgeyBjYWNoZSA9IHt9OyB9O1xyXG5cclxuRm9ybWlvLmN1cnJlbnRVc2VyID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHVybCA9IGJhc2VVcmwgKyAnL2N1cnJlbnQnO1xyXG4gIHZhciB1c2VyID0gdGhpcy5nZXRVc2VyKCk7XHJcbiAgaWYgKHVzZXIpIHtcclxuICAgIHJldHVybiBwbHVnaW5BbHRlcignd3JhcFN0YXRpY1JlcXVlc3RQcm9taXNlJywgUSh1c2VyKSwge1xyXG4gICAgICB1cmw6IHVybCxcclxuICAgICAgbWV0aG9kOiAnR0VUJ1xyXG4gICAgfSlcclxuICB9XHJcbiAgdmFyIHRva2VuID0gdGhpcy5nZXRUb2tlbigpO1xyXG4gIGlmICghdG9rZW4pIHtcclxuICAgIHJldHVybiBwbHVnaW5BbHRlcignd3JhcFN0YXRpY1JlcXVlc3RQcm9taXNlJywgUShudWxsKSwge1xyXG4gICAgICB1cmw6IHVybCxcclxuICAgICAgbWV0aG9kOiAnR0VUJ1xyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMubWFrZVN0YXRpY1JlcXVlc3QodXJsKVxyXG4gIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICBGb3JtaW8uc2V0VXNlcihyZXNwb25zZSk7XHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vLyBLZWVwIHRyYWNrIG9mIHRoZWlyIGxvZ291dCBjYWxsYmFjay5cclxuRm9ybWlvLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB0aGlzLm1ha2VTdGF0aWNSZXF1ZXN0KGJhc2VVcmwgKyAnL2xvZ291dCcpLmZpbmFsbHkoZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnNldFRva2VuKG51bGwpO1xyXG4gICAgdGhpcy5zZXRVc2VyKG51bGwpO1xyXG4gICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcclxuICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5Gb3JtaW8uZmllbGREYXRhID0gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XHJcbiAgaWYgKCFkYXRhKSB7IHJldHVybiAnJzsgfVxyXG4gIGlmIChjb21wb25lbnQua2V5LmluZGV4T2YoJy4nKSAhPT0gLTEpIHtcclxuICAgIHZhciB2YWx1ZSA9IGRhdGE7XHJcbiAgICB2YXIgcGFydHMgPSBjb21wb25lbnQua2V5LnNwbGl0KCcuJyk7XHJcbiAgICB2YXIga2V5ID0gJyc7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGtleSA9IHBhcnRzW2ldO1xyXG5cclxuICAgICAgLy8gSGFuZGxlIG5lc3RlZCByZXNvdXJjZXNcclxuICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KCdfaWQnKSkge1xyXG4gICAgICAgIHZhbHVlID0gdmFsdWUuZGF0YTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUmV0dXJuIGlmIHRoZSBrZXkgaXMgbm90IGZvdW5kIG9uIHRoZSB2YWx1ZS5cclxuICAgICAgaWYgKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDb252ZXJ0IG9sZCBzaW5nbGUgZmllbGQgZGF0YSBpbiBzdWJtaXNzaW9ucyB0byBtdWx0aXBsZVxyXG4gICAgICBpZiAoa2V5ID09PSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSAmJiBjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkodmFsdWVba2V5XSkpIHtcclxuICAgICAgICB2YWx1ZVtrZXldID0gW3ZhbHVlW2tleV1dO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgdGhlIHZhbHVlIG9mIHRoaXMga2V5LlxyXG4gICAgICB2YWx1ZSA9IHZhbHVlW2tleV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgLy8gQ29udmVydCBvbGQgc2luZ2xlIGZpZWxkIGRhdGEgaW4gc3VibWlzc2lvbnMgdG8gbXVsdGlwbGVcclxuICAgIGlmIChjb21wb25lbnQubXVsdGlwbGUgJiYgIUFycmF5LmlzQXJyYXkoZGF0YVtjb21wb25lbnQua2V5XSkpIHtcclxuICAgICAgZGF0YVtjb21wb25lbnQua2V5XSA9IFtkYXRhW2NvbXBvbmVudC5rZXldXTtcclxuICAgIH1cclxuICAgIHJldHVybiBkYXRhW2NvbXBvbmVudC5rZXldO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBFdmVudEVtaXR0ZXIgZm9yIEZvcm1pbyBldmVudHMuXHJcbiAqIFNlZSBOb2RlLmpzIGRvY3VtZW50YXRpb24gZm9yIEFQSSBkb2N1bWVudGF0aW9uOiBodHRwczovL25vZGVqcy5vcmcvYXBpL2V2ZW50cy5odG1sXHJcbiAqL1xyXG5Gb3JtaW8uZXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcih7XHJcbiAgd2lsZGNhcmQ6IGZhbHNlLFxyXG4gIG1heExpc3RlbmVyczogMFxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlciBhIHBsdWdpbiB3aXRoIEZvcm1pby5qc1xyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gdG8gcmVnaXN0ZXIuIFNlZSBwbHVnaW4gZG9jdW1lbnRhdGlvbi5cclxuICogQHBhcmFtIG5hbWUgICBPcHRpb25hbCBuYW1lIHRvIGxhdGVyIHJldHJpZXZlIHBsdWdpbiB3aXRoLlxyXG4gKi9cclxuRm9ybWlvLnJlZ2lzdGVyUGx1Z2luID0gZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XHJcbiAgcGx1Z2lucy5wdXNoKHBsdWdpbik7XHJcbiAgcGx1Z2lucy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgIHJldHVybiAoYi5wcmlvcml0eSB8fCAwKSAtIChhLnByaW9yaXR5IHx8IDApO1xyXG4gIH0pO1xyXG4gIHBsdWdpbi5fX25hbWUgPSBuYW1lO1xyXG4gIChwbHVnaW4uaW5pdCB8fCBub29wKS5jYWxsKHBsdWdpbiwgRm9ybWlvKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBwbHVnaW4gcmVnaXN0ZXJlZCB3aXRoIHRoZSBnaXZlbiBuYW1lLlxyXG4gKi9cclxuRm9ybWlvLmdldFBsdWdpbiA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICByZXR1cm4gcGx1Z2lucy5yZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCBwbHVnaW4pIHtcclxuICAgIGlmIChyZXN1bHQpIHJldHVybiByZXN1bHQ7XHJcbiAgICBpZiAocGx1Z2luLl9fbmFtZSA9PT0gbmFtZSkgcmV0dXJuIHBsdWdpbjtcclxuICB9LCBudWxsKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZXJlZ2lzdGVycyBhIHBsdWdpbiB3aXRoIEZvcm1pby5qcy5cclxuICogQHBhcmFtICBwbHVnaW4gVGhlIGluc3RhbmNlIG9yIG5hbWUgb2YgdGhlIHBsdWdpblxyXG4gKiBAcmV0dXJuIHRydWUgaWYgZGVyZWdpc3RlcmVkLCBmYWxzZSBvdGhlcndpc2VcclxuICovXHJcbkZvcm1pby5kZXJlZ2lzdGVyUGx1Z2luID0gZnVuY3Rpb24ocGx1Z2luKSB7XHJcbiAgdmFyIGJlZm9yZUxlbmd0aCA9IHBsdWdpbnMubGVuZ3RoO1xyXG4gIHBsdWdpbnMgPSBwbHVnaW5zLmZpbHRlcihmdW5jdGlvbihwKSB7XHJcbiAgICBpZihwICE9PSBwbHVnaW4gJiYgcC5fX25hbWUgIT09IHBsdWdpbikgcmV0dXJuIHRydWU7XHJcbiAgICAocC5kZXJlZ2lzdGVyIHx8IG5vb3ApLmNhbGwocCwgRm9ybWlvKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9KTtcclxuICByZXR1cm4gYmVmb3JlTGVuZ3RoICE9PSBwbHVnaW5zLmxlbmd0aDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRm9ybWlvO1xyXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuICAgIFxuICAgIHZhciBjb3B5O1xuICAgIFxuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGg7XG4gICAgICAgIGNvcHkgPSBBcnJheShsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBjb3B5W2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IG9iamVjdEtleXMob2JqKTtcbiAgICAgICAgY29weSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29weTtcbn07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoe30uaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgICByZXR1cm4ge30udG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnVybCA9IG51bGxcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgLy8gVE9ETzogUmVxdWVzdCBjb25zdHJ1Y3RvciBzaG91bGQgYWNjZXB0IGlucHV0LCBpbml0XG4gICAgdmFyIHJlcXVlc3RcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIGZ1bmN0aW9uIHJlc3BvbnNlVVJMKCkge1xuICAgICAgICBpZiAoJ3Jlc3BvbnNlVVJMJyBpbiB4aHIpIHtcbiAgICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVVJMXG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdm9pZCBzZWN1cml0eSB3YXJuaW5ncyBvbiBnZXRSZXNwb25zZUhlYWRlciB3aGVuIG5vdCBhbGxvd2VkIGJ5IENPUlNcbiAgICAgICAgaWYgKC9eWC1SZXF1ZXN0LVVSTDovbS50ZXN0KHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkpIHtcbiAgICAgICAgICByZXR1cm4geGhyLmdldFJlc3BvbnNlSGVhZGVyKCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdHVzID0gKHhoci5zdGF0dXMgPT09IDEyMjMpID8gMjA0IDogeGhyLnN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzIDwgMTAwIHx8IHN0YXR1cyA+IDU5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgLypqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignYWRkcmVzcycsIHtcclxuICAgICAgICB0aXRsZTogJ0FkZHJlc3MnLFxyXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbiAoJHNjb3BlKSB7XHJcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSA/ICdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLW11bHRpcGxlLmh0bWwnIDogJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MuaHRtbCc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckaHR0cCcsIGZ1bmN0aW9uICgkc2NvcGUsICRodHRwKSB7XHJcbiAgICAgICAgICAkc2NvcGUuYWRkcmVzcyA9IHt9O1xyXG4gICAgICAgICAgJHNjb3BlLmFkZHJlc3NlcyA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLnJlZnJlc2hBZGRyZXNzID0gZnVuY3Rpb24gKGFkZHJlc3MpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHthZGRyZXNzOiBhZGRyZXNzLCBzZW5zb3I6IGZhbHNlfTtcclxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChcclxuICAgICAgICAgICAgICAnaHR0cHM6Ly9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2dlb2NvZGUvanNvbicsXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZGlzYWJsZUpXVDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgIFByYWdtYTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmFkZHJlc3NlcyA9IHJlc3BvbnNlLmRhdGEucmVzdWx0cztcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfV0sXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgcmV0dXJuIGRhdGEgPyBkYXRhLmZvcm1hdHRlZF9hZGRyZXNzIDogJyc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdhZGRyZXNzRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnLFxyXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfX08L2xhYmVsPlxcclxcbjxzcGFuIG5nLWlmPVxcXCIhY29tcG9uZW50LmxhYmVsICYmIGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG48dWktc2VsZWN0IG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiIHRoZW1lPVxcXCJib290c3RyYXBcXFwiPlxcclxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIj57eyRpdGVtLmZvcm1hdHRlZF9hZGRyZXNzIHx8ICRzZWxlY3Quc2VsZWN0ZWQuZm9ybWF0dGVkX2FkZHJlc3N9fTwvdWktc2VsZWN0LW1hdGNoPlxcclxcbiAgPHVpLXNlbGVjdC1jaG9pY2VzIGNsYXNzPVxcXCJ1aS1zZWxlY3QtY2hvaWNlc1xcXCIgcmVwZWF0PVxcXCJhZGRyZXNzIGluIGFkZHJlc3Nlc1xcXCIgcmVmcmVzaD1cXFwicmVmcmVzaEFkZHJlc3MoJHNlbGVjdC5zZWFyY2gpXFxcIiByZWZyZXNoLWRlbGF5PVxcXCI1MDBcXFwiPlxcclxcbiAgICA8ZGl2IG5nLWJpbmQtaHRtbD1cXFwiYWRkcmVzcy5mb3JtYXR0ZWRfYWRkcmVzcyB8IGhpZ2hsaWdodDogJHNlbGVjdC5zZWFyY2hcXFwiPjwvZGl2PlxcclxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXHJcXG48L3VpLXNlbGVjdD5cXHJcXG5cIlxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gQ2hhbmdlIHRoZSB1aS1zZWxlY3QgdG8gdWktc2VsZWN0IG11bHRpcGxlLlxyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2FkZHJlc3MtbXVsdGlwbGUuaHRtbCcsXHJcbiAgICAgICAgJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmb3JtaW8vY29tcG9uZW50cy9hZGRyZXNzLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdidXR0b24nLCB7XHJcbiAgICAgICAgdGl0bGU6ICdCdXR0b24nLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnU3VibWl0JyxcclxuICAgICAgICAgIHRhYmxlVmlldzogZmFsc2UsXHJcbiAgICAgICAgICBrZXk6ICdzdWJtaXQnLFxyXG4gICAgICAgICAgc2l6ZTogJ21kJyxcclxuICAgICAgICAgIGxlZnRJY29uOiAnJyxcclxuICAgICAgICAgIHJpZ2h0SWNvbjogJycsXHJcbiAgICAgICAgICBibG9jazogZmFsc2UsXHJcbiAgICAgICAgICBhY3Rpb246ICdzdWJtaXQnLFxyXG4gICAgICAgICAgZGlzYWJsZU9uSW52YWxpZDogdHJ1ZSxcclxuICAgICAgICAgIHRoZW1lOiAncHJpbWFyeSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xyXG4gICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcclxuICAgICAgICAgICRzY29wZS5vbkNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoc2V0dGluZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICBjYXNlICdyZXNldCc6XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRGb3JtKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICBjYXNlICdvYXV0aCc6XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmhhc093blByb3BlcnR5KCdmb3JtJykpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5vYXV0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBtdXN0IGFzc2lnbiB0aGlzIGJ1dHRvbiB0byBhbiBPQXV0aCBhY3Rpb24gYmVmb3JlIGl0IHdpbGwgd29yay4nXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLm9hdXRoLmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBzZXR0aW5ncy5vYXV0aC5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5vcGVuT0F1dGgoc2V0dGluZ3Mub2F1dGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgJHNjb3BlLm9wZW5PQXV0aCA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIC8qZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXHJcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2VfdHlwZTogJ2NvZGUnLFxyXG4gICAgICAgICAgICAgIGNsaWVudF9pZDogc2V0dGluZ3MuY2xpZW50SWQsXHJcbiAgICAgICAgICAgICAgcmVkaXJlY3RfdXJpOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luIHx8IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdCxcclxuICAgICAgICAgICAgICBzdGF0ZTogc2V0dGluZ3Muc3RhdGUsXHJcbiAgICAgICAgICAgICAgc2NvcGU6IHNldHRpbmdzLnNjb3BlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIC8qZXNsaW50LWVuYWJsZSBjYW1lbGNhc2UgKi9cclxuXHJcbiAgICAgICAgICAgIC8vIE1ha2UgZGlzcGxheSBvcHRpb25hbC5cclxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRpc3BsYXkpIHtcclxuICAgICAgICAgICAgICBwYXJhbXMuZGlzcGxheSA9IHNldHRpbmdzLmRpc3BsYXk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFyYW1zID0gT2JqZWN0LmtleXMocGFyYW1zKS5tYXAoZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGtleSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba2V5XSk7XHJcbiAgICAgICAgICAgIH0pLmpvaW4oJyYnKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB1cmwgPSBzZXR0aW5ncy5hdXRoVVJJICsgJz8nICsgcGFyYW1zO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETzogbWFrZSB3aW5kb3cgb3B0aW9ucyBmcm9tIG9hdXRoIHNldHRpbmdzLCBoYXZlIGJldHRlciBkZWZhdWx0c1xyXG4gICAgICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3Blbih1cmwsIHNldHRpbmdzLnByb3ZpZGVyLCAnd2lkdGg9MTAyMCxoZWlnaHQ9NjE4Jyk7XHJcbiAgICAgICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcG9wdXBIb3N0ID0gcG9wdXAubG9jYXRpb24uaG9zdDtcclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvcHVwICYmICFwb3B1cC5jbG9zZWQgJiYgcG9wdXBIb3N0ID09PSBjdXJyZW50SG9zdCAmJiBwb3B1cC5sb2NhdGlvbi5zZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgcG9wdXAuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHBvcHVwLmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocGFyYW1zLCBwYXJhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzcGxpdCA9IHBhcmFtLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW3NwbGl0WzBdXSA9IHNwbGl0WzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICAgIH0sIHt9KTtcclxuICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLmVycm9yX2Rlc2NyaXB0aW9uIHx8IHBhcmFtcy5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBmb3IgZXJyb3IgcmVzcG9uc2UgaGVyZVxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3Muc3RhdGUgIT09IHBhcmFtcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ09BdXRoIHN0YXRlIGRvZXMgbm90IG1hdGNoLiBQbGVhc2UgdHJ5IGxvZ2dpbmcgaW4gYWdhaW4uJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvbiA9IHtkYXRhOiB7fSwgb2F1dGg6IHt9fTtcclxuICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbi5vYXV0aFtzZXR0aW5ncy5wcm92aWRlcl0gPSBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb24ub2F1dGhbc2V0dGluZ3MucHJvdmlkZXJdLnJlZGlyZWN0VVJJID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiB8fCB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3Q7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybWlvLnNhdmVTdWJtaXNzaW9uKHN1Ym1pc3Npb24pXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBmb3JtIHN1Ym1pc3Npb24uXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8IGVycm9yXHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoIXBvcHVwIHx8IHBvcHVwLmNsb3NlZCB8fCBwb3B1cC5jbG9zZWQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfV1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvYnV0dG9uLmh0bWwnLFxyXG4gICAgICAgIFwiPGJ1dHRvbiB0eXBlPVxcXCJ7e2NvbXBvbmVudC5hY3Rpb24gPT0gJ3N1Ym1pdCcgfHwgY29tcG9uZW50LmFjdGlvbiA9PSAncmVzZXQnID8gY29tcG9uZW50LmFjdGlvbiA6ICdidXR0b24nfX1cXFwiXFxyXFxubmctY2xhc3M9XFxcInsnYnRuLWJsb2NrJzogY29tcG9uZW50LmJsb2NrfVxcXCJcXHJcXG5jbGFzcz1cXFwiYnRuIGJ0bi17eyBjb21wb25lbnQudGhlbWUgfX0gYnRuLXt7IGNvbXBvbmVudC5zaXplIH19XFxcIlxcclxcbm5nLWRpc2FibGVkPVxcXCJyZWFkT25seSB8fCBmb3JtLnN1Ym1pdHRpbmcgfHwgKGNvbXBvbmVudC5kaXNhYmxlT25JbnZhbGlkICYmIGZvcm0uJGludmFsaWQpXFxcIlxcclxcbnRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG5uZy1jbGljaz1cXFwib25DbGljaygpXFxcIj5cXHJcXG4gIDxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQubGVmdEljb25cXFwiIGNsYXNzPVxcXCJ7eyBjb21wb25lbnQubGVmdEljb24gfX1cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuICA8c3BhbiBuZy1pZj1cXFwiY29tcG9uZW50LmxlZnRJY29uICYmIGNvbXBvbmVudC5sYWJlbFxcXCI+Jm5ic3A7PC9zcGFuPnt7IGNvbXBvbmVudC5sYWJlbCB9fTxzcGFuIG5nLWlmPVxcXCJjb21wb25lbnQucmlnaHRJY29uICYmIGNvbXBvbmVudC5sYWJlbFxcXCI+Jm5ic3A7PC9zcGFuPlxcclxcbiAgPHNwYW4gbmctaWY9XFxcImNvbXBvbmVudC5yaWdodEljb25cXFwiIGNsYXNzPVxcXCJ7eyBjb21wb25lbnQucmlnaHRJY29uIH19XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbiAgIDxpIG5nLWlmPVxcXCJjb21wb25lbnQuYWN0aW9uID09ICdzdWJtaXQnICYmIGZvcm0uc3VibWl0dGluZ1xcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcclxcbjwvYnV0dG9uPlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NoZWNrYm94Jywge1xyXG4gICAgICAgIHRpdGxlOiAnQ2hlY2sgQm94JyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NoZWNrYm94Lmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ2NoZWNrYm94JyxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIC8vIFRoaXMgaGlkZXMgdGhlIGRlZmF1bHQgbGFiZWwgbGF5b3V0IHNvIHdlIGNhbiB1c2UgYSBzcGVjaWFsIGlubGluZSBsYWJlbFxyXG4gICAgICAgICAgaGlkZUxhYmVsOiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnY2hlY2tib3hGaWVsZCcsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9jaGVja2JveC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImNoZWNrYm94XFxcIj5cXHJcXG4gIDxsYWJlbCBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+XFxyXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcclxcbiAgICBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gICAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gICAgdmFsdWU9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxuICAgIG5nLWNoZWNrZWQ9XFxcImRhdGFbY29tcG9uZW50LmtleV0gPT09ICd0cnVlJ1xcXCJcXHJcXG4gICAgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIlxcclxcbiAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxyXFxuICAgIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbiAgICBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIj5cXHJcXG4gICAge3sgY29tcG9uZW50LmxhYmVsIH19XFxyXFxuICA8L2xhYmVsPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2NvbHVtbnMnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdDb2x1bW5zJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBjb2x1bW5zOiBbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2NvbHVtbnMuaHRtbCcsXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTZcXFwiIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbXBvbmVudC5jb2x1bW5zXFxcIj5cXHJcXG4gICAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLnByb3ZpZGVyKCdmb3JtaW9Db21wb25lbnRzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcclxuICAgIHZhciBncm91cHMgPSB7XHJcbiAgICAgIF9fY29tcG9uZW50OiB7XHJcbiAgICAgICAgdGl0bGU6ICdCYXNpYyBDb21wb25lbnRzJ1xyXG4gICAgICB9LFxyXG4gICAgICBhZHZhbmNlZDoge1xyXG4gICAgICAgIHRpdGxlOiAnU3BlY2lhbCBDb21wb25lbnRzJ1xyXG4gICAgICB9LFxyXG4gICAgICBsYXlvdXQ6IHtcclxuICAgICAgICB0aXRsZTogJ0xheW91dCBDb21wb25lbnRzJ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWRkR3JvdXA6IGZ1bmN0aW9uIChuYW1lLCBncm91cCkge1xyXG4gICAgICAgIGdyb3Vwc1tuYW1lXSA9IGdyb3VwO1xyXG4gICAgICB9LFxyXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24gKHR5cGUsIGNvbXBvbmVudCwgZ3JvdXApIHtcclxuICAgICAgICBpZiAoIWNvbXBvbmVudHNbdHlwZV0pIHtcclxuICAgICAgICAgIGNvbXBvbmVudHNbdHlwZV0gPSBjb21wb25lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgYW5ndWxhci5leHRlbmQoY29tcG9uZW50c1t0eXBlXSwgY29tcG9uZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgdHlwZSBmb3IgdGhpcyBjb21wb25lbnQuXHJcbiAgICAgICAgaWYgKCFjb21wb25lbnRzW3R5cGVdLmdyb3VwKSB7XHJcbiAgICAgICAgICBjb21wb25lbnRzW3R5cGVdLmdyb3VwID0gZ3JvdXAgfHwgJ19fY29tcG9uZW50JztcclxuICAgICAgICB9XHJcbiAgICAgICAgY29tcG9uZW50c1t0eXBlXS5zZXR0aW5ncy50eXBlID0gdHlwZTtcclxuICAgICAgfSxcclxuICAgICAgJGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzLFxyXG4gICAgICAgICAgZ3JvdXBzOiBncm91cHNcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBhcHAuZGlyZWN0aXZlKCdzYWZlTXVsdGlwbGVUb1NpbmdsZScsIFtmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXHJcbiAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsIGVsLCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIG5nTW9kZWwuJGZvcm1hdHRlcnMucHVzaChmdW5jdGlvbiAobW9kZWxWYWx1ZSkge1xyXG4gICAgICAgICAgaWYgKCEkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlICYmIEFycmF5LmlzQXJyYXkobW9kZWxWYWx1ZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWVbMF0gfHwgJyc7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIG1vZGVsVmFsdWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfV0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY29udGFpbmVyJywge1xyXG4gICAgICAgIHRpdGxlOiAnQ29udGFpbmVyJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2NvbnRhaW5lci5odG1sJyxcclxuICAgICAgICBncm91cDogJ2xheW91dCcsXHJcbiAgICAgICAgaWNvbjogJ2ZhIGZhLWZvbGRlci1vcGVuJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0cmVlOiB0cnVlLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW10sXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdjb250YWluZXInLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5jb250cm9sbGVyKCdmb3JtaW9Db250YWluZXJDb21wb25lbnQnLCBbXHJcbiAgICAnJHNjb3BlJyxcclxuICAgIGZ1bmN0aW9uKCRzY29wZSkge1xyXG4gICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gfHwge307XHJcbiAgICAgICRzY29wZS5wYXJlbnRLZXkgPSAkc2NvcGUuY29tcG9uZW50LmtleTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGFpbmVyLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8ZGl2IG5nLWNvbnRyb2xsZXI9XFxcImZvcm1pb0NvbnRhaW5lckNvbXBvbmVudFxcXCIgY2xhc3M9XFxcImZvcm1pby1jb250YWluZXItY29tcG9uZW50XFxcIj5cXHJcXG4gIDxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVtwYXJlbnRLZXldXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdjb250ZW50Jywge1xyXG4gICAgICAgIHRpdGxlOiAnQ29udGVudCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9jb250ZW50Lmh0bWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBodG1sOiAnJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY29udGVudC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgbmctYmluZC1odG1sPVxcXCJjb21wb25lbnQuaHRtbCB8IHNhZmVodG1sXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+PC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignY3VzdG9tJywge1xyXG4gICAgICAgIHRpdGxlOiAnQ3VzdG9tJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2N1c3RvbS5odG1sJyxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge31cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvY3VzdG9tLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtZGVmYXVsdFxcXCI+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5IHRleHQtbXV0ZWQgdGV4dC1jZW50ZXJcXFwiPlxcclxcbiAgICBDdXN0b20gQ29tcG9uZW50ICh7eyBjb21wb25lbnQudHlwZSB9fSlcXHJcXG4gIDwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZGF0YWdyaWQnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdEYXRhIEdyaWQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0YWdyaWQuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XHJcbiAgICAgICAgICB2YXIgdmlldyA9ICc8dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1zdHJpcGVkXCI+PHRoZWFkPjx0cj4nO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgdmlldyArPSAnPHRoPicgKyBjb21wb25lbnQubGFiZWwgKyAnPC90aD4nO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICB2aWV3ICs9ICc8L3RyPjwvdGhlYWQ+JztcclxuICAgICAgICAgIHZpZXcgKz0gJzx0Ym9keT4nO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICB2aWV3ICs9ICc8dHI+JztcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbXBvbmVudC5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICB2aWV3ICs9ICc8dGQ+JyArIHJvd1tjb21wb25lbnQua2V5XSArICc8L3RkPic7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2aWV3ICs9ICc8L3RyPic7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHZpZXcgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xyXG4gICAgICAgICAgcmV0dXJuIHZpZXc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0cmVlOiB0cnVlLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW10sXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdkYXRhZ3JpZCcsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLmNvbnRyb2xsZXIoJ2Zvcm1pb0RhdGFHcmlkJywgW1xyXG4gICAgJyRzY29wZScsXHJcbiAgICBmdW5jdGlvbigkc2NvcGUpIHtcclxuICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFt7fV07XHJcblxyXG4gICAgICAkc2NvcGUuYWRkUm93ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gRW5zdXJlIHRoZSBvYmplY3QgaXMgaW5pdGlhbGl6ZWQgYXMgaXQgbWF5IGJlIHVuc2V0IG9uIGEgXCJSZXNldFwiLlxyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSgkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0pKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnB1c2goe30pO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgJHNjb3BlLnJlbW92ZVJvdyA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2RhdGFncmlkLmh0bWwnLCBGb3JtaW9VdGlscy5maWVsZFdyYXAoXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJmb3JtaW8tZGF0YS1ncmlkXFxcIiBuZy1jb250cm9sbGVyPVxcXCJmb3JtaW9EYXRhR3JpZFxcXCIgPlxcclxcbiAgPHRhYmxlIG5nLWNsYXNzPVxcXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgJ3RhYmxlLWJvcmRlcmVkJzogY29tcG9uZW50LmJvcmRlcmVkLCAndGFibGUtaG92ZXInOiBjb21wb25lbnQuaG92ZXIsICd0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVxcXCIgY2xhc3M9XFxcInRhYmxlIGRhdGFncmlkLXRhYmxlXFxcIj5cXHJcXG4gICAgPHRyPlxcclxcbiAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCI+e3sgY29tcG9uZW50LmxhYmVsfX08L3RoPlxcclxcbiAgICAgIDx0aD48L3RoPlxcclxcbiAgICA8L3RyPlxcclxcbiAgICA8dHIgY2xhc3M9XFxcImZvcm1pby1kYXRhLWdyaWQtcm93XFxcIiBuZy1yZXBlYXQ9XFxcInJvd0RhdGEgaW4gZGF0YVtjb21wb25lbnQua2V5XSB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCIgbmctaW5pdD1cXFwiY29tcG9uZW50LmhpZGVMYWJlbCA9IHRydWVcXFwiID5cXHJcXG4gICAgICAgIDxmb3JtaW8tY29tcG9uZW50IGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJyb3dEYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgICAgIDwvdGQ+XFxyXFxuICAgICAgPHRkPlxcclxcbiAgICAgICAgPGEgbmctY2xpY2s9XFxcInJlbW92ZVJvdygkaW5kZXgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5cXHJcXG4gICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVxcXCI+PC9zcGFuPlxcclxcbiAgICAgICAgPC9hPlxcclxcbiAgICAgIDwvdGQ+XFxyXFxuICAgIDwvdHI+XFxyXFxuICA8L3RhYmxlPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiZGF0YWdyaWQtYWRkXFxcIj5cXHJcXG4gICAgPGEgbmctY2xpY2s9XFxcImFkZFJvdygpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj5cXHJcXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiB7eyBjb21wb25lbnQuYWRkQW5vdGhlciB8fCBcXFwiQWRkIEFub3RoZXJcXFwiIH19XFxyXFxuICAgIDwvYT5cXHJcXG4gIDwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2RhdGV0aW1lJywge1xyXG4gICAgICAgIHRpdGxlOiAnRGF0ZSAvIFRpbWUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsXHJcbiAgICAgICAgdGFibGVWaWV3OiBmdW5jdGlvbihkYXRhLCBjb21wb25lbnQsICRpbnRlcnBvbGF0ZSkge1xyXG4gICAgICAgICAgcmV0dXJuICRpbnRlcnBvbGF0ZSgnPHNwYW4+e3sgXCInICsgZGF0YSArICdcIiB8IGRhdGU6IFwiJyArIGNvbXBvbmVudC5mb3JtYXQgKyAnXCIgfX08L3NwYW4+JykoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ2RhdGV0aW1lRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgZm9ybWF0OiAneXl5eS1NTS1kZCBISDptbScsXHJcbiAgICAgICAgICBlbmFibGVEYXRlOiB0cnVlLFxyXG4gICAgICAgICAgZW5hYmxlVGltZTogdHJ1ZSxcclxuICAgICAgICAgIG1pbkRhdGU6IG51bGwsXHJcbiAgICAgICAgICBtYXhEYXRlOiBudWxsLFxyXG4gICAgICAgICAgZGF0ZXBpY2tlck1vZGU6ICdkYXknLFxyXG4gICAgICAgICAgZGF0ZVBpY2tlcjoge1xyXG4gICAgICAgICAgICBzaG93V2Vla3M6IHRydWUsXHJcbiAgICAgICAgICAgIHN0YXJ0aW5nRGF5OiAwLFxyXG4gICAgICAgICAgICBpbml0RGF0ZTogJycsXHJcbiAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknLFxyXG4gICAgICAgICAgICBtYXhNb2RlOiAneWVhcicsXHJcbiAgICAgICAgICAgIHllYXJSYW5nZTogJzIwJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRpbWVQaWNrZXI6IHtcclxuICAgICAgICAgICAgaG91clN0ZXA6IDEsXHJcbiAgICAgICAgICAgIG1pbnV0ZVN0ZXA6IDEsXHJcbiAgICAgICAgICAgIHNob3dNZXJpZGlhbjogdHJ1ZSxcclxuICAgICAgICAgICAgcmVhZG9ubHlJbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICAgIG1vdXNld2hlZWw6IHRydWUsXHJcbiAgICAgICAgICAgIGFycm93a2V5czogdHJ1ZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBjdXN0b206ICcnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZGF0ZXRpbWUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWdyb3VwXFxcIj5cXHJcXG4gIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIlxcclxcbiAgbmctZm9jdXM9XFxcImNhbGVuZGFyT3BlbiA9IHRydWVcXFwiXFxyXFxuICBuZy1jbGljaz1cXFwiY2FsZW5kYXJPcGVuID0gdHJ1ZVxcXCJcXHJcXG4gIG5nLWluaXQ9XFxcImNhbGVuZGFyT3BlbiA9IGZhbHNlXFxcIlxcclxcbiAgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIlxcclxcbiAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXHJcXG4gIGlzLW9wZW49XFxcImNhbGVuZGFyT3BlblxcXCJcXHJcXG4gIGRhdGV0aW1lLXBpY2tlcj1cXFwie3sgY29tcG9uZW50LmZvcm1hdCB9fVxcXCJcXHJcXG4gIG1pbi1kYXRlPVxcXCJjb21wb25lbnQubWluRGF0ZVxcXCJcXHJcXG4gIG1heC1kYXRlPVxcXCJjb21wb25lbnQubWF4RGF0ZVxcXCJcXHJcXG4gIGRhdGVwaWNrZXItbW9kZT1cXFwiY29tcG9uZW50LmRhdGVwaWNrZXJNb2RlXFxcIlxcclxcbiAgZW5hYmxlLWRhdGU9XFxcImNvbXBvbmVudC5lbmFibGVEYXRlXFxcIlxcclxcbiAgZW5hYmxlLXRpbWU9XFxcImNvbXBvbmVudC5lbmFibGVUaW1lXFxcIlxcclxcbiAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxyXFxuICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxyXFxuICBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIlxcclxcbiAgZGF0ZXBpY2tlci1vcHRpb25zPVxcXCJjb21wb25lbnQuZGF0ZVBpY2tlclxcXCJcXHJcXG4gIHRpbWVwaWNrZXItb3B0aW9ucz1cXFwiY29tcG9uZW50LnRpbWVQaWNrZXJcXFwiIC8+XFxyXFxuICA8c3BhbiBjbGFzcz1cXFwiaW5wdXQtZ3JvdXAtYnRuXFxcIj5cXHJcXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgbmctY2xpY2s9XFxcImNhbGVuZGFyT3BlbiA9IHRydWVcXFwiPlxcclxcbiAgICAgIDxpIG5nLWlmPVxcXCJjb21wb25lbnQuZW5hYmxlRGF0ZVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tY2FsZW5kYXJcXFwiPjwvaT5cXHJcXG4gICAgICA8aSBuZy1pZj1cXFwiIWNvbXBvbmVudC5lbmFibGVEYXRlXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi10aW1lXFxcIj48L2k+XFxyXFxuICAgIDwvYnV0dG9uPlxcclxcbiAgPC9zcGFuPlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2VtYWlsJywge1xyXG4gICAgICAgIHRpdGxlOiAnRW1haWwnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvdGV4dGZpZWxkLmh0bWwnLFxyXG4gICAgICAgIGdyb3VwOiAnYWR2YW5jZWQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ2VtYWlsJyxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ2VtYWlsRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgcHJlZml4OiAnJyxcclxuICAgICAgICAgIHN1ZmZpeDogJycsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignZmllbGRzZXQnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdGaWVsZCBTZXQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvZmllbGRzZXQuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsZWdlbmQ6ICcnLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW11cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL2ZpZWxkc2V0Lmh0bWwnLFxyXG4gICAgICAgIFwiPGZpZWxkc2V0IGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXHJcXG4gIDxsZWdlbmQgbmctaWY9XFxcImNvbXBvbmVudC5sZWdlbmRcXFwiPnt7IGNvbXBvbmVudC5sZWdlbmQgfX08L2xlZ2VuZD5cXHJcXG4gIDxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVxcXCIgZm9ybWlvPVxcXCJmb3JtaW9cXFwiIHJlYWQtb25seT1cXFwicmVhZE9ubHlcXFwiPjwvZm9ybWlvLWNvbXBvbmVudD5cXHJcXG48L2ZpZWxkc2V0PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2ZpbGUnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdGaWxlJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL2ZpbGUuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnZmlsZScsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBtdWx0aXBsZTogZmFsc2UsXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcblxyXG4gIGFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0ZpbGVMaXN0JywgW2Z1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBmaWxlczogJz0nLFxyXG4gICAgICAgIGZvcm06ICc9JyxcclxuICAgICAgICByZWFkT25seTogJz0nXHJcbiAgICAgIH0sXHJcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvZm9ybWlvLWZpbGUtbGlzdC5odG1sJyxcclxuICAgICAgY29udHJvbGxlcjogW1xyXG4gICAgICAgICckc2NvcGUnLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkc2NvcGUpIHtcclxuICAgICAgICAgICRzY29wZS5yZW1vdmVGaWxlID0gZnVuY3Rpb24gKGV2ZW50LCBpbmRleCkge1xyXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAkc2NvcGUuZmlsZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgJHNjb3BlLmZpbGVTaXplID0gZnVuY3Rpb24gKGEsIGIsIGMsIGQsIGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChiID0gTWF0aCwgYyA9IGIubG9nLCBkID0gMTAyNCwgZSA9IGMoYSkgLyBjKGQpIHwgMCwgYSAvIGIucG93KGQsIGUpKS50b0ZpeGVkKDIpICsgJyAnICsgKGUgPyAna01HVFBFWlknWy0tZV0gKyAnQicgOiAnQnl0ZXMnKTtcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG4gIH1dKTtcclxuXHJcbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRmlsZScsIFtmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgZmlsZTogJz0nLFxyXG4gICAgICAgIGZvcm06ICc9J1xyXG4gICAgICB9LFxyXG4gICAgICB0ZW1wbGF0ZTogJzxhIGhyZWY9XCJ7eyBmaWxlLnVybCB9fVwiIG5nLWNsaWNrPVwiZ2V0RmlsZSgkZXZlbnQpXCIgdGFyZ2V0PVwiX2JsYW5rXCI+e3sgZmlsZS5uYW1lIH19PC9hPicsXHJcbiAgICAgIGNvbnRyb2xsZXI6IFtcclxuICAgICAgICAnJHNjb3BlJyxcclxuICAgICAgICAnRm9ybWlvUGx1Z2lucycsXHJcbiAgICAgICAgZnVuY3Rpb24gKFxyXG4gICAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICAgRm9ybWlvUGx1Z2luc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgJHNjb3BlLmdldEZpbGUgPSBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgICAgIHZhciBwbHVnaW4gPSBGb3JtaW9QbHVnaW5zKCdzdG9yYWdlJywgJHNjb3BlLmZpbGUuc3RvcmFnZSk7XHJcbiAgICAgICAgICAgIGlmIChwbHVnaW4pIHtcclxuICAgICAgICAgICAgICBwbHVnaW4uZG93bmxvYWRGaWxlKGV2dCwgJHNjb3BlLmZpbGUsICRzY29wZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG4gIH1dKTtcclxuXHJcbiAgYXBwLmNvbnRyb2xsZXIoJ2Zvcm1pb0ZpbGVVcGxvYWQnLCBbXHJcbiAgICAnJHNjb3BlJyxcclxuICAgICdGb3JtaW9QbHVnaW5zJyxcclxuICAgIGZ1bmN0aW9uKFxyXG4gICAgICAkc2NvcGUsXHJcbiAgICAgIEZvcm1pb1BsdWdpbnNcclxuICAgICkge1xyXG4gICAgICAkc2NvcGUuZmlsZVVwbG9hZHMgPSB7fTtcclxuXHJcbiAgICAgICRzY29wZS5yZW1vdmVVcGxvYWQgPSBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgIGRlbGV0ZSAkc2NvcGUuZmlsZVVwbG9hZHNbaW5kZXhdO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gVGhpcyBmaXhlcyBuZXcgZmllbGRzIGhhdmluZyBhbiBlbXB0eSBzcGFjZSBpbiB0aGUgYXJyYXkuXHJcbiAgICAgIGlmICgkc2NvcGUuZGF0YSAmJiAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPT09ICcnKSB7XHJcbiAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gW107XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCRzY29wZS5kYXRhICYmICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XVswXSA9PT0gJycpIHtcclxuICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0uc3BsaWNlKDAsIDEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAkc2NvcGUudXBsb2FkID0gZnVuY3Rpb24oZmlsZXMpIHtcclxuICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5zdG9yYWdlICYmIGZpbGVzICYmIGZpbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgdmFyIHBsdWdpbiA9IEZvcm1pb1BsdWdpbnMoJ3N0b3JhZ2UnLCAkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2UpO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbihmaWxlKSB7XHJcbiAgICAgICAgICAgIGlmIChwbHVnaW4pIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZS5uYW1lXSA9IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZSxcclxuICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogJ2luZm8nLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1N0YXJ0aW5nIHVwbG9hZCdcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIHBsdWdpbi51cGxvYWRGaWxlKGZpbGUsICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlLm5hbWVdLCAkc2NvcGUpXHJcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlSW5mbykge1xyXG4gICAgICAgICAgICAgICAgICBkZWxldGUgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGUubmFtZV07XHJcbiAgICAgICAgICAgICAgICAgIGZpbGVJbmZvLnN0b3JhZ2UgPSAkc2NvcGUuY29tcG9uZW50LnN0b3JhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XS5wdXNoKGZpbGVJbmZvKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZS5uYW1lXS5zdGF0dXMgPSAnZXJyb3InO1xyXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmlsZVVwbG9hZHNbZmlsZS5uYW1lXS5tZXNzYWdlID0gbWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5maWxlVXBsb2Fkc1tmaWxlLm5hbWVdLnByb2dyZXNzO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmZpbGVVcGxvYWRzW2ZpbGUubmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU3RvcmFnZSBwbHVnaW4gbm90IGZvdW5kJ1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoXHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlXHJcbiAgICApIHtcclxuXHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZm9ybWlvLWZpbGUtbGlzdC5odG1sJyxcclxuICAgICAgICBcIjx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtc3RyaXBlZCB0YWJsZS1ib3JkZXJlZFxcXCI+XFxyXFxuICA8dGhlYWQ+XFxyXFxuICAgIDx0cj5cXHJcXG4gICAgICA8dGQgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgc3R5bGU9XFxcIndpZHRoOjElO3doaXRlLXNwYWNlOm5vd3JhcDtcXFwiPjwvdGQ+XFxyXFxuICAgICAgPHRoPkZpbGUgTmFtZTwvdGg+XFxyXFxuICAgICAgPHRoPlNpemU8L3RoPlxcclxcbiAgICA8L3RyPlxcclxcbiAgPC90aGVhZD5cXHJcXG4gIDx0Ym9keT5cXHJcXG4gICAgPHRyIG5nLXJlcGVhdD1cXFwiZmlsZSBpbiBmaWxlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICAgIDx0ZCBuZy1pZj1cXFwiIXJlYWRPbmx5XFxcIiBzdHlsZT1cXFwid2lkdGg6MSU7d2hpdGUtc3BhY2U6bm93cmFwO1xcXCI+PGEgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgaHJlZj1cXFwiI1xcXCIgbmctY2xpY2s9XFxcInJlbW92ZUZpbGUoJGV2ZW50LCAkaW5kZXgpXFxcIiBzdHlsZT1cXFwicGFkZGluZzogMnB4IDRweDtcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXNtIGJ0bi1kZWZhdWx0XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiPjwvc3Bhbj48L2E+PC90ZD5cXHJcXG4gICAgICA8dGQ+PGZvcm1pby1maWxlIGZpbGU9XFxcImZpbGVcXFwiIGZvcm09XFxcImZvcm1cXFwiPjwvZm9ybWlvLWZpbGU+PC90ZD5cXHJcXG4gICAgICA8dGQ+e3sgZmlsZVNpemUoZmlsZS5zaXplKSB9fTwvdGQ+XFxyXFxuICAgIDwvdHI+XFxyXFxuICA8L3Rib2R5PlxcclxcbjwvdGFibGU+XFxyXFxuXCJcclxuICAgICAgKTtcclxuXHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvZmlsZS5odG1sJyxcclxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+XFxyXFxuPHNwYW4gbmctaWY9XFxcIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbjxkaXYgbmctY29udHJvbGxlcj1cXFwiZm9ybWlvRmlsZVVwbG9hZFxcXCI+XFxyXFxuICA8Zm9ybWlvLWZpbGUtbGlzdCBmaWxlcz1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgZm9ybT1cXFwiZm9ybWlvLmZvcm1VcmxcXFwiPjwvZm9ybWlvLWZpbGUtbGlzdD5cXHJcXG4gIDxkaXYgbmctaWY9XFxcIiFyZWFkT25seVxcXCI+XFxyXFxuICAgIDxkaXYgbmdmLWRyb3A9XFxcInVwbG9hZCgkZmlsZXMpXFxcIiBjbGFzcz1cXFwiZmlsZVNlbGVjdG9yXFxcIiBuZ2YtZHJhZy1vdmVyLWNsYXNzPVxcXCInZmlsZURyYWdPdmVyJ1xcXCIgbmdmLW11bHRpcGxlPVxcXCJjb21wb25lbnQubXVsdGlwbGVcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWNsb3VkLXVwbG9hZFxcXCI+PC9zcGFuPkRyb3AgZmlsZXMgdG8gYXR0YWNoLCBvciA8YSBocmVmPVxcXCIjXFxcIiBuZ2Ytc2VsZWN0PVxcXCJ1cGxvYWQoJGZpbGVzKVxcXCIgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIiBuZ2YtbXVsdGlwbGU9XFxcImNvbXBvbmVudC5tdWx0aXBsZVxcXCI+YnJvd3NlPC9hPi48L2Rpdj5cXHJcXG4gICAgPGRpdiBuZy1pZj1cXFwiIWNvbXBvbmVudC5zdG9yYWdlXFxcIiBjbGFzcz1cXFwiYWxlcnQgYWxlcnQtd2FybmluZ1xcXCI+Tm8gc3RvcmFnZSBoYXMgYmVlbiBzZXQgZm9yIHRoaXMgZmllbGQuIEZpbGUgdXBsb2FkcyBhcmUgZGlzYWJsZWQgdW50aWwgc3RvcmFnZSBpcyBzZXQgdXAuPC9kaXY+XFxyXFxuICAgIDxkaXYgbmdmLW5vLWZpbGUtZHJvcD5GaWxlIERyYWcvRHJvcCBpcyBub3Qgc3VwcG9ydGVkIGZvciB0aGlzIGJyb3dzZXI8L2Rpdj5cXHJcXG4gIDwvZGl2PlxcclxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImZpbGVVcGxvYWQgaW4gZmlsZVVwbG9hZHMgdHJhY2sgYnkgJGluZGV4XFxcIiBuZy1jbGFzcz1cXFwieydoYXMtZXJyb3InOiBmaWxlVXBsb2FkLnN0YXR1cyA9PT0gJ2Vycm9yJ31cXFwiIGNsYXNzPVxcXCJmaWxlXFxcIj5cXHJcXG4gICAgPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXHJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJmaWxlTmFtZSBjb250cm9sLWxhYmVsIGNvbC1zbS0xMFxcXCI+e3sgZmlsZVVwbG9hZC5uYW1lIH19IDxzcGFuIG5nLWNsaWNrPVxcXCJyZW1vdmVVcGxvYWQoZmlsZVVwbG9hZC5uYW1lKVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlXFxcIj48L3NwYW4+PC9kaXY+XFxyXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZmlsZVNpemUgY29udHJvbC1sYWJlbCBjb2wtc20tMiB0ZXh0LXJpZ2h0XFxcIj57eyBmaWxlU2l6ZShmaWxlVXBsb2FkLnNpemUpIH19PC9kaXY+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImNvbC1zbS0xMlxcXCI+XFxyXFxuICAgICAgICA8c3BhbiBuZy1pZj1cXFwiZmlsZVVwbG9hZC5zdGF0dXMgPT09ICdwcm9ncmVzcydcXFwiPlxcclxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJwcm9ncmVzc1xcXCI+XFxyXFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicHJvZ3Jlc3MtYmFyXFxcIiByb2xlPVxcXCJwcm9ncmVzc2JhclxcXCIgYXJpYS12YWx1ZW5vdz1cXFwie3tmaWxlVXBsb2FkLnByb2dyZXNzfX1cXFwiIGFyaWEtdmFsdWVtaW49XFxcIjBcXFwiIGFyaWEtdmFsdWVtYXg9XFxcIjEwMFxcXCIgc3R5bGU9XFxcIndpZHRoOnt7ZmlsZVVwbG9hZC5wcm9ncmVzc319JVxcXCI+XFxyXFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwic3Itb25seVxcXCI+e3tmaWxlVXBsb2FkLnByb2dyZXNzfX0lIENvbXBsZXRlPC9zcGFuPlxcclxcbiAgICAgICAgICAgIDwvZGl2PlxcclxcbiAgICAgICAgICA8L2Rpdj5cXHJcXG4gICAgICAgIDwvc3Bhbj5cXHJcXG4gICAgICAgIDxkaXYgbmctaWY9XFxcIiFmaWxlVXBsb2FkLnN0YXR1cyAhPT0gJ3Byb2dyZXNzJ1xcXCIgY2xhc3M9XFxcImJnLXt7IGZpbGVVcGxvYWQuc3RhdHVzIH19IGNvbnRyb2wtbGFiZWxcXFwiPnt7IGZpbGVVcGxvYWQubWVzc2FnZSB9fTwvZGl2PlxcclxcbiAgICAgIDwvZGl2PlxcclxcbiAgICA8L2Rpdj5cXHJcXG4gIDwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ2hpZGRlbicsIHtcclxuICAgICAgICB0aXRsZTogJ0hpZGRlbicsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9oaWRkZW4uaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAga2V5OiAnaGlkZGVuRmllbGQnLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9oaWRkZW4uaHRtbCcsXHJcbiAgICAgICAgXCI8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiPlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9IdG1sRWxlbWVudCcsIFtcclxuICAgICckc2FuaXRpemUnLFxyXG4gICAgZnVuY3Rpb24oJHNhbml0aXplKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgY29tcG9uZW50OiAnPSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQtZGlyZWN0aXZlLmh0bWwnLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xyXG4gICAgICAgICAgdmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoXHJcbiAgICAgICAgICAgICAgJzwnICsgJHNjb3BlLmNvbXBvbmVudC50YWcgKyAnPicgKyAnPC8nICsgJHNjb3BlLmNvbXBvbmVudC50YWcgKyAnPidcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgkc2NvcGUuY29tcG9uZW50LmNvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdjbGFzcycsICRzY29wZS5jb21wb25lbnQuY2xhc3NOYW1lKTtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21wb25lbnQuYXR0cnMsIGZ1bmN0aW9uKGF0dHIpIHtcclxuICAgICAgICAgICAgICBpZiAoIWF0dHIuYXR0cikgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihhdHRyLmF0dHIsIGF0dHIudmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmh0bWwgPSAkc2FuaXRpemUoZWxlbWVudC5wcm9wKCdvdXRlckhUTUwnKSk7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLnBhcnNlRXJyb3IgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAvLyBJc29sYXRlIHRoZSBtZXNzYWdlIGFuZCBzdG9yZSBpdC5cclxuICAgICAgICAgICAgICAkc2NvcGUucGFyc2VFcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgLnNwbGl0KCdcXG4nKVswXVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKCdbJHNhbml0aXplOmJhZHBhcnNlXScsICcnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY3JlYXRlRWxlbWVudCgpO1xyXG5cclxuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NvbXBvbmVudCcsIGNyZWF0ZUVsZW1lbnQsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICB9XSk7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcignaHRtbGVsZW1lbnQnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdIVE1MIEVsZW1lbnQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuaHRtbCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiBmYWxzZSxcclxuICAgICAgICAgIHRhZzogJ3AnLFxyXG4gICAgICAgICAgYXR0cnM6IFtdLFxyXG4gICAgICAgICAgY2xhc3NOYW1lOiAnJyxcclxuICAgICAgICAgIGNvbnRlbnQ6ICcnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQuaHRtbCcsXHJcbiAgICAgICAgJzxmb3JtaW8taHRtbC1lbGVtZW50IGNvbXBvbmVudD1cImNvbXBvbmVudFwiPjwvZGl2PidcclxuICAgICAgKTtcclxuXHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvaHRtbGVsZW1lbnQtZGlyZWN0aXZlLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCI+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJhbGVydCBhbGVydC13YXJuaW5nXFxcIiBuZy1pZj1cXFwicGFyc2VFcnJvclxcXCI+e3sgcGFyc2VFcnJvciB9fTwvZGl2PlxcclxcbiAgPGRpdiBuZy1iaW5kLWh0bWw9XFxcImh0bWxcXFwiPjwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmb3JtaW8nKTtcclxuXHJcbi8vIEJhc2ljXHJcbnJlcXVpcmUoJy4vY29tcG9uZW50cycpKGFwcCk7XHJcbnJlcXVpcmUoJy4vdGV4dGZpZWxkJykoYXBwKTtcclxucmVxdWlyZSgnLi9udW1iZXInKShhcHApO1xyXG5yZXF1aXJlKCcuL3Bhc3N3b3JkJykoYXBwKTtcclxucmVxdWlyZSgnLi90ZXh0YXJlYScpKGFwcCk7XHJcbnJlcXVpcmUoJy4vY2hlY2tib3gnKShhcHApO1xyXG5yZXF1aXJlKCcuL3NlbGVjdGJveGVzJykoYXBwKTtcclxucmVxdWlyZSgnLi9zZWxlY3QnKShhcHApO1xyXG5yZXF1aXJlKCcuL3JhZGlvJykoYXBwKTtcclxucmVxdWlyZSgnLi9odG1sZWxlbWVudCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vY29udGVudCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vYnV0dG9uJykoYXBwKTtcclxuXHJcbi8vIFNwZWNpYWxcclxucmVxdWlyZSgnLi9lbWFpbCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcGhvbmVudW1iZXInKShhcHApO1xyXG5yZXF1aXJlKCcuL2FkZHJlc3MnKShhcHApO1xyXG5yZXF1aXJlKCcuL2RhdGV0aW1lJykoYXBwKTtcclxucmVxdWlyZSgnLi9oaWRkZW4nKShhcHApO1xyXG5yZXF1aXJlKCcuL3Jlc291cmNlJykoYXBwKTtcclxucmVxdWlyZSgnLi9maWxlJykoYXBwKTtcclxucmVxdWlyZSgnLi9zaWduYXR1cmUnKShhcHApO1xyXG5yZXF1aXJlKCcuL2N1c3RvbScpKGFwcCk7XHJcblxyXG4vLyBMYXlvdXRcclxucmVxdWlyZSgnLi9jb2x1bW5zJykoYXBwKTtcclxucmVxdWlyZSgnLi9maWVsZHNldCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vY29udGFpbmVyJykoYXBwKTtcclxucmVxdWlyZSgnLi9kYXRhZ3JpZCcpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcGFnZScpKGFwcCk7XHJcbnJlcXVpcmUoJy4vcGFuZWwnKShhcHApO1xyXG5yZXF1aXJlKCcuL3RhYmxlJykoYXBwKTtcclxucmVxdWlyZSgnLi93ZWxsJykoYXBwKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ251bWJlcicsIHtcclxuICAgICAgICB0aXRsZTogJ051bWJlcicsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9udW1iZXIuaHRtbCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgaW5wdXRUeXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ251bWJlckZpZWxkJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIHByZWZpeDogJycsXHJcbiAgICAgICAgICBzdWZmaXg6ICcnLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAwLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIG1pbjogJycsXHJcbiAgICAgICAgICAgIG1heDogJycsXHJcbiAgICAgICAgICAgIHN0ZXA6ICdhbnknLFxyXG4gICAgICAgICAgICBpbnRlZ2VyOiAnJyxcclxuICAgICAgICAgICAgbXVsdGlwbGU6ICcnLFxyXG4gICAgICAgICAgICBjdXN0b206ICcnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlLCBGb3JtaW9VdGlscykge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL251bWJlci5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxyXG4gICAgICAgIFwiPGlucHV0IHR5cGU9XFxcInt7IGNvbXBvbmVudC5pbnB1dFR5cGUgfX1cXFwiXFxyXFxuY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXHJcXG5pZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG5uYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbnRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG5uZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXHJcXG5uZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIlxcclxcbm5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXHJcXG5zYWZlLW11bHRpcGxlLXRvLXNpbmdsZVxcclxcbm1pbj1cXFwie3sgY29tcG9uZW50LnZhbGlkYXRlLm1pbiB9fVxcXCJcXHJcXG5tYXg9XFxcInt7IGNvbXBvbmVudC52YWxpZGF0ZS5tYXggfX1cXFwiXFxyXFxuc3RlcD1cXFwie3sgY29tcG9uZW50LnZhbGlkYXRlLnN0ZXAgfX1cXFwiXFxyXFxucGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVxcXCJcXHJcXG5jdXN0b20tdmFsaWRhdG9yPVxcXCJjb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXFxcIlxcclxcbnVpLW1hc2s9XFxcInt7IGNvbXBvbmVudC5pbnB1dE1hc2sgfX1cXFwiXFxyXFxudWktbWFzay1wbGFjZWhvbGRlcj1cXFwiXFxcIlxcclxcbnVpLW9wdGlvbnM9XFxcInVpTWFza09wdGlvbnNcXFwiXFxyXFxuPlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYWdlJywge1xyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvcGFnZS5odG1sJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgY29tcG9uZW50czogW11cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3BhZ2UuaHRtbCcsXHJcbiAgICAgICAgXCI8Zm9ybWlvLWNvbXBvbmVudCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBjb21wb25lbnQuY29tcG9uZW50c1xcXCIgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiIGRhdGE9XFxcImRhdGFcXFwiIGZvcm1pbz1cXFwiZm9ybWlvXFxcIj48L2Zvcm1pby1jb21wb25lbnQ+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XHJcblxyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncGFuZWwnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdQYW5lbCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9wYW5lbC5odG1sJyxcclxuICAgICAgICBncm91cDogJ2xheW91dCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiBmYWxzZSxcclxuICAgICAgICAgIHRpdGxlOiAnJyxcclxuICAgICAgICAgIHRoZW1lOiAnZGVmYXVsdCcsXHJcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcGFuZWwuaHRtbCcsXHJcbiAgICAgICAgXCI8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC17eyBjb21wb25lbnQudGhlbWUgfX1cXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXHJcXG4gIDxkaXYgbmctaWY9XFxcImNvbXBvbmVudC50aXRsZVxcXCIgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcclxcbiAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyBjb21wb25lbnQudGl0bGUgfX08L2gzPlxcclxcbiAgPC9kaXY+XFxyXFxuICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXHJcXG4gICAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29tcG9uZW50LmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwYXNzd29yZCcsIHtcclxuICAgICAgICB0aXRsZTogJ1Bhc3N3b3JkJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJyxcclxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiAnLS0tIFBST1RFQ1RFRCAtLS0nO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiBmYWxzZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ3Bhc3N3b3JkJyxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ3Bhc3N3b3JkRmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgcHJlZml4OiAnJyxcclxuICAgICAgICAgIHN1ZmZpeDogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IHRydWUsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdwaG9uZU51bWJlcicsIHtcclxuICAgICAgICB0aXRsZTogJ1Bob25lIE51bWJlcicsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgaW5wdXRNYXNrOiAnKDk5OSkgOTk5LTk5OTknLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAncGhvbmVudW1iZXJGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBwcmVmaXg6ICcnLFxyXG4gICAgICAgICAgc3VmZml4OiAnJyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24oZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyKSB7XHJcbiAgICAgIGZvcm1pb0NvbXBvbmVudHNQcm92aWRlci5yZWdpc3RlcigncmFkaW8nLCB7XHJcbiAgICAgICAgdGl0bGU6ICdSYWRpbycsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy9yYWRpby5odG1sJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBpbnB1dFR5cGU6ICdyYWRpbycsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdyYWRpb0ZpZWxkJyxcclxuICAgICAgICAgIHZhbHVlczogW10sXHJcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6ICcnLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGN1c3RvbTogJycsXHJcbiAgICAgICAgICAgIGN1c3RvbVByaXZhdGU6IGZhbHNlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuICBhcHAucnVuKFtcclxuICAgICckdGVtcGxhdGVDYWNoZScsXHJcbiAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUsIEZvcm1pb1V0aWxzKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcmFkaW8uaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcclxuICAgICAgICBcIjxkaXYgbmctY2xhc3M9XFxcImNvbXBvbmVudC5pbmxpbmUgPyAncmFkaW8taW5saW5lJyA6ICdyYWRpbydcXFwiIG5nLXJlcGVhdD1cXFwidiBpbiBjb21wb25lbnQudmFsdWVzIHRyYWNrIGJ5ICRpbmRleFxcXCI+XFxyXFxuICA8bGFiZWwgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIGZvcj1cXFwie3sgdi52YWx1ZSB9fVxcXCI+XFxyXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcclxcbiAgICBpZD1cXFwie3sgdi52YWx1ZSB9fVxcXCJcXHJcXG4gICAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gICAgdmFsdWU9XFxcInt7IHYudmFsdWUgfX1cXFwiXFxyXFxuICAgIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG4gICAgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiXFxyXFxuICAgIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiXFxyXFxuICAgIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXHJcXG4gICAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCI+XFxyXFxuICAgIHt7IHYubGFiZWwgfX1cXHJcXG4gIDwvbGFiZWw+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3Jlc291cmNlJywge1xyXG4gICAgICAgIHRpdGxlOiAnUmVzb3VyY2UnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24gKGRhdGEsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKSB7XHJcbiAgICAgICAgICBpZiAoJGludGVycG9sYXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaW50ZXJwb2xhdGUoY29tcG9uZW50LnRlbXBsYXRlKSh7aXRlbTogZGF0YX0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHJldHVybiBkYXRhID8gZGF0YS5faWQgOiAnJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbiAoJHNjb3BlKSB7XHJcbiAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSA/ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS1tdWx0aXBsZS5odG1sJyA6ICdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS5odG1sJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsIGZ1bmN0aW9uICgkc2NvcGUsIEZvcm1pbykge1xyXG4gICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcclxuICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm11bHRpcGxlKSB7XHJcbiAgICAgICAgICAgIHNldHRpbmdzLmRlZmF1bHRWYWx1ZSA9IFtdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHNldHRpbmdzLnJlc291cmNlKSB7XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSAnJztcclxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLnByb2plY3QpIHtcclxuICAgICAgICAgICAgICB1cmwgKz0gJy9wcm9qZWN0LycgKyBzZXR0aW5ncy5wcm9qZWN0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5mb3JtaW8gJiYgJHNjb3BlLmZvcm1pby5wcm9qZWN0VXJsKSB7XHJcbiAgICAgICAgICAgICAgdXJsICs9ICRzY29wZS5mb3JtaW8ucHJvamVjdFVybDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1cmwgKz0gJy9mb3JtLycgKyBzZXR0aW5ncy5yZXNvdXJjZTtcclxuICAgICAgICAgICAgdmFyIGZvcm1pbyA9IG5ldyBGb3JtaW8odXJsKTtcclxuICAgICAgICAgICAgJHNjb3BlLnJlZnJlc2hTdWJtaXNzaW9ucyA9IGZ1bmN0aW9uIChpbnB1dCkge1xyXG4gICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBzZXR0aW5ncy5wYXJhbXMgfHwge307XHJcbiAgICAgICAgICAgICAgLy8gSWYgdGhleSB3aXNoIHRvIHJldHVybiBvbmx5IHNvbWUgZmllbGRzLlxyXG4gICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWxlY3RGaWVsZHMpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtcy5zZWxlY3QgPSBzZXR0aW5ncy5zZWxlY3RGaWVsZHM7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWFyY2hGaWVsZHMgJiYgaW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZXR0aW5ncy5zZWFyY2hGaWVsZHMsIGZ1bmN0aW9uIChmaWVsZCkge1xyXG4gICAgICAgICAgICAgICAgICBwYXJhbXNbZmllbGRdID0gaW5wdXQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgLy8gTG9hZCB0aGUgc3VibWlzc2lvbnMuXHJcbiAgICAgICAgICAgICAgZm9ybWlvLmxvYWRTdWJtaXNzaW9ucyh7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xyXG4gICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHN1Ym1pc3Npb25zKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0SXRlbXMgPSBzdWJtaXNzaW9ucyB8fCBbXTtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS5yZWZyZXNoU3VibWlzc2lvbnMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XSxcclxuICAgICAgICBncm91cDogJ2FkdmFuY2VkJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICdyZXNvdXJjZUZpZWxkJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIHJlc291cmNlOiAnJyxcclxuICAgICAgICAgIHByb2plY3Q6ICcnLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiAnJyxcclxuICAgICAgICAgIHRlbXBsYXRlOiAnPHNwYW4+e3sgaXRlbS5kYXRhIH19PC9zcGFuPicsXHJcbiAgICAgICAgICBzZWxlY3RGaWVsZHM6ICcnLFxyXG4gICAgICAgICAgc2VhcmNoRmllbGRzOiAnJyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxyXG4gICAgICAgICAgdmFsaWRhdGU6IHtcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZGVmYXVsdFBlcm1pc3Npb246ICcnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvcmVzb3VyY2UuaHRtbCcsXHJcbiAgICAgICAgXCI8bGFiZWwgbmctaWY9XFxcImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFxcXCIgZm9yPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBjbGFzcz1cXFwiY29udHJvbC1sYWJlbFxcXCIgbmctY2xhc3M9XFxcInsnZmllbGQtcmVxdWlyZWQnOiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWR9XFxcIj57eyBjb21wb25lbnQubGFiZWwgfX08L2xhYmVsPlxcclxcbjxzcGFuIG5nLWlmPVxcXCIhY29tcG9uZW50LmxhYmVsICYmIGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG48dWktc2VsZWN0IHVpLXNlbGVjdC1yZXF1aXJlZCBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSB1aS1zZWxlY3Qtb3Blbi1vbi1mb2N1cyBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCIgbmctZGlzYWJsZWQ9XFxcInJlYWRPbmx5XFxcIiBuZy1yZXF1aXJlZD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgdGhlbWU9XFxcImJvb3RzdHJhcFxcXCIgdGFiaW5kZXg9XFxcInt7IGNvbXBvbmVudC50YWJpbmRleCB8fCAwIH19XFxcIj5cXHJcXG4gIDx1aS1zZWxlY3QtbWF0Y2ggY2xhc3M9XFxcInVpLXNlbGVjdC1tYXRjaFxcXCIgcGxhY2Vob2xkZXI9XFxcInt7IGNvbXBvbmVudC5wbGFjZWhvbGRlciB9fVxcXCI+XFxyXFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiJGl0ZW0gfHwgJHNlbGVjdC5zZWxlY3RlZFxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXHJcXG4gIDwvdWktc2VsZWN0LW1hdGNoPlxcclxcbiAgPHVpLXNlbGVjdC1jaG9pY2VzIGNsYXNzPVxcXCJ1aS1zZWxlY3QtY2hvaWNlc1xcXCIgcmVwZWF0PVxcXCJpdGVtIGluIHNlbGVjdEl0ZW1zIHwgZmlsdGVyOiAkc2VsZWN0LnNlYXJjaFxcXCIgcmVmcmVzaD1cXFwicmVmcmVzaFN1Ym1pc3Npb25zKCRzZWxlY3Quc2VhcmNoKVxcXCIgcmVmcmVzaC1kZWxheT1cXFwiMjUwXFxcIj5cXHJcXG4gICAgPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cXFwiY29tcG9uZW50LnRlbXBsYXRlXFxcIiBpdGVtPVxcXCJpdGVtXFxcIiBzZWxlY3Q9XFxcIiRzZWxlY3RcXFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPlxcclxcbiAgPC91aS1zZWxlY3QtY2hvaWNlcz5cXHJcXG48L3VpLXNlbGVjdD5cXHJcXG48Zm9ybWlvLWVycm9ycz48L2Zvcm1pby1lcnJvcnM+XFxyXFxuXCJcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIENoYW5nZSB0aGUgdWktc2VsZWN0IHRvIHVpLXNlbGVjdCBtdWx0aXBsZS5cclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9yZXNvdXJjZS1tdWx0aXBsZS5odG1sJyxcclxuICAgICAgICAkdGVtcGxhdGVDYWNoZS5nZXQoJ2Zvcm1pby9jb21wb25lbnRzL3Jlc291cmNlLmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmRpcmVjdGl2ZSgnZm9ybWlvU2VsZWN0SXRlbScsIFtcclxuICAgICckY29tcGlsZScsXHJcbiAgICBmdW5jdGlvbiAoJGNvbXBpbGUpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICB0ZW1wbGF0ZTogJz0nLFxyXG4gICAgICAgICAgaXRlbTogJz0nLFxyXG4gICAgICAgICAgc2VsZWN0OiAnPSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLnRlbXBsYXRlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgkY29tcGlsZShhbmd1bGFyLmVsZW1lbnQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLmRpcmVjdGl2ZSgndWlTZWxlY3RSZXF1aXJlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIHZhciBvbGRJc0VtcHR5ID0gbmdNb2RlbC4kaXNFbXB0eTtcclxuICAgICAgICBuZ01vZGVsLiRpc0VtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICByZXR1cm4gKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkgfHwgb2xkSXNFbXB0eSh2YWx1ZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KTtcclxuXHJcbiAgLy8gQSBoYWNrIHRvIGhhdmUgdWktc2VsZWN0IG9wZW4gb24gZm9jdXNcclxuICBhcHAuZGlyZWN0aXZlKCd1aVNlbGVjdE9wZW5PbkZvY3VzJywgWyckdGltZW91dCcsIGZ1bmN0aW9uICgkdGltZW91dCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVxdWlyZTogJ3VpU2VsZWN0JyxcclxuICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZSwgZWwsIGF0dHJzLCB1aVNlbGVjdCkge1xyXG4gICAgICAgIHZhciBjbG9zaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCh1aVNlbGVjdC5mb2N1c3Nlcikub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCFjbG9zaW5nKSB7XHJcbiAgICAgICAgICAgIHVpU2VsZWN0LmFjdGl2YXRlKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEJlY2F1c2UgdWktc2VsZWN0IGltbWVkaWF0ZWx5IGZvY3VzZXMgdGhlIGZvY3Vzc2VyIGFmdGVyIGNsb3NpbmdcclxuICAgICAgICAvLyB3ZSBuZWVkIHRvIG5vdCByZS1hY3RpdmF0ZSBhZnRlciBjbG9zaW5nXHJcbiAgICAgICAgJHNjb3BlLiRvbigndWlzOmNsb3NlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgY2xvc2luZyA9IHRydWU7XHJcbiAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7IC8vIEknbSBzbyBzb3JyeVxyXG4gICAgICAgICAgICBjbG9zaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XSk7XHJcblxyXG4gIC8vIENvbmZpZ3VyZSB0aGUgU2VsZWN0IGNvbXBvbmVudC5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NlbGVjdCcsIHtcclxuICAgICAgICB0aXRsZTogJ1NlbGVjdCcsXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uICgkc2NvcGUpIHtcclxuICAgICAgICAgIHJldHVybiAkc2NvcGUuY29tcG9uZW50Lm11bHRpcGxlID8gJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdC1tdWx0aXBsZS5odG1sJyA6ICdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3QuaHRtbCc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB0YWJsZVZpZXc6IGZ1bmN0aW9uKGRhdGEsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKSB7XHJcbiAgICAgICAgICB2YXIgZ2V0SXRlbSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChjb21wb25lbnQuZGF0YVNyYykge1xyXG4gICAgICAgICAgICAgIGNhc2UgJ3ZhbHVlcyc6XHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuZGF0YS52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnZhbHVlID09PSBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgICAgICAgY2FzZSAnanNvbic6XHJcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlUHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdEl0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbihjb21wb25lbnQuZGF0YS5qc29uKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtW2NvbXBvbmVudC52YWx1ZVByb3BlcnR5XSA9PT0gZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICAgIC8vIFRPRE86IGltcGxlbWVudCB1cmwgYW5kIHJlc291cmNlIHZpZXcuXHJcbiAgICAgICAgICAgICAgY2FzZSAndXJsJzpcclxuICAgICAgICAgICAgICBjYXNlICdyZXNvdXJjZSc6XHJcbiAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgaWYgKGNvbXBvbmVudC5tdWx0aXBsZSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhLm1hcChnZXRJdGVtKS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgaXRlbSkge1xyXG4gICAgICAgICAgICAgIHZhciB2YWx1ZTtcclxuICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICRpbnRlcnBvbGF0ZShjb21wb25lbnQudGVtcGxhdGUpKHtpdGVtOiBpdGVtfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBpdGVtO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICByZXR1cm4gKHByZXYgPT09ICcnID8gJycgOiAnLCAnKSArIHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IGdldEl0ZW0oZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHZhbHVlID0gJGludGVycG9sYXRlKGNvbXBvbmVudC50ZW1wbGF0ZSkoe2l0ZW06IGl0ZW19KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJGh0dHAnLCAnRm9ybWlvJywgJyRpbnRlcnBvbGF0ZScsIGZ1bmN0aW9uICgkc2NvcGUsICRodHRwLCBGb3JtaW8sICRpbnRlcnBvbGF0ZSkge1xyXG4gICAgICAgICAgdmFyIHNldHRpbmdzID0gJHNjb3BlLmNvbXBvbmVudDtcclxuICAgICAgICAgICRzY29wZS5ub3dyYXAgPSB0cnVlO1xyXG4gICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XHJcbiAgICAgICAgICB2YXIgdmFsdWVQcm9wID0gJHNjb3BlLmNvbXBvbmVudC52YWx1ZVByb3BlcnR5O1xyXG4gICAgICAgICAgJHNjb3BlLmdldFNlbGVjdEl0ZW0gPSBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhdGFTcmMgPT09ICd2YWx1ZXMnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFsbG93IGRvdCBub3RhdGlvbiBpbiB0aGUgdmFsdWUgcHJvcGVydHkuXHJcbiAgICAgICAgICAgIGlmICh2YWx1ZVByb3AuaW5kZXhPZignLicpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgIHZhciBwYXJ0cyA9IHZhbHVlUHJvcC5zcGxpdCgnLicpO1xyXG4gICAgICAgICAgICAgIHZhciBwcm9wID0gaXRlbTtcclxuICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHBhcnRzKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwYXJ0c1tpXV07XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVQcm9wID8gaXRlbVt2YWx1ZVByb3BdIDogaXRlbTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm11bHRpcGxlKSB7XHJcbiAgICAgICAgICAgIHNldHRpbmdzLmRlZmF1bHRWYWx1ZSA9IFtdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMgPSBhbmd1bGFyLm5vb3A7XHJcbiAgICAgICAgICAkc2NvcGUuJG9uKCdyZWZyZXNoTGlzdCcsIGZ1bmN0aW9uKGV2ZW50LCB1cmwsIGlucHV0KSB7XHJcbiAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMoaW5wdXQsIHVybCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBBZGQgYSB3YXRjaCBpZiB0aGV5IHdpc2ggdG8gcmVmcmVzaCBvbiBzZWxlY3Rpb24gb2YgYW5vdGhlciBmaWVsZC5cclxuICAgICAgICAgIGlmIChzZXR0aW5ncy5yZWZyZXNoT24pIHtcclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnZGF0YS4nICsgc2V0dGluZ3MucmVmcmVzaE9uLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUucmVmcmVzaEl0ZW1zKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHN3aXRjaCAoc2V0dGluZ3MuZGF0YVNyYykge1xyXG4gICAgICAgICAgICBjYXNlICd2YWx1ZXMnOlxyXG4gICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IHNldHRpbmdzLmRhdGEudmFsdWVzO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdqc29uJzpcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gYW5ndWxhci5mcm9tSnNvbihzZXR0aW5ncy5kYXRhLmpzb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAndXJsJzpcclxuICAgICAgICAgICAgY2FzZSAncmVzb3VyY2UnOlxyXG4gICAgICAgICAgICAgIHZhciB1cmwgPSAnJztcclxuICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtjYWNoZTogdHJ1ZX07XHJcbiAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmRhdGFTcmMgPT09ICd1cmwnKSB7XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBzZXR0aW5ncy5kYXRhLnVybDtcclxuICAgICAgICAgICAgICAgIGlmICh1cmwuc3Vic3RyKDAsIDEpID09PSAnLycpIHtcclxuICAgICAgICAgICAgICAgICAgdXJsID0gRm9ybWlvLmdldEJhc2VVcmwoKSArIHNldHRpbmdzLmRhdGEudXJsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgYXV0aCBmb3Igb3V0Z29pbmcgcmVxdWVzdHMuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXNldHRpbmdzLmF1dGhlbnRpY2F0ZSAmJiB1cmwuaW5kZXhPZihGb3JtaW8uZ2V0QmFzZVVybCgpKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlSldUOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICAgIFByYWdtYTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdXJsID0gRm9ybWlvLmdldEJhc2VVcmwoKTtcclxuICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5kYXRhLnByb2plY3QpIHtcclxuICAgICAgICAgICAgICAgICAgdXJsICs9ICcvcHJvamVjdC8nICsgc2V0dGluZ3MuZGF0YS5wcm9qZWN0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdXJsICs9ICcvZm9ybS8nICsgc2V0dGluZ3MuZGF0YS5yZXNvdXJjZSArICcvc3VibWlzc2lvbj9saW1pdD0xMDAwJztcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmICh1cmwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMgPSBmdW5jdGlvbihpbnB1dCwgbmV3VXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgIG5ld1VybCA9IG5ld1VybCB8fCB1cmw7XHJcbiAgICAgICAgICAgICAgICAgIGlmICghbmV3VXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2VhcmNoLCB0aGVuIGFkZCB0aGF0IHRvIHRoZSBmaWx0ZXIuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5zZWFyY2hGaWVsZCAmJiBpbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1VybCArPSAoKG5ld1VybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdzLnNlYXJjaEZpZWxkKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAnPScgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBvdGhlciBmaWx0ZXIuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5maWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZmlsdGVyID0gJGludGVycG9sYXRlKHNldHRpbmdzLmZpbHRlcikoe2RhdGE6ICRzY29wZS5kYXRhfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VXJsICs9ICgobmV3VXJsLmluZGV4T2YoJz8nKSA9PT0gLTEpID8gJz8nIDogJyYnKSArIGZpbHRlcjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgJGh0dHAuZ2V0KG5ld1VybCwgb3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gcmVzdWx0LmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5yZWZyZXNoSXRlbXMoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdEl0ZW1zID0gW107XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfV0sXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnc2VsZWN0RmllbGQnLFxyXG4gICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLFxyXG4gICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICB2YWx1ZXM6IFtdLFxyXG4gICAgICAgICAgICBqc29uOiAnJyxcclxuICAgICAgICAgICAgdXJsOiAnJyxcclxuICAgICAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZGF0YVNyYzogJ3ZhbHVlcycsXHJcbiAgICAgICAgICB2YWx1ZVByb3BlcnR5OiAnJyxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICByZWZyZXNoT246ICcnLFxyXG4gICAgICAgICAgZmlsdGVyOiAnJyxcclxuICAgICAgICAgIGF1dGhlbnRpY2F0ZTogZmFsc2UsXHJcbiAgICAgICAgICB0ZW1wbGF0ZTogJzxzcGFuPnt7IGl0ZW0ubGFiZWwgfX08L3NwYW4+JyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIHByb3RlY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Lmh0bWwnLFxyXG4gICAgICAgIFwiPGxhYmVsIG5nLWlmPVxcXCJjb21wb25lbnQubGFiZWwgJiYgIWNvbXBvbmVudC5oaWRlTGFiZWxcXFwiICBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+XFxyXFxuPHNwYW4gbmctaWY9XFxcIiFjb21wb25lbnQubGFiZWwgJiYgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hc3RlcmlzayBmb3JtLWNvbnRyb2wtZmVlZGJhY2sgZmllbGQtcmVxdWlyZWQtaW5saW5lXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcbjx1aS1zZWxlY3QgdWktc2VsZWN0LXJlcXVpcmVkIHVpLXNlbGVjdC1vcGVuLW9uLWZvY3VzIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIiBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZSBuYW1lPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIiB0aGVtZT1cXFwiYm9vdHN0cmFwXFxcIiB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiPlxcclxcbiAgPHVpLXNlbGVjdC1tYXRjaCBjbGFzcz1cXFwidWktc2VsZWN0LW1hdGNoXFxcIiBwbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIj5cXHJcXG4gICAgPGZvcm1pby1zZWxlY3QtaXRlbSB0ZW1wbGF0ZT1cXFwiY29tcG9uZW50LnRlbXBsYXRlXFxcIiBpdGVtPVxcXCIkaXRlbSB8fCAkc2VsZWN0LnNlbGVjdGVkXFxcIiBzZWxlY3Q9XFxcIiRzZWxlY3RcXFwiPjwvZm9ybWlvLXNlbGVjdC1pdGVtPlxcclxcbiAgPC91aS1zZWxlY3QtbWF0Y2g+XFxyXFxuICA8dWktc2VsZWN0LWNob2ljZXMgY2xhc3M9XFxcInVpLXNlbGVjdC1jaG9pY2VzXFxcIiByZXBlYXQ9XFxcImdldFNlbGVjdEl0ZW0oaXRlbSkgYXMgaXRlbSBpbiBzZWxlY3RJdGVtcyB8IGZpbHRlcjogJHNlbGVjdC5zZWFyY2hcXFwiIHJlZnJlc2g9XFxcInJlZnJlc2hJdGVtcygkc2VsZWN0LnNlYXJjaClcXFwiIHJlZnJlc2gtZGVsYXk9XFxcIjI1MFxcXCI+XFxyXFxuICAgIDxmb3JtaW8tc2VsZWN0LWl0ZW0gdGVtcGxhdGU9XFxcImNvbXBvbmVudC50ZW1wbGF0ZVxcXCIgaXRlbT1cXFwiaXRlbVxcXCIgc2VsZWN0PVxcXCIkc2VsZWN0XFxcIj48L2Zvcm1pby1zZWxlY3QtaXRlbT5cXHJcXG4gIDwvdWktc2VsZWN0LWNob2ljZXM+XFxyXFxuPC91aS1zZWxlY3Q+XFxyXFxuPGZvcm1pby1lcnJvcnM+PC9mb3JtaW8tZXJyb3JzPlxcclxcblwiXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBDaGFuZ2UgdGhlIHVpLXNlbGVjdCB0byB1aS1zZWxlY3QgbXVsdGlwbGUuXHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0LW11bHRpcGxlLmh0bWwnLFxyXG4gICAgICAgICR0ZW1wbGF0ZUNhY2hlLmdldCgnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Lmh0bWwnKS5yZXBsYWNlKCc8dWktc2VsZWN0JywgJzx1aS1zZWxlY3QgbXVsdGlwbGUnKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcclxuICBhcHAuZGlyZWN0aXZlKCdmb3JtaW9TZWxlY3RCb3hlcycsIFtmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBjb21wb25lbnQ6ICc9JyxcclxuICAgICAgICByZWFkT25seTogJz0nLFxyXG4gICAgICAgIG1vZGVsOiAnPW5nTW9kZWwnXHJcbiAgICAgIH0sXHJcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvL2NvbXBvbmVudHMvc2VsZWN0Ym94ZXMtZGlyZWN0aXZlLmh0bWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUsIGVsLCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIC8vIEluaXRpYWxpemUgbW9kZWxcclxuICAgICAgICB2YXIgbW9kZWwgPSB7fTtcclxuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudC52YWx1ZXMsIGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgIG1vZGVsW3YudmFsdWVdID0gISFuZ01vZGVsLiR2aWV3VmFsdWVbdi52YWx1ZV07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG1vZGVsKTtcclxuICAgICAgICBuZ01vZGVsLiRzZXRQcmlzdGluZSh0cnVlKTtcclxuXHJcbiAgICAgICAgbmdNb2RlbC4kaXNFbXB0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModmFsdWUpLmV2ZXJ5KGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgICAgICByZXR1cm4gIXZhbHVlW2tleV07XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUudG9nZ2xlQ2hlY2tib3ggPSBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICAgICAgdmFyIG1vZGVsID0gYW5ndWxhci5jb3B5KG5nTW9kZWwuJHZpZXdWYWx1ZSk7XHJcbiAgICAgICAgICBtb2RlbFt2YWx1ZV0gPSAhbW9kZWxbdmFsdWVdO1xyXG4gICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG1vZGVsKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3NlbGVjdGJveGVzJywge1xyXG4gICAgICAgIHRpdGxlOiAnU2VsZWN0IEJveGVzJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLmh0bWwnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpXHJcbiAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YVtrZXldO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5qb2luKCcsICcpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnc2VsZWN0Ym94ZXNGaWVsZCcsXHJcbiAgICAgICAgICB2YWx1ZXM6IFtdLFxyXG4gICAgICAgICAgZGVmYXVsdFZhbHVlOiB7fSxcclxuICAgICAgICAgIGlubGluZTogZmFsc2UsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcblxyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3NlbGVjdGJveGVzLWRpcmVjdGl2ZS5odG1sJyxcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcInNlbGVjdC1ib3hlc1xcXCI+XFxyXFxuICA8ZGl2IG5nLWNsYXNzPVxcXCJjb21wb25lbnQuaW5saW5lID8gJ2NoZWNrYm94LWlubGluZScgOiAnY2hlY2tib3gnXFxcIiBuZy1yZXBlYXQ9XFxcInYgaW4gY29tcG9uZW50LnZhbHVlcyB0cmFjayBieSAkaW5kZXhcXFwiPlxcclxcbiAgICA8bGFiZWwgY2xhc3M9XFxcImNvbnRyb2wtbGFiZWxcXFwiIGZvcj1cXFwie3sgY29tcG9uZW50LmtleSB9fS17eyB2LnZhbHVlIH19XFxcIj5cXHJcXG4gICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiXFxyXFxuICAgICAgICBpZD1cXFwie3sgY29tcG9uZW50LmtleSB9fS17eyB2LnZhbHVlIH19XFxcIlxcclxcbiAgICAgICAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fS17eyB2LnZhbHVlIH19XFxcIlxcclxcbiAgICAgICAgdmFsdWU9XFxcInt7IHYudmFsdWUgfX1cXFwiXFxyXFxuICAgICAgICB0YWJpbmRleD1cXFwie3sgY29tcG9uZW50LnRhYmluZGV4IHx8IDAgfX1cXFwiXFxyXFxuICAgICAgICBuZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxyXFxuICAgICAgICBuZy1jbGljaz1cXFwidG9nZ2xlQ2hlY2tib3godi52YWx1ZSlcXFwiXFxyXFxuICAgICAgICBuZy1jaGVja2VkPVxcXCJtb2RlbFt2LnZhbHVlXVxcXCJcXHJcXG4gICAgICA+XFxyXFxuICAgICAge3sgdi5sYWJlbCB9fVxcclxcbiAgICA8L2xhYmVsPlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICAgKTtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zZWxlY3Rib3hlcy5odG1sJyxcclxuICAgICAgICBcIjxsYWJlbCBuZy1pZj1cXFwiY29tcG9uZW50LmxhYmVsICYmICFjb21wb25lbnQuaGlkZUxhYmVsXFxcIiBmb3I9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiIGNsYXNzPVxcXCJjb250cm9sLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwieydmaWVsZC1yZXF1aXJlZCc6IGNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZH1cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+XFxyXFxuPGZvcm1pby1zZWxlY3QtYm94ZXNcXHJcXG4gIG5hbWU9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiXFxyXFxuICBuZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXHJcXG4gIG5nLW1vZGVsLW9wdGlvbnM9XFxcInthbGxvd0ludmFsaWQ6IHRydWV9XFxcIlxcclxcbiAgY29tcG9uZW50PVxcXCJjb21wb25lbnRcXFwiXFxyXFxuICByZWFkLW9ubHk9XFxcInJlYWRPbmx5XFxcIlxcclxcbiAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXHJcXG4gIGN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxyXFxuICA+PC9mb3JtaW8tc2VsZWN0LWJveGVzPlxcclxcbjxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCdzaWduYXR1cmUnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdTaWduYXR1cmUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnZm9ybWlvL2NvbXBvbmVudHMvc2lnbmF0dXJlLmh0bWwnLFxyXG4gICAgICAgIHRhYmxlVmlldzogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgIHJldHVybiBkYXRhID8gJ1llcycgOiAnTm8nO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ3JvdXA6ICdhZHZhbmNlZCcsXHJcbiAgICAgICAgc2V0dGluZ3M6IHtcclxuICAgICAgICAgIGlucHV0OiB0cnVlLFxyXG4gICAgICAgICAgdGFibGVWaWV3OiB0cnVlLFxyXG4gICAgICAgICAgbGFiZWw6ICcnLFxyXG4gICAgICAgICAga2V5OiAnc2lnbmF0dXJlJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIGZvb3RlcjogJ1NpZ24gYWJvdmUnLFxyXG4gICAgICAgICAgd2lkdGg6ICcxMDAlJyxcclxuICAgICAgICAgIGhlaWdodDogJzE1MCcsXHJcbiAgICAgICAgICBwZW5Db2xvcjogJ2JsYWNrJyxcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYigyNDUsMjQ1LDIzNSknLFxyXG4gICAgICAgICAgbWluV2lkdGg6ICcwLjUnLFxyXG4gICAgICAgICAgbWF4V2lkdGg6ICcyLjUnLFxyXG4gICAgICAgICAgcHJvdGVjdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5kaXJlY3RpdmUoJ3NpZ25hdHVyZScsIGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgY29tcG9uZW50OiAnPSdcclxuICAgICAgfSxcclxuICAgICAgcmVxdWlyZTogJz9uZ01vZGVsJyxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIGlmICghbmdNb2RlbCkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0cyB0aGUgbGFiZWwgb2YgY29tcG9uZW50IGZvciBlcnJvciBkaXNwbGF5LlxyXG4gICAgICAgIHNjb3BlLmNvbXBvbmVudC5sYWJlbCA9ICdTaWduYXR1cmUnO1xyXG4gICAgICAgIHNjb3BlLmNvbXBvbmVudC5oaWRlTGFiZWwgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBTZXRzIHRoZSBkaW1lbnNpb24gb2YgYSB3aWR0aCBvciBoZWlnaHQuXHJcbiAgICAgICAgdmFyIHNldERpbWVuc2lvbiA9IGZ1bmN0aW9uIChkaW0pIHtcclxuICAgICAgICAgIGlmIChzY29wZS5jb21wb25lbnRbZGltXS5zbGljZSgtMSkgPT09ICclJykge1xyXG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9IHBhcnNlRmxvYXQoc2NvcGUuY29tcG9uZW50W2RpbV0uc2xpY2UoMCwgLTEpKSAvIDEwMDtcclxuICAgICAgICAgICAgZWxlbWVudFswXVtkaW1dID0gZWxlbWVudC5wYXJlbnQoKVtkaW1dKCkgKiBwZXJjZW50O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnRbMF1bZGltXSA9IHBhcnNlSW50KHNjb3BlLmNvbXBvbmVudFtkaW1dLCAxMCk7XHJcbiAgICAgICAgICAgIHNjb3BlLmNvbXBvbmVudFtkaW1dID0gZWxlbWVudFswXVtkaW1dICsgJ3B4JztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBTZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGNhbnZhcy5cclxuICAgICAgICBzZXREaW1lbnNpb24oJ3dpZHRoJyk7XHJcbiAgICAgICAgc2V0RGltZW5zaW9uKCdoZWlnaHQnKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBzaWduYXR1cmUgcGFkLlxyXG4gICAgICAgIC8qIGdsb2JhbCBTaWduYXR1cmVQYWQ6ZmFsc2UgKi9cclxuICAgICAgICB2YXIgc2lnbmF0dXJlUGFkID0gbmV3IFNpZ25hdHVyZVBhZChlbGVtZW50WzBdLCB7XHJcbiAgICAgICAgICBtaW5XaWR0aDogc2NvcGUuY29tcG9uZW50Lm1pbldpZHRoLFxyXG4gICAgICAgICAgbWF4V2lkdGg6IHNjb3BlLmNvbXBvbmVudC5tYXhXaWR0aCxcclxuICAgICAgICAgIHBlbkNvbG9yOiBzY29wZS5jb21wb25lbnQucGVuQ29sb3IsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IHNjb3BlLmNvbXBvbmVudC5iYWNrZ3JvdW5kQ29sb3JcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdjb21wb25lbnQucGVuQ29sb3InLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgIHNpZ25hdHVyZVBhZC5wZW5Db2xvciA9IG5ld1ZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzY29wZS4kd2F0Y2goJ2NvbXBvbmVudC5iYWNrZ3JvdW5kQ29sb3InLCBmdW5jdGlvbiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgIHNpZ25hdHVyZVBhZC5iYWNrZ3JvdW5kQ29sb3IgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgIHNpZ25hdHVyZVBhZC5jbGVhcigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDbGVhciB0aGUgc2lnbmF0dXJlLlxyXG4gICAgICAgIHNjb3BlLmNvbXBvbmVudC5jbGVhclNpZ25hdHVyZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHNpZ25hdHVyZVBhZC5jbGVhcigpO1xyXG4gICAgICAgICAgcmVhZFNpZ25hdHVyZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFNldCBzb21lIENTUyBwcm9wZXJ0aWVzLlxyXG4gICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICdib3JkZXItcmFkaXVzJzogJzRweCcsXHJcbiAgICAgICAgICAnYm94LXNoYWRvdyc6ICcwIDAgNXB4IHJnYmEoMCwgMCwgMCwgMC4wMikgaW5zZXQnLFxyXG4gICAgICAgICAgJ2JvcmRlcic6ICcxcHggc29saWQgI2Y0ZjRmNCdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZFNpZ25hdHVyZSgpIHtcclxuICAgICAgICAgIGlmIChzY29wZS5jb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWQgJiYgc2lnbmF0dXJlUGFkLmlzRW1wdHkoKSkge1xyXG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoJycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShzaWduYXR1cmVQYWQudG9EYXRhVVJMKCkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgc2lnbmF0dXJlUGFkLmZyb21EYXRhVVJMKG5nTW9kZWwuJHZpZXdWYWx1ZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzaWduYXR1cmVQYWQub25FbmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKHJlYWRTaWduYXR1cmUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFJlYWQgaW5pdGlhbCBlbXB0eSBjYW52YXMsIHVubGVzcyBzaWduYXR1cmUgaXMgcmVxdWlyZWQsIHRoZW4ga2VlcCBpdCBwcmlzdGluZVxyXG4gICAgICAgIGlmICghc2NvcGUuY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkKSB7XHJcbiAgICAgICAgICByZWFkU2lnbmF0dXJlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXHJcbiAgICAgICAgICAgICAgRm9ybWlvVXRpbHMpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy9zaWduYXR1cmUuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcclxuICAgICAgICBcIjxpbWcgbmctaWY9XFxcInJlYWRPbmx5XFxcIiBuZy1hdHRyLXNyYz1cXFwie3tkYXRhW2NvbXBvbmVudC5rZXldfX1cXFwiIHNyYz1cXFwiXFxcIiAvPlxcclxcbjxkaXYgbmctaWY9XFxcIiFyZWFkT25seVxcXCIgc3R5bGU9XFxcIndpZHRoOiB7eyBjb21wb25lbnQud2lkdGggfX07IGhlaWdodDoge3sgY29tcG9uZW50LmhlaWdodCB9fTtcXFwiPlxcclxcbiAgPGEgY2xhc3M9XFxcImJ0biBidG4teHMgYnRuLWRlZmF1bHRcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTsgbGVmdDogMDsgdG9wOiAwOyB6LWluZGV4OiAxMDAwXFxcIiBuZy1jbGljaz1cXFwiY29tcG9uZW50LmNsZWFyU2lnbmF0dXJlKClcXFwiPlxcclxcbiAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoXFxcIj48L3NwYW4+XFxyXFxuICA8L2E+XFxyXFxuICA8Y2FudmFzIHNpZ25hdHVyZSBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCIgbmctbW9kZWw9XFxcImRhdGFbY29tcG9uZW50LmtleV1cXFwiIG5nLXJlcXVpcmVkPVxcXCJjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcXFwiPjwvY2FudmFzPlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybWlvLXNpZ25hdHVyZS1mb290ZXJcXFwiIHN0eWxlPVxcXCJ0ZXh0LWFsaWduOiBjZW50ZXI7Y29sb3I6I0MzQzNDMztcXFwiIG5nLWNsYXNzPVxcXCJ7J2ZpZWxkLXJlcXVpcmVkJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVxcXCI+e3sgY29tcG9uZW50LmZvb3RlciB9fTwvZGl2PlxcclxcbjwvZGl2PlxcclxcblwiXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0YWJsZScsIHtcclxuICAgICAgICB0aXRsZTogJ1RhYmxlJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RhYmxlLmh0bWwnLFxyXG4gICAgICAgIGdyb3VwOiAnbGF5b3V0JyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgbnVtUm93czogMyxcclxuICAgICAgICAgIG51bUNvbHM6IDMsXHJcbiAgICAgICAgICByb3dzOiBbW3tjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX0sIHtjb21wb25lbnRzOiBbXX1dLCBbe2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfSwge2NvbXBvbmVudHM6IFtdfV0sIFt7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119LCB7Y29tcG9uZW50czogW119XV0sXHJcbiAgICAgICAgICBoZWFkZXI6IFtdLFxyXG4gICAgICAgICAgY2FwdGlvbjogJycsXHJcbiAgICAgICAgICBzdHJpcGVkOiBmYWxzZSxcclxuICAgICAgICAgIGJvcmRlcmVkOiBmYWxzZSxcclxuICAgICAgICAgIGhvdmVyOiBmYWxzZSxcclxuICAgICAgICAgIGNvbmRlbnNlZDogZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgICB2YXIgdGFibGVDbGFzc2VzID0gXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgXCI7XHJcbiAgICAgIHRhYmxlQ2xhc3NlcyArPSBcIid0YWJsZS1ib3JkZXJlZCc6IGNvbXBvbmVudC5ib3JkZXJlZCwgXCI7XHJcbiAgICAgIHRhYmxlQ2xhc3NlcyArPSBcIid0YWJsZS1ob3Zlcic6IGNvbXBvbmVudC5ob3ZlciwgXCI7XHJcbiAgICAgIHRhYmxlQ2xhc3NlcyArPSBcIid0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVwiO1xyXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnRzL3RhYmxlLmh0bWwnLFxyXG4gICAgICAgIFwiPGRpdiBjbGFzcz1cXFwidGFibGUtcmVzcG9uc2l2ZVxcXCIgaWQ9XFxcInt7IGNvbXBvbmVudC5rZXkgfX1cXFwiPlxcclxcbiAgPHRhYmxlIG5nLWNsYXNzPVxcXCJ7J3RhYmxlLXN0cmlwZWQnOiBjb21wb25lbnQuc3RyaXBlZCwgJ3RhYmxlLWJvcmRlcmVkJzogY29tcG9uZW50LmJvcmRlcmVkLCAndGFibGUtaG92ZXInOiBjb21wb25lbnQuaG92ZXIsICd0YWJsZS1jb25kZW5zZWQnOiBjb21wb25lbnQuY29uZGVuc2VkfVxcXCIgY2xhc3M9XFxcInRhYmxlXFxcIj5cXHJcXG4gICAgPHRoZWFkIG5nLWlmPVxcXCJjb21wb25lbnQuaGVhZGVyLmxlbmd0aFxcXCI+XFxyXFxuICAgICAgPHRoIG5nLXJlcGVhdD1cXFwiaGVhZGVyIGluIGNvbXBvbmVudC5oZWFkZXJcXFwiPnt7IGhlYWRlciB9fTwvdGg+XFxyXFxuICAgIDwvdGhlYWQ+XFxyXFxuICAgIDx0Ym9keT5cXHJcXG4gICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gY29tcG9uZW50LnJvd3MgdHJhY2sgYnkgJGluZGV4XFxcIj5cXHJcXG4gICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiByb3cgdHJhY2sgYnkgJGluZGV4XFxcIj5cXHJcXG4gICAgICAgICAgPGZvcm1pby1jb21wb25lbnQgbmctcmVwZWF0PVxcXCJjb21wb25lbnQgaW4gY29sdW1uLmNvbXBvbmVudHNcXFwiIGNvbXBvbmVudD1cXFwiY29tcG9uZW50XFxcIiBkYXRhPVxcXCJkYXRhXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCI+PC9mb3JtaW8tY29tcG9uZW50PlxcclxcbiAgICAgICAgPC90ZD5cXHJcXG4gICAgICA8L3RyPlxcclxcbiAgICA8L3Rib2R5PlxcclxcbiAgPC90YWJsZT5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHApIHtcclxuXHJcbiAgYXBwLmNvbmZpZyhbXHJcbiAgICAnZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyJyxcclxuICAgIGZ1bmN0aW9uIChmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0YXJlYScsIHtcclxuICAgICAgICB0aXRsZTogJ1RleHQgQXJlYScsXHJcbiAgICAgICAgdGVtcGxhdGU6ICdmb3JtaW8vY29tcG9uZW50cy90ZXh0YXJlYS5odG1sJyxcclxuICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgaW5wdXQ6IHRydWUsXHJcbiAgICAgICAgICB0YWJsZVZpZXc6IHRydWUsXHJcbiAgICAgICAgICBsYWJlbDogJycsXHJcbiAgICAgICAgICBrZXk6ICd0ZXh0YXJlYUZpZWxkJyxcclxuICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJyxcclxuICAgICAgICAgIHByZWZpeDogJycsXHJcbiAgICAgICAgICBzdWZmaXg6ICcnLFxyXG4gICAgICAgICAgcm93czogMyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcclxuICAgICAgICAgIHZhbGlkYXRlOiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgbWluTGVuZ3RoOiAnJyxcclxuICAgICAgICAgICAgbWF4TGVuZ3RoOiAnJyxcclxuICAgICAgICAgICAgcGF0dGVybjogJycsXHJcbiAgICAgICAgICAgIGN1c3RvbTogJydcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIF0pO1xyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXHJcbiAgICAgICAgICAgICAgRm9ybWlvVXRpbHMpIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy90ZXh0YXJlYS5odG1sJywgRm9ybWlvVXRpbHMuZmllbGRXcmFwKFxyXG4gICAgICAgIFwiPHRleHRhcmVhXFxyXFxuY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXHJcXG5uZy1tb2RlbD1cXFwiZGF0YVtjb21wb25lbnQua2V5XVxcXCJcXHJcXG5uZy1kaXNhYmxlZD1cXFwicmVhZE9ubHlcXFwiXFxyXFxubmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXHJcXG5zYWZlLW11bHRpcGxlLXRvLXNpbmdsZVxcclxcbmlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbnRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG5wbGFjZWhvbGRlcj1cXFwie3sgY29tcG9uZW50LnBsYWNlaG9sZGVyIH19XFxcIlxcclxcbmN1c3RvbS12YWxpZGF0b3I9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5jdXN0b21cXFwiXFxyXFxucm93cz1cXFwie3sgY29tcG9uZW50LnJvd3MgfX1cXFwiPjwvdGV4dGFyZWE+XFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ2Zvcm1pb0NvbXBvbmVudHNQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbihmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIpIHtcclxuICAgICAgZm9ybWlvQ29tcG9uZW50c1Byb3ZpZGVyLnJlZ2lzdGVyKCd0ZXh0ZmllbGQnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdUZXh0IEZpZWxkJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3RleHRmaWVsZC5odG1sJyxcclxuICAgICAgICBpY29uOiAnZmEgZmEtdGVybWluYWwnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogdHJ1ZSxcclxuICAgICAgICAgIHRhYmxlVmlldzogdHJ1ZSxcclxuICAgICAgICAgIGlucHV0VHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgaW5wdXRNYXNrOiAnJyxcclxuICAgICAgICAgIGxhYmVsOiAnJyxcclxuICAgICAgICAgIGtleTogJ3RleHRGaWVsZCcsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogJycsXHJcbiAgICAgICAgICBwcmVmaXg6ICcnLFxyXG4gICAgICAgICAgc3VmZml4OiAnJyxcclxuICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgIGRlZmF1bHRWYWx1ZTogJycsXHJcbiAgICAgICAgICBwcm90ZWN0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgdW5pcXVlOiBmYWxzZSxcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICB2YWxpZGF0ZToge1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIG1pbkxlbmd0aDogJycsXHJcbiAgICAgICAgICAgIG1heExlbmd0aDogJycsXHJcbiAgICAgICAgICAgIHBhdHRlcm46ICcnLFxyXG4gICAgICAgICAgICBjdXN0b206ICcnLFxyXG4gICAgICAgICAgICBjdXN0b21Qcml2YXRlOiBmYWxzZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGNvbmRpdGlvbmFsOiB7XHJcbiAgICAgICAgICAgIHNob3c6IG51bGwsXHJcbiAgICAgICAgICAgIHdoZW46IG51bGwsXHJcbiAgICAgICAgICAgIGVxOiAnJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcblxyXG4gIGFwcC5ydW4oW1xyXG4gICAgJyR0ZW1wbGF0ZUNhY2hlJyxcclxuICAgICdGb3JtaW9VdGlscycsXHJcbiAgICBmdW5jdGlvbihcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUsXHJcbiAgICAgIEZvcm1pb1V0aWxzXHJcbiAgICApIHtcclxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8vY29tcG9uZW50cy90ZXh0ZmllbGQuaHRtbCcsIEZvcm1pb1V0aWxzLmZpZWxkV3JhcChcclxuICAgICAgICBcIjxpbnB1dCB0eXBlPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRUeXBlIH19XFxcIlxcclxcbiAgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCJcXHJcXG4gIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIlxcclxcbiAgbmFtZT1cXFwie3sgY29tcG9uZW50LmtleSB9fVxcXCJcXHJcXG4gIHRhYmluZGV4PVxcXCJ7eyBjb21wb25lbnQudGFiaW5kZXggfHwgMCB9fVxcXCJcXHJcXG4gIG5nLWRpc2FibGVkPVxcXCJyZWFkT25seVxcXCJcXHJcXG4gIG5nLW1vZGVsPVxcXCJkYXRhW2NvbXBvbmVudC5rZXldXFxcIlxcclxcbiAgbmctbW9kZWwtb3B0aW9ucz1cXFwieyBkZWJvdW5jZTogNTAwIH1cXFwiXFxyXFxuICBzYWZlLW11bHRpcGxlLXRvLXNpbmdsZVxcclxcbiAgbmctcmVxdWlyZWQ9XFxcImNvbXBvbmVudC52YWxpZGF0ZS5yZXF1aXJlZFxcXCJcXHJcXG4gIG5nLW1pbmxlbmd0aD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLm1pbkxlbmd0aFxcXCJcXHJcXG4gIG5nLW1heGxlbmd0aD1cXFwiY29tcG9uZW50LnZhbGlkYXRlLm1heExlbmd0aFxcXCJcXHJcXG4gIG5nLXBhdHRlcm49XFxcImNvbXBvbmVudC52YWxpZGF0ZS5wYXR0ZXJuXFxcIlxcclxcbiAgY3VzdG9tLXZhbGlkYXRvcj1cXFwiY29tcG9uZW50LnZhbGlkYXRlLmN1c3RvbVxcXCJcXHJcXG4gIHBsYWNlaG9sZGVyPVxcXCJ7eyBjb21wb25lbnQucGxhY2Vob2xkZXIgfX1cXFwiXFxyXFxuICB1aS1tYXNrPVxcXCJ7eyBjb21wb25lbnQuaW5wdXRNYXNrIH19XFxcIlxcclxcbiAgdWktbWFzay1wbGFjZWhvbGRlcj1cXFwiXFxcIlxcclxcbiAgdWktb3B0aW9ucz1cXFwidWlNYXNrT3B0aW9uc1xcXCJcXHJcXG4+XFxyXFxuXCJcclxuICAgICAgKSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xyXG5cclxuICBhcHAuY29uZmlnKFtcclxuICAgICdmb3JtaW9Db21wb25lbnRzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKGZvcm1pb0NvbXBvbmVudHNQcm92aWRlcikge1xyXG4gICAgICBmb3JtaW9Db21wb25lbnRzUHJvdmlkZXIucmVnaXN0ZXIoJ3dlbGwnLCB7XHJcbiAgICAgICAgdGl0bGU6ICdXZWxsJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJ2Zvcm1pby9jb21wb25lbnRzL3dlbGwuaHRtbCcsXHJcbiAgICAgICAgZ3JvdXA6ICdsYXlvdXQnLFxyXG4gICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICBpbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICBjb21wb25lbnRzOiBbXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgXSk7XHJcbiAgYXBwLnJ1bihbXHJcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxyXG4gICAgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2NvbXBvbmVudHMvd2VsbC5odG1sJyxcclxuICAgICAgICBcIjxkaXYgY2xhc3M9XFxcIndlbGxcXFwiIGlkPVxcXCJ7eyBjb21wb25lbnQua2V5IH19XFxcIj5cXHJcXG4gIDxmb3JtaW8tY29tcG9uZW50IG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGNvbXBvbmVudC5jb21wb25lbnRzXFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwiZGF0YVxcXCIgZm9ybWlvPVxcXCJmb3JtaW9cXFwiIHJlYWQtb25seT1cXFwicmVhZE9ubHlcXFwiPjwvZm9ybWlvLWNvbXBvbmVudD5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICByZXF1aXJlOiAnbmdNb2RlbCcsXHJcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlLCBhdHRycywgY3RybCkge1xyXG4gICAgICBpZiAoXHJcbiAgICAgICAgIXNjb3BlLmNvbXBvbmVudC52YWxpZGF0ZSB8fFxyXG4gICAgICAgICFzY29wZS5jb21wb25lbnQudmFsaWRhdGUuY3VzdG9tXHJcbiAgICAgICkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBjdHJsLiR2YWxpZGF0b3JzLmN1c3RvbSA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xyXG4gICAgICAgIHZhciB2YWxpZCA9IHRydWU7XHJcbiAgICAgICAgLyplc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xyXG4gICAgICAgIHZhciBpbnB1dCA9IG1vZGVsVmFsdWUgfHwgdmlld1ZhbHVlO1xyXG4gICAgICAgIC8qZXNsaW50LWVuYWJsZSBuby11bnVzZWQtdmFycyAqL1xyXG4gICAgICAgIHZhciBjdXN0b20gPSBzY29wZS5jb21wb25lbnQudmFsaWRhdGUuY3VzdG9tO1xyXG4gICAgICAgIGN1c3RvbSA9IGN1c3RvbS5yZXBsYWNlKC8oe3tcXHMrKC4qKVxccyt9fSkvLCBmdW5jdGlvbihtYXRjaCwgJDEsICQyKSB7XHJcbiAgICAgICAgICByZXR1cm4gc2NvcGUuZGF0YVskMl07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8qIGpzaGludCBldmlsOiB0cnVlICovXHJcbiAgICAgICAgZXZhbChjdXN0b20pO1xyXG5cclxuICAgICAgICBpZiAodmFsaWQgIT09IHRydWUpIHtcclxuICAgICAgICAgIHNjb3BlLmNvbXBvbmVudC5jdXN0b21FcnJvciA9IHZhbGlkO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRjb21waWxlKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgc2NvcGU6IHtcclxuICAgICAgc3JjOiAnPT8nLFxyXG4gICAgICBmb3JtQWN0aW9uOiAnPT8nLFxyXG4gICAgICBmb3JtOiAnPT8nLFxyXG4gICAgICBzdWJtaXNzaW9uOiAnPT8nLFxyXG4gICAgICByZWFkT25seTogJz0/JyxcclxuICAgICAgaGlkZUNvbXBvbmVudHM6ICc9PycsXHJcbiAgICAgIHJlcXVpcmVDb21wb25lbnRzOiAnPT8nLFxyXG4gICAgICBkaXNhYmxlQ29tcG9uZW50czogJz0/JyxcclxuICAgICAgZm9ybWlvT3B0aW9uczogJz0/JyxcclxuICAgICAgaTE4bjogJz0/J1xyXG4gICAgfSxcclxuICAgIGNvbnRyb2xsZXI6IFtcclxuICAgICAgJyRzY29wZScsXHJcbiAgICAgICckaHR0cCcsXHJcbiAgICAgICckZWxlbWVudCcsXHJcbiAgICAgICdGb3JtaW9TY29wZScsXHJcbiAgICAgICdGb3JtaW8nLFxyXG4gICAgICAnRm9ybWlvVXRpbHMnLFxyXG4gICAgICAnQXBwQ29uZmlnJyxcclxuICAgICAgJyRmaWx0ZXInLFxyXG4gICAgICBmdW5jdGlvbihcclxuICAgICAgICAkc2NvcGUsXHJcbiAgICAgICAgJGh0dHAsXHJcbiAgICAgICAgJGVsZW1lbnQsXHJcbiAgICAgICAgRm9ybWlvU2NvcGUsXHJcbiAgICAgICAgRm9ybWlvLFxyXG4gICAgICAgIEZvcm1pb1V0aWxzLFxyXG4gICAgICAgIEFwcENvbmZpZyxcclxuICAgICAgICAkZmlsdGVyXHJcbiAgICAgICkge1xyXG4gICAgICAgICRzY29wZS5fc3JjID0gJHNjb3BlLnNyYyB8fCAnJztcclxuICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW107XHJcbiAgICAgICAgJHNjb3BlLmkxOG4gPSAnZW4nO1xyXG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xyXG4gICAgICAgIHRoaXMuc2hvd0FsZXJ0cyA9ICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHRoZSBsaXZlIGZvcm0gcGFyYW1ldGVyIHRvIHRoZSB1cmwuXHJcbiAgICAgICAgaWYgKCRzY29wZS5fc3JjICYmICgkc2NvcGUuX3NyYy5pbmRleE9mKCdsaXZlPScpID09PSAtMSkpIHtcclxuICAgICAgICAgICRzY29wZS5fc3JjICs9ICgkc2NvcGUuX3NyYy5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJztcclxuICAgICAgICAgICRzY29wZS5fc3JjICs9ICdsaXZlPTEnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQnVpbGQgdGhlIGRpc3BsYXkgbWFwLlxyXG4gICAgICAgICRzY29wZS5zaG93ID0ge307XHJcbiAgICAgICAgdmFyIGJvb2xlYW4gPSB7XHJcbiAgICAgICAgICAndHJ1ZSc6IHRydWUsXHJcbiAgICAgICAgICAnZmFsc2UnOiBmYWxzZVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzdWJtaXNzaW9uID0gJHNjb3BlLnN1Ym1pc3Npb24gfHwge2RhdGE6IHt9fTtcclxuICAgICAgICB2YXIgdXBkYXRlQ29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgLy8gQ2hhbmdlIHRoZSB2aXNpYmlsaXR5IGZvciB0aGUgY29tcG9uZW50IHdpdGggdGhlIGdpdmVuIGtleVxyXG4gICAgICAgICAgdmFyIHVwZGF0ZVZpc2libGl0eSA9IGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgICAgICB2YXIgbmV3Q2xhc3MgPSAkc2NvcGUuc2hvd1trZXldID8gJ25nLXNob3cnIDogJ25nLWhpZGUnO1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmhpZGVDb21wb25lbnRzICYmICRzY29wZS5oaWRlQ29tcG9uZW50cy5pbmRleE9mKGtleSkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgbmV3Q2xhc3MgPSAnbmctaGlkZSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJGVsZW1lbnRcclxuICAgICAgICAgICAgICAuZmluZCgnZGl2I2Zvcm0tZ3JvdXAtJyArIGtleSlcclxuICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ25nLXNob3cgbmctaGlkZScpXHJcbiAgICAgICAgICAgICAgLmFkZENsYXNzKG5ld0NsYXNzKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgJHNjb3BlLmZvcm0uY29tcG9uZW50cyA9ICRzY29wZS5mb3JtLmNvbXBvbmVudHMgfHwgW107XHJcbiAgICAgICAgICBGb3JtaW9VdGlscy5lYWNoQ29tcG9uZW50KCRzY29wZS5mb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xyXG5cclxuICAgICAgICAgICAgLy8gRGlzcGxheSBldmVyeSBjb21wb25lbnQgYnkgZGVmYXVsdFxyXG4gICAgICAgICAgICAkc2NvcGUuc2hvd1tjb21wb25lbnQua2V5XSA9ICgkc2NvcGUuc2hvd1tjb21wb25lbnQua2V5XSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgID8gdHJ1ZVxyXG4gICAgICAgICAgICAgIDogJHNjb3BlLnNob3dbY29tcG9uZW50LmtleV07XHJcblxyXG4gICAgICAgICAgICAvLyBPbmx5IGNoYW5nZSBkaXNwbGF5IG9wdGlvbnMgb2YgYWxsIHJlcXVpcmUgY29uZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgcHJlc2VudC5cclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgIGNvbXBvbmVudC5jb25kaXRpb25hbFxyXG4gICAgICAgICAgICAgICYmIChjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvdyAhPT0gbnVsbCAmJiBjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvdyAhPT0gJycpXHJcbiAgICAgICAgICAgICAgJiYgKGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuICE9PSBudWxsICYmIGNvbXBvbmVudC5jb25kaXRpb25hbC53aGVuICE9PSAnJylcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgLy8gRGVmYXVsdCB0aGUgY29uZGl0aW9uYWwgdmFsdWVzLlxyXG4gICAgICAgICAgICAgIGNvbXBvbmVudC5jb25kaXRpb25hbC5zaG93ID0gYm9vbGVhbltjb21wb25lbnQuY29uZGl0aW9uYWwuc2hvd107XHJcbiAgICAgICAgICAgICAgY29tcG9uZW50LmNvbmRpdGlvbmFsLmVxID0gY29tcG9uZW50LmNvbmRpdGlvbmFsLmVxIHx8ICcnO1xyXG5cclxuICAgICAgICAgICAgICAvLyBHZXQgdGhlIGNvbmRpdGlvbmFsIGNvbXBvbmVudC5cclxuICAgICAgICAgICAgICB2YXIgY29uZCA9IEZvcm1pb1V0aWxzLmdldENvbXBvbmVudCgkc2NvcGUuZm9ybS5jb21wb25lbnRzLCBjb21wb25lbnQuY29uZGl0aW9uYWwud2hlbi50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBzdWJtaXNzaW9uLmRhdGFbY29uZC5rZXldO1xyXG5cclxuICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBjb25kaXRpb25hbCB2YWx1ZSBpcyBlcXVhbCB0byB0aGUgdHJpZ2dlciB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dbY29tcG9uZW50LmtleV0gPSB2YWx1ZS50b1N0cmluZygpID09PSBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICAgICAgICA/IGJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddXHJcbiAgICAgICAgICAgICAgICAgIDogIWJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBDaGVjayBhZ2FpbnN0IHRoZSBjb21wb25lbnRzIGRlZmF1bHQgdmFsdWUsIGlmIHByZXNlbnQgYW5kIHRoZSBjb21wb25lbnRzIGhhc250IGJlZW4gaW50ZXJhY3RlZCB3aXRoLlxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKCF2YWx1ZSAmJiBjb25kLmRlZmF1bHRWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dbY29tcG9uZW50LmtleV0gPSBjb25kLmRlZmF1bHRWYWx1ZS50b1N0cmluZygpID09PSBjb21wb25lbnQuY29uZGl0aW9uYWwuZXEudG9TdHJpbmcoKVxyXG4gICAgICAgICAgICAgICAgICA/IGJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddXHJcbiAgICAgICAgICAgICAgICAgIDogIWJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyB2YWx1ZSwgd2Ugc3RpbGwgbmVlZCB0byBwcm9jZXNzIGFzIG5vdCBlcXVhbC5cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zaG93W2NvbXBvbmVudC5rZXldID0gIWJvb2xlYW5bY29tcG9uZW50LmNvbmRpdGlvbmFsLnNob3ddO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSB2aXNpYmlsaXR5LCBpZiBpdHMgcG9zc2libGUgYSBjaGFuZ2Ugb2NjdXJyZWQuXHJcbiAgICAgICAgICAgICAgdXBkYXRlVmlzaWJsaXR5KGNvbXBvbmVudC5rZXkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL0ludGVybmF0aW9uYWxpemF0aW9uXHJcbiAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICogQW4gZXh0ZXJuYWwgZHJvcGRvd24gaXMgcmVxdWlyZWQgaW4gaHRtbCBwYWdlIHdoaWNoIHdpbGwgbGlzdCBhbGwgYXZhaWxhYmxlIGxhbmd1YWdlcyBhbmQgdGhlaXIga2V5IHZhbHVlcy5cclxuICAgICAgICAgICAgKiBFeDogPHNlbGVjdCBuZy1tb2RlbD1cImxhbmd1YWdlU2VsZWN0XCIgY2xhc3M9XCJsYW5ndWFnZVNlbGVjdFwiIG5nLW9wdGlvbnM9XCJrZXkgYXMgdmFsdWUgZm9yIChrZXksIHZhbHVlKSBpbiBkZWZhdWx0TGFuZ3VhZ2VcIj48L3NlbGVjdD4gXHJcbiAgICAgICAgICAgICogRW5hYmxlIGkxOG4gbXVsdGlsYW5ndWFsIHByb3BlcnR5IGZvciBhIGZvcm0uIDxmb3JtaW8gaTE4bj1cImxhbmd1YWdlU2VsZWN0XCIgc3JjPVwidXNlckxvZ2luRm9ybVwiPjwvZm9ybWlvPlxyXG4gICAgICAgICAgICAqIFRvIHN1cHBvcnQgYWJvdmUgZHJvcGRvd24gc2VsZWN0IGFuIGNvbnN0YW50IG9iamFjdCBoYXMgdG8gYmUgZGVmaW5lZCBpbiBhcHAuanMuIFRoZSBvYmplY3QgZWxlbWVudCBjb250YWlucyB0aGUgbmFtZSBhbmQga2V5IG9mIHN1cHBvcnRlZCBsYW5ndWFnZXMuXHJcbiAgICAgICAgICAgICogZXg6IFxyXG4gICAgICAgICAgICAqIC5jb25zdGFudCgnTEFOR1VBR0VTJywge1xyXG4gICAgICAgICAgICAgICAgJ2xhbmd1YWdlcyc6IHtcclxuICAgICAgICAgICAgICAgICAgJ2VuJzogJ0VuZ2xpc2gnLFxyXG4gICAgICAgICAgICAgICAgICAnZG4nOiAnZGFuc2snLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAqIEZpbmFsbHkgYSBmaWx0ZXIgaXMgYmVpbmcgdXNlZCB0byBleGVjdXRlIHRoZSByZXN0IHByb2Nlc3MgYW5kIGNvbnZlcnQgZm9ybSBjb21wb25lbnQgbGFiZWxzIHdpdGggc2VsZWN0ZWQgbGFuZ3VhZ2UuXHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKCRzY29wZS5pMThuICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2kxOG4nLCBmdW5jdGlvbihsYW5ndWFnZU9wdGlvbikge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRMYW5ndWFnZSA9IGxhbmd1YWdlT3B0aW9uO1xyXG4gICAgICAgICAgICAgICAgJGZpbHRlcignaTE4bicpKGNvbXBvbmVudCAsIGxhbmd1YWdlT3B0aW9uKSA7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaGlkZUNvbXBvbmVudHMgJiYgJHNjb3BlLmhpZGVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgdXBkYXRlVmlzaWJsaXR5KGNvbXBvbmVudC5rZXkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgcmVxdWlyZWQgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUucmVxdWlyZUNvbXBvbmVudHMgJiYgY29tcG9uZW50Lmhhc093blByb3BlcnR5KCd2YWxpZGF0ZScpKSB7XHJcbiAgICAgICAgICAgICAgY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkID0gJHNjb3BlLnJlcXVpcmVDb21wb25lbnRzLmluZGV4T2YoY29tcG9uZW50LmtleSkgIT09IC0xO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgZGlzYWJsZWQgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICBjb21wb25lbnQuZGlzYWJsZWQgPSAkc2NvcGUuZGlzYWJsZUNvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQua2V5KSAhPT0gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY29tcG9uZW50cyBvbiB0aGUgaW5pdGlhbCBmb3JtIHJlbmRlciBhbmQgYWxsIHN1YnNlcXVlbnQgc3VibWlzc2lvbiBkYXRhIGNoYW5nZXMuXHJcbiAgICAgICAgJHNjb3BlLiRvbignZm9ybVJlbmRlcicsIHVwZGF0ZUNvbXBvbmVudHMpO1xyXG4gICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25EYXRhVXBkYXRlJywgZnVuY3Rpb24oZXYsIGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgIHN1Ym1pc3Npb24uZGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICB1cGRhdGVDb21wb25lbnRzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghJHNjb3BlLl9zcmMpIHtcclxuICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3NyYycsIGZ1bmN0aW9uKHNyYykge1xyXG4gICAgICAgICAgICBpZiAoIXNyYykge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuX3NyYyA9IHNyYztcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IEZvcm1pb1Njb3BlLnJlZ2lzdGVyKCRzY29wZSwgJGVsZW1lbnQsIHtcclxuICAgICAgICAgICAgICBmb3JtOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZm9ybWlvIG9iamVjdC5cclxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xyXG4gICAgICAgICAgZm9ybTogdHJ1ZSxcclxuICAgICAgICAgIHN1Ym1pc3Npb246IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbGVkIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkLlxyXG4gICAgICAgICRzY29wZS5vblN1Ym1pdCA9IGZ1bmN0aW9uKGZvcm0pIHtcclxuICAgICAgICAgIGlmICghZm9ybS4kdmFsaWQgfHwgZm9ybS5zdWJtaXR0aW5nKSByZXR1cm47XHJcbiAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICAgIC8vIENyZWF0ZSBhIHNhbml0aXplZCBzdWJtaXNzaW9uIG9iamVjdC5cclxuICAgICAgICAgIHZhciBzdWJtaXNzaW9uRGF0YSA9IHtkYXRhOiB7fX07XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uX2lkKSB7XHJcbiAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLl9pZCA9ICRzY29wZS5zdWJtaXNzaW9uLl9pZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLl9pZCkge1xyXG4gICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5faWQgPSAkc2NvcGUuc3VibWlzc2lvbi5kYXRhLl9pZDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZ3JhYklkcyA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghKGlucHV0IGluc3RhbmNlb2YgQXJyYXkpKSB7XHJcbiAgICAgICAgICAgICAgaW5wdXQgPSBbaW5wdXRdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZmluYWwgPSBbXTtcclxuICAgICAgICAgICAgaW5wdXQuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgJiYgZWxlbWVudC5faWQpIHtcclxuICAgICAgICAgICAgICAgIGZpbmFsLnB1c2goZWxlbWVudC5faWQpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmluYWw7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHZhciBkZWZhdWx0UGVybWlzc2lvbnMgPSB7fTtcclxuICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoJHNjb3BlLmZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ3Jlc291cmNlJyAmJiBjb21wb25lbnQua2V5ICYmIGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIGRlZmF1bHRQZXJtaXNzaW9uc1tjb21wb25lbnQua2V5XSA9IGNvbXBvbmVudC5kZWZhdWx0UGVybWlzc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb24uZGF0YS5oYXNPd25Qcm9wZXJ0eShjb21wb25lbnQua2V5KSkge1xyXG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9ICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbY29tcG9uZW50LmtleV07XHJcbiAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC50eXBlID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtjb21wb25lbnQua2V5XSA9IHZhbHVlID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiAwO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmRhdGFbY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuc3VibWlzc2lvbi5kYXRhLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhdmFsdWUuaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XHJcbiAgICAgICAgICAgICAgc3VibWlzc2lvbkRhdGEuZGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNldHVwIHRoZSBzdWJtaXNzaW9uIGFjY2Vzcy5cclxuICAgICAgICAgICAgdmFyIHBlcm0gPSBkZWZhdWx0UGVybWlzc2lvbnNba2V5XTtcclxuICAgICAgICAgICAgaWYgKHBlcm0pIHtcclxuICAgICAgICAgICAgICBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgPSBzdWJtaXNzaW9uRGF0YS5hY2Nlc3MgfHwgW107XHJcblxyXG4gICAgICAgICAgICAgIC8vIENvZXJjZSB2YWx1ZSBpbnRvIGFuIGFycmF5IGZvciBwbHVja2luZy5cclxuICAgICAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYW5kIHVwZGF0ZSBhbiBleGlzdGluZyBwZXJtaXNzaW9uLlxyXG4gICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5mb3JFYWNoKGZ1bmN0aW9uKHBlcm1pc3Npb24pIHtcclxuICAgICAgICAgICAgICAgIGlmIChwZXJtaXNzaW9uLnR5cGUgPT09IHBlcm0pIHtcclxuICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcyA9IHBlcm1pc3Npb24ucmVzb3VyY2VzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLnJlc291cmNlcy5jb25jYXQoZ3JhYklkcyh2YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAvLyBBZGQgYSBwZXJtaXNzaW9uLCBiZWNhdXNlIG9uZSB3YXMgbm90IGZvdW5kLlxyXG4gICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25EYXRhLmFjY2Vzcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgdHlwZTogcGVybSxcclxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBncmFiSWRzKHZhbHVlKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiBhIHN1Ym1pc3Npb24gaGFzIGJlZW4gbWFkZS5cclxuICAgICAgICAgIHZhciBvblN1Ym1pdERvbmUgPSBmdW5jdGlvbihtZXRob2QsIHN1Ym1pc3Npb24pIHtcclxuICAgICAgICAgICAgJHNjb3BlLnNob3dBbGVydHMoe1xyXG4gICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU3VibWlzc2lvbiB3YXMgJyArICgobWV0aG9kID09PSAncHV0JykgPyAndXBkYXRlZCcgOiAnY3JlYXRlZCcpICsgJy4nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgZm9ybSBzdWJtaXNzaW9uLlxyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbik7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHZhciBzdWJtaXRFdmVudCA9ICRzY29wZS4kZW1pdCgnZm9ybVN1Ym1pdCcsIHN1Ym1pc3Npb25EYXRhKTtcclxuICAgICAgICAgIGlmIChzdWJtaXRFdmVudC5kZWZhdWx0UHJldmVudGVkKSB7XHJcbiAgICAgICAgICAgIC8vIExpc3RlbmVyIHdhbnRzIHRvIGNhbmNlbCB0aGUgZm9ybSBzdWJtaXNzaW9uXHJcbiAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGFjdGlvbiB1cmxzLlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5hY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IHN1Ym1pc3Npb25EYXRhLl9pZCA/ICdwdXQnIDogJ3Bvc3QnO1xyXG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Ym1pc3Npb25EYXRhKS5zdWNjZXNzKGZ1bmN0aW9uIChzdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgRm9ybWlvLmNsZWFyQ2FjaGUoKTtcclxuICAgICAgICAgICAgICBvblN1Ym1pdERvbmUobWV0aG9kLCBzdWJtaXNzaW9uKTtcclxuICAgICAgICAgICAgfSkuZXJyb3IoRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSlcclxuICAgICAgICAgICAgICAuZmluYWxseShmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGZvcm0uc3VibWl0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIElmIHRoZXkgd2lzaCB0byBzdWJtaXQgdG8gdGhlIGRlZmF1bHQgbG9jYXRpb24uXHJcbiAgICAgICAgICBlbHNlIGlmICgkc2NvcGUuZm9ybWlvKSB7XHJcbiAgICAgICAgICAgIC8vIGNvcHkgdG8gcmVtb3ZlIGFuZ3VsYXIgJCRoYXNoS2V5XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtaW8uc2F2ZVN1Ym1pc3Npb24oYW5ndWxhci5jb3B5KHN1Ym1pc3Npb25EYXRhKSwgJHNjb3BlLmZvcm1pb09wdGlvbnMpXHJcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIG9uU3VibWl0RG9uZShzdWJtaXNzaW9uLm1ldGhvZCwgc3VibWlzc2lvbik7XHJcbiAgICAgICAgICAgIH0sIEZvcm1pb1Njb3BlLm9uRXJyb3IoJHNjb3BlLCAkZWxlbWVudCkpXHJcbiAgICAgICAgICAgICAgLmZpbmFsbHkoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBmb3JtLnN1Ym1pdHRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1TdWJtaXNzaW9uJywgc3VibWlzc2lvbkRhdGEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby5odG1sJ1xyXG4gIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJ0Zvcm1pbycsXHJcbiAgJ2Zvcm1pb0NvbXBvbmVudHMnLFxyXG4gIGZ1bmN0aW9uKFxyXG4gICAgRm9ybWlvLFxyXG4gICAgZm9ybWlvQ29tcG9uZW50c1xyXG4gICkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVxdWlyZTogJz9eZm9ybWlvJyxcclxuICAgICAgc2NvcGU6IHtcclxuICAgICAgICBjb21wb25lbnQ6ICc9JyxcclxuICAgICAgICBkYXRhOiAnPScsXHJcbiAgICAgICAgZm9ybWlvOiAnPScsXHJcbiAgICAgICAgZm9ybTogJz0nLFxyXG4gICAgICAgIHJlYWRPbmx5OiAnPSdcclxuICAgICAgfSxcclxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUsIGVsLCBhdHRycywgZm9ybWlvQ3RybCkge1xyXG4gICAgICAgIGlmIChmb3JtaW9DdHJsKSB7XHJcbiAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZvcm1pb0N0cmwuc2hvd0FsZXJ0cy5iaW5kKGZvcm1pb0N0cmwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNhbGwgJHNjb3BlLnNob3dBbGVydHMgdW5sZXNzIHRoaXMgY29tcG9uZW50IGlzIGluc2lkZSBhIGZvcm1pbyBkaXJlY3RpdmUuJyk7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgY29udHJvbGxlcjogW1xyXG4gICAgICAgICckc2NvcGUnLFxyXG4gICAgICAgICckaHR0cCcsXHJcbiAgICAgICAgJyRjb250cm9sbGVyJyxcclxuICAgICAgICBmdW5jdGlvbihcclxuICAgICAgICAgICRzY29wZSxcclxuICAgICAgICAgICRodHRwLFxyXG4gICAgICAgICAgJGNvbnRyb2xsZXJcclxuICAgICAgICApIHtcclxuXHJcbiAgICAgICAgICAvLyBPcHRpb25zIHRvIG1hdGNoIGpxdWVyeS5tYXNrZWRpbnB1dCBtYXNrc1xyXG4gICAgICAgICAgJHNjb3BlLnVpTWFza09wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1hc2tEZWZpbml0aW9uczoge1xyXG4gICAgICAgICAgICAgICc5JzogL1xcZC8sXHJcbiAgICAgICAgICAgICAgJ2EnOiAvW2EtekEtWl0vLFxyXG4gICAgICAgICAgICAgICcqJzogL1thLXpBLVowLTldL1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjbGVhck9uQmx1cjogZmFsc2UsXHJcbiAgICAgICAgICAgIGV2ZW50c1RvSGFuZGxlOiBbJ2lucHV0JywgJ2tleXVwJywgJ2NsaWNrJywgJ2ZvY3VzJ10sXHJcbiAgICAgICAgICAgIHNpbGVudEV2ZW50czogWydjbGljaycsICdmb2N1cyddXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICRzY29wZS5yZXNldEZvcm0gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gTWFudWFsbHkgcmVtb3ZlIGVhY2gga2V5IHNvIHdlIGRvbid0IGxvc2UgYSByZWZlcmVuY2UgdG8gb3JpZ2luYWxcclxuICAgICAgICAgICAgLy8gZGF0YSBpbiBjaGlsZCBzY29wZXMuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiAkc2NvcGUuZGF0YSkge1xyXG4gICAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZGF0YVtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRhdGEuXHJcbiAgICAgICAgICBpZiAoISRzY29wZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5yZXNldEZvcm0oKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGlzIGNvbXBvbmVudCByZWZlcmVuY2VzIGFuIG9iamVjdCwgd2UgbmVlZCB0byBkZXRlcm1pbmUgdGhlXHJcbiAgICAgICAgICAvLyB2YWx1ZSBieSBuYXZpZ2F0aW5nIHRocm91Z2ggdGhlIG9iamVjdC5cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudCAmJlxyXG4gICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHZhciByb290ID0gJyc7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY29tcG9uZW50LmtleS5pbmRleE9mKCcuJykgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgcm9vdCA9ICRzY29wZS5jb21wb25lbnQua2V5LnNwbGl0KCcuJykuc2hpZnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgIGlmICghZGF0YSB8fCBhbmd1bGFyLmVxdWFscyh7fSwgZGF0YSkpIHJldHVybjtcclxuICAgICAgICAgICAgICBpZiAocm9vdCAmJiAoIWRhdGEuaGFzT3duUHJvcGVydHkocm9vdCkgfHwgYW5ndWxhci5lcXVhbHMoe30sIGRhdGFbcm9vdF0pKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIGlmIChyb290ICYmIGRhdGFbcm9vdF0uaGFzT3duUHJvcGVydHkoJ19pZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVtyb290ICsgJy5faWQnXSA9IGRhdGFbcm9vdF0uX2lkO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBGb3JtaW8uZmllbGREYXRhKGRhdGEsICRzY29wZS5jb21wb25lbnQpO1xyXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEdldCB0aGUgc2V0dGluZ3MuXHJcbiAgICAgICAgICB2YXIgY29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzWyRzY29wZS5jb21wb25lbnQudHlwZV0gfHwgZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzWydjdXN0b20nXTtcclxuXHJcbiAgICAgICAgICAvLyBTZXQgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBkZWZhdWx0cyBmcm9tIHRoZSBjb21wb25lbnQgc2V0dGluZ3MuXHJcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tcG9uZW50LnNldHRpbmdzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHJcbiAgICAgICAgICAgIGlmICghJHNjb3BlLmNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbXBvbmVudFtrZXldID0gYW5ndWxhci5jb3B5KHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gQWRkIGEgbmV3IGZpZWxkIHZhbHVlLlxyXG4gICAgICAgICAgJHNjb3BlLmFkZEZpZWxkVmFsdWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldIHx8IFtdO1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0ucHVzaCgnJyk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIFJlbW92ZSBhIGZpZWxkIHZhbHVlLlxyXG4gICAgICAgICAgJHNjb3BlLnJlbW92ZUZpZWxkVmFsdWUgPSBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0uc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gU2V0IHRoZSB0ZW1wbGF0ZSBmb3IgdGhlIGNvbXBvbmVudC5cclxuICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LnRlbXBsYXRlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZSgkc2NvcGUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICRzY29wZS50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBBbGxvdyBjb21wb25lbnQga2V5cyB0byBsb29rIGxpa2UgXCJzZXR0aW5nc1t1c2VybmFtZV1cIlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5jb21wb25lbnQua2V5ICYmICRzY29wZS5jb21wb25lbnQua2V5LmluZGV4T2YoJ1snKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAkc2NvcGUuY29tcG9uZW50LmtleS5tYXRjaCgvKFteXFxbXSspXFxbKFteXSspXFxdLyk7XHJcbiAgICAgICAgICAgIGlmICgobWF0Y2hlcy5sZW5ndGggPT09IDMpICYmICRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KG1hdGNoZXNbMV0pKSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGEgPSAkc2NvcGUuZGF0YVttYXRjaGVzWzFdXTtcclxuICAgICAgICAgICAgICAkc2NvcGUuY29tcG9uZW50LmtleSA9IG1hdGNoZXNbMl07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIGNvbnRyb2xsZXIuXHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIE1haW50YWluIHJldmVyc2UgY29tcGF0YWJpbGl0eSBieSBleGVjdXRpbmcgdGhlIG9sZCBtZXRob2Qgc3R5bGUuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcG9uZW50LmNvbnRyb2xsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICBjb21wb25lbnQuY29udHJvbGxlcigkc2NvcGUuY29tcG9uZW50LCAkc2NvcGUsICRodHRwLCBGb3JtaW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbXBvbmVudC5jb250cm9sbGVyLCB7JHNjb3BlOiAkc2NvcGV9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEVzdGFibGlzaCBhIGRlZmF1bHQgZm9yIGRhdGEuXHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmRhdGEgJiYgISRzY29wZS5kYXRhLmhhc093blByb3BlcnR5KCRzY29wZS5jb21wb25lbnQua2V5KSAmJiAkc2NvcGUuY29tcG9uZW50Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSkge1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSAmJiAhYW5ndWxhci5pc0FycmF5KCRzY29wZS5jb21wb25lbnQuZGVmYXVsdFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICRzY29wZS5kYXRhWyRzY29wZS5jb21wb25lbnQua2V5XSA9IFskc2NvcGUuY29tcG9uZW50LmRlZmF1bHRWYWx1ZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldID0gJHNjb3BlLmNvbXBvbmVudC5kZWZhdWx0VmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5kYXRhICYmICEkc2NvcGUuZGF0YS5oYXNPd25Qcm9wZXJ0eSgkc2NvcGUuY29tcG9uZW50LmtleSkgJiYgJHNjb3BlLmNvbXBvbmVudC5tdWx0aXBsZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuZGF0YVskc2NvcGUuY29tcG9uZW50LmtleV0gPSBbXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgc2NvcGU6IHtcclxuICAgICAgZm9ybTogJz0/JyxcclxuICAgICAgc3VibWlzc2lvbjogJz0/JyxcclxuICAgICAgc3JjOiAnPT8nLFxyXG4gICAgICBmb3JtQWN0aW9uOiAnPT8nLFxyXG4gICAgICByZXNvdXJjZU5hbWU6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1kZWxldGUuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICckc2NvcGUnLFxyXG4gICAgICAnJGVsZW1lbnQnLFxyXG4gICAgICAnRm9ybWlvU2NvcGUnLFxyXG4gICAgICAnRm9ybWlvJyxcclxuICAgICAgJyRodHRwJyxcclxuICAgICAgZnVuY3Rpb24oXHJcbiAgICAgICAgJHNjb3BlLFxyXG4gICAgICAgICRlbGVtZW50LFxyXG4gICAgICAgIEZvcm1pb1Njb3BlLFxyXG4gICAgICAgIEZvcm1pbyxcclxuICAgICAgICAkaHR0cFxyXG4gICAgICApIHtcclxuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XHJcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xyXG4gICAgICAgICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgcmVzb3VyY2VOYW1lID0gJ3Jlc291cmNlJztcclxuICAgICAgICB2YXIgbWV0aG9kTmFtZSA9ICcnO1xyXG4gICAgICAgIHZhciBsb2FkZXIgPSBGb3JtaW9TY29wZS5yZWdpc3Rlcigkc2NvcGUsICRlbGVtZW50LCB7XHJcbiAgICAgICAgICBmb3JtOiB0cnVlLFxyXG4gICAgICAgICAgc3VibWlzc2lvbjogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAobG9hZGVyKSB7XHJcbiAgICAgICAgICByZXNvdXJjZU5hbWUgPSBsb2FkZXIuc3VibWlzc2lvbklkID8gJ3N1Ym1pc3Npb24nIDogJ2Zvcm0nO1xyXG4gICAgICAgICAgdmFyIHJlc291cmNlVGl0bGUgPSByZXNvdXJjZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICBtZXRob2ROYW1lID0gJ2RlbGV0ZScgKyByZXNvdXJjZVRpdGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IHRoZSByZXNvdXJjZSBuYW1lXHJcbiAgICAgICAgJHNjb3BlLl9yZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWU7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBkZWxldGUgY2FwYWJpbGl0eS5cclxuICAgICAgICAkc2NvcGUub25EZWxldGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIC8vIFJlYnVpbGQgcmVzb3VyY2VUaXRsZSwgJHNjb3BlLnJlc291cmNlTmFtZSBjb3VsZCBoYXZlIGNoYW5nZWRcclxuICAgICAgICAgIHZhciByZXNvdXJjZU5hbWUgPSAkc2NvcGUucmVzb3VyY2VOYW1lIHx8ICRzY29wZS5fcmVzb3VyY2VOYW1lO1xyXG4gICAgICAgICAgdmFyIHJlc291cmNlVGl0bGUgPSByZXNvdXJjZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgZGVsZXRlIGlzIGRvbmUuXHJcbiAgICAgICAgICB2YXIgb25EZWxldGVEb25lID0gZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IHJlc291cmNlVGl0bGUgKyAnIHdhcyBkZWxldGVkLidcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZGVsZXRlJywgZGF0YSk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSgkc2NvcGUuYWN0aW9uKS5zdWNjZXNzKG9uRGVsZXRlRG9uZSkuZXJyb3IoRm9ybWlvU2NvcGUub25FcnJvcigkc2NvcGUsICRlbGVtZW50KSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIGlmIChsb2FkZXIpIHtcclxuICAgICAgICAgICAgaWYgKCFtZXRob2ROYW1lKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbG9hZGVyW21ldGhvZE5hbWVdICE9PSAnZnVuY3Rpb24nKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxvYWRlclttZXRob2ROYW1lXSgpLnRoZW4ob25EZWxldGVEb25lLCBGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5vbkNhbmNlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdjYW5jZWwnKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnJGNvbXBpbGUnLFxyXG4gICckdGVtcGxhdGVDYWNoZScsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICAkY29tcGlsZSxcclxuICAgICR0ZW1wbGF0ZUNhY2hlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgICAgZWxlbWVudC5yZXBsYWNlV2l0aCgkY29tcGlsZSgkdGVtcGxhdGVDYWNoZS5nZXQoc2NvcGUudGVtcGxhdGUpKShzY29wZSkpO1xyXG4gICAgICAgIHNjb3BlLiRlbWl0KCdmb3JtRWxlbWVudFJlbmRlcicsIGVsZW1lbnQpO1xyXG4gICAgICB9LFxyXG4gICAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICAgJyRzY29wZScsXHJcbiAgICAgICAgZnVuY3Rpb24oXHJcbiAgICAgICAgICAkc2NvcGVcclxuICAgICAgICApIHtcclxuICAgICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCdkYXRhLicgKyAkc2NvcGUuY29tcG9uZW50LmtleSwgZnVuY3Rpb24oX25ldywgX29sZCkge1xyXG4gICAgICAgICAgICBpZiAoX25ldyAhPT0gX29sZCkge1xyXG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkRhdGFVcGRhdGUnLCAkc2NvcGUuY29tcG9uZW50LmtleSwgJHNjb3BlLmRhdGFbJHNjb3BlLmNvbXBvbmVudC5rZXldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBzY29wZTogZmFsc2UsXHJcbiAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8vZXJyb3JzLmh0bWwnXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHNjb3BlOiB7XHJcbiAgICAgIGZvcm06ICc9JyxcclxuICAgICAgc3VibWlzc2lvbjogJz0nLFxyXG4gICAgICBpZ25vcmU6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9zdWJtaXNzaW9uLmh0bWwnXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHNjb3BlOiB7XHJcbiAgICAgIHNyYzogJz0/JyxcclxuICAgICAgZm9ybTogJz0/JyxcclxuICAgICAgc3VibWlzc2lvbnM6ICc9PycsXHJcbiAgICAgIHBlclBhZ2U6ICc9PydcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby9zdWJtaXNzaW9ucy5odG1sJyxcclxuICAgIGNvbnRyb2xsZXI6IFtcclxuICAgICAgJyRzY29wZScsXHJcbiAgICAgICckZWxlbWVudCcsXHJcbiAgICAgICdGb3JtaW9TY29wZScsXHJcbiAgICAgIGZ1bmN0aW9uKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkZWxlbWVudCxcclxuICAgICAgICBGb3JtaW9TY29wZVxyXG4gICAgICApIHtcclxuICAgICAgICAkc2NvcGUuX3NyYyA9ICRzY29wZS5zcmMgfHwgJyc7XHJcbiAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgIC8vIFNob3dzIHRoZSBnaXZlbiBhbGVydHMgKHNpbmdsZSBvciBhcnJheSksIGFuZCBkaXNtaXNzZXMgb2xkIGFsZXJ0c1xyXG4gICAgICAgIHRoaXMuc2hvd0FsZXJ0cyA9ICRzY29wZS5zaG93QWxlcnRzID0gZnVuY3Rpb24oYWxlcnRzKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzID0gW10uY29uY2F0KGFsZXJ0cyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLnBlclBhZ2UgPSAkc2NvcGUucGVyUGFnZSA9PT0gdW5kZWZpbmVkID8gMTAgOiAkc2NvcGUucGVyUGFnZTtcclxuICAgICAgICAkc2NvcGUuZm9ybWlvID0gRm9ybWlvU2NvcGUucmVnaXN0ZXIoJHNjb3BlLCAkZWxlbWVudCwge1xyXG4gICAgICAgICAgZm9ybTogdHJ1ZSxcclxuICAgICAgICAgIHN1Ym1pc3Npb25zOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IDE7XHJcbiAgICAgICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZSkge1xyXG4gICAgICAgICAgJHNjb3BlLnNraXAgPSAocGFnZSAtIDEpICogJHNjb3BlLnBlclBhZ2U7XHJcbiAgICAgICAgICAkc2NvcGUudXBkYXRlU3VibWlzc2lvbnMoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcbiAgICAgICAgICByZXR1cm4gIWNvbXBvbmVudC5oYXNPd25Qcm9wZXJ0eSgndGFibGVWaWV3JykgfHwgY29tcG9uZW50LnRhYmxlVmlldztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdzdWJtaXNzaW9ucycsIGZ1bmN0aW9uKHN1Ym1pc3Npb25zKSB7XHJcbiAgICAgICAgICBpZiAoc3VibWlzc2lvbnMgJiYgc3VibWlzc2lvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25Mb2FkJywgJHNjb3BlLnN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby13aXphcmQuaHRtbCcsXHJcbiAgICBzY29wZToge1xyXG4gICAgICBzcmM6ICc9PycsXHJcbiAgICAgIGZvcm1BY3Rpb246ICc9PycsXHJcbiAgICAgIGZvcm06ICc9PycsXHJcbiAgICAgIHN1Ym1pc3Npb246ICc9PycsXHJcbiAgICAgIHJlYWRPbmx5OiAnPT8nLFxyXG4gICAgICBoaWRlQ29tcG9uZW50czogJz0/JyxcclxuICAgICAgZm9ybWlvT3B0aW9uczogJz0/JyxcclxuICAgICAgc3RvcmFnZTogJz0/J1xyXG4gICAgfSxcclxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICBzY29wZS53aXphcmRMb2FkZWQgPSBmYWxzZTtcclxuICAgICAgc2NvcGUud2l6YXJkRWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgnLmZvcm1pby13aXphcmQnLCBlbGVtZW50KTtcclxuICAgIH0sXHJcbiAgICBjb250cm9sbGVyOiBbXHJcbiAgICAgICckc2NvcGUnLFxyXG4gICAgICAnJGNvbXBpbGUnLFxyXG4gICAgICAnJGVsZW1lbnQnLFxyXG4gICAgICAnRm9ybWlvJyxcclxuICAgICAgJ0Zvcm1pb1Njb3BlJyxcclxuICAgICAgJ0Zvcm1pb1V0aWxzJyxcclxuICAgICAgJyRodHRwJyxcclxuICAgICAgZnVuY3Rpb24gKFxyXG4gICAgICAgICRzY29wZSxcclxuICAgICAgICAkY29tcGlsZSxcclxuICAgICAgICAkZWxlbWVudCxcclxuICAgICAgICBGb3JtaW8sXHJcbiAgICAgICAgRm9ybWlvU2NvcGUsXHJcbiAgICAgICAgRm9ybWlvVXRpbHMsXHJcbiAgICAgICAgJGh0dHBcclxuICAgICAgKSB7XHJcbiAgICAgICAgdmFyIHNlc3Npb24gPSAkc2NvcGUuc3RvcmFnZSA/IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCRzY29wZS5zdG9yYWdlKSA6IGZhbHNlO1xyXG4gICAgICAgIGlmIChzZXNzaW9uKSB7XHJcbiAgICAgICAgICBzZXNzaW9uID0gYW5ndWxhci5mcm9tSnNvbihzZXNzaW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRzY29wZS5mb3JtaW8gPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5wYWdlID0ge307XHJcbiAgICAgICAgJHNjb3BlLmZvcm0gPSB7fTtcclxuICAgICAgICAkc2NvcGUucGFnZXMgPSBbXTtcclxuICAgICAgICAkc2NvcGUuY29sY2xhc3MgPSAnJztcclxuICAgICAgICBpZiAoISRzY29wZS5zdWJtaXNzaW9uIHx8ICFPYmplY3Qua2V5cygkc2NvcGUuc3VibWlzc2lvbi5kYXRhKS5sZW5ndGgpIHtcclxuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gc2Vzc2lvbiA/IHtkYXRhOiBzZXNzaW9uLmRhdGF9IDoge2RhdGE6IHt9fTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gc2Vzc2lvbiA/IHNlc3Npb24ucGFnZSA6IDA7XHJcblxyXG4gICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXTtcclxuICAgICAgICAvLyBTaG93cyB0aGUgZ2l2ZW4gYWxlcnRzIChzaW5nbGUgb3IgYXJyYXkpLCBhbmQgZGlzbWlzc2VzIG9sZCBhbGVydHNcclxuICAgICAgICB0aGlzLnNob3dBbGVydHMgPSAkc2NvcGUuc2hvd0FsZXJ0cyA9IGZ1bmN0aW9uIChhbGVydHMpIHtcclxuICAgICAgICAgICRzY29wZS5mb3JtaW9BbGVydHMgPSBbXS5jb25jYXQoYWxlcnRzKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsICcnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0ge2RhdGE6IHt9fTtcclxuICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IDA7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gU2hvdyB0aGUgY3VycmVudCBwYWdlLlxyXG4gICAgICAgIHZhciBzaG93UGFnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgcGFnZSBpcyBwYXN0IHRoZSBjb21wb25lbnRzIGxlbmd0aCwgdHJ5IHRvIGNsZWFyIGZpcnN0LlxyXG4gICAgICAgICAgaWYgKCRzY29wZS5jdXJyZW50UGFnZSA+PSAkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAkc2NvcGUud2l6YXJkTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN0b3JhZ2UpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJHNjb3BlLnN0b3JhZ2UsIGFuZ3VsYXIudG9Kc29uKHtcclxuICAgICAgICAgICAgICBwYWdlOiAkc2NvcGUuY3VycmVudFBhZ2UsXHJcbiAgICAgICAgICAgICAgZGF0YTogJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUucGFnZS5jb21wb25lbnRzID0gJHNjb3BlLmZvcm0uY29tcG9uZW50c1skc2NvcGUuY3VycmVudFBhZ2VdLmNvbXBvbmVudHM7XHJcbiAgICAgICAgICB2YXIgcGFnZUVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9ybWlvJykpO1xyXG4gICAgICAgICAgJHNjb3BlLndpemFyZEVsZW1lbnQuaHRtbCgkY29tcGlsZShwYWdlRWxlbWVudC5hdHRyKHtcclxuICAgICAgICAgICAgc3JjOiBcIidcIiArICRzY29wZS5zcmMgKyBcIidcIixcclxuICAgICAgICAgICAgZm9ybTogJ3BhZ2UnLFxyXG4gICAgICAgICAgICBzdWJtaXNzaW9uOiAnc3VibWlzc2lvbicsXHJcbiAgICAgICAgICAgIHJlYWRPbmx5OiAncmVhZE9ubHknLFxyXG4gICAgICAgICAgICBoaWRlQ29tcG9uZW50czogJ2hpZGVDb21wb25lbnRzJyxcclxuICAgICAgICAgICAgZm9ybWlvT3B0aW9uczogJ2Zvcm1pb09wdGlvbnMnLFxyXG4gICAgICAgICAgICBpZDogJ2Zvcm1pby13aXphcmQtZm9ybSdcclxuICAgICAgICAgIH0pKSgkc2NvcGUpKTtcclxuICAgICAgICAgICRzY29wZS53aXphcmRMb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pb0FsZXJ0cyA9IFtdO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmRQYWdlJywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3JzLlxyXG4gICAgICAgICRzY29wZS5jaGVja0Vycm9ycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICghJHNjb3BlLmlzVmFsaWQoKSkge1xyXG4gICAgICAgICAgICAvLyBDaGFuZ2UgYWxsIG9mIHRoZSBmaWVsZHMgdG8gbm90IGJlIHByaXN0aW5lLlxyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJGVsZW1lbnQuZmluZCgnW25hbWU9XCJmb3JtaW9GaWVsZEZvcm1cIl0nKS5jaGlsZHJlbigpLCBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgIHZhciBlbGVtZW50U2NvcGUgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudCkuc2NvcGUoKTtcclxuICAgICAgICAgICAgICB2YXIgZmllbGRGb3JtID0gZWxlbWVudFNjb3BlLmZvcm1pb0ZpZWxkRm9ybTtcclxuICAgICAgICAgICAgICBpZiAoZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XSkge1xyXG4gICAgICAgICAgICAgICAgZmllbGRGb3JtW2VsZW1lbnRTY29wZS5jb21wb25lbnQua2V5XS4kcHJpc3RpbmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkc2NvcGUuZm9ybWlvQWxlcnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZml4IHRoZSBmb2xsb3dpbmcgZXJyb3JzIGJlZm9yZSBwcm9jZWVkaW5nLidcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFN1Ym1pdCB0aGUgc3VibWlzc2lvbi5cclxuICAgICAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBzdWIgPSBhbmd1bGFyLmNvcHkoJHNjb3BlLnN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudCgkc2NvcGUuZm9ybS5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuICAgICAgICAgICAgaWYgKHN1Yi5kYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5rZXkpICYmIChjb21wb25lbnQudHlwZSA9PT0gJ251bWJlcicpKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldKSB7XHJcbiAgICAgICAgICAgICAgICBzdWIuZGF0YVtjb21wb25lbnQua2V5XSA9IHBhcnNlRmxvYXQoc3ViLmRhdGFbY29tcG9uZW50LmtleV0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1Yi5kYXRhW2NvbXBvbmVudC5rZXldID0gMDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbihzdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3RvcmFnZSkge1xyXG4gICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCRzY29wZS5zdG9yYWdlLCAnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtU3VibWlzc2lvbicsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyBTYXZlIHRvIHNwZWNpZmllZCBhY3Rpb24uXHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmFjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gc3ViLl9pZCA/ICdwdXQnIDogJ3Bvc3QnO1xyXG4gICAgICAgICAgICAkaHR0cFttZXRob2RdKCRzY29wZS5hY3Rpb24sIHN1Yikuc3VjY2VzcyhmdW5jdGlvbiAoc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgIEZvcm1pby5jbGVhckNhY2hlKCk7XHJcbiAgICAgICAgICAgICAgb25Eb25lKHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICB9KS5lcnJvcihGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKCRzY29wZS5mb3JtaW8pIHtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1pby5zYXZlU3VibWlzc2lvbihzdWIpLnRoZW4ob25Eb25lKS5jYXRjaChGb3JtaW9TY29wZS5vbkVycm9yKCRzY29wZSwgJGVsZW1lbnQpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBvbkRvbmUoc3ViKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XHJcbiAgICAgICAgICBzaG93UGFnZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIE1vdmUgb250byB0aGUgbmV4dCBwYWdlLlxyXG4gICAgICAgICRzY29wZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5jaGVja0Vycm9ycygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFBhZ2UgPj0gKCRzY29wZS5mb3JtLmNvbXBvbmVudHMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlKys7XHJcbiAgICAgICAgICBzaG93UGFnZSgpO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCd3aXphcmROZXh0JywgJHNjb3BlLmN1cnJlbnRQYWdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBNb3ZlIG9udG8gdGhlIHByZXZpb3VzIHBhZ2UuXHJcbiAgICAgICAgJHNjb3BlLnByZXYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLmN1cnJlbnRQYWdlIDwgMSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UtLTtcclxuICAgICAgICAgIHNob3dQYWdlKCk7XHJcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3dpemFyZFByZXYnLCAkc2NvcGUuY3VycmVudFBhZ2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5nb3RvID0gZnVuY3Rpb24gKHBhZ2UpIHtcclxuICAgICAgICAgIGlmIChwYWdlIDwgMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAocGFnZSA+PSAkc2NvcGUuZm9ybS5jb21wb25lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdlO1xyXG4gICAgICAgICAgc2hvd1BhZ2UoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuaXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnI2Zvcm1pby13aXphcmQtZm9ybScpO1xyXG4gICAgICAgICAgaWYgKCFlbGVtZW50Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgZm9ybWlvRm9ybSA9IGVsZW1lbnQuY2hpbGRyZW4oKS5zY29wZSgpLmZvcm1pb0Zvcm07XHJcbiAgICAgICAgICByZXR1cm4gZm9ybWlvRm9ybS4kdmFsaWQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiRvbignd2l6YXJkR29Ub1BhZ2UnLCBmdW5jdGlvbiAoZXZlbnQsIHBhZ2UpIHtcclxuICAgICAgICAgICRzY29wZS5nb3RvKHBhZ2UpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgc2V0Rm9ybSA9IGZ1bmN0aW9uKGZvcm0pIHtcclxuICAgICAgICAgICRzY29wZS5wYWdlcyA9IFtdO1xyXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcblxyXG4gICAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgcGFuZWxzIGZvciB0aGUgcGFnZXMuXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQudHlwZSA9PT0gJ3BhbmVsJykge1xyXG4gICAgICAgICAgICAgICRzY29wZS5wYWdlcy5wdXNoKGNvbXBvbmVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICRzY29wZS5mb3JtID0gZm9ybTtcclxuICAgICAgICAgICRzY29wZS5mb3JtLmNvbXBvbmVudHMgPSAkc2NvcGUucGFnZXM7XHJcbiAgICAgICAgICAkc2NvcGUucGFnZSA9IGFuZ3VsYXIuY29weShmb3JtKTtcclxuICAgICAgICAgICRzY29wZS5wYWdlLmRpc3BsYXkgPSAnZm9ybSc7XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnBhZ2VzLmxlbmd0aCA+IDYpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1hcmdpbiA9ICgoMSAtICgkc2NvcGUucGFnZXMubGVuZ3RoICogMC4wODMzMzMzMzMzKSkgLyAyKSAqIDEwMDtcclxuICAgICAgICAgICAgJHNjb3BlLmNvbGNsYXNzID0gJ2NvbC1zbS0xJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAkc2NvcGUubWFyZ2luID0gKCgxIC0gKCRzY29wZS5wYWdlcy5sZW5ndGggKiAwLjE2NjY2NjY2NjcpKSAvIDIpICogMTAwO1xyXG4gICAgICAgICAgICAkc2NvcGUuY29sY2xhc3MgPSAnY29sLXNtLTInO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICRzY29wZS4kZW1pdCgnd2l6YXJkRm9ybUxvYWQnLCBmb3JtKTtcclxuICAgICAgICAgIHNob3dQYWdlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gTG9hZCB0aGUgZm9ybS5cclxuICAgICAgICBpZiAoJHNjb3BlLnNyYykge1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbiAoZm9ybSkge1xyXG4gICAgICAgICAgICBzZXRGb3JtKGZvcm0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgJHNjb3BlLnNyYyA9ICcnO1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1pbyA9IG5ldyBGb3JtaW8oJHNjb3BlLnNyYyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnRm9ybWlvJyxcclxuICAnZm9ybWlvQ29tcG9uZW50cycsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICBGb3JtaW8sXHJcbiAgICBmb3JtaW9Db21wb25lbnRzXHJcbiAgKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbkVycm9yOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1ZhbGlkYXRpb25FcnJvcicpIHtcclxuICAgICAgICAgICAgJGVsZW1lbnQuZmluZCgnI2Zvcm0tZ3JvdXAtJyArIGVycm9yLmRldGFpbHNbMF0ucGF0aCkuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdWYWxpZGF0aW9uRXJyb3I6ICcgKyBlcnJvci5kZXRhaWxzWzBdLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICRzY29wZS5zaG93QWxlcnRzKHtcclxuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICBlcnJvciA9IEpTT04uc3RyaW5naWZ5KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0cyh7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1FcnJvcicsIGVycm9yKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgICAgIHZhciBsb2FkZXIgPSBudWxsO1xyXG4gICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgJHNjb3BlLmZvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZCgkc2NvcGUuZm9ybSkgPyAkc2NvcGUuZm9ybSA6IHt9O1xyXG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLnN1Ym1pc3Npb24pID8gJHNjb3BlLnN1Ym1pc3Npb24gOiB7ZGF0YToge319O1xyXG4gICAgICAgICRzY29wZS5zdWJtaXNzaW9ucyA9IGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5zdWJtaXNzaW9ucykgPyAkc2NvcGUuc3VibWlzc2lvbnMgOiBbXTtcclxuXHJcbiAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZWxlbWVudHMgcmVuZGVyZWQuXHJcbiAgICAgICAgdmFyIGVsZW1lbnRzUmVuZGVyZWQgPSAwO1xyXG4gICAgICAgICRzY29wZS4kb24oJ2Zvcm1FbGVtZW50UmVuZGVyJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBlbGVtZW50c1JlbmRlcmVkKys7XHJcbiAgICAgICAgICBpZiAoZWxlbWVudHNSZW5kZXJlZCA9PT0gJHNjb3BlLmZvcm0uY29tcG9uZW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1SZW5kZXInLCAkc2NvcGUuZm9ybSk7XHJcbiAgICAgICAgICAgIH0sIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBVc2VkIHRvIHNldCB0aGUgZm9ybSBhY3Rpb24uXHJcbiAgICAgICAgdmFyIGdldEFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xyXG4gICAgICAgICAgaWYgKCFhY3Rpb24pIHJldHVybiAnJztcclxuICAgICAgICAgIGlmICgkc2NvcGUuYWN0aW9uKSByZXR1cm4gJyc7XHJcbiAgICAgICAgICBpZiAoYWN0aW9uLnN1YnN0cigwLCAxKSA9PT0gJy8nKSB7XHJcbiAgICAgICAgICAgIGFjdGlvbiA9IEZvcm1pby5nZXRCYXNlVXJsKCkgKyBhY3Rpb247XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gYWN0aW9uO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgYWN0aW9uLlxyXG4gICAgICAgICRzY29wZS5hY3Rpb24gPSBnZXRBY3Rpb24oJHNjb3BlLmZvcm1BY3Rpb24pO1xyXG5cclxuICAgICAgICAvLyBBbGxvdyBzdWIgY29tcG9uZW50cyB0aGUgYWJpbGl0eSB0byBhZGQgbmV3IGZvcm0gY29tcG9uZW50cyB0byB0aGUgZm9ybS5cclxuICAgICAgICB2YXIgYWRkZWREYXRhID0ge307XHJcbiAgICAgICAgJHNjb3BlLiRvbignYWRkRm9ybUNvbXBvbmVudCcsIGZ1bmN0aW9uKGV2ZW50LCBjb21wb25lbnQpIHtcclxuICAgICAgICAgIGlmICghYWRkZWREYXRhLmhhc093blByb3BlcnR5KGNvbXBvbmVudC5zZXR0aW5ncy5rZXkpKSB7XHJcbiAgICAgICAgICAgIGFkZGVkRGF0YVtjb21wb25lbnQuc2V0dGluZ3Mua2V5XSA9IHRydWU7XHJcbiAgICAgICAgICAgIHZhciBkZWZhdWx0Q29tcG9uZW50ID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm0uY29tcG9uZW50cy5wdXNoKGFuZ3VsYXIuZXh0ZW5kKGRlZmF1bHRDb21wb25lbnQuc2V0dGluZ3MsIGNvbXBvbmVudC5zZXR0aW5ncykpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTZXQgdGhlIGFjdGlvbiBpZiB0aGV5IHByb3ZpZGVkIGl0IGluIHRoZSBmb3JtLlxyXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2Zvcm0uYWN0aW9uJywgZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcclxuICAgICAgICAgIHZhciBhY3Rpb24gPSBnZXRBY3Rpb24odmFsdWUpO1xyXG4gICAgICAgICAgaWYgKGFjdGlvbikge1xyXG4gICAgICAgICAgICAkc2NvcGUuYWN0aW9uID0gYWN0aW9uO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdmb3JtJywgZnVuY3Rpb24oZm9ybSkge1xyXG4gICAgICAgICAgaWYgKCFmb3JtIHx8IChPYmplY3Qua2V5cyhmb3JtKS5sZW5ndGggPT09IDApKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdmb3JtTG9hZCcsICRzY29wZS5mb3JtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgaWYgKCRzY29wZS5wZXJQYWdlKSBwYXJhbXMubGltaXQgPSAkc2NvcGUucGVyUGFnZTtcclxuICAgICAgICAgIGlmICgkc2NvcGUuc2tpcCkgcGFyYW1zLnNraXAgPSAkc2NvcGUuc2tpcDtcclxuICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbnMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9ucykge1xyXG4gICAgICAgICAgICBhbmd1bGFyLm1lcmdlKCRzY29wZS5zdWJtaXNzaW9ucywgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb25zKSk7XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25zTG9hZCcsIHN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH0sIHRoaXMub25FcnJvcigkc2NvcGUpKTtcclxuICAgICAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgICAgIGlmICgkc2NvcGUuX3NyYykge1xyXG4gICAgICAgICAgbG9hZGVyID0gbmV3IEZvcm1pbygkc2NvcGUuX3NyYyk7XHJcbiAgICAgICAgICBpZiAob3B0aW9ucy5mb3JtKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBhIGZvcm0gaXMgYWxyZWFkeSBwcm92aWRlZCwgdGhlbiBza2lwIHRoZSBsb2FkLlxyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLmZvcm0gJiYgT2JqZWN0LmtleXMoJHNjb3BlLmZvcm0pLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZm9ybUxvYWQnLCAkc2NvcGUuZm9ybSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgbG9hZGVyLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XHJcbiAgICAgICAgICAgICAgICBhbmd1bGFyLm1lcmdlKCRzY29wZS5mb3JtLCBhbmd1bGFyLmNvcHkoZm9ybSkpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1Mb2FkJywgZm9ybSk7XHJcbiAgICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKCRzY29wZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAob3B0aW9ucy5zdWJtaXNzaW9uICYmIGxvYWRlci5zdWJtaXNzaW9uSWQpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmZvcm1Mb2FkaW5nID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGEgc3VibWlzc2lvbiBpcyBhbHJlYWR5IHByb3ZpZGVkLCB0aGVuIHNraXAgdGhlIGxvYWQuXHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc3VibWlzc2lvbiAmJiBPYmplY3Qua2V5cygkc2NvcGUuc3VibWlzc2lvbi5kYXRhKS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuZm9ybUxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ3N1Ym1pc3Npb25Mb2FkJywgJHNjb3BlLnN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvYWRlci5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xyXG4gICAgICAgICAgICAgICAgYW5ndWxhci5tZXJnZSgkc2NvcGUuc3VibWlzc2lvbiwgYW5ndWxhci5jb3B5KHN1Ym1pc3Npb24pKTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRlbWl0KCdzdWJtaXNzaW9uTG9hZCcsIHN1Ym1pc3Npb24pO1xyXG4gICAgICAgICAgICAgIH0sIHRoaXMub25FcnJvcigkc2NvcGUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3VibWlzc2lvbnMpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVN1Ym1pc3Npb25zKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgJHNjb3BlLmZvcm1vTG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICRzY29wZS5mb3JtTG9hZGluZyA9ICRzY29wZS5mb3JtICYmIChPYmplY3Qua2V5cygkc2NvcGUuZm9ybSkubGVuZ3RoID09PSAwKTtcclxuXHJcbiAgICAgICAgICAvLyBFbWl0IHRoZSBldmVudHMgaWYgdGhlc2Ugb2JqZWN0cyBhcmUgYWxyZWFkeSBsb2FkZWQuXHJcbiAgICAgICAgICBpZiAoISRzY29wZS5mb3JtTG9hZGluZykge1xyXG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Zvcm1Mb2FkJywgJHNjb3BlLmZvcm0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCRzY29wZS5zdWJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbkxvYWQnLCAkc2NvcGUuc3VibWlzc2lvbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoJHNjb3BlLnN1Ym1pc3Npb25zKSB7XHJcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnc3VibWlzc2lvbnNMb2FkJywgJHNjb3BlLnN1Ym1pc3Npb25zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJldHVybiB0aGUgbG9hZGVyLlxyXG4gICAgICAgIHJldHVybiBsb2FkZXI7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBmb3JtaW9VdGlscyA9IHJlcXVpcmUoJ2Zvcm1pby11dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgZmxhdHRlbkNvbXBvbmVudHM6IGZvcm1pb1V0aWxzLmZsYXR0ZW5Db21wb25lbnRzLFxyXG4gICAgZWFjaENvbXBvbmVudDogZm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudCxcclxuICAgIGdldENvbXBvbmVudDogZm9ybWlvVXRpbHMuZ2V0Q29tcG9uZW50LFxyXG4gICAgaGlkZUZpZWxkczogZnVuY3Rpb24oZm9ybSwgY29tcG9uZW50cykge1xyXG4gICAgICB0aGlzLmVhY2hDb21wb25lbnQoZm9ybS5jb21wb25lbnRzLCBmdW5jdGlvbiAoY29tcG9uZW50KSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSBpbiBjb21wb25lbnRzKSB7XHJcbiAgICAgICAgICBpZiAoY29tcG9uZW50LmtleSA9PT0gY29tcG9uZW50c1tpXSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnQudHlwZSA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgZmllbGRXcmFwOiBmdW5jdGlvbihpbnB1dCkge1xyXG4gICAgICBpbnB1dCA9IGlucHV0ICsgJzxmb3JtaW8tZXJyb3JzPjwvZm9ybWlvLWVycm9ycz4nO1xyXG4gICAgICB2YXIgbXVsdGlJbnB1dCA9IGlucHV0LnJlcGxhY2UoJ2RhdGFbY29tcG9uZW50LmtleV0nLCAnZGF0YVtjb21wb25lbnQua2V5XVskaW5kZXhdJyk7XHJcbiAgICAgIHZhciBpbnB1dExhYmVsID0gJzxsYWJlbCBuZy1pZj1cImNvbXBvbmVudC5sYWJlbCAmJiAhY29tcG9uZW50LmhpZGVMYWJlbFwiIGZvcj1cInt7IGNvbXBvbmVudC5rZXkgfX1cIiBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBuZy1jbGFzcz1cIntcXCdmaWVsZC1yZXF1aXJlZFxcJzogY29tcG9uZW50LnZhbGlkYXRlLnJlcXVpcmVkfVwiPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvbGFiZWw+JztcclxuICAgICAgdmFyIHJlcXVpcmVkSW5saW5lID0gJzxzcGFuIG5nLWlmPVwiIWNvbXBvbmVudC5sYWJlbCAmJiBjb21wb25lbnQudmFsaWRhdGUucmVxdWlyZWRcIiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2sgZm9ybS1jb250cm9sLWZlZWRiYWNrIGZpZWxkLXJlcXVpcmVkLWlubGluZVwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj4nO1xyXG4gICAgICB2YXIgdGVtcGxhdGUgPVxyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5tdWx0aXBsZVwiPicgK1xyXG4gICAgICAgIGlucHV0TGFiZWwgKyByZXF1aXJlZElubGluZSArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiIG5nLWlmPVwiY29tcG9uZW50LnByZWZpeCB8fCBjb21wb25lbnQuc3VmZml4XCI+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1hZGRvblwiIG5nLWlmPVwiISFjb21wb25lbnQucHJlZml4XCI+e3sgY29tcG9uZW50LnByZWZpeCB9fTwvZGl2PicgK1xyXG4gICAgICAgIGlucHV0ICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5wcmVmaXggJiYgIWNvbXBvbmVudC5zdWZmaXhcIj4nICsgaW5wdXQgKyAnPC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiY29tcG9uZW50Lm11bHRpcGxlXCI+PHRhYmxlIGNsYXNzPVwidGFibGUgdGFibGUtYm9yZGVyZWRcIj4nICtcclxuICAgICAgICBpbnB1dExhYmVsICtcclxuICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInZhbHVlIGluIGRhdGFbY29tcG9uZW50LmtleV0gdHJhY2sgYnkgJGluZGV4XCI+JyArXHJcbiAgICAgICAgJzx0ZD4nICsgcmVxdWlyZWRJbmxpbmUgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIiBuZy1pZj1cImNvbXBvbmVudC5wcmVmaXggfHwgY29tcG9uZW50LnN1ZmZpeFwiPicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb25cIiBuZy1pZj1cIiEhY29tcG9uZW50LnByZWZpeFwiPnt7IGNvbXBvbmVudC5wcmVmaXggfX08L2Rpdj4nICtcclxuICAgICAgICBtdWx0aUlucHV0ICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCIgbmctaWY9XCIhIWNvbXBvbmVudC5zdWZmaXhcIj57eyBjb21wb25lbnQuc3VmZml4IH19PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IG5nLWlmPVwiIWNvbXBvbmVudC5wcmVmaXggJiYgIWNvbXBvbmVudC5zdWZmaXhcIj4nICsgbXVsdGlJbnB1dCArICc8L2Rpdj4nICtcclxuICAgICAgICAnPC90ZD4nICtcclxuICAgICAgICAnPHRkPjxhIG5nLWNsaWNrPVwicmVtb3ZlRmllbGRWYWx1ZSgkaW5kZXgpXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHRcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlLWNpcmNsZVwiPjwvc3Bhbj48L2E+PC90ZD4nICtcclxuICAgICAgICAnPC90cj4nICtcclxuICAgICAgICAnPHRyPicgK1xyXG4gICAgICAgICc8dGQgY29sc3Bhbj1cIjJcIj48YSBuZy1jbGljaz1cImFkZEZpZWxkVmFsdWUoKVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+IHt7IGNvbXBvbmVudC5hZGRBbm90aGVyIHx8IFwiQWRkIEFub3RoZXJcIiB9fTwvYT48L3RkPicgK1xyXG4gICAgICAgICc8L3RyPicgK1xyXG4gICAgICAgICc8L3RhYmxlPjwvZGl2Pic7XHJcbiAgICAgIHJldHVybiB0ZW1wbGF0ZTtcclxuICAgIH1cclxuICB9O1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICckcScsXHJcbiAgJyRyb290U2NvcGUnLFxyXG4gICdGb3JtaW8nLFxyXG4gIGZ1bmN0aW9uKCRxLCAkcm9vdFNjb3BlLCBGb3JtaW8pIHtcclxuICAgIHZhciBJbnRlcmNlcHRvciA9IHtcclxuICAgICAgLyoqXHJcbiAgICAgICAqIFVwZGF0ZSBKV1QgdG9rZW4gcmVjZWl2ZWQgZnJvbSByZXNwb25zZS5cclxuICAgICAgICovXHJcbiAgICAgIHJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgIHZhciB0b2tlbiA9IHJlc3BvbnNlLmhlYWRlcnMoJ3gtand0LXRva2VuJyk7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwICYmIHRva2VuICYmIHRva2VuICE9PSAnJykge1xyXG4gICAgICAgICAgRm9ybWlvLnNldFRva2VuKHRva2VuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIEludGVyY2VwdCBhIHJlc3BvbnNlIGVycm9yLlxyXG4gICAgICAgKi9cclxuICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAocGFyc2VJbnQocmVzcG9uc2Uuc3RhdHVzLCAxMCkgPT09IDQ0MCkge1xyXG4gICAgICAgICAgcmVzcG9uc2UubG9nZ2VkT3V0ID0gdHJ1ZTtcclxuICAgICAgICAgIEZvcm1pby5zZXRUb2tlbihudWxsKTtcclxuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgcmVzcG9uc2UuYm9keSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHBhcnNlSW50KHJlc3BvbnNlLnN0YXR1cywgMTApID09PSA0MDEpIHtcclxuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZm9ybWlvLnVuYXV0aG9yaXplZCcsIHJlc3BvbnNlLmJvZHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBTZXQgdGhlIHRva2VuIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuXHJcbiAgICAgICAqL1xyXG4gICAgICByZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcclxuICAgICAgICBpZiAoY29uZmlnLmRpc2FibGVKV1QpIHJldHVybiBjb25maWc7XHJcbiAgICAgICAgdmFyIHRva2VuID0gRm9ybWlvLmdldFRva2VuKCk7XHJcbiAgICAgICAgaWYgKHRva2VuKSBjb25maWcuaGVhZGVyc1sneC1qd3QtdG9rZW4nXSA9IHRva2VuO1xyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIEludGVyY2VwdG9yO1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnRm9ybWlvJyxcclxuICAnZm9ybWlvQ29tcG9uZW50cycsXHJcbiAgJyRpbnRlcnBvbGF0ZScsXHJcbiAgZnVuY3Rpb24oXHJcbiAgICBGb3JtaW8sXHJcbiAgICBmb3JtaW9Db21wb25lbnRzLFxyXG4gICAgJGludGVycG9sYXRlXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGNvbXBvbmVudCkge1xyXG4gICAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBjb21wb25lbnRJbmZvID0gZm9ybWlvQ29tcG9uZW50cy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXTtcclxuICAgICAgaWYgKCFjb21wb25lbnRJbmZvLnRhYmxlVmlldykge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoY29tcG9uZW50Lm11bHRpcGxlICYmICh2YWx1ZS5sZW5ndGggPiAwKSkge1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgICBhbmd1bGFyLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uKGFycmF5VmFsdWUpIHtcclxuICAgICAgICAgIHZhbHVlcy5wdXNoKGNvbXBvbmVudEluZm8udGFibGVWaWV3KGFycmF5VmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gY29tcG9uZW50SW5mby50YWJsZVZpZXcodmFsdWUsIGNvbXBvbmVudCwgJGludGVycG9sYXRlKTtcclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICdGb3JtaW9VdGlscycsXHJcbiAgZnVuY3Rpb24oRm9ybWlvVXRpbHMpIHtcclxuICAgIHJldHVybiBGb3JtaW9VdGlscy5mbGF0dGVuQ29tcG9uZW50cztcclxuICB9XHJcbl07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJyRodHRwJywgJ0FwcENvbmZpZycsXHJcbiAgZnVuY3Rpb24oJGh0dHAsIEFwcENvbmZpZykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbXBvbmVudCwgbGFuZyl7XHJcbiAgICBcdCRodHRwLmdldChBcHBDb25maWcubGFuZ3VhZ2VVcmwgKyAnLycgKyBsYW5nICsnLmpzb24nKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHJlc3BvbnNlLmRhdGEsIGZ1bmN0aW9uKGtleTEsIHZhbHVlMSkge1xyXG4gICAgICAgICAgaWYoY29tcG9uZW50LmtleSA9PSB2YWx1ZTEpIHtcclxuICAgICAgICAgICAgY29tcG9uZW50LmxhYmVsID0ga2V5MTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBjb21wb25lbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICckc2NlJyxcclxuICBmdW5jdGlvbihcclxuICAgICRzY2VcclxuICApIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihodG1sKSB7XHJcbiAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xyXG4gICAgfTtcclxuICB9XHJcbl07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgJ0Zvcm1pb1V0aWxzJyxcclxuICBmdW5jdGlvbihGb3JtaW9VdGlscykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbXBvbmVudHMpIHtcclxuICAgICAgdmFyIHRhYmxlQ29tcHMgPSBbXTtcclxuICAgICAgaWYgKCFjb21wb25lbnRzIHx8ICFjb21wb25lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiB0YWJsZUNvbXBzO1xyXG4gICAgICB9XHJcbiAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcbiAgICAgICAgaWYgKGNvbXBvbmVudC50YWJsZVZpZXcgJiYgY29tcG9uZW50LmtleSkge1xyXG4gICAgICAgICAgdGFibGVDb21wcy5wdXNoKGNvbXBvbmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHRhYmxlQ29tcHM7XHJcbiAgICB9O1xyXG4gIH1cclxuXTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IFtcclxuICAnZm9ybWlvVGFibGVWaWV3JyxcclxuICBmdW5jdGlvbihcclxuICAgIGZvcm1pb1RhYmxlVmlld1xyXG4gICkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBjb21wb25lbnQpIHtcclxuICAgICAgcmV0dXJuIGZvcm1pb1RhYmxlVmlldyh2YWx1ZSwgY29tcG9uZW50KTtcclxuICAgIH07XHJcbiAgfVxyXG5dO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICdGb3JtaW8nLFxyXG4gICdmb3JtaW9UYWJsZVZpZXcnLFxyXG4gIGZ1bmN0aW9uKFxyXG4gICAgRm9ybWlvLFxyXG4gICAgZm9ybWlvVGFibGVWaWV3XHJcbiAgKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0YSwgY29tcG9uZW50KSB7XHJcbiAgICAgIHJldHVybiBmb3JtaW9UYWJsZVZpZXcoRm9ybWlvLmZpZWxkRGF0YShkYXRhLCBjb21wb25lbnQpLCBjb21wb25lbnQpO1xyXG4gICAgfTtcclxuICB9XHJcbl07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xuXHJcblxyXG52YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2Zvcm1pbycsIFtcclxuICAnbmdTYW5pdGl6ZScsXHJcbiAgJ3VpLmJvb3RzdHJhcCcsXHJcbiAgJ3VpLmJvb3RzdHJhcC5kYXRldGltZXBpY2tlcicsXHJcbiAgJ3VpLnNlbGVjdCcsXHJcbiAgJ3VpLm1hc2snLFxyXG4gICdhbmd1bGFyTW9tZW50JyxcclxuICAnbmdGaWxlVXBsb2FkJyxcclxuICAnbmdGaWxlU2F2ZXInXHJcbl0pO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSB0aGUgZm9ybWlvIHByb3ZpZGVycy5cclxuICovXHJcbmFwcC5wcm92aWRlcignRm9ybWlvJywgcmVxdWlyZSgnLi9wcm92aWRlcnMvRm9ybWlvJykpO1xyXG5cclxuYXBwLnByb3ZpZGVyKCdGb3JtaW9QbHVnaW5zJywgcmVxdWlyZSgnLi9wcm92aWRlcnMvRm9ybWlvUGx1Z2lucycpKTtcclxuXHJcbi8qKlxyXG4gKiBQcm92aWRlcyBhIHdheSB0byByZWdzaXRlciB0aGUgRm9ybWlvIHNjb3BlLlxyXG4gKi9cclxuYXBwLmZhY3RvcnkoJ0Zvcm1pb1Njb3BlJywgcmVxdWlyZSgnLi9mYWN0b3JpZXMvRm9ybWlvU2NvcGUnKSk7XHJcblxyXG5hcHAuZmFjdG9yeSgnRm9ybWlvVXRpbHMnLCByZXF1aXJlKCcuL2ZhY3Rvcmllcy9Gb3JtaW9VdGlscycpKTtcclxuXHJcbmFwcC5mYWN0b3J5KCdmb3JtaW9JbnRlcmNlcHRvcicsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL2Zvcm1pb0ludGVyY2VwdG9yJykpO1xyXG5cclxuYXBwLmZhY3RvcnkoJ2Zvcm1pb1RhYmxlVmlldycsIHJlcXVpcmUoJy4vZmFjdG9yaWVzL2Zvcm1pb1RhYmxlVmlldycpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pbycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW8nKSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9EZWxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvRGVsZXRlJykpO1xyXG5cclxuYXBwLmRpcmVjdGl2ZSgnZm9ybWlvRXJyb3JzJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb0Vycm9ycycpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2N1c3RvbVZhbGlkYXRvcicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9jdXN0b21WYWxpZGF0b3InKSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9TdWJtaXNzaW9ucycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9TdWJtaXNzaW9ucycpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb1N1Ym1pc3Npb24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvU3VibWlzc2lvbicpKTtcclxuXHJcbmFwcC5kaXJlY3RpdmUoJ2Zvcm1pb0NvbXBvbmVudCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9mb3JtaW9Db21wb25lbnQnKSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9FbGVtZW50JywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL2Zvcm1pb0VsZW1lbnQnKSk7XHJcblxyXG5hcHAuZGlyZWN0aXZlKCdmb3JtaW9XaXphcmQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9ybWlvV2l6YXJkJykpO1xyXG5cclxuLyoqXHJcbiAqIEZpbHRlciB0byBmbGF0dGVuIGZvcm0gY29tcG9uZW50cy5cclxuICovXHJcbmFwcC5maWx0ZXIoJ2ZsYXR0ZW5Db21wb25lbnRzJywgcmVxdWlyZSgnLi9maWx0ZXJzL2ZsYXR0ZW5Db21wb25lbnRzJykpO1xyXG5hcHAuZmlsdGVyKCd0YWJsZUNvbXBvbmVudHMnLCByZXF1aXJlKCcuL2ZpbHRlcnMvdGFibGVDb21wb25lbnRzJykpO1xyXG5hcHAuZmlsdGVyKCd0YWJsZVZpZXcnLCByZXF1aXJlKCcuL2ZpbHRlcnMvdGFibGVWaWV3JykpO1xyXG5hcHAuZmlsdGVyKCd0YWJsZUZpZWxkVmlldycsIHJlcXVpcmUoJy4vZmlsdGVycy90YWJsZUZpZWxkVmlldycpKTtcclxuYXBwLmZpbHRlcignc2FmZWh0bWwnLCByZXF1aXJlKCcuL2ZpbHRlcnMvc2FmZWh0bWwnKSk7XHJcbmFwcC5maWx0ZXIoJ2kxOG4nLCByZXF1aXJlKCcuL2ZpbHRlcnMvaTE4bicpKTtcclxuXHJcbmFwcC5jb25maWcoW1xyXG4gICckaHR0cFByb3ZpZGVyJyxcclxuICBmdW5jdGlvbihcclxuICAgICRodHRwUHJvdmlkZXJcclxuICApIHtcclxuICAgIGlmICghJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldCkge1xyXG4gICAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0ID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGlzYWJsZSBJRSBjYWNoaW5nIGZvciBHRVQgcmVxdWVzdHMuXHJcbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuZ2V0WydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xyXG4gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmdldC5QcmFnbWEgPSAnbm8tY2FjaGUnO1xyXG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnZm9ybWlvSW50ZXJjZXB0b3InKTtcclxuICB9XHJcbl0pO1xyXG5cclxucmVxdWlyZSgnLi9wbHVnaW5zJykoYXBwKTtcclxuXHJcbmFwcC5ydW4oW1xyXG4gICckdGVtcGxhdGVDYWNoZScsXHJcbiAgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcclxuXHJcbiAgICAvLyBUaGUgdGVtcGxhdGUgZm9yIHRoZSBmb3JtaW8gZm9ybXMuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby5odG1sJyxcclxuICAgICAgXCJcXHJcXG48ZGl2IG5nLWF0dHItZGlyPVxcXCJ7eyBjdXJyZW50TGFuZ3VhZ2UgPT0gJ2FyJyA/ICdydGwnIDogJ2x0cicgfX1cXFwiID5cXHJcXG4gIDxpIHN0eWxlPVxcXCJmb250LXNpemU6IDJlbTtcXFwiIG5nLWlmPVxcXCJmb3JtTG9hZGluZ1xcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaCBnbHlwaGljb24tc3BpblxcXCI+PC9pPlxcclxcbiAgPGZvcm1pby13aXphcmQgbmctaWY9XFxcImZvcm0uZGlzcGxheSA9PT0gJ3dpemFyZCdcXFwiIHNyYz1cXFwic3JjXFxcIiBmb3JtPVxcXCJmb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIiBmb3JtLWFjdGlvbj1cXFwiZm9ybUFjdGlvblxcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seVxcXCIgaGlkZS1jb21wb25lbnRzPVxcXCJoaWRlQ29tcG9uZW50c1xcXCIgZm9ybWlvLW9wdGlvbnM9XFxcImZvcm1pb09wdGlvbnNcXFwiIHN0b3JhZ2U9XFxcImZvcm0ubmFtZVxcXCI+PC9mb3JtaW8td2l6YXJkPlxcclxcbiAgPGZvcm0gbmctaWY9XFxcIiFmb3JtLmRpc3BsYXkgfHwgKGZvcm0uZGlzcGxheSA9PT0gJ2Zvcm0nKVxcXCIgcm9sZT1cXFwiZm9ybVxcXCIgbmFtZT1cXFwiZm9ybWlvRm9ybVxcXCIgbmctc3VibWl0PVxcXCJvblN1Ym1pdChmb3JtaW9Gb3JtKVxcXCIgbm92YWxpZGF0ZT5cXHJcXG4gICAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0c1xcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj5cXHJcXG4gICAgICB7eyBhbGVydC5tZXNzYWdlIH19XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgICA8Zm9ybWlvLWNvbXBvbmVudCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgdHJhY2sgYnkgJGluZGV4XFxcIiBjb21wb25lbnQ9XFxcImNvbXBvbmVudFxcXCIgZGF0YT1cXFwic3VibWlzc2lvbi5kYXRhXFxcIiBmb3JtPVxcXCJmb3JtaW9Gb3JtXFxcIiBmb3JtaW89XFxcImZvcm1pb1xcXCIgcmVhZC1vbmx5PVxcXCJyZWFkT25seSB8fCBjb21wb25lbnQuZGlzYWJsZWRcXFwiPjwvZm9ybWlvLWNvbXBvbmVudD5cXHJcXG4gIDwvZm9ybT5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgKTtcclxuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby13aXphcmQuaHRtbCcsXHJcbiAgICAgIFwiPGRpdj5cXHJcXG4gIDxkaXYgY2xhc3M9XFxcInJvdyBicy13aXphcmRcXFwiIHN0eWxlPVxcXCJib3JkZXItYm90dG9tOjA7XFxcIj5cXHJcXG4gICAgPGRpdiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAoJGluZGV4ID4gY3VycmVudFBhZ2UpLCBhY3RpdmU6ICgkaW5kZXggPT0gY3VycmVudFBhZ2UpLCBjb21wbGV0ZTogKCRpbmRleCA8IGN1cnJlbnRQYWdlKX1cXFwiIGNsYXNzPVxcXCJ7eyBjb2xjbGFzcyB9fSBicy13aXphcmQtc3RlcFxcXCIgbmctcmVwZWF0PVxcXCJwYWdlIGluIHBhZ2VzXFxcIj5cXHJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJ0ZXh0LWNlbnRlciBicy13aXphcmQtc3RlcG51bVxcXCI+e3sgcGFnZS50aXRsZSB9fTwvZGl2PlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzXFxcIj48ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXJcXFwiPjwvZGl2PjwvZGl2PlxcclxcbiAgICAgIDxhIG5nLWNsaWNrPVxcXCJnb3RvKCRpbmRleClcXFwiIGNsYXNzPVxcXCJicy13aXphcmQtZG90XFxcIj48L2E+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuICA8c3R5bGUgdHlwZT1cXFwidGV4dC9jc3NcXFwiPi5icy13aXphcmQgPiAuYnMtd2l6YXJkLXN0ZXA6Zmlyc3QtY2hpbGQgeyBtYXJnaW4tbGVmdDoge3sgbWFyZ2luIH19JTsgfTwvc3R5bGU+XFxyXFxuICA8aSBuZy1zaG93PVxcXCIhd2l6YXJkTG9hZGVkXFxcIiBpZD1cXFwiZm9ybWlvLWxvYWRpbmdcXFwiIHN0eWxlPVxcXCJmb250LXNpemU6IDJlbTtcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2ggZ2x5cGhpY29uLXNwaW5cXFwiPjwvaT5cXHJcXG4gIDxkaXYgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBmb3JtaW9BbGVydHNcXFwiIGNsYXNzPVxcXCJhbGVydCBhbGVydC17eyBhbGVydC50eXBlIH19XFxcIiByb2xlPVxcXCJhbGVydFxcXCI+e3sgYWxlcnQubWVzc2FnZSB9fTwvZGl2PlxcclxcbiAgPGRpdiBjbGFzcz1cXFwiZm9ybWlvLXdpemFyZFxcXCI+PC9kaXY+XFxyXFxuICA8dWwgbmctc2hvdz1cXFwid2l6YXJkTG9hZGVkXFxcIiBjbGFzcz1cXFwibGlzdC1pbmxpbmVcXFwiPlxcclxcbiAgICA8bGk+PGEgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgbmctY2xpY2s9XFxcImNhbmNlbCgpXFxcIj5DYW5jZWw8L2E+PC9saT5cXHJcXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA+IDBcXFwiPjxhIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIG5nLWNsaWNrPVxcXCJwcmV2KClcXFwiPlByZXZpb3VzPC9hPjwvbGk+XFxyXFxuICAgIDxsaSBuZy1pZj1cXFwiY3VycmVudFBhZ2UgPCAoZm9ybS5jb21wb25lbnRzLmxlbmd0aCAtIDEpXFxcIj5cXHJcXG4gICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIG5nLWNsaWNrPVxcXCJuZXh0KClcXFwiPk5leHQ8L2J1dHRvbj5cXHJcXG4gICAgPC9saT5cXHJcXG4gICAgPGxpIG5nLWlmPVxcXCJjdXJyZW50UGFnZSA+PSAoZm9ybS5jb21wb25lbnRzLmxlbmd0aCAtIDEpXFxcIj5cXHJcXG4gICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIG5nLWNsaWNrPVxcXCJzdWJtaXQoKVxcXCI+U3VibWl0IEZvcm08L2J1dHRvbj5cXHJcXG4gICAgPC9saT5cXHJcXG4gIDwvdWw+XFxyXFxuPC9kaXY+XFxyXFxuXCJcclxuICAgICk7XHJcblxyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8tZGVsZXRlLmh0bWwnLFxyXG4gICAgICBcIjxmb3JtIHJvbGU9XFxcImZvcm1cXFwiPlxcclxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0c1xcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj5cXHJcXG4gICAge3sgYWxlcnQubWVzc2FnZSB9fVxcclxcbiAgPC9kaXY+XFxyXFxuICA8aDM+QXJlIHlvdSBzdXJlIHlvdSB3aXNoIHRvIGRlbGV0ZSB0aGUge3sgcmVzb3VyY2VOYW1lIHx8IF9yZXNvdXJjZU5hbWUgfX0/PC9oMz5cXHJcXG4gIDxkaXYgY2xhc3M9XFxcImJ0bi10b29sYmFyXFxcIj5cXHJcXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25EZWxldGUoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyXFxcIj5ZZXM8L2J1dHRvbj5cXHJcXG4gICAgPGJ1dHRvbiBuZy1jbGljaz1cXFwib25DYW5jZWwoKVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+Tm88L2J1dHRvbj5cXHJcXG4gIDwvZGl2PlxcclxcbjwvZm9ybT5cXHJcXG5cIlxyXG4gICAgKTtcclxuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9zdWJtaXNzaW9uLmh0bWwnLFxyXG4gICAgICBcIjx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtc3RyaXBlZCB0YWJsZS1yZXNwb25zaXZlXFxcIj5cXHJcXG4gIDx0ciBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgfCB0YWJsZUNvbXBvbmVudHNcXFwiIG5nLWlmPVxcXCIhaWdub3JlW2NvbXBvbmVudC5rZXldXFxcIj5cXHJcXG4gICAgPHRoPnt7IGNvbXBvbmVudC5sYWJlbCB9fTwvdGg+XFxyXFxuICAgIDx0ZD48ZGl2IG5nLWJpbmQtaHRtbD1cXFwic3VibWlzc2lvbi5kYXRhIHwgdGFibGVWaWV3OmNvbXBvbmVudFxcXCI+PC9kaXY+PC90ZD5cXHJcXG4gIDwvdHI+XFxyXFxuPC90YWJsZT5cXHJcXG5cIlxyXG4gICAgKTtcclxuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9zdWJtaXNzaW9ucy5odG1sJyxcclxuICAgICAgXCI8ZGl2PlxcclxcbiAgPGRpdiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGZvcm1pb0FsZXJ0c1xcXCIgY2xhc3M9XFxcImFsZXJ0IGFsZXJ0LXt7IGFsZXJ0LnR5cGUgfX1cXFwiIHJvbGU9XFxcImFsZXJ0XFxcIj5cXHJcXG4gICAge3sgYWxlcnQubWVzc2FnZSB9fVxcclxcbiAgPC9kaXY+XFxyXFxuICA8dGFibGUgY2xhc3M9XFxcInRhYmxlXFxcIj5cXHJcXG4gICAgPHRoZWFkPlxcclxcbiAgICAgIDx0cj5cXHJcXG4gICAgICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbXBvbmVudCBpbiBmb3JtLmNvbXBvbmVudHMgfCBmbGF0dGVuQ29tcG9uZW50c1xcXCIgbmctaWY9XFxcInRhYmxlVmlldyhjb21wb25lbnQpXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fTwvdGg+XFxyXFxuICAgICAgICA8dGg+U3VibWl0dGVkPC90aD5cXHJcXG4gICAgICAgIDx0aD5VcGRhdGVkPC90aD5cXHJcXG4gICAgICAgIDx0aD5PcGVyYXRpb25zPC90aD5cXHJcXG4gICAgICA8L3RyPlxcclxcbiAgICA8L3RoZWFkPlxcclxcbiAgICA8dGJvZHk+XFxyXFxuICAgICAgPHRyIG5nLXJlcGVhdD1cXFwic3VibWlzc2lvbiBpbiBzdWJtaXNzaW9uc1xcXCIgY2xhc3M9XFxcImZvcm1pby1zdWJtaXNzaW9uXFxcIiBuZy1jbGljaz1cXFwiJGVtaXQoJ3N1Ym1pc3Npb25WaWV3Jywgc3VibWlzc2lvbilcXFwiPlxcclxcbiAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29tcG9uZW50IGluIGZvcm0uY29tcG9uZW50cyB8IGZsYXR0ZW5Db21wb25lbnRzXFxcIiBuZy1pZj1cXFwidGFibGVWaWV3KGNvbXBvbmVudClcXFwiPnt7IHN1Ym1pc3Npb24uZGF0YSB8IHRhYmxlVmlldzpjb21wb25lbnQgfX08L3RkPlxcclxcbiAgICAgICAgPHRkPnt7IHN1Ym1pc3Npb24uY3JlYXRlZCB8IGFtRGF0ZUZvcm1hdDonbCwgaDptbTpzcyBhJyB9fTwvdGQ+XFxyXFxuICAgICAgICA8dGQ+e3sgc3VibWlzc2lvbi5tb2RpZmllZCB8IGFtRGF0ZUZvcm1hdDonbCwgaDptbTpzcyBhJyB9fTwvdGQ+XFxyXFxuICAgICAgICA8dGQ+XFxyXFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJ1dHRvbi1ncm91cFxcXCIgc3R5bGU9XFxcImRpc3BsYXk6ZmxleDtcXFwiPlxcclxcbiAgICAgICAgICAgIDxhIG5nLWNsaWNrPVxcXCIkZW1pdCgnc3VibWlzc2lvblZpZXcnLCBzdWJtaXNzaW9uKTsgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xcXCIgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeSBidG4teHNcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWV5ZS1vcGVuXFxcIj48L3NwYW4+PC9hPiZuYnNwO1xcclxcbiAgICAgICAgICAgIDxhIG5nLWNsaWNrPVxcXCIkZW1pdCgnc3VibWlzc2lvbkVkaXQnLCBzdWJtaXNzaW9uKTsgJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4teHNcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWVkaXRcXFwiPjwvc3Bhbj48L2E+Jm5ic3A7XFxyXFxuICAgICAgICAgICAgPGEgbmctY2xpY2s9XFxcIiRlbWl0KCdzdWJtaXNzaW9uRGVsZXRlJywgc3VibWlzc2lvbik7ICRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlciBidG4teHNcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZS1jaXJjbGVcXFwiPjwvc3Bhbj48L2E+XFxyXFxuICAgICAgICAgIDwvZGl2PlxcclxcbiAgICAgICAgPC90ZD5cXHJcXG4gICAgICA8L3RyPlxcclxcbiAgICA8L3Rib2R5PlxcclxcbiAgPC90YWJsZT5cXHJcXG4gIDxwYWdpbmF0aW9uXFxyXFxuICAgIG5nLWlmPVxcXCJzdWJtaXNzaW9ucy5zZXJ2ZXJDb3VudCA+IHBlclBhZ2VcXFwiXFxyXFxuICAgIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCJcXHJcXG4gICAgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiXFxyXFxuICAgIHRvdGFsLWl0ZW1zPVxcXCJzdWJtaXNzaW9ucy5zZXJ2ZXJDb3VudFxcXCJcXHJcXG4gICAgaXRlbXMtcGVyLXBhZ2U9XFxcInBlclBhZ2VcXFwiXFxyXFxuICAgIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiXFxyXFxuICAgIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIlxcclxcbiAgICBmaXJzdC10ZXh0PVxcXCImbGFxdW87XFxcIlxcclxcbiAgICBsYXN0LXRleHQ9XFxcIiZyYXF1bztcXFwiXFxyXFxuICAgID5cXHJcXG4gIDwvcGFnaW5hdGlvbj5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBIGZvcm1pbyBjb21wb25lbnQgdGVtcGxhdGUuXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby9jb21wb25lbnQuaHRtbCcsXHJcbiAgICAgIFwiPG5nLWZvcm0gbmFtZT1cXFwiZm9ybWlvRmllbGRGb3JtXFxcIiBjbGFzcz1cXFwiZm9ybWlvLWNvbXBvbmVudC17eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1oaWRlPVxcXCJjb21wb25lbnQuaGlkZGVuXFxcIj5cXHJcXG4gIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXAgaGFzLWZlZWRiYWNrIGZvcm0tZmllbGQtdHlwZS17eyBjb21wb25lbnQudHlwZSB9fSB7e2NvbXBvbmVudC5jdXN0b21DbGFzc319XFxcIiBpZD1cXFwiZm9ybS1ncm91cC17eyBjb21wb25lbnQua2V5IH19XFxcIiBuZy1jbGFzcz1cXFwieydoYXMtZXJyb3InOiBmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGludmFsaWQgJiYgIWZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kcHJpc3RpbmUgfVxcXCIgbmctc3R5bGU9XFxcImNvbXBvbmVudC5zdHlsZVxcXCI+XFxyXFxuICAgIDxmb3JtaW8tZWxlbWVudD48L2Zvcm1pby1lbGVtZW50PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9uZy1mb3JtPlxcclxcblwiXHJcbiAgICApO1xyXG5cclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvL2Vycm9ycy5odG1sJyxcclxuICAgICAgXCI8ZGl2IG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IgJiYgIWZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kcHJpc3RpbmVcXFwiPlxcclxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IuZW1haWxcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgYSB2YWxpZCBlbWFpbC48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5yZXF1aXJlZFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gaXMgcmVxdWlyZWQuPC9wPlxcclxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IubnVtYmVyXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGEgbnVtYmVyLjwvcD5cXHJcXG4gIDxwIGNsYXNzPVxcXCJoZWxwLWJsb2NrXFxcIiBuZy1zaG93PVxcXCJmb3JtaW9GaWVsZEZvcm1bY29tcG9uZW50LmtleV0uJGVycm9yLm1heGxlbmd0aFxcXCI+e3sgY29tcG9uZW50LmxhYmVsIHx8IGNvbXBvbmVudC5rZXkgfX0gbXVzdCBiZSBzaG9ydGVyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1heExlbmd0aCArIDEgfX0gY2hhcmFjdGVycy48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5taW5sZW5ndGhcXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgbG9uZ2VyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1pbkxlbmd0aCAtIDEgfX0gY2hhcmFjdGVycy48L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5taW5cXFwiPnt7IGNvbXBvbmVudC5sYWJlbCB8fCBjb21wb25lbnQua2V5IH19IG11c3QgYmUgaGlnaGVyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1pbiAtIDEgfX0uPC9wPlxcclxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IubWF4XFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBtdXN0IGJlIGxvd2VyIHRoYW4ge3sgY29tcG9uZW50LnZhbGlkYXRlLm1heCArIDEgfX0uPC9wPlxcclxcbiAgPHAgY2xhc3M9XFxcImhlbHAtYmxvY2tcXFwiIG5nLXNob3c9XFxcImZvcm1pb0ZpZWxkRm9ybVtjb21wb25lbnQua2V5XS4kZXJyb3IuY3VzdG9tXFxcIj57eyBjb21wb25lbnQuY3VzdG9tRXJyb3IgfX08L3A+XFxyXFxuICA8cCBjbGFzcz1cXFwiaGVscC1ibG9ja1xcXCIgbmctc2hvdz1cXFwiZm9ybWlvRmllbGRGb3JtW2NvbXBvbmVudC5rZXldLiRlcnJvci5wYXR0ZXJuXFxcIj57eyBjb21wb25lbnQubGFiZWwgfHwgY29tcG9uZW50LmtleSB9fSBkb2VzIG5vdCBtYXRjaCB0aGUgcGF0dGVybiB7eyBjb21wb25lbnQudmFsaWRhdGUucGF0dGVybiB9fTwvcD5cXHJcXG48L2Rpdj5cXHJcXG5cIlxyXG4gICAgKTtcclxuICB9XHJcbl0pO1xyXG5cclxucmVxdWlyZSgnLi9jb21wb25lbnRzJyk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcclxuICByZXF1aXJlKCcuL3N0b3JhZ2UvdXJsJykoYXBwKTtcclxuICByZXF1aXJlKCcuL3N0b3JhZ2UvczMnKShhcHApO1xyXG4gIHJlcXVpcmUoJy4vc3RvcmFnZS9kcm9wYm94JykoYXBwKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ0Zvcm1pb1BsdWdpbnNQcm92aWRlcicsXHJcbiAgICAnRm9ybWlvU3RvcmFnZURyb3Bib3hQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoXHJcbiAgICAgIEZvcm1pb1BsdWdpbnNQcm92aWRlcixcclxuICAgICAgRm9ybWlvU3RvcmFnZURyb3Bib3hQcm92aWRlclxyXG4gICAgKSB7XHJcbiAgICAgIEZvcm1pb1BsdWdpbnNQcm92aWRlci5yZWdpc3Rlcignc3RvcmFnZScsICdkcm9wYm94JywgRm9ybWlvU3RvcmFnZURyb3Bib3hQcm92aWRlci4kZ2V0KCkpO1xyXG4gICAgfV1cclxuICApO1xyXG5cclxuICBhcHAuZmFjdG9yeSgnRm9ybWlvU3RvcmFnZURyb3Bib3gnLCBbXHJcbiAgICAnJHEnLFxyXG4gICAgJyRyb290U2NvcGUnLFxyXG4gICAgJyR3aW5kb3cnLFxyXG4gICAgJyRodHRwJyxcclxuICAgICdCbG9iJyxcclxuICAgICdGaWxlU2F2ZXInLFxyXG4gICAgZnVuY3Rpb24oXHJcbiAgICAgICRxLFxyXG4gICAgICAkcm9vdFNjb3BlLFxyXG4gICAgICAkd2luZG93LFxyXG4gICAgICAkaHR0cCxcclxuICAgICAgQmxvYixcclxuICAgICAgRmlsZVNhdmVyXHJcbiAgICApIHtcclxuICAgICAgdmFyIGdldERyb3Bib3hUb2tlbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBkcm9wYm94VG9rZW47XHJcbiAgICAgICAgaWYgKCRyb290U2NvcGUudXNlciAmJiAkcm9vdFNjb3BlLnVzZXIuZXh0ZXJuYWxUb2tlbnMpIHtcclxuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkcm9vdFNjb3BlLnVzZXIuZXh0ZXJuYWxUb2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSAnZHJvcGJveCcpIHtcclxuICAgICAgICAgICAgICBkcm9wYm94VG9rZW4gPSB0b2tlbi50b2tlbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkcm9wYm94VG9rZW47XHJcbiAgICAgICAgLy9yZXR1cm4gXy5yZXN1bHQoXy5maW5kKCRyb290U2NvcGUudXNlci5leHRlcm5hbFRva2Vucywge3R5cGU6ICdkcm9wYm94J30pLCAndG9rZW4nKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdGl0bGU6ICdEcm9wYm94JyxcclxuICAgICAgICBuYW1lOiAnZHJvcGJveCcsXHJcbiAgICAgICAgdXBsb2FkRmlsZTogZnVuY3Rpb24oZmlsZSwgc3RhdHVzLCAkc2NvcGUpIHtcclxuICAgICAgICAgIHZhciBkZWZlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICB2YXIgZGlyID0gJHNjb3BlLmNvbXBvbmVudC5kaXIgfHwgJyc7XHJcbiAgICAgICAgICB2YXIgZHJvcGJveFRva2VuID0gZ2V0RHJvcGJveFRva2VuKCk7XHJcbiAgICAgICAgICBpZiAoIWRyb3Bib3hUb2tlbikge1xyXG4gICAgICAgICAgICBkZWZlci5yZWplY3QoJ1lvdSBtdXN0IGF1dGhlbnRpY2F0ZSB3aXRoIGRyb3Bib3ggYmVmb3JlIHVwbG9hZGluZyBmaWxlcy4nKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBCb3RoIFVwbG9hZCBhbmQgJGh0dHAgZG9uJ3QgaGFuZGxlIGZpbGVzIGFzIGFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSB3aGljaCBpcyByZXF1aXJlZCBieSBkcm9wYm94LlxyXG4gICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgb25Qcm9ncmVzcyA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgICAgICAgICAgIHN0YXR1cy5zdGF0dXMgPSAncHJvZ3Jlc3MnO1xyXG4gICAgICAgICAgICAgIHN0YXR1cy5wcm9ncmVzcyA9IHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXR1cy5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IG9uUHJvZ3Jlc3M7XHJcblxyXG4gICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDIwMCkge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZSkpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlZmVyLnJlamVjdCh4aHIucmVzcG9uc2UgfHwgJ1VuYWJsZSB0byB1cGxvYWQgZmlsZScpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHhoci5vcGVuKCdQT1NUJywgJ2h0dHBzOi8vY29udGVudC5kcm9wYm94YXBpLmNvbS8yL2ZpbGVzL3VwbG9hZCcpO1xyXG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIGRyb3Bib3hUb2tlbik7XHJcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyk7XHJcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdEcm9wYm94LUFQSS1BcmcnLCBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgcGF0aDogJy8nICsgZGlyICsgZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgIG1vZGU6ICdhZGQnLFxyXG4gICAgICAgICAgICAgIGF1dG9yZW5hbWU6IHRydWUsXHJcbiAgICAgICAgICAgICAgbXV0ZTogZmFsc2VcclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgeGhyLnNlbmQoZmlsZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gZGVmZXIucHJvbWlzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEZpbGU6IGZ1bmN0aW9uKGZpbGVVcmwsIGZpbGUpIHtcclxuICAgICAgICAgIHZhciBkZWZlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICB2YXIgZHJvcGJveFRva2VuID0gZ2V0RHJvcGJveFRva2VuKCk7XHJcbiAgICAgICAgICBpZiAoIWRyb3Bib3hUb2tlbikge1xyXG4gICAgICAgICAgICBkZWZlci5yZWplY3QoJ1lvdSBtdXN0IGF1dGhlbnRpY2F0ZSB3aXRoIGRyb3Bib3ggYmVmb3JlIGRvd25sb2FkaW5nIGZpbGVzLicpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XHJcblxyXG4gICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDIwMCkge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh4aHIucmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlZmVyLnJlamVjdCh4aHIucmVzcG9uc2UgfHwgJ1VuYWJsZSB0byBkb3dubG9hZCBmaWxlJyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgeGhyLm9wZW4oJ1BPU1QnLCAnaHR0cHM6Ly9jb250ZW50LmRyb3Bib3hhcGkuY29tLzIvZmlsZXMvZG93bmxvYWQnKTtcclxuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyBkcm9wYm94VG9rZW4pO1xyXG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignRHJvcGJveC1BUEktQXJnJywgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIHBhdGg6IGZpbGUucGF0aF9sb3dlclxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIHhoci5zZW5kKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gZGVmZXIucHJvbWlzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvd25sb2FkRmlsZTogZnVuY3Rpb24oZXZ0LCBmaWxlKSB7XHJcbiAgICAgICAgICB2YXIgc3RyTWltZVR5cGUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcclxuICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5nZXRGaWxlKG51bGwsIGZpbGUpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6IHN0ck1pbWVUeXBlfSk7XHJcbiAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZmlsZS5uYW1lLCB0cnVlKTtcclxuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgICAgICBhbGVydChlcnIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIF0pO1xyXG59O1xyXG5cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xyXG4gIGFwcC5jb25maWcoW1xyXG4gICAgJ0Zvcm1pb1BsdWdpbnNQcm92aWRlcicsXHJcbiAgICAnRm9ybWlvU3RvcmFnZVMzUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKFxyXG4gICAgICBGb3JtaW9QbHVnaW5zUHJvdmlkZXIsXHJcbiAgICAgIEZvcm1pb1N0b3JhZ2VTM1Byb3ZpZGVyXHJcbiAgICApIHtcclxuICAgICAgRm9ybWlvUGx1Z2luc1Byb3ZpZGVyLnJlZ2lzdGVyKCdzdG9yYWdlJywgJ3MzJywgRm9ybWlvU3RvcmFnZVMzUHJvdmlkZXIuJGdldCgpKTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbiAgYXBwLmZhY3RvcnkoJ0Zvcm1pb1N0b3JhZ2VTMycsIFtcclxuICAgICckcScsXHJcbiAgICAnJHdpbmRvdycsXHJcbiAgICAnRm9ybWlvJyxcclxuICAgICdVcGxvYWQnLFxyXG4gICAgZnVuY3Rpb24oXHJcbiAgICAgICRxLFxyXG4gICAgICAkd2luZG93LFxyXG4gICAgICBGb3JtaW8sXHJcbiAgICAgIFVwbG9hZFxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdGl0bGU6ICdTMycsXHJcbiAgICAgICAgbmFtZTogJ3MzJyxcclxuICAgICAgICB1cGxvYWRGaWxlOiBmdW5jdGlvbihmaWxlLCBzdGF0dXMsICRzY29wZSkge1xyXG4gICAgICAgICAgdmFyIGRlZmVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICAgIEZvcm1pby5yZXF1ZXN0KCRzY29wZS5mb3JtaW8uZm9ybVVybCArICcvc3RvcmFnZS9zMycsICdQT1NUJywge1xyXG4gICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgdHlwZTogZmlsZS50eXBlXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgdXJsOiByZXNwb25zZS51cmwsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHJlc3BvbnNlLmRhdGFcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIHJlcXVlc3QuZGF0YS5maWxlID0gZmlsZTtcclxuICAgICAgICAgICAgICB2YXIgZGlyID0gJHNjb3BlLmNvbXBvbmVudC5kaXIgfHwgJyc7XHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5kYXRhLmtleSArPSBkaXIgKyBmaWxlLm5hbWU7XHJcbiAgICAgICAgICAgICAgdmFyIHVwbG9hZCA9IFVwbG9hZC51cGxvYWQocmVxdWVzdCk7XHJcbiAgICAgICAgICAgICAgdXBsb2FkXHJcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHVwbG9hZCBmaW5pc2hlZC5cclxuICAgICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldDogcmVzcG9uc2UuYnVja2V0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtleTogcmVxdWVzdC5kYXRhLmtleSxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3BvbnNlLnVybCArIHJlcXVlc3QuZGF0YS5rZXksXHJcbiAgICAgICAgICAgICAgICAgICAgYWNsOiByZXF1ZXN0LmRhdGEuYWNsLFxyXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlLnR5cGVcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlcnJvclxyXG4gICAgICAgICAgICAgICAgICB2YXIgb1BhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuICAgICAgICAgICAgICAgICAgdmFyIG9ET00gPSBvUGFyc2VyLnBhcnNlRnJvbVN0cmluZyhyZXNwLmRhdGEsICd0ZXh0L3htbCcpO1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG9ET00uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ01lc3NhZ2UnKVswXS5pbm5lckhUTUw7XHJcbiAgICAgICAgICAgICAgICAgIGRlZmVyLnJlamVjdChtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAvLyBQcm9ncmVzcyBub3RpZnlcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzLnN0YXR1cyA9ICdwcm9ncmVzcyc7XHJcbiAgICAgICAgICAgICAgICAgIHN0YXR1cy5wcm9ncmVzcyA9IHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XHJcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzdGF0dXMubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RmlsZTogZnVuY3Rpb24oZm9ybVVybCwgZmlsZSkge1xyXG4gICAgICAgICAgaWYgKGZpbGUuYWNsICE9PSAncHVibGljLXJlYWQnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBGb3JtaW8ucmVxdWVzdChmb3JtVXJsICsgJy9zdG9yYWdlL3MzP2J1Y2tldD0nICsgZmlsZS5idWNrZXQgKyAnJmtleT0nICsgZmlsZS5rZXksICdHRVQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvd25sb2FkRmlsZTogZnVuY3Rpb24oZXZ0LCBmaWxlLCAkc2NvcGUpIHtcclxuICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgdGhpcy5nZXRGaWxlKCRzY29wZS5mb3JtLCBmaWxlKS50aGVuKGZ1bmN0aW9uKGZpbGUpIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vcGVuKGZpbGUudXJsLCAnX2JsYW5rJyk7XHJcbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgLy8gSXMgYWxlcnQgdGhlIGJlc3Qgd2F5IHRvIGRvIHRoaXM/XHJcbiAgICAgICAgICAgIC8vIFVzZXIgaXMgZXhwZWN0aW5nIGFuIGltbWVkaWF0ZSBub3RpZmljYXRpb24gZHVlIHRvIGF0dGVtcHRpbmcgdG8gZG93bmxvYWQgYSBmaWxlLlxyXG4gICAgICAgICAgICBhbGVydChyZXNwb25zZSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgXSk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcHApIHtcclxuICBhcHAuY29uZmlnKFtcclxuICAgICdGb3JtaW9QbHVnaW5zUHJvdmlkZXInLFxyXG4gICAgJ0Zvcm1pb1N0b3JhZ2VVcmxQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoXHJcbiAgICAgIEZvcm1pb1BsdWdpbnNQcm92aWRlcixcclxuICAgICAgRm9ybWlvU3RvcmFnZVVybFByb3ZpZGVyXHJcbiAgICApIHtcclxuICAgICAgRm9ybWlvUGx1Z2luc1Byb3ZpZGVyLnJlZ2lzdGVyKCdzdG9yYWdlJywgJ3VybCcsIEZvcm1pb1N0b3JhZ2VVcmxQcm92aWRlci4kZ2V0KCkpO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuICBhcHAuZmFjdG9yeSgnRm9ybWlvU3RvcmFnZVVybCcsIFtcclxuICAgICckcScsXHJcbiAgICAnVXBsb2FkJyxcclxuICAgIGZ1bmN0aW9uIChcclxuICAgICAgJHEsXHJcbiAgICAgIFVwbG9hZFxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdGl0bGU6ICdVcmwnLFxyXG4gICAgICAgIG5hbWU6ICd1cmwnLFxyXG4gICAgICAgIHVwbG9hZEZpbGU6IGZ1bmN0aW9uKGZpbGUsIHN0YXR1cywgJHNjb3BlKSB7XHJcbiAgICAgICAgICB2YXIgZGVmZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgICAgVXBsb2FkLnVwbG9hZCh7XHJcbiAgICAgICAgICAgIHVybDogJHNjb3BlLmNvbXBvbmVudC51cmwsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICBmaWxlOiBmaWxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcclxuICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKHJlc3ApO1xyXG4gICAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwKSB7XHJcbiAgICAgICAgICAgICAgZGVmZXIucmVqZWN0KHJlc3AuZGF0YSk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgICAvLyBQcm9ncmVzcyBub3RpZnlcclxuICAgICAgICAgICAgICBzdGF0dXMuc3RhdHVzID0gJ3Byb2dyZXNzJztcclxuICAgICAgICAgICAgICBzdGF0dXMucHJvZ3Jlc3MgPSBwYXJzZUludCgxMDAuMCAqIGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xyXG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0dXMubWVzc2FnZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICByZXR1cm4gZGVmZXIucHJvbWlzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvd25sb2FkRmlsZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAvLyBEbyBub3RoaW5nIHdoaWNoIHdpbGwgY2F1c2UgYSBub3JtYWwgbGluayBjbGljayB0byBvY2N1ci5cclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9XVxyXG4gICk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgLy8gVGhlIGZvcm1pbyBjbGFzcy5cclxuICB2YXIgRm9ybWlvID0gcmVxdWlyZSgnZm9ybWlvanMvc3JjL2Zvcm1pby5qcycpO1xyXG5cclxuICAvLyBSZXR1cm4gdGhlIHByb3ZpZGVyIGludGVyZmFjZS5cclxuICByZXR1cm4ge1xyXG5cclxuICAgIC8vIEV4cG9zZSBGb3JtaW8gY29uZmlndXJhdGlvbiBmdW5jdGlvbnNcclxuICAgIHNldEJhc2VVcmw6IEZvcm1pby5zZXRCYXNlVXJsLFxyXG4gICAgZ2V0QmFzZVVybDogRm9ybWlvLmdldEJhc2VVcmwsXHJcbiAgICByZWdpc3RlclBsdWdpbjogRm9ybWlvLnJlZ2lzdGVyUGx1Z2luLFxyXG4gICAgZ2V0UGx1Z2luOiBGb3JtaW8uZ2V0UGx1Z2luLFxyXG4gICAgc2V0RG9tYWluOiBmdW5jdGlvbigpIHtcclxuICAgICAgLy8gUmVtb3ZlIHRoaXM/XHJcbiAgICB9LFxyXG5cclxuICAgICRnZXQ6IFtcclxuICAgICAgJyRyb290U2NvcGUnLFxyXG4gICAgICAnJHEnLFxyXG4gICAgICBmdW5jdGlvbihcclxuICAgICAgICAkcm9vdFNjb3BlLFxyXG4gICAgICAgICRxXHJcbiAgICAgICkge1xyXG5cclxuICAgICAgICB2YXIgd3JhcFFQcm9taXNlID0gZnVuY3Rpb24ocHJvbWlzZSkge1xyXG4gICAgICAgICAgcmV0dXJuICRxLndoZW4ocHJvbWlzZSlcclxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IgPT09ICdVbmF1dGhvcml6ZWQnKSB7XHJcbiAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdmb3JtaW8udW5hdXRob3JpemVkJywgZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGVycm9yID09PSAnTG9naW4gVGltZW91dCcpIHtcclxuICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Zvcm1pby5zZXNzaW9uRXhwaXJlZCcsIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBQcm9wYWdhdGUgZXJyb3JcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBGb3JtaW8ucmVnaXN0ZXJQbHVnaW4oe1xyXG4gICAgICAgICAgcHJpb3JpdHk6IC0xMDAsXHJcbiAgICAgICAgICAvLyBXcmFwIEZvcm1pby5yZXF1ZXN0J3MgcHJvbWlzZXMgd2l0aCAkcSBzbyAkYXBwbHkgZ2V0cyBjYWxsZWQgY29ycmVjdGx5LlxyXG4gICAgICAgICAgd3JhcFJlcXVlc3RQcm9taXNlOiB3cmFwUVByb21pc2UsXHJcbiAgICAgICAgICB3cmFwU3RhdGljUmVxdWVzdFByb21pc2U6IHdyYXBRUHJvbWlzZVxyXG4gICAgICAgIH0sICduZ0Zvcm1pb1Byb21pc2VXcmFwcGVyJyk7XHJcblxyXG4gICAgICAgIC8vIEJyb2FkY2FzdCBvZmZsaW5lIGV2ZW50cyBmcm9tICRyb290U2NvcGVcclxuICAgICAgICBGb3JtaW8uZXZlbnRzLm9uQW55KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdmFyIGV2ZW50ID0gJ2Zvcm1pby4nICsgdGhpcy5ldmVudDtcclxuICAgICAgICAgIHZhciBhcmdzID0gW10uc3BsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcclxuICAgICAgICAgIGFyZ3MudW5zaGlmdChldmVudCk7XHJcbiAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0LmFwcGx5KCRyb290U2NvcGUsIGFyZ3MpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFJldHVybiB0aGUgZm9ybWlvIGludGVyZmFjZS5cclxuICAgICAgICByZXR1cm4gRm9ybWlvO1xyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgdmFyIHBsdWdpbnMgPSB7fTtcclxuXHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICByZWdpc3RlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgcGx1Z2luKSB7XHJcbiAgICAgIGlmICghcGx1Z2luc1t0eXBlXSkge1xyXG4gICAgICAgIHBsdWdpbnNbdHlwZV0gPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBwbHVnaW5zW3R5cGVdW25hbWVdID0gcGx1Z2luO1xyXG4gICAgfSxcclxuXHJcbiAgICAkZ2V0OiBbXHJcbiAgICAgIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XHJcbiAgICAgICAgICBpZiAodHlwZSkge1xyXG4gICAgICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBwbHVnaW5zW3R5cGVdW25hbWVdIHx8IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwbHVnaW5zW3R5cGVdIHx8IGZhbHNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHBsdWdpbnM7XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH07XHJcbn07XHJcbiJdfQ==
