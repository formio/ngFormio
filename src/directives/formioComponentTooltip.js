module.exports = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: false,
    template: '<i ng-if="component.tooltip"' +
    ' class="glyphicon glyphicon-question-sign"' +
    ' ng-class="{ \'text-muted\': component.type !== \'button\' }"' +
    ' uib-tooltip="{{ component.tooltip | formioTranslate:null:options.building }}"' +
    ' tooltip-placement="right"' +
    ' tooltip-popup-close-delay="100" id="{{component.key+\'Desc\'}}"></i>'
  };
};
