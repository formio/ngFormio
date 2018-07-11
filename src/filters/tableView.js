module.exports = [
  'FormioUtils',
  'formioTableView',
  function(
    FormioUtils,
    formioTableView
  ) {
    return function(data, component) {
      return formioTableView(FormioUtils.fieldData(data, component), component);
    };
  }
];
