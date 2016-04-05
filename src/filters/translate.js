module.exports = [
  '$filter',
  function(
    $filter
  ) {
    return function(text) {
      try {
        var translate = $filter('translate');
        return translate(text);
      }
      catch (e) {
        return text;
      }
    };
  }
];
