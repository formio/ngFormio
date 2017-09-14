module.exports = ['$filter', function($filter) {
  return {
    restrict: 'A',
    link: function($scope, el) {
      var formioTranslate = $filter('formioTranslate');

      if ($scope.component.tooltip) {
        var tooltip = angular.element('<i class="glyphicon glyphicon-question-sign text-muted"></i>');
          tooltip.popover({
          html: true,
          trigger: 'manual',
          placement: 'right',
          content: formioTranslate($scope.component.tooltip)
        }).on('mouseenter', function() {
        var $self = angular.element(this);
        $self.popover('show');
        $self.siblings('.popover').on('mouseleave', function() {
          $self.popover('hide');
        });
        }).on('mouseleave', function() {
        var $self = angular.element(this);
        setTimeout(function() {
          if (!angular.element('.popover:hover').length) {
            $self.popover('hide');
          }
        }, 100);
        });
        el.append(' ').append(tooltip);
      }
    }
  };
}];