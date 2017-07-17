module.exports = function (actions) {

  describe('Reset Password',function(){
    describe('Navigating to Reset Password page',function(){
      actions.logout();
      //actions.userExistsWith('${random-name>login.name}','${random-email>login.email}','${random-password>login.password}');
      actions.goToPage('#/auth');
      actions.clickOnElementWithText('Forgot your password?');
      actions.checkingUrlIamOn('#/resetsend');
    });

    describe('Submitting a Reset Password request with an invalid email', function(){
      //actions.userExistsWith('${random-name>login.name}','${random-email>login.email}','${random-password>login.password}');
      actions.goToPage('#/auth');
      actions.clickOnElementWithText('Forgot your password?');
      actions.enterTextInField("#email","fakeemail");
      actions.btnClick('Send Reset Password');
      actions.iSeeText("Email must be a valid email.");
      actions.checkingUrlIamOn('#/resetsend');

    });

    describe('Submitting a Reset Password request with an unregistered email', function(){
      actions.goToPage('#/auth');
      actions.clickOnElementWithText('Forgot your password?');
      actions.enterTextInField("#email",'${random-email}');
      actions.btnClick('Send Reset Password');
      actions.iSeeTextIn(".alert","User not found.");
      actions.checkingUrlIamOn('#/resetsend');
    });

    describe('Submitting a valid Reset Password request',function(){
      actions.userExistsWith('${random-name>login2.name}','${random-email>login2.email}','${random-password>login2.password}');
      actions.goToPage('#/auth');
      //actions.enterTextInElementWithId('.login-container #email','${login2.email}');
      //actions.enterTextInElementWithId('.login-container #password','${login2.password}');
      //actions.btnClick('LOG IN');
      actions.clickOnElementWithText('Forgot your password?');
       actions.enterTextInField("#email",'${login2.email}');

       actions.btnClick('Send Reset Password');
       actions.waitForActionToComplete(5000);
       actions.checkingUrlIamOn('#/resetsend/done');
      actions.waitForActionToComplete(5000);
    });

  });
}
