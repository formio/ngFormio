'use strict';

describe('Controller: QuoteViewCtrl', function () {

  // load the controller's module
  beforeEach(module('boardmanApp'));

  var QuoteViewCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    QuoteViewCtrl = $controller('QuoteViewCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
