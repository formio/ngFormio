module.exports = function (actions) {
  describe('Project Progress', function () {
    describe('Completing ‘Setting up project user account’ step', function () {
      actions.iAmLoggedInFor('projuser2');
      actions.goToPage("#/");
      var frameworks = ['AngularJS Project','Angular 2+ Project','React.js Project'
        ,'Vue.js Project','HTML 5 Project','Stand-Alone Forms'];
      var framework = frameworks[0];
      actions.clickOnElementWithText(framework);
      actions.iSeeText("Create a New "+framework);
      actions.enterTextInField('title', framework);
      actions.enterTextInField('description','This is first '+framework);
      /* frameworks.forEach(function(framework){

      });*/
    });
  });
};
