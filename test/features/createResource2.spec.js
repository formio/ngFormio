module.exports = function (actions,tags) {
  describe('Create Resource2', function () {
    describe('Accessing Resource page',function(){
      actions.logout();
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
      actions.goToPage("#/");
      actions.clickOnElementWithText('Manage');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
      actions.iSeeText('User');
      actions.iSeeText('Admin');
    });
    tags('smoke').describe('Clicking ‘More Info’ help button',function(){
      actions.clickOnElementWithText(' More info');
      actions.switchTab();
      actions.checkingUrlIamOn('https://help.form.io/userguide/resources/');
      actions.closeWindow();
    });
    describe('Searching for existing Resource in Resource search bar',function(){
      actions.enterTextInField('#resource-search','Us');
      actions.iSeeText('User');
      actions.iDonotSeeText('Admin');
      actions.enterTextInField('#resource-search','A');
      actions.iDonotSeeText('User');
      actions.iSeeText('Admin');
    });
    tags('smoke').describe('Searching for non existing Resource in Resource search bar',function(){
      actions.enterTextInField('#resource-search','Z');
      actions.iDonotSeeText('Admin');
      actions.iDonotSeeText('User');
      actions.enterTextInField('#resource-search','');
    });
    tags('smoke').describe('Clearing Search Resource bar',function(){
      actions.enterTextInField('#resource-search','');
      actions.iSeeText('Admin');
      actions.iSeeText('User');
    });
    tags('smoke').describe('Clicking ‘Edit’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Edit');
      actions.iSeeText('User Resource ');
      actions.checkingUrlEndsWith('/edit');
      actions.iSeeText('Email');
      actions.iSeeText('Password');
    });
    tags('smoke').describe('Clicking ‘Use’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('User Resource ');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Email ');
      actions.iSeeText('Password ');
      actions.enterTextInField('#email', 'test@automation');
      actions.enterTextInField('#password', 'password');
      actions.clickOnElementWithText('Submit');
      actions.iSeeText('View');
      actions.iSeeText('Edit');
      actions.iSeeText('Delete');
    });
    tags('smoke').describe('Clicking ‘API’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' API');
      actions.iSeeText('User Resource ');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Field');
      actions.iSeeText('Key');
      actions.iSeeText('Type');
      actions.iSeeText('Persistent');
      actions.clickOnElementWithText(' Read full API Documentation');
      actions.switchTab();
      actions.checkingUrlIamOn('https://documenter.getpostman.com/view/684631/formio-api/2Jvuks');
      actions.closeWindow();
      var documentLinks = [
        [1,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#bacdc-2e3d-b76a-f00e-e67a5755ee0c'],
        [2,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#ccda63-404f-4523-0679-96bf8dbbc2b6'],
        [3,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#b58d8fb-7578-497c-48d0-9b250d7998b6'],
        [4,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#fee1c46-ec0b-9141-fa11-db6e165fdcbd'],
        [5,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#f207caa-9d04-3e81-2973-e4bf82ee5190'],
        [6,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#bcaaf65-ee01-9c85-005f-ac7b433612d8'],
        [7,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#fabff1-1047-a504-d3831576df00'],
        [8,'https://documenter.getpostman.com/view/684631/formio-api/2Jvuks#fb86-af9a-e2b2-5c1d-2ecbbb8e4c2e']
      ];
      documentLinks.forEach(function(documentLink){
        actions.clickOnClassWithIndex('.fa-info-circle',documentLink[0]);
        actions.switchTab();
        actions.checkingUrlIamOn(documentLink[1]);
        actions.closeWindow();
      });
    });
    tags('smoke').describe('Adding/Editing a component updates info section of API',function(){
      actions.clickOnElementWithText(' Edit');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'Text Field');
      actions.clickOnElementWithText('Save');
      actions.clickSave('Save Resource');
      actions.clickOnElementWithText(' API');
      actions.iSeeText('textField');
      // actions.clickOnElementWithText(' Edit');
      // actions.clickSettings();
      // actions.enterTextInField('#label','Updated TextField');
      // actions.clickOnElementWithTextIndex('API',1);
      // actions.enterTextInField('#key','update');
      // actions.clickOnElementWithText('Save');
      // actions.clickSave('Save Resource');
      // actions.clickOnElementWithText(' API');
      // actions.iSeeText('update');
    });
    tags('smoke').describe('Clicking ‘Revisions’ button for Form on Form page', function () {
      actions.clickOnElementWithText(' Revisions');
      actions.checkingUrlEndsWith('/revision');
      actions.iSeeText('Form Revisions');
    });
    tags('smoke').describe('Clicking ‘Data’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('User Resource ');
      actions.iSeeText('{...} Export JSON');
      actions.iSeeText(' Export CSV');
    });
    tags('smoke').describe('Verify resource components display in Kendo UI grid',function(){
      actions.iSeeText('Email');
      actions.iSeeText('test@automation');
      actions.iDonotSeeText('password');
    });
    tags('smoke').describe('Clicking ‘Action’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Actions');
      actions.checkingUrlEndsWith('/action');
      actions.iSeeText('User Resource ');
      actions.iSeeText('Save Submission');
      actions.iSeeText('Role Assignment');
    });
    tags('smoke').describe('Clicking ‘Access’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Access');
      actions.checkingUrlEndsWith('/permission');
      // actions.iSeeText('User Resource ');
      actions.iSeeText('Submission Data Permissions');
      actions.iSeeTextCount('Administrator',5);
    });
    // describe('Deleting a ‘Resource',function(){
    //   actions.clickOnElementWithText('Resources');
    //   actions.clickOnClass('.glyphicon.glyphicon-trash');
    //   actions.checkingUrlEndsWith('/delete');
    //   actions.clickOnButton('No');
    //   actions.checkingUrlEndsWith('/resource/');
    //   actions.iSeeText('User');
    //   actions.clickOnClass('.glyphicon.glyphicon-trash');
    //   actions.checkingUrlEndsWith('/delete');
    //   actions.clickOnButton('Yes');
    //   actions.checkingUrlEndsWith('/resource/');
    //   actions.iDonotSeeText('User');
    // });
    describe('Creating a new ‘Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Resource');
    });
    tags('smoke').describe('Attempt to create a new Resource with blank Resource fields',function(){
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource1');
      actions.iSeeValueIn('#name','testResource1');
      actions.enterTextInField('#path','');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
    // actions.clickOnClass('.toast-message');
      actions.enterTextInField('#path','testresource1');
      actions.enterTextInField('#title','');
      actions.enterTextInField('#name','testResource1');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
    // actions.clickOnClass('.toast-message');
    });
    tags('smoke').describe('Attempt to create a new Resource with non unique name and path',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','User');
      actions.iSeeValueIn('#name','user');
      actions.iSeeValueIn('#path','user');
      actions.clickOnButton('Create Resource');
      actions.iSeeText('Save Resource');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','User');
      actions.clickOnButton('Create Resource');
      actions.iSeeText('The Name must be unique per Project.');
      actions.iSeeText('The Path must be unique per Project.');
    // actions.clickOnClass('.toast-message');
    });
    tags('smoke').describe('Attempt to create a new ‘Resource’ with invalid path name', function () {
      var message = 'Form path cannot contain one of the following names: submission, report, version, tag, owner, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token, v, draft';
      var path = ['submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage/s3', 'storage/dropbox', 'dropbox/auth', 'upgrade', 'access', 'atlassian/oauth/authorize', 'atlassian/oauth/finalize', 'sqlconnector','token','v','draft'];
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeText('New Resource');
      path.forEach(function (value) {
        actions.enterTextInField('#title', 'Test Resource');
        actions.iSeeValueIn('#name', 'testResource');
        actions.enterTextInField('#path', value);
        actions.clickOnElementWithText('Create Resource');
        actions.iSeeTextIn(".toast-message", message);
      // actions.clickOnClass('.toast-message');
      });
    });
    tags('smoke').describe('Attempt to ‘save’ an existing ‘Resource’ with invalid path name', function () {
      var message = 'Form path cannot contain one of the following names: submission, report, version, tag, owner, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token, v, draft';
      var path = ['submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage/s3', 'storage/dropbox', 'dropbox/auth', 'upgrade', 'access', 'atlassian/oauth/authorize', 'atlassian/oauth/finalize', 'sqlconnector','token','v','draft'];
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      path.forEach(function (value) {
        actions.enterTextInField('#path', value);
        actions.clickSave('Save Resource');
        actions.iSeeTextIn(".toast-message", message);
      // actions.clickOnClass('.toast-message');
      });
    });
    tags('smoke').describe('New Resources are created on ‘Forms’ Page',function(){
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.iSeeText('Test Resource');
    });
    tags('smoke').describe('Editing an existing ‘Resource’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/edit');
      actions.enterTextInField('#title', 'Edit Resource');
      actions.iSeeValueIn('#name', 'editResource');
      actions.enterTextInField('#path', 'editresource');
      actions.clickSave('Save Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully updated form!');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText(' API');
      // actions.iSeeText('3000/editresource');
      actions.clickOnElementWithText('Resources');
      actions.checkingUrlEndsWith('/resource/');
      actions.iSeeText('Edit Resource');
    });
    tags('smoke').describe('Attempt to Edit an existing Resource with blank fields',function(){
      actions.clickOnElementWithText('Edit Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/edit');
      actions.enterTextInField('#title','Test Resource1');
      actions.iSeeValueIn('#name','testResource1');
      actions.enterTextInField('#path','');
      actions.clickSave('Save Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
    // actions.clickOnClass('.toast-message');
      actions.enterTextInField('#path','testresource1');
      actions.enterTextInField('#title','');
      actions.enterTextInField('#name','testResource1');
      actions.clickSave('Save Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
    // actions.clickOnClass('.toast-message');
    });
    describe('Adding field tags',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','FieldTags Resource');
      actions.clickOnButton('Create Resource');
    // actions.clickOnClass('.toast-message');
      actions.checkingUrlEndsWith('/edit');
      actions.clickOnClassWithIndex('.fa.fa-gear',1);
      actions.iSeeText('Custom Action URL');
      actions.iSeeText('Form Tags');
      actions.checkElementIsDisabled('//*[@id="formCollection"]');
      actions.enterTextInField('xpath://*[@id="form-group-tags"]/tags-input/div/div/input','test');
      actions.clickOnButton('Save Settings');
      actions.iSeeText('test');
      actions.pageReload();
      // actions.iSeeText('test');
    });
    tags('smoke').describe('Adding ‘Custom Action URL ’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Custom URL');
      actions.clickOnButton('Create Resource');
    // actions.clickOnClass('.toast-message');
      actions.clickOnClassWithIndex('.fa.fa-gear',1);
      actions.enterTextInField('#form-action','test.com');
      actions.clickOnButton('Save Settings');
      actions.pageReload();
      actions.iSeeValueIn('#form-action','test.com');
    });
    tags('smoke').describe('Viewing /Modifying Machine name',function(){
      actions.iSeeText('MachineName');
      actions.iSeeValueInContains('#machineName','customUrl');
      actions.clickOnElementWithText(' Edit');
      actions.enterTextInField('#title','Updated Resource');
      actions.clickSave('Save Resource');
    // actions.clickOnClass('.toast-message');
      actions.clickOnClassWithIndex('.fa.fa-gear',1);
      actions.iSeeValueInContains('#machineName','customUrl');
      actions.enterTextInField('#machineName','updatedMachineName');
      actions.clickOnButton('Save Settings');
    // actions.clickOnClass('.toast-message');
      actions.waitForActionToComplete(500);
      actions.pageReload();
      // actions.iSeeValueIn('#machineName','updatedMachineName');

    });
    tags('smoke').describe('Fields in a Resource create ‘Existing Resource Fields’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.iSeeElement('.form-edit');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource');
      actions.iSeeValueIn('#name','testResource');
      actions.iSeeValueIn('#path','testresource');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      // actions.iSeeText('Save Resource');
      // actions.clickOnElementWithText('Resources');
      // actions.iSeeText('Test Resource');
      // actions.clickOnElementWithText('Test Resource');
      // actions.checkingUrlEndsWith('/edit');
      // actions.dragTo('builder-textfield', 'formarea');
      // actions.iSeeText('Text Field Component');
      // actions.enterTextInFieldIndex('xpath://*[contains(@class, "form-control")]',5,'Existing Field');
      // actions.clickOnElementWithText('Save');
      // actions.clickOnElementWithText('Save Resource');
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText(' New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.clickOnElementWithText('Existing Resource Fields');
      actions.clickOnElementWithText('Admin');
    });
    describe('Import a Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnClass('.glyphicon.glyphicon-cloud-download');
      actions.enterTextInField('#embedURL','https://ovwnowebssiuixy.test-form.io/importresource');
      actions.clickOnClassWithIndex('.btn.btn-primary',1);
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Import Resource');
      actions.iSeeText('Name ');
      actions.iSeeText('Phone ');
      actions.clickOnButton('Create Resource');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Import Resource');
    });
    describe('Copy a Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Import Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.clickOnClass('.glyphicon.glyphicon-copy');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Copy Test');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Copy Test');
    });
    tags('smoke').describe('Cancelling a Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Edit Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'Text Field');
      actions.clickOnElementWithText('Save');
      actions.waitForActionToComplete(1000);
      actions.clickOnClass('.glyphicon.glyphicon-ban-circle');
      actions.iSeeText('You have unsaved changes. Would you like to save these changes before leaving the editor?');
      actions.clickOnButton('Cancel Changes');
      actions.checkingUrlEndsWith('/resource/');
    });
    tags('smoke').describe('Cancelling the Cancel function of Resource',function(){
      actions.clickOnElementWithText('Edit Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.iDonotSeeText('Text Field Component');
      actions.logout();
    });
  });
}
