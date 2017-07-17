module.exports = function (actions) {
  describe('Support Request Fucntionality',function(){
    describe('Submitting a support form without value in ‘Email’ field',function(){
      actions.goToHelpPage('support/');
      actions.enterTextInField('#fullName','Test-name');
      actions.enterTextInField('#email','${empty}');
      actions.btnDisabled ('Submit');
    });
    describe('Submitting a support form without value in Name field',function(){
      actions.goToHelpPage('support/');
      actions.enterTextInField('#email','email@example.com');
      actions.enterTextInField('#fullName','${empty}');
      actions.btnDisabled ('Submit');
    });
    describe('Submitting a support request',function(){
      actions.goToHelpPage('support/');
      actions.enterTextInField('#fullName','Test-name');
      actions.enterTextInField('#email','email@example.com');
      actions.enterTextInField('#message','Test_message');
      actions.btnEnabled ('Submit');
      actions.clickOnElementWithText('Submit');
      actions.iSeeTextIn(".alert","Submission was created.");
      actions.checkingUrlIamOn('https://help.form.io/support/');
    });
  });
};
