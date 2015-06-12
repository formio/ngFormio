app.config([
  'formioComponentsProvider',
  function(formioComponentsProvider) {
    formioComponentsProvider.register('signature', {
      title: 'Signature',
      template: 'formio/components/signature.html',
      tableView: function(data) {
        return data ? 'Yes' : 'No';
      },
      settings: {
        input: true,
        tableView: true,
        label: '',
        key: 'signature',
        placeholder: '',
        footer: 'Sign above',
        width: '100%',
        height: '150',
        penColor: 'black',
        backgroundColor: 'rgb(245,245,235)',
        minWidth: '0.5',
        maxWidth: '2.5'
      }
    });
  }
]);
app.directive('signature', function () {
  return {
    restrict: 'A',
    scope: {
      component: '='
    },
    require: '?ngModel',
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) { return; }

      // Sets the dimension of a width or height.
      var setDimension = function(dim) {
        if (scope.component[dim].slice(-1) === '%') {
          var percent = parseFloat(scope.component[dim].slice(0, -1)) / 100;
          element[0][dim] = element.parent()[dim]() * percent;
        }
        else {
          element[0][dim] = parseInt(scope.component[dim], 10);
          scope.component[dim] += 'px';
        }
      };

      // Set the width and height of the canvas.
      setDimension('width');
      setDimension('height');

      // Create the signature pad.
      /* global SignaturePad:false */
      var signaturePad = new SignaturePad(element[0], {
        minWidth: scope.component.minWidth,
        maxWidth: scope.component.maxWidth,
        penColor: scope.component.penColor,
        backgroundColor: scope.component.backgroundColor
      });

      // Clear the signature.
      scope.component.clearSignature = function() {
        signaturePad.clear();
      };

      // Set some CSS properties.
      element.css({
        'border-radius': '4px',
        'box-shadow': '0 0 5px rgba(0, 0, 0, 0.02) inset',
        'border': '1px solid #f4f4f4'
      });

      function readSignature() {
        var dataUrl = signaturePad.toDataURL();
        ngModel.$setViewValue(dataUrl);
      }

      ngModel.$render = function () {
        signaturePad.fromDataURL(ngModel.$viewValue);
      };
      signaturePad.onEnd = function () {
        scope.$evalAsync(readSignature);
      };

      // Read the signature.
      readSignature();
    }
  };
});
app.run([
  '$templateCache',
  'FormioUtils',
  function(
    $templateCache,
    FormioUtils
  ) {
    $templateCache.put('formio/components/signature.html', FormioUtils.fieldWrap(
      '<img ng-if="readOnly" ng-attr-src="{{data[component.key]}}" src="" />' +
      '<div ng-if="!readOnly" style="width: {{ component.width }}; height: {{ component.height }};">' +
        '<a class="btn btn-xs btn-default" style="position:absolute; left: 0; top: 0; z-index: 1000" ng-click="component.clearSignature()"><span class="glyphicon glyphicon-repeat"></span></a>' +
        '<canvas signature component="component" ng-model="data[component.key]"></canvas>' +
        '<div class="formio-signature-footer" style="text-align: center;color:#C3C3C3;">{{ component.footer }}</div>' +
      '</div>'
    ));
  }
]);
