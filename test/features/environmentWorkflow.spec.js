module.exports = function (actions) {
  describe('Adding Environments ',function(){
    describe('Adding Environment',function() {
      actions.logout();
      actions.iAmLoggedInFor('profileuser2');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.enterTextInField('#title', 'testProject');
      actions.clickOnElementWithText(' Create Project');
      actions.clickOnElementWithText('+ New Stage');
      actions.enterTextInField('#title', 'Dev');
      actions.waitForActionToComplete(2000);
      actions.clickOnElementWithText(' Add Stage');
    });
    describe('Removing Environment',function() {
      actions.clickOnElementWithText(' Dev ');
      actions.clickOnElementWithText('Settings');
      actions.clickOnElementWithText('Delete Dev Stage');
      actions.clickOnElementWithText(' Yes');
      actions.iDonotSeeText(' Dev ');
    });
  });
};
