'use strict';
angular.module('formioApp.controllers', [
  'formioApp.controllers.resource',
  'formioApp.controllers.app',
  'formioApp.controllers.user',
  'formioApp.controllers.import',
  'formioApp.controllers.help'
]).config([
  'ResourceProvider',
  function(ResourceProvider) {

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
      views: {
        create: 'views/resource/resource.html',
        edit: 'views/resource/resource.html'
      }
    });
  }
]);
