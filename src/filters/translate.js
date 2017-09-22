module.exports = [
  '$filter',
  '$injector',
  function(
    $filter,
    $injector
  ) {
    var formioTranslate = function(text, key, builder) {
      /**
       * Lookup the available translate libraries, currently supports:
       * angular-translate: @see https://github.com/angular-translate/angular-translate
       * angular-gettext: @see https://github.com/rubenv/angular-gettext
       */
      var $translate, gettextCatalog;
      if ($injector.has('$translate')) {
        $translate = $injector.get('$translate');
      }
      else if ($injector.has('gettextCatalog')) {
        gettextCatalog = $injector.get('gettextCatalog');
      }
      if (builder) return text;
      try {
        // Translate text using either angular-translate or angular-gettext
        var translateText = function(text) {
          if ($translate) return $translate.instant(text);
          if (gettextCatalog) return gettextCatalog.getString(text);
          return text;
        };

        // Allow translating by field key which helps with large blocks of html.
        if (key) {
          var result = translateText(key);
          if (result === key) {
            result = translateText(text);
          }
          return result;
        }

        return translateText(text);
      }
      catch (e) {
        return text;
      }
    };
    formioTranslate.$stateful = true;
    formioTranslate.use = function(language) {
      if ($injector.has('$translate')) {
        var $translate = $injector.get('$translate');
        $translate.use(language);
      }
    };
    return formioTranslate;
  }
];
