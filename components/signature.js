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
        maxWidth: '2.5',
        validate: {
          required: false
        }
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

      // Sets the label of component for error display.
      scope.component.label = 'Signature';
      scope.component.hideLabel = true;

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

      scope.$watch('component.penColor', function(newValue) {
        signaturePad.penColor = newValue;
      });

      scope.$watch('component.backgroundColor', function(newValue) {
        signaturePad.backgroundColor = newValue;
        signaturePad.clear();
      });

      // Clear the signature.
      scope.component.clearSignature = function() {
        signaturePad.clear();
        readSignature();
      };

      // Set some CSS properties.
      element.css({
        'border-radius': '4px',
        'box-shadow': '0 0 5px rgba(0, 0, 0, 0.02) inset',
        'border': '1px solid #f4f4f4'
      });

      function readSignature() {
        if(scope.component.validate.required && signaturePad.isEmpty()) {
          ngModel.$setViewValue('');
        } else {
          ngModel.$setViewValue(signaturePad.toDataURL());
        }
      }

      ngModel.$render = function () {
        signaturePad.fromDataURL(ngModel.$viewValue);
      };
      signaturePad.onEnd = function () {
        scope.$evalAsync(readSignature);
      };

      // Read initial empty canvas, unless signature is required, then keep it pristine
      if(!scope.component.validate.required) {
        readSignature();
      }
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
        '<a class="btn btn-xs btn-default" style="position:absolute; left: 0; top: 0; z-index: 1000" ng-click="component.clearSignature()"><span class="glyphicon glyphicon-refresh"></span></a>' +
        '<canvas signature component="component" name="{{ component.key }}" ng-model="data[component.key]" ng-required="component.validate.required"></canvas>' +
        '<div class="formio-signature-footer" style="text-align: center;color:#C3C3C3;" ng-class="{\'field-required\': component.validate.required}">{{ component.footer }}</div>' +
      '</div>'
    ));
  }
]);
