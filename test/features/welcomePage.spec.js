module.exports = function (actions,tags) {
  tags('smoke').describe('Walkthrough Page',function(){
    describe('AngularJS',function(){
      actions.logout();
      actions.iAmLoggedInFor('AngularJS');
      actions.goToPage("#/");
      actions.clickOnElementWithText('AngularJS');
      actions.enterTextInField('#title','AngularJSwalkThroughProject');
      actions.clickOnElementWithText(' Create Project');
      actions.checkingUrlEndsWith('/tour');
      actions.iSeeTextCount('Trial',2);
      // actions.clickOnElementWithTextIndex('Trial',1);
      // actions.checkingUrlEndsWith('/billing');
      // actions.goBack();
      // actions.clickOnElementWithTextIndex(' Teams',1);
      // actions.checkingUrlEndsWith('/billing');
      // actions.goBack();
      // actions.clickOnClassWithIndex('.fa.fa-cog',1);
      // actions.checkingUrlEndsWith('/billing');
      // actions.goBack();
      actions.clickOnElementWithText('Download a StarterKit Application');
      actions.iSeeText('Clone the Form.io AngularJS StarterKit');
      var links = [
        ['https://git-scm.com/','https://git-scm.com/',0],
        ['https://github.com/formio/ng-app-starterkit','https://github.com/formio/ng-app-starterkit',0]
        //['Fountain.js','http://fountainjs.io/',0],
      ];
      links.forEach(function(link){
        actions.clickOnElementWithTextIndex(link[0],link[2]);
        actions.newWindow();
        actions.checkingUrlIamOn(link[1]);
        actions.closeWindow();
      });
      var links1 = [
        ['ngFormio','https://github.com/formio/ngFormio',0],
        ['ngFormBuilder','https://github.com/formio/ngFormBuilder',0],
        ['ngFormioHelper','https://github.com/formio/ngFormioHelper',0],
        ['ngFormio','https://github.com/formio/ngFormio',1],
        ['ngFormBuilder','https://github.com/formio/ngFormBuilder',1]
      ];
      links1.forEach(function(link1){
        actions.clickOnElementWithTextIndex(link1[0],link1[2]);
        actions.checkingUrlIamOn(link1[1]);
        actions.goBack();
      });
      actions.clickOnElementWithText('Configure the starterkit application');
      actions.iSeeText('Configure the app');
      actions.clickOnElementWithText('https://github.com/formio/ng-app-starterkit/blob/master/src/config.js');
      actions.newWindow();
      actions.checkingUrlIamOn('https://github.com/formio/ng-app-starterkit/blob/master/src/config.js');
      actions.closeWindow();
      actions.clickOnElementWithText('Create an Admin user for your application');
      actions.iSeeText(' Admin User');
      actions.clickOnElementWithTextIndex('Access',1);
      actions.checkingUrlEndsWith('/access');
      actions.goBack();
      actions.enterTextInField('#email','test@test.com');
      actions.enterTextInField('#password','password');
      actions.clickOnElementWithText('Submit');
      actions.iSeeText('Submission was created.');
      actions.clickOnElementWithText('Resources');
      actions.clickOnElementWithTextIndex(' Data',1);
      actions.iSeeText('test@test.com');
      actions.clickOnElementWithText('Overview');
      actions.checkingUrlEndsWith('/overview');
      actions.clickOnElementWithText('View Walkthrough');
      actions.checkingUrlEndsWith('/tour');
      actions.clickOnElementWithText('Create a new form to put in your application');
      actions.iSeeText(': Add a new form');
      // actions.clickOnElementWithText(' New Form');
      // actions.checkingUrlEndsWith('/form/new/form');
      // actions.goBack();
      actions.clickOnElementWithText('Add an email action to your form');
      actions.iSeeText(': Add an action');
      actions.clickOnElementWithText('Embed the form within your application');
      actions.iSeeText(' Embed the form');
      actions.clickOnElementWithText('https://github.com/formio/ngFormioHelper/wiki/FormioResource-Provider');
      actions.newWindow();
      actions.checkingUrlIamOn('https://github.com/formio/ngFormioHelper/wiki/FormioResource-Provider');
      actions.closeWindow();
      actions.clickOnElementWithText('Launch your application');
      actions.iSeeText(' Launch');
      actions.clickOnElementWithText('github pages');
      actions.newWindow();
      actions.checkingUrlIamOn('https://pages.github.com/');
      actions.closeWindow();
      actions.clickOnElementWithText('See what else you can do with Form.io');
      actions.iSeeText(' Next Steps');
      var moreInfoLinks = [
        [0,'https://help.form.io/userguide/roles-and-permissions/','Roles and Permissions'],
        [1,'https://help.form.io/integrations/start/','Getting Started'],
        [2,'https://help.form.io/userguide/teams/','Teams'],
        [3,'https://help.form.io/userguide/pdf/','PDF Forms'],
        [4,'https://help.form.io/developer/offline/','Offline Plugin'],
        [5,'https://help.form.io/userguide/staging/','Staging'],
        [6,'https://help.form.io/userguide/environments/','On-Premise Environments']
      ];
      moreInfoLinks.forEach(function(moreInfoLink){
        actions.clickOnElementWithTextIndex('More Info',moreInfoLink[0]);
        actions.newWindow();
        actions.checkingUrlIamOn(moreInfoLink[1]);
        actions.iSeeText(moreInfoLink[2]);
        actions.closeWindow();
      });
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText('Now that you have your application up and running, check out some of our more advanced features.');
      actions.clickOnClass('.fa.fa-check-circle');
      actions.iSeeText('Welcome to Your New Project!');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText('Welcome to Your New Project!');
      actions.clickOnClass('.fa.fa-sliders');
      actions.iSeeText('Clone the Form.io AngularJS StarterKit');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText('Clone the Form.io AngularJS StarterKit');
      actions.clickOnClass('.fa.fa-user-plus');
      actions.iSeeText(' Admin User');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText(' Admin User');
      actions.clickOnClass('.fa.fa-wpforms');
      actions.iSeeText(': Add a new form');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText(': Add a new form');
      actions.clickOnClassWithIndex('.fa.fa-code',1);
      actions.iSeeText(' Embed the form');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText(' Embed the form');
      actions.clickOnClassWithIndex('.fa.fa-rocket',1);
      actions.iSeeText(' Launch');
      actions.clickOnElementWithText('Forms');
      actions.clickOnElementWithText(' Continue Walkthrough');
      actions.iSeeText(' Launch');
    });
    // describe('Angular',function(){
    //   actions.logout();
    //   actions.iAmLoggedInFor('Angular');
    //   actions.goToPage("#/");
    //   actions.clickOnElementWithText('Angular');
    //   actions.enterTextInField('#title','AngularwalkThroughProject');
    //   actions.clickOnElementWithText(' Create Project');
    //   actions.checkingUrlEndsWith('/tour');
    //   actions.iSeeTextCount('Trial',2);
    //   // actions.clickOnElementWithTextIndex('Trial',1);
    //   // actions.checkingUrlEndsWith('/billing');
    //   // actions.goBack();
    //   // actions.clickOnElementWithTextIndex(' Teams',1);
    //   // actions.checkingUrlEndsWith('/billing');
    //   // actions.goBack();
    //   // actions.clickOnClassWithIndex('.fa.fa-cog',1);
    //   // actions.checkingUrlEndsWith('/billing');
    //   // actions.goBack();
    //   actions.clickOnElementWithText('Download a StarterKit Application');
    //   actions.iSeeText('Clone the Form.io Angular StarterKit');
    //   var links = [
    //     ['https://git-scm.com/','https://git-scm.com/',0],
    //     ['https://github.com/formio/ng-app-starterkit','https://github.com/formio/ng-app-starterkit',0]
    //     //['Fountain.js','http://fountainjs.io/',0],
    //   ];
    //   links.forEach(function(link){
    //     actions.clickOnElementWithTextIndex(link[0],link[2]);
    //     actions.newWindow();
    //     actions.checkingUrlIamOn(link[1]);
    //     actions.closeWindow();
    //   });
    //   var links1 = [
    //     ['ngFormio','https://github.com/formio/ngFormio',0],
    //     ['ngFormBuilder','https://github.com/formio/ngFormBuilder',0],
    //     ['ngFormioHelper','https://github.com/formio/ngFormioHelper',0],
    //     ['ngFormio','https://github.com/formio/ngFormio',1],
    //     ['ngFormBuilder','https://github.com/formio/ngFormBuilder',1]
    //   ];
    //   links1.forEach(function(link1){
    //     actions.clickOnElementWithTextIndex(link1[0],link1[2]);
    //     actions.checkingUrlIamOn(link1[1]);
    //     actions.goBack();
    //   });
    //   actions.clickOnElementWithText('Configure the starterkit application');
    //   actions.iSeeText('Configure the app');
    //   actions.clickOnElementWithText('https://github.com/formio/ng-app-starterkit/blob/master/src/config.js');
    //   actions.newWindow();
    //   actions.checkingUrlIamOn('https://github.com/formio/ng-app-starterkit/blob/master/src/config.js');
    //   actions.closeWindow();
    //   actions.clickOnElementWithText('Create an Admin user for your application');
    //   actions.iSeeText(' Admin User');
    //   actions.clickOnElementWithTextIndex('Access',1);
    //   actions.checkingUrlEndsWith('/access');
    //   actions.goBack();
    //   actions.enterTextInField('#email','test@test.com');
    //   actions.enterTextInField('#password','password');
    //   actions.clickOnElementWithText('Submit');
    //   actions.iSeeText('Submission was created.');
    //   actions.clickOnElementWithText('Resources');
    //   actions.clickOnElementWithTextIndex(' Data',1);
    //   actions.iSeeText('test@test.com');
    //   actions.clickOnElementWithText('Overview');
    //   actions.checkingUrlEndsWith('/overview');
    //   actions.clickOnElementWithText('View Walkthrough');
    //   actions.checkingUrlEndsWith('/tour');
    //   actions.clickOnElementWithText('Create a new form to put in your application');
    //   actions.iSeeText(': Add a new form');
    //   // actions.clickOnElementWithText(' New Form');
    //   // actions.checkingUrlEndsWith('/form/new/form');
    //   // actions.goBack();
    //   actions.clickOnElementWithText('Add an email action to your form');
    //   actions.iSeeText(': Add an action');
    //   actions.clickOnElementWithText('Embed the form within your application');
    //   actions.iSeeText(' Embed the form');
    //   actions.clickOnElementWithText('https://github.com/formio/ngFormioHelper/wiki/FormioResource-Provider');
    //   actions.newWindow();
    //   actions.checkingUrlIamOn('https://github.com/formio/ngFormioHelper/wiki/FormioResource-Provider');
    //   actions.closeWindow();
    //   actions.clickOnElementWithText('Launch your application');
    //   actions.iSeeText(' Launch');
    //   actions.clickOnElementWithText('github pages');
    //   actions.newWindow();
    //   actions.checkingUrlIamOn('https://pages.github.com/');
    //   actions.closeWindow();
    //   actions.clickOnElementWithText('See what else you can do with Form.io');
    //   actions.iSeeText(' Next Steps');
    //   var moreInfoLinks = [
    //     [0,'https://help.form.io/userguide/roles-and-permissions/','Roles and Permissions'],
    //     [1,'https://help.form.io/integrations/start/','Getting Started'],
    //     [2,'https://help.form.io/userguide/teams/','Teams'],
    //     [3,'https://help.form.io/userguide/pdf/','PDF Forms'],
    //     [4,'https://help.form.io/developer/offline/','Offline Plugin'],
    //     [5,'https://help.form.io/userguide/staging/','Staging'],
    //     [6,'https://help.form.io/userguide/environments/','On-Premise Environments']
    //   ];
    //   moreInfoLinks.forEach(function(moreInfoLink){
    //     actions.clickOnElementWithTextIndex('More Info',moreInfoLink[0]);
    //     actions.newWindow();
    //     actions.checkingUrlIamOn(moreInfoLink[1]);
    //     actions.iSeeText(moreInfoLink[2]);
    //     actions.closeWindow();
    //   });
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText('Now that you have your application up and running, check out some of our more advanced features.');
    //   actions.clickOnClass('.fa.fa-check-circle');
    //   actions.iSeeText('Welcome to Your New Project!');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText('Welcome to Your New Project!');
    //   actions.clickOnClass('.fa.fa-sliders');
    //   actions.iSeeText('Clone the Form.io AngularJS StarterKit');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText('Clone the Form.io AngularJS StarterKit');
    //   actions.clickOnClass('.fa.fa-user-plus');
    //   actions.iSeeText(' Admin User');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText(' Admin User');
    //   actions.clickOnClass('.fa.fa-wpforms');
    //   actions.iSeeText(': Add a new form');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText(': Add a new form');
    //   actions.clickOnClassWithIndex('.fa.fa-code',1);
    //   actions.iSeeText(' Embed the form');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText(' Embed the form');
    //   actions.clickOnClassWithIndex('.fa.fa-rocket',1);
    //   actions.iSeeText(' Launch');
    //   actions.clickOnElementWithText('Forms');
    //   actions.clickOnElementWithText(' Continue Walkthrough');
    //   actions.iSeeText(' Launch');
    // });
  });
};
