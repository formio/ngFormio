"use strict";

require("core-js/modules/es.object.keys");

require("core-js/modules/web.dom-collections.for-each");

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("./module");

require("./filters");

require("./providers");

require("./directives");

require("./factories");

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