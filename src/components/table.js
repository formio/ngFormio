module.exports = function (app) {

  app.config([
    'formioComponentsProvider',
    function (formioComponentsProvider) {
      formioComponentsProvider.register('table', {
        title: 'Table',
        template: 'formio/components/table.html',
        group: 'layout',
        settings: {
          input: false,
          numRows: 3,
          numCols: 3,
          rows: [[{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}], [{components: []}, {components: []}, {components: []}]],
          header: [],
          caption: '',
          striped: false,
          bordered: false,
          hover: false,
          condensed: false
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    function ($templateCache) {
      var tableClasses = "{'table-striped': component.striped, ";
      tableClasses += "'table-bordered': component.bordered, ";
      tableClasses += "'table-hover': component.hover, ";
      tableClasses += "'table-condensed': component.condensed}";
      $templateCache.put('formio/components/table.html',
        '<div class="table-responsive">' +
        '  <table ng-class="' + tableClasses + '" class="table">' +
        '    <thead ng-if="component.header.length">' +
        '      <th ng-repeat="header in component.header">{{ header }}</th>' +
        '    </thead>' +
        '    <tbody>' +
        '      <tr ng-repeat="row in component.rows track by $index">' +
        '        <td ng-repeat="column in row track by $index">' +
        '          <formio-component ng-repeat="component in column.components" component="component" data="data" formio="formio"></formio-component>' +
        '        </td>' +
        '      </tr>' +
        '    </tbody>' +
        '  </table>' +
        '</div>'
      );
    }
  ]);
};
