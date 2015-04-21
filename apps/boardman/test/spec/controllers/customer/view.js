'use strict';

describe('Controller: CustomerViewCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var CustomerViewCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CustomerViewCtrl = $controller('CustomerViewCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
