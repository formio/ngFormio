module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: false,
    template: '<i ng-if="component.tooltip"' +
    ' class="glyphicon glyphicon-question-sign text-muted"' +
    ' uib-popover="{{ component.tooltip }}"' +
    ' popover-trigger="\'mouseenter\'"' +
    ' popover-placement="right"' +
    ' popover-popup-close-delay="100"></i>'
  };
};
