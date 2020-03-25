'use strict';

/* globals location */

angular.module('formioApp.controllers.licenseKey', ['ngDialog'])
  .factory('LicenseKeyHelper', [
    '$http',
    'Formio',
    function(
      $http,
      Formio
    ) {
      var primaryPromise = null;

      var LicenseKeyHelper = {
        getPrimaryProject: async () => await primaryPromise,
        setPrimaryProject: async promise => primaryPromise = promise,

        getLicenseKey: async () => {
          const primaryProject = await LicenseKeyHelper.getPrimaryProject();
          return Promise.resolve(primaryProject.settings && primaryProject.settings.licenseKey);
        },

        setLicenseKey: async licenseKey => {
          const primaryProject = await LicenseKeyHelper.getPrimaryProject();

          if (!_.isUndefined(licenseKey)) {
            primaryProject.settings = primaryProject.settings || {};
            primaryProject.settings.licenseKey = licenseKey;
          }

          return (new Formio('/project/' + primaryProject._id)).saveProject(primaryProject);
        },

        getKeyScopes: async () => {
          const licenseKey = await LicenseKeyHelper.getLicenseKey();
          if (!licenseKey) {
            throw new Error('No license key specified on primary project')
          }

          const response = await $http.get(`http://localhost:3006/key/${licenseKey}/scope`);

          return response.data;
        },

        areScopesOkForClient: (scopes = []) => {
          return !_.intersection(['apiServer', 'pdfServer'], scopes).length
        }
      };

      return LicenseKeyHelper;
    }
  ])
  .controller('LicenseKeyController', [
    '$scope',
    'LicenseKeyHelper',
    async function(
      $scope,
      LicenseKeyHelper
    ) {
      $scope.loading = true;
      $scope.primaryProject = null;
      $scope.licenseError = null;
      $scope.licenseKeyScopes = [];
      $scope.enableSave = true;

      // $scope.cancel = () => ngDialog.close();

      $scope.saveLicenseKey = () => LicenseKeyHelper.setLicenseKey()

      // Fetch license scopes on license key change
      $scope.$watch('primaryProject.settings.licenseKey', async () => {
        try {
          const licenseKey = await LicenseKeyHelper.getLicenseKey();

          if (licenseKey) {
            console.log('license key');
            // Handle license key
            $scope.licenseKeyScopes = Object.entries(await LicenseKeyHelper.getKeyScopes())
              .filter(entry => entry[1])
              .map(entry => entry[0]);
            $scope.licenseError = null;
            $scope.enableSave = LicenseKeyHelper.areScopesOkForClient($scope.licenseKeyScopes);
          }
          else {
            // Handle no license key
            console.log('no license key');
            $scope.licenseKeyScopes = [];
            $scope.licenseError = null;
            $scope.enableSave = true;
          }
        }
        catch (err) {
          // Handle license key error
          $scope.licenseKeyScopes = [];
          $scope.licenseError = err.status == 500 ? 'License server error' : err.data || err.message;
          $scope.enableSave = false;
        }
        finally {
          console.log('primaryProject.settings.licenseKey: ', _.get($scope, 'primaryProject.settings.licenseKey'))
          console.log('licenseError: ', $scope.licenseError)
          console.log('licenseKeyScopes: ', $scope.licenseKeyScopes)
          console.log('enableSave: ', $scope.enableSave)
          // Force re-render
          $scope.$digest();
        }
      })

      // Make sure the primary project is loaded
      $scope.primaryProject = await LicenseKeyHelper.getPrimaryProject();
    }
  ]);