// Export the brochure configuration.
module.exports = function(config) {
  var bodyParser = require('body-parser');
  var validator = require('validator');
  var MongoClient = require('mongodb').MongoClient;
  var nodemailer = require('nodemailer');
  var basicAuth = require('basic-auth-connect');
  var express = require('express');
  var router = express.Router();
  var async = require('async');
  var nunjucks = require('nunjucks');
  var _ = require('lodash');

  // Create the emailer.
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: config.email
  });

  // Connect to the brochure application.
  console.log('Connecting to ' + config.mongo);
  MongoClient.connect(config.mongo, function(err, db) {

    // Show an error if we didn't connect.
    if (err) { return console.log(err); }

    // All is good...
    console.log("Connected to MongoDB");

    // parse application/x-www-form-urlencoded
    router.use(bodyParser.urlencoded({extended: false}));

    // parse application/json
    router.use(bodyParser.json());

    // Add an admin section.
    router.use('/admin', basicAuth(config.admin.user, config.admin.pass));
    router.get('/admin', function(req, res) {
      var emails = db.collection('emails');
      var cursor = emails.find({});
      var customers = [];
      async.series([
        function(done) {
          cursor.each(function(err, customer) {
            if (err) return done(err);
            if (!customer) return done();
            customers.push(customer);
          });
        }
      ], function(err) {
        res.render('admin.html', {
          customers: customers
        });
      });
    });

    var getPageParams = function(req) {
      var title = 'form.io';
      var domain = 'form.io';
      var description = 'A revolutionary new API Platform';
      var hostname = 'form';
      if (req.hostname && req.hostname.match(/opentech.io/)) {
        title = 'opentech.io';
        domain = 'opentech.io';
        hostname = 'opentech';
      }

      return {
        email: req.query.email,
        title: title,
        description: description,
        hostname: hostname,
        domain: domain
      }
    };

    // Add the static assets.
    router.use('/', express.static(__dirname + '/server/assets'));
    router.get('/', function(req, res) {
      res.render('index.html', getPageParams(req));
    });
    router.post('/', function(req, res) {
      var url = '';

      // See if we are an investor or customer.
      var isCustomer = req.body.hasOwnProperty('customer');
      var isInvestor = req.body.hasOwnProperty('investor');
      var params = getPageParams(req);

      // If they press the customer or investor button.
      if (isCustomer || isInvestor) {
        url = isCustomer ? '/customer' : '/investor';
        if (req.body.email) {
          url += '?email=' + encodeURIComponent(req.body.email);
        }
        res.redirect(url);
        return;
      }

      // See which page we should be on.
      var page = 'index.html';
      if (req.body.customerType == 'customer') {
        page = 'customer.html';
      }
      else if (req.body.customerType == 'investor') {
        page = 'investor.html';
      }

      // Validate the email.
      if (!validator.isEmail(req.body.email)) {
        params.error = 'You must provide a valid email address to subscribe.';
        res.render(page, params);
      }
      else {

        // Try to find an existing record.
        var emails = db.collection('emails');
        emails.findOne({email: req.body.email}, function(err, customer) {

          // Set the alert message.
          params.message = 'Thank you for your interest! You have been added to our mailing list.';

          // Email an update.
          var emailUpdate = function(info) {
            var mailOptions = {
              from: 'No Reply <no-reply@' + params.domain + '>',
              to: 'gary@' + params.domain + ', denise@' + params.domain + ', travis@' + params.domain + '',
              subject: 'Someone is interested in ' + params.title + '!',
              html: nunjucks.render('email.html', _.merge(params, info))
            };

            if (config.debug) {
              console.log(mailOptions);
            }
            else {
              transporter.sendMail(mailOptions, function(error, info){
                if(error){
                  console.log(error);
                } else {
                  console.log('Message sent: ' + info.response);
                }
              });
            }
          };

          // If one was found, update it, otherwise insert it.
          if (customer) {
            customer = _.merge(customer, req.body);
            emails.update({
              email: customer.email
            }, {
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              customerType: customer.customerType,
              beta: customer.beta
            }, function(err, result) {
              emailUpdate(customer);
              res.render(page, params);
            });
          }
          else {
            emails.insert({
              email : req.body.email,
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              customerType: req.body.customerType,
              beta: req.body.beta
            }, function(err, result) {
              emailUpdate(req.body);
              res.render(page, params);
            });
          }
        });
      }
    });

    // Get the customer page.
    router.get('/customer', function(req, res) {
      res.render('customer.html', getPageParams(req));
    });

    // Get the investor page.
    router.get('/investor', function(req, res) {
      res.render('investor.html', getPageParams(req));
    });
  });

  // Return the router.
  return router;
};
