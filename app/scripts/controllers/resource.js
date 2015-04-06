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
      register: function(resource) {
        var resourceParam = ' resource-title="\'' + resource.title + '\'"';
        resourceParam += ' resource-name="\'' + resource.name + '\'"';
        resources[resource.name] = resource;
        $stateProvider
          .state('list' + resource.title + 's', {
            url: resource.url,
            template: '<resource-list' + resourceParam + '></resource-list>'
          })
          .state('view' + resource.title, {
            url: resource.url + '/:id',
            templateUrl: 'views/resource/resource-view.html',
            controller: 'ResourceViewController',
            params: {resource: resource}
          })
          .state('edit' + resource.title, {
            url: resource.url + '/:id/edit',
            templateUrl: 'views/resource/resource-edit.html',
            controller: 'ResourceEditController',
            params: {resource: resource}
          })
          .state('delete' + resource.title, {
            url: resource.url + '/:id/delete',
            templateUrl: 'views/resource/resource-delete.html',
            controller: 'ResourceDeleteController',
            params: {resource: resource}
          })
          .state('create' + resource.title, {
            url: '/create/' + resource.name,
            templateUrl: 'views/resource/resource-create.html',
            controller: 'ResourceCreateController',
            params: {resource: resource}
          })
          .state('api' + resource.title, {
            url: resource.url + '/:id/api',
            templateUrl: 'views/resource/resource-api.html',
            controller: 'ResourceAPIController',
            params: {resource: resource}
          })
          .state('api' + resource.title + '.spec', {
            url: '/spec',
            templateUrl: 'views/resource/resource-api.spec.html',
            controller: 'ResourceAPISpecController',
            params: {resource: resource}
          })
          .state('api' + resource.title + '.embed', {
            url: '/embed',
            templateUrl: 'views/resource/resource-api.embed.html',
            controller: 'ResourceAPIEmbedController',
            params: {resource: resource}
          })
          .state('list' + resource.title + 'Submissions', {
            url: resource.url + '/:id/submission',
            templateUrl: 'views/resource/resource-submissions.html',
            controller: 'ResourceSubmissionsController',
            params: {resource: resource}
          })
          .state('view' + resource.title + 'Submission', {
            url: resource.url + '/:id/submission/:subId',
            templateUrl: 'views/resource/resource-submission-view.html',
            controller: 'ResourceSubmissionViewController',
            params: {resource: resource}
          })
          .state('edit' + resource.title + 'Submission', {
            url: resource.url + '/:id/submission/:subId/edit',
            templateUrl: 'views/resource/resource-submission-edit.html',
            controller: 'ResourceSubmissionEditController',
            params: {resource: resource}
          })
          .state('delete' + resource.title + 'Submission', {
            url: resource.url + '/:id/submission/:subId/delete',
            templateUrl: 'views/resource/resource-submission-delete.html',
            controller: 'ResourceSubmissionDeleteController',
            params: {resource: resource}
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

app.service('Submission', function(Restangular) {
  return {
    on: function(resource, resourceId) {
      return Restangular.service('submission', Restangular.one(resource, resourceId));
    }
  };
});

// The resource list directive.
app.directive('resourceList', function() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'views/resource/resource-list.html',
    scope: {
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
      'Restangular',
      function(
        $scope,
        Restangular
      ) {
        $scope.resources = [];
        $scope.resourcesPerPage = $scope.numPerPage;
        $scope.resourceUrl = Restangular.all($scope.resourceName).getRestangularUrl();
        $scope.resourceInfo = {
          title: $scope.resourceTitle,
          name: $scope.resourceName
        };
      }
    ]
  };
});

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
    $scope.nav[$stateParams.resource.name] = {view: true};
    $scope.resourceUrl = $location.url();
    $scope.resourceInfo = $stateParams.resource;
    $scope.resource = {};

    $scope.$on('formLoad', function(event, form) {
      $scope.resource = form;
    });

    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      $state.go('view' + $stateParams.resource.title + 'Submission', {id: $scope.resource._id, subId: submission._id});
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
    $scope.resourceName = $stateParams.resource.name;
    $scope.resource = {title: '', components: []};
    $scope.nav = {};
    $scope.resourceInfo = $stateParams.resource;
    $scope.nav[$stateParams.resource.name] = {edit: true};
    if ($scope.resourceInfo.onCreate) {
      $scope.resourceInfo.onCreate($scope, $state, $stateParams, Restangular, FormioAlerts);
    }
    $scope.saveResource = function() {
      Restangular
        .all($stateParams.resource.name)
        .post($scope.resource).then(function(resource) {
          FormioAlerts.addAlert({
            type: 'success',
            message: 'Successfully created form!'
          });
          $state.go('api' + $stateParams.resource.title, {id: resource._id});
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
    $scope.resourceInfo = $stateParams.resource;
    $scope.nav[$stateParams.resource.name] = {edit: true};
    if ($scope.resourceInfo.onEdit) {
      $scope.resourceInfo.onEdit($scope, $state, $stateParams, Restangular, FormioAlerts);
    }
    Restangular
      .one($stateParams.resource.name, $stateParams.id)
      .get()
      .then(function(resource) {
        $scope.resource = resource;
        $scope.saveResource = function() {
          $scope.resource.save().then(function() {
            FormioAlerts.addAlert({
              type: 'success',
              message: 'Saved form successfull.'
            });
            $state.go('view' + $stateParams.resource.title, {id: resource._id});
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
    $scope.nav[$stateParams.resource.name] = {'delete': true};
    $scope.resourceInfo = $stateParams.resource;
    $scope.resource = Restangular.one($stateParams.resource.name, $stateParams.id).get().$object;
    $scope.deleteResource = function() {
      $scope.resource.remove().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successfull.'
        });
        $state.go('list' + $stateParams.resource.title + 's');
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
    $scope.resource = Restangular.one($stateParams.resource.name, $stateParams.id).get().$object;
    $scope.resourceInfo = $stateParams.resource;
    $scope.nav = {};
    $scope.nav[$stateParams.resource.name] = {api: true};
    $state.transitionTo('api' + $stateParams.resource.title + '.spec', {
      id: $stateParams.id
    });
  }
]);

app.controller('ResourceAPISpecController', [
  '$scope',
  function(
    $scope
  ) {
    // Function to get the swagger url.
    $scope.getSwaggerURL = function() {
      return 'http://localhost:3000/form/' + $scope.resource._id + '/spec.html';
    };
    $scope.nav[$scope.$parent.resourceInfo.name] = {api: {spec: true}};
  }
]);

app.controller('ResourceAPIEmbedController', [
  '$scope',
  function(
    $scope
  ) {
    $scope.nav[$scope.$parent.resourceInfo.name] = {api: {embed: true}};
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
    $scope.resourceInfo = $stateParams.resource;
    $scope.nav[$stateParams.resource.name] = {submission: true};
    $scope.resourceUrl = $location.url().replace('/submission', '');
    $scope.resource = {};

    $scope.$on('formLoad', function(event, form) {
      $scope.resource = form;
    });

    $scope.$on('submissionView', function(event, submission) {
      $state.go('view' + $scope.resourceInfo.title + 'Submission', {
        id: $scope.resource._id,
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('edit' + $scope.resourceInfo.title + 'Submission', {
        id: $scope.resource._id,
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('delete' + $scope.resourceInfo.title + 'Submission', {
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
  'Submission',
  function(
    $scope,
    $stateParams,
    Formio,
    Restangular,
    Submission
  ) {
    $scope.nav = {form: {submission: {'view': true}}};
    $scope.resourceInfo = $stateParams.resource;
    $scope.submissionData = Formio.submissionData;
    $scope.submission = Submission.on($stateParams.resource.name, $stateParams.id).one($stateParams.subId).get().$object;
    $scope.resource = Restangular.one($stateParams.resource.name, $stateParams.id).get().$object;
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
    $scope.nav[$stateParams.resource.name] = {submission: {'edit': true}};
    $scope.resourceInfo = $stateParams.resource;
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
      $state.go('list' + $stateParams.resource.title + 'Submissions', {id: $stateParams.id});
    });

    $scope.deleteSubmission = function() {
      $scope.submission.remove().then(function() {
        $state.go('list' + $stateParams.resource.title + 'Submissions', {id: $stateParams.id});
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
    $scope.nav[$stateParams.resource.name] = {submission: {'delete': true}};
    $scope.resource = {_id: $stateParams.id};
    $scope.submissionUrl = $location.url();
    $scope.resourceInfo = $stateParams.resource;

    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go('list' + $stateParams.resource.title + 'Submissions', {id: $stateParams.id});
    });

    $scope.$on('cancel', function() {
      $state.go('view' + $stateParams.resource.title + 'Submission', {id: $stateParams.id, subId: $stateParams.subId});
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });
  }
]);
