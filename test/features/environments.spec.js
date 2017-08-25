module.exports = function (actions) {
  describe('Environments Functionality', function () {
    describe('Create Primary Project', function () {
      actions.logout();
      actions.iAmLoggedInFor('envuser1');
      actions.goToPage('#/');
      actions.clickOnClass('new-project-custom');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>primaryproject1.title}');
      actions.enterTextInField('#description', '${random-description>primaryproject1.description}');
      actions.clickOnButton('Create Project');
      actions.waitForClassRemoval('ngdialog-overlay');
    });

    describe('Create Dev Environent', function () {
      actions.clickOnLink('Add Environment');
      actions.iSeeText('New Environment');
      actions.btnDisabled('Add Environment');
      actions.enterTextInField('#title', 'Dev');
      actions.clickOnButton('Add Environment');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('Dev');
    });

    describe('Create Test Environent', function () {
      actions.clickOnLink('Add Environment');
      actions.iSeeText('New Environment');
      actions.btnDisabled('Add Environment');
      actions.enterTextInField('#title', 'Test');
      actions.clickOnButton('Add Environment');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('Test');
    });

    describe('Create PreProd Environent', function () {
      actions.clickOnLink('Add Environment');
      actions.iSeeText('New Environment');
      actions.btnDisabled('Add Environment');
      actions.enterTextInField('#title', 'PreProd');
      actions.clickOnButton('Add Environment');
      actions.waitForClassRemoval('project-env-create');
      actions.iSeeEnv('PreProd');
    });

    describe('Can only create 3 environments', function () {
      actions.iDonotSeeText('+ Add Environment');
    });

    describe('Rename Test Environent to Stage', function () {
      actions.iGoToEnv('Test');
      actions.clickOnLink('Settings');
      actions.enterTextInField('#title', 'Stage');
      actions.clickOnButton('Save Environment');
      actions.iSeeEnv('Stage');
    });

    describe('Delete PreProd Environment', function () {
      actions.iGoToEnv('PreProd');
      actions.clickOnLink('Settings');
      actions.clickOnLink('Delete PreProd Environment');
      actions.clickOnButton('Yes');
      actions.iDontSeeEnv('PreProd');
      actions.iSeeText('+ Add Environment');
    });
  });
};
