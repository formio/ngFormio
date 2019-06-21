'use strict';

var app = angular.module('formioApp.controllers.actions', ['ngFormBuilder']);

app.controller('ActionsController', [
  '$scope',
  'Formio',
  function(
    $scope,
    Formio
  ) {
    $scope.actionsUrl = Formio.getProjectUrl() + '/action';
    $scope.actionsQuery = {
      sort: '-modified',
      limit: 25,
    };

    const filter = (key, value) => {
      if (!value) {
        delete $scope.actionsQuery[key];
      }
      else {
        $scope.actionsQuery[key] = value;
      }
    };

    // Watch filters.
    $scope.$watch('title', (value) => filter('title__regex', value));
    $scope.$watch('formId', (value) => filter('formId, value'));
    $scope.$watch('submissionId', (value) => filter('submissionId', value));
    $scope.$watch('handler', (value) => filter('handler', value));
    $scope.$watch('method', (value) => filter('method', value));
    $scope.$watch('actionState', (value) => filter('state', value));

    $scope.viewRow = (action) => {
      console.log('view', action);
    }
  }
]);
