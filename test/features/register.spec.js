module.exports = function (actions) {
  describe('Register Functionality ',function() {
    describe('Empty Register', function () {
      actions.logout();
      actions.btnDisabled('REGISTER');
    });
    describe('No Username', function () {
      actions.logout();
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Email', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Password', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #verifyPassword', '${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Verify Password', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('Bad email', function () {
      actions.logout();
      actions.enterTextInField('.register-container #email', 'bad-email');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Email must be a valid email.');
    });
    describe('Mismatched passwords', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password}');
      actions.enterTextInField('.register-container #verifyPassword', '${random-password}');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Passwords must match.');
    });
    describe('Username unique', function () {
      actions.userExistsWith('${random-name>register.name}', '${random-email>register.email}', '${random-password>register.password}');
      actions.logout();
      actions.enterTextInField('.register-container #name', '${register.name}');
      actions.enterTextInField('.register-container #email', '${random-email}');
      actions.enterTextInField('.register-container #password', '${random-password>register2.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register2.password}');
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeText('ValidationError: "Username" must be unique.');
    });
    describe('Email unique', function () {
      actions.userExistsWith('${random-name>register2.name}', '${random-email>register2.email}', '${random-password>register2.password}');
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name>register3.name}');
      actions.enterTextInField('.register-container #email', '${register2.email}');
      actions.enterTextInField('.register-container #password', '${random-password>register3.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register3.password}');
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeText('ValidationError: "Email" must be unique.');
    });
    describe('Successful registration', function () {
      actions.logout();
      actions.enterTextInField('.register-container #name', '${random-name>register3.name}');
      actions.enterTextInField('.register-container #email', '${random-email>register3.email}');
      actions.enterTextInField('.register-container #password', '${random-password>register3.password}');
      actions.enterTextInField('.register-container #verifyPassword', '${register3.password}');
      actions.btnEnabled('REGISTER');
      actions.clickOnElementWithText('REGISTER');
      //actions.iAmLoggedIn();
    });
  });
};
