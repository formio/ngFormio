'use strict';

/**
 * @ngdoc overview
 * @name boardmanApp
 * @description
 * # boardmanApp
 *
 * Main module of the application.
 */
var formioBaseUrl = 'http://form.io/app/api';
angular
  .module('boardmanApp', [
    'formio',
    'ui.router',
    'ui.select',
    'angularMoment',
    'ngSanitize',
    'bgf.paginateAnything',
    'restangular',
    'angularMoment'
  ])
  .config([
    '$httpProvider',
    'FormioProvider',
    '$stateProvider',
    '$urlRouterProvider',
    '$sceDelegateProvider',
    function(
      $httpProvider,
      FormioProvider,
      $stateProvider,
      $urlRouterProvider
    ) {

      // Add authorization.
      $httpProvider.defaults.headers.common.Authorization = 'Basic ' + window.btoa(unescape(encodeURIComponent('formio:FoRmI@4ever!')));

      // Set the base url for formio.
      FormioProvider.setBaseUrl(formioBaseUrl);

      $stateProvider
        .state('home', {
          url: '/?',
          templateUrl: 'views/main.html',
          controller: 'MainCtrl'
        })
        .state('survey', {
          url: '/survey',
          templateUrl: 'views/survey.html'
        })
        .state('createQuote', {
          url: '/create/quote',
          templateUrl: 'views/quote/create.html',
          controller: 'QuoteCreateCtrl'
        })
        .state('viewQuote', {
          url: '/quote/:quoteId',
          templateUrl: 'views/quote/view.html',
          controller: 'QuoteViewCtrl'
        })
        .state('editQuote', {
          url: '/quote/:quoteId/edit',
          templateUrl: 'views/quote/edit.html',
          controller: 'QuoteEditCtrl'
        })
        .state('deleteQuote', {
          url: '/quote/:quoteId/delete',
          templateUrl: 'views/quote/delete.html',
          controller: 'QuoteDeleteCtrl'
        })
        .state('listQuotes', {
          url: '/quote',
          templateUrl: 'views/quote/index.html',
          controller: 'QuoteIndexCtrl'
        })
        .state('listCustomers', {
          url: '/customer',
          templateUrl: 'views/customer/index.html',
          controller: 'CustomerIndexCtrl'
        })
        .state('createCustomer', {
          url: '/create/customer',
          templateUrl: 'views/customer/create.html',
          controller: 'CustomerCreateCtrl'
        })
        .state('viewCustomer', {
          url: '/customer/:customerId',
          templateUrl: 'views/customer/view.html',
          controller: 'CustomerViewCtrl'
        })
        .state('editCustomer', {
          url: '/customer/:customerId/edit',
          templateUrl: 'views/customer/edit.html',
          controller: 'CustomerEditCtrl'
        })
        .state('deleteCustomer', {
          url: '/customer/:customerId/delete',
          templateUrl: 'views/customer/delete.html',
          controller: 'CustomerDeleteCtrl'
        })
        .state('listCompanies', {
          url: '/company',
          templateUrl: 'views/company/index.html',
          controller: 'CompanyIndexCtrl'
        })
        .state('createCompany', {
          url: '/create/company',
          templateUrl: 'views/company/create.html',
          controller: 'CompanyCreateCtrl'
        })
        .state('viewCompany', {
          url: '/company/:companyId',
          templateUrl: 'views/company/view.html',
          controller: 'CompanyViewCtrl'
        })
        .state('editCompany', {
          url: '/company/:companyId/edit',
          templateUrl: 'views/company/edit.html',
          controller: 'CompanyEditCtrl'
        })
        .state('deleteCompany', {
          url: '/company/:companyId/delete',
          templateUrl: 'views/company/delete.html',
          controller: 'CompanyDeleteCtrl'
        })
        .state('listAgents', {
          url: '/agent',
          templateUrl: 'views/agent/index.html',
          controller: 'AgentIndexCtrl'
        })
        .state('createAgent', {
          url: '/create/agent',
          templateUrl: 'views/agent/create.html',
          controller: 'AgentCreateCtrl'
        })
        .state('viewAgent', {
          url: '/agent/:agentId',
          templateUrl: 'views/agent/view.html',
          controller: 'AgentViewCtrl'
        })
        .state('editAgent', {
          url: '/agent/:agentId/edit',
          templateUrl: 'views/agent/edit.html',
          controller: 'AgentEditCtrl'
        })
        .state('deleteAgent', {
          url: '/agent/:agentId/delete',
          templateUrl: 'views/agent/delete.html',
          controller: 'AgentDeleteCtrl'
        });

      $urlRouterProvider.otherwise('/');
    }
  ])
  .run([
    '$rootScope',
    function(
      $rootScope
    ) {

      // Set the quote form.
      $rootScope.baseUrl = formioBaseUrl;
      /*
      $rootScope.quoteForm = '/app/5524894395c16ae3dc0d8bef/resource/55269d9964b8770c138eb7ed';
      $rootScope.customerForm = '/app/5524894395c16ae3dc0d8bef/resource/55269e2b64b8770c138eb7ef';
      $rootScope.companyForm = '/app/5524894395c16ae3dc0d8bef/resource/55269e5264b8770c138eb7f0';
      $rootScope.agentForm = '/app/5524894395c16ae3dc0d8bef/resource/55312198128b5a6b1d02640f';
      */
      $rootScope.quoteForm = '/app/552b2297d70ef854300001e5/resource/552b25eed7fae6f63c150e58';
      $rootScope.customerForm = '/app/552b2297d70ef854300001e5/resource/552b22b3d70ef854300001e6';
      $rootScope.companyForm = '/app/552b2297d70ef854300001e5/resource/552b258fd7fae6f63c150e57';
      $rootScope.agentForm = '/app/552b2297d70ef854300001e5/resource/552b2622d7fae6f63c150e59';
    }
  ]);
