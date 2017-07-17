module.exports = function(actions){

  describe('Create Resource', function(){
    /*describe('Background',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
    });

    describe('Background',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
      actions.iSeeValueIn('.ng-isolate-scope','User');
      actions.iSeeValueIn('.ng-isolate-scope','Admin');
      actions.clickOnElementWithText(' More info');

    });

    describe('Clicking more info help button',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
      actions.clickOnElementWithText(' More info');
      actions.waitForActionToComplete(5000);
      actions.switchTab();
      actions.checkingUrlIamOn('https n83w://help.form.io/userguide/resources/');
      actions.closeWindow();

    });

    describe('Searching for existing Resource in Resource search bar',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.iSeeText('Resources');
      actions.enterTextInField('#resource-search','Us');
      actions.iSeeValueIn('.ng-isolate-scope','User');
      actions.iDonotSeeText('Admin');
      actions.enterTextInField('#resource-search','A');
      actions.iSeeValueIn('.ng-isolate-scope','Admin');
      actions.iDonotSeeText('User');
    });*/

    describe('Searching for existing Resource in Resource search bar',function(){
      actions.iAmLoggedInFor('projuser3');
      actions.projectExisting('${random-title>project3.title}','${random-description>project3.description}');
      actions.goToPage("/#");
      actions.clickOnElementWithText('${project3.title}');
      actions.iSeeText(' Welcome');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElement(' Edit');
      actions.waitForActionToComplete(5000);
    });


  });
}
