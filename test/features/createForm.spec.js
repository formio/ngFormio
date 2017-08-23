module.exports = function (actions) {
  describe('Basic Components',function() {
    describe('Number', function () {
      actions.iAmLoggedInFor('testUser');
      actions.goToPage('#/');
      actions.projectExisting('testtitle', 'testdesc');
      actions.clickOnElementWithText('testtitle');
      actions.creatingFormWithComponents();
      actions.waitForActionToComplete(2000);
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText('sampletestform');
      actions.clickOnElement('xpath://*[@value="Save Form"]');
      actions.clickOnElementWithText(' Use');
      actions.iSeeText('@');
      actions.iSeeText('!');
      actions.enterTextInField('#numberField', '1');
      actions.clickOnElement('#submit');
      actions.iSeeTextIn('.alert', 'Please fix the following errors before submitting.');
      actions.clickOnElementWithText(' Data');
      actions.iDonotSeeText('1');
      actions.clickOnElementWithText(' Use');
      actions.enterTextInField('#numberField', '32');
      actions.clickOnElement('#submit');
      actions.iSeeTextIn('.alert', 'Please fix the following errors before submitting.');
      actions.clickOnElementWithText(' Data');
      actions.iDonotSeeText('32');
      actions.clickOnElementWithText(' Use');
      actions.enterTextInField('#numberField', '18');
      actions.clickOnElement('#submit');
      actions.clickOnElementWithText(' Data');
      actions.iSeeText('18');
    });

    /*describe('Password',function(){
     actions.iAmLoggedInFor('testUser');
     actions.goToPage('#/');
     actions.projectExisting('testtitle','testdesc');
     actions.clickOnElementWithText('testtitle');
     actions.creatingFormWithComponents();
     actions.waitForActionToComplete(2000);
     actions.clickOnElementWithText('Forms');
     actions.clickOnElementWithText('sampletestform');
     actions.clickOnElement('xpath://!*[@value="Save Form"]');
     actions.clickOnElementWithText(' Use');
     actions.enterTextInField('#passwordField','1');
     actions.clickOnElement('#submit');

     });*/

     // describe('Text Area',function(){
     //   actions.iAmLoggedInFor('testUser');
     //   actions.goToPage('#/');
     //   actions.projectExisting('testtitle','testdesc');
     //   actions.clickOnElementWithText('testtitle');
     //   actions.creatingFormWithComponents();
     //   actions.waitForActionToComplete(2000);
     //   actions.clickOnElementWithText('Forms');
     //   actions.clickOnElementWithText('sampletestform');
     //   actions.clickOnElement('xpath://*[@value="Save Form"]');
     //   actions.clickOnElementWithText(' Use');
     //   actions.enterTextInField('#textareaField','This is a sample test for the text area component');
     //   actions.clickOnElement('#submit');
     //   actions.clickOnElementWithText(' Data');
     //   actions.iSeeText('This is a sample test for the text area component');
     //   actions.clickOnElementWithText(' Use');
     //   actions.enterTextInField('#textareaField','123467542');
     //   actions.clickOnElement('#submit');
     //   actions.clickOnElementWithText(' Data');
     //   actions.iSeeText('123467542');
     // });

    // describe('Checkbox',function(){
    //   actions.iAmLoggedInFor('testUser');
    //   actions.goToPage('#/');
    //   actions.projectExisting('testtitle','testdesc');
    //   actions.clickOnElementWithText('testtitle');
    //   actions.creatingFormWithComponents();
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText('sampletestform');
    //   actions.clickOnElement('xpath://*[@value="Save Form"]');
    //   actions.clickOnElementWithText(' Use');
    //   actions.clickOnElement("#checkboxField");
    //   //actions.waitForActionToComplete(20000);
    //   actions.clickOnElement('#submit');
    //   actions.clickOnElementWithText('Data');
    //   actions.clickOnElementWithText('sampletestform');
    //   actions.waitForActionToComplete(20000);
    //
    // });

    // describe('Selectbox',function(){
    //   actions.iAmLoggedInFor('testUser');
    //   actions.goToPage('#/');
    //   actions.projectExisting('testtitle','testdesc');
    //   actions.clickOnElementWithText('testtitle');
    //   actions.creatingFormWithComponents();
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText('sampletestform');
    //   actions.clickOnElement('xpath://*[@value="Save Form"]');
    //   actions.clickOnElementWithText(' Use');
    //   actions.clickOnElement("#selectboxesField-a");
    //   //actions.waitForActionToComplete(20000);
    //   actions.clickOnElement('#submit');
    //   actions.clickOnElementWithText('Data');
    //   actions.clickOnElementWithText('sampletestform');
    //   actions.waitForActionToComplete(20000);
    //
    // });


    // describe('Radio' ,function(){
    //
    //   actions.iAmLoggedInFor('testUser');
    //   actions.goToPage('#/');
    //   actions.projectExisting('testtitle','testdesc');
    //   actions.clickOnElementWithText('testtitle');
    //   actions.creatingFormWithComponents();
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText('sampletestform');
    //   actions.clickOnElement('xpath://*[@value="Save Form"]');
    //   actions.clickOnElementWithText(' Use');
    //   actions.clickOnElement("#radioField-");
    //   actions.clickOnElement('#submit');
    //   actions.clickOnElementWithText('Data');
    //   actions.waitForActionToComplete(20000);
    //   actions.waitForActionToComplete(20000);
    //   actions.waitForActionToComplete(20000);
    //   actions.waitForActionToComplete(20000);
    //
    // });
});

};
