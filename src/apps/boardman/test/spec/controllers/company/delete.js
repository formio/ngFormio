'use strict';

describe('Controller: CompanyDeleteCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var CompanyDeleteCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CompanyDeleteCtrl = $controller('CompanyDeleteCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
