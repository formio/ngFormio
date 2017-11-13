module.exports = function (actions) {
  describe('Forms Functionality', function () {
    describe('Create a Project', function () {
      actions.logout();
      actions.iAmLoggedInFor('formuser1');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.iSeeText('Project Title');
      actions.iSeeText('Description');
      actions.enterTextInField('#title', '${random-title>primaryproject1.title}');
      actions.enterTextInField('#description', '${random-description>primaryproject1.description}');
      actions.clickOnButton('Create Project');
      actions.waitForClassRemoval('ngdialog-overlay');
    });

    describe('Create A Form', function () {
      actions.clickOnLink('Forms');
      actions.clickOnLink('New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.iSeeText('New Form');
      actions.enterTextInField('#title', '${random-title>form1.title}');
      actions.enterTextInField('#path', '${random-title>form1.path}');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', '${random-title>textfield1.label}');
      actions.clickOnButton('Save');
      actions.waitForClassRemoval('ngdialog-overlay');
      actions.iSeeTextIn('.control-label', '${textfield1.label}');
      actions.clickOnButton('Create Form');
    });
  });
};
