'use strict';

/**
 * @ngdoc function
 * @name boardmanApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the boardmanApp
 */
angular.module('boardmanApp')
  .controller('MainCtrl', [
    '$scope',
    '$rootScope',
    function (
      $scope,
      $rootScope
    ) {
      $scope.$on('formioSubmit', function(event, data) {
        console.log(data);
      });
      $scope.quotes = [];
      $scope.quotesUrl = $rootScope.baseUrl + $rootScope.quoteForm + '/submission';
      $scope.customers = [];
      $scope.customersUrl = $rootScope.baseUrl + $rootScope.customerForm + '/submission';
      $scope.companies = [];
      $scope.companiesUrl = $rootScope.baseUrl + $rootScope.companyForm + '/submission';
      $scope.agents = [];
      $scope.agentsUrl = $rootScope.baseUrl + $rootScope.agentForm + '/submission';
    }
  ]);
