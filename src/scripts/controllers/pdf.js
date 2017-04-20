'use strict';

/* globals chance, location */

angular.module('formioApp.controllers.pdf', ['ngDialog'])
  .factory('PDFServer', [
    '$http',
    'Formio',
    '$q',
    'AppConfig',
    function(
      $http,
      Formio,
      $q,
      AppConfig
    ) {
      var infoCache = {};
      return {
        ensureFileToken: function(project) {
          if (project.settings.filetoken) {
            return $q.resolve(project);
          }

          // Create a key and save the project.
          project.settings.filetoken = chance.string({
            length: 30,
            pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          });
          return (new Formio('/project/' + project._id)).saveProject(project);
        },
        ensureProject: function(projectPromise, cb) {
          return projectPromise.then(this.ensureFileToken.bind(this));
        },
        pdfUrl: function(project) {
          return AppConfig.pdfServer + '/pdf/' + project._id;
        },
        getInfo: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            if (infoCache.hasOwnProperty(project._id)) {
              return $q.resolve(infoCache[project._id]);
            }
            return $http.get(this.pdfUrl(project), {
              headers: {
                'x-file-token': project.settings.filetoken,
                'x-host': location.hostname
              }
            }).then(function(results) {
              infoCache[project._id] = results.data;
              return results.data;
            });
          }.bind(this));
        },
        purchasePDF: function(projectPromise, purchase) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (info.data.host !== location.hostname) {
                throw {data: 'Cannot modify pdfs under different host names.'};
              }
              infoCache[project._id] = null;
              return $http.post(this.pdfUrl(project) + '/purchase', purchase, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              });
            }.bind(this));
          }.bind(this));
        },
        deletePDF: function(projectPromise, pdf) {
          return this.ensureProject(projectPromise).then(function(project) {
            return this.getInfo(projectPromise).then(function(info) {
              if (info.data.host !== location.hostname) {
                throw {data: 'Cannot modify pdfs under different host names.'};
              }
              infoCache[project._id] = null;
              return $http.delete(this.pdfUrl(project) + '/file/' + pdf.data.id, {
                headers: {
                  'x-file-token': project.settings.filetoken,
                  'x-host': location.hostname
                }
              });
            }.bind(this));
          }.bind(this));
        },
        getPDFs: function(projectPromise) {
          return this.ensureProject(projectPromise).then(function(project) {
            return $http.get(this.pdfUrl(project) + '/file', {
              headers: {
                'x-file-token': project.settings.filetoken,
                'x-host': location.hostname
              }
            }).then(function(results) {
              return results.data;
            });
          }.bind(this));
        }
      };
    }
  ])
  .controller('PDFController', [
    '$scope',
    '$stateParams',
    'AppConfig',
    '$http',
    'ngDialog',
    'FormioAlerts',
    'PDFServer',
    function(
      $scope,
      $stateParams,
      AppConfig,
      $http,
      ngDialog,
      FormioAlerts,
      PDFServer
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

        PDFServer.purchasePDF($scope.loadProjectPromise, data).then(function(results) {
          $scope.pdfInfo.data = results.data.data;
          $scope.buyComplete = true;
        }, function(err) {
          FormioAlerts.onError({message: err.data || err.message});
        }).catch(function(err) {
          FormioAlerts.onError({message: err.data || err.message});
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
          template: 'views/project/env/pdf/purchase.html',
          scope: $scope
        });
      };

      $scope.getPDFs = function() {
        PDFServer.getPDFs($scope.loadProjectPromise).then(function(pdfs) {
          $scope.availablePDFs = pdfs;
        });
      };

      $scope.confirmDelete = function() {
        PDFServer.deletePDF($scope.loadProjectPromise, $scope.currentPDF).then(function() {
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

      $scope.pdfInfo = {};
      PDFServer.getInfo($scope.loadProjectPromise).then(function(info) {
        $scope.pdfInfo = info;
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
