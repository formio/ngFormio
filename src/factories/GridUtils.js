module.exports = function() {
  var generic = function(data, component, $interpolate, componentInfo) {
    var startTable = function(labels) {
      if (!(labels instanceof Array)) {
        labels = [labels]
      }

      var view = '<table class="table table-striped table-bordered"><thead><tr>';

      labels.forEach(function(item) {
        view += '<th>' + item + '</th>';
      });

      view += '</tr></thead>';
      view += '<tbody>';
      return view;
    };

    var makeRow = function(data) {
      var view = '<tr>';

      if (typeof data === 'string' || typeof data === 'number') {
        view += '<td>' + data + '</td>';
      }
      else if (data instanceof Array) {
        data.forEach(function(item) {
          view += makeRow(item);
        });
      }
      else if (typeof data === 'object') {
        var labels = Object.keys(data);

        view += startTable(labels);
        labels.forEach(function(key) {
          view += makeRow(data[key]);
        });
        view += finishTable();
      }

      view += '</tr>';
      return view;
    };

    var finishTable = function() {
      return '</tbody></table>';
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

  return {
    generic: generic
  };
};
