module.exports = function (actions,tags) {
  tags('smoke').describe('Project Upgrade/Payment',function(){
    describe('Project Upgrade/Payment',function(){
      actions.logout();
      actions.iAmLoggedInFor('profileuser7');
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.enterTextInField('#title', 'projectPayment');
      actions.clickOnElementWithText(' Create Project');
      actions.clickOnClass('.toast-message');
      actions.waitForActionToComplete(1000);
      actions.clickOnClass('.fa.fa-cog');
      actions.clickOnElementWithText('Plan and Pricing');
      actions.checkingUrlEndsWith('billing');
      actions.upgradeToPlan('Independent');
      actions.btnDisabled('Submit');
      actions.clickOnClass('#user-menu');
      actions.clickOnElementWithText(' Payment Info');
      actions.checkingUrlEndsWith('#/profile/payment/view');
      actions.clickOnElementWithText('Add Credit Card');
      actions.enterTextInField('#cardholderName','Test');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnClass('#submit');
      actions.waitForActionToComplete(2000);
      actions.goToPage('#/');
      actions.clickOnElementWithText('projectPayment');
      actions.clickOnClass('.fa.fa-cog');
      actions.clickOnElementWithText('Plan and Pricing');
      actions.checkingUrlEndsWith('billing');
      actions.clickOnClass('.fa.fa-home');
      actions.clickOnElementWithText('projectPayment');
      actions.waitForActionToComplete(1000);
      actions.clickOnElementWithText(' Upgrade Now');
      actions.checkingUrlEndsWith('billing');
      actions.clickOnClass('.fa.fa-home');
      actions.clickOnElementWithText('projectPayment');
      actions.waitForActionToComplete(1000);
      actions.clickOnElementWithText('Trial');
      actions.checkingUrlEndsWith('billing');
      actions.iSeeText('Selected');
      actions.iDonotSeeText('Payments will be charged to:');
      actions.upgradeToPlan('Basic');
      actions.iDonotSeeText('Payments will be charged to:');
    });
    describe('Make sure project is on Trial Plan',function(){
      actions.iSeeTextCount('Upgrade',4);
      actions.clickOnElementWithText("Downgrade");
      actions.upgradeToPlan("Basic");
      actions.clickOnButton(' Confirm Billing Change');
      actions.waitForActionToComplete(2000);
      actions.iSeeTextCount('Upgrade',3);
      actions.iSeeTextCount('Downgrade',1);
      actions.iDonotSeeText(' Confirm Billing Change');
      actions.upgradeToPlan('Independent');
      actions.iSeeText(' Confirm Billing Change');
      actions.clickOnElementWithText('Downgrade');
      actions.iDonotSeeText(' Confirm Billing Change');
      actions.iSeeText('$0/month');
      actions.upgradeToPlan('Independent');
      actions.iSeeText('$15/month');
      actions.upgradeToPlan('Team Pro');
      actions.iSeeText('$100/month');
      actions.upgradeToPlan('Enterprise');
      actions.iSeeText('$250/month');
      actions.clickOnClass('.fa.fa-home');
      actions.clickOnElementWithText('projectPayment');
      actions.clickOnElementWithText('Basic');
      actions.upgradeToPlan('Independent');
      actions.iSeeText('Payments will be charged to:');
      actions.upgradeToPlan('Team Pro');
      actions.iSeeText('Payments will be charged to:');
      actions.upgradeToPlan('Enterprise');
      actions.iSeeText('Payments will be charged to:');
    });
    describe('Upgrading Project',function(){
      actions.clickOnClass('.fa.fa-home');
      actions.clickOnElementWithText('projectPayment');
      actions.clickOnElementWithText('Basic');
      actions.clickOnElementWithText('Downgrade');
      actions.clickOnButton(' Confirm Billing Change');
      actions.iSeeTextIn("a.project-plan.label-trial","Trial");
      actions.waitForActionToComplete(2000);
      actions.upgradeToPlan('Basic');
      actions.iDonotSeeText('Payments will be charged to:');
      actions.clickOnButton(' Confirm Billing Change');
      actions.iSeeTextIn("a.project-plan.label-info","Basic");
      actions.iSeeText('$0/month');
      actions.upgradeToPlan('Independent');
      actions.iSeeText('Payments will be charged to:');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 01/25');
      actions.iSeeText('Name on Card: Test');
      actions.clickOnButton(' Confirm Billing Change');
      actions.iSeeTextIn("a.project-plan.label-warning","Independent");
      actions.iSeeText('$15/month');
      actions.upgradeToPlan('Team Pro');
      actions.iSeeText('Payments will be charged to:');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 01/25');
      actions.iSeeText('Name on Card: Test');
      actions.clickOnButton(' Confirm Billing Change');
      actions.iSeeTextIn("a.project-plan.label-success","Team Pro");
      actions.iSeeText('$100/month');
      actions.enterTextInFieldIndex('input.form-control',0,'1');
      actions.iSeeText('$350/month');
      actions.enterTextInFieldIndex('input.form-control',1,'1');
      actions.iSeeText('$600/month');
      actions.enterTextInFieldIndex('input.form-control',0,'0');
      actions.iSeeText('$350/month');
      actions.enterTextInFieldIndex('input.form-control',1,'0');
      actions.iSeeText('$100/month');
      actions.enterTextInFieldIndex('input.form-control',0,'3');
      actions.iSeeText('$600/month');
      actions.enterTextInFieldIndex('input.form-control',1,'3');
      actions.iSeeText('$1100/month');
      actions.upgradeToPlan('Enterprise');
      actions.iSeeText('$1250/month');
      actions.clickOnElementWithText('Downgrade');
      actions.clickOnElementWithText('Downgrade');
      actions.iSeeText('$15/month');
      actions.upgradeToPlan('Enterprise');
      actions.iSeeText('Payments will be charged to:');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 01/25');
      actions.iSeeText('Name on Card: Test');
      actions.clickOnButton(' Confirm Billing Change');
      actions.iSeeTextIn("a.project-plan.label-commercial","Enterprise");
      actions.iSeeText('$250/month');
      actions.enterTextInFieldIndex('input.form-control',0,'1');
      actions.iSeeText('$500/month');
      actions.enterTextInFieldIndex('input.form-control',1,'1');
      actions.iSeeText('$750/month');
      actions.enterTextInFieldIndex('input.form-control',0,'0');
      actions.iSeeText('$500/month');
      actions.enterTextInFieldIndex('input.form-control',1,'0');
      actions.iSeeText('$250/month');
      actions.enterTextInFieldIndex('input.form-control',0,'3');
      actions.iSeeText('$750/month');
      actions.enterTextInFieldIndex('input.form-control',1,'3');
      actions.iSeeText('$1250/month');
      actions.clickOnElementWithText('Downgrade');
      actions.iSeeText('$1100/month');
      actions.clickOnElementWithText('Downgrade');
      actions.iSeeText('$15/month');
      actions.clickOnElementWithText('our help documentation');
      actions.switchTab();
      actions.checkingUrlIamOn('https://help.form.io/userguide/pdfserver/');
      actions.iSeeText('PDF Server');
      actions.closeWindow();
      actions.iDonotSeeText('Hosted PDF');
      actions.clickOnElementWithText('Select');
      actions.iSeeText('Hosted PDF');
      actions.iSeeText('$65/month');
      // actions.clickOnButton(' Confirm Billing Change');
      // actions.waitForActionToComplete(1000);
      // actions.iSeeText('Hosted PDF');
      // actions.iSeeText('$65/month');
      // actions.pageReload();
      // actions.iSeeText('Hosted PDF');
      // actions.iSeeText('$65/month');
      // actions.clickOnElementWithText('Settings');
      // actions.clickOnElementWithText('PDF Management');
      // actions.iSeeText('25');
      // actions.iSeeText('1,000');
      // actions.clickOnClass('.fa.fa-cog');
      // actions.clickOnElementWithText('Plan and Pricing');
      actions.clickOnElementWithText('Select');
      actions.iSeeText('$15/month');
      actions.iDonotSeeText('Hosted PDF');
      actions.clickOnButton(' Confirm Billing Change');
      actions.waitForActionToComplete(1000);
      actions.iDonotSeeText('Hosted PDF');
      actions.iSeeText('$15/month');
      actions.pageReload();
      actions.iDonotSeeText('Hosted PDF');
      actions.iSeeText('$15/month');
      actions.clickOnElementWithText('Settings');
      actions.clickOnElementWithText('PDF Management');
      actions.iSeeText('1');
      actions.iSeeText('10');
      actions.clickOnClass('.fa.fa-cog');
      actions.clickOnElementWithText('Delete projectPayment Project');
      actions.clickOnElementWithText(' Yes');
      actions.iDonotSeeText('projectPayment');
    });
  });
};
