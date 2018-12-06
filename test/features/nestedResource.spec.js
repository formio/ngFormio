module.exports = function(actions,tags){
  describe('Creating and Populating Nested Resources', function(){
   describe('',function(){
     actions.logout();
     actions.iAmLoggedInFor('projuser3');
     actions.projectExisting('${random-title>project3.title}', '${random-description>project3.description}');
     actions.goToPage("#/");
     actions.clickOnElementWithText('Manage');
     actions.clickOnElementWithText('Resources');
     actions.clickOnElementWithText(' New Resource');
     actions.checkingUrlEndsWith('/resource/create/resource');
     actions.enterTextInField('#title','Test Resource');
     actions.clickOnButton('Create Resource');
     actions.clickOnClass('.toast-message');
     actions.clickOnElementWithText('Resources');
     actions.clickOnElementWithText('Forms');
     actions.checkingUrlEndsWith('/form/');
     actions.clickOnElementWithText(' New Form');
     actions.clickOnElementWithText('API Web Form');
     actions.enterTextInField('#title','Test Form');
     actions.dragTo('Text Field', 'formarea');
     actions.iSeeText('Text Field Component');
     actions.enterTextInField('#label', 'Text Field');
     actions.clickOnElementWithText('Save');
     actions.waitForActionToComplete(1000);
     actions.clickOnElementWithText('Create Form');
     actions.clickOnClass('.toast-message');
     });
    describe('Setup ‘Test Resource’',function(){
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithText('Test Resource');
      actions.dragTo('Text Field', 'formarea');
      actions.iSeeText('Text Field Component');
      actions.enterTextInField('#label', 'Name');
      actions.clickOnElementWithText('Save');
      actions.waitForActionToComplete(1000);
      actions.clickSave('Save Resource');
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Name');
    });
    describe('Submitting data for ‘Test Resource’',function(){
      actions.enterTextInField('#name', 'Gary');
      actions.clickOnButton('Submit');
      actions.iSeeTextIn(".toast-message",'New submission added!');
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Gary');
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Name');
      actions.enterTextInField('#name', 'Travis');
      actions.clickOnButton('Submit');
      actions.iSeeTextIn(".toast-message",'New submission added!');
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Travis');
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Name');
      actions.enterTextInField('#name', 'Denise');
      actions.clickOnButton('Submit');
      actions.iSeeTextIn(".toast-message",'New submission added!');
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Denise');
    });
    describe('Creating a Select Resource component on a form',function(){
      actions.clickOnElementWithText('Forms');
      actions.checkingUrlEndsWith('/form/');
      actions.clickOnElementWithText('Test Form');
      actions.checkingUrlEndsWith('/edit');
      actions.dragTo('Select','formarea');
      actions.enterTextInField('#label', 'Name Resource');
      actions.clickOnElementWithTextIndex('Data',3);
      actions.clickOnElementWithText('Values');
      actions.clickOnElementWithText('Resource');
      actions.clickOnClassWithIndex('.caret.pull-right',1);
      actions.clickOnElementWithTextIndex('Test Resource',1);
      actions.iSeeText('Value');
      actions.waitForActionToComplete(500);
      actions.selectOptionWithID('valueProperty','Name');
      actions.iSeeText('item.data.name');
      actions.clickOnElementWithText('Save');
      actions.waitForActionToComplete(1000);
      actions.iSeeText('Name Resource');
      actions.clickSave('Save Form');
      actions.clickOnClass('.toast-message');
    });
    describe('Populating Nested Resources',function(){
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('Submit Form');
      actions.iSeeText('Name');
      actions.clickOnClass('.caret.pull-right');
      actions.iSeeText('Gary');
      actions.iSeeText('Travis');
      actions.iSeeText('Denise');
      actions.clickOnElementWithText('Travis');
      actions.clickOnButton('Submit');
      actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Travis');
    });
    tags('smoke').describe('Editing Nested Resources',function(){
      actions.clickOnElementWithText('Travis');
      actions.clickOnElementWithTextIndex(' Edit',1);
      actions.clickOnClass('.caret.pull-right');
      actions.iSeeText('Gary');
      actions.iSeeText('Travis');
      actions.iSeeText('Denise');
      actions.clickOnElementWithText('Denise');
      actions.clickOnButton('Submit');
      actions.clickOnClass('.toast-message');
      actions.clickOnElementWithText(' Data');
      actions.checkingUrlEndsWith('/submission');
      actions.iSeeText('Denise');
    });
  });
}