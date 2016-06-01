var formioUtils = require('formio-utils');

module.exports = function() {
  return {
    flattenComponents: formioUtils.flattenComponents,
    eachComponent: formioUtils.eachComponent,
    getComponent: formioUtils.getComponent,
    hideFields: function(form, components) {
      this.eachComponent(form.components, function(component) {
        for (var i in components) {
          if (component.key === components[i]) {
            component.type = 'hidden';
          }
        }
      });
    },
    uniqueName: function(name) {
      var parts = name.toLowerCase().replace(/[^0-9a-z\.]/g, '').split('.');
      var fileName = parts[0];
      var ext = '';
      if (parts.length > 1) {
        ext = '.' + parts[(parts.length - 1)];
      }
      return fileName.substr(0, 10) + '-' + this.guid() + ext;
    },
    guid: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    },
    fieldWrap: function(input) {
      input = input + '<formio-errors></formio-errors>';
      var multiInput = input.replace('data[component.key]', 'data[component.key][$index]');
      var inputLabel = '<label ng-if="component.label && !component.hideLabel" for="{{ component.key }}" class="control-label" ng-class="{\'field-required\': component.validate.required}">{{ component.label | formioTranslate }}</label>';
      var requiredInline = '<span ng-if="!component.label && component.validate.required" class="glyphicon glyphicon-asterisk form-control-feedback field-required-inline" aria-hidden="true"></span>';
      var template =
        '<div ng-if="!component.multiple">' +
          inputLabel + requiredInline +
          '<div class="input-group" ng-if="component.prefix || component.suffix">' +
            '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
            input +
            '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
          '</div>' +
          '<div ng-if="!component.prefix && !component.suffix">' + input + '</div>' +
        '</div>' +
        '<div ng-if="component.multiple"><table class="table table-bordered">' +
          inputLabel +
          '<tr ng-repeat="value in data[component.key] track by $index">' +
            '<td>' + requiredInline +
              '<div class="input-group" ng-if="component.prefix || component.suffix">' +
                '<div class="input-group-addon" ng-if="!!component.prefix">{{ component.prefix }}</div>' +
                multiInput +
                '<div class="input-group-addon" ng-if="!!component.suffix">{{ component.suffix }}</div>' +
              '</div>' +
              '<div ng-if="!component.prefix && !component.suffix">' + multiInput + '</div>' +
            '</td>' +
            '<td><a ng-click="removeFieldValue($index)" class="btn btn-default"><span class="glyphicon glyphicon-remove-circle"></span></a></td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2"><a ng-click="addFieldValue()" class="btn btn-primary"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> {{ component.addAnother || "Add Another" | formioTranslate }}</a></td>' +
          '</tr>' +
        '</table></div>';
      return template;
    }
  };
};
