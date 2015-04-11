'use strict';

/* global _: false */

var app = angular.module('formioApp.controllers.resource', [
  'ngDialog',
  'ui.sortable',
  'ui.bootstrap.tabs',
  'ui.bootstrap.tpls',
  'ngFormBuilder',
  'formio',
  'bgf.paginateAnything'
]);

app.provider('Resource', [
  '$stateProvider',
  'RestangularProvider',
  function(
    $stateProvider,
    RestangularProvider
  ) {

    var resources = {};

    // Configure restangular.
    RestangularProvider.setRestangularFields({
      id: '_id'
    });

    return {
      register: function(resourceInfo) {
        var resourceParam = ' resource-title="\'' + resourceInfo.title + '\'"';
        resourceParam += ' resource-name="\'' + resourceInfo.name + '\'"';
        resources[resourceInfo.name] = resourceInfo;
        $stateProvider
          .state('app.list' + resourceInfo.title + 's', {
            url: resourceInfo.url,
            parent: 'app',
            template: '<resource-list' + resourceParam + '></resource-list>'
          })
          .state('app.' + resourceInfo.name, {
            url: resourceInfo.url + '/:id',
            parent: 'app',
            templateUrl: 'views/resource/resource-root.html',
            controller: 'ResourceController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.view' + resourceInfo.title, {
            url: resourceInfo.url + '/:id',
            parent: 'app',
            templateUrl: 'views/resource/resource-view.html',
            controller: 'ResourceViewController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.edit' + resourceInfo.title, {
            url: resourceInfo.url + '/:id/edit',
            parent: 'app',
            templateUrl: 'views/resource/resource-edit.html',
            controller: 'ResourceEditController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.delete' + resourceInfo.title, {
            url: resourceInfo.url + '/:id/delete',
            parent: 'app',
            templateUrl: 'views/resource/resource-delete.html',
            controller: 'ResourceDeleteController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.create' + resourceInfo.title, {
            url: '/create/' + resourceInfo.name,
            parent: 'app',
            templateUrl: 'views/resource/resource-create.html',
            controller: 'ResourceCreateController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.api' + resourceInfo.title, {
            url: resourceInfo.url + '/:id/api',
            parent: 'app',
            templateUrl: 'views/resource/resource-api.html',
            controller: 'ResourceAPIController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.api' + resourceInfo.title + '.spec', {
            url: '/spec',
            parent: 'app.api' + resourceInfo.title,
            templateUrl: 'views/resource/resource-api.spec.html',
            controller: 'ResourceAPISpecController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.api' + resourceInfo.title + '.embed', {
            url: '/embed',
            parent: 'app.api' + resourceInfo.title,
            templateUrl: 'views/resource/resource-api.embed.html',
            controller: 'ResourceAPIEmbedController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.list' + resourceInfo.title + 'Behaviors', {
            url: resourceInfo.url + '/:id/behaviors',
            parent: 'app',
            templateUrl: 'views/resource/resource-behaviors.html',
            controller: 'ResourceBehaviorsController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.list' + resourceInfo.title + 'Submissions', {
            url: resourceInfo.url + '/:id/submission',
            parent: 'app',
            templateUrl: 'views/resource/resource-submissions.html',
            controller: 'ResourceSubmissionsController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.view' + resourceInfo.title + 'Submission', {
            url: resourceInfo.url + '/:id/submission/:subId',
            parent: 'app',
            templateUrl: 'views/resource/resource-submission-view.html',
            controller: 'ResourceSubmissionViewController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.edit' + resourceInfo.title + 'Submission', {
            url: resourceInfo.url + '/:id/submission/:subId/edit',
            parent: 'app',
            templateUrl: 'views/resource/resource-submission-edit.html',
            controller: 'ResourceSubmissionEditController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.delete' + resourceInfo.title + 'Submission', {
            url: resourceInfo.url + '/:id/submission/:subId/delete',
            parent: 'app',
            templateUrl: 'views/resource/resource-submission-delete.html',
            controller: 'ResourceSubmissionDeleteController',
            params: {resourceInfo: resourceInfo}
          });
      },
      $get: function() {
        return resources;
      }
    };
  }
]);

app.factory('FormioAlerts', [
  '$rootScope',
  function(
    $rootScope
  ) {
    var alerts = [];
    return {
      addAlert: function(alert) {
        $rootScope.alerts.push(alert);
        if (alert.element) {
          angular.element('#form-group-' + alert.element).addClass('has-error');
        }
        else {
          alerts.push(alert);
        }
      },
      getAlerts: function() {
        var tempAlerts = angular.copy(alerts);
        alerts.length = 0;
        alerts = [];
        return tempAlerts;
      },
      onError: function(error) {
        _.each(error.data.errors, function(error) {
          this.addAlert({
            type: 'danger',
            message: error.message,
            element: error.path
          });
        }.bind(this));
      }
    };
  }
]);

// The resource list directive.
app.directive('resourceList', function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'views/resource/resource-list.html',
    scope: {
      app: '=',
      resourceTitle: '=',
      resourceName: '=',
      numPerPage: '='
    },
    compile: function(element, attrs) {
      if (!attrs.numPerPage) { attrs.numPerPage = 25; }
      if (!attrs.resourceTitle) { attrs.resourceTitle = 'Resource'; }
      if (!attrs.resourceName) { attrs.resourceName = 'resource'; }
    },
    controller: [
      '$scope',
      '$rootScope',
      'Restangular',
      function(
        $scope,
        $rootScope,
        Restangular
      ) {
        $rootScope.activeSideBar = 'apps';
        $rootScope.noBreadcrumb = false;
        $scope.resources = [];
        $scope.resourcesPerPage = $scope.numPerPage;
        $scope.resourceUrl = Restangular.one('app', $scope.app._id).all($scope.resourceName).getRestangularUrl();
        $scope.resourceInfo = {
          title: $scope.resourceTitle,
          name: $scope.resourceName
        };
      }
    ]
  };
});

app.controller('ResourceController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  function(
    $scope,
    $state,
    $stateParams,
    Formio
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {};
    $scope.resourceUrl = '/app/' + $stateParams.appId + '/' + $stateParams.resourceInfo.name + '/' + $stateParams.id;
    $scope.resourceLoader = new Formio($scope.resourceUrl);
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.resource = {};
    $scope.resourceLoader.loadForm().then(function(resource) {
      $scope.resource = resource;
    });
  }
]);

app.controller('ResourceViewController', [
  '$scope',
  '$state',
  '$stateParams',
  'FormioAlerts',
  '$location',
  function(
    $scope,
    $state,
    $stateParams,
    FormioAlerts,
    $location
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {view: true};
    $scope.resourceUrl = $location.url();
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.resource = {};

    $scope.$on('formLoad', function(event, form) {
      $scope.resource = form;
    });

    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      $state.go('app.view' + $stateParams.resourceInfo.title + 'Submission', {id: $scope.resource._id, subId: submission._id});
    });
  }
]);

app.controller('ResourceCreateController', [
  '$scope',
  '$state',
  '$stateParams',
  'Restangular',
  'FormioAlerts',
  function(
    $scope,
    $state,
    $stateParams,
    Restangular,
    FormioAlerts
  ) {
    $scope.resourceName = $stateParams.resourceInfo.name;
    $scope.resource = {title: '', components: []};
    $scope.nav = {};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.appId = $stateParams.appId;
    $scope.nav[$stateParams.resourceInfo.name] = {edit: true};
    if ($scope.resourceInfo.onCreate) {
      $scope.resourceInfo.onCreate($scope, $state, $stateParams, Restangular, FormioAlerts);
    }
    $scope.saveResource = function() {
      Restangular
        .one('app', $stateParams.appId)
        .all($stateParams.resourceInfo.name)
        .post($scope.resource).then(function(resource) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Successfully created form!'
          });
          $state.go('app.api' + $stateParams.resourceInfo.title, {id: resource._id});
        }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceEditController', [
  '$scope',
  '$state',
  '$stateParams',
  'Restangular',
  'FormioAlerts',
  function(
    $scope,
    $state,
    $stateParams,
    Restangular,
    FormioAlerts
  ) {
    $scope.resource = {};
    $scope.nav = {};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.appId = $stateParams.appId;
    $scope.nav[$stateParams.resourceInfo.name] = {edit: true};
    if ($scope.resourceInfo.onEdit) {
      $scope.resourceInfo.onEdit($scope, $state, $stateParams, Restangular, FormioAlerts);
    }
    Restangular
      .one('app', $stateParams.appId)
      .one($stateParams.resourceInfo.name, $stateParams.id)
      .get()
      .then(function(resource) {
        $scope.resource = resource;
        $scope.saveResource = function() {
          $scope.resource.save().then(function() {
            FormioAlerts.addAlert({
              type: 'success',
              message: 'Saved form successfull.'
            });
            $state.go('app.view' + $stateParams.resourceInfo.title, {id: resource._id});
          }, FormioAlerts.onError.bind(FormioAlerts));
        };
      });
  }
]);

app.controller('ResourceDeleteController', [
  '$scope',
  '$state',
  '$stateParams',
  'Restangular',
  'FormioAlerts',
  function(
    $scope,
    $state,
    $stateParams,
    Restangular,
    FormioAlerts
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {'delete': true};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.resource = Restangular.one('app', $stateParams.appId).one($stateParams.resourceInfo.name, $stateParams.id).get().$object;
    $scope.deleteResource = function() {
      $scope.resource.remove().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successfull.'
        });
        $state.go('app.list' + $stateParams.resourceInfo.title + 's');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceAPIController', [
  '$scope',
  '$state',
  '$stateParams',
  'Restangular',
  function(
    $scope,
    $state,
    $stateParams,
    Restangular
  ) {
    $scope.resource = {_id: $stateParams.id};
    Restangular
      .one('app', $stateParams.appId)
      .one($stateParams.resourceInfo.name, $stateParams.id)
      .get().then(function(resource) {
        $scope.resource = resource;
      });
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {api: true};
    $state.transitionTo('app.api' + $stateParams.resourceInfo.title + '.spec', {
      appId: $stateParams.appId,
      id: $stateParams.id
    });
  }
]);

app.controller('ResourceAPISpecController', [
  '$stateParams',
  '$scope',
  'AppConfig',
  function(
    $stateParams,
    $scope,
    AppConfig
  ) {
    // Function to get the swagger url.
    $scope.getSwaggerURL = function() {
      return AppConfig.appBase + '/form/' + $scope.resource._id + '/spec.html';
    };
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {api: {spec: true}};
  }
]);

app.controller('ResourceAPIEmbedController', [
  '$stateParams',
  '$scope',
  function(
    $stateParams,
    $scope
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {api: {embed: true}};
  }
]);

app.controller('ResourceBehaviorsController', [
  '$scope',
  '$stateParams',
  function(
    $scope,
    $stateParams
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {'behaviors': true};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.resource = {_id: $stateParams.id};
  }
]);

app.controller('ResourceSubmissionsController', [
  '$scope',
  '$state',
  '$stateParams',
  '$location',
  function(
    $scope,
    $state,
    $stateParams,
    $location
  ) {
    $scope.nav = {};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.nav[$stateParams.resourceInfo.name] = {submission: true};
    $scope.resourceUrl = $location.url().replace('/submission', '');
    $scope.resource = {};

    $scope.$on('formLoad', function(event, form) {
      $scope.resource = form;
    });

    $scope.$on('submissionView', function(event, submission) {
      $state.go('app.view' + $scope.resourceInfo.title + 'Submission', {
        id: $scope.resource._id,
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('app.edit' + $scope.resourceInfo.title + 'Submission', {
        id: $scope.resource._id,
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('app.delete' + $scope.resourceInfo.title + 'Submission', {
        id: $scope.resource._id,
        subId: submission._id
      });
    });
  }
]);

app.controller('ResourceSubmissionViewController', [
  '$scope',
  '$stateParams',
  'Formio',
  'Restangular',
  function(
    $scope,
    $stateParams,
    Formio,
    Restangular
  ) {
    $scope.nav = {form: {submission: {'view': true}}};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.submissionData = Formio.submissionData;
    $scope.submission = Restangular.one('app', $stateParams.appId).one($stateParams.resourceInfo.name, $stateParams.id).one('submission', $stateParams.subId).get().$object;
    $scope.resource = Restangular.one('app', $stateParams.appId).one($stateParams.resourceInfo.name, $stateParams.id).get().$object;
  }
]);

app.controller('ResourceSubmissionEditController', [
  '$scope',
  '$state',
  '$stateParams',
  'FormioAlerts',
  '$location',
  function(
    $scope,
    $state,
    $stateParams,
    FormioAlerts,
    $location
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {submission: {'edit': true}};
    $scope.resourceInfo = $stateParams.resourceInfo;
    $scope.submissionUrl = $location.url();
    $scope.resource = {};
    $scope.submission = {};

    $scope.$on('formLoad', function(event, form) {
      $scope.resource = form;
    });

    $scope.$on('submissionLoad', function(event, submission) {
      $scope.submission = submission;
    });

    $scope.$on('formSubmission', function(event, submission) {
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      $state.go('app.list' + $stateParams.resourceInfo.title + 'Submissions', {id: $stateParams.id});
    });

    $scope.deleteSubmission = function() {
      $scope.submission.remove().then(function() {
        $state.go('app.list' + $stateParams.resourceInfo.title + 'Submissions', {id: $stateParams.id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceSubmissionDeleteController', [
  '$scope',
  '$state',
  '$stateParams',
  'FormioAlerts',
  '$location',
  function(
    $scope,
    $state,
    $stateParams,
    FormioAlerts,
    $location
  ) {
    $scope.nav = {};
    $scope.nav[$stateParams.resourceInfo.name] = {submission: {'delete': true}};
    $scope.resource = {_id: $stateParams.id};
    $scope.submissionUrl = $location.url();
    $scope.resourceInfo = $stateParams.resourceInfo;

    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go('app.list' + $stateParams.resourceInfo.title + 'Submissions', {id: $stateParams.id});
    });

    $scope.$on('cancel', function() {
      $state.go('app.view' + $stateParams.resourceInfo.title + 'Submission', {id: $stateParams.id, subId: $stateParams.subId});
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });
  }
]);
