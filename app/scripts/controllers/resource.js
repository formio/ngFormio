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
          .state('app.' + resourceInfo.name, {
            abstract: true,
            url: resourceInfo.url + '/:id',
            parent: 'app',
            templateUrl: 'views/resource/resource-root.html',
            controller: 'ResourceController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.' + resourceInfo.name + '.view', {
            url: '',
            parent: 'app.' + resourceInfo.name,
            templateUrl: 'views/resource/resource-view.html',
            controller: 'ResourceViewController'
          })
          .state('app.' + resourceInfo.name + '.edit', {
            url: '/edit',
            parent: 'app.' + resourceInfo.name,
            templateUrl: 'views/resource/resource-edit.html'
          })
          .state('app.' + resourceInfo.name + '.delete', {
            url: '/delete',
            parent: 'app.' + resourceInfo.name,
            templateUrl: 'views/resource/resource-delete.html',
            controller: 'ResourceDeleteController'
          })
          .state('app.' + resourceInfo.name + '.create', {
            url: '/create/' + resourceInfo.name,
            parent: 'app',
            templateUrl: 'views/resource/resource-create.html',
            controller: 'ResourceCreateController',
            params: {resourceInfo: resourceInfo}
          })
          .state('app.' + resourceInfo.name + '.index', {
            url: resourceInfo.url,
            parent: 'app',
            template: '<resource-list' + resourceParam + '></resource-list>'
          })
          .state('app.' + resourceInfo.name + '.api', {
            url: '/api',
            parent: 'app.' + resourceInfo.name,
            templateUrl: 'views/resource/resource-api.html',
            controller: 'ResourceAPIController'
          })
          .state('app.' + resourceInfo.name + '.api.spec', {
            url: '/spec',
            parent: 'app.' + resourceInfo.name + '.api',
            templateUrl: 'views/resource/resource-api.spec.html',
            controller: 'ResourceAPISpecController'
          })
          .state('app.' + resourceInfo.name + '.api.embed', {
            url: '/embed',
            parent: 'app.' + resourceInfo.name + '.api',
            templateUrl: 'views/resource/resource-api.embed.html'
          })
          .state('app.' + resourceInfo.name + '.actions', {
            url: '/actions',
            parent: 'app.' + resourceInfo.name,
            templateUrl: 'views/resource/resource-actions.html'
          })
          .state('app.' + resourceInfo.name + '.subs', {
            abstract: true,
            url: '/submission',
            parent: 'app.' + resourceInfo.name,
            template: '<div ui-view></div>'
          })
          .state('app.' + resourceInfo.name + '.subs.index', {
            url: '',
            parent: 'app.' + resourceInfo.name + '.subs',
            templateUrl: 'views/resource/resource-submissions.html',
            controller: 'ResourceSubmissionsController'
          })
          .state('app.' + resourceInfo.name + '.subs.sub', {
            abstract: true,
            url: '/:subId',
            parent: 'app.' + resourceInfo.name + '.subs',
            controller: 'ResourceSubmissionController',
            templateUrl: 'views/resource/resource-submission.html'
          })
          .state('app.' + resourceInfo.name + '.subs.sub.view', {
            url: '',
            parent: 'app.' + resourceInfo.name + '.subs.sub',
            templateUrl: 'views/resource/resource-submission-view.html'
          })
          .state('app.' + resourceInfo.name + '.subs.sub.edit', {
            url: '/edit',
            parent: 'app.' + resourceInfo.name + '.subs.sub',
            templateUrl: 'views/resource/resource-submission-edit.html',
            controller: 'ResourceSubmissionEditController'
          })
          .state('app.' + resourceInfo.name + '.subs.sub.delete', {
            url: '/delete',
            parent: 'app.' + resourceInfo.name + '.subs.sub',
            templateUrl: 'views/resource/resource-submission-delete.html',
            controller: 'ResourceSubmissionDeleteController'
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
        var errors = error.hasOwnProperty('errors') ? error.errors : error.data.errors;
        _.each(errors, function (error) {
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

/**
 * Establish the resource scope.
 * @param $scope
 * @param $stateParams
 * @param Formio
 */
var formioResourceScope = function($scope, $state, $stateParams, Formio) {

  // Tests if the tab should be active.
  $scope.isActive = function(state) {
    return $state.current.name.indexOf(state) !== -1;
  };

  // Perform Camel Case.
  var camelCase = function(input) {
    return input.toLowerCase().replace(/ (.)/g, function(match, group1) {
      return group1.toUpperCase();
    });
  };

  // Application information.
  $scope.appId = $stateParams.appId;

  // Resource information.
  $scope.resourceId = $stateParams.id;
  $scope.resourceName = $stateParams.resourceInfo.name;
  $scope.resourceUrl = '/app/' + $stateParams.appId + '/' + $stateParams.resourceInfo.name;
  $scope.resourceUrl += $stateParams.id ? ('/' + $stateParams.id) : '';
  $scope.resourceInfo = $stateParams.resourceInfo;
  $scope.resource = {title: '', components: []};

  // Attach the name to the title of the resource.
  $scope.$watch('resource.title', function() {
    $scope.resource.name = $scope.resource.title ? camelCase($scope.resource.title) : '';
  });

  // Load the resource and submissions.
  $scope.formio = new Formio($scope.resourceUrl);

  // Load the resource.
  $scope.formio.loadForm().then(function(resource) {
    $scope.resource = resource;
  });

  /**
   * Used to save a new resource.
   */
  $scope.saveResource = function() {
    $scope.formio.saveForm($scope.resource).then(function(resource) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Successfully created form!'
      });
      $state.go('app.' + $stateParams.resourceInfo.name + '.view', {id: resource._id});
    }, FormioAlerts.onError.bind(FormioAlerts));
  };
};

app.controller('ResourceController', [
  '$scope',
  '$state',
  '$stateParams',
  'Formio',
  formioResourceScope
]);

app.controller('ResourceViewController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      $state.go('app.' + $scope.resourceInfo.name + '.subs.sub.view', {subId: submission._id});
    });
  }
]);

