module.exports = function() {
  var generic = function(data, options) {
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
    if (!label && options.component && options.component.label) {
      label = options.component.label;
    }
    else if (!label && options.component && options.component.key) {
      label = options.component.key;
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
  var columnForComponent = function(data, options) {
    // If no component is given, generate an empty cell.
    if (!options.component) {
      return '<td></td>';
    }

    // Generate a table for each component with one column to display the key/value for each component.
    var view = '<td>';
    view += '<table class="table table-striped table-bordered' + (options.tableChild ? ' table-child' : '') + '">';
    view += '<thead><tr>';
    view += '<th>' + (options.component.label || '') + ' (' + options.component.key + ')</th>';
    view += '</tr></thead>';
    view += '<tbody>';

    // If the component has a defined tableView, use that, otherwise try and use the raw data as a string.
    var info = options.componentInfo.components.hasOwnProperty(options.component.type)
      ? options.componentInfo.components[options.component.type]
      : {};
    if (info.tableView) {
      view += '<td>' +
        info.tableView(
          data && options.component.key && (data.hasOwnProperty(options.component.key)
            ? data[options.component.key]
            : data),
          options
        ) + '</td>';
    }
    else {
      view += '<td>';
      if (options.component.prefix) {
        view += options.component.prefix;
      }
      view += data && options.component.key && (data.hasOwnProperty(options.component.key)
        ? data[options.component.key]
        : '');
      if (options.component.suffix) {
        view += ' ' + options.component.suffix;
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
