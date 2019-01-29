module.exports = function (actions,tags) {
  describe('Creating/Editing A Form',function() {
    describe('Given', function () {
      actions.iAmLoggedInFor('testUser');
      actions.goToPage('#/');
      actions.projectExisting('New Project', 'This is a test project');
      actions.clickOnElementWithText('New Project');
    });
    describe('Accessing Form page', function () {
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iSeeText('Admin Login');
      actions.iSeeText('User');
    });
    tags('smoke').describe('Searching for existing Forms/Resource with search bar',function(){
      actions.enterTextInField('#form-search','Lo');
      actions.iSeeText('User Login');
      actions.iDonotSeeText('User Register');
      actions.iSeeText('Admin Login');
      actions.enterTextInField('#form-search','R');
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iDonotSeeText('Admin Login');
    });
    tags('smoke').describe('Searching for non existing Forms in search bar',function(){
      actions.enterTextInField('#form-search','Z');
      actions.iDonotSeeText('User Login');
      actions.iDonotSeeText('User Register');
      actions.iDonotSeeText('Admin Login');
      actions.enterTextInField('#form-search','');
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iSeeText('Admin Login');
    });
    describe('Navigating to ‘Edit’ edit page on Form', function () {
      actions.clickOnElementWithText(' Edit');
      actions.checkingUrlEndsWith('/edit');
      actions.iSeeText('Email ');
      actions.iSeeText('Password ');
    });
    describe('Clicking ‘Use’ button for Form on Form page', function () {
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText(' New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.iSeeElement('.form-edit');
      actions.enterTextInField('#title','Test Form');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'Text Field');
      actions.clickOnElementWithText('Save');
      actions.waitForActionToComplete(1000);
      actions.clickOnElementWithText('Create Form');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Text Field');
      actions.enterTextInField('#textField','Test Submission');
      actions.clickOnButton('Submit');
      actions.iSeeTextIn(".toast-message",'New submission added!');
    });
    describe('Clicking ‘Embed’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Embed');
      actions.checkingUrlEndsWith('/embed');
      actions.iSeeText('Form Embedding');
    });
    describe('Clicking ‘Revisions’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Revisions');
      actions.checkingUrlEndsWith('/revision');
      actions.iSeeText('Form Revisions');
    });
    describe('Clicking ‘Data’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('{...} Export JSON');
      actions.iSeeText(' Export CSV');
      actions.iSeeText('Test Submission');
      actions.clickOnElementWithText('Test Submission');
      actions.clickOnElementWithTextIndex(' Edit',1);
      actions.checkingUrlEndsWith('/edit');
      actions.enterTextInField('#textField','Updated Submission');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Updated Submission');
      actions.clickOnElementWithText('Updated Submission');
      actions.clickOnElementWithText(' Delete');
      actions.iSeeText('Are you sure you want to delete this submission?');
      actions.clickOnElementWithText('Cancel');
      actions.iDonotSeeText('Are you sure you want to delete this submission?');
      actions.iSeeText('Updated Submission');
      actions.clickOnElementWithText(' Delete');
      actions.iSeeText('Are you sure you want to delete this submission?');
      actions.clickOnElementWithText('Delete');
      actions.iDonotSeeText('Updated Submission');
    });
    describe('Clicking ‘Action’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Actions');
      actions.checkingUrlEndsWith('/action');
      actions.iSeeText('Save Submission');
    });
    describe('Clicking ‘Access’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Access');
      actions.checkingUrlEndsWith('/permission');
      actions.iSeeText('Submission Data Permissions');
    });
    describe('Clicking ‘Launch’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Launch');
      actions.checkingUrlEndsWith('/share');
      actions.iSeeText('Preview');
    });
    tags('smoke').describe('Deleting a ‘Form’', function () {
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnClass('.glyphicon.glyphicon-trash');
      actions.iSeeText('User Login Form ');
      actions.iSeeText('Are you sure you wish to delete the form?');
      actions.clickOnButton('No');
      actions.checkingUrlEndsWith('/form/');
      actions.iSeeText('User Login');
      actions.clickOnClass('.glyphicon.glyphicon-trash');
      actions.iSeeText('Are you sure you wish to delete the form?');
      actions.clickOnButton('Yes');
      actions.checkingUrlEndsWith('/form/');
      actions.iDonotSeeText('User Login');
    });
  });
}
