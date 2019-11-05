"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("formiojs/dist/formio.full.min.css");

var _modules = require("./modules");

Object.keys(_modules).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _modules[key];
    }
  });
});