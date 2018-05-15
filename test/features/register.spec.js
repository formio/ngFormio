module.exports = function (actions) {
  describe('Register Functionality ',function() {
    describe('Empty Register', function () {
      actions.logout();
      actions.btnDisabled('REGISTER');
    });
    describe('No Username', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3,'${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Email', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Password', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, '${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('No Verify Password', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, '${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register.password}');
      actions.btnDisabled('REGISTER');
    });
    describe('Bad email', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, 'bad-email');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Email must be a valid email.');
    });
    describe('Mismatched passwords', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3,'${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${random-password}');
      actions.btnDisabled('REGISTER');
      actions.iSeeText('Passwords must match.');
    });
    describe('Username unique', function () {
      actions.userExistsWith('${random-name>register.name}', '${random-email>register.email}', '${random-password>register.password}');
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${register.name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, '${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register2.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register2.password}');
      actions.waitForActionToComplete(500);
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeTextIn(".alert",'Please fix the following errors before submitting.\n"Username" must be unique.');
    });
    describe('Email unique', function () {
      actions.userExistsWith('${random-name>register2.name}', '${random-email>register2.email}', '${random-password>register2.password}');
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name>register3.name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, '${register2.email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register3.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register3.password}');
      actions.waitForActionToComplete(500);
      actions.clickOnElementWithText('REGISTER');
      actions.iSeeTextIn(".alert",'Please fix the following errors before submitting.\n"Email" must be unique.');
    });
    describe('Successful registration', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',2,'${random-name>register3.name}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',3, '${random-email>register3.email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',4,'${random-password>register3.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',5,'${register3.password}');
      actions.btnEnabled('REGISTER');
      actions.clickOnElementWithText('REGISTER');
    });
    describe(' Terms of Use and Privacy Policy links', function () {
      actions.logout();
      actions.clickOnElementWithText('Terms of Service');
      // actions.checkingUrlIamOn('https://form.io/#/terms');
      actions.goToPage('#/auth');
      actions.clickOnElementWithText('Privacy Policy');
      // actions.checkingUrlIamOn('https://form.io/#/privacy');
    });
  });
};
