'use strict';

var request = require('supertest');
var assert = require('assert');
var Primus = require('primus');
var chance = new require('chance')();
var _ = require('lodash');
var Q = require('q');
var config = require('../config');
module.exports = function(app, template, hook) {
  var ProjectSocket = null;
  if (typeof app !== 'string') {
    ProjectSocket = require('../src/modules/ProjectSocket')(app.formio);
  }

  describe('Web Sockets', function() {
    var Socket = Primus.createSocket();
    var url = 'ws://localhost:' + config.port;
    var project = null;
    var form = null;
    var formUrl = '';

    // Helper method used to bind to a socket.
    var bind = function(server, formId, sync) {
      var deferred = Q.defer();
      var client = new Socket(server + '?token=' + template.formio.owner.token + '&project=' + project.name);
      client.on('error', function(err) {
        client.end();
        deferred.reject(err);
      });
      client.on('open', function() {
        client.write({
          type: 'bind',
          bind: {
            method: 'POST',
            form: formId.toString(),
            sync: sync || false
          }
        });
      });
      client.on('data', function(data) {
        if ((data.type === 'ack') && (data.msg.type === 'bind')) {
          deferred.resolve(client);
        }
      });
      return deferred.promise;
    };

    it('Should be able to create a new project.', function(done) {
      var defaultTemplate = require('../node_modules/formio/src/templates/empty.json');
      request(app)
        .post('/project')
        .send({
          title: chance.word(),
          description: chance.sentence(),
          template: defaultTemplate
        })
        .set('x-jwt-token', template.formio.owner.token)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return _.once(done)(err);
          }

          project = res.body;
          template.formio.owner.token = res.headers['x-jwt-token'];
          _.once(done)();
        });
    });

    it('Should not allow a connection without a token or project', function(done) {
      var client = new Socket(url);
      client.on('error', function() {
        client.end();
        _.once(done)();
      });
      client.on('open', function() {
        client.end();
        _.once(done)('Should not receive any data.');
      });
    });

    it('Should not allow a connection without a project', function(done) {
      var client = new Socket(url + '?token=' + template.formio.owner.token);
      client.on('error', function() {
        client.end();
        _.once(done)();
      });
      client.on('open', function() {
        client.end();
        _.once(done)('Should not receive any data.');
      });
    });

    it('Should not allow a connection without a token', function(done) {
      var client = new Socket(url + '?project=' + project.name);
      client.on('error', function() {
        client.end();
        _.once(done)();
      });
      client.on('open', function() {
        client.end();
        _.once(done)('Should not receive any data.');
      });
    });

    it('Should not allow a connection with an invalid token', function(done) {
      var client = new Socket(url + '?token=1234&project=' + project.name);
      client.on('error', function() {
        client.end();
        _.once(done)();
      });
      client.on('open', function() {
        client.end();
        _.once(done)('Should not receive any data.');
      });
    });

    it('Should not allow a connection with a project you don\'t own', function(done) {
      var client = new Socket(url + '?token=' + template.formio.owner.token + '&project=formio');
      client.on('error', function() {
        client.end();
        _.once(done)();
      });
      client.on('open', function() {
        client.end();
        _.once(done)('Should not receive any data.');
      });
    });

    it('Should allow a connection to your project', function(done) {
      var client = new Socket(url + '?token=' + template.formio.owner.token + '&project=' + project.name);
      client.on('error', function(err) {
        client.end();
        _.once(done)(err);
      });
      client.on('open', function() {
        client.end();
        _.once(done)();
      });
    });

    it('Should not allow you to receive events when you do not bind to the form.', function(done) {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Temp Form',
        name: 'tempForm',
        path: 'temp/tempform',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            validate: {
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false
            },
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: 'foo',
            key: 'foo',
            label: 'foo',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      var client = new Socket(url + '?token=' + template.formio.owner.token + '&project=' + project.name);
      client.on('error', function(err) {
        client.end();
        _.once(done)(err);
      });
      client.on('open', function() {
        formUrl = '/project/' + project._id + '/form';
        request(app)
          .post(formUrl)
          .set('x-jwt-token', template.formio.owner.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return _.once(done)(err);
            }

            form = res.body;
            formUrl += '/' + res.body._id.toString();
            template.formio.owner.token = res.headers['x-jwt-token'];
            request(app)
              .post(formUrl + '/submission')
              .set('x-jwt-token', template.formio.owner.token)
              .send({data: {foo: 'bar'}})
              .end(function(err, res) {
                if (err) {
                  return _.once(done)(err);
                }
                template.formio.owner.token = res.headers['x-jwt-token'];
                setTimeout(function() {
                  client.end();
                  _.once(done)();
                }, 200);
              });
          });
      });
      client.on('data', function(data) {
        if (data.type === 'request') {
          _.once(done)('We should not have received the submission information.');
        }
      });
    });

    it('Should allow you to receive events from a submission.', function(done) {
      bind(url, form._id).then(function(client) {
        client.on('data', function(data) {
          if (data.type === 'request') {
            assert.equal(data.request.method, 'POST');
            assert.equal(data.request.body.data.foo, 'bar');
            assert.equal(data.request.params.formId, form._id);
            assert.equal(data.request.params.projectId, project._id);
            client.end();
            _.once(done)();
          }
        });

        request(app)
          .post(formUrl + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send({data: {foo: 'bar'}})
          .end(function(err, res) {
            if (err) {
              return _.once(done)(err);
            }
            template.formio.owner.token = res.headers['x-jwt-token'];
          });
      }).catch(_.once(done));
    });

    it('Should allow a modification with blocking request.', function(done) {
      bind(url, form._id, true).then(function(client) {
        client.on('data', function(data) {
          if (data.type === 'request') {
            assert.equal(data.request.method, 'POST');
            assert.equal(data.request.body.data.foo, 'bar2');
            assert.equal(data.request.params.formId, form._id);
            assert.equal(data.request.params.projectId, project._id);

            // Now modify the payload.
            data.request.body.data.foo = 'bar3';
            client.write({
              type: 'response',
              id: data.id,
              response: data.request
            });
          }
        });

        request(app)
          .post(formUrl + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send({data: {foo: 'bar2'}})
          .end(function(err, res) {
            if (err) {
              return _.once(done)(err);
            }

            // Ensure that the value was in fact changed...
            client.end();
            assert.equal(res.body.data.foo, 'bar3');
            template.formio.owner.token = res.headers['x-jwt-token'];
            _.once(done)();
          });
      }).catch(_.once(done));
    });

    it('Should allow a change in status.', function(done) {
      bind(url, form._id, true).then(function(client) {
        client.on('data', function(data) {
          if (data.type === 'request') {
            // Invalidate the request.
            client.write({
              type: 'response',
              id: data.id,
              response: {
                status: 400,
                message: 'Invalid Request'
              }
            });
          }
        });

        request(app)
          .post(formUrl + '/submission')
          .set('x-jwt-token', template.formio.owner.token)
          .send({data: {foo: 'bar4'}})
          .expect(400)
          .end(function(err, res) {
            client.end();
            if (err) {
              return _.once(done)(err);
            }
            _.once(done)();
          });
      }).catch(_.once(done));
    });

    var http = require('http');
    var port = 1024;
    var server1 = null;
    var server2 = null;

    // Create a new server.
    var newServer = function(done) {
      var server = http.createServer();
      var primus = new ProjectSocket(server, config);
      primus.sparks.flushdb();
      server.port = port++;
      server.url = 'http://localhost:'+ server.port;
      server.listen(server.port, done);
      return primus;
    };

    // Get a request for the server.
    var socketRequest = function() {
      return {
        method: 'POST',
        url: 'http://localhost/project/' + project._id.toString(),
        params: {
          projectId: project._id.toString(),
          formId: form._id.toString()
        },
        query: {},
        body: {
          data: {
            firstName: 'Travis',
            lastName: 'Tidwell'
          }
        }
      };
    };

    var socketUrl = function(port) {
      return 'ws://localhost:' + port + '?token=' + template.formio.owner.token + '&project=' + project.name + '&sync=1';
    };

    // Create both servers.
    it('Should be able to create two separate Socket servers.', function(done) {
      if (!ProjectSocket) {
        return _.once(done)();
      }
      var called = false;
      server1 = newServer(function() {
        server2 = newServer(function() {
          if (!called) {
            called = true;
            setTimeout(done, 200);
          }
        });
      });
    });

    it('Should be able to send messages across multiple servers.', function(done) {
      if (!ProjectSocket) {
        return _.once(done)();
      }
      var opened = false;
      var Socket = Primus.createSocket();
      bind(socketUrl(server1.server.port), form._id, true).then(function(client) {
        opened = true;

        // The client is bound to server1, but should receive the request from server2.
        client.on('data', function(data) {
          if (data.type === 'request') {
            client.write({
              type: 'response',
              id: data.id,
              response: {
                test: 'hello'
              }
            });
          }
        });

        // Send a message to server2.
        server2.send(socketRequest()).then(function(response) {
          if (!response) {
            client.end();
            return _.once(done)(new Error('Socket message failed.'));
          }
          assert.equal(response.response.test, 'hello');

          // Close the client.
          client.end();

          // Close the servers.
          server1.close(function () {
            server2.close(function() {
              _.once(done)();
            });
          });
        });
      });
    });
  });
};
