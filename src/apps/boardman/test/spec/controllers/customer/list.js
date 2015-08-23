'use strict';

describe('Controller: CustomerListCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var CustomerListCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CustomerListCtrl = $controller('CustomerListCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
