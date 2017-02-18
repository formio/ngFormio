var fs = require('fs');
module.exports = function(app) {
  app.config([
    'formioComponentsProvider',
    function(formioComponentsProvider) {
      formioComponentsProvider.register('textarea', {
        title: 'Text Area',
        template: function($scope) {
          if ($scope.component.wysiwyg) {
            var defaults = {
              toolbar: 'full',
              'toolbar_full': [
                {
                  name: 'basicstyles',
                  items: ['Bold', 'Italic', 'Strike', 'Underline']
                },
                {name: 'paragraph', items: ['BulletedList', 'NumberedList', 'Blockquote']},
                {name: 'editing', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock']},
                {name: 'links', items: ['Link', 'Unlink', 'Anchor']},
                {name: 'tools', items: ['SpellChecker', 'Maximize']},
                '/',
                {
                  name: 'styles',
                  items: ['Format', 'FontSize', 'TextColor', 'PasteText', 'PasteFromWord', 'RemoveFormat']
                },
                {name: 'insert', items: ['Image', 'Table', 'SpecialChar']},
                {name: 'forms', items: ['Outdent', 'Indent']},
                {name: 'clipboard', items: ['Undo', 'Redo']},
                {name: 'document', items: ['PageBreak', 'Source']}
              ],
              disableNativeSpellChecker: false,
              uiColor: '#FAFAFA',
              height: '400px',
              width: '100%'
            };
            if ($scope.component.wysiwyg === true) {
              $scope.component.wysiwyg = defaults;
            }
            else {
              $scope.component.wysiwyg = angular.extend(defaults, $scope.component.wysiwyg);
            }
            $scope.wysiwyg = $scope.component.wysiwyg;
            return 'formio/components/texteditor.html';
          }
          return 'formio/components/textarea.html';
        },
        settings: {
          input: true,
          tableView: true,
          label: '',
          key: 'textareaField',
          placeholder: '',
          prefix: '',
          suffix: '',
          rows: 3,
          multiple: false,
          defaultValue: '',
          protected: false,
          persistent: true,
          wysiwyg: false,
          clearOnHide: true,
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
      $templateCache.put('formio/components/texteditor.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/../templates/components/texteditor.html', 'utf8')
      ));
    }
  ]);
};
