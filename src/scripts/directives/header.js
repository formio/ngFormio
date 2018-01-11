angular
  .module('formioApp')
  .directive('formioHeaderWrapper', function($window) {
    var stickies = [];
      scroll = function scroll() {
        var result = angular.element(".form-edit");
        var saveSection = angular.element("#save-buttons");
        if (!saveSection && !result) {
          return;
        }
        angular.forEach(stickies, function(editbar, index) {
          var sticky = editbar[0],
            pos = (result[0] && saveSection[0]) ? result[0].offsetTop + saveSection[0].offsetTop : null;

          if (pos && pos <= $window.pageYOffset) {
            var _next = angular.element(result),
              next = _next ? _next: null;
              npos = _next.data('pos');
            editbar.addClass("fixed");


            if (next && next.offsetTop >= npos - next.clientHeight)
              editbar.addClass("absolute").css("top", npos - sticky.clientHeight + 'px');
          } else {
            var _prev = angular.element(result),
              prev = _prev ? _prev[0] : null;

            editbar.removeClass("fixed");
            _prev.removeClass("absolute").removeAttr("style");

            if (prev && $window.pageYOffset <= pos - prev.clientHeight)
              _prev.removeClass("absolute").removeAttr("style");
          }
        });
      },
      link = function($scope, element, attrs) {
        var sticky = element.children()[0],
          editbar = angular.element(sticky);

        element.css('height', sticky.clientHeight + 'px');

        editbar.data('pos', sticky.offsetTop);
        stickies.push(editbar);
      };

    angular.element($window).off('scroll', scroll).on('scroll', scroll);

    return {
      restrict: 'E',
      transclude: true,
      template: '<formio-header ng-transclude></formio-header>',
      link: link
    };
  });
