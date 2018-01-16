

module.exports = function (actions) {
  describe('Submissions',function(){
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
      actions.enterTextInField('#title', '${random-name>downloadform.name}');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'textField');
      actions.clickOnButton('Save');
      actions.waitForClassRemoval('ngdialog-overlay');
      actions.iSeeTextIn('label.control-label.ng-binding.ng-scope', 'textField');
      actions.clickOnButton('Create Form');
    });

    describe('Create submissions', function() {
      actions.clickOnLink('Use');
      actions.enterTextInField('#textField', '${random-title}');
      actions.clickOnButton('Submit');
      actions.clickOnLink('Use');
      actions.enterTextInField('#textField', '${random-title}');
      actions.clickOnButton('Submit');
      actions.clickOnLink('Use');
      actions.enterTextInField('#textField', '${random-title}');
      actions.clickOnButton('Submit');
      actions.clickOnClass('.form-nav .form-submissions');
      // Can only verify downloads in chrome right now. Other browsers aren't supported by selenium.
      // TODO: Find way to verify downloads in other browsers.

      // This doesn't work on circle.ci. Could be too old of a browser.

      // actions.clickOnLink('Export JSON');
      // actions.clickOnLink('Export CSV');
      // actions.waitForActionToComplete(100);
      // actions.newWindow();
      // actions.goToUrl('chrome://downloads');
      // actions.linkExists('${downloadform.name}.json');
      // actions.linkExists('${downloadform.name}.csv');
      // actions.closeWindow();
    });
  });
};
