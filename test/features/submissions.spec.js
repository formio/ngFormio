

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
      actions.enterTextInField('#title', '${random-title>form1.title}');
      actions.enterTextInField('#path', '${random-title>form1.path}');
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
      actions.clickOnLink('Export JSON');
      actions.clickOnLink('Export CSV');
    });
  });
};
