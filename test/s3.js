'use strict';

var request = require('supertest');
var assert = require('assert');

module.exports = function(app, template, hook) {
  describe('S3 setup', function() {

    var testUser = {
      email: 'testUser@example.com',
      password: 'password'
    }

    it('Updates the project settings with s3 information', function(done) {
      var newSettings = {
        cors: '*',
        email: {
          gmail: {
            auth: {
              user: 'test@example.com',
              pass: 'test123'
            }
          }
        },
        storage: {
          s3: {
            AWSAccessKeyId: 'abcdefghijklmnop',
            AWSSecretKey: 'jsd09u04j0f9sue0f9j34wesd',
            bucket: 'testbucket',
            bucketUrl: 'https://testbucket.aws.amazon.com/',
            startsWith: 'upload/',
            acl: 'private',
            maxSize: 100 * 1024 * 1024,
            expiration: 15 * 60
          }
        }
      };

      request(app)
        .put('/project/' + template.project._id)
        .set('x-jwt-token', template.formio.owner.token)
        .send({settings: newSettings})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.hasOwnProperty('settings'), true);
          assert.deepEqual(response.settings, newSettings);

          template.project = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Registers an authenticated user', function(done)  {
      request(app)
        .post('/project/' + template.project._id + '/form/' + template.forms.userRegister._id + '/submission')
        .set('x-jwt-token', template.formio.owner.token)
        .send({
          data: {
            'user.email': testUser.email,
            'user.password': testUser.password
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;

          template.users.tempUser = response;
          template.users.tempUser.data.password = testUser.password;

          // Store the JWT for future API calls.
          template.users.tempUser.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Creates an upload form', function(done) {
      var uploadForm = {
        title: 'Upload Form',
        name: 'uploadForm',
        path: 'upload/form',
        type: 'form',
        access: [],
        submissionAccess: [
          {
            type: 'read_all',
            roles: [
              template.roles.administrator._id.toString(),
              template.roles.authenticated._id.toString()
            ]
          },
          {
            type: 'create_own',
            roles: [
              template.roles.administrator._id.toString(),
              template.roles.authenticated._id.toString()
            ]
          },
          {
            type: 'update_own',
            roles: [
              template.roles.administrator._id.toString(),
              template.roles.authenticated._id.toString()
            ]
          }
        ],
        components: [
          {
            type: 'file',
            multiple: true,
            key: 'file',
            label: 'File Upload',
            input: true,
            storage: 's3',
            dir: 'dir/'
          }
        ]
      };

      request(app)
        .post('/project/' + template.project._id + '/form')
        .set('x-jwt-token', template.formio.owner.token)
        .send(uploadForm)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(response.title, uploadForm.title);
          assert.equal(response.name, uploadForm.name);
          assert.equal(response.path, uploadForm.path);
          assert.equal(response.type, 'form');
          assert.notEqual(response.access, []);
          assert.equal(response.access.length, 1);
          assert.equal(response.access[0].type, 'read_all');
          assert.equal(response.access[0].roles.length, 3);
          assert.deepEqual(response.components, uploadForm.components);
          template.forms.uploadForm = response;

          // Store the JWT for future API calls.
          template.formio.owner.token = res.headers['x-jwt-token'];

          done();
        });
    });

  });

  describe('S3', function() {

    it('Allows access to s3 signing POSTs for users with permission', function(done) {
      var file = {
        name: 'myfile.doc',
        type: 'application/document',
        size: '10001'
      };
      request(app)
        .post('/project/' + template.project._id + '/form/' + template.forms.uploadForm._id + '/storage/s3')
        .set('x-jwt-token', template.users.tempUser.token)
        .send(file)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          console.log(res.body);
          if (err) {
            return done(err);
          }
          assert.equal(res.body.bucket, template.project.settings.storage.s3.bucket);
          assert.equal(res.body.url, template.project.settings.storage.s3.bucketUrl);
          assert.equal(res.body.data.key, template.project.settings.storage.s3.startsWith);
          assert.equal(res.body.data.AWSAccessKeyId, template.project.settings.storage.s3.AWSAccessKeyId);
          assert.equal(res.body.data.acl, template.project.settings.storage.s3.acl);
          assert.equal(res.body.data['Content-Type'], file.type);
          assert.equal(res.body.data.filename, file.name);

          var expiration_seconds = template.project.settings.storage.s3.expiration || (15 * 60);
          var expiration = new Date(Date.now() + (expiration_seconds * 1000));

          var policy = {
            expiration: expiration.toISOString(),
            conditions: [
              {"bucket": template.project.settings.storage.s3.bucket},
              ["starts-with", "$key", template.project.settings.storage.s3.startsWith],
              {"acl": template.project.settings.storage.s3.acl},
              ["starts-with", "$Content-Type", ""],
              ["starts-with", "$filename", ""],
              ["content-length-range", 0, template.project.settings.storage.s3.maxSize]
            ]
          }

          // Policy signatures are time sensitive so we have to match the time or the signatures won't work.
          var serverPolicy = JSON.parse(btoa(res.body.data.policy));
          policy.expiration = serverPolicy.expiration;

          var policyBase64 = new Buffer(JSON.stringify(policy)).toString('base64');

          assert.equal(res.body.data.policy, policyBase64);

          template.users.tempUser.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Does not allows access to s3 signing POSTs for users with without permission', function(done) {
      var file = {
        name: 'myfile.doc',
        type: 'application/document',
        size: '10001'
      };
      request(app)
        .post('/project/' + template.project._id + '/form/' + template.forms.uploadForm._id + '/storage/s3')
        .send(file)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });
  });

  describe('S3 teardown', function() {

    it('Deletes the upload form', function(done) {
      request(app)
        .delete('/project/' + template.project._id + '/form/' + template.forms.uploadForm._id)
        .set('x-jwt-token', template.formio.owner.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          var response = res.body;
          assert.deepEqual(response, {});

          template.formio.owner.token = res.headers['x-jwt-token'];

          delete template.forms.uploadForm;

          done();
        });
    });

    it('Deletes the temp user', function(done) {
      request(app)
        .delete('/project/' + template.project._id + '/form/' + template.resources.user._id + '/submission/' + template.users.tempUser._id)
        .set('x-jwt-token', template.users.tempUser.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          var response = res.body;
          assert.deepEqual(response, {});

          template.formio.owner.token = res.headers['x-jwt-token'];

          delete template.users.tempUser;

          done();
        });

    });

  });
}
