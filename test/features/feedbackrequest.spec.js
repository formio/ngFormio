module.exports = function (actions,tags) {
  tags('smoke').describe('Feedback Request ',function(){
    describe('Expanding Feedback modalExpanding Feedback modal',function(){
      actions.goToPage('#/auth');
      actions.clickOnElement('.feedback ');
      actions.iSeeElement('.feedback');
    });
    describe('Clicking ‘Submit’ button with no value in the ‘Feedback’ field', function(){
      actions.goToPage('#/auth');
      actions.clickOnElement('.feedback ');
      actions.iSeeElement('.feedback');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',9,"${empty}");
      actions.btnDisabled('Send it!');
    });
    describe('Closes Feedback modal',function(){
      actions.clickOnElement('.feedback-cancel ');
      actions.iDonotSeeText('Close');
      actions.iSeeElement('.feedback');
    });
    describe('Submitting Feedback request', function(){
      actions.goToPage('#/auth');
      actions.clickOnElement('.feedback ');
      actions.iSeeElement('.feedback');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',9,"feedback-test");
      actions.btnEnabled('Send it!');
      actions.clickOnElementWithText('Send it!');
      actions.iDonotSeeText('Close');
      actions.iSeeElement('.feedback');
    });
  });
};
