'use strict';

describe('Controller: CompanyCreateCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var CompanyCreateCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CompanyCreateCtrl = $controller('CompanyCreateCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
