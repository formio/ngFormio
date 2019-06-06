"use strict";

require("core-js/modules/web.dom.iterable");

require("core-js/modules/es6.array.iterator");

require("core-js/modules/es6.object.to-string");

require("core-js/modules/es6.object.keys");

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("./module");

require("./filters");

require("./providers");

require("./directives");

require("./factories");

require("formiojs/dist/formio.full.min.css");

var _formiojs = require("formiojs");

Object.keys(_formiojs).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _formiojs[key];
    }
  });
});