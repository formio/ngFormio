module.exports = function (actions,tags) {
  describe('User Portal - Creating Project Templates', function () {
    describe('Creating Angular', function () {
      actions.logout();
      actions.iAmLoggedInFor('creatingProj');
      actions.goToPage('#/');
      actions.clickOnElementWithText('Angular');
      actions.iSeeText("Create a New Angular");
      actions.enterTextInField('#title', 'Angular');
      actions.enterTextInField('#description', 'This is first Angular');
      actions.clickOnElementWithText(' Create Project');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('Overview');
      actions.iSeeText('Angular');
      actions.clickOnElement('.fa-home');
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('This is first Angular');
    });
    tags('smoke').describe('Creating Project templates', function () {
      var frameworks = ['Javascript', 'Angular','React'
        ,'Vue.js', 'Aurelia', 'Stand-Alone Forms','Custom'];
      frameworks.forEach(function(framework) {
        actions.clickOnElementWithText(framework);
        actions.iSeeText("Create a New " + framework);
        actions.enterTextInField('#title', framework);
        actions.enterTextInField('#description', 'This is first ' + framework);
        actions.clickOnElementWithText(' Create Project');
      // actions.clickOnClass('.toast-message');
        actions.clickOnElementWithText('Overview');
        actions.iSeeText(framework);
        actions.clickOnElement('.fa-home');
        actions.checkingUrlIamOn('#/');
        actions.iSeeText('This is first ' + framework);
      });
    });
    describe('Creating a project without a title', function () {
      actions.checkingUrlIamOn('#/');
      actions.clickOnElementWithText('New Project');
      actions.iSeeText('Create a New Project');
      actions.btnDisabled(' Create Project');
      actions.iDonotSeeText('New Project created!');
    });
    tags('smoke').describe('Verifying Title and Description', function () {
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Create a New Project');
      actions.enterTextInField('#title', 'Test Project');
      actions.enterTextInField('#description', 'Test Description');
      actions.clickOnElementWithText(' Create Project');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElement('.fa-home');
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Test Project');
      actions.iSeeText('Test Description');
      actions.clickOnElementWithText('Test Project');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title', 'Test Project');
      actions.iSeeValueIn('#description', 'Test Description');
      actions.clickOnElement('.fa-home');
    });
    describe('Editing Project Title and Description', function () {
      actions.pageReload();
      actions.clickOnElementWithTextIndex('Angular',1);
      actions.clickOnClass('.fa.fa-cog');
      actions.enterTextInField('#title','Updated Title');
      actions.enterTextInField('#description','Updated Description');
      actions.clickOnButton(' Save Project');
    // actions.clickOnClass('.toast-message');
      actions.clickOnClass('.fa.fa-cog');
      actions.clickOnElementWithText('Angular');
      actions.clickOnElementWithText('React');
      actions.clickOnButton(' Save Project');
    // actions.clickOnClass('.toast-message');
      actions.iSeeText('Updated Title');
      actions.iSeeText(' React ');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title', 'Updated Title');
      actions.iSeeValueIn('#description', 'Updated Description');
      actions.iSeeText('React');
      actions.clickOnElement('.fa-home');
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Updated Title');
      actions.iSeeText('Updated Description');
      actions.clickOnElementWithText('Updated Title');
      actions.clickOnClass('.fa.fa-cog');
      actions.clickOnElementWithText('Delete Updated Title Project');
      actions.clickOnElementWithText('No');
      actions.clickOnElementWithText('Delete Updated Title Project');
      actions.clickOnElementWithText(' Yes');
      actions.iDonotSeeText('Updated Title');
      actions.logout();
    });
  });
};
