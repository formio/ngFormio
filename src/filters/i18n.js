module.exports = [
  '$http', 'AppConfig',
  function($http, AppConfig) {
    return function(component, lang){
    	$http.get(AppConfig.languageUrl + '/' + lang +'.json').then(function(response) {
        angular.forEach(response.data, function(key1, value1) {
          if(component.key == value1) {
            component.label = key1;
          }
        });
      });
      return component;
    }
  }
];
