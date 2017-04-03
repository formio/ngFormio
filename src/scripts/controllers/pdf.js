'use strict';

angular.module('formioApp.controllers.pdf', ['ngDialog'])
  .controller('PDFController', [
    '$scope',
    '$stateParams',
    'AppConfig',
    '$http',
    'Formio',
    'ngDialog',
    'FormioAlerts',
    function(
      $scope,
      $stateParams,
      AppConfig,
      $http,
      Formio,
      ngDialog,
      FormioAlerts
    ) {
      $scope.availablePDFs = [];
      $scope.forms = {};
      $scope.buyPrice = 0;
      $scope.buyError = '';
      $scope.buyNumber = 0;
      $scope.getPDFUrl = function(pdf) {
        return AppConfig.pdfServer + pdf.data.path + '.html';
      };

      $scope.getAvailable = function() {
        return parseInt($scope.pdfInfo.data.total, 10) - parseInt($scope.pdfInfo.data.active, 10);
      };

      $scope.type = function() {
        return ($scope.buyType === 'pdfs') ? 'PDF Forms' : 'Submission PDFs';
      };

      $scope.total = function() {
        var total = '$' + $scope.buyPrice + ' ';
        total += ($scope.buyType === 'pdfs') ? 'per month' : 'one time';
        return total;
      };

      $scope.askToBuy = function() {
        $scope.purchaseAsk = true;
      };

      $scope.calculateTotal = function() {
        if ($scope.buyType === 'pdfs') {
          $scope.buyPrice = parseInt(parseFloat($scope.buyNumber) * parseFloat(AppConfig.pdfPrice), 10);
        }
        else {
          $scope.buyPrice = parseInt((parseFloat($scope.buyNumber) * parseFloat(AppConfig.pdfPrice)) / 1000, 10);
        }
      };

      $scope.decrementAmount = function() {
        $scope.buyNumber -= ($scope.buyType === 'pdfs') ? 5 : 1000;
        if ($scope.buyNumber < $scope.buyMin) {
          $scope.buyNumber = $scope.buyMin;
        }
        $scope.calculateTotal();
      };

      $scope.incrementAmount = function() {
        $scope.buyNumber += ($scope.buyType === 'pdfs') ? 5 : 1000;
        $scope.calculateTotal();
      };

      $scope.cancel = function() {
        ngDialog.close();
      };

      $scope.makePurchase = function() {
        $scope.buyError = '';
        var data = {
          pdf: '0',
          submission: '0'
        };

        if ($scope.buyType === 'pdfs') {
          data.pdf = $scope.buyNumber.toString();
        }
        else {
          data.submission = $scope.buyNumber.toString();
        }

        // Post the results.
        $http.post($scope.pdfProject + '/purchase', data, {
          headers: {
            'x-jwt-token': Formio.getToken()
          }
        }).then(function(results) {
          $scope.pdfInfo.data = results.data.data;
          $scope.buyComplete = true;
        }, function(err) {
          FormioAlerts.onError({message: err.data});
        }).catch(function(err) {
          FormioAlerts.onError({message: err.data});
        });
      };

      $scope.purchase = function(type) {
        $scope.buyComplete = false;
        $scope.purchaseAsk = false;
        $scope.buyType = type;
        $scope.buyNumber = (type === 'pdfs') ? 5 : 1000;
        $scope.buyMin = $scope.buyNumber;
        $scope.calculateTotal();
        ngDialog.open({
          template: 'views/project/pdf/purchase.html',
          scope: $scope
        });
      };

      $scope.getPDFs = function() {
        // Get all of the pdfs for this project.
        $http.get($scope.pdfProject + '/file', {
          headers: {
            'x-jwt-token': Formio.getToken()
          }
        }).then(function(results) {
          $scope.availablePDFs = results.data;
        });
      };

      $scope.confirmDelete = function() {
        $http.delete($scope.pdfProject + '/file/' + $scope.currentPDF.data.id, {
          headers: {
            'x-jwt-token': Formio.getToken()
          }
        }).then(function(results) {
          $scope.pdfInfo.data.active = (parseInt($scope.pdfInfo.data.active, 10) - 1).toString();
          $scope.cancel();
          $scope.getPDFs();
        }, function(err) {
          FormioAlerts.onError({message: err.data});
          $scope.cancel();
        }).catch(function(err) {
          FormioAlerts.onError({message: err.data});
          $scope.cancel();
        });
      };

      $scope.deletePDF = function(pdf) {
        $scope.currentPDF = pdf;
        ngDialog.open({
          template: 'views/project/pdf/delete.html',
          scope: $scope
        });
      };

      $scope.pdfProject = AppConfig.pdfServer + '/pdf/' + $stateParams.projectId;
      $scope.pdfInfo = {};
      $http.get($scope.pdfProject, {
        headers: {
          'x-jwt-token': Formio.getToken()
        }
      }).then(function(results) {
        $scope.pdfInfo = results.data;
      });

      // Get all of the forms that have a pdf attached to them.
      $http.get(AppConfig.apiBase + '/project/' + $stateParams.projectId + '/form', {
        params: {
          'settings.pdf.id__exists': 1,
          'select': 'settings.pdf.id,title,type',
          'limit': '100'
        }
      }).then(function(results) {
        angular.forEach(results.data, function(form) {
          if (!$scope.forms[form.settings.pdf.id]) {
            $scope.forms[form.settings.pdf.id] = [];
          }
          $scope.forms[form.settings.pdf.id].push(form);
        });
        console.log($scope.forms);
      });

      $scope.getPDFs();
    }
  ]);
