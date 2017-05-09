module.exports = function() {
  var generic = function(data, component) {
    if (typeof data === 'string') {
      return data;
    }
    var startTable = function(labels) {
      if (!(labels instanceof Array)) {
        labels = [labels];
      }

      var view = '<table class="table table-striped table-bordered"><thead><tr>';

      labels.forEach(function(item) {
        view += '<th>' + item + '</th>';
      });

      view += '</tr></thead>';
      view += '<tbody>';
      return view;
    };

    var finishTable = function() {
      return '</tbody></table>';
    };

    var makeRow = function(data, noRow) {
      var view = !noRow ? '<tr>' : '';

      if (typeof data === 'string' || typeof data === 'number') {
        view += '<td>' + data + '</td>';
      }
      else if (data === null || data === undefined) {
        view += '<td></td>';
      }
      else if (data instanceof Array) {
        data.forEach(function(item) {
          view += makeRow(item);
        });
      }
      else if (typeof data === 'object' && data !== null && data !== undefined) {
        var labels = Object.keys(data);

        view += '<td>' + startTable(labels);
        labels.forEach(function(key) {
          view += makeRow(data[key], true);
        });
        view += finishTable() + '</td>';
      }

      view += !noRow ? '</tr>' : '';
      return view;
    };

    // Create a template
    var view = '';
    var label;
    if (!label && component && component.label) {
      label = component.label;
    }
    else if (!label && component && component.key) {
      label = component.key;
    }
    else {
      label = '';
    }

    view += startTable(label);
    view += makeRow(data);
    view += finishTable();
    return view;
  };

  // Generate a column for the component.
  var columnForComponent = function(data, component, $interpolate, componentInfo, tableChild) {
    // If no component is given, generate an empty cell.
    if (!component) {
      return '<td></td>';
    }

    // Generate a table for each component with one column to display the key/value for each component.
    var view = '<td>';
    view += '<table class="table table-striped table-bordered' + (tableChild ? ' table-child' : '') + '">';
    view += '<thead><tr>';
    view += '<th>' + (component.label || '') + ' (' + component.key + ')</th>';
    view += '</tr></thead>';
    view += '<tbody>';

    // If the component has a defined tableView, use that, otherwise try and use the raw data as a string.
    var info = componentInfo.components.hasOwnProperty(component.type)
      ? componentInfo.components[component.type]
      : {};
    if (info.tableView) {
      view += '<td>' +
        info.tableView(
          data && component.key && (data.hasOwnProperty(component.key) ? data[component.key] : data),
          component,
          $interpolate,
          componentInfo,
          tableChild
        ) + '</td>';
    }
    else {
      view += '<td>';
      if (component.prefix) {
        view += component.prefix;
      }
      view += data && component.key && (data.hasOwnProperty(component.key) ? data[component.key] : '');
      if (component.suffix) {
        view += ' ' + component.suffix;
      }
      view += '</td>';
    }

    view += '</tbody></table>';
    view += '</td>';
    return view;
  };

  return {
    generic: generic,
    columnForComponent: columnForComponent
  };
};
