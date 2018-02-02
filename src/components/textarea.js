var fs = require('fs');
module.exports = function(app) {
  app.directive('formioCkeditor', function($parse, $timeout) {
    return {
      restrict: 'A',
      require: ['ckeditor', 'ngModel'],
      link: function(scope, element, attr, ctrl) {
        var ckeditor = ctrl[0];
        var ngModelCtrl= ctrl[1];

        // FOR-975 - overwrite CKEditor default values
        ngModelCtrl.$viewValue = undefined;
        ngModelCtrl.$$lastCommittedViewValue = undefined;
        ngModelCtrl.$setPristine(true);
      }
    };
  });
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: function($scope) {
          if (!$scope.readOnly && $scope.component.wysiwyg) {
            var defaults = {
              toolbarGroups:  [
                {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
                {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock']},
                {name: 'links', groups: ['links']},
                {name: 'insert', groups: ['insert']},
                '/',
                {name: 'styles', groups: ['Styles', 'Format', 'Font', 'FontSize']},
                {name: 'colors', groups: ['colors']},
                {name: 'clipboard', groups: ['clipboard', 'undo']},
                {name: 'editing', groups: ['find', 'selection', 'spellchecker', 'editing']},
                {name: 'document', groups: ['mode', 'document', 'doctools']},
                {name: 'others', groups: ['others']},
                {name: 'tools', groups: ['tools']}
              ],
              extraPlugins: 'justify,font',
              disableNativeSpellChecker: false,
              removeButtons: 'Cut,Copy,Paste,Underline,Subscript,Superscript,Scayt,About',
              uiColor: '#eeeeee',
              height: '400px',
              width: '100%'
            };
            if ($scope.component.wysiwyg === true) {
              $scope.component.wysiwyg = defaults;
            }
            else {
              $scope.component.wysiwyg = angular.extend(defaults, $scope.component.wysiwyg);
            }

            // FOR-929 - Remove spell check attribute
            if (!$scope.component.spellcheck){
              delete $scope.component.wysiwyg.disableNativeSpellChecker;
            }
            return 'formio/components/texteditor.html';
          }
          if ($scope.readOnly && $scope.component.wysiwyg) {
            return 'formio/componentsView/content.html';
          }
          if (!$scope.readOnly && $scope.component.editorComponents) {
            return 'formio/components/scripteditor.html';
          }
          return 'formio/components/textarea.html';
        },
        viewTemplate: function($scope) {
          if ($scope.component.wysiwyg) {
            return 'formio/componentsView/content.html';
          }
          else {
            return 'formio/element-view.html';
          }
        },
        viewController: [
          '$scope',
          '$sanitize',
          function($scope, $sanitize) {
            if ($scope.component.wysiwyg) {
              $scope.$watch('data.' + $scope.component.key, function() {
                $scope.html = $sanitize($scope.data[$scope.component.key]);
              });
            }
          }
        ],
        controller: [
          '$scope',
          '$sanitize',
          function($scope, $sanitize) {
            if ($scope.readOnly && $scope.component.wysiwyg) {
              $scope.$watch('data.' + $scope.component.key, function() {
                $scope.html = $sanitize($scope.data[$scope.component.key]);
              });
            }
          }
        ],
        settings: {
          autofocus: true,
          input: true,
          tableView: true,
          label: 'Text Area Field',
          key: 'textareaField',
          placeholder: '',
          prefix: '',
          suffix: '',
          rows: 3,
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true,
          hidden: false,
          wysiwyg: false,
          clearOnHide: true,
          spellcheck: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: ''
          }
        }
      });
    }
  ]);
  app.run([
    '$templateCache',
    'FormioUtils',
    function($templateCache,
              FormioUtils) {
      $templateCache.put('formio/components/textarea.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/textarea.html', 'utf8')
      ));
      $templateCache.put('formio/componentsView/content.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/componentsView/content.html', 'utf8')
      ));
      $templateCache.put('formio/components/texteditor.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/texteditor.html', 'utf8')
      ));
      $templateCache.put('formio/components/scripteditor.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/scripteditor.html', 'utf8')
      ));
    }
  ]);
};
