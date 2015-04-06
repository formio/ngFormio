'use strict';
angular.module('formioApp.controllers', [
  'formioApp.controllers.resource'
]).config([
  'ResourceProvider',
  function(ResourceProvider) {

    // Perform Camel Case.
    var camelCase = function(input) {
      return input.toLowerCase().replace(/ (.)/g, function(match, group1) {
        return group1.toUpperCase();
      });
    };

    // Attach the name to the title of the resource.
    var attachName = function(scope) {
      scope.$watch('resource.title', function() {
        if (scope.resource.title) {
          scope.resource.name = camelCase(scope.resource.title);
        }
        else {
          scope.resource.name = '';
        }
      });
    };

    ResourceProvider.register({
      title: 'Form',
      name: 'form',
      url: '/form',
      views: {
        create: 'views/form/form.html',
        edit: 'views/form/form.html'
      }
    });
    ResourceProvider.register({
      title: 'Resource',
      name: 'resource',
      url: '/resource',
      onEdit: attachName,
      onCreate: attachName,
      views: {
        create: 'views/resource/resource.html',
        edit: 'views/resource/resource.html'
      }
    });
  }
]);
