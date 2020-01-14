'use strict'
import _ from 'lodash';
import moment from 'moment'

/* globals location */


angular.module('formioApp.controllers.licenseManagement', ['ngDialog'])
  .filter('filterFunc', function() {
    return function(value, func) {
      return func(value);
    };
  })
  .filter('planName', function() {
    return function(plan) {
      if (!plan) {
        return '';
      }
      const plans = {
        basic: 'Basic',
        trial: 'Trial',
        independent: 'Independent',
        team: 'Team Pro',
        commercial: 'Enterprise',
      };
      return plans[plan];
    };
  })
  .filter('planType', function() {
    return function(hosted) {
      return hosted ? 'Hosted' : 'On Premise';
    };
  })
  .filter('planUsers', function() {
    return function(users) {
      if (!users) {
        return '';
      }
      return users.map(function(user) {
        return user.data.name + ' (' + user.data.email + ')'
      }).join(', ');
    };
  })
  .filter('scopeValue', function() {
    return function(value, type) {
      switch (type) {
        case 'boolean':
          return value !== '0' ? 'Yes' : 'No';
        case 'capitalize':
          return _.capitalize(value);
        default:
          return value;
      }
    };
  })
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

        getLicensesAdmin: async (querystring) => {
          return await LicenseServerHelper.get(`admin/license`, querystring, {
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
      $scope.open = {};

      $scope.openLicense = ($index) => {
        $scope.open[$index] = true;
      };

      $scope.closeLicense = ($index) => {
        $scope.open[$index] = false;
      };

      $scope.licenses = await LicenseServerHelper.getLicenses();
      $scope.$apply();
    }
  ])
  .directive('licenseInfo', function() {
    return {
      restrict: 'E',
      scope: {
        license: '='
      },
      controller: ['LicenseServerHelper', '$scope', async function LicenseInfoController(LicenseServerHelper, $scope) {
        $scope.scopes = [
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
                title: 'Enabled',
                type: 'boolean',
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
                title: 'Enabled',
                type: 'boolean',
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
                title: 'Type',
                type: 'capitalize'
              },
              {
                field: 'status',
                title: 'Enabled',
                type: 'boolean',
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
                title: 'Type',
                type: 'capitalize'
              },
              {
                field: 'status',
                title: 'Enabled',
                type: 'boolean',
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
                title: 'Type',
                type: 'capitalize'
              },
              {
                field: 'status',
                title: 'Enabled',
                type: 'boolean',
              },
            ]
          },
        ];

        $scope.setScope = async (scope) => {
          $scope.currentScope = scope;
          $scope.utilizations = await LicenseServerHelper.getLicenseUtilizations($scope.license._id, scope.prop);
          $scope.$apply();
        };

        try {
          $scope.licenseAdminInfo = await LicenseServerHelper.getLicenseAdminInfo($scope.license._id);
        }
        catch (err) {
          $scope.licenseAdminInfo = {};
          $scope.utilizations = [];
        }
        finally {
          $scope.$apply();
        }

        $scope.onAction = async (utilization, action, field) => {
          const {id, status, lastCheck, ...data} = utilization;
          data.licenseId = $scope.license._id;
          data.type = $scope.currentScope.prop.substring(0, $scope.currentScope.prop.length - 1);
          await LicenseServerHelper.utilizationAction(data, action);
          if (action === 'enable') {
            $scope.licenseAdminInfo.usage[$scope.currentScope.prop]++;
          }
          else {
            $scope.licenseAdminInfo.usage[$scope.currentScope.prop]--;
          }
          $scope.setScope($scope.currentScope);
          $scope.$apply();
        };
      }],
      template: `
<div>
  <div ng-if="licenseAdminInfo.terms">
    <div 
      class="btn btn-primary" 
      ng-repeat="scope in scopes track by $index" 
      ng-click="setScope(scope)"
      ng-if="licenseAdminInfo.scopes.indexOf(scope.prop.substring(0, scope.prop.length - 1)) !== -1"
      style="margin-right: 10px;"
    >{{scope.title}}: 
      <span class="usage-current" ng-if="!scope.noScope">
        {{licenseAdminInfo.usage[scope.prop].toLocaleString() || 0}} /
      </span>
      <span class="usage-max">{{licenseAdminInfo.terms[scope.prop].toLocaleString() || '∞'}}</span>
    </div>&nbsp;
  </div>
  <table class="table" ng-if="currentScope">
    <thead>
      <th ng-repeat="column in currentScope.columns track by $index">{{column.title}}</th>
      <th>Action</th>
    </thead>
    <tbody>
      <tr ng-repeat="utilization in utilizations track by $index">
        <td ng-repeat="column in currentScope.columns track by $index">{{utilization[column.field] | scopeValue : column.type}}</td>
        <td>
          <span class="btn btn-info" ng-if="utilization.status === '0'" ng-click="onAction(utilization, 'enable', column.field)">Enable</span>
          <span class="btn btn-danger" ng-if="utilization.status === '1'" ng-click="onAction(utilization, 'disable', column.field)">Disable</span>
        </td>
      </tr>
      <tr ng-if="utilizations.length === 0">
        <td>None</td>
      </tr>
    </tbody>
  </table>
</div>
`
    }
  });
