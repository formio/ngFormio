module.exports = function (actions,tags) {
  describe('Register Functionality ',function() {
    tags('smoke').describe('Empty Register', function () {
      actions.logout();
      actions.btnDisabled('REGISTER');
    });
    tags('smoke').describe('No Username', function () {
      actions.logout();
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    tags('smoke').describe('No Email', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    tags('smoke').describe('No Password', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    tags('smoke').describe('No Verify Password', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.btnDisabled('REGISTER');
    });
    tags('smoke').describe('Bad email', function () {
      actions.logout();
      actions.enterTextInField('.register-container #email', 'bad-email');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Email must be a valid email.');
    });
    tags('smoke').describe('Mismatched passwords', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password}');
      actions.enterTextInField('.register-container #verifyPassword', '${random-password}');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Passwords must match.');
    });
    tags('smoke').describe('Username unique', function () {
      actions.userExistsWith('${random-name>register.name}', '${random-email>register.email}', '${random-password>register.password}');
      actions.logout();
      actions.enterTextInField('.register-container #name', '${register.name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register2.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register2.password}');
      actions.waitForActionToComplete(500);
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeText('ValidationError');
    });
    tags('smoke').describe('Email unique', function () {
      actions.userExistsWith('${random-name>register2.name}', '${random-email>register2.email}', '${random-password>register2.password}');
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name>register3.name}');
      actions.enterTextInField('.register-container #email', '${register2.email}');
      actions.enterTextInField('.register-container #password', '${random-password>register3.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register3.password}');
      actions.waitForActionToComplete(500);
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeText('ValidationError:');
    });
    describe('Successful registration', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name>register3.name}');
      actions.enterTextInField('.register-container #email', '${random-email>register3.email}');
      actions.enterTextInField('.register-container #password', '${random-password>register3.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register3.password}');
      actions.btnEnabled('REGISTER');
      actions.clickOnElementWithText('REGISTER');
      actions.checkingUrlIamOn('#/');
      actions.logout();
    });
    // tags('smoke').describe(' Terms of Use and Privacy Policy links', function () {
    //   actions.logout();
    //   actions.clickOnElementWithText('Terms of Service');
    //   // actions.checkingUrlIamOn('https://form.io/#/terms');
    //   actions.goToPage('#/auth');
    //   actions.clickOnElementWithText('Privacy Policy');
    //   // actions.checkingUrlIamOn('https://form.io/#/privacy');
    //   actions.goToPage('#/auth');
    // });
  });
};
