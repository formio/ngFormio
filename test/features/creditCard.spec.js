module.exports = function (actions) {
  describe('Inputting Credit Card Info',function(){
    describe('Navigating to ‘Payment Info’ page',function(){
      actions.iAmLoggedInFor('profileuser2');
      // actions.enterTextInField('.login-container #email', 'admin@example.com');
      // actions.enterTextInField('.login-container #password', 'password');
      // actions.clickOnElementWithText('LOG IN');
      actions.waitForActionToComplete(2000);
      actions.clickOnClass('#user-menu');
      actions.clickOnElementWithText(' Payment Info');
      actions.checkingUrlEndsWith('#/profile/payment/view');
    });
    describe('Navigating to the Credit Card input page',function(){
      actions.clickOnElementWithText('Add Credit Card');
      // actions.clickOnElementWithText('Change Credit Card');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
    });
    describe('Adding valid Credit Card to profile',function(){
      actions.enterTextInField('#cardholderName','Test Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('/#/profile/payment/view');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 01/25');
      actions.iSeeText('Name on Card: Test Creditcard');
    });
    describe('Submitting Credit Card input form with missing Cardholder Name value',function(){
      actions.clickOnElementWithText('Change Credit Card');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
    });
    describe('Submitting Credit Card input form with missing ‘Credit Card’ value',function(){
      actions.goToPage('#/profile/payment/edit');
      actions.enterTextInField('#cardholderName','Test Creditcard');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
    });
    describe('Submitting Credit Card input form with missing ‘Exp Month value',function(){
      actions.goToPage('#/profile/payment/edit');
      actions.enterTextInField('#cardholderName','Test Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
    });
    describe('Submitting Credit Card input form with missing ‘Exp Year value',function(){
      actions.goToPage('#/profile/payment/edit');
      actions.enterTextInField('#cardholderName','Test Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
    });
    describe('Submitting Credit Card input form with missing ‘Security Code’ value',function(){
      actions.goToPage('#/profile/payment/edit');
      actions.enterTextInField('#cardholderName','Test Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('#/profile/payment/edit');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnButton('Submit');
    });
    describe('Updating Existing Credit Card',function(){
      actions.goToPage('#/profile/payment/view');
      actions.clickOnElementWithText('Change Credit Card');
      actions.enterTextInField('#cardholderName','Another Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','422');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('02');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('26');
      actions.clickOnButton('Submit');
      actions.checkingUrlEndsWith('/#/profile/payment/view');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 02/26');
      actions.iSeeText('Name on Card: Another Creditcard');
    });
    describe('Submitting Credit Card with ‘Invalid’ credit card number',function(){
      actions.clickOnElementWithText('Change Credit Card');
      actions.enterTextInField('#cardholderName','Another Creditcard');
      actions.enterTextInField('#ccNumber','0000000000000000');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('02');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('26');
      actions.enterTextInField('#securityCode','422');
      actions.waitForActionToComplete(1000);
      actions.clickOnButton('Submit');
      actions.iSeeText('Bad Request (22) - Invalid Credit Card Number');
    });
    describe('Submitting Credit Card with expiration date that has already expired',function(){
      actions.goToPage('#/profile/payment/edit');
      actions.enterTextInField('#cardholderName','Another Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','422');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('02');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('15');
      actions.clickOnButton('Submit');
      actions.iSeeText('Invalid Expiration Date');
    });
    // describe('Submitting Credit Card with invalid security code value',function(){
    //   actions.goToPage('#/profile/payment/edit');
    //   actions.enterTextInField('#cardholderName','Another Creditcard');
    //   actions.enterTextInField('#ccNumber','4111111111111111');
    //   actions.enterTextInField('#securityCode','000');
    //   actions.clickOnClass('#form-group-ccExpiryMonth');
    //   actions.clickOnElementWithText('02');
    //   actions.clickOnClass('#form-group-ccExpiryYear');
    //   actions.clickOnElementWithText('26');
    //   actions.clickOnButton('Submit');
    //   actions.iSeeText('Invalid CC number');
    // });
    describe('Viewing Credit Card Info on Upgrade Window',function(){
      actions.goToPage('#/');
      actions.clickOnElementWithText('New Project');
      actions.enterTextInField('#title','Test Project');
      actions.clickOnElementWithText(' Create Project');
      actions.waitForActionToComplete(1000);
      actions.clickOnElementWithText('Trial');
      actions.upgradeToPlan('Independent');
      actions.iSeeText('Payments will be charged to:');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 02/26');
      actions.iSeeText('Name on Card: Another Creditcard');
    });
    describe('Changing Credit Card Info from ‘Upgrade’ window',function(){
      actions.clickOnElementWithText('Change my credit card');
      actions.enterTextInField('#cardholderName','New Creditcard');
      actions.enterTextInField('#ccNumber','4111111111111111');
      actions.enterTextInField('#securityCode','411');
      actions.clickOnClass('#form-group-ccExpiryMonth');
      actions.clickOnElementWithText('01');
      actions.clickOnClass('#form-group-ccExpiryYear');
      actions.clickOnElementWithText('25');
      actions.clickOnButton('Submit');
      actions.iSeeText('Payments will be charged to:');
      actions.iSeeText('Visa ending in 1111');
      actions.iSeeText('Expires on 01/25');
      actions.iSeeText('Name on Card: New Creditcard');
    });
  });
};
