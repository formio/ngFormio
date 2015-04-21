'use strict';

describe('Controller: QuoteCreateCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var QuoteCreateCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    QuoteCreateCtrl = $controller('QuoteCreateCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
