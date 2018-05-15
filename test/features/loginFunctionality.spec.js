module.exports = function (actions) {
  describe('Login Functionality ',function(){
    describe('Logging in with invalid email ', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'admin@fake.com');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'password');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nUser or password was incorrect");
    });
    describe('Logging in with invalid password ', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'admin@example.com');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'fakepassword');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nUser or password was incorrect");
    });
    describe('Empty Login',function(){
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'admin@example.com');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nMissing password");
    });
    describe('Bad Password', function () {
      actions.logout();
      actions.userExistsWith('${random-name>login.name}','${random-email>login.email}','${random-password>login.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'${login.email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nUser or password was incorrect");
    });
    describe('Missing Email', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nMissing username");
    });
    describe('Missing Password', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'${random-email}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nMissing password");
    });
    describe('Unknown User', function () {
      actions.logout();
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'${random-email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nUser or password was incorrect");
    });
    describe('Logging in with no email or password',function(){
      actions.logout();
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","Please fix the following errors before submitting.\nMissing username");
    });
    describe('Logging in and Logging out',function(){
      actions.logout();
      actions.userExistsWith('${random-name>login2.name}','${random-email>login2.email}','${random-password>login2.password}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',0,'${login2.email}');
      actions.enterTextInFieldIndex('xpath://*[contains(@class, \'form-control\')]',1,'${login2.password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iAmLoggedIn();
      actions.checkingUrlIamOn('#/');
      actions.clickOnElement('#user-menu');
      actions.clickOnElement('#logout');
      actions.checkIfLoggedOut();
    });
  });
};