app.controller('ResourceCreateController', [
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
    formioResourceScope($scope, $state, $stateParams, Formio);
  }
]);

app.controller('ResourceDeleteController', [
  '$scope',
  '$state',
  'Formio',
  'FormioAlerts',
  function(
    $scope,
    $state,
    Formio,
    FormioAlerts
  ) {
    $scope.deleteResource = function() {
      $scope.formio.deleteForm().then(function() {
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Delete successfull.'
        });
        $state.go('app.' + $scope.resourceInfo.name + '.index');
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceAPIController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $state.transitionTo('app.' + $scope.resourceInfo.name + '.api.spec', {
      appId: $scope.appId,
      id: $scope.resourceId
    });
  }
]);

app.controller('ResourceAPISpecController', [
  '$scope',
  'AppConfig',
  function(
    $scope,
    AppConfig
  ) {
    $scope.getSwaggerURL = function() {
      return AppConfig.appBase + '/form/' + $scope.resource._id + '/spec.html';
    };
  }
]);

app.controller('ResourceSubmissionsController', [
  '$scope',
  '$state',
  function(
    $scope,
    $state
  ) {
    $scope.$on('submissionView', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.subs.sub.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.subs.sub.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go('app.' + $scope.resourceInfo.name + '.subs.sub.delete', {
        subId: submission._id
      });
    });
  }
]);

app.controller('ResourceSubmissionController', [
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
    // Submission information.
    $scope.submissionId = $stateParams.subId;
    $scope.submissionUrl = $scope.resourceUrl;
    $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
    $scope.submissionData = Formio.submissionData;
    $scope.submission = {};

    // Load the resource and submissions.
    $scope.formio = new Formio($scope.submissionUrl);

    // Load the submission.
    $scope.formio.loadSubmission().then(function(submission) {
      $scope.submission = submission;
    });
  }
]);

app.controller('ResourceSubmissionEditController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('formSubmission', function(event, submission) {
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      $state.go('app.' + $scope.resourceInfo.name + '.subs.index', {id: $scope.resourceId});
    });

    $scope.deleteSubmission = function() {
      $scope.formio.deleteSubmission().then(function() {
        $state.go('app.' + $scope.resourceInfo.name + '.subs.index', {id: $scope.resourceId});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

app.controller('ResourceSubmissionDeleteController', [
  '$scope',
  '$state',
  'FormioAlerts',
  function(
    $scope,
    $state,
    FormioAlerts
  ) {
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go('app.' + $scope.resourceInfo.name + '.subs.index');
    });

    $scope.$on('cancel', function() {
      $state.go('app.' + $scope.resourceInfo.name + '.subs.sub.view');
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });
  }
]);
