"use strict";

var Yadda = require('yadda');

module.exports = (function() {

  var dictionary = new Yadda.Dictionary()
    .define('LOCALE', /(fr|es|ie)/)
    .define('NUM', /(\d+)/);

  return dictionary;
})();
