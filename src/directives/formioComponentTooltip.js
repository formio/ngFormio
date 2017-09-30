module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: false,
    template: '<i ng-if="component.tooltip"' +
    ' class="glyphicon glyphicon-question-sign text-muted"' +
    ' uib-tooltip="{{ component.tooltip }}"' +
    ' tooltip-placement="right"' +
    ' tooltip-popup-close-delay="100"></i>'
  };
};
