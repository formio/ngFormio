module.exports = function (actions) {
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
    describe('Clicking ‘More Info’ help button',function(){
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
    describe('Searching for non existing Resource in Resource search bar',function(){
      actions.enterTextInField('#resource-search','Z');
      actions.iDonotSeeText('Admin');
      actions.iDonotSeeText('User');
    });
    describe('Clearing Search Resource bar',function(){
      actions.enterTextInField('#resource-search','');
      actions.iSeeText('Admin');
      actions.iSeeText('User');
    });
    describe('Clicking ‘Edit’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Edit');
      actions.iSeeText('User Resource ');
      actions.checkingUrlEndsWith('/edit');
      actions.iSeeText('Email ');
      actions.iSeeText('Password ');
    });
    describe('Clicking ‘Use’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('User Resource ');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Email ');
      actions.iSeeText('Password ');
    });
    describe('Clicking ‘API’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' API');
      actions.iSeeText('User Resource ');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Field');
      actions.iSeeText('Key');
      actions.iSeeText('Type');
      actions.iSeeText('Persistent');
      // actions.clickOnElementWithText(' Read full API Documentation');
      // actions.switchTab();
      // actions.checkingUrlIamOn('https://help.form.io/developer/api/postman/');
      // actions.closeWindow();
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
    // describe('Adding/Editing a component updates info section of API',function(){
    //   actions.clickOnElementWithText(' Edit');
    //   actions.dragTo('Text Field', 'formarea');
    //   actions.iSeeText('Text Field Component');
    //   actions.enterTextInField('#label', 'Text Field');
    //   actions.clickOnElementWithText('Save');
    //   actions.clickSave('Save Resource');
    //   actions.clickOnElementWithText(' API');
    //   actions.iSeeText('textField');
    //   actions.clickOnElementWithText(' Edit');
    //   actions.clickOnClass('.glyphicon.glyphicon-cog');
    //   actions.enterTextInField('#label','Updated Email');
    //   actions.clickOnElementWithText('API');
    //   actions.enterTextInField('#key','update');
    //   actions.clickOnButton('Save');
    //   actions.waitForClassRemoval('ngdialog-overlay');
    //   actions.clickOnButton('Save Resource');
    //   actions.clickOnElementWithText(' API');
    //   actions.iSeeText('update');
    // });
    describe('Clicking ‘Data’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('User Resource ');
      actions.iSeeText('{...} Export JSON');
      actions.iSeeText(' Export CSV');
    });
    describe('Clicking ‘Action’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Actions');
      actions.checkingUrlEndsWith('/action');
      actions.iSeeText('User Resource ');
      actions.iSeeText('Save Submission');
      actions.iSeeText('Role Assignment');
    });
    describe('Clicking ‘Access’ button for Resource on Resource page',function(){
      actions.clickOnElementWithText(' Access');
      actions.checkingUrlEndsWith('/permission');
      actions.iSeeText('User Resource ');
      actions.iSeeText('Submission Data Permissions');
    });
    describe('Deleting a ‘Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnClass('.glyphicon.glyphicon-trash');
      actions.checkingUrlEndsWith('/delete');
      actions.clickOnButton('No');
      actions.checkingUrlEndsWith('/resource/');
      actions.iSeeText('User');
      actions.clickOnClass('.glyphicon.glyphicon-trash');
      actions.checkingUrlEndsWith('/delete');
      actions.clickOnButton('Yes');
      actions.checkingUrlEndsWith('/resource/');
      actions.iDonotSeeText('User');
    });
    describe('Creating a new ‘Resource',function(){
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource');
      actions.iSeeValueIn('#name','testResource');
      actions.iSeeValueIn('#path','testresource');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      actions.iSeeText('Save Resource');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Resource');
    });
    describe('Attempt to create a new Resource with blank Resource fields',function(){
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource1');
      actions.iSeeValueIn('#name','testResource1');
      actions.enterTextInField('#path','');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
      actions.clickOnClass('.toast-message');
      actions.enterTextInField('#path','testresource1');
      actions.enterTextInField('#title','');
      actions.enterTextInField('#name','testResource1');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Path `path` is required.');
      actions.clickOnClass('.toast-message');
    });
    describe('Attempt to create a new Resource with non unique name and path',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','User');
      actions.iSeeValueIn('#name','user');
      actions.iSeeValueIn('#path','user');
      actions.clickOnButton('Create Resource');
      actions.iSeeText('Save Resource');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','User');
      actions.clickOnButton('Create Resource');
      actions.iSeeText('The Name must be unique per Project.');
      actions.iSeeText('The Path must be unique per Project.');
      actions.clickOnClass('.toast-message');
    });
    describe('Attempt to create a new ‘Resource’ with invalid path name', function () {
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
        actions.clickOnClass('.toast-message');
      });
    });
    describe('Attempt to ‘save’ an existing ‘Resource’ with invalid path name', function () {
      var message = 'Form path cannot contain one of the following names: submission, report, version, tag, owner, exists, export, import, clone, deploy, wipe, role, current, logout, form, token, logs, classic, storage/s3, storage/dropbox, dropbox/auth, upgrade, access, atlassian/oauth/authorize, atlassian/oauth/finalize, sqlconnector, token, v, draft';
      var path = ['submission', 'report', 'exists', 'export', 'role', 'current', 'logout', 'import', 'form', 'storage/s3', 'storage/dropbox', 'dropbox/auth', 'upgrade', 'access', 'atlassian/oauth/authorize', 'atlassian/oauth/finalize', 'sqlconnector','token','v','draft'];
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      path.forEach(function (value) {
        actions.enterTextInField('#path', value);
        actions.clickSave('Save Resource');
        actions.iSeeTextIn(".toast-message", message);
        actions.clickOnClass('.toast-message');
      });
    });
    describe('New Resources are created on ‘Forms’ Page',function(){
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.iSeeText('Test Resource');
    });
    describe('Editing an existing ‘Resource’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.enterTextInField('#title', 'Edit Resource');
      actions.iSeeValueIn('#name', 'editResource');
      actions.enterTextInField('#path', 'editresource');
      actions.clickSave('Save Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully updated form!');
      actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('Resources');
      actions.checkingUrlEndsWith('/resource/');
      actions.iSeeText('Edit Resource');
    });
    // describe('Adding field tags',function(){
    //   actions.clickOnElementWithText(' New Resource');
    //   actions.checkingUrlEndsWith('/resource/create/r esource');
    //   actions.enterTextInField('#title','Test Resource');
    //   actions.iSeeValueIn('#name','testResource');
    //   actions.iSeeValueIn('#path','testresource');
    //   actions.clickOnButton('Create Resource');
    //   actions.iSeeTextIn(".toast-message", 'Successfully created form!');
    //   actions.iSeeText('Save Resource');
    //   actions.clickOnElementWithText('Resources');
    //   actions.iSeeText('Test Resource');
    //   actions.clickOnElementWithText('Test Resource');
    //   actions.checkingUrlEndsWith('/edit');
    //   actions.clickOnClass('i.fa.fa-gear');
    //   actions.iSeeText('Custom Action URL');
    //   actions.iSeeText('Form Tags');
    //   actions.checkElementIsDisabled('//*[@id="formCollection"]');
    //   actions.clickOnClass('.input.ng-pristine.ng-valid.ng-empty.ng-touched');
    //   actions.enterTextInField('.input.ng-pristine.ng-valid.ng-empty.ng-touched','test');
    //   actions.clickOnButton('Save Settings');
    //   actions.iSeeText('test');
    // });
    // describe('Adding ‘Custom Action URL ’',function(){
    //   actions.enterTextInField('#form-action','test.com');
    //   actions.clickOnButton('Save Settings');
    //   actions.iSeeValueIn('#form-action','test.com');
    // });
    // describe('Viewing /Modifying Machine name',function(){
    //   actions.iSeeText('MachineName');
    // });
    describe('Fields in a Resource create ‘Existing Resource Fields’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Test Resource');
      actions.iSeeValueIn('#name','testResource');
      actions.iSeeValueIn('#path','testresource');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      actions.iSeeText('Save Resource');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Resource');
      actions.clickOnElementWithText('Test Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'Existing Field');
      actions.clickOnElementWithText('Save');
      actions.clickOnElementWithText('Forms');
      actions.clickOnButton('Save and Continue');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText(' New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.clickOnElementWithText('Existing Resource Fields');
      actions.clickOnElementWithText('Test Resource');
    });
    describe('Copy a Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Resource');
      actions.clickOnElementWithText('Test Resource');
      actions.checkingUrlEndsWith('/edit');
      actions.clickOnClass('.glyphicon.glyphicon-copy');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title','Copy Test');
      actions.iSeeValueIn('#name','copyTest');
      actions.iSeeValueIn('#path','copytest');
      actions.clickOnButton('Create Resource');
      actions.iSeeTextIn(".toast-message", 'Successfully created form!');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Copy Test');
    });
    describe('Cancelling a Resource',function(){
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Test Resource');
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
      actions.logout();
    });
  });
}
