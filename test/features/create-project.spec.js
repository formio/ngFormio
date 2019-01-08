module.exports = function (actions) {
  describe('Project Progress', function () {
    describe('Completing ‘Setting up project user account’ step', function () {
      actions.iAmLoggedInFor('projuser2');
      actions.goToPage("#/");
      var frameworks = ['Javascript','Angular','React'
        ,'Vue.js','Aurelia','Stand-Alone Forms', 'Custom'];
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
