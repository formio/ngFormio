module.exports = function(actions){
  var formButtons = function(formname, button){
     return 'xpath://*[text()="'+formname+'"]/../../../..//*[text()="'+button+'"]';
  };
  describe('Create Resource', function(){
   /* describe('Background',function(){
     actions.iAmLoggedInFor('projuser3');
     actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
     actions.goToPage("/#");
     actions.clickOnElementWithText('Manage
     actions.clickOnElementWithText('Resources');
     actions.iSeeText('Resources');
     });*/

    /*describe('Background',function(){
     actions.iAmLoggedInFor('projuser3');
     actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
     actions.goToPage("/#");
     actions.clickOnElementWithText('Manage');
     actions.iSeeText(' Welcome');
     actions.clickOnElementWithText('Resources');
     actions.iSeeText('Resources');
     actions.iSeeValueIn('.ng-isolate-scope','User');
     actions.iSeeValueIn('.ng-isolate-scope','Admin');
     });

     describe('Clicking more info help button',function(){
     actions.logout();
     actions.iAmLoggedInFor('projuser3');
     actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
     actions.goToPage("/#");
     actions.clickOnElementWithText('Manage');
     actions.iSeeText(' Welcome');
     actions.clickOnElementWithText('Resources');
     actions.iSeeText('Resources');
     actions.clickOnElementWithText(' More info');
     // actions.waitForActionToComplete(5000);
     actions.switchTab();
     actions.checkingUrlIamOn('https://help.form.io/userguide/resources/');
     actions.closeWindow();

     });
     describe('Searching for existing Resource in Resource search bar',function(){
     actions.iAmLoggedInFor('projuser3');
     actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
     actions.goToPage("/#");
     actions.clickOnElementWithText('Manage');
     actions.iSeeText(' Welcome');
     actions.clickOnElementWithText('Resources');
     actions.iSeeText('Resources');
     actions.enterTextInField('#resource-search','Us');
     actions.iSeeValueIn('.ng-isolate-scope','User');
     actions.iDonotSeeText('Admin');
     actions.enterTextInField('#resource-search','A');
     actions.iSeeValueIn('.ng-isolate-scope','Admin');
     actions.iDonotSeeText('User');
     });

    describe('Searching for a non existing Resource in Resource search bar',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('Manage');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.enterTextInField('#resource-search','z');
      actions.iSeeValueIn('.form-list','');
      actions.clearTextFromField('#resource-search');
      actions.iSeeValueIn('.ng-isolate-scope','User');
      actions.iSeeValueIn('.ng-isolate-scope','Admin');
    });

    describe('Clicking ‘Edit’ button for Resource on Resource page',function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('Manage');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElement(formButtons('User', ' Edit'));
      actions.projectPageIamOn('edit','${project3.title}');
      actions.iSeeElement('#email');
      actions.iSeeElement('#password');

    });*/

    describe('Clicking ‘API’ button for Resource on Resource page',function () {
      actions.logout();
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('Manage');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElement(formButtons('Admin', ' API'));
      actions.iSeeText('Field');
      actions.iSeeText('Key');
      actions.iSeeText('Type');
      actions.iSeeText('Persistent');
    })
  });
}
