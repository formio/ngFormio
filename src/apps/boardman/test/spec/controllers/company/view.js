'use strict';

describe('Controller: CompanyViewCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var CompanyViewCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CompanyViewCtrl = $controller('CompanyViewCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
