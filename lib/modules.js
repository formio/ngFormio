"use strict";

require("core-js/modules/web.dom-collections.for-each.js");

require("core-js/modules/es.object.keys.js");

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
  if (key in exports && exports[key] === _formiojs[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _formiojs[key];
    }
  });
});