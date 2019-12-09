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

        getLicenseAdminInfo: async licenseId => {
          const adminInfo = await LicenseServerHelper.get(`license/${licenseId}/admin`, {}, {
            'x-jwt-token': await Formio.getToken()
          })

          adminInfo.terms.startDateFormatted = adminInfo.terms.startDate ?
            moment(adminInfo.terms.startDate).format('YYYY-MM-DD') :
            ''

          adminInfo.terms.endDateFormatted = adminInfo.terms.endDate ?
            moment(adminInfo.terms.endDate  ).format('YYYY-MM-DD') :
            ''

          adminInfo.usage = {
            apiServers:      _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'apiServer'        ).length,
            pdfServers:      _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'pdfServer'        ).length,
            projects:        _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'project'          ).length,
            tenants:         _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'tenant'           ).length,
            formsPerProject: _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'form'             ).length,
            formLoads:       _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'formRequest'      ).length,
            submissions:     _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'submissionRequest').length,
            pdfDownloads:    _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'pdfDownload'      ).length,
            pdfUploads:      _.filter(adminInfo.utilizations, u => u.data.enabled && u.data.type === 'pdfUpload'        ).length,
          }

          return adminInfo
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
      // TODO: get licenses by current user
      $scope.licenses = [
        {_id: '5db89036f4e4449776821d38'},
        {_id: '67890'}
      ]

      $scope.selectedLicense = null
      $scope.licenseAdminInfo = {}

      // $scope.loading = true
      // $scope.primaryProject = null
      // $scope.licenseError = null
      // $scope.licenseScopes = []
      // $scope.enableSave = true

      // // $scope.cancel = () => ngDialog.close()

      // $scope.saveLicenseKey = () => LicenseServerHelper.setLicenseKey()

      $scope.updateSelectedLicense = async newValue => {
        $scope.selectedLicense = newValue
        console.log('selectedLicense:', $scope.selectedLicense)

        try {
          $scope.licenseAdminInfo = await LicenseServerHelper.getLicenseAdminInfo($scope.selectedLicense._id)
          console.log('licenseAdminInfo:', $scope.licenseAdminInfo)

          $scope.utilizations = _.map($scope.licenseAdminInfo.utilizations, utilization => {
            const merged = _.merge({}, utilization, utilization.data)
            delete merged.data

            _.each(['projectId', 'tenantId', 'formId', 'fileId', 'path'], key => {
              if (merged[key] === undefined) {
                merged[key] = '-'
              }
            })

            return merged
          })

          console.log('utilizations:', $scope.utilizations)
        }
        catch (err) {
          console.log('encountered error', err)
          $scope.licenseAdminInfo = {}
          $scope.utilizations = []
        }
        finally {
          $scope.updateGridOptions()
          $scope.$digest()
        }
      }

      $scope.updateGridOptions = () => {
        $scope.gridOptions = {
          dataSource: new kendo.data.DataSource({
            sort: {dir: 'desc', field: 'created'},
            data: $scope.utilizations
          }),
          columns: [
            {field: 'created',    title: 'Date'       },
            {field: 'licenseKey', title: 'License Key'},
            {field: 'type',       title: 'Type'       },
            {field: 'projectId',  title: 'Project ID' },
            {field: 'tenantId',   title: 'Tenant ID'  },
            {field: 'formId',     title: 'Form ID'    },
            {field: 'fileId',     title: 'File ID'    },
            {field: 'path',       title: 'Path'       },
            {field: 'enabled',    title: 'Enabled'    },
          ],
          scrollable: true,
          sortable: true,
          width: 1500,
          height: 600
        }
      }

      $scope.updateSelectedLicense($scope.licenses[0])
    }
  ])