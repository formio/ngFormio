var _map = require('lodash/map');
// Javascript editor directive
module.exports = ['FormioUtils', function(FormioUtils) {
  return {
    restrict: 'E',
    require: ['ngModel'],
    replace: true,
    template: function() {
      if (typeof ace !== 'undefined') {
        return '<div ui-ace="aceOptions" ng-style="aceStyles"></div>';
      }
      else {
        return '<textarea class="form-control"></textarea>';
      }
    },
    link: function($scope, element, attrs) {
      if (typeof ace !== 'undefined') {
        var rows = attrs.rows ? attrs.rows - 0 : 5;
        $scope.aceStyles = {
          height: rows * 25 + 'px'
        };
      }
    },
    controller: ['$scope', function($scope) {
      if (typeof ace !== 'undefined') {
        $scope.aceOptions = {
          useWrapMode: true,
          showGutter: true,
          theme: 'dawn',
          mode: 'javascript',
          showIndentGuides: true,
          showPrintMargin: false,
          onLoad: function(editor) {
            // Disable message: 'Automatically scrolling cursor into view after selection change this will be disabled in the next version set editor.$blockScrolling = Infinity to disable this message'
            editor.$blockScrolling = Infinity;
            editor.setOptions({enableBasicAutocompletion: true});
            editor.components = $scope.form ? $scope.form.components : $scope.component.editorComponents;
            /* eslint-disable no-undef*/
            var tools = ace.require('ace/ext/language_tools');
            /* eslint-enable  no-undef*/
            if (tools.completed !== true) {
                tools.completed   = true;
                tools.addCompleter({
                  getCompletions: function(editor, session, pos, prefix, callback) {
                    callback(null, _map(FormioUtils.flattenComponents(editor.components, true), function(comp) {
                      return {name: comp.key, value: comp.key, score: 1000, meta: 'component'};
                    }));
                  }
                });
            }
            function update() {
                var show = !editor.session.getValue().length;
                var node =  editor.renderer.emptyMessageNode;
                if (!show && node) {
                    editor.renderer.scroller.removeChild(editor.renderer.emptyMessageNode);
                    editor.renderer.emptyMessageNode = null;
                }
                else if (show && !node) {
                    node = editor.renderer.emptyMessageNode = document.createElement('div');
                    node.innerHTML = editor.container.attributes['placeholder'].value.replace('\n', '<br>');
                    node.className = 'ace_invisible ace_emptyMessage';
                    node.style.padding = '0 9px';
                    editor.renderer.scroller.appendChild(node);
                }
            }
            editor.on('input', update);
            setTimeout(update, 100);
          }
        };
      }
    }]
  };
}];
