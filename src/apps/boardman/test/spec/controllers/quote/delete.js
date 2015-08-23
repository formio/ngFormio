'use strict';

describe('Controller: QuoteDeleteCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var QuoteDeleteCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    QuoteDeleteCtrl = $controller('QuoteDeleteCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
