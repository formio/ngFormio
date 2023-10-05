"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
require("core-js/modules/es.array.concat.js");
var _embed = require("@formio/js/embed");
var _default = exports.default = angular.module('formio').directive('formBuilder', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      url: '=?',
      form: '=?',
      options: '<'
    },
    link: function link(scope, element) {
      scope.initBuilder(element[0]);
    },
    controller: ['$scope', function ($scope) {
      var builder = null;
      var builderReady = null;
      var builderElement = null;
      var formIsInvalid = null;
      $scope.options = $scope.options || {};

      // Initialize the builder.
      $scope.initBuilder = function (element) {
        builderElement = element;
        builderElement.innerHTML = '';
        builder = new _embed.Formio.FormBuilder(builderElement, $scope.form, $scope.options);
        builder.ready.then(function () {
          builder.instance.on('change', function (event) {
            // Do not emit form change events if this is from submission data.
            if (!event.data) {
              $scope.$emit('formChange', builder.instance.schema);
            }
          });
          builder.instance.on('builderFormValidityChange', function (isFormSchemaInvalid) {
            if (formIsInvalid !== isFormSchemaInvalid) {
              formIsInvalid = isFormSchemaInvalid;
              $scope.$emit('formValidityChange', formIsInvalid);
            }
          });
          builder.instance.onAny(function (event) {
            if (event === 'formio.render') {
              $scope.$emit(event, builder.instance.schema);
            } else {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              $scope.$emit.apply($scope, [event].concat(args));
            }
          });
        });
        builderReady = builder.ready;
      };
      $scope.display = $scope.form.display;

      // Detect when the display changes.
      $scope.$watch('form.display', function (display) {
        if (builderReady && display) {
          builderReady.then(function () {
            if (display !== $scope.display) {
              builder.setDisplay(display);
            }
            $scope.display = display;
          });
        }
      });
      $scope.$watch('form', function (form) {
        if (!form || !form.components) {
          return;
        }
        if (builderReady) {
          builderReady.then(function () {
            if ($scope.url) {
              builder.instance.url = $scope.url;
            }
            builder.instance.setForm(form);
          });
        }
      });
      $scope.$on('$destroy', function () {
        if (builder && builder.instance) {
          builder.instance.destroy(true);
        }
      });
    }],
    template: '<div/>'
  };
});