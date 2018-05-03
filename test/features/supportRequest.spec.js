module.exports = function (actions) {
  describe('Support Request ',function(){
    describe('Submitting a support form without value in ‘Email’ field',function(){
      actions.goToPageURL('https://help.form.io/support/');
      actions.enterTextInField('#fullName','Test Name');
      actions.btnDisabled('Submit');
    });

    describe('Submitting a support form without value in Name field', function(){
      actions.goToPageURL('https://help.form.io/support/');
      actions.enterTextInField('#email','email@test.com');
      actions.btnDisabled('Submit');
    });

    describe('Submitting a support request',function(){
      actions.goToPageURL('https://help.form.io/support/');
      actions.enterTextInField('#fullName','Test Name');
      actions.enterTextInField('#email','email@test.com');
      actions.enterTextInField('#message','Test Message');
      actions.btnEnabled('Submit');
      actions.clickOnElementWithText('Submit');
      actions.iSeeText('Submission was created.');
    });
  });
};
