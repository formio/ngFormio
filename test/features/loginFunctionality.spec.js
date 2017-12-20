module.exports = function (actions) {
  describe('Login Functionality ',function(){
    describe('Logging in with invalid email ', function () {
      actions.logout();
      actions.enterTextInField('.login-container #email','admin@fake.com');
      actions.enterTextInField('.login-container #password','password');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect");
    });
    describe('Logging in with invalid password ', function () {
      actions.logout();
      actions.enterTextInField('.login-container #email','admin@example.com');
      actions.enterTextInField('.login-container #password','fakepassword');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect");
    });
    describe('Empty Login',function(){
      actions.logout();
      actions.enterTextInField('.login-container #email','admin@example.com');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect.");
    });
    describe('Bad Password', function () {
      actions.logout();
      actions.userExistsWith('${random-name>login.name}','${random-email>login.email}','${random-password>login.password}');
      actions.enterTextInField('.login-container #email','${login.email}');
      actions.enterTextInField('.login-container #password','${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect");
    });
    describe('Missing Email', function () {
      actions.logout();
      actions.enterTextInField('.login-container #password','${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect.");
    });
    describe('Missing Password', function () {
      actions.logout();
      actions.enterTextInField('.login-container #email','${random-email}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect.");
    });
    describe('Unknown User', function () {
      actions.logout();
      actions.enterTextInField('.login-container #email','${random-email}');
      actions.enterTextInField('.login-container #password','${random-password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iSeeTextIn(".alert","User or password was incorrect");
    });
    describe('Logging in and Logging out',function(){
      actions.logout();
      actions.userExistsWith('${random-name>login2.name}','${random-email>login2.email}','${random-password>login2.password}');
      actions.enterTextInField('.login-container #email','${login2.email}');
      actions.enterTextInField('.login-container #password','${login2.password}');
      actions.clickOnElementWithText('LOG IN');
      actions.iAmLoggedIn();
      actions.checkingUrlIamOn('#/');
      actions.clickOnElement('#user-menu');
      actions.clickOnElement('#logout');
      actions.checkIfLoggedOut();
    });
  });
};
