module.exports = function (actions) {
  describe('User Portal - Creating Project Templates', function () {
    describe('Creating Project templates', function () {
      actions.iAmLoggedInFor('projuser2');
      actions.goToPage("#/");
      var frameworks = ['AngularJS','Angular','React.js'
        ,'Vue.js','Stand-Alone Forms','Custom'];
      frameworks.forEach(function(framework) {
        actions.clickOnElementWithText(framework);
        actions.iSeeText("Create a New " + framework);
        actions.enterTextInField('#title', framework);
        actions.enterTextInField('#description', 'This is first ' + framework);
        actions.clickOnElementWithText(' Create Project');
        actions.iSeeText('New Project created!');
        actions.clickOnClass('.toast-message');
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
    describe('Verifying Title and Description', function () {
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Create a New Project');
      actions.enterTextInField('#title', 'Test Project');
      actions.enterTextInField('#description', 'Test Description');
      actions.clickOnElementWithText(' Create Project');
      actions.iSeeText('New Project created!');
      actions.clickOnClass('.toast-message');
      actions.clickOnElement('.fa-home');
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Test Project');
      actions.iSeeText('Test Description');
      actions.clickOnElementWithText('Test Project');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title', 'Test Project');
      actions.iSeeValueIn('#description', 'Test Description');

    });
    describe('Editing Project Title and Description', function () {
      actions.enterTextInField('#title','Updated Title');
      actions.enterTextInField('#description','Updated Description');
      actions.clickOnElementWithText('AngularJS');
      actions.clickOnElementWithText('React.js');
      actions.clickOnButton(' Save Project');
      actions.iSeeText('Updated Title');
      actions.iSeeText(' React.js ');
      actions.clickOnClass('.fa.fa-cog');
      actions.iSeeValueIn('#title', 'Updated Title');
      actions.iSeeValueIn('#description', 'Updated Description');
      actions.iSeeText('React.js');
      actions.clickOnElement('.fa-home');
      actions.checkingUrlIamOn('#/');
      actions.iSeeText('Updated Title');
      actions.iSeeText('Updated Description');
    });
  });
};
