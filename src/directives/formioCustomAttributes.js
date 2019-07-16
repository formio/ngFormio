module.exports = function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      if (!attrs.formioCustomAttributes) {
        return;
      }
      var attributes = JSON.parse(attrs.formioCustomAttributes);
      Object.keys(attributes).forEach(function(attributeName) {
        var attributeValue = attributes[attributeName];
        //set custom attribute only if it's not defined yet
        if (!element.attr(attributeName)) {
          element.attr(attributeName, attributeValue);
        }
      })
    }
  };
};
