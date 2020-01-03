'use strict'
import moment from 'moment'

/* globals location */


angular.module('formioApp.controllers.licenseManagement', ['ngDialog'])
  .factory('LicenseServerHelper', [
    '$http',
    'Formio',
    function(
      $http,
      Formio
    ) {
      var LicenseServerHelper = {
        get: async (path, params = {}, headers = {}) => {
          const response = await $http.get('http://localhost:3006/' + path, {params, headers})
          return response.data
        },

        post: async (path, body = {}, headers = {}) => {
          const response = await $http.post('http://localhost:3006/' + path, body, {headers})
          return response.data
        },

        getLicenses: async () => {
          return await LicenseServerHelper.get(`license`, {}, {
            'x-jwt-token': await Formio.getToken(),
          });
        },

        getLicenseAdminInfo: async licenseId => {
          const adminInfo = await LicenseServerHelper.get(`license/${licenseId}/admin`, {}, {
            'x-jwt-token': await Formio.getToken()
          })

          adminInfo.terms.startDateFormatted = adminInfo.terms.startDate ?
            moment(adminInfo.terms.startDate).format('YYYY-MM-DD') :
            ''

          adminInfo.terms.endDateFormatted = adminInfo.terms.endDate ?
            moment(adminInfo.terms.endDate  ).format('YYYY-MM-DD') :
            'Never';

          const plans = {
            basic: 'Basic',
            trial: 'Trial',
            independent: 'Independent',
            team: 'Team Pro',
            commercial: 'Enterprise',
          };

          adminInfo.terms.plan = plans[adminInfo.terms.plan];

          return adminInfo
        },

        getLicenseUtilizations: async (licenseId, type, query = '') => {
          type = type.substring(0, type.length - 1);
          const results = await LicenseServerHelper.get(`license/${licenseId}/utilizations/${type}?${query}`, {}, {
            'x-jwt-token': await Formio.getToken()
          });

          return results;
        },

        utilizationAction: async (data, action) => {
          const results = await LicenseServerHelper.post(`utilization/${action}`, data, {
            'x-jwt-token': await Formio.getToken()
          });

          return results;
        },
      }

      return LicenseServerHelper
    }
  ])
  .controller('LicenseManagementController', [
    '$scope',
    'LicenseServerHelper',
    async function(
      $scope,
      LicenseServerHelper
    ) {

      $scope.currentLicense = null
      $scope.licenseAdminInfo = {}

      $scope.scopes = [
        {
          title: 'Plan',
          prop: 'plan',
          noScope: true,
        },
        {
          title: 'Start Date',
          prop: 'startDateFormatted',
          noScope: true,
        },
        {
          title: 'End Date',
          prop: 'endDateFormatted',
          noScope: true,
        },
        {
          title: 'API Servers',
          prop: 'apiServers',
          columns: [
            {
              field: 'id',
              title: 'Environment ID'
            },
            {
              field: 'hostname',
              title: 'Hostname'
            },
            {
              field: 'mongoHash',
              title: 'Mongo Hash'
            },
            {
              field: 'status',
              title: 'Enabled'
            },
          ]
        },
        {
          title: 'PDF Servers',
          prop: 'pdfServers',
          columns: [
            {
              field: 'id',
              title: 'Environment ID'
            },
            {
              field: 'hostname',
              title: 'Hostname'
            },
            {
              field: 'mongoHash',
              title: 'Mongo Hash'
            },
            {
              field: 'status',
              title: 'Enabled'
            },
          ]
        },
        {
          title: 'Projects',
          prop: 'projects',
          columns: [
            {
              field: 'id',
              title: 'Project ID'
            },
            {
              field: 'title',
              title: 'Title'
            },
            {
              field: 'name',
              title: 'Name'
            },
            {
              field: 'projectType',
              title: 'Type'
            },
            {
              field: 'status',
              title: 'Enabled'
            },
          ]
        },
        {
          title: 'Tenants',
          prop: 'tenants',
          columns: [
            {
              field: 'id',
              title: 'Tenant ID'
            },
            {
              field: 'title',
              title: 'Title'
            },
            {
              field: 'name',
              title: 'Name'
            },
            {
              field: 'projectType',
              title: 'Type'
            },
            {
              field: 'status',
              title: 'Enabled'
            },
          ]
        },
        {
          title: 'Form Manager Projects',
          prop: 'formManagers',
          columns: [
            {
              field: 'id',
              title: 'Project ID'
            },
            {
              field: 'title',
              title: 'Title'
            },
            {
              field: 'name',
              title: 'Name'
            },
            {
              field: 'projectType',
              title: 'Type'
            },
            {
              field: 'status',
              title: 'Enabled'
            },
          ]
        },
      ];

      $scope.setLicense = async newValue => {
        $scope.currentLicense = newValue

        try {
          $scope.licenseAdminInfo = await LicenseServerHelper.getLicenseAdminInfo($scope.currentLicense._id)
        }
        catch (err) {
          $scope.licenseAdminInfo = {}
          $scope.utilizations = []
        }
        finally {
          $scope.$apply()
        }
      }

      $scope.setScope = async (scope) => {
        $scope.currentScope = scope;
        $scope.utilizations = await LicenseServerHelper.getLicenseUtilizations($scope.currentLicense._id, scope.prop);
        $scope.$apply();
      };

      $scope.getValue = (value) => {
        if (value === '1') {
          return 'Yes';
        }
        if (value === '0') {
          return 'No';
        }
        return value;
      };

      $scope.onAction = async (utilization, action) => {
        const {id, status, lastCheck, ...data} = utilization;
        data.licenseId = $scope.currentLicense._id;
        data.type = $scope.currentScope.prop.substring(0, $scope.currentScope.prop.length - 1);
        await LicenseServerHelper.utilizationAction(data, action);
        $scope.setLicense($scope.currentLicense);
        $scope.setScope($scope.currentScope);
      };

      $scope.licenses = await LicenseServerHelper.getLicenses();
      if ($scope.licenses.length) {
        $scope.setLicense($scope.licenses[0]);
      }
    }
  ]);
