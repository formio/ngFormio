module.exports = function (actions) {
  describe('Environments Functionality', function () {
    describe('Create Primary Project', function () {
      actions.logout();
      actions.iAmLoggedInFor('envuser1');
      actions.goToPage('#/');
      actions.clickOnElementWithText('Custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>primaryproject1.title}');
      actions.enterTextInField('#description', '${random-description>primaryproject1.description}');
      actions.clickOnButton('Create Project');
      actions.waitForClassRemoval('ngdialog-overlay');
    });

    describe('Create Dev Stage', function () {
      actions.clickOnLink('+ New Stage');
      actions.iSeeText('New Stage');
      actions.btnDisabled('Add Stage');
      actions.enterTextInField('#title', 'Dev');
      actions.clickOnButton('Add Stage');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('Dev');
    });

    describe('Create Test Stage', function () {
      actions.clickOnLink('+ New Stage');
      actions.iSeeText('New Stage');
      actions.btnDisabled('Add Stage');
      actions.enterTextInField('#title', 'Test');
      actions.clickOnButton('Add Stage');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('Test');
    });

    describe('Create PreProd Stage', function () {
      actions.clickOnLink('+ New Stage');
      actions.iSeeText('New Stage');
      actions.btnDisabled('Add Stage');
      actions.enterTextInField('#title', 'PreProd');
      actions.clickOnButton('Add Stage');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('PreProd');
    });

    describe('Rename Test Stage to Stage', function () {
      actions.iGoToEnv('Test');
      actions.clickOnLink('Settings');
      actions.enterTextInField('#title', 'Stage');
      actions.clickOnButton('Save Stage');
      actions.iSeeEnv('Stage');
    });

    describe('Dont Delete PreProd Stage', function () {
      actions.iGoToEnv('PreProd');
      actions.clickOnLink('Settings');
      actions.waitForActionToComplete(2000);
      actions.clickOnElementWithText('Delete PreProd Stage');
      actions.clickOnButton('No');
      actions.iSeeEnv('PreProd');
    });

    describe('Delete PreProd Stage', function () {
      actions.iGoToEnv('PreProd');
      actions.clickOnLink('Settings');
      actions.waitForActionToComplete(2000);
      actions.clickOnElementWithText('Delete PreProd Stage');
      actions.clickOnButton('Yes');
      actions.iDontSeeEnv('PreProd');
      actions.iSeeText('+ New Stage');
    });

    describe('Tag Stage', function() {
      actions.iGoToEnv('Dev');
      actions.clickOnLink('Settings');
      actions.clickOnLink('Staging');
      actions.clickOnElementWithText('Create Version Tag');
      actions.enterTextInField('#tag', '0.0.1');
      actions.clickOnElementWithText(' Create version tag');
      actions.envHasTag('Dev', '0.0.1');
    });

    describe('Deploys a form', function() {
      actions.iGoToEnv('Dev');
      // Create a form.
      actions.clickOnLink('Forms');
      actions.clickOnLink('New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.iSeeText('New Form');
      actions.enterTextInField('#title', '${random-title>depform1.title}');
      actions.enterTextInField('#path', '${random-title>depform1.path}');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'testForm');
      actions.clickOnButton('Save');
      actions.waitForClassRemoval('ngdialog-overlay');
      actions.iSeeText('testForm ');
      actions.clickOnButton('Create Form');
    });

    describe('Tag the release', function() {
     actions.clickOnLink('Settings');
     actions.clickOnElementWithText('Staging');
     actions.clickOnElementWithText('Create Version Tag');
     actions.enterTextInField('#tag', '0.0.2');
     actions.clickOnElementWithText(' Create version tag');
     actions.envHasTag('Dev', '0.0.2');
    });

    describe('Ensure form doesnt exist on Stage', function() {
     actions.iGoToEnv('Stage');
     actions.clickOnLink('Forms');
     actions.iDonotSeeText('${depform1.title}');
    });

    describe('Deploy the tag to stage', function() {
     actions.clickOnLink('Settings');
     actions.clickOnLink('Staging');
     actions.selectOptionWithClass('tags', '0.0.2');
     actions.clickOnElementWithText(" Deploy version tag to Stage");
     actions.envHasTag('Stage', '0.0.2');
     actions.clickOnLink('Forms');
     actions.iSeeText('${depform1.title}');
    });
  });
};
