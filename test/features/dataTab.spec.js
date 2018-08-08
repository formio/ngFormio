module.exports = function (actions,tags) {
  tags('smoke').describe('Test 20',function() {
    describe('Data Tab', function () {
      actions.logout();
      actions.iAmLoggedInFor('testDataUser');
      actions.goToPage('#/');
      actions.projectExisting('New Project', 'This is a test project');
      actions.clickOnElementWithText('New Project');
      actions.clickOnElementWithText('Data');
      actions.checkingUrlEndsWith('/data');
    });
    tags('smoke').describe('',function(){
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iSeeText('Admin Login');
      actions.iSeeText('User');
      actions.iSeeText('Admin');
      actions.clickOnClassWithIndex('.fa.fa-table',1);
      actions.iSeeText('User Login Form');
      actions.checkingUrlEndsWith('/submission');
      actions.clickOnElementWithText('Data');
      actions.checkingUrlEndsWith('/data');
      actions.clickOnClassWithIndex('.fa.fa-table',4);
      actions.iSeeText('User Resource');
      actions.checkingUrlEndsWith('/submission');
      actions.clickOnElementWithText('Data');
      actions.checkingUrlEndsWith('/data');


      actions.enterTextInField('#form-search','Lo');
      actions.iSeeText('User Login');
      actions.iDonotSeeText('User Register');
      actions.iSeeText('Admin Login');
      actions.enterTextInField('#form-search','R');
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iDonotSeeText('Admin Login');

      actions.enterTextInField('#form-search','Z');
      actions.iDonotSeeText('User Login');
      actions.iDonotSeeText('User Register');
      actions.iDonotSeeText('Admin Login');
      actions.enterTextInField('#form-search','');
      actions.iSeeText('User Login');
      actions.iSeeText('User Register');
      actions.iSeeText('Admin Login');

      actions.enterTextInField('#resource-search','Us');
      actions.iSeeText('User');
      actions.iDonotSeeText('Admin');
      actions.enterTextInField('#resource-search','A');
      actions.iDonotSeeText('User');
      actions.iSeeText('Admin');
      actions.enterTextInField('#resource-search','Z');
      actions.iDonotSeeText('Admin');
      actions.iDonotSeeText('User');

    });
  });
}
