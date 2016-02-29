module.exports = [
  'FormioUtils',
  function(FormioUtils) {
    return function(components) {
      var tableComps = [];
      if (!components || !components.length) {
        return tableComps;
      }
      FormioUtils.eachComponent(components, function(component) {
        if (component.tableView && component.key) {
          tableComps.push(component);
        }
      });
      return tableComps;
    };
  }
];
