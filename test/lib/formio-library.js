"use strict";

var assert = require('assert');
var Yadda = require('yadda');
var English = Yadda.localisation.English;

module.exports = (function() {

  var library = English.library()
    .given("I am (?:on|at) (?:the )?(.+?)(?: page)?$", function(path, next) {
      if (path === 'home') {
        path = '/'
      }
      this.driver.url(path).then(function() {
        setTimeout(next, 500);
      });
    })
    .when("I click (?:on )?the link $LINK", function(link, next) {
      this.driver.click("=" + link).then(function() {
        setTimeout(next, 500);
      });
    })
    .then("the title is $TITLE", function(given_title, next) {
      this.driver.getTitle().then(function(title) {
        try {
          assert.equal(title, given_title);
          next();
        }
        catch(err) {
          next(err);
        }
      });
    })
    .then("I am (?:on|at) (?:the )?(.+?)(?: page)$", function(path, next) {
      if (path === 'home') {
        path = '/'
      }
      var url = this.driver.options.baseUrl + path;
      this.driver.url().then(function(res) {
        try {
          assert.equal(res.value, url);
          next();
        }
        catch(err) {
          next(err);
        }
      });
    })

  return library;
})();
