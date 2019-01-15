module.exports = function (actions,tags) {
  describe('Test 19',function() {
    describe('API Tab', function () {
      actions.logout();
      actions.iAmLoggedInFor('testAPIUser');
      actions.goToPage('#/');
      actions.projectExisting('New Project', 'This is a test project');
      actions.clickOnElementWithText('New Project');
      actions.clickOnElementWithText('Data');
      actions.checkingUrlEndsWith('/data');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
    });
    tags('smoke').describe('',function() {
      actions.iSeeText('Endpoint: ');
      actions.clickOnElementWithText(' Online API Documenation');
      actions.switchTab();
      actions.checkingUrlIamOn('https://documenter.getpostman.com/view/684631/formio-api/2Jvuks');
      actions.iSeeText('Form.io API');
      actions.closeWindow();
      actions.clickOnClass('.glyphicon.glyphicon-question-sign ');
      actions.switchTab();
      actions.checkingUrlIamOn('https://help.form.io/developer/api/');
      actions.iSeeText('API Documentation');
      actions.closeWindow();
    });
    describe('',function(){
      actions.iSeeText('Admin Login');
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnClassWithIndex('.glyphicon.glyphicon-trash', 2);
      actions.clickOnButton('Yes');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iDonotSeeText('Admin Login');

      actions.iSeeText('Admin');
      actions.clickOnElementWithText('Resources');
      actions.checkingUrlEndsWith('/resource/');
      actions.clickOnClassWithIndex('.glyphicon.glyphicon-trash', 1);
      actions.clickOnButton('Yes');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iDonotSeeText('Admin');

      actions.iDonotSeeText('Test Resource');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText(' New Resource');
      actions.checkingUrlEndsWith('/resource/create/resource');
      actions.enterTextInField('#title', 'Test Resource');
      actions.clickOnButton('Create Resource');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Test Resource');

      actions.iDonotSeeText('Test Form');
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText(' New Form');
      actions.clickOnElementWithText('API Web Form');
      actions.enterTextInField('#title', 'Test Form');
      actions.clickOnElementWithText('Create Form');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Test Form');

      actions.iDonotSeeText('Updated Resource');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      actions.enterTextInField('#title', 'Updated Resource');
      actions.clickSave('Save Resource');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Updated Resource');

      actions.iDonotSeeText('Updated Form');
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText('Test Form');
      actions.enterTextInField('#title', 'Updated Form');
      actions.clickSave('Save Form');
    // actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText('API');
      actions.checkingUrlEndsWith('/api');
      actions.iSeeText('Updated Form');
    });
    tags('smoke').describe('',function(){
      var formsAndResources = [
        [0,'/updatedform/submission','/updatedform/submission/{updatedFormId}','List multiple updatedForm resources.','Create a new updatedForm','Return a specific Updated Form instance.','Update a specific Updated Form instance.','Delete a specific Updated Form'],
        [1,'/updatedresource/submission','/updatedresource/submission/{updatedResourceId}','List multiple updatedResource resources.','Create a new updatedResource','Return a specific Updated Resource instance.','Update a specific Updated Resource instance.','Delete a specific Updated Resource'],
        [2,'/user/submission','/user/submission/{userId}','List multiple user resources.','Create a new user','Return a specific User instance.','Update a specific User instance.','Delete a specific User'],
        [3,'/user/login/submission','/user/login/submission/{userLoginId}','List multiple userLogin resources.','Create a new userLogin','Return a specific User Login instance.','Update a specific User Login instance.','Delete a specific User Login'],
        [4,'/user/register/submission','/user/register/submission/{userRegisterId}','List multiple userRegister resources.','Create a new userRegister','Return a specific User Register instance.','Update a specific User Register instance.','Delete a specific User Register'],
      ];
      formsAndResources.forEach(function(formsAndResource){
        actions.clickOnElementWithTextIndex('Open/Hide',formsAndResource[0]);
        actions.iSeeTextCount('get',4);
        actions.iSeeText('post');
        actions.iSeeText('put');
        actions.iSeeText('delete');
        actions.iSeeTextCount(formsAndResource[1],5);
        actions.iSeeTextCount(formsAndResource[2],3);
        actions.clickOnElementWithText(formsAndResource[3]);
        actions.iSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[3]);
        actions.iDonotSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[4]);
        actions.iSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[4]);
        actions.iDonotSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[5]);
        actions.iSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[5]);
        actions.iDonotSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[6]);
        actions.iSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[6]);
        actions.iDonotSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[7]);
        actions.iSeeText('Implementation notes');
        actions.clickOnElementWithText(formsAndResource[7]);
        actions.iDonotSeeText('Implementation notes');
        actions.clickOnElementWithTextIndex('Open/Hide',formsAndResource[0]);
        actions.iDonotSeeText(formsAndResource[1]);
        actions.iDonotSeeText(formsAndResource[2]);
        actions.clickOnElementWithTextIndex('Expand operations',formsAndResource[0]);
        actions.iSeeTextCount('Implementation notes',5);
        actions.clickOnElementWithTextIndex('Open/Hide',formsAndResource[0]);
        actions.iDonotSeeText('Implementation notes');
      });
    });
  });
}
